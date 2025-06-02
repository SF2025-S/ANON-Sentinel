import express from 'express';
import multer from 'multer';
import path from 'path';
import { importFile } from '../../lib/importData';
import { querySimilarIncidents, upsertIncident, queryAllIncidents, getIncidentById } from '../../lib/vectorStore';
import { SecurityIncident } from '../../server/models/incident';
import fs from 'fs';
import { DetailedSimilarityScore } from '@/server/models/similarityScore';
import { SearchResponse, SimpleSearchResponse } from '@/server/models/searchResponses';

const router = express.Router();

// Configuração do Multer para aceitar apenas TXT
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 4.5 * 1024 * 1024 // 4.5MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos TXT são permitidos'));
    }
  }
});

// Endpoint para upload de arquivo
router.post('/upload', upload.single('file'), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }

    // Lê o conteúdo do arquivo
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');

    // Validação da estrutura do arquivo
    const incidentSeparators = /[-#]{3,}/;
    if (!incidentSeparators.test(fileContent)) {
      res.status(400).json({ 
        error: 'Estrutura inválida',
        details: 'O arquivo deve conter incidentes separados por "###" ou "---"'
      });
      return;
    }

    const fileType = 'txt';

    try {
      const results = await importFile(fileContent, fileType);
      
      if (results.processed === 0) {
        res.status(400).json({ 
          error: 'Arquivo inválido',
          details: 'Nenhum incidente válido foi encontrado no arquivo'
        });
        return;
      }

      res.json({ 
        message: 'Importação concluída com sucesso',
        results,
        fileType,
        details: `Processados: ${results.processed}, Duplicatas: ${results.duplicates}, Erros: ${results.errors}`,
        incidentIds: results.incidentIds || []
      });
    } catch (importError: unknown) {
      res.status(400).json({ 
        error: 'Erro na estrutura do arquivo',
        details: importError instanceof Error ? importError.message : 'Verifique se os incidentes estão separados corretamente por "###" ou "---"'
      });
    }

    // Limpa o arquivo após processamento
    fs.unlinkSync(req.file.path);
  } catch (error: unknown) {
    console.error('Erro detalhado:', error);
    res.status(500).json({ 
      error: 'Erro no processamento do upload',
      details: error instanceof Error ? error.message : 'Ocorreu um erro inesperado durante o upload'
    });
  }
});

// Endpoint para adicionar um único incidente via texto
router.post('/incident', async (req, res) => {
  try {
    const incident: SecurityIncident = {
      id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: req.body.content,
      timestamp: new Date().toISOString(),
      source: 'direct-input'
    };
    
    await upsertIncident(incident);
    res.json({ message: 'Incidente adicionado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar incidente:' + error });
  }
});

// Endpoint para buscar incidentes similares
router.get('/search', (async (req: express.Request, res: express.Response) => {
  try {
    const query = req.query.query as string | undefined;
    const topK = Number(req.query.topK || '5');
    const format = (req.query.format as string) || 'detailed';
    const SIMILARITY_THRESHOLD = 0.4;

    // Se não houver query, retorna todos os incidentes
    if (!query) {
      const allIncidents = await queryAllIncidents();
      
      if (format === 'simple') {
        return res.json({
          message: 'Incidentes recuperados com sucesso',
          data: allIncidents
        } as SimpleSearchResponse);
      }

      const formattedResults: DetailedSimilarityScore[] = allIncidents.map(incident => ({
        documentId: incident.id,
        similarity: 1,
        incident: {
          id: incident.id,
          content: incident.content,
          timestamp: incident.timestamp,
          source: incident.source
        }
      }));

      return res.json({
        results: formattedResults,
        metrics: {
          totalFound: allIncidents.length,
          totalReturned: allIncidents.length,
          averageSimilarity: 1
        }
      } as SearchResponse);
    }

    // Se houver query, faz busca por similaridade
    const results = await querySimilarIncidents(query as string, topK);

    // Filtra resultados abaixo do threshold
    const filteredResults = results.filter(match => 
      (match.score || 0) >= SIMILARITY_THRESHOLD
    );

    if (format === 'simple') {
      const simpleResults = filteredResults.map(match => ({
        id: match.id,
        content: match.metadata?.content as string,
        timestamp: match.metadata?.timestamp as string,
        source: match.metadata?.source as string
      }));

      res.json({
        message: 'Busca realizada com sucesso',
        data: simpleResults
      } as SimpleSearchResponse);
    }

    const formattedResults: DetailedSimilarityScore[] = filteredResults.map(match => ({
      documentId: match.id,
      similarity: match.score || 0,
      incident: {
        id: match.id,
        content: match.metadata?.content as string,
        timestamp: match.metadata?.timestamp as string,
        source: match.metadata?.source as string
      }
    }));

    const metrics = {
      totalFound: results.length,
      totalReturned: filteredResults.length,
      averageSimilarity: filteredResults.length > 0 
        ? filteredResults.reduce((acc, match) => acc + (match.score || 0), 0) / filteredResults.length
        : 0
    };

    res.json({
      results: formattedResults,
      metrics
    } as SearchResponse);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Erro na busca',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}) as express.RequestHandler);

// Endpoint para buscar um incidente específico por ID
router.get('/incident/:id', (async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = req.params.id;
    
    if (!id) {
      res.status(400).json({ error: 'ID não fornecido' });
      return;
    }
    
    const incident = await getIncidentById(id);
    
    if (!incident) {
      res.status(404).json({ error: 'Incidente não encontrado' });
      return;
    }
    
    res.json({ 
      message: 'Incidente encontrado',
      data: incident 
    });
  } catch (error) {
    console.error('Erro ao buscar incidente:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar incidente',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}) as express.RequestHandler);

export default router;
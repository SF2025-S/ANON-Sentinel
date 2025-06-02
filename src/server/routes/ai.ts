import express from 'express';
import { AIService } from '../services/aiService';
import { Request, Response } from 'express';
import { CertCategorizationResultWithUsage } from '../models/certCategorization';
import { LLMCategorizationResultWithUsage } from '../models/llmCategorization';
import { NistCategorizationResultWithUsage } from '../models/nistCategorization';
import { AIUsageSchema } from '../models/zodSchemas';
import { z } from 'zod';

const router = express.Router();
const aiService = new AIService();

// Endpoint para chat com streaming
router.post('/chat/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;
    
    if (!messages?.length) {
      res.status(400).json({ error: 'Prompt é obrigatório' });
      return;
    }

    const prompt = messages[messages.length - 1].content;    
    await aiService.generateWithContextStream(prompt, res);
  } catch (error) {
    console.error('Erro no streaming do chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro no streaming do chat', 
        message: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  }
});

type AIUsage = z.infer<typeof AIUsageSchema>;

type CategorizationStreamBatchData = {
  type: 'batch';
  data: CategorizationResultWithUsage;
  progress: { processed: number; total: number; percentage: number };
  usage: AIUsage;
};

router.post('/categorization/stream', async (req, res) => {
  const sendChunk = (data: 
    | { type: 'init'; total: number; batchSize: number }
    | CategorizationStreamBatchData
    | { type: 'complete'; totalTokensGlobal?: AIUsage }
    | { type: 'error'; message: string }
  ) => {
    if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Erro ao enviar chunk:', err);
      }
    }
  };

  const accumulatedUsage: AIUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  try {
    const { type = 'cert', incidents } = req.body;
    
    // Configurar headers para SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const BATCH_SIZE = 10;
    let processedCount = 0;
    const totalIncidents = incidents.length;
    
    // Enviar informação inicial
    sendChunk({
      type: 'init',
      total: totalIncidents,
      batchSize: BATCH_SIZE
    });
    
    // Processar em lotes
    for (let i = 0; i < incidents.length; i += BATCH_SIZE) {
      const batch = incidents.slice(i, i + BATCH_SIZE);
      
      let batchResultWithUsage: CategorizationResultWithUsage; 
      switch (type) {
        case 'cert':
          batchResultWithUsage = await aiService.categorizeWithCERTBatch(batch);
          break;
        case 'llm':
          batchResultWithUsage = await aiService.categorizeWithLLMBatch(batch);
          break;
        case 'nist':
          batchResultWithUsage = await aiService.categorizeWithNISTBatch(batch);
          break;
        default:
          if (!res.writableEnded) {
            res.status(400).end('Tipo de categorização inválido');
          }
          throw new Error('Tipo de categorização inválido');
      }

      processedCount += batch.length;
      
      // Acumular o usage
      if (batchResultWithUsage.usage) {
        accumulatedUsage.promptTokens += batchResultWithUsage.usage.promptTokens;
        accumulatedUsage.completionTokens += batchResultWithUsage.usage.completionTokens;
        accumulatedUsage.totalTokens += batchResultWithUsage.usage.totalTokens;
      }
      
      sendChunk({
        type: 'batch',
        data: batchResultWithUsage,
        progress: {
          processed: processedCount,
          total: totalIncidents,
          percentage: Math.round((processedCount / totalIncidents) * 100)
        },
        usage: batchResultWithUsage.usage // envia o usage específico deste lote
      });
    }

    sendChunk({ type: 'complete', totalTokensGlobal: accumulatedUsage });
    if (!res.writableEnded) {
      res.end();
    }
    
  } catch (error) {
    console.error('Erro no stream de categorização:', error);
    sendChunk({
      type: 'error',
      message: error instanceof Error ? `${error.name}: ${error.message}` : 'Erro durante a categorização'
    });
    
    if (!res.writableEnded) {
      res.end();
    }
  }
});

type CategorizationResultWithUsage = 
  | CertCategorizationResultWithUsage 
  | LLMCategorizationResultWithUsage 
  | NistCategorizationResultWithUsage;

export default router;
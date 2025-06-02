import { generateText, Message, LanguageModelUsage } from 'ai';
import { generateObject, LanguageModel } from 'ai';
import { queryAllIncidents, querySimilarIncidents } from '../../lib/vectorStore';
import { IncidentWithScore, SecurityIncident } from '../models/incident';
import { google } from '@ai-sdk/google';
import { CertCategorizationResultSchema, LLMCategorizationResultSchema, NistCategorizationResultSchema} from '../models/zodSchemas';
import { AI_MODELS, DEFAULT_MODEL } from '../models/aiModels';
import { Ticket, TicketRecommendationWithUsage, TicketRecommendation } from '../models/ticket';
import { CertCategorizationResult, CertCategorizationResultWithUsage } from '../models/certCategorization';
import { LLMCategorizationResult, LLMCategorizationResultWithUsage } from '../models/llmCategorization';
import { NistCategorizationResult, NistCategorizationResultWithUsage } from '../models/nistCategorization';
import { streamText, pipeDataStreamToResponse } from 'ai';
import { Response } from 'express';

export class AIService {
  private readonly MODEL: LanguageModel = google(AI_MODELS.GEMINI.id);

  /**
   * Busca documentos relevantes para uma consulta.
   * Utiliza um limiar dinâmico para criar uma nota de corte adaptável a cada consulta. Por exemplo:
   * se o documento mais relevante tem score 0.9, o limiar seria 0.72 (80% de 0.9). 
   * Se o documento mais relevante tem score 0.7, o limiar seria 0.56 (80% de 0.7). Se 
   * Isso evita problemas com limiares fixos onde 0.5 retorna dezenas de incidentes e 0.5 retorna centenas.
   * @param query - A consulta/prompt para a qual se deseja encontrar documentos relevantes
   * @returns Uma lista de documentos relevantes
   */
  public async searchRelevantDocuments(query: string): Promise<IncidentWithScore[]> {
    const matches = await querySimilarIncidents(query, 1000);
    
    // Ordenar do maior para o menor score
    const sortedMatches = matches.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Pegar o score mais alto
    const maxScore = sortedMatches[0]?.score || 0;
    
    // Definir o limiar como uma porcentagem do score máximo
    const dynamicThreshold = maxScore * 0.85;
    
    // Filtrar usando o limiar dinâmico
    return sortedMatches
      .filter(match => (match.score || 0) >= dynamicThreshold)
      .map(match => ({
        id: match.id,
        content: match.metadata?.content as string,
        timestamp: match.metadata?.timestamp as string,
        source: match.metadata?.source as string || '',
        score: match.score || 0
      }))
      .slice(0, 100); // para evitar lentidão e custos de inferência
  }

  public async getAllDocs(): Promise<SecurityIncident[]> {
    const incidents = await queryAllIncidents();
    
    return incidents.map(incident => ({
      id: incident.id,
      content: incident.content,
      timestamp: incident.timestamp,
      source: incident.source,
    }));
  }

  async generateWithContextStream(prompt: string, res: Response) {
    // 1. Buscar documentos relevantes
    const relevantDocs = await this.searchRelevantDocuments(prompt);
    console.log('Relevant docs:', relevantDocs.length);
    
    // 2. Formatar o contexto
    const context = relevantDocs.map(doc => doc.content).join('\n\n');
    
    // 3. Preparar mensagens para o modelo
    const messages: Message[] = [
      {
        id: 'system',
        role: 'system',
        content: `Você é um assistente especializado em segurança da informação.
                 Use APENAS as informações fornecidas abaixo para responder.
                 Se não encontrar informações relevantes no contexto fornecido, 
                 responda "Não encontrei informações suficientes para responder esta pergunta."
                 
                 Contexto dos incidentes:
                 ${context}`
      },
      {
        id: 'user',
        role: 'user',
        content: prompt
      }
    ];

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    pipeDataStreamToResponse(res, {
      execute: async (dataStream) => {
        const metadataPayload = {
          type: "metadata",
          contextUtilization: relevantDocs[0]?.score * 100 || 0,
          similarityScores: relevantDocs.map(doc => ({
            documentId: doc.id,
            similarity: doc.score || 0,
            incident: {
              id: doc.id,
              timestamp: doc.timestamp,
              source: doc.source || '',
            }
          }))
        };
        
        // Enviar metadados e garantir que sejam processados primeiro
        await dataStream.writeData(metadataPayload);
        await new Promise(resolve => setTimeout(resolve, 50));

        const result = streamText({
          model: this.MODEL,
          messages,
          temperature: 0.7,
          maxTokens: 4000,
          onError: (error) => {
            console.error('Erro na geração:', error);
            dataStream.writeData({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
          }
        });

        result.mergeIntoDataStream(dataStream);
      },
      onError: (error) => {
        console.error('Erro no stream:', error);
        return error instanceof Error ? error.message : 'Erro desconhecido';
      }
    });
  }

  private readonly CERTCategories = `
    DoS (Denial of Service): notificações de ataques de negação de serviço, onde o atacante utiliza um computador ou um conjunto de computadores para tirar de operação um serviço, dispositivo ou rede.
    Fraude: engloba as notificações de tentativas de fraude, ou seja, de incidentes em que ocorre uma tentativa de obter vantagem, que pode ou não ser financeira. O uso da palavra fraude é feito segundo Houaiss, que a define como "qualquer ato ardiloso, enganoso, de má-fé, com intuito de lesar ou ludibriar outrem, ou de não cumprir determinado dever; logro". Esta categoria, por sua vez, é dividida nas seguintes sub-categorias:
    Phishing: notificações de casos de páginas falsas, tanto com intuito de obter vantagem financeira direta (envolvendo bancos, cartões de crédito, meios de pagamento e sites de comércio eletrônico), quanto aquelas em geral envolvendo serviços de webmail, acessos remotos corporativos, credenciais de serviços de nuvem, entre outros.
    Malware: notificações sobre códigos maliciosos utilizados para furtar informações e credenciais.
    Invasão: um ataque bem sucedido que resulte no acesso não autorizado a um computador ou rede.
    Scan: engloba além de notificações de varreduras em redes de computadores (scans), notificações envolvendo força bruta de senhas, tentativas mal sucedidas de explorar vulnerabilidades e outros ataques sem sucesso contra serviços de rede disponibilizados publicamente na Internet.
    Web: um caso particular de ataque visando especificamente o comprometimento de servidores web ou desfigurações de páginas na Internet.
    Outros: notificações de incidentes que não se enquadram nas demais categorias.
    `

  private readonly NISTCategories = `
    CAT 0 (Exercise/Network Defense Testing): Eventos envolvendo testes de segurança, simulações ou exercícios.
    CAT 1 (Unauthorized Access): Ganho de acesso lógico ou físico sem permissão.
    CAT 2 (Denial of Service): Disrupção da funcionalidade normal de rede ou serviço.
    CAT 3 (Malicious Code): Instalação bem-sucedida de malware (vírus, worms, trojans, etc.).
    CAT 4 (Improper Usage): Violações de políticas de computação aceitáveis (ex: abuso de política, uso indevido).
    CAT 5 (Scans/Probes/Attempted Access): Atividade de reconhecimento ou tentativas mal sucedidas de ganhar acesso.
    CAT 6 (Investigation): Incidentes potenciais sob revisão (ex: relatórios ou anomalias inexplicadas).
  `

  /**
   * Valida e filtra classificações para garantir IDs únicos e existentes no batch original
   * @param classifications Array de classificações a serem validadas
   * @param batchIds IDs originais do batch
   * @returns Array de classificações validadas e filtradas
   */
  private validateAndFilterClassifications<T extends { id: string }>(
    classifications: T[],
    batchIds: string[]
  ): T[] {
    const processedIds = new Set();
    const validatedClassifications: T[] = [];
    
    for (const classification of classifications) {
      if (batchIds.includes(classification.id) && !processedIds.has(classification.id)) {
        processedIds.add(classification.id);
        validatedClassifications.push(classification);
      }
    }
    
    return validatedClassifications;
  }

  /**
   * Processa as classificações e gera estatísticas de categorias
   * @param classifications Array de classificações a serem processadas
   * @param object Objeto original retornado pela IA
   * @param usage Dados de uso da IA
   * @returns Objeto processado com estatísticas de categorias
   */
  private processClassificationStats<T extends { category: string }>(
    classifications: T[],
    object: CertCategorizationResult | LLMCategorizationResult | NistCategorizationResult, 
    usage: LanguageModelUsage
  ) {
    const categoryMap = new Map();
    classifications.forEach(c => {
      categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
    });

    return {
      ...object,
      classifications,
      totalIncidents: classifications.length,
      totalCategories: categoryMap.size,
      categoryCounts: Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count })),
      model: this.MODEL.modelId || DEFAULT_MODEL.id,
      usage
    };
  }

  async categorizeWithCERTBatch(batch: SecurityIncident[]): Promise<CertCategorizationResultWithUsage> {
    try {
      const batchIds = batch.map(incident => incident.id);
      
      const { object, usage } = await generateObject({
        model: this.MODEL,
        schema: CertCategorizationResultSchema,
        prompt: `Você é um especialista em segurança da informação.
                Analise os seguintes ${batch.length} incidentes de segurança e classifique cada um em uma das categorias CERT: 
                ${this.CERTCategories}. 

                REGRAS CRÍTICAS:
                1. Cada ID deve aparecer EXATAMENTE UMA VEZ nas classificações
                2. O número total de classificações DEVE ser IGUAL ao número de incidentes (${batch.length})
                3. Use SOMENTE os IDs fornecidos abaixo, sem modificações
                4. NÃO DUPLIQUE nenhum ID nas classificações
                
                IDs disponíveis: ${JSON.stringify(batchIds)}
                
                Retorne apenas os campos id, category, reason e timestamp no formato JSON.
                Para cada classificação, explique no campo reason por que você escolheu aquela categoria.
                NÃO inclua o conteúdo dos incidentes no resultado.
                Use o conteúdo apenas para fazer a análise.

                Incidentes: ${JSON.stringify(batch)}`,
        temperature: 0.1,
        maxTokens: 4000
      });

      const classifications = this.validateAndFilterClassifications(
        object.classifications,
        batchIds
      );

      return this.processClassificationStats(classifications, object, usage);
      
    } catch (error) {
      console.error(`Erro ao processar lote (CERT):`, error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao categorizar lote de incidentes (CERT): ${message}`);
    }
  }

  async categorizeWithLLMBatch(batch: SecurityIncident[]): Promise<LLMCategorizationResultWithUsage> {
    try {
      const batchIds = batch.map(incident => incident.id);
      
      const { object, usage } = await generateObject({
        model: this.MODEL,
        schema: LLMCategorizationResultSchema,
        prompt: `Você é um especialista em segurança da informação.
                Analise os seguintes ${batch.length} incidentes e crie categorias apropriadas.
                Seja consistente na criação das categorias.
                
                REGRAS CRÍTICAS:
                1. Cada ID deve aparecer EXATAMENTE UMA VEZ nas classificações
                2. O número total de classificações DEVE ser IGUAL ao número de incidentes (${batch.length})
                3. Use SOMENTE os IDs fornecidos abaixo, sem modificações
                4. NÃO DUPLIQUE nenhum ID nas classificações
                
                IDs disponíveis: ${JSON.stringify(batchIds)}
                
                Retorne apenas os campos id, category, reason e timestamp no formato JSON.
                Para cada classificação, explique no campo reason por que você escolheu aquela categoria.
                NÃO inclua o conteúdo dos incidentes no resultado.
                Use o conteúdo apenas para fazer a análise.
                
                Incidentes: ${JSON.stringify(batch)}`,
        temperature: 0.1,
        maxTokens: 4000
      });

      const classifications = this.validateAndFilterClassifications(
        object.classifications,
        batchIds
      );
      
      return this.processClassificationStats(classifications, object, usage);
    } catch (error) {
      console.error(`Erro ao processar lote (LLM):`, error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao categorizar lote de incidentes (LLM): ${message}`);
    }
  }

  async categorizeWithNISTBatch(batch: SecurityIncident[]): Promise<NistCategorizationResultWithUsage> {
    try {
      const batchIds = batch.map(incident => incident.id);
      
      const { object, usage } = await generateObject({
        model: this.MODEL,
        schema: NistCategorizationResultSchema,
        prompt: `Você é um especialista em segurança da informação.
                Analise os seguintes ${batch.length} incidentes e classifique-os de acordo com as categorias NIST SP 800-61r2:
                ${this.NISTCategories}
                
                REGRAS CRÍTICAS:
                1. Cada ID deve aparecer EXATAMENTE UMA VEZ nas classificações
                2. O número total de classificações DEVE ser IGUAL ao número de incidentes (${batch.length})
                3. Use SOMENTE os IDs fornecidos abaixo, sem modificações
                4. NÃO DUPLIQUE nenhum ID nas classificações
                
                IDs disponíveis: ${JSON.stringify(batchIds)}
                
                Retorne apenas os campos id, category, reason e timestamp no formato JSON.
                Para cada classificação, explique no campo reason por que você escolheu aquela categoria.
                NÃO inclua o conteúdo dos incidentes no resultado.
                Use o conteúdo apenas para fazer a análise.
                
                Incidentes: ${JSON.stringify(batch)}`,
        temperature: 0.1,
        maxTokens: 4000
      });
      
      const classifications = this.validateAndFilterClassifications(
        object.classifications,
        batchIds
      );
      
      return this.processClassificationStats(classifications, object, usage);
    } catch (error) {
      console.error(`Erro ao processar lote (NIST):`, error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao categorizar lote de incidentes (NIST): ${message}`);
    }
  }

  async getRecentTickets(limit: number = 10, offset: number = 0): Promise<Ticket[]> {
    const incidents = await queryAllIncidents();
    return incidents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit)
      .map(incident => ({
        ...incident,
        recommendations: []
      }));
  }

  async generateTicketRecommendation(ticket: Ticket): Promise<TicketRecommendationWithUsage | TicketRecommendation> {
    const messages: Message[] = [
      {
        id: 'system',
        role: 'system',
        content: `Você é um especialista em segurança da informação.
                 Analise o incidente de segurança fornecido e sugira recomendações
                 práticas e específicas para resolver o problema e prevenir
                 ocorrências similares no futuro.
                 
                 Forneça recomendações objetivas e acionáveis.`
      },
      {
        id: 'user',
        role: 'user',
        content: `Analise este incidente e forneça recomendações:
                 ${ticket.content}`
      }
    ];

    const response = await generateText({
      model: this.MODEL,
      messages,
      temperature: 0.7,
      maxTokens: 4000
    });

    return {
      id: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticketId: ticket.id,
      recommendation: response.text,
      usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      timestamp: new Date().toISOString(),
      confidence: 0.85 // implementar um cálculo real de confiança depois
    };
  }

  async generateTicketRecommendationStream(ticket: Ticket, res: Response) {
    const recommendationId = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const confidence = 0.85; // implementar um cálculo real de confiança depois
    
    // Criar metadata do ticket para enviar imediatamente
    const ticketMetadata = {
      id: recommendationId,
      ticketId: ticket.id,
      timestamp,
      confidence
    };

    // Usar pipeDataStreamToResponse diretamente
    pipeDataStreamToResponse(res, {
      execute: async (dataStream) => {
        // Enviar metadados imediatamente
        dataStream.writeData(ticketMetadata);
        
        const messages: Message[] = [
          {
            id: 'system',
            role: 'system',
            content: `Você é um especialista em segurança da informação.
                     Analise o incidente de segurança fornecido e sugira recomendações
                     práticas e específicas para resolver o problema e prevenir
                     ocorrências similares no futuro.
                     
                     Forneça recomendações objetivas e acionáveis.`
          },
          {
            id: 'user',
            role: 'user',
            content: `Analise este incidente e forneça recomendações:
                     ${ticket.content}`
          }
        ];

        const result = streamText({
          model: this.MODEL,
          messages,
          temperature: 0.7,
          maxTokens: 4000,
          onError: (error) => {
            console.error('Erro na geração:', error);
            dataStream.writeData({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
          }
        });

        // Mesclar o stream de texto no dataStream
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error) => {
        // Tratar erros no nível do stream
        console.error('Erro no stream:', error);
        return error instanceof Error ? error.message : 'Erro desconhecido';
      }
    });
  }

  async getTicketById(ticketId: string): Promise<Ticket | null> {
    const incidents = await queryAllIncidents();
    const incident = incidents.find(inc => inc.id === ticketId);
    
    if (!incident) return null;
    
    return {
      ...incident,
      recommendations: []
    };
  }
}
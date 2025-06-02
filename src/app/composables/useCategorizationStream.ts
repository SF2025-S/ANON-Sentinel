import { useState } from 'react';
import { apiClient, streamApiClient } from '@/lib/api-client';
import { SecurityIncident } from '@/server/models/incident';
import { CertCategorizationResultWithUsage } from '@/server/models/certCategorization';
import { LLMCategorizationResultWithUsage } from '@/server/models/llmCategorization';
import { NistCategorizationResultWithUsage } from '@/server/models/nistCategorization';
import { DEFAULT_MODEL } from '@/server/models/aiModels';
import { SimpleSearchResponse } from '@/server/models/searchResponses';
import { AIUsageSchema } from '@/server/models/zodSchemas';
import { z } from 'zod';

type CategorizationType = 'cert' | 'llm' | 'nist';

type AIUsage = z.infer<typeof AIUsageSchema>;

type CategorizationResponse = 
  | CertCategorizationResultWithUsage 
  | LLMCategorizationResultWithUsage 
  | NistCategorizationResultWithUsage;

export function useCategorizationStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CategorizationResponse | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [originalIncidents, setOriginalIncidents] = useState<SecurityIncident[]>([]);
  const [currentTotalTokens, setCurrentTotalTokens] = useState<AIUsage | null>(null);

  const startCategorization = async (type: CategorizationType) => {
    try {
      const startTime = Date.now();
      
      setError(null);
      setLoading(true);
      setProcessingTime(null);
      setCurrentTotalTokens(null);

      const { data: incidents } = await apiClient<SimpleSearchResponse>(
        '/api/incidents/search',
        { params: { format: 'simple' } }
      );
      setOriginalIncidents(incidents);

      const classifications: CertCategorizationResultWithUsage['classifications'] | LLMCategorizationResultWithUsage['classifications'] | NistCategorizationResultWithUsage['classifications'] = [];

      const initialResponseType = type.toUpperCase() as CategorizationResponse['categorizationType'];
      let initialResponseData: CategorizationResponse;

      const commonInitialData = {
        classifications: [],
        totalIncidents: incidents.length,
        totalCategories: 0,
        categoryCounts: [],
        model: DEFAULT_MODEL.id,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };

      if (initialResponseType === 'CERT') {
        initialResponseData = { ...commonInitialData, categorizationType: 'CERT' };
      } else if (initialResponseType === 'LLM') {
        initialResponseData = { ...commonInitialData, categorizationType: 'LLM' };
      } else {
        initialResponseData = { ...commonInitialData, categorizationType: 'NIST' };
      }
      setResponse(initialResponseData);

      const stream = streamApiClient('/api/ai/categorization/stream', {
        method: 'POST',
        body: JSON.stringify({
          type,
          incidents,
        })
      });

      const categoryCountMap = new Map<string, number>();
      const tempAccumulatedTokens: AIUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for await (const chunk of stream) {
        console.log('Chunk recebido no frontend:', chunk);
        
        switch (chunk.type) {
          case 'init':
            break;
            
          case 'batch':
            // Remove possíveis duplicatas
            const uniqueClassifications = chunk.data.classifications.filter(
              (newClassification: typeof classifications[number]) => !classifications.some(
                (existingClassification: typeof classifications[number]) => existingClassification.id === newClassification.id
              )
            );
            
            classifications.push(...uniqueClassifications);
            
            uniqueClassifications.forEach((c: typeof classifications[number]) => {
              categoryCountMap.set(c.category, (categoryCountMap.get(c.category) || 0) + 1);
            });

            if (chunk.usage) {
              tempAccumulatedTokens.promptTokens += chunk.usage.promptTokens;
              tempAccumulatedTokens.completionTokens += chunk.usage.completionTokens;
              tempAccumulatedTokens.totalTokens += chunk.usage.totalTokens;
              setCurrentTotalTokens({...tempAccumulatedTokens});
            }
            
            setResponse(prev => {
              if (!prev) return null;

              const updatedResponse: CategorizationResponse = {
                model: prev.model,
                categorizationType: prev.categorizationType,
                totalIncidents: prev.totalIncidents,
                classifications: [...classifications],
                totalCategories: categoryCountMap.size,
                categoryCounts: Array.from(categoryCountMap.entries()).map(([category, count]) => ({
                  category,
                  count
                })),
                usage: chunk.data.usage,
              };
              return updatedResponse;
            });
            break;
            
          case 'complete':
            setProcessingTime(Date.now() - startTime);
            setLoading(false);
            if (chunk.totalTokensGlobal) {
              setCurrentTotalTokens(chunk.totalTokensGlobal);
            }
            break;
            
          case 'error':
            throw new Error(chunk.message);
        }
      }

    } catch (error) {
      console.error("Erro no hook useCategorizationStream:", error);
      setError(error instanceof Error ? error.message : "Erro ao processar categorização");
      setLoading(false);
    }
  };

  return { loading, error, response, processingTime, originalIncidents, startCategorization, currentTotalTokens };
}
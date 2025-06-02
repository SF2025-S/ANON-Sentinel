import { useState, useEffect } from 'react';
import { apiClient, streamApiClient } from '@/lib/api-client';
import { SecurityIncident } from '@/server/models/incident';
import { CertCategorizationResultWithUsage } from '@/server/models/certCategorization';
import { LLMCategorizationResultWithUsage } from '@/server/models/llmCategorization';
import { NistCategorizationResultWithUsage } from '@/server/models/nistCategorization';
import { SimpleSearchResponse } from '@/server/models/searchResponses';
import { auth, db } from '@/lib/firebaseconfig';
import { collection, addDoc, Timestamp, query, orderBy, limit, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { TicketRecommendation, TicketRecommendationWithUsage } from '@/server/models/ticket';
import { calculateTokenCost } from '@/lib/tokenUtils';
import { AIUsageSchema } from '@/server/models/zodSchemas';
import { z } from 'zod';
type AIUsage = z.infer<typeof AIUsageSchema>;

type ClassificationItem = 
  | import('@/server/models/certCategorization').CertIncidentClassification
  | import('@/server/models/llmCategorization').LLMIncidentClassification  
  | import('@/server/models/nistCategorization').NistIncidentClassification;

export type CategorizationResult = 
  | CertCategorizationResultWithUsage 
  | LLMCategorizationResultWithUsage 
  | NistCategorizationResultWithUsage;

export interface AnalysisStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  progressText?: string;
}

export interface IncidentAnalysis {
  incident: SecurityIncident;
  certCategory?: string;
  certReason?: string;
  llmCategory?: string;
  llmReason?: string;
  nistCategory?: string;
  nistReason?: string;
  recommendation?: TicketRecommendationWithUsage | TicketRecommendation;
}

export interface IncidentEvaluation {
  incidentId: string;
  evaluatorEmail: string;
  evaluationTimestamp: Timestamp;
  categorization: {
    comments: string;
    certCorrect?: boolean;
    llmCorrect?: boolean;
    nistCorrect?: boolean;
  };
  recommendation: {
    comments: string;
    rating: number; // 0-5 estrelas
  };
}

export interface ResultsAnalysisDocument {
  id?: string;
  analysisId: string;
  timestamp: Timestamp;
  userEmail: string;
  totalIncidents: number;
  incidentCount: number;
  model: string;
  incidents: Array<{
    id: string;
    certCategory?: string;
    certReason?: string;
    llmCategory?: string;
    llmReason?: string;
    nistCategory?: string;
    nistReason?: string;
    recommendationId?: string;
    recommendationText?: string;
    recommendationTimestamp?: string;
    recommendationUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    evaluation?: IncidentEvaluation;
  }>;
  summary: {
    totalCategorized: number;
    totalRecommendations: number;
    successRate: number;
    categoriesByType: {
      cert: Array<{ category: string; count: number }>;
      llm: Array<{ category: string; count: number }>;
      nist: Array<{ category: string; count: number }>;
    };
    recommendationTokens?: {
      totalPromptTokens: number;
      totalCompletionTokens: number;
      totalTokens: number;
      averageTokensPerRecommendation: number;
    };
    categorizationTokens?: {
      cert?: AIUsage;
      llm?: AIUsage;
      nist?: AIUsage;
      total: AIUsage;
    };
    totalTokensAndCosts?: {
      totalTokens: AIUsage;
      estimatedCosts: {
        USD: number;
        BRL: number;
      };
    };
    evaluationStats?: {
      totalEvaluations: number;
      averageRecommendationRating: number;
      categorizationAccuracy: {
        cert: { correct: number; total: number };
        llm: { correct: number; total: number };
        nist: { correct: number; total: number };
      };
    };
  };
}

export function useResultsAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [results, setResults] = useState<IncidentAnalysis[]>([]);
  const [categorizations, setCategorizations] = useState<{
    cert?: CategorizationResult;
    llm?: CategorizationResult;
    nist?: CategorizationResult;
  }>({});
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [previousResults, setPreviousResults] = useState<ResultsAnalysisDocument[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isLoadedFromHistory, setIsLoadedFromHistory] = useState(false);
  const [categorizationTokens, setCategorizationTokens] = useState<{
    cert?: AIUsage;
    llm?: AIUsage;
    nist?: AIUsage;
  }>({});
  
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  // Carregar histórico automaticamente ao montar o componente
  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const recentResults = await getRecentResults(10);
        setPreviousResults(recentResults);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, []);

  // Função para gerar ID personalizado
  const generateAnalysisId = (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ANL-${timestamp}-${random}`.toUpperCase();
  };

  const cancelAnalysis = () => {
    if (abortController) {
      setIsCancelled(true);
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      setCurrentStep('');
      setSteps([]);
    }
  };

  const startAnalysis = async (incidentCount: number = 100) => {
    try {
      const controller = new AbortController();
      setAbortController(controller);
      setIsCancelled(false);
      
      setLoading(true);
      setError(null);
      setResults([]);
      setCategorizations({});
      setSavedResultId(null);
      setIsLoadedFromHistory(false);
      
      const analysisSteps: AnalysisStep[] = [
        { id: 'fetch', name: 'Buscando incidentes mais recentes', status: 'pending' },
        { id: 'cert', name: 'Categorizando com CERT', status: 'pending' },
        { id: 'llm', name: 'Categorizando com LLM', status: 'pending' },
        { id: 'nist', name: 'Categorizando com NIST', status: 'pending' },
        { id: 'recommendations', name: 'Gerando recomendações', status: 'pending' },
        { id: 'complete', name: 'Análise completa', status: 'pending' }
      ];
      
      setSteps(analysisSteps);

      if (controller.signal.aborted) {
        return;
      }

      // Etapa 1: Buscar incidentes
      setCurrentStep('fetch');
      updateStepStatus('fetch', 'processing');
      
      const { data: incidents } = await apiClient<SimpleSearchResponse>(
        '/incidents/search',
        { params: { format: 'simple' } }
      );

      if (controller.signal.aborted) {
        return;
      }

      if (!incidents || incidents.length === 0) {
        throw new Error('Nenhum incidente encontrado na base de dados');
      }

      const limitedIncidents = incidents.slice(0, incidentCount);
      updateStepStatus('fetch', 'completed');

      // Etapa 2-4: Categorizar com os 3 tipos usando stream
      const categorizationTypes: Array<{ type: 'cert' | 'llm' | 'nist'; stepId: string; displayName: string }> = [
        { type: 'cert', stepId: 'cert', displayName: 'CERT' },
        { type: 'llm', stepId: 'llm', displayName: 'LLM' },
        { type: 'nist', stepId: 'nist', displayName: 'NIST' }
      ];

      const categoryResults: {
        cert?: CategorizationResult;
        llm?: CategorizationResult;
        nist?: CategorizationResult;
      } = {};

      for (const { type, stepId, displayName } of categorizationTypes) {
        if (controller.signal.aborted) {
          return;
        }

        setCurrentStep(stepId);
        updateStepStatus(stepId, 'processing', 0, `Categorizando com ${displayName}: 0 de ${limitedIncidents.length}`);

        try {
          const categorizationResult = await performCategorizationStream(type, limitedIncidents, stepId, displayName, controller);
          categoryResults[type] = categorizationResult;
          
          updateStepStatus(stepId, 'completed');
        } catch (err) {
          if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
            return;
          }
          console.error(`Erro na categorização ${type}:`, err);
          updateStepStatus(stepId, 'error');
          // Continuar com as outras categorizações mesmo se uma falhar
        }
      }

      if (controller.signal.aborted) {
        return;
      }

      setCategorizations(categoryResults);

      // Etapa 5: Gerar recomendações
      setCurrentStep('recommendations');
      updateStepStatus('recommendations', 'processing', 0, `Gerando recomendações: 0 de ${limitedIncidents.length}`);
      
      const analysisResults = await generateRecommendations(limitedIncidents, categoryResults, controller);
      
      if (controller.signal.aborted) {
        return;
      }
      
      setResults(analysisResults);
      
      updateStepStatus('recommendations', 'completed');
      updateStepStatus('complete', 'completed');
      setCurrentStep('complete');

      // Após completar a análise, salvar no Firebase apenas se não foi cancelado
      if (auth.currentUser && analysisResults.length > 0 && !controller.signal.aborted) {
        const resultId = await saveResultsToFirebase(analysisResults, categoryResults, incidentCount);
        setSavedResultId(resultId);
      }

    } catch (error) {
      // Verificar se é erro de cancelamento
      if (isCancelled || (error instanceof Error && error.name === 'AbortError')) {
        // Não mostrar erro para cancelamentos
        return;
      }
      
      console.error('Erro na análise:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      
      if (currentStep) {
        updateStepStatus(currentStep, 'error');
      }
    } finally {
      setLoading(false);
      setAbortController(null);
      setIsCancelled(false);
    }
  };

  const updateStepStatus = (stepId: string, status: AnalysisStep['status'], progress?: number, progressText?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, progress, progressText } : step
    ));
  };

  const performCategorizationStream = async (
    type: 'cert' | 'llm' | 'nist',
    incidents: SecurityIncident[],
    stepId: string,
    displayName: string,
    controller: AbortController
  ): Promise<CategorizationResult> => {
    const classifications: ClassificationItem[] = [];
    let result: CategorizationResult | null = null;
    const tempAccumulatedTokens: AIUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    try {
      const stream = streamApiClient('/ai/categorization/stream', {
        method: 'POST',
        body: JSON.stringify({
          type,
          incidents,
        }),
        signal: controller.signal
      });

      for await (const chunk of stream) {
        // Verificar cancelamento a cada chunk
        if (controller.signal.aborted) {
          throw new Error('AbortError');
        }

        switch (chunk.type) {
          case 'init':
            break;
            
          case 'batch':
            // Acumular classificações
            const uniqueClassifications = chunk.data.classifications.filter(
              (newClassification: ClassificationItem) => !classifications.some(
                (existingClassification: ClassificationItem) => existingClassification.id === newClassification.id
              )
            );
            
            classifications.push(...uniqueClassifications);
            
            // Acumular tokens
            if (chunk.usage) {
              tempAccumulatedTokens.promptTokens += chunk.usage.promptTokens;
              tempAccumulatedTokens.completionTokens += chunk.usage.completionTokens;
              tempAccumulatedTokens.totalTokens += chunk.usage.totalTokens;
            }
            
            // Atualizar progresso
            const progress = Math.round((classifications.length / incidents.length) * 100);
            const progressText = `Categorizando com ${displayName}: ${classifications.length} de ${incidents.length}`;
            updateStepStatus(stepId, 'processing', progress, progressText);
            
            // Manter a estrutura do resultado
            result = {
              ...chunk.data,
              classifications: [...classifications],
              usage: tempAccumulatedTokens // Usar tokens acumulados
            };
            break;
            
          case 'complete':
            // Salvar tokens finais para este tipo de categorização
            setCategorizationTokens(prev => ({
              ...prev,
              [type]: tempAccumulatedTokens
            }));
            break;
            
          case 'error':
            throw new Error(chunk.message);
        }
      }

      if (!result) {
        throw new Error(`Falha na categorização ${type}`);
      }

      return result;
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
        throw error;
      }
      throw error;
    }
  };

  const generateRecommendations = async (
    incidents: SecurityIncident[],
    categoryResults: { cert?: CategorizationResult; llm?: CategorizationResult; nist?: CategorizationResult },
    controller: AbortController
  ): Promise<IncidentAnalysis[]> => {
    const analysisResults: IncidentAnalysis[] = [];

    for (let i = 0; i < incidents.length; i++) {
      // Verificar cancelamento a cada iteração
      if (controller.signal.aborted) {
        throw new Error('AbortError');
      }

      const incident = incidents[i];
      
      // Buscar classificações para este incidente
      const certClassification = categoryResults.cert?.classifications.find(c => c.id === incident.id);
      const llmClassification = categoryResults.llm?.classifications.find(c => c.id === incident.id);
      const nistClassification = categoryResults.nist?.classifications.find(c => c.id === incident.id);

      // Gerar recomendação usando a API
      let recommendation: TicketRecommendation | undefined;
      try {
        recommendation = await apiClient<TicketRecommendation>(`/tickets/${incident.id}/recommend-sync`, {
          method: 'POST',
          signal: controller.signal
        });
      } catch (err) {
        // Verificar se é erro de cancelamento
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw new Error('AbortError');
        }
        console.error(`Erro ao gerar recomendação para ${incident.id}:`, err);
      }

      const analysis: IncidentAnalysis = {
        incident,
        certCategory: certClassification?.category,
        certReason: certClassification?.reason,
        llmCategory: llmClassification?.category,
        llmReason: llmClassification?.reason,
        nistCategory: nistClassification?.category,
        nistReason: nistClassification?.reason,
        recommendation
      };

      analysisResults.push(analysis);
      
      // Atualizar progresso
      const progress = Math.round(((i + 1) / incidents.length) * 100);
      const progressText = `Gerando recomendações: ${i + 1} de ${incidents.length}`;
      updateStepStatus('recommendations', 'processing', progress, progressText);
    }

    return analysisResults;
  };

  // remover campos undefined recursivamente
  const removeUndefinedFields = (obj: Record<string, unknown>): Record<string, unknown> => {
    const cleaned: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        continue;
      }
      
      if (value === null) {
        cleaned[key] = null;
      } else if (value instanceof Timestamp) {
        cleaned[key] = value;
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? removeUndefinedFields(item as Record<string, unknown>)
            : item
        ).filter(item => item !== undefined);
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = removeUndefinedFields(value as Record<string, unknown>);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  };

  const saveResultsToFirebase = async (
    analysisResults: IncidentAnalysis[],
    categoryResults: { cert?: CategorizationResult; llm?: CategorizationResult; nist?: CategorizationResult },
    requestedCount: number
  ): Promise<string> => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    // Preparar dados dos incidentes
    const incidents = analysisResults.map(analysis => ({
      id: analysis.incident.id,
      certCategory: analysis.certCategory,
      certReason: analysis.certReason,
      llmCategory: analysis.llmCategory,
      llmReason: analysis.llmReason,
      nistCategory: analysis.nistCategory,
      nistReason: analysis.nistReason,
      recommendationId: analysis.recommendation?.id,
      recommendationText: analysis.recommendation?.recommendation,
      recommendationTimestamp: analysis.recommendation?.timestamp,
      recommendationUsage: (analysis.recommendation && 'usage' in analysis.recommendation) ? analysis.recommendation.usage : undefined,
    }));

    // Calcular estatísticas por tipo de categorização
    const getCategoryCounts = (classifications: ClassificationItem[]) => {
      const counts = new Map<string, number>();
      classifications.forEach(c => {
        if (c.category) {
          counts.set(c.category, (counts.get(c.category) || 0) + 1);
        }
      });
      return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
    };

    // Calcular estatísticas de tokens das recomendações
    const recommendationsWithUsage = analysisResults
      .map(a => a.recommendation)
      .filter((rec): rec is TicketRecommendationWithUsage => 
        rec !== undefined && 'usage' in rec
      );

    let recommendationTokens;
    if (recommendationsWithUsage.length > 0) {
      const totalPromptTokens = recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.promptTokens, 0);
      const totalCompletionTokens = recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.completionTokens, 0);
      const totalTokens = recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.totalTokens, 0);
      
      recommendationTokens = {
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
        averageTokensPerRecommendation: Math.round(totalTokens / recommendationsWithUsage.length)
      };
    }

    // Extrair tokens de categorização diretamente dos resultados
    const categorizationTokensByType = {
      cert: categoryResults.cert?.usage ? {
        promptTokens: categoryResults.cert.usage.promptTokens,
        completionTokens: categoryResults.cert.usage.completionTokens,
        totalTokens: categoryResults.cert.usage.totalTokens
      } : undefined,
      llm: categoryResults.llm?.usage ? {
        promptTokens: categoryResults.llm.usage.promptTokens,
        completionTokens: categoryResults.llm.usage.completionTokens,
        totalTokens: categoryResults.llm.usage.totalTokens
      } : undefined,
      nist: categoryResults.nist?.usage ? {
        promptTokens: categoryResults.nist.usage.promptTokens,
        completionTokens: categoryResults.nist.usage.completionTokens,
        totalTokens: categoryResults.nist.usage.totalTokens
      } : undefined
    };

    // Calcular tokens totais de categorização
    const categorizationTokensTotal: AIUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    Object.values(categorizationTokensByType).forEach(tokens => {
      if (tokens) {
        categorizationTokensTotal.promptTokens += tokens.promptTokens;
        categorizationTokensTotal.completionTokens += tokens.completionTokens;
        categorizationTokensTotal.totalTokens += tokens.totalTokens;
      }
    });

    // Calcular tokens totais (categorização + recomendações)
    const totalTokensAll: AIUsage = {
      promptTokens: categorizationTokensTotal.promptTokens + (recommendationTokens?.totalPromptTokens || 0),
      completionTokens: categorizationTokensTotal.completionTokens + (recommendationTokens?.totalCompletionTokens || 0),
      totalTokens: categorizationTokensTotal.totalTokens + (recommendationTokens?.totalTokens || 0)
    };

    // Calcular custos totais
    const modelId = categoryResults.cert?.model || categoryResults.llm?.model || categoryResults.nist?.model || 'unknown';
    console.log('modelId:', modelId);
    const { costUSD, costBRL } = calculateTokenCost(totalTokensAll, modelId);

    const totalRecommendations = analysisResults.filter(r => r.recommendation).length;
    const totalCategorized = Object.values(categoryResults).filter(Boolean).length;

    const analysisId = generateAnalysisId();

    const resultsDocument: Omit<ResultsAnalysisDocument, 'id'> = {
      analysisId,
      timestamp: Timestamp.now(),
      userEmail: auth.currentUser.email!,
      totalIncidents: analysisResults.length,
      incidentCount: requestedCount,
      model: modelId,
      incidents,
      summary: {
        totalCategorized,
        totalRecommendations,
        successRate: Math.round((totalRecommendations / analysisResults.length) * 100),
        categoriesByType: {
          cert: categoryResults.cert ? getCategoryCounts(categoryResults.cert.classifications) : [],
          llm: categoryResults.llm ? getCategoryCounts(categoryResults.llm.classifications) : [],
          nist: categoryResults.nist ? getCategoryCounts(categoryResults.nist.classifications) : [],
        },
        recommendationTokens,
        categorizationTokens: {
          cert: categorizationTokensByType.cert,
          llm: categorizationTokensByType.llm,
          nist: categorizationTokensByType.nist,
          total: categorizationTokensTotal
        },
        totalTokensAndCosts: {
          totalTokens: totalTokensAll,
          estimatedCosts: {
            USD: costUSD,
            BRL: costBRL
          }
        }
      }
    };

    // Limpar campos undefined antes de salvar
    const cleanedDocument = removeUndefinedFields(resultsDocument);
    const resultsRef = collection(db, "results");
    const docRef = await addDoc(resultsRef, cleanedDocument);
    
    console.log('Resultados salvos no Firebase com ID:', docRef.id);
    return analysisId;
  };

  const getRecentResults = async (limitCount: number = 10): Promise<ResultsAnalysisDocument[]> => {
    try {
      const resultsRef = collection(db, "results");
      const q = query(resultsRef, orderBy("timestamp", "desc"), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ResultsAnalysisDocument));
    } catch (error) {
      console.error('Erro ao buscar resultados:', error);
      return [];
    }
  };

  const deleteResult = async (resultId: string): Promise<void> => {
    try {
      const resultDoc = doc(db, "results", resultId);
      await deleteDoc(resultDoc);
      
      // Atualizar a lista local removendo o item deletado
      setPreviousResults(prev => prev.filter(result => result.id !== resultId));
      
      console.log('Resultado deletado com sucesso:', resultId);
    } catch (error) {
      console.error('Erro ao deletar resultado:', error);
      throw new Error('Erro ao deletar análise');
    }
  };

  const loadResultsFromHistory = async (historicalResult: ResultsAnalysisDocument) => {
    // Buscar dados completos dos incidentes para ter timestamps corretos
    const { data: allIncidents } = await apiClient<SimpleSearchResponse>(
      '/incidents/search',
      { params: { format: 'simple' } }
    );

    // Converter dados históricos para o formato atual
    const analysisResults: IncidentAnalysis[] = historicalResult.incidents.map(incident => {
      const fullIncident = allIncidents.find(i => i.id === incident.id);
      
      return {
        incident: {
          id: incident.id,
          content: fullIncident?.content || '',
          timestamp: fullIncident?.timestamp || new Date().toISOString(),
          source: fullIncident?.source || 'unknown'
        },
        certCategory: incident.certCategory,
        certReason: incident.certReason,
        llmCategory: incident.llmCategory,
        llmReason: incident.llmReason,
        nistCategory: incident.nistCategory,
        nistReason: incident.nistReason,
        recommendation: incident.recommendationText ? {
          id: incident.recommendationId || '',
          ticketId: incident.id,
          recommendation: incident.recommendationText,
          timestamp: incident.recommendationTimestamp || new Date().toISOString(),
          confidence: 0.85,
          ...(incident.recommendationUsage && { usage: incident.recommendationUsage })
        } : undefined
      };
    });

    // Reconstruir categorizações com tokens do histórico
    const reconstructedCategorizations = {
      cert: historicalResult.summary.categoriesByType.cert.length > 0 ? {
        classifications: historicalResult.incidents.filter(i => i.certCategory).map(i => ({
          id: i.id,
          category: i.certCategory!,
          reason: i.certReason || '',
          timestamp: ''
        })),
        totalIncidents: historicalResult.totalIncidents,
        totalCategories: historicalResult.summary.categoriesByType.cert.length,
        categoryCounts: historicalResult.summary.categoriesByType.cert,
        model: historicalResult.model,
        categorizationType: 'CERT' as const,
        usage: historicalResult.summary.categorizationTokens?.cert || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } : undefined,
      llm: historicalResult.summary.categoriesByType.llm.length > 0 ? {
        classifications: historicalResult.incidents.filter(i => i.llmCategory).map(i => ({
          id: i.id,
          category: i.llmCategory!,
          reason: i.llmReason || '',
          timestamp: ''
        })),
        totalIncidents: historicalResult.totalIncidents,
        totalCategories: historicalResult.summary.categoriesByType.llm.length,
        categoryCounts: historicalResult.summary.categoriesByType.llm,
        model: historicalResult.model,
        categorizationType: 'LLM' as const,
        usage: historicalResult.summary.categorizationTokens?.llm || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } : undefined,
      nist: historicalResult.summary.categoriesByType.nist.length > 0 ? {
        classifications: historicalResult.incidents.filter(i => i.nistCategory).map(i => ({
          id: i.id,
          category: i.nistCategory!,
          reason: i.nistReason || '',
          timestamp: ''
        })),
        totalIncidents: historicalResult.totalIncidents,
        totalCategories: historicalResult.summary.categoriesByType.nist.length,
        categoryCounts: historicalResult.summary.categoriesByType.nist,
        model: historicalResult.model,
        categorizationType: 'NIST' as const,
        usage: historicalResult.summary.categorizationTokens?.nist || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } : undefined
    };

    // Restaurar tokens de categorização no estado
    if (historicalResult.summary.categorizationTokens) {
      setCategorizationTokens({
        cert: historicalResult.summary.categorizationTokens.cert,
        llm: historicalResult.summary.categorizationTokens.llm,
        nist: historicalResult.summary.categorizationTokens.nist
      });
    }

    setResults(analysisResults);
    setCategorizations(reconstructedCategorizations);
    setSavedResultId(historicalResult.analysisId);
    setIsLoadedFromHistory(true);
  };

  const saveEvaluation = async (resultDocId: string, incidentId: string, evaluation: IncidentEvaluation) => {
    try {
      const resultDoc = doc(db, "results", resultDocId);
      
      // Buscar o documento atual
      const currentResults = previousResults.find(r => r.id === resultDocId);
      if (!currentResults) {
        throw new Error('Resultado não encontrado');
      }

      // Atualizar o incidente específico com a avaliação
      const updatedIncidents = currentResults.incidents.map(incident => 
        incident.id === incidentId 
          ? { ...incident, evaluation }
          : incident
      );

      // Calcular estatísticas de avaliação
      const evaluations = updatedIncidents
        .map(i => i.evaluation)
        .filter((e): e is IncidentEvaluation => e !== undefined);

      const evaluationStats = {
        totalEvaluations: evaluations.length,
        averageRecommendationRating: evaluations.length > 0 
          ? evaluations.reduce((sum, e) => sum + e.recommendation.rating, 0) / evaluations.length 
          : 0,
        categorizationAccuracy: {
          cert: {
            correct: evaluations.filter(e => e.categorization.certCorrect === true).length,
            total: evaluations.filter(e => e.categorization.certCorrect !== undefined).length
          },
          llm: {
            correct: evaluations.filter(e => e.categorization.llmCorrect === true).length,
            total: evaluations.filter(e => e.categorization.llmCorrect !== undefined).length
          },
          nist: {
            correct: evaluations.filter(e => e.categorization.nistCorrect === true).length,
            total: evaluations.filter(e => e.categorization.nistCorrect !== undefined).length
          }
        }
      };

      await updateDoc(resultDoc, {
        incidents: updatedIncidents,
        'summary.evaluationStats': evaluationStats
      });

      // Atualizar o estado local
      setPreviousResults(prev => 
        prev.map(result => 
          result.id === resultDocId 
            ? { 
                ...result, 
                incidents: updatedIncidents,
                summary: {
                  ...result.summary,
                  evaluationStats
                }
              }
            : result
        )
      );

      // Se este é o resultado atualmente carregado, atualizar também
      if (savedResultId === currentResults.analysisId) {
        setResults(prev => 
          prev.map(analysis => 
            analysis.incident.id === incidentId 
              ? { ...analysis, evaluation }
              : analysis
          )
        );
      }

      console.log('Avaliação salva com sucesso');
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      throw new Error('Erro ao salvar avaliação');
    }
  };

  const deleteEvaluation = async (resultDocId: string, incidentId: string): Promise<void> => {
    try {
      const resultDoc = doc(db, "results", resultDocId);
      
      // Buscar o documento atual
      const currentResults = previousResults.find(r => r.id === resultDocId);
      if (!currentResults) {
        throw new Error('Resultado não encontrado');
      }

      // Remover a avaliação do incidente específico (removendo completamente o campo)
      const updatedIncidents = currentResults.incidents.map(incident => {
        if (incident.id === incidentId) {
          const { evaluation: _, ...incidentWithoutEvaluation } = incident;
          return incidentWithoutEvaluation;
        }
        return incident;
      });

      // Recalcular estatísticas de avaliação usando apenas os incidentes originais que ainda têm avaliação
      const evaluations = currentResults.incidents
        .filter(i => i.id !== incidentId && i.evaluation)
        .map(i => i.evaluation!)
        .filter((e): e is IncidentEvaluation => e !== undefined);

      const evaluationStats = evaluations.length > 0 ? {
        totalEvaluations: evaluations.length,
        averageRecommendationRating: evaluations.reduce((sum, e) => sum + e.recommendation.rating, 0) / evaluations.length,
        categorizationAccuracy: {
          cert: {
            correct: evaluations.filter(e => e.categorization.certCorrect === true).length,
            total: evaluations.filter(e => e.categorization.certCorrect !== undefined).length
          },
          llm: {
            correct: evaluations.filter(e => e.categorization.llmCorrect === true).length,
            total: evaluations.filter(e => e.categorization.llmCorrect !== undefined).length
          },
          nist: {
            correct: evaluations.filter(e => e.categorization.nistCorrect === true).length,
            total: evaluations.filter(e => e.categorization.nistCorrect !== undefined).length
          }
        }
      } : undefined;

      // Limpar campos undefined antes de salvar
      const cleanedIncidents = removeUndefinedFields({ incidents: updatedIncidents }).incidents;

      // Atualizar documento no Firebase
      const updateData = {
        incidents: cleanedIncidents,
        ...(evaluationStats 
          ? { 'summary.evaluationStats': evaluationStats }
          : { 'summary.evaluationStats': null }
        )
      };

      await updateDoc(resultDoc, updateData);

      // Atualizar o estado local
      setPreviousResults(prev => 
        prev.map(result => 
          result.id === resultDocId 
            ? { 
                ...result, 
                incidents: updatedIncidents,
                summary: {
                  ...result.summary,
                  evaluationStats
                }
              }
            : result
        )
      );

      // Se este é o resultado atualmente carregado, atualizar também
      if (savedResultId === currentResults.analysisId) {
        setResults(prev => 
          prev.map(analysis => 
            analysis.incident.id === incidentId 
              ? { ...analysis, evaluation: undefined }
              : analysis
          )
        );
      }

      console.log('Avaliação excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      throw new Error('Erro ao excluir avaliação');
    }
  };

  return {
    loading,
    error,
    currentStep,
    steps,
    results,
    categorizations,
    savedResultId,
    isLoadedFromHistory,
    previousResults,
    loadingHistory,
    categorizationTokens,
    startAnalysis,
    cancelAnalysis,
    getRecentResults,
    loadResultsFromHistory,
    deleteResult,
    saveEvaluation,
    deleteEvaluation
  };
} 
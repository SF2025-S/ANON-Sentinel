"use client"

import { useState } from "react";
import { BarChart3, Brain, Clock, AlertTriangle, Search, Play, CheckCircle2, XCircle, Loader2, FileText, Square, MessageSquare } from "lucide-react";
import { useResultsAnalysis, ResultsAnalysisDocument, IncidentEvaluation } from "@/app/composables/useResultsAnalysis";
import { IncidentAnalysisCard } from "@/components/results/IncidentAnalysisCard";
import { HistoryCard } from "@/components/results/HistoryCard";
import { LoadHistoryModal } from "@/components/results/LoadHistoryModal";
import { DEFAULT_MODEL } from '@/server/models/aiModels';
import { TokenAnalysisSection } from "@/components/results/TokenAnalysisSection";
import { TicketRecommendationWithUsage } from '@/server/models/ticket';
import { calculateTokenCost } from '@/lib/tokenUtils';
import { AnalysisDetailsModal } from "@/components/results/AnalysisDetailsModal";
import { Toast } from "@/components/Toast";
import { HorizontalScrollContainer } from "@/components/results/HorizontalScrollContainer";

const StepIndicator = ({ steps }: { 
  steps: Array<{id: string; name: string; status: string; progress?: number; progressText?: string}>;
  currentStep: string;
}) => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mb-6">
    <h3 className="text-lg font-semibold mb-4 text-gray-800">Progresso da Análise</h3>
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            step.status === 'completed' ? 'bg-green-100 text-green-600' :
            step.status === 'processing' ? 'bg-blue-100 text-blue-600' :
            step.status === 'error' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-400'
          }`}>
            {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
             step.status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> :
             step.status === 'error' ? <XCircle className="w-4 h-4" /> :
             <div className="w-2 h-2 rounded-full bg-current" />}
          </div>
          
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              step.status === 'completed' ? 'text-green-700' :
              step.status === 'processing' ? 'text-blue-700' :
              step.status === 'error' ? 'text-red-700' :
              'text-gray-500'
            }`}>
              {step.progressText || step.name}
            </p>
            
            {step.status === 'processing' && step.progress !== undefined && (
              <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${step.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function ResultsPage() {
  const [incidentCount, setIncidentCount] = useState("100");
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<ResultsAnalysisDocument | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  
  const {
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
    loadResultsFromHistory,
    deleteResult,
    saveEvaluation,
    deleteEvaluation
  } = useResultsAnalysis();

  const handleStartAnalysis = () => {
    startAnalysis(parseInt(incidentCount));
  };

  const handleCancelAnalysis = () => {
    cancelAnalysis();
    setToast({ 
      message: 'Análise cancelada. Nenhum dado foi salvo no Firebase.', 
      type: 'warning' 
    });
  };

  const handleHistoryCardClick = (result: ResultsAnalysisDocument) => {
    setSelectedHistoryResult(result);
    setShowDetailsModal(true);
  };

  const handleLoadFromDetails = () => {
    setShowDetailsModal(false);
    setShowLoadModal(true);
  };

  const handleLoadHistoryConfirm = () => {
    if (selectedHistoryResult) {
      loadResultsFromHistory(selectedHistoryResult);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    try {
      setDeleteError(null);
      await deleteResult(resultId);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Erro ao excluir análise');
    }
  };

  const totalCategorized = Object.values(categorizations).filter(Boolean).length;
  const totalRecommendations = results.filter(r => r.recommendation).length;
  
  // Calcular estatísticas de tokens das recomendações atuais
  const recommendationsWithUsage = results
    .map(r => r.recommendation)
    .filter((rec): rec is TicketRecommendationWithUsage => 
      rec !== undefined && 'usage' in rec
    );

  const currentRecommendationTokens = recommendationsWithUsage.length > 0 ? {
    totalPromptTokens: recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.promptTokens, 0),
    totalCompletionTokens: recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.completionTokens, 0),
    totalTokens: recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.totalTokens, 0),
    averageTokensPerRecommendation: Math.round(
      recommendationsWithUsage.reduce((sum, rec) => sum + rec.usage.totalTokens, 0) / recommendationsWithUsage.length
    )
  } : undefined;

  // Calcular tokens totais de categorização atual
  const currentCategorizationTokensTotal = Object.values(categorizationTokens).reduce(
    (acc, tokens) => {
      if (tokens) {
        acc.promptTokens += tokens.promptTokens;
        acc.completionTokens += tokens.completionTokens;
        acc.totalTokens += tokens.totalTokens;
      }
      return acc;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );

  const currentCategorizationTokensData = Object.keys(categorizationTokens).length > 0 ? {
    cert: categorizationTokens.cert,
    llm: categorizationTokens.llm,
    nist: categorizationTokens.nist,
    total: currentCategorizationTokensTotal
  } : undefined;

  // Calcular tokens e custos totais atuais
  const currentTotalTokensAndCosts = (currentCategorizationTokensData || currentRecommendationTokens) ? {
    totalTokens: {
      promptTokens: currentCategorizationTokensTotal.promptTokens + (currentRecommendationTokens?.totalPromptTokens || 0),
      completionTokens: currentCategorizationTokensTotal.completionTokens + (currentRecommendationTokens?.totalCompletionTokens || 0),
      totalTokens: currentCategorizationTokensTotal.totalTokens + (currentRecommendationTokens?.totalTokens || 0)
    },
    estimatedCosts: (() => {
      const totalTokens = {
        promptTokens: currentCategorizationTokensTotal.promptTokens + (currentRecommendationTokens?.totalPromptTokens || 0),
        completionTokens: currentCategorizationTokensTotal.completionTokens + (currentRecommendationTokens?.totalCompletionTokens || 0),
        totalTokens: currentCategorizationTokensTotal.totalTokens + (currentRecommendationTokens?.totalTokens || 0)
      };
      const { costUSD, costBRL } = calculateTokenCost(totalTokens, DEFAULT_MODEL.id);
      return { USD: costUSD, BRL: costBRL };
    })()
  } : undefined;

  const handleEvaluationSave = async (incidentId: string, evaluation: IncidentEvaluation) => {
    try {
      const currentResultDoc = previousResults.find(r => r.analysisId === savedResultId);
      if (!currentResultDoc?.id) {
        throw new Error('Documento de resultado não encontrado');
      }

      await saveEvaluation(currentResultDoc.id, incidentId, evaluation);
      
      setToast({ 
        message: 'Avaliação salva com sucesso!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      setToast({ 
        message: 'Erro ao salvar avaliação', 
        type: 'error' 
      });
    }
  };

  const handleEvaluationDelete = async (incidentId: string) => {
    try {
      const currentResultDoc = previousResults.find(r => r.analysisId === savedResultId);
      if (!currentResultDoc?.id) {
        throw new Error('Documento de resultado não encontrado');
      }

      await deleteEvaluation(currentResultDoc.id, incidentId);
      
      setToast({ 
        message: 'Avaliação excluída com sucesso!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      setToast({ 
        message: 'Erro ao excluir avaliação', 
        type: 'error' 
      });
    }
  };

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-8 flex items-center">
          <BarChart3 className="mr-2 text-blue-600" />
          Análise Completa de Resultados
        </h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Sobre esta Análise
            </h3>
            <div className="space-y-2 text-gray-600">
              <p>Esta ferramenta realiza uma análise completa dos incidentes mais recentes da base de dados.
                É a culminação das funcionalidades do sistema em um único lugar, voltada para uma
                análise holística e compreensiva dos resultados da ferramenta:</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">1. Busca</h4>
                  <p className="text-sm text-blue-600">Obtém os X incidentes mais recentes</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">2. Categorização</h4>
                  <p className="text-sm text-green-600">Classifica com CERT, LLM e NIST</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2">3. Recomendações</h4>
                  <p className="text-sm text-purple-600">Gera soluções para cada incidente</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="font-medium text-orange-800 mb-2">4. Relatório</h4>
                  <p className="text-sm text-orange-600">Exibe análise completa unificada</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100 w-fit">
              <Brain className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                {DEFAULT_MODEL.id}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de incidentes para análise
                </label>
                <input
                  type="number"
                  value={incidentCount}
                  onChange={(e) => setIncidentCount(e.target.value)}
                  className="w-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="500"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-3">
                {loading && (
                  <button
                    onClick={handleCancelAnalysis}
                    className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
                    title="Cancelar análise"
                  >
                    <Square size={16} />
                    <span>Parar</span>
                  </button>
                )}

                <button
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
                >
                  <Play size={20} />
                  <span>{loading ? "Analisando..." : "Iniciar Análise Completa"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800">Análises Anteriores</h3>
          </div>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{deleteError}</span>
              </div>
            </div>
          )}

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando histórico...</span>
              </div>
            </div>
          ) : previousResults.length > 0 ? (
            <HorizontalScrollContainer className="px-2">
              {previousResults.map((result) => (
                <div key={result.id} className="flex-shrink-0 w-80">
                  <HistoryCard
                    result={result}
                    onClick={() => handleHistoryCardClick(result)}
                    onDelete={handleDeleteResult}
                  />
                </div>
              ))}
            </HorizontalScrollContainer>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma análise anterior
              </h4>
              <p className="text-gray-500">
                Execute sua primeira análise completa para ver o histórico aqui.
              </p>
            </div>
          )}
        </div>

        {error && !error.includes('cancelada') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {(loading || steps.length > 0) && (
          <StepIndicator steps={steps} currentStep={currentStep} />
        )}

        {savedResultId && !loading && !isLoadedFromHistory && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Análise salva com sucesso! ID: {savedResultId}</span>
            </div>
          </div>
        )}

        {savedResultId && !loading && isLoadedFromHistory && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Análise carregada do histórico! ID: {savedResultId}</span>
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">Resumo da Análise</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {results.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Incidentes analisados
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {totalCategorized}/3
                  </div>
                  <div className="text-sm text-gray-600">
                    Tipos de categorização
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {totalRecommendations}
                  </div>
                  <div className="text-sm text-gray-600">
                    Recomendações geradas
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {Math.round((totalRecommendations / results.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Taxa de sucesso
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const currentResultDoc = previousResults.find(r => r.analysisId === savedResultId);
              const evaluationStats = currentResultDoc?.summary.evaluationStats;
              
              return evaluationStats && evaluationStats.totalEvaluations > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="h-6 w-6 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-800">Estatísticas de Avaliação</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {evaluationStats.totalEvaluations}
                      </div>
                      <div className="text-sm text-gray-600">
                        {evaluationStats.totalEvaluations === 1 ? 'Incidente avaliado' : 'Incidentes avaliados'}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-1">
                        {evaluationStats.averageRecommendationRating.toFixed(1)}/5
                      </div>
                      <div className="text-sm text-gray-600">
                        Nota média das recomendações
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-center gap-4 mb-2">
                        {evaluationStats.categorizationAccuracy.cert.total > 0 && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs text-blue-600 font-medium">
                                {Math.round((evaluationStats.categorizationAccuracy.cert.correct / evaluationStats.categorizationAccuracy.cert.total) * 100)}%
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">CERT</span>
                          </div>
                        )}
                        
                        {evaluationStats.categorizationAccuracy.llm.total > 0 && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">
                                {Math.round((evaluationStats.categorizationAccuracy.llm.correct / evaluationStats.categorizationAccuracy.llm.total) * 100)}%
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">LLM</span>
                          </div>
                        )}
                        
                        {evaluationStats.categorizationAccuracy.nist.total > 0 && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-xs text-purple-600 font-medium">
                                {Math.round((evaluationStats.categorizationAccuracy.nist.correct / evaluationStats.categorizationAccuracy.nist.total) * 100)}%
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">NIST</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 text-center">
                        Precisão das categorizações
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <TokenAnalysisSection
              categorizationTokens={currentCategorizationTokensData}
              recommendationTokens={currentRecommendationTokens}
              totalTokensAndCosts={currentTotalTokensAndCosts}
              modelId={DEFAULT_MODEL.id}
            />

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <Search className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">
                  Incidentes Analisados ({results.length})
                </h3>
              </div>
              
              <div className="space-y-4">
                {results.map((analysis, index) => {
                  const currentResultDoc = previousResults.find(r => r.analysisId === savedResultId);
                  const existingEvaluation = currentResultDoc?.incidents
                    .find(i => i.id === analysis.incident.id)?.evaluation;

                  return (
                    <IncidentAnalysisCard
                      key={analysis.incident.id}
                      analysis={analysis}
                      index={index}
                      onEvaluationSave={handleEvaluationSave}
                      onEvaluationDelete={handleEvaluationDelete}
                      existingEvaluation={existingEvaluation}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && results.length === 0 && steps.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Pronto para Análise
            </h3>
            <p className="text-gray-500">
              Configure o número de incidentes e clique em &ldquo;Iniciar Análise Completa&rdquo; para começar.
            </p>
          </div>
        )}

        <LoadHistoryModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onConfirm={handleLoadHistoryConfirm}
          result={selectedHistoryResult}
        />

        {selectedHistoryResult && (
          <AnalysisDetailsModal
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            analysis={selectedHistoryResult}
            onLoadAnalysis={handleLoadFromDetails}
          />
        )}

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </div>
    </div>
  );
}

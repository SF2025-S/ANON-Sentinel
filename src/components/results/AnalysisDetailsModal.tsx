import React from 'react';
import { X, Calendar, Cpu, DollarSign, BarChart3, Target, MessageSquare } from 'lucide-react';
import { ResultsAnalysisDocument } from '@/app/composables/useResultsAnalysis';
import { formatCurrency } from '@/lib/tokenUtils';
import { Timestamp } from 'firebase/firestore';

interface AnalysisDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ResultsAnalysisDocument;
  onLoadAnalysis: () => void;
}

export function AnalysisDetailsModal({ isOpen, onClose, analysis, onLoadAnalysis }: AnalysisDetailsModalProps) {
  if (!isOpen) return null;

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'Data não disponível';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp.toDate());
    }
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAllCategories = () => {
    const allCategories: Array<{ category: string; count: number; type: string }> = [];
    
    if (analysis.summary.categoriesByType.cert.length > 0) {
      analysis.summary.categoriesByType.cert.forEach(cat => 
        allCategories.push({ ...cat, type: 'CERT' })
      );
    }
    
    if (analysis.summary.categoriesByType.llm.length > 0) {
      analysis.summary.categoriesByType.llm.forEach(cat => 
        allCategories.push({ ...cat, type: 'LLM' })
      );
    }
    
    if (analysis.summary.categoriesByType.nist.length > 0) {
      analysis.summary.categoriesByType.nist.forEach(cat => 
        allCategories.push({ ...cat, type: 'NIST' })
      );
    }
    
    return allCategories.sort((a, b) => b.count - a.count);
  };

  const topCategories = getAllCategories().slice(0, 6);
  const evaluationStats = analysis.summary.evaluationStats;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Detalhes da Análise</h2>
              <p className="text-sm text-gray-500">ID: {analysis.analysisId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Data da Análise</span>
              </div>
              <p className="text-blue-800">{formatDate(analysis.timestamp)}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Incidentes</span>
              </div>
              <p className="text-green-800">{analysis.totalIncidents} analisados</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Modelo</span>
              </div>
              <p className="text-purple-800">{analysis.model}</p>
            </div>
          </div>

          {/* Estatísticas de Tokens e Custos */}
          {analysis.summary.totalTokensAndCosts && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Análise de Tokens e Custos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {analysis.summary.totalTokensAndCosts.totalTokens.promptTokens.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Tokens Entrada</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {analysis.summary.totalTokensAndCosts.totalTokens.completionTokens.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Tokens Saída</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {analysis.summary.totalTokensAndCosts.totalTokens.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Tokens</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analysis.summary.totalTokensAndCosts.estimatedCosts.BRL, 'BRL')}
                  </p>
                  <p className="text-sm text-gray-600">Custo Total</p>
                  <p className="text-xs text-gray-500">
                    ({formatCurrency(analysis.summary.totalTokensAndCosts.estimatedCosts.USD, 'USD')})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown de Tokens por Tipo */}
          {analysis.summary.categorizationTokens && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Tokens de Categorização</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.summary.categorizationTokens.cert && (
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-blue-800">CERT</p>
                    <p className="text-sm text-gray-600">
                      {analysis.summary.categorizationTokens.cert.totalTokens.toLocaleString()} tokens
                    </p>
                  </div>
                )}
                
                {analysis.summary.categorizationTokens.llm && (
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-green-800">LLM</p>
                    <p className="text-sm text-gray-600">
                      {analysis.summary.categorizationTokens.llm.totalTokens.toLocaleString()} tokens
                    </p>
                  </div>
                )}
                
                {analysis.summary.categorizationTokens.nist && (
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-purple-800">NIST</p>
                    <p className="text-sm text-gray-600">
                      {analysis.summary.categorizationTokens.nist.totalTokens.toLocaleString()} tokens
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tokens de Recomendações */}
          {analysis.summary.recommendationTokens && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3">Tokens de Recomendações</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-green-800">Total de Tokens</p>
                  <p className="text-sm text-gray-600">
                    {analysis.summary.recommendationTokens.totalTokens.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-green-800">Média por Recomendação</p>
                  <p className="text-sm text-gray-600">
                    {analysis.summary.recommendationTokens.averageTokensPerRecommendation.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Principais Categorias */}
          {topCategories.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Principais Categorias Encontradas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topCategories.map((cat) => (
                  <div key={`${cat.type}-${cat.category}`} className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{cat.category}</p>
                        <p className="text-sm text-gray-600">{cat.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">{cat.count}</p>
                        <p className="text-xs text-gray-500">incidentes</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção de estatísticas de avaliação */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Avaliações Profissionais
            </h3>
            
            {evaluationStats && evaluationStats.totalEvaluations > 0 ? (
              <>
                <div className="flex justify-center gap-8 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {evaluationStats.totalEvaluations}
                    </p>
                    <p className="text-sm text-gray-600">
                      {evaluationStats.totalEvaluations === 1 ? 'Incidente Avaliado' : 'Incidentes Avaliados'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {evaluationStats.averageRecommendationRating.toFixed(1)}/5
                    </p>
                    <p className="text-sm text-gray-600">Nota Média das Recomendações</p>
                  </div>
                </div>

                {/* Precisão das Categorizações */}
                <div>
                  <div className="flex items-center justify-center gap-6">
                    {evaluationStats.categorizationAccuracy.cert.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">CERT:</span>
                        <span className="text-sm font-bold text-blue-600">
                          {Math.round((evaluationStats.categorizationAccuracy.cert.correct / evaluationStats.categorizationAccuracy.cert.total) * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {evaluationStats.categorizationAccuracy.llm.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">LLM:</span>
                        <span className="text-sm font-bold text-green-600">
                          {Math.round((evaluationStats.categorizationAccuracy.llm.correct / evaluationStats.categorizationAccuracy.llm.total) * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {evaluationStats.categorizationAccuracy.nist.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">NIST:</span>
                        <span className="text-sm font-bold text-purple-600">
                          {Math.round((evaluationStats.categorizationAccuracy.nist.correct / evaluationStats.categorizationAccuracy.nist.total) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-gray-600 mb-2">
                  Nenhuma Avaliação Disponível
                </h4>
                <p className="text-sm text-gray-500">
                  Esta análise ainda não foi avaliada por profissionais de cibersegurança.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Carregue a análise para começar a avaliar os incidentes.
                </p>
              </div>
            )}
          </div>

          {/* Resumo da Análise */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumo da Análise</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{analysis.summary.totalCategorized}</p>
                <p className="text-sm text-gray-600">Tipos de Categorização</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{analysis.summary.totalRecommendations}</p>
                <p className="text-sm text-gray-600">Recomendações Geradas</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{analysis.summary.successRate}%</p>
                <p className="text-sm text-gray-600">Taxa de Sucesso</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onLoadAnalysis();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            Carregar Análise
          </button>
        </div>
      </div>
    </div>
  );
} 
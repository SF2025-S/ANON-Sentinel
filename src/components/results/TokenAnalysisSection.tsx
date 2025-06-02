import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, DollarSign, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/tokenUtils';
import { TokenInfoSection } from '../TokenInfoSection';
import { AIUsageSchema } from '@/server/models/zodSchemas';
import { z } from 'zod';

type AIUsage = z.infer<typeof AIUsageSchema>;

interface TokenAnalysisSectionProps {
  categorizationTokens?: {
    cert?: AIUsage;
    llm?: AIUsage;
    nist?: AIUsage;
    total: AIUsage;
  };
  recommendationTokens?: {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    averageTokensPerRecommendation: number;
  };
  totalTokensAndCosts?: {
    totalTokens: AIUsage;
    estimatedCosts: {
      USD: number;
      BRL: number;
    };
  };
  modelId: string;
}

export function TokenAnalysisSection({ 
  categorizationTokens, 
  recommendationTokens, 
  totalTokensAndCosts,
  modelId 
}: TokenAnalysisSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);

  if (!categorizationTokens && !recommendationTokens && !totalTokensAndCosts) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-bold text-gray-800">Análise de Tokens e Custos</h3>
        </div>
        <div className="flex items-center gap-4">
          {totalTokensAndCosts && (
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(totalTokensAndCosts.estimatedCosts.BRL, 'BRL')}
              </div>
              <div className="text-xs text-gray-500">Custo estimado</div>
            </div>
          )}
          {isExpanded ? 
            <ChevronDown className="text-gray-400 h-5 w-5" /> : 
            <ChevronRight className="text-gray-400 h-5 w-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Resumo Geral */}
          {totalTokensAndCosts && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-800">Resumo Total da Análise</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">
                    {totalTokensAndCosts.totalTokens.promptTokens.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-gray-600">Tokens Entrada</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-teal-600">
                    {totalTokensAndCosts.totalTokens.completionTokens.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-gray-600">Tokens Saída</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-600">
                    {totalTokensAndCosts.totalTokens.totalTokens.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-gray-600">Total Tokens</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(totalTokensAndCosts.estimatedCosts.BRL, 'BRL')}
                  </div>
                  <div className="text-sm text-gray-600">Custo Total</div>
                  <div className="text-xs text-gray-500">
                    ({formatCurrency(totalTokensAndCosts.estimatedCosts.USD, 'USD')})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tokens de Categorização */}
          {categorizationTokens && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-800">Tokens de Categorização</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total de Categorização */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-800 mb-2">Total Categorização</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entrada:</span>
                      <span className="font-medium">{categorizationTokens.total.promptTokens.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saída:</span>
                      <span className="font-medium">{categorizationTokens.total.completionTokens.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-1">
                      <span className="text-gray-800 font-medium">Total:</span>
                      <span className="font-bold">{categorizationTokens.total.totalTokens.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {/* CERT */}
                {categorizationTokens.cert && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2">CERT</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Entrada:</span>
                        <span className="font-medium">{categorizationTokens.cert.promptTokens.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Saída:</span>
                        <span className="font-medium">{categorizationTokens.cert.completionTokens.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-1">
                        <span className="text-blue-800 font-medium">Total:</span>
                        <span className="font-bold">{categorizationTokens.cert.totalTokens.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* LLM */}
                {categorizationTokens.llm && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="font-medium text-green-800 mb-2">LLM</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-600">Entrada:</span>
                        <span className="font-medium">{categorizationTokens.llm.promptTokens.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Saída:</span>
                        <span className="font-medium">{categorizationTokens.llm.completionTokens.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between border-t border-green-300 pt-1">
                        <span className="text-green-800 font-medium">Total:</span>
                        <span className="font-bold">{categorizationTokens.llm.totalTokens.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* NIST */}
                {categorizationTokens.nist && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h5 className="font-medium text-purple-800 mb-2">NIST</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-purple-600">Entrada:</span>
                        <span className="font-medium">{categorizationTokens.nist.promptTokens.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-600">Saída:</span>
                        <span className="font-medium">{categorizationTokens.nist.completionTokens.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between border-t border-purple-300 pt-1">
                        <span className="text-purple-800 font-medium">Total:</span>
                        <span className="font-bold">{categorizationTokens.nist.totalTokens.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tokens de Recomendações */}
          {recommendationTokens && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-gray-800">Tokens de Recomendações</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-lg font-bold text-orange-600 mb-1">
                    {recommendationTokens.totalPromptTokens.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-orange-700">Tokens de entrada</div>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                  <div className="text-lg font-bold text-teal-600 mb-1">
                    {recommendationTokens.totalCompletionTokens.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-teal-700">Tokens de saída</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="text-lg font-bold text-indigo-600 mb-1">
                    {recommendationTokens.totalTokens.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-indigo-700">Total de tokens</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-lg font-bold text-purple-600 mb-1">
                    {recommendationTokens.averageTokensPerRecommendation}
                  </div>
                  <div className="text-sm text-purple-700">Média por recomendação</div>
                </div>
              </div>
            </div>
          )}

          {/* Informações Detalhadas */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowDetailedInfo(!showDetailedInfo)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              {showDetailedInfo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>Ver informações detalhadas sobre tokens e custos</span>
            </button>
            
            {showDetailedInfo && totalTokensAndCosts && (
              <div className="mt-4">
                <TokenInfoSection 
                  tokens={totalTokensAndCosts.totalTokens} 
                  modelId={modelId} 
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
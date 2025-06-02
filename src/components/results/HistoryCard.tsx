import { useState } from 'react';
import { BarChart3, Brain, Target, Users, Trash2, MessageSquare } from 'lucide-react';
import { ResultsAnalysisDocument } from '@/app/composables/useResultsAnalysis';
import { formatCurrency } from '@/lib/tokenUtils';
import { Timestamp } from 'firebase/firestore';

interface HistoryCardProps {
  result: ResultsAnalysisDocument;
  onClick: () => void;
  onDelete: (resultId: string) => Promise<void>;
}

export function HistoryCard({ result, onClick, onDelete }: HistoryCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (timestamp: Timestamp) => {
    const date = new Date(timestamp.toDate());
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDate(result.timestamp);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(result.id!);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Erro ao deletar:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const hasTotalCosts = result.summary.totalTokensAndCosts;
  const evaluationStats = result.summary.evaluationStats;

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200 p-6 group relative h-full flex flex-col">
      {/* Botão de exclusão */}
      <div className="absolute top-3 right-3">
        {!showDeleteConfirm ? (
          <button
            onClick={handleDeleteClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"
            title="Excluir análise"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCancelDelete}
              className="p-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-600"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="p-1 rounded text-xs bg-red-100 hover:bg-red-200 text-red-600 disabled:opacity-50"
            >
              {deleting ? 'Excluindo...' : 'Confirmar'}
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo clicável */}
      <div 
        className="cursor-pointer flex-1 flex flex-col"
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pr-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                {result.totalIncidents} Incidentes
              </h3>
              <p className="text-sm text-gray-500">
                {date}
              </p>
              <p className="text-sm text-gray-500">
                às {time}
              </p>
              <p className="text-xs text-blue-600 font-mono">
                ID: {result.analysisId}
              </p>
            </div>
          </div>
          <div className="text-right">
            {hasTotalCosts ? (
              <>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(hasTotalCosts.estimatedCosts.BRL, 'BRL')}
                </div>
                <div className="text-xs text-gray-500">custo total</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {result.summary.successRate}%
                </div>
                <div className="text-xs text-gray-500">sucesso</div>
              </>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold text-gray-800">
              {result.summary.totalCategorized}/3
            </div>
            <div className="text-xs text-gray-600">Tipos</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg font-semibold text-gray-800">
              {result.summary.totalRecommendations}
            </div>
            <div className="text-xs text-gray-600">Soluções</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Brain className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-lg font-semibold text-gray-800 text-xs">
              {result.model.split('-')[0]}
            </div>
            <div className="text-xs text-gray-600">Modelo</div>
          </div>
        </div>

        {/* Seção de avaliações */}
        <div className="pt-3 border-t border-gray-100 mb-4">
          <div className="flex items-center justify-center mb-2">
            <MessageSquare className="h-4 w-4 text-orange-600 mr-1" />
            <span className="text-sm font-medium text-gray-700">Avaliações</span>
          </div>
          
          {evaluationStats && evaluationStats.totalEvaluations > 0 ? (
            <>
              <div className="text-center mb-2">
                <div className="text-sm font-medium text-orange-600">
                  {evaluationStats.totalEvaluations} {evaluationStats.totalEvaluations === 1 ? 'avaliação' : 'avaliações'}
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3 text-xs">
                {evaluationStats.categorizationAccuracy.cert.total > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-600 font-medium">
                      {Math.round((evaluationStats.categorizationAccuracy.cert.correct / evaluationStats.categorizationAccuracy.cert.total) * 100)}%
                    </span>
                  </div>
                )}
                
                {evaluationStats.categorizationAccuracy.llm.total > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">
                      {Math.round((evaluationStats.categorizationAccuracy.llm.correct / evaluationStats.categorizationAccuracy.llm.total) * 100)}%
                    </span>
                  </div>
                )}
                
                {evaluationStats.categorizationAccuracy.nist.total > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-600 font-medium">
                      {Math.round((evaluationStats.categorizationAccuracy.nist.correct / evaluationStats.categorizationAccuracy.nist.total) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">
                Nenhuma avaliação
              </div>
              <div className="text-xs text-gray-400">
                Clique para carregar e avaliar
              </div>
            </div>
          )}
        </div>

        {/* Hover indicator */}
        <div className="mt-auto pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-blue-600 text-center font-medium">
            Clique para carregar esta análise
          </p>
        </div>
      </div>
    </div>
  );
} 
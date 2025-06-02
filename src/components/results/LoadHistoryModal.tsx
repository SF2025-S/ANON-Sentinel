import { useState } from 'react';
import { X, BarChart3, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { ResultsAnalysisDocument } from '@/app/composables/useResultsAnalysis';
import { Timestamp } from 'firebase/firestore';
interface LoadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  result: ResultsAnalysisDocument | null;
}

export function LoadHistoryModal({ isOpen, onClose, onConfirm, result }: LoadHistoryModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !result) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.toDate()).toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Carregar Análise Anterior
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Clock className="h-4 w-4" />
              <span>{formatDate(result.timestamp)}</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Incidentes:</span>
                  <span className="font-semibold text-gray-800 ml-2">
                    {result.totalIncidents}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Taxa de sucesso:</span>
                  <span className="font-semibold text-green-600 ml-2">
                    {result.summary.successRate}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Categorizações:</span>
                  <span className="font-semibold text-gray-800 ml-2">
                    {result.summary.totalCategorized}/3
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Recomendações:</span>
                  <span className="font-semibold text-purple-600 ml-2">
                    {result.summary.totalRecommendations}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium mb-1">Atenção</p>
                <p className="text-amber-700">
                  Carregar esta análise irá substituir os resultados atuais da página. 
                  Certifique-se de que deseja continuar.
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Deseja carregar esta análise e exibir seus resultados na página atual?
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Carregando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Carregar Análise</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 
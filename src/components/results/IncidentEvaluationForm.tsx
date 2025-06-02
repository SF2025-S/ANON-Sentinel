import { useState } from 'react';
import { Star, MessageSquare, CheckCircle, XCircle, Save, X, Trash2 } from 'lucide-react';
import { IncidentEvaluation } from '@/app/composables/useResultsAnalysis';
import { auth } from '@/lib/firebaseconfig';
import { Timestamp } from 'firebase/firestore';

interface IncidentEvaluationFormProps {
  incidentId: string;
  existingEvaluation?: IncidentEvaluation;
  onSave: (evaluation: IncidentEvaluation) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  certCategory?: string;
  llmCategory?: string;
  nistCategory?: string;
}

export function IncidentEvaluationForm({
  incidentId,
  existingEvaluation,
  onSave,
  onDelete,
  onCancel,
  certCategory,
  llmCategory,
  nistCategory
}: IncidentEvaluationFormProps) {
  const [categorizationComments, setCategorizationComments] = useState(
    existingEvaluation?.categorization.comments || ''
  );
  const [certCorrect, setCertCorrect] = useState<boolean | undefined>(
    existingEvaluation?.categorization.certCorrect
  );
  const [llmCorrect, setLlmCorrect] = useState<boolean | undefined>(
    existingEvaluation?.categorization.llmCorrect
  );
  const [nistCorrect, setNistCorrect] = useState<boolean | undefined>(
    existingEvaluation?.categorization.nistCorrect
  );
  const [recommendationComments, setRecommendationComments] = useState(
    existingEvaluation?.recommendation.comments || ''
  );
  const [recommendationRating, setRecommendationRating] = useState(
    existingEvaluation?.recommendation.rating || 0
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser) {
      alert('Você precisa estar logado para avaliar');
      return;
    }

    setSaving(true);
    try {
      const evaluation: IncidentEvaluation = {
        incidentId,
        evaluatorEmail: auth.currentUser.email!,
        evaluationTimestamp: Timestamp.now(),
        categorization: {
          comments: categorizationComments,
          certCorrect: certCategory ? certCorrect : undefined,
          llmCorrect: llmCategory ? llmCorrect : undefined,
          nistCorrect: nistCategory ? nistCorrect : undefined,
        },
        recommendation: {
          comments: recommendationComments,
          rating: recommendationRating,
        },
      };

      await onSave(evaluation);
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      alert('Erro ao salvar avaliação');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm('Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      alert('Erro ao excluir avaliação');
    } finally {
      setDeleting(false);
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRecommendationRating(star)}
            className={`p-1 rounded transition-colors ${
              star <= recommendationRating
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {recommendationRating > 0 ? `${recommendationRating}/5` : 'Não avaliado'}
        </span>
      </div>
    );
  };

  const renderCategorizationCheck = (
    type: string,
    category: string | undefined,
    correct: boolean | undefined,
    setCorrect: (value: boolean | undefined) => void
  ) => {
    if (!category) return null;

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <span className="font-medium text-gray-700">{type}</span>
          <p className="text-sm text-gray-600">{category}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCorrect(correct === true ? undefined : true)}
            className={`p-2 rounded-lg transition-colors ${
              correct === true
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
            }`}
            title="Correto"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCorrect(correct === false ? undefined : false)}
            className={`p-2 rounded-lg transition-colors ${
              correct === false
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'
            }`}
            title="Incorreto"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          Avaliação Profissional
        </h4>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Avaliação de Categorização */}
      <div className="space-y-4">
        <h5 className="font-medium text-gray-700">Avaliação das Categorizações</h5>
        
        <div className="space-y-3">
          {renderCategorizationCheck('CERT', certCategory, certCorrect, setCertCorrect)}
          {renderCategorizationCheck('LLM', llmCategory, llmCorrect, setLlmCorrect)}
          {renderCategorizationCheck('NIST', nistCategory, nistCorrect, setNistCorrect)}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentários sobre as categorizações
          </label>
          <textarea
            value={categorizationComments}
            onChange={(e) => setCategorizationComments(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Descreva sua avaliação das categorizações da IA..."
          />
        </div>
      </div>

      {/* Avaliação de Recomendação */}
      <div className="space-y-4">
        <h5 className="font-medium text-gray-700">Avaliação da Recomendação</h5>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Avaliação geral (0-5 estrelas)
          </label>
          {renderStarRating()}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentários sobre a recomendação
          </label>
          <textarea
            value={recommendationComments}
            onChange={(e) => setRecommendationComments(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Descreva sua avaliação da recomendação da IA..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {existingEvaluation && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Excluindo...' : 'Excluir Avaliação'}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={saving || deleting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
} 
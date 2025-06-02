import { useState } from 'react';
import { FileText, Clock, ChevronDown, ChevronRight, Tag, Lightbulb, AlertCircle, Zap, MessageSquare, CheckCircle, XCircle, Star, CheckCircle as CheckCircle2, Trash2 } from 'lucide-react';
import { IncidentAnalysis } from '@/app/composables/useResultsAnalysis';
import { getCategoryIcon } from '../IconGenerator';
import ReactMarkdown from 'react-markdown';
import { TicketRecommendationWithUsage } from '@/server/models/ticket';
import { IncidentEvaluationForm } from './IncidentEvaluationForm';
import { IncidentEvaluation } from '@/app/composables/useResultsAnalysis';

interface IncidentAnalysisCardProps {
  analysis: IncidentAnalysis;
  index: number;
  onEvaluationSave?: (incidentId: string, evaluation: IncidentEvaluation) => Promise<void>;
  onEvaluationDelete?: (incidentId: string) => Promise<void>;
  existingEvaluation?: IncidentEvaluation;
}

const getColorClasses = (color: string) => {
  const colorMap: Record<string, {bg: string, border: string, text: string, bgDark: string}> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', bgDark: 'bg-blue-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', bgDark: 'bg-green-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', bgDark: 'bg-purple-100' }
  };
  return colorMap[color] || colorMap.blue;
};

export function IncidentAnalysisCard({ 
  analysis, 
  index, 
  onEvaluationSave,
  onEvaluationDelete,
  existingEvaluation 
}: IncidentAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedCategoryCards, setExpandedCategoryCards] = useState<string[]>([]);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleCategoryCard = (cardId: string) => {
    setExpandedCategoryCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(c => c !== cardId)
        : [...prev, cardId]
    );
  };

  const categories = [
    { type: 'CERT', category: analysis.certCategory, reason: analysis.certReason, color: 'blue' },
    { type: 'LLM', category: analysis.llmCategory, reason: analysis.llmReason, color: 'green' },
    { type: 'NIST', category: analysis.nistCategory, reason: analysis.nistReason, color: 'purple' }
  ];

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const hasUsageData = analysis.recommendation && 'usage' in analysis.recommendation;

  const handleEvaluationSave = async (evaluation: IncidentEvaluation) => {
    if (onEvaluationSave) {
      await onEvaluationSave(analysis.incident.id, evaluation);
      setShowEvaluationForm(false);
    }
  };

  const handleEvaluationDelete = async () => {
    if (!onEvaluationDelete) return;
    
    const confirmed = window.confirm('Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onEvaluationDelete(analysis.incident.id);
      setShowEvaluationForm(false);
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      alert('Erro ao excluir avaliação');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:border-gray-200 transition-all duration-200">
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-gray-700">Incidente #{index + 1}</p>
              <div 
                className={`w-2 h-2 rounded-full ${
                  existingEvaluation ? 'bg-orange-500' : 'bg-gray-300'
                }`}
                title={existingEvaluation ? 'Incidente avaliado' : 'Incidente não avaliado'}
              />
            </div>
            <p className="text-sm text-gray-500">ID: {analysis.incident.id}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{new Date(analysis.incident.timestamp).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            {categories.map((cat, idx) => {
              const colors = getColorClasses(cat.color);
              return cat.category && (
                <div 
                  key={idx}
                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${colors.bgDark}`}
                  title={`${cat.type}: ${cat.category}`}
                >
                  <div className={`w-3 h-3`}>
                    {getCategoryIcon(cat.category)}
                  </div>
                </div>
              );
            })}
          </div>
          {isExpanded ? 
            <ChevronDown className="text-gray-400 h-5 w-5" /> : 
            <ChevronRight className="text-gray-400 h-5 w-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Seção do Conteúdo do Incidente */}
          <div className="p-4 bg-gray-50">
            <button
              className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900 w-full text-left"
              onClick={(e) => {
                e.stopPropagation();
                toggleSection('content');
              }}
            >
              <ChevronRight 
                className={`h-4 w-4 transition-transform ${
                  expandedSections.includes('content') ? 'rotate-90' : ''
                }`} 
              />
              <FileText className="h-4 w-4" />
              <h4 className="font-medium">Conteúdo do Incidente</h4>
            </button>

            {expandedSections.includes('content') && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600 whitespace-pre-wrap text-sm">
                  {analysis.incident.content}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>Fonte: {analysis.incident.source}</span>
                </div>
              </div>
            )}
          </div>

          {/* Seção de Categorizações */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-800">Categorizações</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {categories.map((cat, idx) => {
                const colors = getColorClasses(cat.color);
                const cardId = `${analysis.incident.id}-${cat.type}`;
                const isCardExpanded = expandedCategoryCards.includes(cardId);
                
                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      cat.category 
                        ? `${colors.bg} ${colors.border} hover:shadow-md` 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cat.reason) {
                        toggleCategoryCard(cardId);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full ${colors.bgDark} flex items-center justify-center`}>
                        {cat.category ? (
                          <div className="w-3 h-3">
                            {getCategoryIcon(cat.category)}
                          </div>
                        ) : (
                          <AlertCircle className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <span className={`font-medium ${colors.text}`}>{cat.type}</span>
                    </div>
                    
                    {cat.category ? (
                      <>
                        <p className={`text-sm font-medium ${colors.text} mb-2`}>
                          {cat.category}
                        </p>
                        {cat.reason && (
                          <div>
                            <p className="text-xs text-gray-600">
                              {isCardExpanded ? cat.reason : truncateText(cat.reason, 100)}
                            </p>
                            {cat.reason.length > 100 && (
                              <div className="mt-2 text-center">
                                <div className={`inline-flex items-center text-xs ${colors.text} font-medium`}>
                                  {isCardExpanded ? (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Clique para recolher
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="w-3 h-3 mr-1" />
                                      Clique para expandir
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Não classificado</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção de Recomendação */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
            <button
              className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900 w-full text-left mb-3"
              onClick={(e) => {
                e.stopPropagation();
                setShowRecommendation(!showRecommendation);
              }}
            >
              <ChevronRight 
                className={`h-4 w-4 transition-transform ${
                  showRecommendation ? 'rotate-90' : ''
                }`} 
              />
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-800">Recomendação de Solução</h4>
            </button>

            {showRecommendation && (
              <>
                {analysis.recommendation ? (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                    <div className="prose prose-blue max-w-none prose-sm">
                      <ReactMarkdown>{analysis.recommendation.recommendation}</ReactMarkdown>
                    </div>
                    
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(analysis.recommendation.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        
                        {hasUsageData && (
                          <>
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-600">
                                {(analysis.recommendation as TicketRecommendationWithUsage).usage.promptTokens.toLocaleString('pt-BR')} entrada
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-teal-500" />
                              <span className="text-teal-600">
                                {(analysis.recommendation as TicketRecommendationWithUsage).usage.completionTokens.toLocaleString('pt-BR')} saída
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-indigo-500" />
                              <span className="text-indigo-600">
                                {(analysis.recommendation as TicketRecommendationWithUsage).usage.totalTokens.toLocaleString('pt-BR')} total
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Recomendação não disponível</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Seção de Avaliação */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium text-gray-800">Avaliação Profissional</h4>
              </div>
              
              {existingEvaluation && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Avaliado</span>
                </div>
              )}
            </div>

            {existingEvaluation && !showEvaluationForm ? (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Avaliação das Categorizações</h5>
                    <div className="flex items-center gap-4 text-sm">
                      {existingEvaluation.categorization.certCorrect !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>CERT:</span>
                          {existingEvaluation.categorization.certCorrect ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                      {existingEvaluation.categorization.llmCorrect !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>LLM:</span>
                          {existingEvaluation.categorization.llmCorrect ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                      {existingEvaluation.categorization.nistCorrect !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>NIST:</span>
                          {existingEvaluation.categorization.nistCorrect ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                    {existingEvaluation.categorization.comments && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        &ldquo;{existingEvaluation.categorization.comments}&rdquo;
                      </p>
                    )}
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Avaliação da Recomendação</h5>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= existingEvaluation.recommendation.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {existingEvaluation.recommendation.rating}/5
                      </span>
                    </div>
                    {existingEvaluation.recommendation.comments && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        &ldquo;{existingEvaluation.recommendation.comments}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Avaliado por {existingEvaluation.evaluatorEmail} em{' '}
                    {existingEvaluation.evaluationTimestamp.toDate().toLocaleString('pt-BR')}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowEvaluationForm(true)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    disabled={deleting}
                  >
                    Editar Avaliação
                  </button>
                  
                  {onEvaluationDelete && (
                    <button
                      onClick={handleEvaluationDelete}
                      disabled={deleting}
                      className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {deleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                  )}
                </div>
              </div>
            ) : showEvaluationForm ? (
              <IncidentEvaluationForm
                incidentId={analysis.incident.id}
                existingEvaluation={existingEvaluation}
                onSave={handleEvaluationSave}
                onDelete={onEvaluationDelete ? handleEvaluationDelete : undefined}
                onCancel={() => setShowEvaluationForm(false)}
                certCategory={analysis.certCategory}
                llmCategory={analysis.llmCategory}
                nistCategory={analysis.nistCategory}
              />
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Este incidente ainda não foi avaliado por um profissional.
                  </p>
                  <button
                    onClick={() => setShowEvaluationForm(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    Avaliar Incidente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
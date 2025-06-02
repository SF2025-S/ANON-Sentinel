import { useState } from 'react';
import { ChevronDown, ChevronRight, BarChart3, Clock, Brain, Target } from 'lucide-react';
import { ResultsAnalysisDocument } from '@/app/composables/useResultsAnalysis';

interface PreviousResultCardProps {
  result: ResultsAnalysisDocument;
}

export function PreviousResultCard({ result }: PreviousResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <div
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">
              Análise de {result.totalIncidents} incidentes
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{new Date(result.timestamp.toDate()).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>{result.summary.successRate}% sucesso</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="h-4 w-4" />
                <span>{result.model}</span>
              </div>
            </div>
          </div>
        </div>
        {isExpanded ? 
          <ChevronDown className="text-gray-400 h-5 w-5" /> : 
          <ChevronRight className="text-gray-400 h-5 w-5" />}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {result.summary.totalCategorized}/3
              </div>
              <div className="text-sm text-gray-600">Tipos de categorização</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {result.summary.totalRecommendations}
              </div>
              <div className="text-sm text-gray-600">Recomendações geradas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {result.summary.successRate}%
              </div>
              <div className="text-sm text-gray-600">Taxa de sucesso</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['cert', 'llm', 'nist'].map((type) => {
              const categories = result.summary.categoriesByType[type as keyof typeof result.summary.categoriesByType];
              return (
                <div key={type} className="bg-white p-3 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 uppercase">{type}</h4>
                  {categories.length > 0 ? (
                    <div className="space-y-1">
                      {categories.slice(0, 3).map((cat) => (
                        <div key={cat.category} className="flex justify-between text-sm">
                          <span className="text-gray-600">{cat.category}</span>
                          <span className="text-gray-800 font-medium">{cat.count}</span>
                        </div>
                      ))}
                      {categories.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{categories.length - 3} outras categorias
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Não disponível</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 
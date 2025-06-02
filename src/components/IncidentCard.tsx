import { useState } from 'react';
import { FileText, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { DetailedSimilarityScore } from '@/server/models/similarityScore';

interface IncidentCardProps {
  score: DetailedSimilarityScore;
}

export function IncidentCard({ score }: IncidentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors duration-200">
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">ID: {score.documentId}</p>
            <p className="text-sm text-blue-600">
              {(score.similarity * 100).toFixed(1)}% relevante
            </p>
          </div>
        </div>
        {isExpanded ? 
          <ChevronDown className="text-gray-400" /> : 
          <ChevronRight className="text-gray-400" />}
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="space-y-2">
            <p className="text-gray-600 whitespace-pre-wrap">
              {score.incident.content}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{new Date(score.incident.timestamp).toLocaleString('pt-BR')}</span>
              {score.incident.source && (
                <>
                  <span className="mx-1">•</span>
                  <span>Fonte: {score.incident.source}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
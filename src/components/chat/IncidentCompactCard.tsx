import { FileText } from 'lucide-react';
import { IncidentWithScore } from '@/server/models/incident';

interface IncidentCompactCardProps {
  incident: IncidentWithScore;
  onClick: () => void;
}

export function IncidentCompactCard({ incident, onClick }: IncidentCompactCardProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors duration-200 cursor-pointer mb-3"
      onClick={onClick}
    >
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="font-medium text-gray-700 text-sm truncate">ID: {incident.id}</p>
            <p className="text-xs text-blue-600">
              {(incident.score * 100).toFixed(1)}% relevante
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
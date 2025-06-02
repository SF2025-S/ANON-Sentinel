import { useState, useEffect } from 'react';
import { X, FileText, Clock, Loader2 } from 'lucide-react';
import { IncidentWithScore } from '@/server/models/incident';
import { apiClient } from '@/lib/api-client';

interface IncidentModalProps {
  incident: IncidentWithScore;
  onClose: () => void;
  isOpen: boolean;
}

interface IncidentResponse {
  message: string;
  data: {
    content: string;
  };
}

export function IncidentModal({ incident, onClose, isOpen }: IncidentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incidentContent, setIncidentContent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIncidentContent() {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient<IncidentResponse>(`/incidents/incident/${incident.id}`);
        setIncidentContent(response.data.content);
      } catch (err) {
        setError('Erro ao carregar o conteúdo do incidente');
        console.error('Erro ao buscar conteúdo:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidentContent();
  }, [incident.id, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold">Detalhes do Incidente</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-800">ID: {incident.id}</h4>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {(incident.score * 100).toFixed(1)}% relevante
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Clock className="h-4 w-4" />
              <span>{new Date(incident.timestamp).toLocaleString('pt-BR')}</span>
              {incident.source && (
                <>
                  <span className="mx-1">•</span>
                  <span>Fonte: {incident.source}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-medium mb-3 flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              Conteúdo
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Carregando conteúdo...</span>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">
                  {error}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                  {incidentContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
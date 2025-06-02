import { useState } from 'react';
import { FileText, Clock, ChevronDown, ChevronRight, Lightbulb, Brain, AlertCircle } from 'lucide-react';
import { Ticket, TicketRecommendation } from '../server/models/ticket';
import ReactMarkdown from 'react-markdown';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/config/AuthContext';

interface TicketCardProps {
  ticket: Ticket;
  onUpdate?: () => void;
}

export function TicketCard({ ticket: initialTicket}: TicketCardProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { user } = useAuth();

  const { messages, data, setMessages, append, status } = useChat({
    api: `/api/tickets/${ticket.id}/recommend`,
    headers: {
      'Authorization': `Bearer ${user?.getIdToken() || ''}`
    },
    initialMessages: [],
    id: `ticket-${ticket.id}`,
    onResponse: (response) => {
      if (!response.ok) {
        setError('Erro na resposta da API');
      }
    },
    onFinish: (message) => {
      setIsLoadingRecommendation(false);
      setIsStreaming(false);

      if (message && message.role === 'assistant' && typeof message.content === 'string' && message.content.trim() !== '') {
        const metadata = data && data[0] ? data[0] as unknown as Partial<TicketRecommendation> : {};
        
        // Criar recomendação completa usando o conteúdo da mensagem recebida
        const newRecommendation: TicketRecommendation = {
          id: metadata.id || `rec-${Date.now()}`,
          ticketId: ticket.id,
          recommendation: message.content,
          timestamp: metadata.timestamp || new Date().toISOString(),
          confidence: metadata.confidence || 0.85
        };
        
        // Atualizar o estado do ticket para incluir a nova recomendação
        setTicket(prevTicket => ({
          ...prevTicket,
          recommendations: [
            ...(prevTicket.recommendations || []),
            newRecommendation
          ]
        }));
      } else {
        console.error('onFinish: Mensagem do assistente inválida ou conteúdo vazio recebido.', message);
      }
    },
    onError: (err) => {
      console.error('Stream error:', err);
      setError(err.message || "Erro ao gerar recomendação");
      setIsLoadingRecommendation(false);
      setIsStreaming(false);
    }
  });

  const isChatRequestInProgress = status === 'submitted' || status === 'streaming';

  const handleGetRecommendation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoadingRecommendation) return;

    setIsLoadingRecommendation(true);
    setIsStreaming(true);
    setError(null);
    
    // Limpar mensagens anteriores antes de iniciar nova recomendação
    setMessages([]);
    
    // Usar append para adicionar a mensagem e enviar para a API automaticamente
    append({
      role: 'user',
      content: 'Gerar recomendação'
    });
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
          <div>
            <p className="font-medium text-gray-700">Ticket #{ticket.id}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{new Date(ticket.timestamp).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
        {isExpanded ? 
          <ChevronDown className="text-gray-400 h-5 w-5" /> : 
          <ChevronRight className="text-gray-400 h-5 w-5" />}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Seção de Recomendações */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-800">Recomendações</h3>
              </div>
              
              {!isLoadingRecommendation && !isChatRequestInProgress && (
                <button
                  onClick={handleGetRecommendation}
                  disabled={isLoadingRecommendation || isChatRequestInProgress}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50
                           disabled:cursor-not-allowed shadow-sm"
                >
                  <Brain className="h-4 w-4" />
                  <span>{isLoadingRecommendation || isChatRequestInProgress ? 'Gerando...' : 'Gerar Recomendação'}</span>
                </button>
              )}
            </div>

            {error && (
              <div className="mb-3 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Recomendações salvas */}
            {ticket.recommendations && ticket.recommendations.length > 0 && (
              <div className="space-y-3">
                {ticket.recommendations.map((rec) => (
                  <div 
                    key={rec.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-blue-100"
                  >
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(rec.timestamp).toLocaleString('pt-BR')}</span>
                      <span className="mx-1">•</span>
                      <div className="flex items-center gap-1">
                        <Brain className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-600">
                          Confiança: {(rec.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 mt-3 pb-5"></div>
                    <div className="prose prose-blue max-w-none">
                      <ReactMarkdown>{rec.recommendation}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recomendação em streaming - só mostrar quando estiver em streaming */}
            {isStreaming && messages.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <div className="prose prose-blue max-w-none">
                  {messages.map((message) => (
                    message.role === 'assistant' && (
                      <div key={message.id}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3 text-blue-600" />
                    <span className="text-blue-600">Gerando recomendação...</span>
                  </div>
                </div>
              </div>
            )}
            
            {(isLoadingRecommendation || isChatRequestInProgress) && messages.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {!isLoadingRecommendation && !isChatRequestInProgress && !isStreaming && (!ticket.recommendations || ticket.recommendations.length === 0) && (
              <div className="bg-white p-4 rounded-lg text-center text-gray-500">
                Nenhuma recomendação disponível. Clique em &ldquo;Gerar Recomendação&ldquo; para criar uma.
              </div>
            )}
          </div>

          {/* Conteúdo do Ticket */}
          <div className="p-4 bg-gray-50">
            <h3 className="font-medium text-gray-700 mb-3">Detalhes do Incidente</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown>{ticket.content}</ReactMarkdown>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                {ticket.source && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                    Fonte: {ticket.source}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
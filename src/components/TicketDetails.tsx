import { useState } from 'react';
import { 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Lightbulb, 
  Brain, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  Save,
  Check,
  Clock,
  Loader2
} from 'lucide-react';
import { Ticket, TicketRecommendation } from '../server/models/ticket';
import ReactMarkdown from 'react-markdown';
import { useChat } from '@ai-sdk/react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseconfig';

interface TicketDetailsProps {
  ticket: Ticket | null;
  onTicketUpdate: (ticket: Ticket) => void;
}

const SafeTextRenderer = ({ content }: { content: string }) => {
  // Detectar se o conteúdo tem caracteres problemáticos que podem quebrar o markdown
  const hasProblematicChars = /[=]{3,}|[#]{4,}|[*]{4,}|[_]{4,}/g.test(content);
  
  if (hasProblematicChars) {
    // Renderizar como texto simples com quebras de linha preservadas
    return (
      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
        {content}
      </div>
    );
  }
  
  // Renderizar com markdown se for seguro
  return (
    <div className="prose prose-gray max-w-none text-sm">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export function TicketDetails({ ticket, onTicketUpdate }: TicketDetailsProps) {
  const [contentExpanded, setContentExpanded] = useState(true);
  const [solutionsExpanded, setSolutionsExpanded] = useState(true);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedSolutions, setSavedSolutions] = useState<string[]>([]);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  const { messages, data, setMessages, append, status } = useChat({
    api: ticket ? `/api/tickets/${ticket.id}/recommend` : '',
    initialMessages: [],
    id: ticket ? `ticket-${ticket.id}` : '',
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
        
        const newRecommendation: TicketRecommendation = {
          id: metadata.id || `rec-${Date.now()}`,
          ticketId: ticket!.id,
          recommendation: message.content,
          timestamp: metadata.timestamp || new Date().toISOString(),
          confidence: metadata.confidence || 0.85
        };
        
        const updatedTicket = {
          ...ticket!,
          recommendations: [
            ...(ticket!.recommendations || []),
            newRecommendation
          ]
        };
        
        onTicketUpdate(updatedTicket);
        setCurrentSolutionIndex((ticket!.recommendations?.length || 0));
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

  const handleGetRecommendation = () => {
    if (isLoadingRecommendation || !ticket) return;

    setIsLoadingRecommendation(true);
    setIsStreaming(true);
    setError(null);
    setMessages([]);
    
    append({
      role: 'user',
      content: 'Gerar recomendação'
    });
  };

  const handleSaveSolution = async (recommendation: TicketRecommendation) => {
    if (!ticket) return;

    const solutionKey = `${ticket.id}-${recommendation.id}`;
    setSavingStates(prev => ({ ...prev, [solutionKey]: true }));

    try {
      await addDoc(collection(db, "solutions"), {
        ticketId: ticket.id,
        recommendationId: recommendation.id,
        recommendation: recommendation.recommendation,
        confidence: recommendation.confidence,
        timestamp: Timestamp.now(),
        originalTimestamp: recommendation.timestamp
      });

      setSavedSolutions(prev => [...prev, solutionKey]);
      
      // Remove do estado após 2 segundos para mostrar feedback visual
      setTimeout(() => {
        setSavedSolutions(prev => prev.filter(id => id !== solutionKey));
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar solução:', error);
      setError('Erro ao salvar solução no Firebase');
    } finally {
      setSavingStates(prev => ({ ...prev, [solutionKey]: false }));
    }
  };

  const recommendations = ticket?.recommendations || [];
  const allSolutions = [...recommendations];
  
  // Adicionar solução em streaming se existir
  if (isStreaming && messages.length > 0) {
    const streamingSolution = messages.find(m => m.role === 'assistant');
    if (streamingSolution) {
      allSolutions.push({
        id: 'streaming',
        ticketId: ticket?.id || '',
        recommendation: streamingSolution.content,
        timestamp: new Date().toISOString(),
        confidence: 0.85
      });
    }
  }

  const currentSolution = allSolutions[currentSolutionIndex];

  const nextSolution = () => {
    if (currentSolutionIndex < allSolutions.length - 1) {
      setCurrentSolutionIndex(currentSolutionIndex + 1);
    }
  };

  const previousSolution = () => {
    if (currentSolutionIndex > 0) {
      setCurrentSolutionIndex(currentSolutionIndex - 1);
    }
  };

  if (!ticket) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 h-[calc(100vh-200px)] min-h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500 p-8">
          <FileText className="h-16 w-16 mx-auto mb-6 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Selecione um ticket
          </h3>
          <p className="text-gray-500">
            Escolha um ticket da lista para ver os detalhes e gerar soluções
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
      <div className="p-4 lg:p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
            Ticket #{ticket.id}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{new Date(ticket.timestamp).toLocaleString('pt-BR')}</span>
          {ticket.source && (
            <>
              <span className="mx-2">•</span>
              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                {ticket.source}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Seção do Conteúdo */}
        <div className="border-b border-gray-100">
          <div 
            className="p-4 lg:p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => setContentExpanded(!contentExpanded)}
          >
            <h3 className="font-semibold text-gray-800 flex items-center text-lg">
              <FileText className="mr-3 h-5 w-5 text-gray-600" />
              Conteúdo do Incidente
            </h3>
            {contentExpanded ? 
              <ChevronDown className="h-5 w-5 text-gray-400" /> : 
              <ChevronRight className="h-5 w-5 text-gray-400" />
            }
          </div>
          
          {contentExpanded && (
            <div className="px-4 lg:px-6 pb-4 lg:pb-6">
              <div className="bg-gray-50 rounded-xl p-4 lg:p-6 max-h-80 overflow-y-auto border border-gray-200">
                <SafeTextRenderer content={ticket.content} />
              </div>
            </div>
          )}
        </div>

        {/* Seção de Soluções */}
        <div>
          <div 
            className="p-4 lg:p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => setSolutionsExpanded(!solutionsExpanded)}
          >
            <h3 className="font-semibold text-gray-800 flex items-center text-lg">
              <Lightbulb className="mr-3 h-5 w-5 text-yellow-600" />
              Soluções IA ({allSolutions.length})
            </h3>
            {solutionsExpanded ? 
              <ChevronDown className="h-5 w-5 text-gray-400" /> : 
              <ChevronRight className="h-5 w-5 text-gray-400" />
            }
          </div>

          {solutionsExpanded && (
            <div className="px-4 lg:px-6 pb-4 lg:pb-6">
              {/* Botão para gerar nova recomendação */}
              {!isLoadingRecommendation && !isChatRequestInProgress && (
                <div className="mb-6">
                  <button
                    onClick={handleGetRecommendation}
                    disabled={isLoadingRecommendation || isChatRequestInProgress}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl
                             hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50
                             disabled:cursor-not-allowed shadow-lg hover:shadow-xl font-medium"
                  >
                    <Brain className="h-5 w-5" />
                    <span>Gerar Nova Solução</span>
                  </button>
                </div>
              )}

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-6 flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {/* Área de soluções */}
              {allSolutions.length === 0 && !isLoadingRecommendation && !isChatRequestInProgress ? (
                <div className="bg-gray-50 rounded-xl p-8 lg:p-12 text-center text-gray-500 border border-gray-200">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">
                    Nenhuma solução disponível
                  </h4>
                  <p className="text-gray-500">
                    Clique em &ldquo;Gerar Nova Solução&ldquo; para criar uma recomendação personalizada.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Loading estado */}
                  {(isLoadingRecommendation || isChatRequestInProgress) && allSolutions.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <span className="text-gray-600 font-medium">Gerando solução personalizada...</span>
                      </div>
                    </div>
                  )}

                  {/* Navegação entre soluções */}
                  {allSolutions.length > 1 && (
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <button
                        onClick={previousSolution}
                        disabled={currentSolutionIndex === 0}
                        className="p-3 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      <span className="text-sm font-medium text-gray-700">
                        Solução {currentSolutionIndex + 1} de {allSolutions.length}
                      </span>
                      
                      <button
                        onClick={nextSolution}
                        disabled={currentSolutionIndex === allSolutions.length - 1}
                        className="p-3 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}

                  {/* Solução atual */}
                  {currentSolution && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                      <div className="p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Brain className="h-4 w-4 text-blue-600" />
                            {currentSolution.id === 'streaming' ? (
                              <span className="text-blue-600 font-medium">Gerando solução...</span>
                            ) : (
                              <>
                                <span className="font-medium">{new Date(currentSolution.timestamp).toLocaleString('pt-BR')}</span>
                                <span className="mx-2">•</span>
                                <span className="text-blue-600 font-medium">
                                  Confiança: {(currentSolution.confidence * 100).toFixed(1)}%
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Botão salvar */}
                          {currentSolution.id !== 'streaming' && (
                            <button
                              onClick={() => handleSaveSolution(currentSolution)}
                              disabled={savingStates[`${ticket.id}-${currentSolution.id}`]}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                savedSolutions.includes(`${ticket.id}-${currentSolution.id}`)
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md'
                              }`}
                            >
                              {savingStates[`${ticket.id}-${currentSolution.id}`] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : savedSolutions.includes(`${ticket.id}-${currentSolution.id}`) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              {savedSolutions.includes(`${ticket.id}-${currentSolution.id}`) ? 'Salvo!' : 'Salvar'}
                            </button>
                          )}
                        </div>
                        
                        <div className="bg-white rounded-xl p-4 lg:p-6 max-h-96 overflow-y-auto border border-blue-100 shadow-sm">
                          <div className="prose prose-blue max-w-none text-sm">
                            <ReactMarkdown>{currentSolution.recommendation}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
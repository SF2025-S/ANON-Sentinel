"use client"

import { useState, useRef, useEffect } from "react";
import { Send, Info, Brain, MessageSquare, Trash, Database, BarChart, X, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DEFAULT_MODEL } from '@/server/models/aiModels';
import { useChat } from "@ai-sdk/react";
import { useAuth } from '@/config/AuthContext';
import { createMessageMetadata, MessageMetadata } from "@/lib/tokenUtils";
import { IncidentCompactCard } from '@/components/chat/IncidentCompactCard';
import { IncidentModal } from '@/components/chat/IncidentModal';
import { IncidentWithScore } from '@/server/models/incident';

type SidebarTab = 'contexto' | 'metadados';

interface ChatStreamData {
  contextUtilization?: number;
  sourceDocuments?: string[];
  similarityScores?: {
    documentId: string;
    similarity: number;
    incident: IncidentWithScore;
  }[];
  error?: string;
}

export default function GeneratePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [infoPanel, setInfoPanel] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('contexto');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [realMetadata, setRealMetadata] = useState<Record<string, MessageMetadata>>({});
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithScore | null>(null);
  const startTimeRef = useRef<number>(0);
  const startStreamingTimeRef = useRef<number>(0);
  const [incidentsByMessage, setIncidentsByMessage] = useState<Record<string, IncidentWithScore[]>>({});

  const { messages, input, handleInputChange, handleSubmit, setMessages, data, setData } = useChat({
    api: '/api/ai/chat/stream',
    headers: {
      'Authorization': `Bearer ${user?.getIdToken() || ''}`
    },
    onResponse: (response) => {
      startStreamingTimeRef.current = Date.now();
      console.log('Response status:', response.status);
      if (!response.ok) {
        console.error('Response not ok:', response);
      }
    },
    onFinish: (message, options) => {
      setLoading(false);
      const endTime = Date.now();
      
      // Salvar metadados
      if (message && options.usage) {
        const { promptTokens, completionTokens, totalTokens } = options.usage;
        
        const metadata = createMessageMetadata(
          { promptTokens, completionTokens, totalTokens },
          startTimeRef.current,
          startStreamingTimeRef.current,
          endTime,
          DEFAULT_MODEL.id
        );
        
        setRealMetadata(prev => ({
          ...prev,
          [message.id]: metadata
        }));
      }
    },
    onError: (err) => {
      console.error('Stream error:', err);
      setError(err.message || "Erro ao gerar resposta");
      setLoading(false);
    }
  });

  // Para detectar dados de contexto assim que eles chegam no stream
  useEffect(() => {
    if (data && Array.isArray(data) && messages.length > 0) {
      const streamMetadata = data.find(item => 
        typeof item === 'object' && 
        item !== null && 
        'type' in item && 
        item.type === 'metadata' &&
        'similarityScores' in item
      ) as ChatStreamData | undefined;
      
      if (streamMetadata?.similarityScores && Array.isArray(streamMetadata.similarityScores)) {
        const adaptedIncidents = streamMetadata.similarityScores.map(item => ({
          id: item.documentId || item.incident?.id || "",
          content: "Não informado",
          timestamp: item.incident?.timestamp || "",
          source: item.incident?.source || "",
          score: item.similarity || 0
        }));
        
        const assistantMessages = messages.filter(m => m.role === 'assistant');
        if (assistantMessages.length > 0) {
          const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
          
          // Atualizar o mapa de incidentes para a última mensagem do assistente
          setIncidentsByMessage(prev => {
            return {
              ...prev,
              [lastAssistantMessage.id]: adaptedIncidents
            };
          });
        }
      }
    }
  }, [data, messages]);

  // Auto-scroll quando novas mensagens são adicionadas ou durante o streaming
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleStreamSubmit(e);
      }
    }
  };

  const toggleInfoPanel = (messageId: string, tab: SidebarTab) => {
    if (selectedMessageId === messageId && activeTab === tab && infoPanel) {
      closeInfoPanel();
    } else {
      setInfoPanel(true);
      setSelectedMessageId(messageId);
      setActiveTab(tab);
    }
  };

  const closeInfoPanel = () => {
    setIsPanelClosing(true);
    setTimeout(() => {
      setIsPanelClosing(false);
      setInfoPanel(false);
      setSelectedMessageId(null);
    }, 250);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    startTimeRef.current = Date.now();
    setData(undefined);
    handleSubmit(e);
  };

  const handleClearChat = () => {
    setMessages([]);
    setRealMetadata({});
    setIncidentsByMessage({});
    setData(undefined);
    closeInfoPanel();
  };

  const handleIncidentClick = (incident: IncidentWithScore) => {
    setSelectedIncident(incident);
  };

  const closeIncidentModal = () => {
    setSelectedIncident(null);
  };

  const renderInfoPanelContent = () => {
    if (!selectedMessageId) return null;
    
    if (activeTab === 'contexto') {
      const incidents = incidentsByMessage[selectedMessageId] || [];
      
      return (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 text-sm">
            {incidents.length} documento(s) utilizado(s) para esta resposta:
          </h3>
          {incidents.map((incident) => (
            <IncidentCompactCard 
              key={incident.id} 
              incident={incident} 
              onClick={() => handleIncidentClick(incident)}
            />
          ))}
        </div>
      );
    } else {
      const metadata = realMetadata[selectedMessageId]
      
      return (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="font-medium text-gray-700 mb-2">Estatísticas de Tokens</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-xs text-gray-600">Entrada</div>
                <div className="font-medium text-blue-700">{metadata.tokens.input}</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="text-xs text-gray-600">Saída</div>
                <div className="font-medium text-green-700">{metadata.tokens.output}</div>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="text-xs text-gray-600">Total</div>
                <div className="font-medium text-purple-700">{metadata.tokens.total}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="font-medium text-gray-700 mb-2">Custo estimado</h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Custo estimado (USD):</span>
              <span className="font-medium">${metadata.estimatedCost.USD.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Custo estimado (BRL):</span>
              <span className="font-medium">${metadata.estimatedCost.BRL.toFixed(4)}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="font-medium text-gray-700 mb-2">Desempenho</h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Tempo total de processamento:</span>
              <span className="font-medium">{metadata.processingTime.total.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Tempo até streaming:</span>
              <span className="font-medium">{metadata.processingTime.untillStreaming.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Modelo utilizado:</span>
              <span className="font-medium">{metadata.modelName}</span>
            </div>
          </div>
        </div>
      );
    }
  };

  // Componente de boas-vindas exibido quando não há mensagens
  const WelcomeComponent = () => (
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4 py-12">
      <h3 className="text-lg font-semibold mb-6 text-gray-800">
        Sobre esta Ferramenta
      </h3>
      <p className="text-center text-gray-600 mb-8">
        Esta ferramenta permite conversar livremente com a IA, que utilizará a base de incidentes como contexto para suas respostas.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-2">Consulta Inteligente</h4>
          <p className="text-sm text-blue-600">Faça perguntas sobre qualquer aspecto dos incidentes</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <h4 className="font-medium text-green-800 mb-2">Base de Conhecimento</h4>
          <p className="text-sm text-green-600">A IA consulta a base de dados para respostas precisas</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <h4 className="font-medium text-purple-800 mb-2">Métricas de Uso</h4>
          <p className="text-sm text-purple-600">Acompanhe quanto do conhecimento foi utilizado</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header fixo */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Chat Contextualizado</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
              <Brain className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">
                {DEFAULT_MODEL.displayName}
              </span>
            </div>
            
            {messages.length > 0 && (
              <button 
                onClick={handleClearChat}
                className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100"
              >
                <Trash size={16} className="mr-1" />
                <span className="hidden sm:inline">Limpar conversa</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Área principal de conteúdo */}
      <main className="flex-1 flex relative overflow-hidden">
        {/* Painel lateral de informações com animação aprimorada */}
        {(infoPanel || isPanelClosing) && (
          <>
            <div 
              className={`fixed inset-0 bg-black/5 z-0 sm:hidden ${
                isPanelClosing ? 'animate-fade-out' : 'animate-fade-in'
              }`}
              onClick={closeInfoPanel}
            />
            
            {/* Painel lateral */}
            <div 
              className={`absolute left-0 top-0 h-full w-80 bg-white border-r border-gray-200 shadow-lg overflow-y-auto z-10 ${
                isPanelClosing 
                  ? 'animate-slide-out-left' 
                  : 'animate-slide-in-left'
              }`}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('contexto')}
                    className={`text-sm font-medium transition-all duration-200 ${
                      activeTab === 'contexto' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Contexto
                  </button>
                  <button
                    onClick={() => setActiveTab('metadados')}
                    className={`text-sm font-medium transition-all duration-200 ${
                      activeTab === 'metadados' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Metadados
                  </button>
                </div>
                <button 
                  onClick={closeInfoPanel}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                {renderInfoPanelContent()}
              </div>
            </div>
          </>
        )}
        
        {/* Container de mensagens */}
        <div 
          className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
            infoPanel 
              ? 'animate-content-shift-right' 
              : isPanelClosing 
                ? 'animate-content-shift-left' 
                : 'mx-auto'
          }`}
        >
          <div className={`w-full max-w-5xl mx-auto px-4 sm:px-8 flex flex-col h-full`}>
            {messages.length === 0 ? (
              <WelcomeComponent />
            ) : (
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto py-4 space-y-6"
              >
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`rounded-2xl shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-gray-200 text-white px-5 py-3' 
                          : 'bg-gray-50 border border-black-100 px-5 py-3'
                      }`}
                      style={{ maxWidth: '90%' }}
                    >
                      <div className="prose prose-sm max-w-none">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>

                      {/* Indicador de digitação */}
                      {loading && message.role === 'assistant' && message.id === messages[messages.length - 1].id && (
                        <div className="flex justify-start">
                          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 shadow-sm" style={{ maxWidth: '85%' }}>
                            <div className="flex space-x-1.5 items-center">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Botões para cada mensagem da IA */}
                      {message.role === 'assistant' && !loading && (
                        <div className="mt-2 pt-2 border-t border-black-100 flex space-x-3">
                          <button 
                            onClick={() => toggleInfoPanel(message.id, 'contexto')}
                            className={`text-xs flex items-center px-2.5 py-1 rounded-full ${
                              selectedMessageId === message.id && activeTab === 'contexto' && infoPanel
                                ? 'bg-blue-100 text-blue-700' 
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <Database size={12} className="mr-1" />
                            Contexto
                            <ChevronLeft size={12} className="ml-1" />
                          </button>
                          <button
                            onClick={() => toggleInfoPanel(message.id, 'metadados')}
                            className={`text-xs flex items-center px-2.5 py-1 rounded-full ${
                              selectedMessageId === message.id && activeTab === 'metadados' && infoPanel
                                ? 'bg-purple-100 text-purple-700' 
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <BarChart size={12} className="mr-1" />
                            Metadados
                            <ChevronLeft size={12} className="ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                
              </div>
            )}
            
            {/* Área de mensagem de erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {/* Prompt Input */}
            <div className="sticky bottom-0 pb-4 pt-2 bg-gray-50">
              <form onSubmit={handleStreamSubmit}>
                <div className="flex space-x-3">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="flex-1 p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 min-h-[52px] max-h-[150px] resize-y bg-white shadow-sm"
                    placeholder="Digite sua pergunta sobre cibersegurança..."
                    rows={1}
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-blue-500 text-white p-3 w-14 h-14 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-all duration-200 flex items-center justify-center shadow-sm"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {selectedIncident && (
        <IncidentModal 
          incident={selectedIncident}
          onClose={closeIncidentModal}
          isOpen={!!selectedIncident}
        />
      )}
    </div>
  );
} 
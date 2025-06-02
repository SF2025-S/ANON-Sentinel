"use client"

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Tag, ListFilter, Shield, AlertTriangle, Save, Brain, Zap } from "lucide-react";
import { getCategoryIcon } from "@/components/IconGenerator";
import { auth } from '@/lib/firebaseconfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseconfig';
import { useCategorizationStream } from '@/app/composables/useCategorizationStream';
import { DEFAULT_MODEL } from '@/server/models/aiModels';
import { TokenInfoSection } from "@/components/TokenInfoSection";
import { Toast } from "@/components/Toast";

const NIST_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'CAT 0': 'Exercise/Network Defense Testing: Eventos envolvendo testes de segurança, simulações ou exercícios',
  'CAT 1': 'Unauthorized Access: Ganho de acesso lógico ou físico sem permissão',
  'CAT 2': 'Denial of Service: Disrupção da funcionalidade normal de rede ou serviço',
  'CAT 3': 'Malicious Code: Instalação bem-sucedida de malware (vírus, worms, trojans, etc.)',
  'CAT 4': 'Improper Usage: Violações de políticas de computação aceitáveis',
  'CAT 5': 'Scans/Probes/Attempted Access: Atividade de reconhecimento ou tentativas mal sucedidas de ganhar acesso',
  'CAT 6': 'Investigation: Incidentes potenciais sob revisão (inexplicados, pouca informação, etc.)'
};

export default function CategorizationPage() {
  const {
    loading,
    error,
    response,
    processingTime,
    originalIncidents,
    startCategorization,
    currentTotalTokens // AIUsage acumulado/final
  } = useCategorizationStream();

  const [, setCategorizationUIType] = useState<'cert' | 'llm' | 'nist'>('cert');
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [expandedIncidents, setExpandedIncidents] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isTokenInfoExpanded, setIsTokenInfoExpanded] = useState(false);

  const handleCategorizationStart = async (type: 'cert' | 'llm' | 'nist') => {
    setCategorizationUIType(type);
    setExpandedIncidents([]);
    setExpandedCategories(false);
    await startCategorization(type);
  };

  const toggleIncident = (id: string) => {
    setExpandedIncidents(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSaveResults = async () => {
    if (!response || !auth.currentUser) {
      setToast({ message: 'Você precisa estar logado e ter uma categorização para salvar.', type: 'error' });
      return;
    }
    
    try {
      setIsSaving(true);

      // O objeto 'response' do hook contém os dados agregados da categorização
      // (classifications, totalIncidents, totalCategories, categoryCounts, model, categorizationType, e o 
      // 'usage' (parcial) do último batch). Para o 'tokenUsage' global, usamos 'currentTotalTokens'
      const { 
        classifications, totalIncidents, totalCategories, categoryCounts, model, categorizationType 
      } = response;

      const dataToSave = { classifications, totalIncidents, totalCategories, categoryCounts,  model,
        categorizationType, timestamp: Timestamp.now(), userEmail: auth.currentUser.email,
        ...(currentTotalTokens && { tokenUsage: currentTotalTokens }) 
      };
      
      const categorizationsRef = collection(db, "categorizations");
      await addDoc(categorizationsRef, dataToSave);

      setToast({ message: 'Resultado salvo com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao salvar';
      setToast({ message: `Erro ao salvar o resultado: ${errorMessage}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-8 flex items-center">
          <Shield className="mr-2 text-blue-600" />
          Categorização de Incidentes
        </h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Sobre esta Ferramenta
            </h3>
            <div className="space-y-2 text-gray-600">
              <p>Esta ferramenta oferece três abordagens para categorizar automaticamente os incidentes de segurança:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">Categorização CERT</h4>
                  <p className="text-sm text-blue-600">Utiliza categorias predefinidas do CERT para classificação padronizada</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">Categorização LLM</h4>
                  <p className="text-sm text-green-600">Permite que a IA defina as categorias mais apropriadas dinamicamente</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2">Categorização NIST</h4>
                  <p className="text-sm text-purple-600">Utiliza as categorias padronizadas do NIST SP 800-61r2</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          {loading && response && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-700">
                    Processando Incidentes
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {response.classifications.length} de {response.totalIncidents} incidentes
                  ({response.totalIncidents > 0 ? Math.round((response.classifications.length / response.totalIncidents) * 100) : 0}%)
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${response.totalIncidents > 0 ? (response.classifications.length / response.totalIncidents) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* botões de categorização */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleCategorizationStart('cert')}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
            >
              <ListFilter size={20} />
              <span>Categorização CERT</span>
            </button>

            <button
              onClick={() => handleCategorizationStart('llm')}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
            >
              <ListFilter size={20} />
              <span>Categorização LLM</span>
            </button>

            <button
              onClick={() => handleCategorizationStart('nist')}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
            >
              <ListFilter size={20} />
              <span>Categorização NIST</span>
            </button>
          </div>
        </div>

        {response && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className={`h-6 w-6 ${
                    response.categorizationType === 'CERT' ? 'text-blue-600' : 
                    response.categorizationType === 'LLM' ? 'text-green-600' : 'text-purple-600'
                  }`} />
                  <h3 className="text-lg font-bold text-gray-800">
                    Categorização {response.categorizationType}
                  </h3>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        {DEFAULT_MODEL.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                      <AlertTriangle className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {response.totalIncidents} incidentes para análise
                      </span>
                    </div>

                    {!loading && processingTime && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">
                          {(processingTime / 1000).toFixed(2)}s
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSaveResults}
                    disabled={loading || isSaving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Resultado'}</span>
                  </button>
                </div>

                {/* INFORMAÇÕES DE TOKENS */}
                {currentTotalTokens && (currentTotalTokens.totalTokens > 0 || loading) && (
                  <div className="pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200" title="Tokens de Prompt (Entrada)">
                                <Zap className="h-4 w-4 text-orange-500" />
                                <span className="text-sm text-orange-700">{currentTotalTokens.promptTokens.toLocaleString('pt-BR')}</span>
                                <span className="text-xs text-orange-600 ml-1">Entrada</span>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-200" title="Tokens de Conclusão (Saída)">
                                <Zap className="h-4 w-4 text-teal-500" />
                                <span className="text-sm text-teal-700">{currentTotalTokens.completionTokens.toLocaleString('pt-BR')}</span>
                                <span className="text-xs text-teal-600 ml-1">Saída</span>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-200" title="Tokens Totais (Entrada + Saída)">
                                <Zap className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm text-indigo-700">{currentTotalTokens.totalTokens.toLocaleString('pt-BR')}</span>
                                <span className="text-xs text-indigo-600 ml-1">Total {loading ? " (parcial)" : ""}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsTokenInfoExpanded(!isTokenInfoExpanded)}
                            className="p-1.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            aria-expanded={isTokenInfoExpanded}
                            aria-controls="token-info-details"
                            title={isTokenInfoExpanded ? "Esconder detalhes dos tokens" : "Mostrar detalhes dos tokens"}
                        >
                            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isTokenInfoExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                    {isTokenInfoExpanded && (
                      <div id="token-info-details">
                        <TokenInfoSection tokens={currentTotalTokens} modelId={DEFAULT_MODEL.id} />
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-100"></div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Categorias Encontradas: {response.totalCategories}
                    </h3>
                  </div>
                  {!loading && response.totalCategories > 0 && (
                    <ChevronRight 
                      className="text-gray-400 cursor-pointer transform transition-transform duration-200 hover:scale-110"
                      onClick={() => setExpandedCategories(!expandedCategories)}
                      aria-label={expandedCategories ? "Esconder detalhes das categorias" : "Mostrar detalhes das categorias"}
                    />
                  )}
                </div>
              </div>

              {!loading && expandedCategories && response.totalCategories > 0 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {response.categoryCounts.map(cat => (
                    <div key={cat.category} 
                         className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getCategoryIcon(cat.category)}
                          <span className="ml-2 font-medium text-gray-700">{cat.category}</span>
                        </div>
                        <span className="text-gray-600 bg-white px-3 py-1 rounded-full text-sm">
                          {cat.count} incidentes
                        </span>
                      </div>
                      {response.categorizationType === 'NIST' && NIST_CATEGORY_DESCRIPTIONS[cat.category] && (
                        <p className="text-sm text-gray-600 mt-2">
                          {NIST_CATEGORY_DESCRIPTIONS[cat.category]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {response.classifications.map(incident => {
                const originalIncident = originalIncidents.find(inc => inc.id === incident.id);
                const isIncidentContentExpanded = expandedIncidents.includes(`${incident.id}_content`);
                
                return (
                  <div key={incident.id} 
                       className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors duration-200">
                    <div 
                      className="p-4 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleIncident(incident.id)}
                      aria-expanded={expandedIncidents.includes(incident.id)}
                      aria-controls={`incident-details-${incident.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        {getCategoryIcon(incident.category)}
                        <div>
                          <p className="font-medium text-gray-800">ID: {incident.id}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">{incident.category}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span className="text-sm">{new Date(incident.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        {expandedIncidents.includes(incident.id) ? 
                          <ChevronDown className="text-gray-400" /> : 
                          <ChevronRight className="text-gray-400" />}
                      </div>
                    </div>

                    {expandedIncidents.includes(incident.id) && (
                      <div id={`incident-details-${incident.id}`} className="p-4 border-t border-gray-100 bg-gray-50">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2 text-gray-700">Motivo da Classificação</h4>
                            <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
                              {incident.reason}
                            </p>
                          </div>

                          <div>
                            {originalIncident && (
                              <div>
                                <button
                                  className="flex items-center gap-2 cursor-pointer text-blue-600 hover:text-blue-700 w-full text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIncident(`${incident.id}_content`);
                                  }}
                                  aria-expanded={isIncidentContentExpanded}
                                  aria-controls={`original-content-${incident.id}`}
                                >
                                  <ChevronRight 
                                    className={`h-4 w-4 transition-transform ${
                                      isIncidentContentExpanded ? 'rotate-90' : ''
                                    }`} 
                                  />
                                  <h4 className="font-medium">Ver Descrição do Incidente</h4>
                                </button>

                                {isIncidentContentExpanded && (
                                  <div id={`original-content-${incident.id}`} className="mt-2 p-3 bg-white rounded-lg border border-gray-100">
                                    <p className="text-gray-600 whitespace-pre-wrap">
                                      {originalIncident.content}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                      <Clock className="h-4 w-4" />
                                      <span>{new Date(originalIncident.timestamp).toLocaleString('pt-BR')}</span>
                                      {originalIncident.source && (
                                        <>
                                          <span className="mx-1">•</span>
                                          <span>Fonte: {originalIncident.source}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </div>
    </div>
  );
}

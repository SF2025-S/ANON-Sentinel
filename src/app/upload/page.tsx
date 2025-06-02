"use client"

import { useState, useEffect } from "react";
import { Upload, File, AlertCircle, FileText, X, ChevronDown, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { uploadFile, apiClient } from "@/lib/api-client";
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebaseconfig";

interface Incident {
  id: string;
  content: string;
  timestamp: string;
  source?: string;
}

interface IncidentResponse {
  message: string;
  data: Incident;
}

interface UploadResponse {
  message: string;
  results: {
    processed: number;
    duplicates: number;
    errors: number;
  };
  fileType: string;
  details: string;
  incidentIds?: string[];
}

interface FileWithIncidents extends File {
  incidentCount?: number;
}

interface UploadHistoryItem {
  id: string;
  fileName: string;
  timestamp: Timestamp;
  user: string | null;
  incidentCount: number;
  processedCount: number;
  duplicatesCount: number;
  errorsCount: number;
  incidentIds: string[];
}

// Adicione esta interface para o erro de upload
interface UploadError {
  message: string;
  error?: string;
  details?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileWithIncidents[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{error: string, details: string} | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Buscar histórico de uploads do Firestore ao carregar a página
  useEffect(() => {
    const fetchUploads = async () => {
      const q = query(collection(db, "uploads"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const uploadHistoryData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...(data as Omit<UploadHistoryItem, 'id'>),
          incidentIds: data.incidentIds || [] // Garantir que incidentIds sempre exista
        };
      });
      console.log("Dados recuperados do Firebase:", uploadHistoryData);
      setUploadHistory(uploadHistoryData);
    };
    fetchUploads();
  }, []);

  // Contar incidentes em um arquivo
  const countIncidents = (text: string): number => {
    // Quebra o texto em linhas
    const lines = text.split('\n');
    
    // Conta linhas que são exatamente "###" ou "---"
    let separatorCount = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === "###" || trimmedLine === "---") {
        separatorCount++;
      }
    }
    
    // Adiciona 1 ao número de separadores (último incidente não tem separador após ele)
    return separatorCount + 1;
  };

  // Salvar uploads no Firestore
  const saveUploadHistory = async (
    filesWithCounts: FileWithIncidents[], 
    results: { processed: number; duplicates: number; errors: number },
    incidentIds: string[]
  ) => {
    const user = auth.currentUser;
    const uploadData = filesWithCounts.map(file => ({
      fileName: file.name,
      timestamp: Timestamp.now(),
      user: user ? user.email : null,
      incidentCount: file.incidentCount || 0,
      processedCount: results.processed,
      duplicatesCount: results.duplicates,
      errorsCount: results.errors,
      incidentIds: incidentIds || []
    }));
    
    for (const data of uploadData) {
      await addDoc(collection(db, "uploads"), data);
    }
    
    // Atualiza histórico após inserir
    const q = query(collection(db, "uploads"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const uploadHistoryData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...(data as Omit<UploadHistoryItem, 'id'>),
        incidentIds: data.incidentIds || []
      };
    });
    console.log("Dados recuperados do Firebase:", uploadHistoryData);
    setUploadHistory(uploadHistoryData);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === "text/plain"
    ) as FileWithIncidents[];

    // Processar cada arquivo para contar incidentes
    const filesWithIncidents = await Promise.all(droppedFiles.map(async (file) => {
      const text = await file.text();
      file.incidentCount = countIncidents(text);
      return file;
    }));

    setFiles(prev => [...prev, ...filesWithIncidents]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === "text/plain"
      ) as FileWithIncidents[];

      // Processar cada arquivo para contar incidentes
      const filesWithIncidents = await Promise.all(selectedFiles.map(async (file) => {
        const text = await file.text();
        file.incidentCount = countIncidents(text);
        return file;
      }));

      setFiles(prev => [...prev, ...filesWithIncidents]);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadError(null);
    
    const accumulator = {
      processed: 0,
      duplicates: 0,
      errors: 0
    };
    
    // Array para armazenar os IDs de todos os incidentes
    let allIncidentIds: string[] = [];
    let hasUploadError = false; // Variável local para controlar erros

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const result = await uploadFile('/incidents/upload', formData);
          
          // Acumula os resultados
          accumulator.processed += result.results.processed;
          accumulator.duplicates += result.results.duplicates;
          accumulator.errors += result.results.errors;
          
          // Acumula os IDs dos incidentes
          if (result.incidentIds && result.incidentIds.length > 0) {
            console.log("IDs recebidos da API:", result.incidentIds);
            allIncidentIds = [...allIncidentIds, ...result.incidentIds];
          } else {
            console.log("Nenhum ID recebido da API para este arquivo", result);
          }
        } catch (err: unknown) {
          console.log("Erro ao fazer upload do arquivo:", file.name, err);
          hasUploadError = true;
          
          // Extrair a mensagem de erro do objeto de erro
          const errorObj = err as UploadError;
          const errorMessage = typeof err === 'string' ? err : errorObj.message || JSON.stringify(err);
          
          // Tratar o erro específico de incidente inválido
          if (
            (errorObj.error === "Arquivo inválido") || 
            (errorMessage.includes("Arquivo inválido")) ||
            (errorObj.details && errorObj.details.includes("Nenhum incidente válido"))
          ) {
            setUploadError({
              error: "Arquivo inválido",
              details: `O arquivo "${file.name}" não contém incidentes válidos. Verifique o conteúdo e a formatação.`
            });
          } else {
            // Outros erros
            setUploadError({
              error: "Erro no upload",
              details: errorMessage || "Ocorreu um erro ao processar o arquivo."
            });
          }
          
          // Interrompe o loop em caso de erro
          break;
        }
      }

      // Se não houve erro, define o resultado final
      if (!hasUploadError) {
        console.log("Total de IDs coletados:", allIncidentIds.length, allIncidentIds);
        setUploadStatus({
          message: "Importação concluída com sucesso",
          results: accumulator,
          fileType: "txt",
          details: `Total - Processados: ${accumulator.processed}, Duplicatas: ${accumulator.duplicates}, Erros: ${accumulator.errors}`,
          incidentIds: allIncidentIds
        });
        
        // Salvar arquivos enviados com contagem de incidentes no Firestore
        await saveUploadHistory(files, accumulator, allIncidentIds);
      }
    } catch (error: unknown) {
      console.error("Erro geral no upload:", error);
      hasUploadError = true;
      const err = error as UploadError;
      setUploadError({
        error: "Erro no upload",
        details: err.message || "Ocorreu um erro inesperado durante o upload."
      });
    } finally {
      setUploading(false);
      // Só limpa a lista de arquivos se não houve erro
      if (!hasUploadError) {
        setFiles([]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Função para carregar um incidente específico
  const loadIncident = async (incidentId: string) => {
    try {
      setLoadingIncident(true);
      setIncidentError(null);
      
      // Verificamos se o usuário está autenticado
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      const response = await apiClient<IncidentResponse>(`/incidents/incident/${incidentId}`);
      setSelectedIncident(response.data);
    } catch (err) {
      console.error("Erro ao buscar incidente:", err);
      setIncidentError("Não foi possível carregar o incidente. Tente novamente mais tarde.");
    } finally {
      setLoadingIncident(false);
    }
  };

  // Função para fechar o modal
  const closeIncidentModal = () => {
    setSelectedIncident(null);
    setIncidentError(null);
  };

  // Função para fechar o modal de erro
  const closeErrorModal = () => {
    setUploadError(null);
  };

  // Função para expandir/recolher um item
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Upload de Incidentes</h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Instruções de Upload</h3>
            <div className="space-y-2 text-gray-600">
              <p>• Cada arquivo pode conter um ou mais incidentes</p>
              <p>• Para múltiplos incidentes no mesmo arquivo, separe-os usando &quot;###&quot; ou &quot;---&quot;</p>
              <p>• Você pode enviar vários arquivos de uma vez</p>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              Arraste arquivos TXT aqui ou clique para selecionar
            </p>
            <input
              type="file"
              multiple
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
            >
              Selecionar Arquivos
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Arquivos Selecionados:</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <File className="h-5 w-5 text-gray-500" />
                      <span>{file.name}</span>
                      <span className="ml-2 text-blue-600 text-sm">
                        ({file.incidentCount} incidente{file.incidentCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {uploading ? "Enviando..." : "Enviar Arquivos"}
              </button>

              {uploading && (
                <div className="mt-4">
                  <div className="h-1 w-full bg-gray-200 rounded overflow-hidden">
                    <div className="h-full bg-blue-600 animate-[loading_1s_ease-in-out_infinite]" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    O processamento pode demorar alguns minutos se houver muitos incidentes...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {uploadStatus && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">Resultado do Upload</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-green-600">
                <span>Processados: {uploadStatus.results.processed}</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-600">
                <span>Duplicados: {uploadStatus.results.duplicates}</span>
              </div>
              {uploadStatus.results.errors > 0 && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>Erros: {uploadStatus.results.errors}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Histórico de uploads */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Histórico de Uploads</h2>
          
          {uploadHistory.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
              Nenhum upload encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {uploadHistory.map((item) => {
                const isExpanded = expandedItems.includes(item.id);
                
                return (
                  <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Cabeçalho do card (sempre visível) */}
                    <div 
                      className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{item.fileName}</h3>
                            <div className="flex flex-col mt-1 text-sm text-gray-500">
                              <span>{new Date(item.timestamp.toDate()).toLocaleString('pt-BR')}</span>
                              <span>Usuário: {item.user || 'Anônimo'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 px-3 py-1.5 rounded-full flex items-center">
                            <span className="text-sm font-medium text-blue-700">
                              {item.incidentCount} incidente{item.incidentCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Conteúdo detalhado (visível apenas quando expandido) */}
                    {isExpanded && (
                      <div className="p-4 bg-gray-50">
                        {/* Estatísticas */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="flex items-center p-2.5 rounded border border-gray-200 bg-white">
                            <div className="mr-2 bg-green-100 p-1 rounded">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700">
                              Processados: {item.processedCount}
                            </span>
                          </div>
                          <div className="flex items-center p-2.5 rounded border border-gray-200 bg-white">
                            <div className="mr-2 bg-yellow-100 p-1 rounded">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            </div>
                            <span className="text-sm text-gray-700">
                              Duplicados: {item.duplicatesCount}
                            </span>
                          </div>
                          <div className="flex items-center p-2.5 rounded border border-gray-200 bg-white">
                            <div className="mr-2 bg-red-100 p-1 rounded">
                              <X className="h-4 w-4 text-red-600" />
                            </div>
                            <span className="text-sm text-gray-700">
                              Erros: {item.errorsCount}
                            </span>
                          </div>
                        </div>
                        
                        {/* Lista de incidentes */}
                        {(() => {
                          console.log("IDs na renderização:", item.fileName, item.incidentIds);
                          return (
                            <div className="mt-3 bg-white p-3 rounded border border-gray-200">
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Links para incidentes: ({item.incidentIds?.length || 0})
                              </p>
                              <div className="max-h-28 overflow-y-auto">
                                <ul className="space-y-1 divide-y divide-gray-100">
                                  {(item.incidentIds || []).map((incidentId, idx) => (
                                    <li key={incidentId} className="py-1">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation(); // Evita que o card expanda/recolha
                                          loadIncident(incidentId);
                                        }} 
                                        className="text-blue-600 hover:underline text-sm truncate block text-left w-full"
                                      >
                                        Incidente #{idx + 1}: {incidentId}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal para exibir detalhes do incidente */}
      {(selectedIncident || loadingIncident || incidentError) && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold">Detalhes do Incidente</h3>
              <button 
                onClick={closeIncidentModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {loadingIncident ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : incidentError ? (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2 text-red-600 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <h2 className="font-semibold">Erro</h2>
                  </div>
                  <p>{incidentError}</p>
                </div>
              ) : selectedIncident ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                      ID: {selectedIncident.id}
                    </span>
                    
                    <div className="flex items-center space-x-1 text-gray-500 text-sm">
                      <span>
                        {new Date(selectedIncident.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {selectedIncident.source && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Fonte:</span> {selectedIncident.source}
                    </div>
                  )}
                  
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="font-medium mb-3 flex items-center">
                      <FileText className="h-5 w-5 text-blue-500 mr-2" />
                      Conteúdo
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                        {selectedIncident.content}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal de erro de upload */}
      {uploadError && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  {uploadError.error}
                </h3>
                <button 
                  onClick={closeErrorModal}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6 text-gray-700 border-l-4 border-red-500 pl-4 py-2">
                {uploadError.details}
              </div>
              
              <div className="mt-6 bg-gray-50 p-5 rounded-lg">
                <h4 className="font-medium mb-3 text-gray-700 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Sugestões:
                </h4>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Verifique se o arquivo contém texto válido</li>
                  <li>Garanta que o conteúdo segue o formato esperado</li>
                  <li>Certifique-se de que os incidentes estão separados por <code className="bg-gray-200 px-1 rounded">###</code> ou <code className="bg-gray-200 px-1 rounded">---</code></li>
                  <li>Cada incidente deve ter conteúdo significativo entre os separadores</li>
                </ul>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={closeErrorModal}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client"

import { useState } from "react";
import { Search as SearchIcon, AlertCircle, Database, Brain, FileText } from "lucide-react";
import { apiClient } from '@/lib/api-client';
import { IncidentCard } from "@/components/IncidentCard";
import { DEFAULT_MODEL } from '@/server/models/aiModels';

interface SearchResponse {
  results: Array<{
    documentId: string;
    similarity: number;
    incident: {
      id: string;
      content: string;
      timestamp: string;
      source: string;
    };
  }>;
  metrics: {
    totalFound: number;
    totalReturned: number;
    averageSimilarity: number;
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("100");
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient<SearchResponse>('/incidents/search', {
        params: {
          query: query,
          topK: topK
        }
      });
      
      setSearchData(data);
    } catch (error) {
      console.error('Erro na busca:', error);
      setError(error instanceof Error ? error.message : 'Erro ao realizar a busca');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-8 flex items-center">
          <Database className="mr-2 text-blue-600" />
          Consulta à Base de Incidentes
        </h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Sobre a Consulta
            </h3>
            <div className="space-y-2 text-gray-600">
              <p>Esta ferramenta permite buscar incidentes similares na base de dados usando processamento de linguagem natural.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">Busca Semântica</h4>
                  <p className="text-sm text-blue-600">Use palavras-chave ou descrições naturais</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">Similaridade</h4>
                  <p className="text-sm text-green-600">Resultados ordenados por relevância (60%+)</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2">Detalhamento</h4>
                  <p className="text-sm text-purple-600">Veja o conteúdo completo dos incidentes</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Buscar por
                </label>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    {DEFAULT_MODEL.displayName}
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: phishing, ransomware, vazamento de dados..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número máximo de resultados
              </label>
              <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                className="w-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="1000"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md w-full sm:w-auto"
            >
              <SearchIcon size={20} />
              <span>{loading ? "Buscando..." : "Buscar"}</span>
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {searchData && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">Métricas da Busca</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {searchData.metrics.totalFound}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total de incidentes encontrados
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {searchData.metrics.totalReturned}
                  </div>
                  <div className="text-sm text-gray-600">
                    Incidentes relevantes (60% ou mais)
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {(searchData.metrics.averageSimilarity * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Similaridade média
                  </div>
                </div>
              </div>
            </div>

            {searchData.results && searchData.results.length > 0 && (
              <div className="bg-white rounded-lg shadow-md border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800">
                      Incidentes Encontrados ({searchData.results.length})
                    </h3>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {searchData.results.map((result) => (
                      <IncidentCard
                        key={result.documentId}
                        score={result}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {searchData.results && searchData.results.length === 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 text-center">
                <p className="text-gray-600">Nenhum resultado encontrado para sua busca.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
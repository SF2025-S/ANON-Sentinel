"use client"

import { useState } from "react";
import { Settings, AlertCircle, Database, Trash2 } from "lucide-react";
import { apiClient } from '@/lib/api-client';
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseconfig";

interface DeleteResponse {
  success: boolean;
  message: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    if (!window.confirm(
      'ATENÇÃO: Esta ação irá deletar TODOS os registros da base de dados.\n' +
      'Isso inclui registros do Pinecone e do Firebase.\n' +
      'Esta ação não pode ser desfeita.\n\n' +
      'Deseja continuar?'
    )) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Deletar registros do Pinecone
      const pineconeResult = await apiClient<DeleteResponse>('/tickets/database/delete-all', {
        method: 'POST'
      });

      // Deletar registros do Firebase
      const uploadsRef = collection(db, "uploads");
      const querySnapshot = await getDocs(uploadsRef);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setSuccess(`${pineconeResult.message}. Registros do Firebase também foram deletados com sucesso.`);
    } catch (error) {
      console.error('Erro ao deletar registros:', error);
      setError(error instanceof Error ? error.message : 'Erro ao deletar registros');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-8 flex items-center">
          <Settings className="mr-2 text-blue-600" />
          Configurações do Sistema
        </h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
              <Database className="mr-2 text-blue-600" />
              Gerenciamento da Base de Dados
            </h3>
            <div className="space-y-2 text-gray-600 mb-6">
              <p>Aqui você pode realizar operações de manutenção na base de dados vetorial.</p>
            </div>

            <div className="border-t pt-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-4">
                <h4 className="font-medium text-red-800 mb-2 flex items-center">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Limpar Base de Dados
                </h4>
                <p className="text-sm text-red-600 mb-4">
                  Esta ação irá deletar permanentemente todos os registros da base de dados.
                  Use apenas quando necessário, como em ambientes de teste.
                </p>
                <button
                  onClick={handleDeleteAll}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2"
                >
                  <Trash2 size={20} />
                  <span>{loading ? "Deletando..." : "Deletar Todos os Registros"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-green-600">
              <AlertCircle className="h-5 w-5" />
              <span>{success}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client"

import { FC } from 'react';
import { Upload, MessageSquare, Folder, Ticket, BarChart } from "lucide-react";

const HomePage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao ANON Sentinel
          </h1>
          <p className="text-xl text-gray-600">
            Sistema Inteligente para Análise e Classificação de Incidentes de Segurança
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Upload de Incidentes */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800 ml-3">Upload de Incidentes</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Faça upload de novos incidentes de segurança para análise:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Suporte a diferentes formatos de arquivo</li>
              <li>Processamento automático dos dados</li>
              <li>Validação de conteúdo</li>
              <li>Integração com a base de conhecimento</li>
            </ul>
            <a href="/upload" className="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Fazer Upload
            </a>
          </section>

          {/* Chat Contextual */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-8 w-8 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-800 ml-3">Chat Contextual</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Interaja com IA usando a base de incidentes como contexto:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Consultas em linguagem natural</li>
              <li>Respostas baseadas em dados reais</li>
              <li>Métricas de utilização</li>
              <li>Citação de fontes</li>
            </ul>
            <a href="/generate" className="mt-6 inline-block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
              Acessar Chat
            </a>
          </section>

          {/* Categorização */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Folder className="h-8 w-8 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-800 ml-3">Categorização</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Categorize automaticamente os incidentes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Categorização CERT</li>
              <li>Categorização LLM</li>
              <li>Categorização NIST</li>
              <li>Análise automática</li>
            </ul>
            <a href="/categorization" className="mt-6 inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Categorizar
            </a>
          </section>

          {/* Tickets */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Ticket className="h-8 w-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 ml-3">Tickets</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Visualize tickets e gere possíveis soluções:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Visualização de tickets recentes</li>
              <li>Geração de múltiplas soluções por ticket</li>
              <li>Salvamento das soluções geradas</li>
              <li>Navegação entre soluções</li>
            </ul>
            <a href="/tickets" className="mt-6 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Acessar
            </a>
          </section>

          {/* Análise Completa de Resultados */}
          <section className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
            <div className="flex items-center mb-4">
              <BarChart className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-800 ml-3">Análise Completa de Resultados</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Ferramenta de análise holística que unifica todas as funcionalidades do sistema:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <h4 className="font-medium text-blue-800 mb-1">Busca</h4>
                <p className="text-xs text-blue-600">Incidentes recentes</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-center">
                <h4 className="font-medium text-green-800 mb-1">Categorização</h4>
                <p className="text-xs text-green-600">CERT, LLM e NIST</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 text-center">
                <h4 className="font-medium text-orange-800 mb-1">Recomendações</h4>
                <p className="text-xs text-orange-600">Soluções automáticas</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-center">
                <h4 className="font-medium text-purple-800 mb-1">Relatório</h4>
                <p className="text-xs text-purple-600">Análise unificada</p>
              </div>
            </div>

            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
              <li>Histórico completo de análises anteriores</li>
              <li>Sistema de avaliação da qualidade das recomendações</li>
              <li>Métricas detalhadas de tokens e custos operacionais</li>
              <li>Estatísticas de precisão das categorizações</li>
              <li>Visualização unificada de todos os resultados</li>
            </ul>
            
            <a href="/results" className="mt-6 inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              Acessar Análise Completa
            </a>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
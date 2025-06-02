"use client"

import { useState, useEffect, useCallback } from "react";
import { Ticket } from "../../server/models/ticket";
import { Inbox, AlertCircle, Brain, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_MODEL } from '@/server/models/aiModels';
import { TicketList } from "../../components/TicketList";
import { TicketDetails } from "../../components/TicketDetails";

const DISPLAY_INCREMENT = 10;
const PRELOAD_AMOUNT = 20;

export default function TicketsPage() {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [displayCount, setDisplayCount] = useState(DISPLAY_INCREMENT);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayedTickets = allTickets.slice(0, displayCount);

  const fetchTickets = async (limit: number, offset: number) => {
    try {
      const response = await apiClient<{ tickets: Ticket[]; hasMore: boolean }>('/tickets', {
        params: { 
          limit: limit.toString(),
          offset: offset.toString()
        }
      });
      return response;
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      throw error;
    }
  };

  const loadInitialTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchTickets(PRELOAD_AMOUNT, 0);
      setAllTickets(response.tickets);
      setHasMore(response.hasMore);
      // Selecionar o primeiro ticket automaticamente se existir
      if (response.tickets.length > 0) {
        setSelectedTicket(response.tickets[0]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreTickets = async () => {
    if (loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await fetchTickets(PRELOAD_AMOUNT, allTickets.length);
      
      setAllTickets(prev => [...prev, ...response.tickets]);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Erro ao carregar mais tickets:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + DISPLAY_INCREMENT);
    
    if (allTickets.length - displayCount <= DISPLAY_INCREMENT) {
      loadMoreTickets();
    }
  };

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setAllTickets(prev => 
      prev.map(ticket => 
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
    if (selectedTicket?.id === updatedTicket.id) {
      setSelectedTicket(updatedTicket);
    }
  };

  useEffect(() => {
    loadInitialTickets();
  }, [loadInitialTickets]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 lg:mb-6 flex items-center">
            <Inbox className="mr-3 text-blue-600 h-8 w-8 lg:h-10 lg:w-10" />
            Central de Tickets
          </h1>

          <div className="bg-white p-4 lg:p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-full border border-blue-100">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {DEFAULT_MODEL.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {displayedTickets.length} incidentes exibidos
                  </span>
                </div>
                {allTickets.length > displayedTickets.length && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-full border border-orange-100">
                    <Inbox className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      +{allTickets.length - displayedTickets.length} disponíveis
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 lg:p-6 mb-6 lg:mb-8">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Lista de tickets */}
          <div className="xl:col-span-5 2xl:col-span-4">
            <TicketList
              tickets={displayedTickets}
              selectedTicket={selectedTicket}
              onTicketSelect={handleTicketSelect}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              displayCount={displayCount}
              totalTickets={allTickets.length}
            />
          </div>

          {/* Detalhes do ticket */}
          <div className="xl:col-span-7 2xl:col-span-8">
            <div className="sticky top-4 lg:top-8">
              <TicketDetails
                ticket={selectedTicket}
                onTicketUpdate={handleTicketUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
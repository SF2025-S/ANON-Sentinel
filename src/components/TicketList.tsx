import { FileText, Clock, ChevronDown, Inbox, Loader2 } from 'lucide-react';
import { Ticket } from '../server/models/ticket';

interface TicketListProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  onTicketSelect: (ticket: Ticket) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  displayCount: number;
  totalTickets: number;
}

export function TicketList({
  tickets,
  selectedTicket,
  onTicketSelect,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  displayCount,
  totalTickets
}: TicketListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 h-[calc(100vh-200px)] min-h-[600px]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Inbox className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800">Lista de Tickets</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 font-medium">Carregando tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
      <div className="p-4 lg:p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800">Lista de Tickets</h3>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {tickets.length} de {totalTickets}
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
          <Inbox className="h-16 w-16 text-gray-300 mb-6" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">
            Nenhum ticket encontrado
          </h4>
          <p className="text-gray-500 text-center">
            Não há tickets disponíveis no momento.
          </p>
        </div>
      ) : (
        <>
          {/* Lista de tickets com */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-2 lg:p-3 space-y-2">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => onTicketSelect(ticket)}
                  className={`group p-4 lg:p-5 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                    selectedTicket?.id === ticket.id
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-lg ring-2 ring-blue-200'
                      : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl transition-colors flex-shrink-0 ${
                      selectedTicket?.id === ticket.id 
                        ? 'bg-blue-200 shadow-sm' 
                        : 'bg-gray-100 group-hover:bg-blue-100'
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        selectedTicket?.id === ticket.id 
                          ? 'text-blue-700' 
                          : 'text-gray-600 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-base truncate mb-2 ${
                        selectedTicket?.id === ticket.id 
                          ? 'text-blue-900' 
                          : 'text-gray-800 group-hover:text-blue-800'
                      }`}>
                        Ticket #{ticket.id}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {new Date(ticket.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {ticket.source && (
                        <div className="mb-3">
                          <span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-700">
                            {ticket.source}
                          </span>
                        </div>
                      )}
                      {/* Preview do conteúdo */}
                      <p className="text-sm text-gray-600 leading-relaxed overflow-hidden" 
                         style={{
                           display: '-webkit-box',
                           WebkitLineClamp: 3,
                           WebkitBoxOrient: 'vertical'
                         }}>
                        {ticket.content.replace(/[#*=_`~]/g, '').substring(0, 150)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão carregar mais */}
          {(hasMore || displayCount < totalTickets) && (
            <div className="p-4 lg:p-6 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 
                         hover:from-blue-50 hover:to-blue-100 hover:border-blue-200 transition-all duration-200 
                         flex items-center justify-center gap-3 text-gray-700 hover:text-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Carregando mais tickets...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-5 w-5" />
                    <span>Carregar mais tickets</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
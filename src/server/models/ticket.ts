import { LanguageModelUsage } from 'ai';
import { SecurityIncident } from './incident';

export interface TicketRecommendation {
  id: string;
  ticketId: string;
  recommendation: string;
  timestamp: string;
  confidence: number;
}

export interface TicketRecommendationWithUsage extends TicketRecommendation {
  usage: LanguageModelUsage;
}

export interface Ticket extends SecurityIncident {
  recommendations?: TicketRecommendation[];
}

export interface TicketResponse {
  tickets: Ticket[];
  total: number;
} 
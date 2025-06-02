import express, { Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { deleteAllRecords } from '../../lib/vectorStore';

const router = express.Router();
const aiService = new AIService();

// Buscar tickets recentes
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    
    const allTickets = await aiService.getRecentTickets(limit + 1, offset); // Pedimos um a mais para saber se há próxima página
    
    const hasMore = allTickets.length > limit;
    const tickets = allTickets.slice(0, limit); // Remove o item extra se existir
    
    res.json({
      tickets,
      hasMore
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar tickets',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Gerar recomendação para um ticket
router.post('/:ticketId/recommend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const ticket = await aiService.getTicketById(ticketId);

    if (!ticket) {
      res.status(404).json({ error: 'Ticket não encontrado' });
      return;
    }

    await aiService.generateTicketRecommendationStream(ticket, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao gerar recomendação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Gerar recomendação síncrona (sem streaming)
router.post('/:ticketId/recommend-sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const ticket = await aiService.getTicketById(ticketId);

    if (!ticket) {
      res.status(404).json({ error: 'Ticket não encontrado' });
      return;
    }

    const recommendation = await aiService.generateTicketRecommendation(ticket);
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao gerar recomendação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Deletar todos os registros da base
router.post('/database/delete-all', async (req, res) => {
  try {
    const result = await deleteAllRecords();
    res.json(result);
  } catch (error) {
    console.error('Erro ao deletar registros:', error);
    res.status(500).json({ 
      error: 'Erro ao deletar registros',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 
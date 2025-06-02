import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => { 
    // Ignora a rota de streaming
    if (
      req.path === '/chat/stream' || 
      req.path.match(/^\/tickets\/INC-\d+-[a-zA-Z0-9]+\/recommend\/?$/)
    ) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
  
    next();
};
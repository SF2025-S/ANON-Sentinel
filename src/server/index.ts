import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import aiRouter from './routes/ai';
import incidentRouter from './routes/incident';
import { authMiddleware } from './authMiddleware';
import next from 'next';
import ticketsRouter from './routes/tickets';
import { hashCache } from '../lib/hashCache';

async function initializeHashCache() {
  try {
    await hashCache.syncWithDatabase();
    console.log('Cache de hashes inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar cache de hashes:', error);
    return false;
  }
}

// Configuração das variáveis de ambiente
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '../..') });
const handle = nextApp.getRequestHandler();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares básicos
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rota de health check (sem autenticação)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Aplicar middleware de autenticação apenas nas rotas da API
app.use('/api', authMiddleware as express.RequestHandler);

// Rotas da API (protegidas pelo middleware de autenticação)
app.use('/api/ai', aiRouter);
app.use('/api/incidents', incidentRouter);
app.use('/api/tickets', ticketsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => { 
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Erro interno do servidor',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Tratamento de rotas do Next.js - IMPORTANTE: isso deve vir depois das rotas da API
app.all('*', (req, res) => {
  return handle(req, res);
});

// Inicialização do servidor
const startServer = async () => {
  try {
    // Prepare o Next.js antes de configurar as rotas
    await nextApp.prepare();

    app.listen(PORT, async () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📝 Ambiente: ${process.env.NODE_ENV}`);
      
      // Inicializa o cache após o servidor estar rodando
      const cacheInitialized = await initializeHashCache();
      
      if (cacheInitialized) {
        console.log('');
        console.log('✅ Sistema totalmente inicializado e pronto para uso!');
        console.log(`🌐 Acesse: http://localhost:${PORT === 3001 ? '3000' : PORT}`);
        console.log('');
      } else {
        console.log('⚠️  Sistema iniciado com problemas no cache de hashes');
      }
    });
  } catch (error: unknown) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM. Iniciando graceful shutdown...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT. Iniciando graceful shutdown...');
  process.exit(0);
});

export default app;
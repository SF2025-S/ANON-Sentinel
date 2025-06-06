import { Pinecone, Index } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.evaluation' });
dotenv.config({ path: '.env.local' });
dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_KEY!
});

// Nome do índice no pinecone. Criado automaticamente caso não exista
const indexName = 'evaluation-index';

let indexInstance: Index | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializePinecone(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Verifica se o índice já existe
      const existingIndexes = await pc.listIndexes();
      
      if (!existingIndexes.indexes?.map(index => index.name).includes(indexName)) {
        console.log(`Criando índice ${indexName}...`);
        await pc.createIndex({
          name: indexName,
          dimension: 768, // Dimensão correta para o text-embedding-004 do Google
          metric: 'cosine',
          spec: { 
            serverless: { 
              cloud: 'aws', 
              region: 'us-east-1' 
            }
          }
        });
        
        // Aguarda o índice ficar pronto
        console.log('Aguardando índice ficar pronto...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      // Cria a instância do índice após garantir que existe
      indexInstance = pc.Index(indexName);
      console.log(`Índice ${indexName} inicializado com sucesso`);
    } catch (error) {
      console.error('Erro ao inicializar Pinecone:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

// Função para obter o índice, garantindo que está inicializado
async function getIndex(): Promise<Index> {
  if (!indexInstance) {
    await initializePinecone();
  }
  return indexInstance!;
}

export default getIndex;
export { initializePinecone };
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_KEY!
});

// Nome do índice no pinecone
const indexName = 'security-incidents';

async function initializePinecone() {
  // Verifica se o índice já existe
  const existingIndexes = await pc.listIndexes();
  
  if (!existingIndexes.indexes?.map(index => index.name).includes(indexName)) {
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
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

initializePinecone().catch(console.error);
const index = pc.Index(indexName);

export default index;
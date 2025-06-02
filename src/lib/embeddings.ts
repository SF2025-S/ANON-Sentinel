import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

const embeddingModel = google.textEmbeddingModel('text-embedding-004');

// gerar embedding de um único texto
export async function generateEmbedding(text: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

// gerar embeddings de múltiplos textos
export async function generateEmbeddings(texts: string[]) {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings;
}


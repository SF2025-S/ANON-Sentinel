import crypto from 'crypto';
import index from './pinecone';
import { PineconeRecord } from '@pinecone-database/pinecone';

// Interface para o objeto de cache
interface HashCacheItem {
  hash: string;
  timestamp: number;
}

class HashCache {
  private static instance: HashCache;
  private cache: Map<string, HashCacheItem>;
  private CACHE_EXPIRY = 1000 * 60 * 60; // 1 hora

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): HashCache {
    if (!HashCache.instance) {
      HashCache.instance = new HashCache();
    }
    return HashCache.instance;
  }

  public generateHash(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  // Adiciona um hash ao cache
  public addHash(content: string): string {
    const hash = this.generateHash(content);
    this.cache.set(hash, {
      hash,
      timestamp: Date.now()
    });
    return hash;
  }

  // Verifica se um conteúdo já existe
  public hasContent(content: string): boolean {
    const hash = this.generateHash(content);
    return this.cache.has(hash);
  }

  // Remove hashes expirados
  public cleanup(): void {
    const now = Date.now();
    for (const [hash, item] of this.cache.entries()) {
      if (now - item.timestamp > this.CACHE_EXPIRY) {
        this.cache.delete(hash);
      }
    }
  }

  // Sincroniza o cache com o banco de dados
  public async syncWithDatabase(): Promise<void> {
    // Limpa o cache atual
    this.cache.clear();
    
    // Busca todos os incidentes e adiciona ao cache
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 10000,
      includeMetadata: true
    });

    results.matches?.forEach((match: PineconeRecord) => {
      const content = match.metadata?.content;
      if (content && typeof content === 'string') {
        this.addHash(content);
      }
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const hashCache = HashCache.getInstance();

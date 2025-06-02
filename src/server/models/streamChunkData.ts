import { CertCategorizationResult } from './certCategorization';
import { LLMCategorizationResult } from './llmCategorization';
import { NistCategorizationResult } from './nistCategorization';

export type StreamChunkData = 
  | { type: 'init'; total: number; batchSize: number }
  | { 
      type: 'batch'; 
      data: CertCategorizationResult | LLMCategorizationResult | NistCategorizationResult;
      progress: {
        processed: number;
        total: number;
        percentage: number;
      }
    }
  | { type: 'complete' }
  | { type: 'error'; message: string };
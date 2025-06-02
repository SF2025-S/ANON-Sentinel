import { z } from 'zod';
import { AIUsageSchema, LLMCategorizationResultSchema } from './zodSchemas';

export interface LLMIncidentClassification {
  id: string;
  category: string; // para o LLM definir
  reason: string;
  timestamp: string;
}

export interface LLMCategoryCount {
  category: string;
  count: number;
}

export type LLMCategorizationResult = z.infer<typeof LLMCategorizationResultSchema>;

export type LLMCategorizationResultWithUsage = LLMCategorizationResult & {
  usage: z.infer<typeof AIUsageSchema>
};
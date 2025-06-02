import { z } from 'zod';
import { AIUsageSchema, NistCategorizationResultSchema } from './zodSchemas';

export interface NistIncidentClassification {
  id: string;
  category: 'CAT 0' | 'CAT 1' | 'CAT 2' | 'CAT 3' | 'CAT 4' | 'CAT 5' | 'CAT 6';
  reason: string;
  timestamp: string;
}

export interface NistCategoryCount {
  category: string;
  count: number;
}

export type NistCategorizationResult = z.infer<typeof NistCategorizationResultSchema>

export type NistCategorizationResultWithUsage = NistCategorizationResult & {
  usage: z.infer<typeof AIUsageSchema>
}
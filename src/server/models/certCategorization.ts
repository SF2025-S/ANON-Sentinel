import { z } from 'zod';
import { AIUsageSchema, CertCategorizationResultSchema } from './zodSchemas';

export interface CertIncidentClassification {
  id: string;
  // baseado em https://stats.cert.br/incidentes/#incidentes
  category: 'DoS' | 'Fraude' | 'Invasão' | 'Scan' | 'Web' | 'Outros';
  reason: string;
  timestamp: string;
}

export interface CertCategoryCount {
  category: string;
  count: number;
}

export type CertCategorizationResult = z.infer<typeof CertCategorizationResultSchema>;

export type CertCategorizationResultWithUsage = CertCategorizationResult & {
  usage: z.infer<typeof AIUsageSchema>;
}; 
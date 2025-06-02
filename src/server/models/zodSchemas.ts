import { z } from 'zod';

const CertClassificationSchema = z.object({
    id: z.string(),
    category: z.enum(['DoS', 'Fraude', 'Invasão', 'Scan', 'Web', 'Outros']),
    reason: z.string(),
    timestamp: z.string()
});

const CertCategoryCountSchema = z.object({
    category: z.string(),
    count: z.number()
});

const validateUniqueIds = (items: Array<{ id: string }>) => {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
};

const uniqueIdsRefinement = {
  refine: validateUniqueIds,
  message: "IDs must be unique within classifications"
};

const CertCategorizationResultSchema = z.object({
    classifications: z.array(CertClassificationSchema).refine(
        uniqueIdsRefinement.refine, { message: uniqueIdsRefinement.message }
    ),
    totalIncidents: z.number(),
    totalCategories: z.number(),
    categoryCounts: z.array(CertCategoryCountSchema),
    model: z.string(),
    categorizationType: z.enum(['CERT', 'LLM', 'NIST'])
});

const LLMClassificationSchema = z.object({
    id: z.string(),
    category: z.string(),
    reason: z.string(),
    timestamp: z.string()
});

const LLMCategoryCountSchema = z.object({
    category: z.string(),
    count: z.number()
});

const LLMCategorizationResultSchema = z.object({
    classifications: z.array(LLMClassificationSchema).refine(
        uniqueIdsRefinement.refine, { message: uniqueIdsRefinement.message }
    ),
    totalIncidents: z.number(),
    totalCategories: z.number(),
    categoryCounts: z.array(LLMCategoryCountSchema),
    model: z.string(),
    categorizationType: z.enum(['CERT', 'LLM', 'NIST'])
});

const NistClassificationSchema = z.object({
    id: z.string(),
    category: z.enum(['CAT 0', 'CAT 1', 'CAT 2', 'CAT 3', 'CAT 4', 'CAT 5', 'CAT 6']),
    reason: z.string(),
    timestamp: z.string()
});

const NistCategoryCountSchema = z.object({
    category: z.string(),
    count: z.number()
});

const NistCategorizationResultSchema = z.object({
    classifications: z.array(NistClassificationSchema).refine(
        uniqueIdsRefinement.refine, { message: uniqueIdsRefinement.message }
    ),
    totalIncidents: z.number(),
    totalCategories: z.number(),
    categoryCounts: z.array(NistCategoryCountSchema),
    model: z.string(),
    categorizationType: z.enum(['CERT', 'LLM', 'NIST'])
});

const AIUsageSchema = z.object({
    promptTokens: z.number(),
   completionTokens: z.number(),
   totalTokens: z.number(),
 });

 export { 
    CertCategorizationResultSchema, 
    LLMCategorizationResultSchema,
    NistCategorizationResultSchema,
    AIUsageSchema
};
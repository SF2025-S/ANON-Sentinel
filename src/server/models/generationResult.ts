import { UsageMetrics } from "./usageMetrics";

export interface GenerationResult {
  response: string;
  metrics: UsageMetrics;
}
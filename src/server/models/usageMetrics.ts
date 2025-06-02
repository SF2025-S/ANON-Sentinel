import { DetailedSimilarityScore } from "./similarityScore";

export interface UsageMetrics {
    contextUtilization: number;
    sourceDocuments: string[];
    similarityScores: DetailedSimilarityScore[];
  }
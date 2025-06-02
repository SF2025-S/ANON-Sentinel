import { DetailedSimilarityScore } from "./similarityScore";
import { SecurityIncident } from "./incident";

export interface SearchResponse {
    results: DetailedSimilarityScore[];
    metrics: {
      totalFound: number;
      totalReturned: number;
      averageSimilarity: number;
    };
  }
  
  export interface SimpleSearchResponse {
    message: string;
    data: SecurityIncident[];
  }
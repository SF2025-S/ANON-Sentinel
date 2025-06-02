import { SecurityIncident } from "./incident";

export interface DetailedSimilarityScore {
    documentId: string;
    similarity: number;
    incident: SecurityIncident;
  }
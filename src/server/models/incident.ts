export interface SecurityIncident {
    id: string;
    content: string;
    timestamp: string;
    source?: string;
}

export interface IncidentWithScore extends SecurityIncident {
    score: number;
}

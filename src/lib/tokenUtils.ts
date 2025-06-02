import { DEFAULT_MODEL } from '@/server/models/aiModels';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  totalProcessingTime: number;
}

export interface MessageMetadata {
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  estimatedCost: {
    USD: number;
    BRL: number;
  };
  processingTime: {
    total: number;
    untillStreaming: number;
  };
  modelName: string;
}

// Constantes para cálculos de custo de tokens
export const COST_PER_MILLION_INPUT_TOKENS_USD: Record<string, number> = {
  "gemini-2.0-flash-001": 0.15, 
  "DEFAULT": 0.50 
};

export const COST_PER_MILLION_OUTPUT_TOKENS_USD: Record<string, number> = {
  "gemini-2.0-flash-001": 0.6, 
  "DEFAULT": 1.50 
};

// Taxa de conversão USD para BRL
export const USD_TO_BRL_RATE = 5.6;


export function calculateTokenCost(usage: TokenUsage, modelId: string = DEFAULT_MODEL.id): 
{ costUSD: number; costBRL: number } {
  const inputCostRate = COST_PER_MILLION_INPUT_TOKENS_USD[modelId] || 
                        COST_PER_MILLION_INPUT_TOKENS_USD["DEFAULT"];
  
  const outputCostRate = COST_PER_MILLION_OUTPUT_TOKENS_USD[modelId] || 
                         COST_PER_MILLION_OUTPUT_TOKENS_USD["DEFAULT"];

  // Cálculo do custo em USD
  const inputCostUSD = (usage.promptTokens / 1000000) * inputCostRate;
  const outputCostUSD = (usage.completionTokens / 1000000) * outputCostRate;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  
  const totalCostBRL = totalCostUSD * USD_TO_BRL_RATE;
  return { costUSD: totalCostUSD, costBRL: totalCostBRL };
}


export function formatCurrency(value: number, currency: 'USD' | 'BRL'): string {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency, 
    minimumFractionDigits: currency === 'USD' ? 2 : 2,
    maximumFractionDigits: currency === 'USD' ? 6 : 2  
  });
}


// Cria um objeto de metadados de mensagem com base no uso de tokens e tempos de processamento
export function createMessageMetadata(
  usage: TokenUsage,
  startTime: number,
  startStreamingTime: number,
  endTime: number,
  modelId: string = DEFAULT_MODEL.id
): MessageMetadata {
  const { costUSD } = calculateTokenCost(usage, modelId);
  const processingTime = (endTime - startTime) / 1000; // segundos
  const untillStreaming = processingTime - (endTime - startStreamingTime) / 1000; // segundos

  return {
    tokens: {
      input: usage.promptTokens,
      output: usage.completionTokens,
      total: usage.totalTokens
    },
    estimatedCost: {
      USD: costUSD,
      BRL: costUSD * USD_TO_BRL_RATE
    },
    processingTime: {
      total: processingTime,
      untillStreaming: untillStreaming
    },
    modelName: modelId
  };
}
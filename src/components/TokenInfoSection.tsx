import { HelpCircle, DollarSign } from "lucide-react";
import { TokenUsage, formatCurrency, USD_TO_BRL_RATE,COST_PER_MILLION_INPUT_TOKENS_USD, COST_PER_MILLION_OUTPUT_TOKENS_USD } from "@/lib/tokenUtils";

interface TokenInfoProps {
  tokens: TokenUsage | null;
  modelId: string;
}

export const TokenInfoSection = ({ tokens, modelId }: TokenInfoProps) => {
  if (!tokens) return null;

  const inputCostRate = COST_PER_MILLION_INPUT_TOKENS_USD[modelId] || 
                       COST_PER_MILLION_INPUT_TOKENS_USD["DEFAULT"];
  const outputCostRate = COST_PER_MILLION_OUTPUT_TOKENS_USD[modelId] || 
                        COST_PER_MILLION_OUTPUT_TOKENS_USD["DEFAULT"];

  const inputCostUSD = (tokens.promptTokens / 1000000) * inputCostRate;
  const outputCostUSD = (tokens.completionTokens / 1000000) * outputCostRate;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  const totalCostBRL = totalCostUSD * USD_TO_BRL_RATE;

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-gray-800">Entendendo os Tokens</h4>
      </div>
      <ul className="list-disc list-inside space-y-1 pl-2">
        <li><strong>Tokens de Entrada:</strong> Quantidade de &ldquo;palavras&rdquo; ou frações de palavras enviadas à IA para processamento (ex: descrições de incidentes, instruções).</li>
        <li><strong>Tokens de Saída:</strong> Quantidade de &ldquo;palavras&rdquo; geradas pela IA como resposta (ex: categorias, motivos da classificação).</li>
        <li><strong>Tokens Totais:</strong> Soma dos tokens de entrada e saída, geralmente usada para cálculo de custo.</li>
      </ul>
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h4 className="font-semibold text-gray-800">Estimativa de Custo (Modelo: {modelId})</h4>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Valores baseados em {formatCurrency(inputCostRate, 'USD')}/milhão (entrada) e {formatCurrency(outputCostRate, 'USD')}/milhão (saída) para o modelo selecionado.
          Conversão para Real (BRL) considera 1 USD = {formatCurrency(USD_TO_BRL_RATE, 'BRL')}. Estes são valores de exemplo e podem variar.
        </p>
        <div className="mt-2 space-y-1">
          <p>Custo de Entrada: {tokens.promptTokens.toLocaleString('pt-BR')} tokens × ({formatCurrency(inputCostRate, 'USD')} / 1M) = <strong>{formatCurrency(inputCostUSD, 'USD')}</strong></p>
          <p>Custo de Saída: {tokens.completionTokens.toLocaleString('pt-BR')} tokens × ({formatCurrency(outputCostRate, 'USD')} / 1M) = <strong>{formatCurrency(outputCostUSD, 'USD')}</strong></p>
          <p className="font-semibold">Custo Total Estimado (USD): <span className="text-green-700">{formatCurrency(totalCostUSD, 'USD')}</span></p>
          <p className="font-semibold">Custo Total Estimado (BRL): <span className="text-green-700">{formatCurrency(totalCostBRL, 'BRL')}</span></p>
        </div>
      </div>
    </div>
  );
};
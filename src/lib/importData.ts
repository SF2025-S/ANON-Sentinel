import { upsertIncident } from './vectorStore';
import { SecurityIncident } from '../server/models/incident';

// Função para processar arquivo de texto com múltiplos incidentes
export async function importFromText(content: string) {
  
  const incidents = content
    .split(/\n*#{3}\n*|\n*-{3}\n*/)  // Captura os separadores ### ou --- com ou sem quebras de linha
    .map(text => text.trim())
    .filter(text => text.length > 0);  // Remove textos vazios

  const results = {
    processed: 0,
    duplicates: 0,
    errors: 0,
    incidentIds: [] as string[]  // Array para armazenar os IDs dos incidentes processados
  };

  // Processa cada incidente
  for (const incidentText of incidents) {
    try {
      const incident: SecurityIncident = {
        id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: incidentText,
        timestamp: new Date().toISOString(),
        source: 'file-upload'
      };

      await upsertIncident(incident, true);
      results.processed++;
      results.incidentIds.push(incident.id); // Armazena o ID do incidente processado
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'DUPLICATE_INCIDENT') {
        results.duplicates++;
      } else {
        results.errors++;
      }
    }
  }
  
  return results;
}

// Função que processa o arquivo
export async function importFile(content: string, fileType: string) {
  if (fileType.toLowerCase() === 'txt') {
    return await importFromText(content);
  } else {
    throw new Error('Formato de arquivo não suportado. Use apenas arquivos TXT.');
  }
}
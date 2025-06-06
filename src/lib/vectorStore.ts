import getIndex from './pinecone';
import { generateEmbedding } from './embeddings';
import { SecurityIncident } from '../server/models/incident';
import { hashCache } from './hashCache';

// Verifica se o texto é exatamente igual a algum existente
async function isDuplicate(content: string): Promise<boolean> {
  // Verifica primeiro no cache
  if (hashCache.hasContent(content)) {
    return true;
  }

  // Se não encontrou no cache, sincroniza com o banco e verifica novamente
  await hashCache.syncWithDatabase();
  
  if (hashCache.hasContent(content)) {
    return true;
  }

  // Se não é duplicata, adiciona ao cache
  hashCache.addHash(content);
  return false;
}

export async function upsertIncident(incident: SecurityIncident, checkDuplicate: boolean = true) {
  if (checkDuplicate) {
    const isDup = await isDuplicate(incident.content);
    if (isDup) {
      throw new Error('DUPLICATE_INCIDENT');
    }
  }

  const embedding = await generateEmbedding(incident.content);
  const indexInstance = await getIndex();
  
  await indexInstance.upsert([{
    id: incident.id,
    values: embedding,
    metadata: {
      content: incident.content,
      timestamp: incident.timestamp,
      source: incident.source || 'unknown'
    }
  }]);

  // Adiciona ao cache após sucesso no upsert
  hashCache.addHash(incident.content);
}

export async function querySimilarIncidents(query: string, topK: number = 5) {
  const queryEmbedding = await generateEmbedding(query);
  const indexInstance = await getIndex();
  
  const results = await indexInstance.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true
  });
  
  return results.matches;
}

export async function queryAllIncidents() {
  const indexInstance = await getIndex();
  
  // vetor nulo com topK alto para pegar todos os registros
  const results = await indexInstance.query({
    vector: Array(768).fill(0), // array de zeros com o tamanho da dimensão do modelo
    topK: 10000, // número máximo de registros que queremos retornar
    includeMetadata: true
  });
  
  //console.log('Pinecone results:', results);

  const incidents = (results.matches || []).map(match => ({
    id: match.id,
    content: match.metadata?.content as string,
    timestamp: match.metadata?.timestamp as string,
    source: match.metadata?.source as string
  }));

  //console.log('Mapped incidents:', incidents);
  
  //console.log('Incidents count:', incidents.length);
  return incidents;
}

// Função para buscar estatísticas do índice
export async function getIndexStats() {
  const indexInstance = await getIndex();
  return await indexInstance.describeIndexStats();
}

export async function getIncidentById(id: string) {
  try {
    const indexInstance = await getIndex();
    const result = await indexInstance.fetch([id]);
    
    // Verifica se o vetor foi encontrado
    if (!result.records || !result.records[id]) {
      return null;
    }
    
    const record = result.records[id];
    
    return {
      id: id,
      content: record.metadata?.content as string,
      timestamp: record.metadata?.timestamp as string,
      source: record.metadata?.source as string
    };
  } catch (error) {
    console.error("Erro ao buscar incidente por ID:", error);
    return null;
  }
}

export async function deleteAllRecords() {
  try { 
    const indexInstance = await getIndex();
    
    // Deleta todos os registros do Pinecone
    await indexInstance.deleteAll();
    
    // Limpa o cache de hashes
    hashCache.clear();
 
    return {
      success: true,
      message: 'Todos os registros e cache foram deletados com sucesso',
    };
  } catch (error) {
    console.error("Erro ao deletar registros:", error);
    throw new Error('Falha ao deletar registros');
  }
} 
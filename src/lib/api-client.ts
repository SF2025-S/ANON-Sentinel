import { auth } from "./firebaseconfig";

const isDev = process.env.NODE_ENV === 'development';
const PANEL_KEY = process.env.NEXT_PANEL_KEY || 'dev-admin-key';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

interface UploadResponse {
  message: string;
  results: {
    processed: number;
    duplicates: number;
    errors: number;
  };
  fileType?: string;
  details?: string;
  incidentIds?: string[];
}

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint}`;
  const { params, headers: customHeaders, ...restOptions } = options;
  
  // Obter o token atual do usuário
  const token = await auth.currentUser?.getIdToken();
  
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  const url = `${apiEndpoint}${queryString}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...customHeaders,
  } as Record<string, string>;

  const response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include', // inclui cookies nas requisições para permitir auth com firebase em todas as rotas
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  }

  return data;
}

export async function uploadFile(endpoint: string, formData: FormData): Promise<UploadResponse> {
  const apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint}`;
  
  // Obter o token atual do usuário
  const token = await auth.currentUser?.getIdToken();
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...(isDev ? { 'x-api-key': PANEL_KEY } : {}),
  } as Record<string, string>;

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      // Capturar o objeto de erro completo para permitir um tratamento mais específico
      const errorObj = {
        ...data,
        status: response.status,
        statusText: response.statusText,
        message: data.message || data.error || `Erro ${response.status}: ${response.statusText}`
      };
      
      throw errorObj;
    }

    return data;
  } catch (error) {
    // Se o erro já for um objeto estruturado (de nossa API), apenas rethrow
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }
    
    // Outros erros (rede, etc.)
    console.error("Erro na função uploadFile:", error);
    throw {
      error: "Erro de conexão",
      message: error instanceof Error ? error.message : "Não foi possível se conectar ao servidor",
      details: "Verifique sua conexão com a internet e tente novamente."
    };
  }
}

export async function* streamApiClient(endpoint: string, options: FetchOptions = {}) {
  const apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint}`;
  const { params, headers: customHeaders, ...restOptions } = options;
  
  const token = await auth.currentUser?.getIdToken();
  
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  const url = `${apiEndpoint}${queryString}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...customHeaders,
  } as Record<string, string>;

  const response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro na conexão com o stream');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Stream não disponível');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch (e) {
          console.error('Erro ao processar dados do stream:', e);
        }
      }
    }
  }
} 
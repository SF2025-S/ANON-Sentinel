export const AI_MODELS = {
    GEMINI: {
      id: 'gemini-2.0-flash-001',
      name: 'Gemini 2.0 flash',
      provider: 'google',
      displayName: 'Gemini 2.0 flash',
      description: 'Modelo da Google conhecido por sua velocidade, inteligência e baixo custo.',
    },
    // Podemos adicionar outros modelos facilmente aqui
    // GPT4: {
    //   id: 'gpt-4',
    //   name: 'GPT-4',
    //   provider: 'openai',
    //   displayName: 'GPT-4 Turbo',
    //   description: 'Modelo mais avançado da OpenAI'
    // }
  } as const;
  
  // Modelo padrão para ser usado na aplicação
  export const DEFAULT_MODEL = AI_MODELS.GEMINI;
  
  // Tipo para os modelos suportados
  export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];
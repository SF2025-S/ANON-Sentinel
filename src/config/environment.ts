interface Config {
  pineconeKey: string;
  googleAiKey: string;
}

const config: Config = {
  pineconeKey: process.env.PINECONE_KEY || '',
  googleAiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
};

export default config; 
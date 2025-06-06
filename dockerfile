# Multi-stage build para otimizar o tamanho da imagem
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci

# Copiar arquivo de environment para o build
COPY .env.evaluation .env.local

# Copiar código fonte
COPY . .

# Build da aplicação com variáveis de ambiente
RUN npm run build

# Imagem de produção
FROM node:18-alpine AS runner

WORKDIR /app

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar arquivos buildados
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]

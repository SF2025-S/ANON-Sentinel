# ANON-Sentinel: Solução inteligente para o gerenciamento de incidentes de segurança

## 📋 Visão Geral

O ANON-Sentinel é uma ferramenta fullstack que auxilia durante todo o processo de gestão de incidentes de segurança, desde o cadastro até a solução. Utiliza tecnologias modernas como Next.js, React, Express e integração com APIs de IA para fornecer análises inteligentes de incidentes de segurança.

### 🚀 Funcionalidades Principais

- **Upload de Incidentes**: Upload de múltiplos incidentes via arquivos TXT (separados por `###` ou `---`)
- **Gerenciamento de Tickets**: Visualização e gerenciamento de incidentes com possibilidade de gerar soluções com auxílio de IA
- **Classificação Automatizada**: Três maneiras distintas de classificação:
  - **CERT**: Classificação em uma das 8 categorias conforme definidas pelo CERT.br 
  - **NIST**: Classificação em uma das 7 categorias conforme definidas pelo NIST
  - **LLM**: Classificação baseada no conhecimento próprio da IA, sem guias específicos
- **Interface de Chat com RAG**: Permite fazer perguntas sobre incidentes de segurança e receber respostas baseadas nos dados armazenados
- **Módulo de Resultados**: Verificação integrada das classificações e soluções geradas, com avaliação de qualidade

### 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js
- **IA e APIs**: Google Generative AI API, Pinecone (busca vetorial)
- **Autenticação**: Firebase Auth
- **Banco de Dados**: Firebase Firestore
- **Containerização**: Docker e Docker Compose

---

## 🚀 Para Avaliadores - Execução Rápida

### Pré-requisitos
- [Docker](https://www.docker.com/get-started) e Docker Compose instalados
- Arquivos `.env.evaluation` e `.env.local` (fornecidos separadamente pelos autores)
- Email e senha para login (fornecidos separadamente pelos autores)

### Opção 1: Execução Automática (Recomendado)

1. **Clone o repositório**:
```bash
git clone https://github.com/SF2025-S/ANON-Sentinel
cd ANON-Sentinel
```

2. **Coloque os arquivos `.env.evaluation` e `.env.local`** fornecido pelos autores na raiz do projeto

3. **Execute o script de inicialização**:

**Windows (CMD):**
```batch
start-evaluation.bat
```

**Linux/Mac:**
```bash
chmod +x start-evaluation.sh
./start-evaluation.sh
```

4. **Acesse a aplicação**: http://localhost:3000

5. **Finalize a aplicação**: 
```bash
docker-compose down
```

### Opção 2: Execução Manual com Docker

```bash
docker-compose --env-file .env.evaluation up --build
```

### 📝 Notas para Avaliadores

- **Configuração**: As variáveis de ambiente e informações de login serão enviados separadamente por segurança
- **Dados de exemplo**: Alguns dados podem estar pré-carregados
- **Acesso**: Após inicialização, acesse http://localhost:3000

---

<details>
<summary><strong>👨‍💻 Configuração Completa para Desenvolvedores</strong></summary>

## Instalação e Configuração para Desenvolvimento

### Opção 1: Execução com Docker

#### Pré-requisitos
- [Docker](https://www.docker.com/get-started) e Docker Compose instalados
- Chaves de API configuradas

#### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/SF2025-S/ANON-Sentinel
cd ANON-Sentinel

# 2. Configure as variáveis de ambiente
cp .env.example .env.evaluation

# 3. Edite o arquivo .env.evaluation com suas chaves (veja seção abaixo)

# 4. Build e execução
docker-compose --env-file .env.evaluation up --build
```

### Opção 2: Execução Local

#### Pré-requisitos
- Node.js 18+ e npm
- Chaves de API configuradas

#### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/SF2025-S/ANON-Sentinel
cd ANON-Sentinel

# 2. Instale as dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local

# 4. Edite o arquivo .env.local com suas chaves (veja seção abaixo)

# 5. Build do projeto
npm run build

# 6. Execute o servidor
npm run start
```

## ⚙️ Configuração de Variáveis de Ambiente

### Variáveis Necessárias

Crie um arquivo `.env.evaluation` (para Docker) ou `.env.local` (para execução local) com as seguintes variáveis:

```env
# APIs de IA
GOOGLE_GENERATIVE_AI_API_KEY=sua_chave_google_ai
PINECONE_KEY=sua_chave_pinecone

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_chave_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Como Obter as Chaves de API

#### 1. Google AI API
- Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
- Crie um novo projeto e gere uma chave API
- Copie a chave para `GOOGLE_GENERATIVE_AI_API_KEY`

#### 2. Pinecone
- Registre-se em [Pinecone](https://www.pinecone.io/)
- Crie um novo projeto
- Não é necessário criar um índice pelo painel Pinecone, apenas defina o nome do índice/namespace através da variável indexName em lib/pinecone.ts
- Copie a API Key para `PINECONE_KEY`

#### 3. Firebase
- Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
- Ative **Authentication** e configure provedores (Email/Password, Google, etc.)
- Ative **Firestore Database** em modo de teste
- Vá em **Configurações do Projeto** > **Geral**
- Na seção "Seus apps", adicione um app web
- Copie as configurações do Firebase para as variáveis correspondentes

##### 📋 Configuração Obrigatória: Usuários Autorizados

Após configurar o Firebase, é **obrigatório** criar usuários autorizados:

**Passo 1: Ativar Email/Senha no Authentication**
1. Vá em **Authentication** > **Sign-in method**
2. Clique em **Email/Password** 
3. Ative a opção e salve

**Passo 2: Criar Usuário no Authentication**
1. Vá em **Authentication** > **Users**
2. Clique em **Add user**
3. Digite o email e senha do usuário
4. Salve o usuário

**Passo 3: Criar Coleção de Usuários Autorizados no Firestore**
1. Vá em **Firestore Database**
2. Clique em **Start collection**
3. Nome da coleção: `authorized_users`
4. Crie um documento com:
   - **Document ID**: (auto-gerado ou o email do usuário)
   - **Campo**: `email` (tipo: string)
   - **Campo**: `active` (tipo: boolean) 
   - **Campo**: `role` (tipo: string)

**Exemplo da estrutura no Firestore:**
```bash
authorized_users/
└── documento1/
├── email: "admin@empresa.com"
└── isActive: true
└── role: "admin"
```

⚠️ **Importante**: Sem esta configuração, nenhum usuário conseguirá fazer login no sistema, mesmo com credenciais válidas no Authentication.

### Scripts de Desenvolvimento

```bash
# Desenvolvimento
npm run dev              # Inicia em modo desenvolvimento (hot reload)

# Produção
npm run build           # Build da aplicação
npm run start           # Inicia em modo produção

# Utilitários
npm run lint            # Verificação de código
npm run type-check      # Verificação de tipos TypeScript
```

## 🚀 Uso da Aplicação

### Acesso
Após iniciar a aplicação, acesse:
- **URL Local**: http://localhost:3001
</details>

### Fluxo de Uso

1. **Autenticação**: Faça login através da interface Firebase
2. **Upload de Incidentes**: Use a funcionalidade de upload para carregar arquivos TXT
3. **Visualização**: Acesse a lista de tickets para ver os incidentes carregados
4. **Classificação**: Use as opções de classificação automática (CERT, NIST, LLM)
5. **Chat**: Utilize a interface de chat para fazer perguntas sobre os incidentes
6. **Resultados**: Verifique as análises e classificações no módulo de resultados

## 📁 Estrutura do Projeto
```
ANON-Sentinel/
├── src/
│ ├── app/ # Páginas Next.js (App Router)
│ ├── components/ # Componentes React reutilizáveis
│ ├── server/ # Servidor Express
│ │ ├── routes/ # Rotas da API
│ │ ├── services/ # Serviços de integração
│ │ └── models/ # Modelos de dados
│ ├── lib/ # Utilitários e configurações
│ └── config/ # Configurações da aplicação
├── public/ # Arquivos estáticos
├── Dockerfile # Configuração Docker
├── docker-compose.yml # Orquestração de containers
├── start-evaluation.* # Scripts de inicialização
└── package.json # Dependências e scripts
```

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Erro de conexão com APIs**:
   - Verifique se as chaves estão corretas no arquivo de ambiente
   - Confirme se as APIs têm créditos/quota disponível

2. **Docker não inicia**:
   - Verifique se o Docker Desktop está rodando
   - Execute `docker --version` para confirmar instalação

3. **Erro de porta em uso**:
   - Pare outros serviços na porta 3000: `lsof -ti:3000 | xargs kill -9`
   - Ou altere a porta no docker-compose.yml

4. **Problemas de build**:
   - Limpe o cache: `docker-compose down --volumes`
   - Delete node_modules e reinstale: `rm -rf node_modules && npm install`

### Logs e Debug

```bash
# Ver logs do Docker
docker-compose logs -f

# Debug em modo desenvolvimento
npm run dev
```

### Verificação de Saúde

```bash
# Verificar se a aplicação está rodando
curl http://localhost:3000/api/health

# Verificar containers Docker
docker-compose ps
```

## 📄 Licença

Este projeto é desenvolvido para fins acadêmicos e de pesquisa.

**Versão**: 0.1.0  
**Node.js**: 18+  
**Docker**: Recomendado para execução

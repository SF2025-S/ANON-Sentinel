# Integração LLM RAG para Incidentes de Segurança

## Visão Geral

O ANON-Sentinel é uma ferramenta que auxilia durante todo o processo de gestão de incidentes de segurança, desde o cadastro até a solução. As funcionalidade incluem:

- Upload de múltiplos incidentes via arquivos TXT (separados por `###` ou `---`)
- Gerenciamento e visualização em listagem dos tickets (incidentes), com a possibilidade de gerar soluções com auxílio de IA
- Classificação automatizada em 3 maneiras distintas:
    - CERT: A IA classificará a base de incidentes em uma das 8 categorias conforme definidas pelo CERT.br 
    - NIST: A IA classificará a base de incidentes em uma das 7 categorias conforme definidas pelo NIST
    - LLM: A IA classificará a base de incidentes conforme seu próprio conhecimento, sem receber qualquer tipo de guia
- Interface de chat permitindo aos usuários fazer perguntas sobre incidentes de segurança e receber respostas baseadas nos dados armazenados.
- Módulo 'Resultados' que permite verificar de forma facilitada e integrada as classificações e soluções geradas para os incidentes, bem como avaliar a qualidade dessas gerações


## Como Começar

1.  **Pré-requisitos:** Node.js e npm.
2.  **Clone o repositório:**
    ```bash
    git clone https://github.com/SF2025-S/ANON-Sentinel
    cd Anon-Sentinel
    ```
3.  **Instale as dependências:**
    ```bash
    npm install --production
    ```
4.  **Configuração:**
    *   Configure as variáveis de ambiente necessárias. Crie um arquivo .env e outro .env.local, conforme exibido no .env.example e utilize as chaves de API informadas
5.  **Build do projeto:**
    ```bash
    npm run build
    ```
    **Execute o servidor:**
    ```bash
    npm run start
    ```
6.  **Acesse as Interface:** O projeto roda em http://localhost:3001/




echo "=== Iniciando Aplicacao para Avaliacao ==="
echo ""

# Verificar se Docker está rodando
if ! docker --version > /dev/null 2>&1; then
    echo "ERRO: Docker nao encontrado! Por favor, instale o Docker primeiro."
    exit 1
fi

# Verificar se o arquivo de configuração existe
if [ ! -f .env.evaluation ]; then
    echo "ERRO: Arquivo .env.evaluation nao encontrado!"
    echo ""
    echo "Por favor:"
    echo "1. Solicite o arquivo .env.evaluation aos autores"
    echo "2. Coloque o arquivo na mesma pasta deste script"
    echo "3. Execute novamente este script"
    exit 1
fi

echo "✓ Arquivo de configuracao encontrado"
echo "✓ Carregando variaveis de ambiente..."

# Parar containers existentes (se houver)
docker-compose down > /dev/null 2>&1

echo "✓ Construindo e iniciando a aplicacao..."
echo "  (Isso pode levar alguns minutos na primeira vez)"
echo ""

# Iniciar aplicação com as variáveis do arquivo
docker-compose --env-file .env.evaluation up --build

echo ""
echo "=== Aplicacao finalizada ==="
@echo off
echo === Iniciando Aplicacao para Avaliacao ===
echo.

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker nao encontrado! Por favor, instale o Docker primeiro.
    pause
    exit /b 1
)

REM Verificar se o arquivo de configuração existe
if not exist .env.evaluation (
    echo ERRO: Arquivo .env.evaluation nao encontrado!
    echo.
    echo Por favor:
    echo 1. Solicite o arquivo .env.evaluation aos autores
    echo 2. Coloque o arquivo na mesma pasta deste script
    echo 3. Execute novamente este script
    pause
    exit /b 1
)

echo ✓ Arquivo de configuracao encontrado
echo ✓ Carregando variaveis de ambiente...

REM Parar containers existentes
docker-compose down >nul 2>&1

echo ✓ Construindo e iniciando a aplicacao...
echo   (Isso pode levar alguns minutos na primeira vez)
echo.

REM Iniciar aplicação
docker-compose --env-file .env.evaluation up --build

echo.
echo === Aplicacao finalizada ===
pause
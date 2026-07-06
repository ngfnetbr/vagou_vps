#!/bin/bash

# =============================================================================
# VAGOU - Script de Exportação do Schema do Banco de Dados
# =============================================================================
# Este script exporta o schema completo do Supabase atual para um arquivo SQL
# que pode ser usado para criar novos projetos idênticos.
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  VAGOU - Exportação de Schema${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Verificar se a variável de ambiente está definida
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${YELLOW}A variável SUPABASE_DB_URL não está definida.${NC}"
    echo ""
    echo "Você pode encontrar a URL de conexão em:"
    echo "  Supabase Dashboard → Project Settings → Database → Connection string → URI"
    echo ""
    echo "Formato: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
    echo ""
    read -p "Cole a URL de conexão do banco: " SUPABASE_DB_URL
    
    if [ -z "$SUPABASE_DB_URL" ]; then
        echo -e "${RED}Erro: URL de conexão não fornecida.${NC}"
        exit 1
    fi
fi

# Verificar se pg_dump está instalado
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Erro: pg_dump não encontrado.${NC}"
    echo "Instale o PostgreSQL client:"
    echo "  - macOS: brew install libpq && brew link --force libpq"
    echo "  - Ubuntu: sudo apt-get install postgresql-client"
    echo "  - Windows: Instale o PostgreSQL"
    exit 1
fi

# Nome do arquivo de saída
OUTPUT_DIR="scripts/exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${OUTPUT_DIR}/schema_completo_${TIMESTAMP}.sql"

# Criar diretório se não existir
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Exportando schema do banco de dados...${NC}"
echo ""

# Exportar schema completo
pg_dump "$SUPABASE_DB_URL" \
    --schema=public \
    --schema-only \
    --no-owner \
    --no-acl \
    --no-comments \
    --if-exists \
    --clean \
    > "$OUTPUT_FILE"

# Verificar se o arquivo foi criado
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')
    echo -e "${GREEN}✓ Schema exportado com sucesso!${NC}"
    echo ""
    echo "  Arquivo: $OUTPUT_FILE"
    echo "  Tamanho: $FILE_SIZE bytes"
    echo ""
    
    # Mostrar resumo do conteúdo
    echo -e "${BLUE}Resumo do schema exportado:${NC}"
    echo "  - Tabelas: $(grep -c "CREATE TABLE" "$OUTPUT_FILE" || echo "0")"
    echo "  - Functions: $(grep -c "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" "$OUTPUT_FILE" || echo "0")"
    echo "  - Triggers: $(grep -c "CREATE TRIGGER" "$OUTPUT_FILE" || echo "0")"
    echo "  - Policies: $(grep -c "CREATE POLICY" "$OUTPUT_FILE" || echo "0")"
    echo "  - Indexes: $(grep -c "CREATE INDEX\|CREATE UNIQUE INDEX" "$OUTPUT_FILE" || echo "0")"
    echo ""
    echo -e "${GREEN}Pronto para usar em novos projetos!${NC}"
else
    echo -e "${RED}Erro: Falha ao criar arquivo de exportação.${NC}"
    exit 1
fi

#!/bin/bash

# =============================================================================
# VAGOU - Script de Deploy para Nova Cidade
# =============================================================================
# Script interativo para configurar um novo projeto Supabase para uma cidade.
# 
# Pré-requisitos:
#   - Supabase CLI instalado (npm install -g supabase)
#   - Projeto Supabase já criado no dashboard
#   - Variáveis coletadas do dashboard do Supabase
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Funções de utilidade
print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}[$1/$TOTAL_STEPS]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

confirm() {
    read -p "$1 [s/N]: " response
    case "$response" in
        [sS][iI][mM]|[sS]) return 0 ;;
        *) return 1 ;;
    esac
}

TOTAL_STEPS=8

# =============================================================================
# INÍCIO DO SCRIPT
# =============================================================================

print_header "VAGOU - Deploy Nova Cidade"

echo "Este script irá configurar um novo projeto Supabase para uma cidade."
echo "Certifique-se de ter criado o projeto no dashboard do Supabase antes de continuar."
echo ""

if ! confirm "Deseja continuar?"; then
    echo "Operação cancelada."
    exit 0
fi

# =============================================================================
# PASSO 1: Coletar informações do projeto Supabase
# =============================================================================
print_header "Passo 1: Informações do Projeto Supabase"

echo "Você encontra essas informações em:"
echo "  Supabase Dashboard → Project Settings → API"
echo ""

read -p "Project Reference (ex: abcdefghijklmnop): " PROJECT_REF
read -p "URL do Projeto (ex: https://xxx.supabase.co): " SUPABASE_URL
read -p "Anon Key: " ANON_KEY
read -p "Service Role Key: " SERVICE_ROLE_KEY
echo ""
echo "Encontre a Database URL em: Project Settings → Database → Connection string → URI"
read -p "Database URL: " DATABASE_URL

# Validar entradas
if [ -z "$PROJECT_REF" ] || [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ] || [ -z "$DATABASE_URL" ]; then
    print_error "Todas as informações são obrigatórias."
    exit 1
fi

print_success "Informações do projeto coletadas."

# =============================================================================
# PASSO 2: Coletar informações da cidade
# =============================================================================
print_header "Passo 2: Informações da Cidade"

read -p "Nome do Município: " NOME_MUNICIPIO
read -p "Nome da Secretaria: " NOME_SECRETARIA
read -p "Email de Contato: " EMAIL_CONTATO
read -p "Telefone de Contato: " TELEFONE_CONTATO
read -p "Endereço da Secretaria: " ENDERECO_SECRETARIA

print_success "Informações da cidade coletadas."

# =============================================================================
# PASSO 3: Verificar Supabase CLI
# =============================================================================
print_header "Passo 3: Verificando Supabase CLI"

if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI não encontrado."
    echo "Instale com: npm install -g supabase"
    exit 1
fi

print_success "Supabase CLI encontrado: $(supabase --version)"

# =============================================================================
# PASSO 4: Linkar projeto
# =============================================================================
print_header "Passo 4: Linkando Projeto"

cd "$PROJECT_ROOT"

print_step 4 "Fazendo login no Supabase (se necessário)..."
supabase login 2>/dev/null || true

print_step 4 "Linkando projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

print_success "Projeto linkado com sucesso."

# =============================================================================
# PASSO 5: Executar migrations
# =============================================================================
print_header "Passo 5: Aplicando Migrations"

print_step 5 "Aplicando migrations ao banco de dados..."

if confirm "Deseja aplicar todas as migrations existentes?"; then
    supabase db push
    print_success "Migrations aplicadas com sucesso."
else
    print_warning "Migrations não aplicadas. Execute manualmente: supabase db push"
fi

# =============================================================================
# PASSO 6: Configurar Storage
# =============================================================================
print_header "Passo 6: Configurando Storage"

print_step 6 "Criando buckets de storage..."

# Executar script de storage via psql
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f "$SCRIPT_DIR/setup-storage.sql"
    print_success "Buckets de storage criados."
else
    print_warning "psql não encontrado. Execute o script setup-storage.sql manualmente no SQL Editor."
fi

# =============================================================================
# PASSO 7: Inserir dados iniciais
# =============================================================================
print_header "Passo 7: Inserindo Dados Iniciais"

# Criar arquivo SQL temporário com dados da cidade
TEMP_SQL=$(mktemp)
cat "$SCRIPT_DIR/setup-dados-iniciais.sql" | \
    sed "s/{{NOME_MUNICIPIO}}/$NOME_MUNICIPIO/g" | \
    sed "s/{{NOME_SECRETARIA}}/$NOME_SECRETARIA/g" | \
    sed "s/{{EMAIL_CONTATO}}/$EMAIL_CONTATO/g" | \
    sed "s/{{TELEFONE_CONTATO}}/$TELEFONE_CONTATO/g" | \
    sed "s/{{ENDERECO_SECRETARIA}}/$ENDERECO_SECRETARIA/g" > "$TEMP_SQL"

if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f "$TEMP_SQL"
    rm "$TEMP_SQL"
    print_success "Dados iniciais inseridos."
else
    print_warning "psql não encontrado. Execute o SQL gerado manualmente."
    echo "Arquivo temporário: $TEMP_SQL"
fi

# =============================================================================
# PASSO 8: Deploy Edge Functions
# =============================================================================
print_header "Passo 8: Deploy Edge Functions"

print_step 8 "Configurando secrets..."

echo ""
echo "Configure os seguintes secrets no Supabase Dashboard:"
echo "  Project Settings → Edge Functions → Secrets"
echo ""
echo "  - SUPABASE_SERVICE_ROLE_KEY: $SERVICE_ROLE_KEY"
echo "  - RESEND_API_KEY: (sua chave da Resend, se usar email)"
echo "  - WEBHOOK_WHATSAPP_SECRET: (sua chave do webhook, se usar WhatsApp)"
echo ""

if confirm "Os secrets foram configurados?"; then
    print_step 8 "Fazendo deploy das Edge Functions..."
    supabase functions deploy
    print_success "Edge Functions deployed."
else
    print_warning "Configure os secrets e execute: supabase functions deploy"
fi

# =============================================================================
# RESUMO FINAL
# =============================================================================
print_header "Deploy Concluído!"

echo -e "${GREEN}O projeto foi configurado com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Configure a autenticação no Supabase Dashboard:"
echo "   - Authentication → Providers → Email (habilitar)"
echo "   - Authentication → URL Configuration → Redirect URLs"
echo ""
echo "2. Deploy na Vercel:"
echo "   - Crie um novo projeto"
echo "   - Configure as variáveis de ambiente:"
echo "     VITE_SUPABASE_URL=$SUPABASE_URL"
echo "     VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY"
echo ""
echo "3. Acesse o sistema e crie o primeiro usuário admin"
echo ""

# Salvar configurações em arquivo
CONFIG_FILE="$PROJECT_ROOT/.env.$PROJECT_REF"
cat > "$CONFIG_FILE" << EOF
# Configurações do projeto: $NOME_MUNICIPIO
# Gerado em: $(date)

VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_PROJECT_REF=$PROJECT_REF
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=$DATABASE_URL
EOF

print_success "Configurações salvas em: $CONFIG_FILE"
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  Deploy finalizado com sucesso! 🎉${NC}"
echo -e "${BLUE}============================================${NC}"

#!/bin/bash

# =============================================================================
# VAGOU - Script de Deploy para Novo Projeto
# =============================================================================
# Este script automatiza o deploy das Edge Functions e configuração inicial
# 
# USO: ./scripts/deploy-projeto-novo.sh
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    VAGOU - Deploy para Novo Projeto                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# COLETA DE CREDENCIAIS
# =============================================================================
echo -e "${YELLOW}📋 CONFIGURAÇÃO DO PROJETO${NC}"
echo ""

# Project Reference
read -p "Digite o Project Reference (ex: abcdefghijklmnop): " PROJECT_REF
if [ -z "$PROJECT_REF" ]; then
  echo -e "${RED}❌ Project Reference é obrigatório!${NC}"
  exit 1
fi

# Anon Key
read -p "Digite a Anon Key (começa com eyJ...): " ANON_KEY
if [ -z "$ANON_KEY" ]; then
  echo -e "${RED}❌ Anon Key é obrigatória!${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Credenciais recebidas${NC}"
echo "   Project Ref: $PROJECT_REF"
echo "   Anon Key: ${ANON_KEY:0:20}..."
echo ""

# =============================================================================
# ATUALIZAR CONFIG.TOML
# =============================================================================
echo -e "${YELLOW}📝 Atualizando supabase/config.toml...${NC}"

CONFIG_FILE="supabase/config.toml"
if [ -f "$CONFIG_FILE" ]; then
  # Backup do arquivo original
  cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
  
  # Atualiza o project_id
  sed -i.tmp "s/^project_id = .*/project_id = \"$PROJECT_REF\"/" "$CONFIG_FILE"
  rm -f "${CONFIG_FILE}.tmp"
  
  echo -e "${GREEN}✅ config.toml atualizado${NC}"
else
  echo -e "${RED}❌ Arquivo $CONFIG_FILE não encontrado!${NC}"
  exit 1
fi

# =============================================================================
# ATUALIZAR .ENV
# =============================================================================
echo -e "${YELLOW}📝 Atualizando .env...${NC}"

ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
  # Backup
  cp "$ENV_FILE" "${ENV_FILE}.backup"
  
  # Atualiza as variáveis
  sed -i.tmp "s|^VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=https://$PROJECT_REF.supabase.co|" "$ENV_FILE"
  sed -i.tmp "s|^VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|" "$ENV_FILE"
  rm -f "${ENV_FILE}.tmp"
  
  echo -e "${GREEN}✅ .env atualizado${NC}"
else
  # Cria o arquivo se não existir
  echo "VITE_SUPABASE_URL=https://$PROJECT_REF.supabase.co" > "$ENV_FILE"
  echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY" >> "$ENV_FILE"
  echo -e "${GREEN}✅ .env criado${NC}"
fi

# =============================================================================
# LOGIN NO SUPABASE CLI
# =============================================================================
echo ""
echo -e "${YELLOW}🔐 Verificando Supabase CLI...${NC}"

if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npx não encontrado. Instale o Node.js primeiro.${NC}"
  exit 1
fi

echo -e "${BLUE}ℹ️  Se não estiver logado, uma janela do navegador abrirá.${NC}"
echo ""

npx supabase login || {
  echo -e "${RED}❌ Falha no login do Supabase CLI${NC}"
  exit 1
}

echo -e "${GREEN}✅ Login realizado${NC}"

# =============================================================================
# VINCULAR PROJETO
# =============================================================================
echo ""
echo -e "${YELLOW}🔗 Vinculando ao projeto...${NC}"

npx supabase link --project-ref "$PROJECT_REF" || {
  echo -e "${RED}❌ Falha ao vincular projeto${NC}"
  exit 1
}

echo -e "${GREEN}✅ Projeto vinculado${NC}"

# =============================================================================
# DEPLOY DAS EDGE FUNCTIONS
# =============================================================================
echo ""
echo -e "${YELLOW}🚀 Iniciando deploy das Edge Functions...${NC}"
echo ""

# Lista de todas as funções
FUNCTIONS=(
  "admin-usuarios"
  "enviar-contato"
  "enviar-notificacao"
  "gerar-comprovante"
  "gerar-dados-ficticios"
  "gerar-ficha-pdf"
  "get-maps-key"
  "limpar-dados"
  "manifest-pwa"
  "recalcular-fila"
  "registrar-auditoria"
  "send-email"
  "setup-projeto"
  "validar-captcha"
  "verificar-prazos"
)

DEPLOYED=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
  echo -n "   Deploying $func... "
  if npx supabase functions deploy "$func" --no-verify-jwt 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
    ((DEPLOYED++))
  else
    echo -e "${YELLOW}⚠️ (tentando com JWT)${NC}"
    if npx supabase functions deploy "$func" 2>/dev/null; then
      echo -e "   ${GREEN}✅ OK${NC}"
      ((DEPLOYED++))
    else
      echo -e "   ${RED}❌ Falhou${NC}"
      ((FAILED++))
    fi
  fi
done

echo ""
echo -e "${GREEN}✅ Deploy concluído: $DEPLOYED funções${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $FAILED funções falharam${NC}"
fi

# =============================================================================
# INSTRUÇÕES PÓS-DEPLOY
# =============================================================================
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                       PRÓXIMOS PASSOS (MANUAIS)                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}1. 🗄️  EXECUTAR SQL NO BANCO:${NC}"
echo "   Acesse: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "   Execute os scripts na ordem:"
echo "   - scripts/setup/sql/01-setup-estrutura.sql"
echo "   - scripts/setup/sql/02-setup-storage.sql"
echo "   - scripts/setup/sql/03-setup-dados-iniciais.sql"
echo "   - scripts/setup/sql/04-setup-automacao.sql (opcional)"
echo ""

echo -e "${YELLOW}2. 🔑 CONFIGURAR SECRETS:${NC}"
echo "   Acesse: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo "   Adicione os secrets necessários:"
echo "   - RESEND_API_KEY (para envio de emails)"
echo "   - GOOGLE_MAPS_API_KEY (para mapas, opcional)"
echo "   - WEBHOOK_WHATSAPP_SECRET (para WhatsApp, opcional)"
echo ""

echo -e "${YELLOW}3. 👤 CRIAR SUPERADMIN:${NC}"
echo "   a) Crie uma conta pelo sistema (área de cadastro)"
echo "   b) Execute o SQL abaixo no SQL Editor:"
echo ""
echo -e "${BLUE}   -- Substitua pelo email da conta criada"
echo "   UPDATE public.user_roles"
echo "   SET role = 'superadmin'"
echo "   WHERE user_id = ("
echo "     SELECT id FROM auth.users WHERE email = 'SEU_EMAIL@AQUI.COM'"
echo "   );${NC}"
echo ""

echo -e "${YELLOW}4. ⏰ CONFIGURAR CRON JOBS (opcional):${NC}"
echo "   a) Habilite pg_cron: Dashboard > Database > Extensions"
echo "   b) Execute o SQL de cron jobs do script 04"
echo ""

echo -e "${YELLOW}5. 🔐 CONFIGURAR AUTH PROVIDERS (opcional):${NC}"
echo "   Acesse: https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"
echo "   - Habilite Email (já habilitado por padrão)"
echo "   - Configure Google OAuth se desejar"
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                        DEPLOY CONCLUÍDO! 🎉                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "URLs do projeto:"
echo "  Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "  App URL:   https://$PROJECT_REF.supabase.co"
echo ""

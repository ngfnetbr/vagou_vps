#!/bin/bash

# =============================================================================
# VAGOU - Script de Exportação COMPLETA do Supabase
# =============================================================================
# Exporta: Schema, Dados, Storage, Roles, Functions, Triggers, Policies
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Diretório de exportação
EXPORT_DIR="exports/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

# Contadores
TOTAL_EXPORTS=0
SUCCESS_EXPORTS=0
FAILED_EXPORTS=0

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  VAGOU - Exportação Completa do Supabase${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${CYAN}Diretório de exportação: ${EXPORT_DIR}${NC}"
echo ""

# Função para verificar sucesso
check_export() {
    local file=$1
    local description=$2
    TOTAL_EXPORTS=$((TOTAL_EXPORTS + 1))
    
    if [ -f "$file" ] && [ -s "$file" ]; then
        local size=$(wc -c < "$file" | tr -d ' ')
        echo -e "${GREEN}✓${NC} $description (${size} bytes)"
        SUCCESS_EXPORTS=$((SUCCESS_EXPORTS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $description - FALHOU"
        FAILED_EXPORTS=$((FAILED_EXPORTS + 1))
        return 1
    fi
}

# Função para exportar com timeout
export_with_timeout() {
    local cmd=$1
    local output=$2
    local timeout_sec=${3:-120}
    
    timeout $timeout_sec bash -c "$cmd" > "$output" 2>&1 || true
}

# =============================================================================
# 1. SCHEMA COMPLETO (estrutura do banco)
# =============================================================================
echo -e "\n${YELLOW}[1/8] Exportando Schema Completo...${NC}"

npx supabase db dump --schema public > "$EXPORT_DIR/01_schema_public.sql" 2>/dev/null || true
check_export "$EXPORT_DIR/01_schema_public.sql" "Schema público (tabelas, functions, triggers)"

# =============================================================================
# 2. DADOS (conteúdo das tabelas)
# =============================================================================
echo -e "\n${YELLOW}[2/8] Exportando Dados...${NC}"

npx supabase db dump --data-only --schema public > "$EXPORT_DIR/02_data_public.sql" 2>/dev/null || true
check_export "$EXPORT_DIR/02_data_public.sql" "Dados das tabelas públicas"

# =============================================================================
# 3. ROLES E PERMISSÕES
# =============================================================================
echo -e "\n${YELLOW}[3/8] Exportando Roles...${NC}"

npx supabase db dump --role-only > "$EXPORT_DIR/03_roles.sql" 2>/dev/null || true
check_export "$EXPORT_DIR/03_roles.sql" "Roles do banco de dados"

# =============================================================================
# 4. STORAGE (buckets e policies)
# =============================================================================
echo -e "\n${YELLOW}[4/8] Exportando Storage...${NC}"

npx supabase db dump --schema storage > "$EXPORT_DIR/04_storage_schema.sql" 2>/dev/null || true
check_export "$EXPORT_DIR/04_storage_schema.sql" "Schema de Storage (buckets e policies)"

# =============================================================================
# 5. EXTENSIONS
# =============================================================================
echo -e "\n${YELLOW}[5/8] Exportando Extensions...${NC}"

npx supabase db dump --schema extensions > "$EXPORT_DIR/05_extensions.sql" 2>/dev/null || true
check_export "$EXPORT_DIR/05_extensions.sql" "Extensions do PostgreSQL"

# =============================================================================
# 6. AUTH SCHEMA (estrutura, sem dados sensíveis)
# =============================================================================
echo -e "\n${YELLOW}[6/8] Exportando Auth Schema...${NC}"

# Apenas estrutura, não dados de usuários
cat > "$EXPORT_DIR/06_auth_config.md" << 'EOF'
# Configuração de Autenticação

## Providers Configurados
Configure manualmente no Supabase Dashboard:
- Email/Password
- Google OAuth (se aplicável)

## Configurações Recomendadas
- Site URL: URL do seu domínio
- Redirect URLs: URLs permitidas para redirecionamento
- JWT Expiry: 3600 (1 hora)
- Minimum password length: 6

## Tabelas relacionadas a Auth
As tabelas `profiles` e `user_roles` são criadas no schema público
e fazem referência a `auth.users(id)`.
EOF
check_export "$EXPORT_DIR/06_auth_config.md" "Documentação de Auth"

# =============================================================================
# 7. EDGE FUNCTIONS (lista e localização)
# =============================================================================
echo -e "\n${YELLOW}[7/8] Listando Edge Functions...${NC}"

cat > "$EXPORT_DIR/07_edge_functions.md" << EOF
# Edge Functions

As Edge Functions estão no diretório \`supabase/functions/\` do projeto.

## Functions disponíveis:
EOF

if [ -d "supabase/functions" ]; then
    for func in supabase/functions/*/; do
        if [ -d "$func" ]; then
            func_name=$(basename "$func")
            if [ "$func_name" != "_shared" ]; then
                echo "- $func_name" >> "$EXPORT_DIR/07_edge_functions.md"
            fi
        fi
    done
fi

echo "" >> "$EXPORT_DIR/07_edge_functions.md"
echo "## Deploy" >> "$EXPORT_DIR/07_edge_functions.md"
echo '```bash' >> "$EXPORT_DIR/07_edge_functions.md"
echo 'npx supabase functions deploy --project-ref <PROJECT_REF>' >> "$EXPORT_DIR/07_edge_functions.md"
echo '```' >> "$EXPORT_DIR/07_edge_functions.md"

check_export "$EXPORT_DIR/07_edge_functions.md" "Lista de Edge Functions"

# =============================================================================
# 8. SECRETS (apenas nomes, não valores)
# =============================================================================
echo -e "\n${YELLOW}[8/8] Documentando Secrets...${NC}"

cat > "$EXPORT_DIR/08_secrets_required.md" << 'EOF'
# Secrets Necessários

Configure estes secrets no novo projeto Supabase:
Dashboard > Project Settings > Edge Functions > Secrets

## Secrets Obrigatórios:
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (para operações admin)

## Secrets Opcionais (conforme uso):
- `RESEND_API_KEY` - Para envio de e-mails via Resend
- `GOOGLE_MAPS_API_KEY` - Para funcionalidades de mapa
- `WEBHOOK_WHATSAPP_SECRET` - Para integração WhatsApp
- `LOVABLE_API_KEY` - Para integrações Lovable

## Como configurar:
1. Acesse o Dashboard do Supabase
2. Vá em Project Settings > Edge Functions
3. Adicione cada secret com seu valor
EOF

check_export "$EXPORT_DIR/08_secrets_required.md" "Documentação de Secrets"

# =============================================================================
# CRIAR SCRIPT DE IMPORTAÇÃO
# =============================================================================
echo -e "\n${YELLOW}Gerando script de importação...${NC}"

cat > "$EXPORT_DIR/IMPORTAR.sh" << 'IMPORT_SCRIPT'
#!/bin/bash

# =============================================================================
# Script de Importação para Novo Projeto Supabase
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  VAGOU - Importação para Novo Projeto${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Verificar se está linkado a um projeto
if ! npx supabase projects list &>/dev/null; then
    echo -e "${RED}Erro: Faça login no Supabase CLI primeiro${NC}"
    echo "Execute: npx supabase login"
    exit 1
fi

read -p "Digite o PROJECT_REF do novo projeto: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}PROJECT_REF não pode ser vazio${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Linkando ao projeto...${NC}"
npx supabase link --project-ref "$PROJECT_REF"

echo ""
echo -e "${YELLOW}[1/4] Importando Schema...${NC}"
if [ -f "01_schema_public.sql" ]; then
    npx supabase db execute --file 01_schema_public.sql
    echo -e "${GREEN}✓ Schema importado${NC}"
fi

echo ""
echo -e "${YELLOW}[2/4] Importando Storage...${NC}"
if [ -f "04_storage_schema.sql" ]; then
    npx supabase db execute --file 04_storage_schema.sql
    echo -e "${GREEN}✓ Storage importado${NC}"
fi

echo ""
echo -e "${YELLOW}[3/4] Importando Dados...${NC}"
if [ -f "02_data_public.sql" ]; then
    read -p "Deseja importar dados existentes? (s/N): " IMPORT_DATA
    if [ "$IMPORT_DATA" = "s" ] || [ "$IMPORT_DATA" = "S" ]; then
        npx supabase db execute --file 02_data_public.sql
        echo -e "${GREEN}✓ Dados importados${NC}"
    else
        echo -e "${YELLOW}Dados ignorados${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}[4/4] Deploy de Edge Functions...${NC}"
cd ../../
npx supabase functions deploy --project-ref "$PROJECT_REF"
echo -e "${GREEN}✓ Edge Functions deployed${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Importação concluída!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Próximos passos manuais:${NC}"
echo "1. Configure os Secrets (ver 08_secrets_required.md)"
echo "2. Configure Auth Providers no Dashboard"
echo "3. Atualize o .env com as novas credenciais"
IMPORT_SCRIPT

chmod +x "$EXPORT_DIR/IMPORTAR.sh"
check_export "$EXPORT_DIR/IMPORTAR.sh" "Script de importação"

# =============================================================================
# CRIAR README
# =============================================================================
cat > "$EXPORT_DIR/README.md" << EOF
# Exportação VAGOU - $(date +%Y-%m-%d)

## Arquivos Exportados

| Arquivo | Descrição |
|---------|-----------|
| 01_schema_public.sql | Estrutura completa (tabelas, functions, triggers, policies) |
| 02_data_public.sql | Dados das tabelas |
| 03_roles.sql | Roles do PostgreSQL |
| 04_storage_schema.sql | Buckets e policies de storage |
| 05_extensions.sql | Extensions do PostgreSQL |
| 06_auth_config.md | Documentação de autenticação |
| 07_edge_functions.md | Lista de Edge Functions |
| 08_secrets_required.md | Secrets necessários |
| IMPORTAR.sh | Script automatizado de importação |

## Como usar

### Opção 1: Script automático
\`\`\`bash
cd exports/$(basename $EXPORT_DIR)
./IMPORTAR.sh
\`\`\`

### Opção 2: Manual
\`\`\`bash
# 1. Linkar ao novo projeto
npx supabase link --project-ref <PROJECT_REF>

# 2. Importar schema
npx supabase db execute --file 01_schema_public.sql

# 3. Importar storage
npx supabase db execute --file 04_storage_schema.sql

# 4. Importar dados (opcional)
npx supabase db execute --file 02_data_public.sql

# 5. Deploy functions
npx supabase functions deploy
\`\`\`

## Itens que requerem configuração manual
- Secrets das Edge Functions
- Auth Providers (Google, etc.)
- Cron Jobs (pg_cron)
- Arquivos do Storage (se houver)
EOF

check_export "$EXPORT_DIR/README.md" "README com instruções"

# =============================================================================
# RESUMO FINAL
# =============================================================================
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  RESUMO DA EXPORTAÇÃO${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "  Total de exportações: ${TOTAL_EXPORTS}"
echo -e "  ${GREEN}Sucesso: ${SUCCESS_EXPORTS}${NC}"
echo -e "  ${RED}Falhas: ${FAILED_EXPORTS}${NC}"
echo ""
echo -e "  ${CYAN}Arquivos salvos em: ${EXPORT_DIR}${NC}"
echo ""

# Listar arquivos com tamanhos
echo -e "${YELLOW}Arquivos gerados:${NC}"
ls -lh "$EXPORT_DIR" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'

echo ""
if [ $FAILED_EXPORTS -eq 0 ]; then
    echo -e "${GREEN}✓ Exportação completa com sucesso!${NC}"
else
    echo -e "${YELLOW}⚠ Exportação concluída com alguns avisos${NC}"
fi

echo ""
echo -e "${CYAN}Para importar em um novo projeto:${NC}"
echo -e "  cd $EXPORT_DIR"
echo -e "  ./IMPORTAR.sh"
echo ""

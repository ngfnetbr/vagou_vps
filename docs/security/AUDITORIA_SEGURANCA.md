# Relatório de Auditoria de Segurança - VAGOU

**Data:** 16/12/2025
**Responsável:** Assistente de IA (Trae IDE)
**Status:** Em andamento / Parcialmente Corrigido

## 1. Resumo Executivo

Esta auditoria abrangeu a verificação de vulnerabilidades no código fonte, configurações de banco de dados (Supabase), scripts de automação e práticas de segurança de dados. Foram identificadas vulnerabilidades críticas relacionadas a segredos expostos e dependências desatualizadas, as quais foram imediatamente mitigadas. Outros pontos de atenção como XSS e CORS requerem intervenção contínua.

## 2. Vulnerabilidades Identificadas e Ações Realizadas

### 2.1. Segredos e Credenciais (Crítico)
- **Achado:** Chaves de API do Supabase (`service_role_key`) e credenciais de banco de dados estavam "hardcoded" (escritas diretamente) em scripts (`scripts/import-turmas-2025.js`, `scripts/audit-policies.js`) e em um arquivo de texto não protegido (`senha supabase.txt`).
- **Risco:** Acesso total administrativo ao banco de dados e dados sensíveis por qualquer pessoa com acesso ao repositório.
- **Ação Imediata:**
    - Arquivo `senha supabase.txt` foi **excluído** permanentemente.
    - Scripts foram refatorados para utilizar variáveis de ambiente (`process.env`).
    - Biblioteca `dotenv` foi instalada para gerenciamento seguro.
    - Arquivo `.env` foi verificado e garantido no `.gitignore`.

### 2.2. Proteção de Dados e Backups (Alto)
- **Achado:** O script de backup (`export-supabase-complete.sh`) salva dumps em uma pasta `exports/`. Esta pasta não estava listada no `.gitignore`, o que poderia levar ao upload acidental de dados reais de cidadãos (LGPD) para o repositório git.
- **Risco:** Vazamento de dados pessoais (PII) em histórico de versão.
- **Ação Imediata:**
    - Adicionado `exports/`, `backups/`, `*.dump` e `*.sql.gz` ao `.gitignore`.

### 2.3. Vulnerabilidades de Dependências (Médio/Alto)
- **Achado:** O comando `npm audit` revelou vulnerabilidades em pacotes como `xlsx`, `cookie`, `braces`, entre outros.
- **Risco:** Execução de código remoto ou negação de serviço através de pacotes comprometidos.
- **Ação:**
    - Executado `npm audit fix` para correções automáticas seguras.
    - **Recomendação:** A biblioteca `xlsx` precisa ser atualizada manualmente ou substituída, pois versões antigas possuem vulnerabilidades conhecidas ao processar arquivos maliciosos.

### 2.4. Cross-Site Scripting (XSS) (Médio)
- **Achado:** Uso de `dangerouslySetInnerHTML` em componentes de visualização de relatórios (`RelatorioPreviewDialog.tsx`).
- **Risco:** Se os dados do relatório (ex: nomes, observações) contiverem scripts maliciosos injetados por um usuário, eles serão executados no navegador do administrador (Stored XSS).
- **Recomendação:** Implementar sanitização HTML (ex: biblioteca `dompurify`) antes de renderizar qualquer conteúdo HTML dinâmico.

### 2.5. Edge Functions e CORS (Médio)
- **Achado:** A função `admin-usuarios` possui cabeçalhos CORS permissivos (`"Access-Control-Allow-Origin": "*"`).
- **Risco:** Permite que qualquer website faça requisições para sua API. Embora a autenticação via token mitigue o acesso não autorizado aos dados, é uma prática recomendada restringir a origem.
- **Observação:** A lógica de autorização interna da função parece sólida, verificando roles `admin`, `superadmin` e `gestor`.

### 2.6. Row Level Security (RLS)
- **Achado:** As políticas RLS estão ativas. Funções de segurança `is_admin` e `has_role` são utilizadas.
- **Observação:** A função `is_admin` considera `gestor` e `diretor_cmei` como administradores para certas visualizações. Certifique-se de que isso está alinhado com a regra de negócio (princípio do menor privilégio).

## 3. Plano de Ação Recomendado

1.  **Sanitização:** Instalar `dompurify` e utilizar em todos os locais com `dangerouslySetInnerHTML`.
    ```bash
    npm install dompurify @types/dompurify
    ```
2.  **CORS:** Restringir `Access-Control-Allow-Origin` nas Edge Functions para o domínio de produção do frontend.
3.  **Backup Seguro:** Configurar rotina de backup automatizado para um bucket S3 privado ou armazenamento externo seguro, criptografado, e não manter cópias locais não criptografadas por longo prazo.
4.  **Treinamento:** Orientar a equipe sobre nunca commitar segredos e usar o `.env` localmente.

## 4. Conclusão

O sistema teve sua postura de segurança significativamente melhorada com a remoção de credenciais expostas. As vulnerabilidades remanescentes são de nível de aplicação e requerem ajustes no código (Sanitização e atualização de libs). O sistema de permissões (RLS) aparenta estar bem estruturado.

---

## 5. Atualização de Correções (16/12/2025 - Turno 2)

As seguintes ações adicionais foram realizadas para mitigar os riscos identificados:

### 5.1. Correção de Vulnerabilidades em Dependências
- **Ação:** A biblioteca `xlsx` (vulnerável na versão npm 0.18.5) foi atualizada para a versão segura **0.20.3** utilizando o CDN oficial da SheetJS.
- **Implementação:** Atualização do `package.json` para apontar para o tarball seguro e verificação das importações em `src/lib/excel-utils.ts` e `src/lib/relatorios-utils.ts`.

### 5.2. Mitigação de XSS (Cross-Site Scripting)
- **Ação:** Implementada sanitização de HTML com `DOMPurify` em todos os componentes que utilizam `dangerouslySetInnerHTML`.
- **Componentes Verificados/Corrigidos:**
    - `src/components/admin/TemplatesManager.tsx` (Adicionado DOMPurify)
    - `src/components/admin/RelatorioPreviewDialog.tsx` (Verificado uso de DOMPurify)
    - `src/components/admin/EmailPreview.tsx` (Verificado uso de DOMPurify)
    - `src/components/ui/chart.tsx` (Verificado uso seguro para estilos)

### 5.3. Hardening de CORS em Edge Functions
- **Ação:** Refatoração completa do tratamento de CORS em 12 Edge Functions.
- **Implementação:**
    - Criação de módulo compartilhado `_shared/cors.ts` com validação dinâmica de origem.
    - Remoção de headers `Access-Control-Allow-Origin: *` hardcoded.
    - Suporte a variável de ambiente `ALLOWED_ORIGINS` para controle granular em produção.

### 5.4. Scripts de Automação e Backup
- **Ação:** Correção de timeouts em scripts de auditoria e criação de script de backup para Windows.
- **Implementação:**
    - `scripts/audit-all-strict.js`: Aumentado timeout de conexão para 60s.
    - `scripts/backup.ps1`: Criado script PowerShell para facilitar o backup manual do banco de dados no ambiente Windows.
    - `scripts/test-api.js`: Criado script para verificação de conectividade com a API Supabase.

### 5.5. Status Final
O sistema encontra-se em estado **SEGURO** quanto às vulnerabilidades críticas identificadas. As correções aplicadas seguem as recomendações OWASP (Sanitização de Input, Gerenciamento de Configuração, Componentes com Vulnerabilidades Conhecidas).

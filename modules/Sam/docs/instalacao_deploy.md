# 5. Instalação, Configuração e Deploy

## 5.1 Requisitos de Sistema
- **Node.js**: v20 ou superior.
- **Gerenciador de Pacotes**: npm ou yarn.
- **Banco de Dados**: Instância Supabase (PostgreSQL).

## 5.2 Guia de Instalação Local (Desenvolvimento)
1. Clone o repositório.
2. Navegue até a pasta `sam-system`.
3. Execute o script de instalação ou use npm:
   ```bash
   npm install
   ```
4. Configure as variáveis de ambiente no arquivo `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
   ```
5. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 5.3 Configuração do Banco de Dados (Supabase)
1. Crie um novo projeto no Supabase.
2. Execute o conteúdo de `supabase/schema.sql` no Editor SQL.
3. Execute as migrations contidas em `supabase/migrations/` em ordem cronológica.
4. Habilite o Auth (E-mail/Senha).

## 5.4 Guia de Deploy

### Ambiente de Desenvolvimento (Dev)
- Host: Vercel ou local.
- Branch: `develop`.
- Variáveis: Apontando para o projeto Supabase de testes.

### Ambiente de Homologação (Hom)
- Host: Vercel (Preview Deployments).
- Branch: `staging`.
- Objetivo: Validação de PO e usuários chave.

### Ambiente de Produção (Prod)
- Host: Vercel.
- Branch: `main`.
- Requisito: SSL ativo, Backup diário do banco, Variáveis de ambiente de produção.

## 5.5 Scripts Úteis
- `npm run build`: Gera a build de produção.
- `npm run lint`: Verifica erros de estilo e código.
- `start_server.bat`: Script Windows para iniciar o servidor localmente.
- `install.bat`: Script Windows para automação da instalação inicial.

# 🏙️ Guia de Deploy Multi-Instância (VAGOU)

Este guia descreve a estratégia recomendada para gerenciar múltiplas cidades usando o mesmo código base.

## 🧠 A Estratégia

Utilizamos uma abordagem de **Base de Código Única (Single Codebase)** com **Múltiplos Bancos de Dados**.

- **GitHub (Código)**: 1 Repositório único. Todas as melhorias feitas aqui vão para todas as cidades.
- **Supabase (Dados)**: 1 Projeto **por cidade**. Garante isolamento total dos dados (LGPD, segurança).
- **Vercel (Frontend)**: 1 Projeto **por cidade**. Cada um aponta para o mesmo GitHub, mas com variáveis de ambiente diferentes.

---

## 🚀 Passo a Passo para Nova Cidade

### 1. Criar Projeto no Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard).
2. Clique em **New Project**.
   - Se você tem **Supabase Pro**, certifique-se de escolher a organização correta.
3. Nome: `vagou-[nome-da-cidade]` (Ex: `vagou-londrina`).
4. Defina uma senha forte para o banco de dados.
5. Aguarde a criação.

### 2. Executar Script de Deploy (Windows)

Criamos um script automatizado para facilitar o processo no Windows.

1. Abra o PowerShell no diretório do projeto.
2. Execute:
   ```powershell
   ./scripts/deploy/deploy-nova-cidade.ps1
   ```
3. O script irá solicitar:
   - **Project Reference ID** (Encontrado na URL do projeto: `supabase.com/dashboard/project/vnx...`)
   - **Dados da Cidade** (Nome, Secretaria, Email...)
4. O script fará:
   - Link temporário com o projeto.
   - Envio da estrutura do banco (`db push`).
   - Geração de um arquivo SQL com os dados personalizados.

### 3. Inserir Dados e Storage

O script irá gerar um arquivo chamado `deploy_final_[reference_id].sql`.

1. Copie o conteúdo deste arquivo.
2. Vá no **Supabase Dashboard > SQL Editor**.
3. Cole e clique em **RUN**.
   - Isso irá criar os Buckets de Storage e inserir os dados iniciais da cidade.

### 4. Deploy na Vercel

1. Acesse [Vercel Dashboard](https://vercel.com).
2. **Add New Project** > **Import** (o mesmo repositório do Vagou).
3. **Environment Variables**:
   Preencha com os dados do **NOVO** projeto Supabase (Configurações > API):

   | Variável | Valor (Novo Projeto) |
   |----------|----------------------|
   | `VITE_SUPABASE_URL` | URL do Projeto |
   | `VITE_SUPABASE_ANON_KEY` | Anon / Public Key |

4. **Deploy**.

---

## 🔄 Como Atualizar Todas as Cidades?

Quando você fizer uma alteração no código (ex: nova funcionalidade):

1. **Frontend**: O deploy é automático na Vercel para todas as cidades (se configurado com Git).
2. **Banco de Dados**: Se você alterou tabelas, precisa aplicar a migração em cada projeto.
   - **Automático (recomendado)**: ao fazer push/merge na branch `main`, o GitHub roda um workflow que:
     - valida drift de schema por cidade
     - aplica migrations (`supabase db push`)
     - faz deploy das Edge Functions
   - Configuração: veja `docs/SUPABASE_SYNC_SCHEMA.md`.

3. **Edge Functions**: também são publicadas automaticamente pelo mesmo workflow.
  - Alternativa manual (Windows): `./scripts/deploy/deploy-functions.ps1 -ProjectRef [REF_CIDADE]`

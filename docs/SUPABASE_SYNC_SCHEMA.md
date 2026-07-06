## Objetivo

Este repositório mantém o **schema “master”** do Supabase versionado em `supabase/migrations/` e publica automaticamente esse schema para **vários projetos Supabase (municípios)**, sem copiar dados.

## Como funciona

- **Postgres (schema)**: `supabase db push` aplica apenas migrations pendentes (**DDL**). Isso **não copia/espelha dados** entre projetos e não deve conter DML.
- **Edge Functions**: deploy feito a partir de `supabase/functions/**`.
- **Storage**:
  - **Policies**: fazem parte do Postgres (schema `storage`) e vão junto nas migrations (DDL/RLS).
  - **Buckets**: trate como setup por projeto (fora de migrations), para não misturar dados/seed em migrations.

## Secrets necessários no GitHub

Crie estes secrets no repositório do GitHub (Settings → Secrets and variables → Actions):

- **`SUPABASE_ACCESS_TOKEN`**: token do Supabase com acesso à organização/projetos.
- **`SUPABASE_TARGETS_JSON`**: JSON com a lista de municípios (1 item por projeto).

Formato do `SUPABASE_TARGETS_JSON`:

```json
[
  {
    "name": "vagou-londrina",
    "project_ref": "aaaaaaaaaaaaaaaaaaaa",
    "db_password": "SENHA_DO_POSTGRES_DO_PROJETO"
  },
  {
    "name": "vagou-diamante",
    "project_ref": "bbbbbbbbbbbbbbbbbbbb",
    "db_password": "SENHA_DO_POSTGRES_DO_PROJETO"
  }
]
```

## O que acontece no deploy automático

Em cada push para `main`, o workflow:

1. Para cada município, faz `supabase link --project-ref ...`.
2. Aplica migrations com `supabase db push --linked` (DDL-only).
3. Faz deploy de todas as Edge Functions em `supabase/functions/*`.

## Como adicionar uma nova cidade ao deploy automático

1. Crie o projeto no Supabase.
2. Rode o setup inicial (scripts existentes em `docs/GUIA_MULTI_INSTANCIA.md` e `docs/SETUP_NOVO_PROJETO.md`).
3. Adicione um novo item no secret `SUPABASE_TARGETS_JSON` com `name`, `project_ref` e `db_password`.



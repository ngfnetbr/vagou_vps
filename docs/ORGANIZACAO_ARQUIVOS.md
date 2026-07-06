## Organização do repositório (guia)

Este arquivo descreve **onde colocar cada tipo de arquivo** daqui pra frente, sem mudar paths atuais.

### Princípios

- **Schema (estrutura)**: somente em `supabase/migrations/` (DDL-only).
- **Seed (dados de referência)**: somente em `scripts/seed/` (rodar manualmente por município quando necessário).
- **Dados por município (variáveis)**: nunca versionar no Git (ex.: CMEIs/turmas/crianças).
- **Artefatos de teste**: nunca versionar (já ignorados: `playwright-report/`, `test-results/`).

### Pastas principais

- **`supabase/migrations/`**: migrations do schema (DDL-only).
- **`supabase/functions/`**: Edge Functions.
- **`docs/`**: guias e documentação.
- **`scripts/`**: scripts auxiliares (deploy, validação, correções, seed).

### Convenção para scripts

Crie arquivos novos preferencialmente nestas subpastas:

- `scripts/seed/reference/`: dados de referência (configs/cursos/tutoriais) — não inclui CMEIs/turmas/crianças.
- `scripts/seed/municipio/`: seed específico por município (ex.: CMEIs, turmas, brasão).
- `scripts/deploy/`: scripts de deploy (Supabase/Vercel).
- `scripts/verify/`: verificações/diagnósticos.
- `scripts/fixes/`: correções SQL pontuais (performance, RLS, encoding).
- `scripts/tools/`: utilitários (geradores, automações).

Os arquivos antigos permanecem onde estão; a ideia é **padronizar os próximos**.


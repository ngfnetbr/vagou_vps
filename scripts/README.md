## `scripts/` — índice rápido

Este diretório mistura scripts antigos (mantidos) e uma estrutura recomendada para **novos** scripts.

### Onde colocar scripts novos

- **`scripts/seed/reference/`**: seed de dados de referência (configs/cursos/tutoriais).  
  Objetivo: um banco “novo” ficar com todas as **pré-configurações**, sem crianças/CMEIs/turmas.
- **`scripts/seed/municipio/`**: seed específico do município (CMEIs/turmas/crianças NÃO devem estar no master).
- **`scripts/deploy/`**: deploy/automação (ex.: criar nova cidade, deploy functions).
- **`scripts/verify/`**: verificações (ex.: auditoria de políticas, checagem de índices).
- **`scripts/fixes/`**: SQL de correções pontuais (RLS/performance/encoding).
- **`scripts/tools/`**: utilitários (ex.: geradores).
- **`scripts/setup/sql/`**: scripts SQL de setup inicial (quando necessário fora das migrations).

### Arquivos atuais importantes (mantidos onde estão)

- **Seed**:
  - `scripts/seed/seed_turmas_base.sql`
  - `scripts/seed/seed_initial_config_and_sample_cmeis.sql` (ver também a separação recomendada acima)
- **CI checks**:
  - `scripts/ci/check-migrations-ddl-only.mjs`
  - `scripts/ci/check-migrations-unique-versions.mjs`
- **Tools**:
  - `scripts/tools/generate-placeholder-migrations.mjs`
  - `scripts/tools/generate-test-report.mjs`


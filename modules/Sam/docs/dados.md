# 4. Modelo de Dados e Dicionário

## 4.1 Modelo Entidade-Relacionamento (Conceitual)
O banco de dados é hospedado no PostgreSQL (Supabase) e segue uma estrutura relacional normalizada.

### Tabelas Principais
- `profiles`: Extensão da tabela de usuários do Supabase Auth.
- `schools`: Cadastro de instituições de ensino.
- `school_classes`: Turmas vinculadas às escolas.
- `students`: Dados dos alunos.
- `appointments`: Registro de sessões e agendamentos.
- `audit_logs`: Rastro de auditoria.
- `webhook_configs` e `webhook_logs`: Gestão de integrações.

## 4.2 Dicionário de Dados

### Tabela: `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária (referência a `auth.users`). |
| `full_name` | TEXT | Nome completo do usuário. |
| `role` | ENUM | Papel: 'admin', 'professional', 'school_coord'. |
| `specialty` | TEXT | Especialidade (ex: 'Fonoaudiologia'). |
| `school_id` | UUID | FK para `schools` (usado por coordenadores). |
| `permissions`| JSONB | Permissões granulares de acesso. |

### Tabela: `students`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária. |
| `full_name` | TEXT | Nome completo do aluno. |
| `birth_date` | DATE | Data de nascimento. |
| `school_id` | UUID | FK para `schools`. |
| `class_name` | TEXT | Nome da turma/série. |
| `status` | ENUM | 'active', 'waiting', 'finished'. |

### Tabela: `appointments`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária. |
| `student_id` | UUID | FK para `students`. |
| `professional_id`| UUID | FK para `profiles`. |
| `date` | TZ | Data e hora do atendimento. |
| `evolution` | TEXT | Texto descritivo da evolução clínica. |
| `status` | ENUM | 'scheduled', 'completed', 'missed', 'cancelled'. |

## 4.3 Fluxo de Informação
1. **Entrada**: Dados inseridos via formulários Next.js validando com Zod.
2. **Processamento**: Server Actions tratam a lógica e chamam o Supabase SDK.
3. **Persistência**: PostgreSQL armazena com RLS garantindo que apenas usuários autorizados acessem as linhas.
4. **Saída**: Webhooks disparam payloads JSON para sistemas externos.

# Documentação do Sistema de Avisos e Triggers

Este documento detalha o funcionamento das caixas de aviso (alert dialogs), validações e triggers de banco de dados implementados no sistema SAM.

## 1. Interface do Usuário (Frontend)

### Caixas de Aviso (Alert Dialogs)
Implementamos diálogos de confirmação para operações críticas (salvar e excluir) para prevenir ações acidentais.

#### Formulário de Alunos (`src/app/(dashboard)/alunos/student-form.tsx`)

**Confirmação de Salvamento:**
- **Gatilho:** Ao submeter o formulário (botão "Salvar Aluno" ou "Atualizar Aluno").
- **Comportamento:** Intercepta o evento `onSubmit` padrão.
- **Mensagem:** "Tem certeza que deseja [cadastrar este aluno/salvar as alterações]? Verifique se todos os dados estão corretos."
- **Ação:** Só submete o formulário após o usuário clicar em "Confirmar e Salvar".

**Confirmação de Exclusão:**
- **Gatilho:** Botão "Excluir" (ícone de lixeira).
- **Comportamento:** Abre um modal bloqueante.
- **Mensagem:** "Essa ação não pode ser desfeita. O registro do aluno [Nome] será permanentemente removido do sistema, incluindo histórico de atendimentos."
- **Ação:** Executa a server action `deleteStudent` apenas após confirmação explícita.

**Implementação Técnica:**
- Utiliza componentes UI `AlertDialog` (Radix UI).
- Estado controlado via React Hooks (`useState`):
  - `showSaveDialog`: controla visibilidade do diálogo de salvar.
  - `showDeleteDialog`: controla visibilidade do diálogo de excluir.
  - `isConfirmedSave`: flag para permitir o envio do formulário após confirmação.

## 2. Banco de Dados (Backend)

### Triggers de Atualização Automática
Para garantir a integridade dos dados temporais, implementamos triggers que atualizam automaticamente o campo `updated_at` sempre que um registro é modificado.

**Função Trigger:** `update_updated_at_column()`
- **Linguagem:** PL/pgSQL
- **Ação:** Define `NEW.updated_at = NOW()` antes de qualquer update.

**Tabelas Afetadas:**
1.  `students` (Alunos)
2.  `appointments` (Agendamentos)
3.  `school_classes` (Turmas)
4.  `integration_configs` (Configurações de Integração)

### Triggers de Sistema (Outros)
- **Criação de Perfil:** Trigger `on_auth_user_created` na tabela `auth.users` executa a função `handle_new_user()` para criar automaticamente um perfil na tabela `public.profiles` quando um novo usuário se registra.

## 3. Validações de Dados
As validações ocorrem em três níveis para garantir a integridade antes do banco de dados:

1.  **Frontend (Zod + React Hook Form):** Validação imediata de campos obrigatórios e formatos (ex: datas, e-mails).
2.  **Server Actions:** Validação secundária no servidor usando schemas Zod antes de qualquer operação de banco.
3.  **Banco de Dados (Constraints):**
    - `NOT NULL`: Campos obrigatórios.
    - `Foreign Keys`: Integridade referencial (ex: `school_id` deve existir).
    - `RLS (Row Level Security)`: Políticas de segurança que impedem acesso não autorizado.

## 4. Como Testar

### Teste de Confirmação de Salvamento
1.  Acesse `/alunos/novo`.
2.  Preencha o formulário.
3.  Clique em "Salvar Aluno".
4.  **Resultado Esperado:** Um modal deve aparecer pedindo confirmação. O salvamento só ocorre se clicar em "Confirmar".

### Teste de Confirmação de Exclusão
1.  Acesse a edição de um aluno existente.
2.  Clique no botão "Excluir".
3.  **Resultado Esperado:** Um modal de alerta vermelho deve aparecer. O registro só é excluído se confirmar.

### Teste de Triggers (SQL)
Execute uma atualização direta no banco (ex: via Editor SQL do Supabase):
```sql
UPDATE students SET full_name = 'Nome Teste' WHERE id = 'seu-uuid';
```
Verifique se a coluna `updated_at` foi alterada para o horário atual.

---

## 5. APÊNDICE: SQL PARA EXECUÇÃO MANUAL

Se você precisar criar manualmente as triggers mencionadas, copie e execute o código abaixo no Editor SQL do Supabase:

```sql
-- 1. Função para atualizar o timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Trigger para Alunos
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Trigger para Agendamentos
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Trigger para Turmas
DROP TRIGGER IF EXISTS update_school_classes_updated_at ON school_classes;
CREATE TRIGGER update_school_classes_updated_at
    BEFORE UPDATE ON school_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Trigger para Configurações
DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON integration_configs;
CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON integration_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

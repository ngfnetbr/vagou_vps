# 3. Descrição de Módulos e Interfaces

## 3.1 Módulo de Autenticação (`/app/(auth)`)
Responsável pelo acesso seguro ao sistema.
- **Login**: Interface para entrada no sistema com e-mail e senha.
- **Recuperação de Senha**: Fluxo para reset de senha via e-mail (SMTP).
- **Interface**: `AuthForm`, `RecoveryForm`.

## 3.2 Dashboard (`/app/(dashboard)/dashboard`)
Visão geral gerencial do sistema.
- **Gráficos**: Total de atendimentos por período, alunos por status.
- **Cards de Estatísticas**: Alunos ativos, agendamentos hoje, profissionais logados.
- **Tecnologias**: Recharts para visualização de dados.

## 3.3 Gestão de Alunos (`/app/(dashboard)/alunos`)
Módulo central para gerenciamento do público-alvo.
- **Listagem**: Filtros por escola, turma e status.
- **Prontuário**: Histórico completo de atendimentos, documentos e observações.
- **Cadastro/Edição**: Formulário detalhado com validação Zod.

## 3.4 Agenda e Atendimentos (`/app/(dashboard)/agenda` e `/atendimentos`)
Controle temporal das atividades profissionais.
- **Agenda**: Calendário de compromissos.
- **Novo Atendimento**: Registro de evolução, plano de ação e tipo de especialidade.
- **Ações**: Confirmar, cancelar ou remarcar sessões.

## 3.5 Gestão de Escolas e Turmas (`/app/(dashboard)/escolas`)
Estruturação das unidades de ensino.
- **Escolas**: Cadastro de unidades e endereços.
- **Turmas**: Criação de classes vinculadas às escolas.

## 3.6 Administração e Configurações (`/app/(dashboard)/usuarios` e `/configuracoes`)
Controle do sistema e integrações.
- **Usuários**: Gestão de perfis (Admin, Profissional, Coordenador).
- **Configurações**: Integração com Webhooks, SMTP e dados da Instituição.
- **Auditoria**: Visualização de logs de ações do sistema.

## 3.7 Interfaces e Componentes Comuns (`/components`)
- **Layout**: Sidebar lateral, Header com breadcrumbs.
- **UI (Radix)**: Botões, Inputs, Diálogos, Tabelas responsivas.
- **Common**: Botão de impressão, exportação de dados.

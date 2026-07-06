# VAGOU — Documentação Detalhada do Sistema

Este documento descreve, de forma centralizada e prática, o que existe no sistema **VAGOU**, incluindo módulos, telas, funções principais, integrações e estrutura do banco (Supabase/PostgreSQL).

## Sumário

- [Visão geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Arquitetura e organização do repositório](#arquitetura-e-organização-do-repositório)
- [Perfis e permissões (RBAC)](#perfis-e-permissões-rbac)
- [Módulos e telas (rotas do app)](#módulos-e-telas-rotas-do-app)
- [Detalhe das telas (o que cada uma faz)](#detalhe-das-telas-o-que-cada-uma-faz)
- [Fluxos principais do negócio](#fluxos-principais-do-negócio)
- [Banco de dados (Supabase/Postgres)](#banco-de-dados-supabasepostgres)
- [Catálogo de tabelas](#catálogo-de-tabelas)
- [Funções SQL/RPC importantes](#funções-sqlrpc-importantes)
- [Storage (arquivos)](#storage-arquivos)
- [Edge Functions (Supabase)](#edge-functions-supabase)
- [Frontend (padrões e camadas)](#frontend-padrões-e-camadas)
- [Catálogo de hooks (API)](#catálogo-de-hooks-api)
- [Testes e qualidade](#testes-e-qualidade)
- [Execução local e build](#execução-local-e-build)

## Visão geral

O **VAGOU** é um sistema web para **gestão de vagas em CMEIs** (creches municipais), com:

- Portal **público** (inscrição, consulta, fila e ocupação).
- Área do **responsável** (acompanhar crianças, documentos, notificações e mensagens).
- Área **administrativa** (gestão de CMEIs, turmas, fila, matrículas, documentos, relatórios, auditoria e configurações).
- Backend em **Supabase**: Auth + PostgreSQL + RLS + Storage + Edge Functions.

Referências:
- Visão geral: [APRESENTACAO_SISTEMA.md](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/docs/APRESENTACAO_SISTEMA.md)
- Lista resumida de funcionalidades: [FUNCIONALIDADES_SISTEMA.md](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/docs/FUNCIONALIDADES_SISTEMA.md)

## Tecnologias

Principais escolhas técnicas (veja [package.json](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/package.json)):

- **Frontend**: React 18 + TypeScript + Vite.
- **UI**: Tailwind + Radix UI + componentes Shadcn.
- **Roteamento**: React Router.
- **Dados/Cache**: React Query.
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions).
- **PWA**: vite-plugin-pwa + manifest em [public/manifest.json](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/public/manifest.json).
- **Mobile**: Capacitor (config em [capacitor.config.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/capacitor.config.ts)).
- **Testes**: Vitest (unit) + Playwright (e2e).
- **Observabilidade** (opcional): Vercel Speed Insights (flag em [App.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/App.tsx#L73-L90)).

## Arquitetura e organização do repositório

Guia de pastas (ver também [ORGANIZACAO_ARQUIVOS.md](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/docs/ORGANIZACAO_ARQUIVOS.md)):

- `src/`
  - `pages/`: páginas (telas) por área (publico/auth/admin/responsavel).
  - `components/`: componentes reutilizáveis e dialogs (muitos da área admin e chat).
  - `hooks/api/`: “camada de acesso” ao Supabase (queries/mutations via React Query).
  - `integrations/supabase/`: cliente e types do Supabase ([client.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/integrations/supabase/client.ts)).
  - `contexts/`: contexto de autenticação e dados do usuário ([AuthContext.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/contexts/AuthContext.tsx)).
  - `utils/`: utilitários (ex.: retry policy do React Query).
- `supabase/`
  - `migrations/`: schema do banco (DDL) e evoluções.
  - `functions/`: Edge Functions (Deno).
  - `config.toml`: configuração local do Supabase CLI (quando usado).
- `scripts/`
  - `deploy/`: deploy automatizado e rotinas por município.
  - `verify/`: scripts de verificação e auditoria de políticas/índices/lógica.
  - `fixes/`: correções SQL (performance, RLS, encoding etc.).
  - `seed/`: seeds (referência e/ou por município).
- `docs/`: documentação, guias e relatórios.

## Perfis e permissões (RBAC)

O sistema utiliza **roles** (papéis) e validações via RLS no banco + proteção de rotas no frontend.

Roles (enum `app_role` no banco):
- `responsavel`
- `diretor_cmei`
- `gestor`
- `admin`
- `superadmin`

Fonte:
- Enum `app_role` em [20251202001850…sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L8-L23)
- Carregamento de roles no app em [AuthContext.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/contexts/AuthContext.tsx#L43-L59)

Como o app usa as roles:
- A autenticação é Supabase Auth (session + user).
- As roles são carregadas da tabela `user_roles`.
- O app define “admin” como qualquer uma destas roles: `admin`, `superadmin`, `gestor`, `diretor_cmei` ([AuthContext.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/contexts/AuthContext.tsx#L249-L253)).
- Rotas administrativas são protegidas via [ProtectedRoute](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/App.tsx#L122-L335).

## Módulos e telas (rotas do app)

As rotas oficiais do sistema estão concentradas em [App.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/App.tsx).

### Portal público

Rotas:
- `/` → redirecionamento inteligente (token/hash e role) em [RootRedirect](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/App.tsx#L98-L113)
- `/publico` → Home pública
- `/publico/inscricao` → Inscrição
- `/publico/fila` → Fila pública
- `/publico/ocupacao` → Ocupação por CMEI
- `/publico/consulta` → Consulta por CPF do responsável
- `/publico/contato` → Contato
- `/publico/termos` → Termos de uso
- `/publico/privacidade` → Privacidade/LGPD
- `/publico/download` e `/download` → Download/instalação do app

Páginas:
- `src/pages/public/*` (ex.: [PublicHome](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/PublicHome.tsx), [Inscricao](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/Inscricao.tsx))

### Autenticação

Rotas:
- `/auth/login` → Login
- `/auth/cadastro` → Cadastro
- `/auth/recuperar-senha` → Recuperar senha
- `/auth/redefinir-senha` → Redefinir senha
- `/auth/redirect` → callback/redirect do auth
- `/auth/completar-cadastro` → completar dados após login social ou fluxo especial

Páginas:
- `src/pages/auth/*` (ex.: [Login](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/Login.tsx))

### Área administrativa

Rotas principais (todas protegidas por `requireAdmin`):
- `/admin` → Dashboard
- `/admin/cmeis` → Gestão de CMEIs
- `/admin/turmas` → Gestão de turmas
- `/admin/turmas/:id` → Detalhes da turma
- `/admin/fila` → Gestão da fila de espera
- `/admin/criancas` → Gestão de crianças
- `/admin/criancas/:id` → Detalhes da criança
- `/admin/matriculas` → Matrículas ativas (derivadas do status da criança)
- `/admin/matriculas/:id` → Detalhes da matrícula/criança
- `/admin/relatorios` → Relatórios
- `/admin/bi` → BI (dashboards e análises)
- `/admin/ocupacao` → Ocupação (visão administrativa)
- `/admin/transicao` e `/admin/transicoes` → Transição anual
- `/admin/logs` → Logs
- `/admin/auditoria` → Auditoria
- `/admin/documentos` → Validação de documentos
- `/admin/tutorial` → Gestão de tutorial (guias)
- `/admin/usuarios` → Usuários e permissões
- `/admin/mensagens` → Mensagens (modelo/automação/status)
- `/admin/diretor` → Dashboard do diretor
- `/admin/cursos` e `/admin/cursos/:cursoId` → Cursos/treinamento (admin)

Páginas:
- `src/pages/admin/*` (ex.: [Dashboard](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Dashboard.tsx))

### Área do responsável

Rotas (todas protegidas por `requiredRole="responsavel"`):
- `/responsavel` → Dashboard do responsável
- `/responsavel/inscricao` → Nova inscrição logada
- `/responsavel/documentos` → Documentos pendentes / upload
- `/responsavel/fila` → Fila (visão do responsável)
- `/responsavel/ocupacao` → Ocupação (visão do responsável)
- `/responsavel/perfil` → Perfil do responsável
- `/responsavel/notificacoes` → Histórico de notificações
- `/responsavel/mensagens` → Mensagens/chat

Páginas:
- `src/pages/responsavel/*` (ex.: [Dashboard](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Dashboard.tsx))

## Detalhe das telas (o que cada uma faz)

Este bloco descreve a intenção de cada tela, agrupada por área.

### Público (`/publico/*`)

- Home pública ([PublicHome.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/PublicHome.tsx))
  - Entrada do cidadão no sistema: cards para inscrição/consulta/fila/ocupação, explicação de como funciona e links institucionais.
- Inscrição ([Inscricao.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/Inscricao.tsx))
  - Formulário público com validações; grava uma nova criança/inscrição (tabela `criancas`) e, quando configurado, salva campos customizados.
- Fila pública ([Fila.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/Fila.tsx))
  - Visualização pública de fila/posição (normalmente via função SQL “get_fila_publica” ou leitura controlada com RLS).
- Ocupação pública ([Ocupacao.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/Ocupacao.tsx))
  - Capacidade x ocupação por CMEI e/ou turmas (via funções SQL de ocupação).
- Consulta por CPF ([ConsultaCPF.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/ConsultaCPF.tsx))
  - Retorna inscrições associadas ao CPF (geralmente via RPC de consulta pública).
- Contato ([Contato.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/Contato.tsx))
  - Formulário para dúvidas/sugestões, com envio para rotina server-side (Edge Function).
- Termos / Privacidade LGPD ([TermosUso.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/TermosUso.tsx), [PrivacidadeLGPD.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/PrivacidadeLGPD.tsx))
  - Textos legais e políticas de privacidade.
- Download do app ([DownloadApp.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/public/DownloadApp.tsx))
  - Orienta instalação PWA e/ou build mobile (Capacitor).

### Autenticação (`/auth/*`)

- Login ([Login.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/Login.tsx))
  - Sessão Supabase e redirecionamento conforme role.
- Cadastro ([Cadastro.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/Cadastro.tsx))
  - Criação de usuário responsável e preenchimento de dados essenciais (nome/CPF/telefone).
- Recuperar/Redefinir senha ([RecuperarSenha.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/RecuperarSenha.tsx), [RedefinirSenha.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/RedefinirSenha.tsx))
  - Fluxo de recuperação e atualização de senha.
- Auth redirect / completar cadastro ([AuthRedirect.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/AuthRedirect.tsx), [CompletarCadastro.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/auth/CompletarCadastro.tsx))
  - Tratamento de callback e complementação de dados quando necessário.

### Admin (`/admin/*`)

- Dashboard ([Dashboard.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Dashboard.tsx))
  - Visão geral: indicadores, status do sistema e atalhos para módulos críticos.
- CMEIs ([CMEIs.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/CMEIs.tsx))
  - CRUD de CMEIs, ativação/desativação, vinculação de zonas (quando habilitado).
- Turmas e detalhes ([Turmas.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Turmas.tsx), [TurmaDetalhes.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/TurmaDetalhes.tsx))
  - Cadastro de turmas por CMEI (capacidade, turno, turma_base) e acompanhamento de ocupação por turma.
- Fila de espera ([FilaEspera.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/FilaEspera.tsx))
  - Gestão operacional: filtros, convocação, movimentações, aplicação de prioridades e correções.
- Crianças e detalhes ([Criancas.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Criancas.tsx), [CriancaDetalhes.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/CriancaDetalhes.tsx))
  - Visualização e edição completa do registro mestre (`criancas`) + histórico de mudanças.
- Matrículas e detalhes ([Matriculas.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Matriculas.tsx), [MatriculasDetalhes.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/MatriculasDetalhes.tsx))
  - Leitura de matrículas ativas derivadas do status da criança + ações (transferência, trancamento, realocação etc. quando habilitado).
- Validação de documentos ([ValidacaoDocumentos.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/ValidacaoDocumentos.tsx))
  - Aprovar/recusar documentos por tipo, com rastreabilidade.
- Configurações ([Configuracoes.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Configuracoes.tsx))
  - Parâmetros globais do município e do sistema (identidade visual, prazos, regras, integrações).
- Relatórios ([Relatorios.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Relatorios.tsx))
  - Extração de dados (CSV/XLSX/PDF) para auditoria e gestão.
- BI ([BI.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/BI.tsx))
  - Consultas agregadas e gráficos de demanda, status e indicadores (via funções SQL `bi_*` e/ou queries).
- Ocupação (admin) ([Ocupacao.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Ocupacao.tsx))
  - Visão gerencial de ocupação por CMEI e turmas, com mais detalhes do que a tela pública.
- Transição anual ([TransicaoAnual.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/TransicaoAnual.tsx))
  - Planejamento e aplicação de mudanças em lote (concluintes, realocação, encerramentos).
- Logs e auditoria ([Logs.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Logs.tsx), [Auditoria.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Auditoria.tsx))
  - Logs de notificações e trilha de auditoria técnica/operacional.
- Usuários ([Usuarios.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Usuarios.tsx))
  - Gestão de usuários, roles, permissões e vínculos de diretor.
- Mensagens ([Mensagens.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Mensagens.tsx))
  - Configuração de templates e status customizáveis de comunicação.
- Tutorial ([Tutorial.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Tutorial.tsx))
  - Editor/organização de seções, dicas, FAQ e vídeos do tutorial interno.
- Cursos (admin) ([Cursos.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Cursos.tsx), [Curso.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/Curso.tsx))
  - Gestão de cursos/aulas para treinamento.
- Dashboard do diretor ([DiretorDashboard.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/DiretorDashboard.tsx))
  - Visões e recortes operacionais limitados ao(s) CMEI(s) vinculados.

### Responsável (`/responsavel/*`)

- Dashboard ([Dashboard.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Dashboard.tsx))
  - Painel com as crianças vinculadas ao CPF do perfil e seus status (fila, convocação, matrícula).
- Nova inscrição ([NovaInscricao.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/NovaInscricao.tsx))
  - Mesmo objetivo do público, porém usando sessão do responsável para vínculo automático.
- Documentos ([Documentos.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Documentos.tsx))
  - Upload/reenvio de documentos por criança; acompanha aprovação/recusa.
- Fila ([FilaEspera.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/FilaEspera.tsx))
  - Consulta orientada ao responsável: posição, prazos e alertas de convocação.
- Ocupação ([Ocupacao.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Ocupacao.tsx))
  - Mesma intenção da pública, com contexto da conta (quando aplicável).
- Perfil ([Perfil.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Perfil.tsx))
  - Atualização de dados do perfil e preferências do usuário.
- Histórico de notificações ([HistoricoNotificacoes.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/HistoricoNotificacoes.tsx))
  - Lista de notificações enviadas/registradas relacionadas ao CPF/usuário.
- Mensagens ([Mensagens.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Mensagens.tsx))
  - Canal de mensagens/chat (quando habilitado).
- Cursos (responsável) ([Cursos.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Cursos.tsx), [Curso.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/responsavel/Curso.tsx))
  - Consumo de conteúdo de treinamento/aulas e registro de progresso.

## Fluxos principais do negócio

### 1) Inscrição (criança entra na fila)

Resultado esperado:
- Uma criança é registrada na tabela `criancas` com `status = 'Fila de Espera'`.
- Preferências de CMEI e dados do responsável ficam vinculados ao registro.
- Se existir “configuração de campos” ativa, a inscrição pode coletar campos extras.

Base técnica:
- Tabela `criancas` é o “registro mestre” da fila/matrícula ([criancas DDL](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L190-L250)).
- Campos customizáveis: `campos_inscricao` + `valores_campos_custom` ([migração](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251204154623_7852db62-765a-4005-a176-641eaee96458.sql#L218-L315)).

### 2) Ordenação/posicionamento de fila

Elementos que influenciam:
- Prioridade (`prioridade_tipo`) e “tipos/pesos” cadastráveis.
- Programas sociais e critérios configuráveis.
- Zonas de atendimento e CEP (quando habilitado).

Base técnica:
- Enum `prioridade_tipo` e `status_crianca` em [20251202001850…sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L25-L47).
- Tabelas: `tipos_prioridade`, `crianca_prioridades`, `zonas_atendimento`, `cmei_zonas` ([migração](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251204154623_7852db62-765a-4005-a176-641eaee96458.sql)).

### 3) Convocação e prazo

Resultado esperado:
- A criança muda de status (ex.: “Convocado”) e recebe deadline (`convocacao_deadline`) e data (`data_convocacao`).
- Notificações podem ser registradas e/ou disparadas por Edge Function.

Base técnica:
- Campos de convocação na tabela `criancas` ([criancas DDL](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L233-L241)).
- Log de notificações: `notificacoes_log` ([migração](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202032240_c96161c9-9aa3-47c8-b779-ec4a30994e6e.sql)).
- Envio por função: `enviar-notificacao` ([index.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/functions/enviar-notificacao/index.ts)).

### 4) Matrícula ativa, remanejamento e encerramento

No sistema atual, “matrícula” é uma leitura do registro `criancas`:
- Matrículas ativas são **crianças** com status em: `Matriculado`, `Matriculada`, `Convocado`, `Remanejamento Solicitado` (ver [matriculas-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/matriculas-hooks.ts#L14-L21)).
- A turma atual e o CMEI atual ficam em `criancas.turma_atual_id` e `criancas.cmei_atual_id`.
- Remanejamento usa `criancas.cmei_remanejamento_id` + justificativa e/ou status.

Encerramentos e transições:
- Toda mudança relevante gera registro em `historico` (ações, status anterior/novo, mudanças de CMEI/turma).
- Auditoria técnica centralizada em `auditoria`.

## Banco de dados (Supabase/Postgres)

### Visão geral do modelo

O banco roda em **PostgreSQL** dentro do Supabase e usa:
- RLS (Row Level Security) nas tabelas de domínio.
- `auth.users` do Supabase como fonte de identidade.
- Tabelas auxiliares para RBAC, preferências e conteúdos (tutoriais/cursos).

Migração base (estrutura principal):
- [20251202001850…sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql)

### Tabelas centrais (domínio)

- `criancas` (registro mestre: inscrição + fila + convocação + matrícula)
  - Dados da criança e do responsável
  - Preferências de CMEI
  - Status/posição/prioridade
  - CMEI/Turma atual
  - Campos de convocação e penalidades/remanejamento
  - Base: [DDL criancas](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L190-L250)

- `cmeis` (unidades)
  - Cadastro, endereço, contatos, capacidade e status de ativo

- `turmas` (turmas por CMEI)
  - `turma_base`, capacidade, turno e faixa etária

- `turmas_base` (base parametrizável de turmas)
  - Tipos/nomes de turmas “padrão” por idade e regras
  - Base: [migração turmas_base](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202032803_e3b54a03-681a-4c7f-a015-975874c80b5c.sql)

- `historico` (registro funcional/auditável do fluxo)
  - Ações (convocação, desistência, transição etc.), justificativas, status anterior/novo
  - Base: [DDL historico](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L281-L322)

- `auditoria` (audit trail técnico)
  - Captura mudanças e metadados (usuário, ip/user-agent)
  - Base: [DDL auditoria](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202001850_be025498-4a4b-4bc7-9c6a-72442ac23fa2.sql#L324-L347)

### Usuários, perfis e permissões

- `profiles`
  - Perfil do usuário (nome/cpf/telefone e dados de interface)
- `user_roles`
  - N:N entre usuários e roles
- `permissoes` e `role_permissoes`
  - Permissões granulares por role (regras do “Permission Gate” no frontend)
- `diretor_cmei_vinculo`
  - Vincula diretores a CMEIs (escopo de acesso)

Criação/rotina:
- Migração de permissões: [permissoes/role_permissoes](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251203034243_f43ef7c4-618f-496e-b980-fed585ae637b.sql)
- Tabela user_roles: [20251202003517…sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202003517_db63629c-ded6-4cf3-87e9-b650bc76ef9c.sql)

### Documentos e validação

- `documentos_tipos` (quais documentos existem e regras)
- `documentos_crianca` (arquivos e status por criança)

Base:
- [20251202190614…sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251202190614_9b97c61a-1f82-4da9-b663-c68436bd88ef.sql)

### Configurações do sistema e personalização

- `configuracoes_sistema`
  - Nome/identidade visual do município, regras operacionais e parâmetros globais
- `user_preferences`
  - Preferências de interface por usuário (tema, filtros, etc.)
- `campos_inscricao` + `campos_inscricao_historico` + `valores_campos_custom`
  - Definição/versionamento de campos do formulário e valores por criança

### Mensageria/Chat e templates

Chat (suporte/comunicação):
- `chat_conversas_config`
- `chat_mensagens`
- `chat_marcadores`, `chat_conversa_marcadores`
- `chat_respostas_rapidas`

Templates e status:
- `templates_mensagens`
- `mensagens_status_custom`
- `templates_email` (quando aplicável para e-mail)

### Operação: prazos, feriados, zonas e motivos

- `feriados_municipais` (para cálculo de prazo em dias úteis, quando habilitado)
- `motivos_padrao` (motivos padronizados: recusa, desistência, etc.)
- `zonas_atendimento` e `cmei_zonas` (regras por CEP/área)

Base:
- [migração 20251204154623…sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20251204154623_7852db62-765a-4005-a176-641eaee96458.sql)

### Conteúdos: tutorial e treinamento

Tutoriais (admin):
- `tutoriais_videos`
- `tutorial_secoes`
- `tutorial_faq`
- `tutorial_dicas`

Cursos:
- `cursos`
- `aulas`
- `aulas_progresso`

Módulos:
- `modulos` (catálogo/organização de módulos)

### Logs de notificação

- `notificacoes_log`
  - Registro de envios e status (para rastrear automações e auditoria de comunicação)

## Catálogo de tabelas

Tabela (ou conjunto) → finalidade principal:

| Tabela | Finalidade |
|---|---|
| `profiles` | Perfil do usuário (nome/CPF/telefone/avatar) vinculado a `auth.users`. |
| `user_roles` | Roles do usuário (RBAC) — permite múltiplas roles por usuário. |
| `permissoes` / `role_permissoes` | Permissões granulares por role (controle fino por módulo/ação). |
| `diretor_cmei_vinculo` | Escopo do diretor (quais CMEIs ele administra). |
| `configuracoes_sistema` | Configurações globais do município/sistema (identidade visual, regras, integrações). |
| `cmeis` | Cadastro de unidades (CMEIs). |
| `turmas` | Cadastro de turmas por CMEI (capacidade, turno, turma_base). |
| `turmas_base` | Catálogo de turmas base (faixa etária/regras) usado para padronização. |
| `criancas` | Registro mestre: inscrição + fila + convocação + matrícula + remanejamento. |
| `historico` | Log funcional por criança (ações e mudanças de status/CMEI/turma). |
| `auditoria` | Audit trail técnico (operações e diffs). |
| `documentos_tipos` | Tipos de documento (regras, obrigatoriedade). |
| `documentos_crianca` | Arquivos por criança + status de validação. |
| `campos_inscricao` | Definição de campos do formulário (customização). |
| `campos_inscricao_historico` | Versionamento/histórico de alterações nos campos configuráveis. |
| `valores_campos_custom` | Valores dos campos customizados por criança. |
| `tipos_prioridade` | Catálogo de prioridades e pesos/regras (fila). |
| `crianca_prioridades` | Prioridades atribuídas à criança (comprovadas/pendentes conforme regra). |
| `zonas_atendimento` | Zonas/áreas (CEP/faixas) para regras geográficas. |
| `cmei_zonas` | N:N entre CMEIs e zonas de atendimento. |
| `feriados_municipais` | Datas para regras de prazo (dias úteis). |
| `motivos_padrao` | Catálogo de motivos (recusa, desistência, transferências etc.). |
| `user_preferences` | Preferências do usuário (UI/UX). |
| `notificacoes_log` | Registro de notificações enviadas/tentativas/status. |
| `templates_mensagens` | Templates de comunicação (e-mail/SMS/WhatsApp) por tipo. |
| `mensagens_status_custom` | Status customizáveis de mensageria (para operação/monitoramento). |
| `chat_conversas_config` | Configuração de conversas/canais do chat. |
| `chat_mensagens` | Mensagens do chat (texto/mídia/metadata). |
| `chat_marcadores` | Tags/marcadores configuráveis. |
| `chat_conversa_marcadores` | N:N entre conversas e marcadores. |
| `chat_respostas_rapidas` | Respostas rápidas (templates curtos) para operação. |
| `planejamento_transicao` | Dados de planejamento da transição anual. |
| `tutoriais_videos` | Vídeos de tutorial. |
| `tutorial_secoes` | Seções do tutorial. |
| `tutorial_faq` | FAQ do tutorial. |
| `tutorial_dicas` | Dicas do tutorial (ex.: onboarding/joyride). |
| `cursos` | Cursos de treinamento. |
| `aulas` | Aulas de um curso. |
| `aulas_progresso` | Progresso por usuário/aula. |
| `modulos` | Catálogo/organização de módulos (ex.: habilitar/mostrar itens). |

Observação:
- Existe um script de setup alternativo que cria `templates_email` (ver [scripts/01-setup-estrutura.sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/scripts/01-setup-estrutura.sql)), mas o modelo principal de templates usado nas rotinas atuais é `templates_mensagens`.

## Funções SQL/RPC importantes

Estas funções (Postgres) são chamadas pelo app e/ou por rotinas de automação. Elas ficam versionadas em `supabase/migrations/` e evoluem ao longo do tempo (muitas aparecem em múltiplas migrações por serem “redefinidas”).

### Inscrição e consultas públicas

- `inserir_inscricao_publica(...)`: faz inserção de inscrição com validações/normalizações (usada no portal público).
- `verificar_duplicidade_inscricao(...)`: checa inscrições repetidas por critérios (CPF/dados).
- `consulta_publica_por_cpf(p_cpf text)`: retorna inscrições do CPF para a tela pública de consulta.
- `consulta_publica_por_protocolo(p_protocolo text)`: consulta por protocolo (quando habilitado).
- `gerar_protocolo_inscricao()`: geração de protocolo de inscrição.
- `get_public_configuracoes()`: expõe configurações públicas necessárias ao portal (sem dados sensíveis).

### Fila e ocupação

- `recalcular_posicoes_fila()`: recalcula pontuação/ordem e atualiza posições.
- `trigger_atualizar_posicao_fila()` / `trigger_recalcular_fila()`: funções usadas por triggers para manter fila atualizada.
- `get_fila_publica()`: fonte “segura” para exibir fila pública.
- `get_historico_fila_publico()`: histórico agregado para página pública.
- `get_ocupacao_cmeis()` / `get_ocupacao_turmas()`: retornos agregados para ocupação (público/admin).
- `simular_fila_cmei(...)`: simulação de fila por CMEI (quando habilitado em BI/relatórios).

### Segurança (RBAC) e escopo

- `has_role(_user_id, _role)` e `is_admin(_user_id)`: helpers de role.
- `has_permission(_user_id, _permission_code)`: checagem de permissão granular.
- `get_user_cmei_ids(_user_id)` / `director_has_cmei_access(_user_id, _cmei_id)`: escopo do diretor.
- `link_children_by_cpf(_user_id, _cpf)`: vincula crianças existentes ao responsável pelo CPF (chamado no login/cadastro pelo [AuthContext.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/contexts/AuthContext.tsx#L83-L110)).

### Auditoria e rastreabilidade

- `audit_trigger_function()`: função de trigger para auditoria de alterações.
- `registrar_auditoria(...)`: endpoint SQL para registrar auditoria (quando usado por integrações/Edge Functions).
- `log_movimentacao_fila()`: auditoria específica de movimentações na fila (quando habilitado).

### BI (funções `bi_*`)

As telas de BI usam funções agregadoras, por exemplo:
- `bi_filtrar_criancas(...)`
- `bi_get_novas_inscricoes_mensal(...)`
- `bi_get_status_distribuicao(...)`
- `bi_get_demanda_por_*` (bairro/turno/zona/cmei)
- `bi_get_media_dias_fila_por_cmei(...)`
- `bi_get_convocados_por_cmei(...)`

Base:
- Funções BI na migração [20260407000000_bi_module_revamp.sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20260407000000_bi_module_revamp.sql)

## Storage (arquivos)

O sistema usa Supabase Storage para armazenar anexos (principalmente documentação da criança, mídia do chat e assets do município como brasão/logo).

Onde olhar:
- Setup/Storage e políticas ficam em `scripts/setup/sql/02-setup-storage.sql` e/ou migrações específicas.
- Upload/preview no frontend está concentrado em componentes e hooks de documentos/chat (ex.: `src/components/admin/DocumentosDialog.tsx`, `src/components/admin/ChatMediaUpload.tsx`).

## Edge Functions (Supabase)

As Edge Functions ficam em `supabase/functions/` e executam lógica “server-side” (Deno), como envio de e-mail, validação de captcha, geração de documentos e rotinas de manutenção.

Lista (por pasta):
- `enviar-notificacao`: dispara notificações e monta mensagens usando templates ([enviar-notificacao/index.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/functions/enviar-notificacao/index.ts)).
- `validar-captcha`: valida captcha (Recaptcha/HCaptcha conforme configuração).
- `recuperar-senha`: auxilia fluxo de recuperação.
- `gerar-comprovante` / `gerar-ficha-pdf`: geração de PDFs.
- `recalcular-fila`: recomputa fila/posições conforme regras.
- `verificar-prazos`: rotina para identificar prazos vencidos e acionar ações.
- `registrar-auditoria`: grava eventos de auditoria (quando usado por webhooks/integrações).
- `admin-usuarios`: operações administrativas de usuários.
- `enviar-contato`: recebe formulário de contato e encaminha.
- `get-maps-key`: entrega key (com segurança) quando necessário.
- `limpar-dados`: limpeza controlada (ambientes de teste/implantação).
- `manifest-pwa`: ajuda a servir/atualizar manifest, quando usado.
- `setup-projeto`: automações de setup.
- `send-email`: envio genérico de e-mail (infra).

Compartilhados:
- Utilitários comuns em `supabase/functions/_shared/` (CORS, rate limit, templates e e-mail).

## Frontend (padrões e camadas)

### Camada de dados

O padrão principal é:
- **Hooks** em `src/hooks/api/*` encapsulam consultas/mutações no Supabase usando **React Query**.
- O cliente Supabase tipado é criado em [client.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/integrations/supabase/client.ts).
- Tipos do banco ficam em `src/integrations/supabase/types.ts` e são usados para enums (ex.: status da criança).

Exemplo concreto:
- Matrículas ativas são listadas via `criancas` filtrando por status em [useMatriculas](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/matriculas-hooks.ts#L31-L106).

### Autenticação e sessão

- Contexto central: [AuthContext.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/contexts/AuthContext.tsx)
- O app carrega roles (`user_roles`) e perfil (`profiles`) e mantém sessão persistida no `localStorage`.
- O app também tenta vincular crianças existentes ao responsável usando RPC (`link_children_by_cpf`) após carregar o CPF do perfil.

### Componentes e layouts

Blocos importantes:
- `src/components/common/ProtectedRoute.tsx`: proteção de rotas por role/permissão.
- `src/components/admin/AdminLayout.tsx`: layout admin (menu lateral e navegação).
- `src/components/responsavel/ResponsavelLayout.tsx`: layout do responsável.
- `src/components/layout/PublicLayout.tsx` + header/footer: layout público.
- `src/components/admin/chat/*`: componentes do chat (filtros, bolhas, marcadores, uploads etc.).

## Catálogo de hooks (API)

Os hooks em `src/hooks/api/` centralizam acesso ao Supabase (selects, RPCs, inserts/updates), padronizam cache e revalidação e simplificam as páginas.

Principais grupos:

- Núcleo (admin/responsável)
  - [criancas-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/criancas-hooks.ts): lista/filtra crianças, ações operacionais e consultas de detalhe.
  - [matriculas-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/matriculas-hooks.ts): “matrículas” como recorte de `criancas` por status + histórico de encerramentos.
  - [dashboard-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/dashboard-hooks.ts): números/indicadores do dashboard.
  - [admin-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/admin-hooks.ts): operações administrativas comuns (CMEIs, turmas, fila).
  - [responsavel-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/responsavel-hooks.ts): dados do painel do responsável e ações (inscrição/matrícula/documentos).

- Configuração e parametrização
  - [configuracoes-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/configuracoes-hooks.ts): leitura/atualização de `configuracoes_sistema`.
  - [campos-inscricao-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/campos-inscricao-hooks.ts): CRUD e versionamento de campos customizáveis.
  - [prioridades-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/prioridades-hooks.ts): regras e cadastro de prioridades/pesos.
  - [zonas-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/zonas-hooks.ts): zonas de atendimento e vínculo com CMEIs.
  - [templates-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/templates-hooks.ts): templates de comunicação e respostas rápidas.
  - [modo-operacao-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/modo-operacao-hooks.ts): flags de operação/manutenção (quando habilitado).

- Documentos e notificações
  - [documentos-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/documentos-hooks.ts): tipos de documento e uploads/status por criança.
  - [notificacoes-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/notificacoes-hooks.ts): listagem e ações de notificação.
  - [notificacoes-stats-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/notificacoes-stats-hooks.ts): métricas agregadas para monitoramento.
  - [auditoria-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/auditoria-hooks.ts): consulta de auditoria.

- Mensagens/chat
  - [chat-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/chat-hooks.ts): conversas, mensagens, leitura e filtros.
  - [chat-config-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/chat-config-hooks.ts): configuração do chat, marcadores e respostas rápidas.

- BI, relatórios e processos em lote
  - [bi-filters.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/bi-filters.ts): filtros/normalizações do BI.
  - [transicao-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/transicao-hooks.ts): planejamento e aplicação da transição anual.
  - [import-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/import-hooks.ts): rotinas de importação/seed assistido (quando habilitado).

- Usuários e permissões
  - [usuarios-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/usuarios-hooks.ts): gestão de usuários/roles.
  - [permissoes-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/permissoes-hooks.ts): leitura/edição de permissões granulares.
  - [diretor-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/diretor-hooks.ts): operações específicas do diretor.

- Conteúdo (tutorial/cursos)
  - [tutoriais-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/tutoriais-hooks.ts): tutorial (seções, FAQ, dicas, vídeos).
  - [cursos-hooks.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/cursos-hooks.ts): cursos/aulas e progresso.

## Testes e qualidade

Scripts disponíveis (veja [package.json](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/package.json#L6-L18)):

- Unit: `npm run test:unit` (Vitest)
- E2E: `npm run test:e2e` (Playwright)
- Lint: `npm run lint` (ESLint)

## Execução local e build

### Variáveis de ambiente

Copie [`.env.example`](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/.env.example) para `.env` e configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_PUBLISHABLE_KEY`)

O app falha cedo caso não existam credenciais (ver [client.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/integrations/supabase/client.ts#L9-L14)).

### Comandos

- Desenvolvimento: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`


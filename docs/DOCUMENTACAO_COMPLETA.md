# VAGOU - Documentação Completa do Sistema

**Sistema de Gestão de Vagas em CMEIs (Centros Municipais de Educação Infantil)**

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Perfis de Usuário e Permissões](#3-perfis-de-usuário-e-permissões)
4. [Módulos do Sistema](#4-módulos-do-sistema)
5. [Fluxos Operacionais](#5-fluxos-operacionais)
6. [Banco de Dados](#6-banco-de-dados)
7. [Edge Functions](#7-edge-functions)
8. [Integrações](#8-integrações)
9. [Configurações do Sistema](#9-configurações-do-sistema)
10. [Segurança](#10-segurança)
11. [API e Hooks](#11-api-e-hooks)
12. [Interface do Usuário](#12-interface-do-usuário)
13. [PWA e Mobile](#13-pwa-e-mobile)
14. [Manutenção e Operação](#14-manutenção-e-operação)

---

## 1. Visão Geral

### 1.1 Objetivo

O VAGOU é um sistema completo para gestão de vagas em creches municipais (CMEIs), desenvolvido para:

- **Facilitar inscrições públicas** de crianças em CMEIs
- **Gerenciar fila de espera** com critérios de prioridade configuráveis
- **Automatizar convocações** e controle de prazos
- **Permitir matrículas** e movimentações (remanejamento, transferência)
- **Oferecer transparência** com consulta pública de fila e ocupação
- **Gerar relatórios** e manter auditoria completa

### 1.2 Público-Alvo

| Público | Descrição |
|---------|-----------|
| **Responsáveis** | Pais/responsáveis que inscrevem e acompanham crianças |
| **Gestores** | Servidores da Secretaria de Educação |
| **Diretores de CMEI** | Gestores das unidades escolares |
| **Administradores** | Gestão completa do sistema |

### 1.3 Tecnologias

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI** | Tailwind CSS, shadcn/ui, Lucide Icons |
| **Estado** | TanStack Query (React Query) |
| **Formulários** | React Hook Form + Zod |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Notificações** | Resend (e-mail), Webhooks (WhatsApp/SMS) |
| **PWA** | Vite PWA Plugin, Capacitor (mobile) |

---

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Diretórios

```
src/
├── components/           # Componentes React
│   ├── admin/           # Componentes da área administrativa
│   ├── auth/            # Componentes de autenticação
│   ├── inscricao/       # Formulário de inscrição
│   ├── layout/          # Layouts (header, footer, etc.)
│   ├── public/          # Componentes públicos
│   ├── pwa/             # Componentes PWA
│   ├── responsavel/     # Área do responsável
│   └── ui/              # Componentes base (shadcn)
├── contexts/            # Contextos React (Auth)
├── hooks/               # Hooks customizados
├── integrations/        # Integrações (Supabase)
├── lib/                 # Utilitários e hooks de dados
├── pages/               # Páginas da aplicação
│   ├── admin/           # Páginas administrativas
│   ├── auth/            # Páginas de autenticação
│   ├── public/          # Páginas públicas
│   └── responsavel/     # Páginas do responsável
└── assets/              # Imagens e assets

supabase/
├── functions/           # Edge Functions
└── config.toml          # Configuração do Supabase

scripts/
├── 01-setup-estrutura.sql    # Estrutura do banco
├── 02-setup-storage.sql      # Buckets de storage
└── 03-setup-dados-iniciais.sql # Dados iniciais

docs/
├── DOCUMENTACAO_COMPLETA.md  # Este documento
├── SETUP_NOVO_PROJETO.md     # Guia de setup
└── FUNCIONALIDADES_SISTEMA.md # Funcionalidades
```

### 2.2 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages → Components → Hooks (useQuery/useMutation)          │
│                           ↓                                  │
│                    Supabase Client                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Backend                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │  Edge    │   │
│  │  + RLS   │  │          │  │          │  │Functions │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Integrações Externas                      │
├─────────────────────────────────────────────────────────────┤
│  Resend (E-mail) │ Webhook (WhatsApp) │ Google Maps         │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Rotas da Aplicação

#### Área Pública (`/publico/*`)
| Rota | Descrição |
|------|-----------|
| `/publico` | Página inicial pública |
| `/publico/inscricao` | Formulário de inscrição |
| `/publico/fila` | Consulta de fila pública |
| `/publico/ocupacao` | Ocupação dos CMEIs |
| `/publico/consulta` | Consulta por CPF |
| `/publico/contato` | Formulário de contato |
| `/publico/app` | Download do aplicativo |

#### Área de Autenticação (`/auth/*`)
| Rota | Descrição |
|------|-----------|
| `/auth/login` | Login |
| `/auth/cadastro` | Cadastro de novo usuário |
| `/auth/recuperar-senha` | Recuperação de senha |
| `/auth/redefinir-senha` | Redefinição de senha |
| `/auth/completar-cadastro` | Completar dados do perfil |

#### Área do Responsável (`/responsavel/*`)
| Rota | Descrição |
|------|-----------|
| `/responsavel` | Dashboard do responsável |
| `/responsavel/nova-inscricao` | Nova inscrição |
| `/responsavel/fila` | Posição na fila |
| `/responsavel/ocupacao` | Ocupação dos CMEIs |
| `/responsavel/documentos` | Envio de documentos |
| `/responsavel/mensagens` | Chat com a secretaria |
| `/responsavel/notificacoes` | Histórico de notificações |
| `/responsavel/perfil` | Perfil do usuário |

#### Área Administrativa (`/admin/*`)
| Rota | Descrição |
|------|-----------|
| `/admin` | Dashboard administrativo |
| `/admin/cmeis` | Gestão de CMEIs |
| `/admin/turmas` | Gestão de turmas |
| `/admin/turmas/:id` | Detalhes da turma |
| `/admin/criancas` | Lista de crianças |
| `/admin/criancas/:id` | Detalhes da criança |
| `/admin/fila` | Gestão da fila |
| `/admin/matriculas` | Gestão de matrículas |
| `/admin/matriculas/:id` | Detalhes da matrícula |
| `/admin/transicao` | Transição anual |
| `/admin/mensagens` | Chat com responsáveis |
| `/admin/relatorios` | Relatórios |
| `/admin/usuarios` | Gestão de usuários |
| `/admin/configuracoes` | Configurações do sistema |
| `/admin/logs` | Logs do sistema |
| `/admin/auditoria` | Auditoria |
| `/admin/documentos` | Validação de documentos |
| `/admin/notificacoes` | Monitoramento de notificações |
| `/admin/tutorial` | Central de ajuda |
| `/admin/perfil` | Perfil do administrador |

---

## 3. Perfis de Usuário e Permissões

### 3.1 Roles do Sistema

| Role | Descrição | Acesso |
|------|-----------|--------|
| `responsavel` | Pai/mãe/responsável | Área do responsável |
| `diretor_cmei` | Diretor de unidade | CMEI vinculado + área admin limitada |
| `gestor` | Gestor municipal | Área administrativa completa |
| `admin` | Administrador | Área administrativa + configurações |
| `superadmin` | Super administrador | Acesso total + gestão de usuários |

### 3.2 Tabela de Permissões

O sistema utiliza RBAC (Role-Based Access Control) com permissões granulares:

| Módulo | Permissão | Descrição |
|--------|-----------|-----------|
| `criancas` | `criancas.visualizar` | Ver lista de crianças |
| `criancas` | `criancas.criar` | Criar inscrição |
| `criancas` | `criancas.editar` | Editar dados |
| `criancas` | `criancas.excluir` | Excluir inscrição |
| `criancas` | `criancas.convocar` | Convocar criança |
| `criancas` | `criancas.matricular` | Confirmar matrícula |
| `cmeis` | `cmeis.visualizar` | Ver CMEIs |
| `cmeis` | `cmeis.gerenciar` | Criar/editar/excluir CMEIs |
| `turmas` | `turmas.visualizar` | Ver turmas |
| `turmas` | `turmas.gerenciar` | Criar/editar/excluir turmas |
| `fila` | `fila.visualizar` | Ver fila de espera |
| `fila` | `fila.gerenciar` | Gerenciar fila |
| `relatorios` | `relatorios.visualizar` | Ver relatórios |
| `relatorios` | `relatorios.exportar` | Exportar relatórios |
| `usuarios` | `usuarios.visualizar` | Ver usuários |
| `usuarios` | `usuarios.gerenciar` | Gerenciar usuários |
| `configuracoes` | `configuracoes.visualizar` | Ver configurações |
| `configuracoes` | `configuracoes.gerenciar` | Alterar configurações |
| `auditoria` | `auditoria.visualizar` | Ver logs de auditoria |
| `notificacoes` | `notificacoes.enviar` | Enviar notificações |
| `notificacoes` | `notificacoes.monitorar` | Monitorar notificações |
| `documentos` | `documentos.validar` | Validar documentos |
| `chat` | `chat.visualizar` | Ver mensagens |
| `chat` | `chat.responder` | Responder mensagens |

### 3.3 Funções de Verificação

```sql
-- Verifica se usuário tem role específica
has_role(_user_id uuid, _role app_role) RETURNS boolean

-- Verifica se usuário é admin (admin, superadmin, gestor, diretor_cmei)
is_admin(_user_id uuid) RETURNS boolean

-- Verifica se usuário tem permissão específica
has_permission(_user_id uuid, _permission_code text) RETURNS boolean

-- Verifica se diretor tem acesso ao CMEI
director_has_cmei_access(_user_id uuid, _cmei_id uuid) RETURNS boolean

-- Retorna IDs dos CMEIs vinculados ao diretor
get_user_cmei_ids(_user_id uuid) RETURNS uuid[]
```

---

## 4. Módulos do Sistema

### 4.1 Módulo de Inscrição

#### Fluxo de Inscrição Pública

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│ Acessar     │───▶│ Preencher    │───▶│ Validar     │───▶│ Inserir  │
│ Formulário  │    │ Dados        │    │ Dados       │    │ no Banco │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────┘
                                                               │
                   ┌──────────────┐    ┌─────────────┐         │
                   │ Notificar    │◀───│ Calcular    │◀────────┘
                   │ Responsável  │    │ Posição     │
                   └──────────────┘    └─────────────┘
```

#### Campos do Formulário

O formulário é dinâmico e configurável via `campos_inscricao`:

**Seção: Dados da Criança**
- Nome completo (obrigatório)
- Data de nascimento (obrigatório)
- Sexo (obrigatório)
- CPF da criança (opcional)
- Certidão de nascimento (opcional)

**Seção: Dados do Responsável**
- Nome completo (obrigatório)
- CPF (obrigatório, validado)
- Telefone (obrigatório)
- Celular (opcional)
- E-mail (opcional)

**Seção: Endereço**
- CEP (com busca automática)
- Logradouro
- Número
- Complemento
- Bairro
- Cidade
- Estado

**Seção: Preferências**
- CMEI 1ª preferência
- CMEI 2ª preferência
- Aceita qualquer CMEI
- Programas sociais (prioridade)

#### Validações

```typescript
// Validação de CPF (dígitos verificadores)
validar_cpf(cpf text) RETURNS boolean

// Verificação de duplicidade
verificar_duplicidade_inscricao(
  p_nome text,
  p_data_nascimento date,
  p_responsavel_cpf text
) RETURNS jsonb

// Validação de idade
// Configurável via: idade_minima_meses, idade_maxima_anos, data_corte_dia, data_corte_mes
```

### 4.2 Módulo de Fila de Espera

#### Critérios de Ordenação

A fila é ordenada pelos seguintes critérios (configuráveis):

1. **Status**: Convocados aparecem primeiro
2. **Remanejamento**: Crianças matriculadas com remanejamento solicitado
3. **Prioridade Social**: Programas sociais (se habilitado)
4. **Prioridades Customizadas**: Peso dos tipos de prioridade
5. **Data de Inscrição/Retorno**: Ordem cronológica

#### Função de Recálculo

```sql
recalcular_posicoes_fila() RETURNS void
```

Chamada automaticamente via trigger quando:
- Nova inscrição
- Mudança de status
- Mudança de prioridade
- Solicitação de remanejamento

#### Status Possíveis

| Status | Descrição |
|--------|-----------|
| `Fila de Espera` | Aguardando vaga |
| `Convocado` | Convocado para matrícula |
| `Aguardando Documentação` | Documentos pendentes |
| `Matriculado` / `Matriculada` | Matrícula efetivada |
| `Desistente` | Desistiu da vaga |
| `Recusada` | Recusou a convocação |
| `Transferido` | Transferido para outro município |

### 4.3 Módulo de Convocação

#### Fluxo de Convocação

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Selecionar  │───▶│ Definir      │───▶│ Atualizar   │
│ Criança     │    │ CMEI/Turma   │    │ Status      │
└─────────────┘    └──────────────┘    └─────────────┘
                                            │
┌─────────────┐    ┌──────────────┐          │
│ Registrar   │◀───│ Enviar       │◀─────────┘
│ Histórico   │    │ Notificação  │
└─────────────┘    └──────────────┘
```

#### Campos Atualizados

```typescript
{
  status: 'Convocado',
  cmei_atual_id: uuid,
  turma_atual_id: uuid,
  data_convocacao: timestamp,
  convocacao_deadline: date, // data + prazo_resposta_dias
  posicao_fila: 0,
  data_penalidade: null // limpa penalidades anteriores
}
```

### 4.4 Módulo de Matrícula

#### Confirmação de Matrícula

```typescript
// Campos atualizados
{
  status: 'Matriculado',
  convocacao_deadline: null,
  data_penalidade: null,
  cmei_remanejamento_id: null,
  justificativa_remanejamento: null
}
```

#### Realocação de Turma

Move criança matriculada para outra turma do mesmo CMEI ou de outro CMEI.

#### Transferência

Encerra matrícula e marca criança como "Transferido".

### 4.5 Módulo de Remanejamento

#### Solicitação de Remanejamento

Criança matriculada pode solicitar transferência para outro CMEI:

```typescript
{
  cmei_remanejamento_id: uuid, // CMEI desejado
  justificativa_remanejamento: string
}
```

#### Prioridade de Remanejamento

Se `prioridade_remanejamento_habilitada = true`, crianças com remanejamento solicitado têm prioridade na fila do CMEI desejado.

### 4.6 Módulo de Documentos

#### Tipos de Documento

Configuráveis via `documentos_tipos`:
- Certidão de Nascimento
- RG/CPF do Responsável
- Comprovante de Residência
- Cartão de Vacinação
- Comprovante de Programas Sociais
- NIS/PIS

#### Status de Documento

| Status | Descrição |
|--------|-----------|
| `pendente` | Aguardando envio |
| `enviado` | Enviado, aguardando validação |
| `aprovado` | Documento aprovado |
| `recusado` | Documento recusado (motivo) |

### 4.7 Módulo de Chat

#### Funcionalidades

- Mensagens entre responsável e secretaria
- Suporte a texto, imagem, áudio, documento
- Marcadores para organização
- Respostas rápidas configuráveis
- Indicador de leitura

#### Estrutura de Mensagem

```typescript
{
  id: uuid,
  responsavel_id: uuid,
  crianca_id: uuid | null,
  direcao: 'responsavel' | 'secretaria',
  tipo: 'texto' | 'imagem' | 'audio' | 'documento',
  conteudo: string,
  arquivo_url: string | null,
  reply_to_id: uuid | null,
  lida_em: timestamp | null,
  lida_por: uuid | null
}
```

### 4.8 Módulo de Notificações

#### Canais Disponíveis

| Canal | Configuração | Implementação |
|-------|--------------|---------------|
| E-mail | `notificacao_email` | Resend API |
| SMS | `notificacao_sms` | Webhook |
| WhatsApp | `notificacao_whatsapp` | Webhook |

#### Tipos de Notificação

- `inscricao_confirmada` - Nova inscrição
- `convocacao` - Convocação para matrícula
- `convocacao_remanejamento` - Convocação de remanejamento
- `lembrete_prazo` - Lembrete de prazo
- `prazo_expirado` - Prazo expirado
- `matricula_confirmada` - Matrícula efetivada
- `fim_fila` - Movido para fim da fila
- `desistencia` - Desistência registrada
- `documento_aprovado` - Documento aprovado
- `documento_recusado` - Documento recusado

#### Templates

Templates configuráveis via `templates_mensagens` com variáveis:

```
{{nome_crianca}}
{{nome_responsavel}}
{{nome_cmei}}
{{nome_turma}}
{{data_limite}}
{{posicao_fila}}
{{nome_municipio}}
{{telefone_contato}}
```

### 4.9 Módulo de Relatórios

#### Relatórios Disponíveis

| Relatório | Descrição |
|-----------|-----------|
| Matrículas Ativas | Lista de crianças matriculadas por CMEI/Turma |
| Histórico de Matrículas | Movimentações em período |
| Fila de Espera | Lista completa com posições |
| Convocações | Convocações realizadas em período |
| Ocupação | Taxa de ocupação por CMEI/Turma |
| Inscrições | Novas inscrições em período |
| Desistências | Desistências em período |

#### Exportação

- Excel (.xlsx)
- CSV
- PDF

### 4.10 Módulo de Transição Anual

#### Funcionalidades

- Planejamento de movimentações em massa
- Progressão de turma (Infantil 0 → Infantil 1, etc.)
- Marcação de concluintes (saída por idade)
- Aplicação em lote com histórico

#### Ações de Transição

| Ação | Descrição |
|------|-----------|
| `manter` | Manter na mesma turma |
| `progredir` | Avançar para próxima turma |
| `concluir` | Marcar como concluído (saída) |
| `desistir` | Marcar como desistente |

---

## 5. Fluxos Operacionais

### 5.1 Fluxo Completo de Inscrição

```
1. Responsável acessa /publico/inscricao
2. Sistema verifica se inscrições estão abertas
3. Se autenticacao_publica = true, redireciona para login
4. Preenche formulário dinâmico
5. Validações:
   - CPF válido (dígitos verificadores)
   - Idade dentro da faixa permitida
   - Duplicidade (nome + data nascimento)
   - Limite de inscrições por CPF
6. Rate limiting (5 por hora por CPF)
7. Inserção via função SECURITY DEFINER
8. Cálculo automático de posição na fila
9. Registro no histórico
10. Envio de notificação de confirmação
11. Exibição do comprovante
```

### 5.2 Fluxo de Convocação

```
1. Gestor acessa /admin/fila
2. Seleciona criança na fila
3. Abre modal de convocação
4. Seleciona CMEI e Turma com vagas
5. Sistema calcula prazo (dias úteis ou corridos)
6. Confirma convocação
7. Atualiza status e dados da criança
8. Registra no histórico
9. Dispara notificação (e-mail/WhatsApp)
10. Recalcula posições da fila
```

### 5.3 Fluxo de Matrícula

```
1. Responsável recebe convocação
2. Comparece ao CMEI/Secretaria
3. Gestor acessa /admin/matriculas ou /admin/criancas/:id
4. Verifica documentação
5. Confirma matrícula
6. Sistema atualiza status
7. Registra no histórico
8. Dispara notificação de confirmação
9. Vaga é decrementada da turma
```

### 5.4 Fluxo de Prazo Expirado

```
1. Sistema executa verificação periódica (cron ou manual)
2. Identifica crianças com convocacao_deadline < hoje
3. Conforme estrategia_prazo_vencido:
   - 'fim_fila': Move para fim da fila com penalidade
   - 'desistente': Marca como desistente
   - 'manual': Apenas notifica gestores
4. Registra no histórico
5. Notifica responsável
6. Recalcula posições
```

### 5.5 Fluxo de Remanejamento

```
1. Responsável acessa /responsavel
2. Solicita remanejamento para outro CMEI
3. Preenche justificativa (se exigido)
4. Sistema registra cmei_remanejamento_id
5. Criança entra na fila do novo CMEI com prioridade
6. Quando convocada no novo CMEI:
   - Encerra matrícula no CMEI atual
   - Efetiva no novo CMEI
```

---

## 6. Banco de Dados

### 6.1 Diagrama ER (Simplificado)

```
┌─────────────────┐       ┌─────────────────┐
│     profiles    │       │   user_roles    │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◀──────│ user_id (FK)    │
│ nome_completo   │       │ role            │
│ cpf             │       └─────────────────┘
│ email           │
│ telefone        │
└─────────────────┘
        │
        │ responsavel_user_id
        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    criancas     │       │      cmeis      │       │     turmas      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │◀──────│ cmei_id (FK)    │
│ nome            │       │ nome            │       │ id (PK)         │
│ data_nascimento │       │ endereco        │       │ nome            │
│ status          │       │ capacidade_total│       │ turma_base      │
│ cmei_atual_id   │──────▶│                 │       │ capacidade      │
│ turma_atual_id  │───────────────────────────────▶│                 │
│ posicao_fila    │       └─────────────────┘       └─────────────────┘
│ prioridade      │
└─────────────────┘
        │
        │ crianca_id
        ▼
┌─────────────────┐       ┌─────────────────┐
│    historico    │       │documentos_crianca│
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ crianca_id (FK) │       │ crianca_id (FK) │
│ acao            │       │ tipo_documento_id│
│ status_anterior │       │ arquivo_url     │
│ status_novo     │       │ status          │
└─────────────────┘       └─────────────────┘
```

### 6.2 Tabelas Principais

| Tabela | Descrição | Registros |
|--------|-----------|-----------|
| `profiles` | Perfis de usuários | Automático |
| `user_roles` | Roles dos usuários | Automático |
| `criancas` | Crianças inscritas | Principal |
| `cmeis` | Centros de educação | Configuração |
| `turmas` | Turmas por CMEI | Configuração |
| `turmas_base` | Modelos de turma | Configuração |
| `historico` | Histórico de ações | Auditoria |
| `documentos_crianca` | Documentos enviados | Anexos |
| `documentos_tipos` | Tipos de documento | Configuração |
| `tipos_prioridade` | Tipos de prioridade | Configuração |
| `crianca_prioridades` | Prioridades da criança | Relação |
| `configuracoes_sistema` | Configurações globais | 1 registro |
| `templates_mensagens` | Templates de notificação | Configuração |
| `notificacoes_log` | Log de notificações | Auditoria |
| `chat_mensagens` | Mensagens do chat | Comunicação |
| `auditoria` | Log de auditoria | Segurança |

### 6.3 Enums

```sql
-- Tipos de sexo
CREATE TYPE sexo_tipo AS ENUM ('M', 'F');

-- Tipos de prioridade
CREATE TYPE prioridade_tipo AS ENUM ('Social', 'Geral');

-- Status da criança
CREATE TYPE status_crianca AS ENUM (
  'Fila de Espera',
  'Convocado',
  'Aguardando Documentação',
  'Matriculado',
  'Matriculada',
  'Desistente',
  'Recusada',
  'Transferido'
);

-- Roles do sistema
CREATE TYPE app_role AS ENUM (
  'responsavel',
  'diretor_cmei',
  'gestor',
  'admin',
  'superadmin'
);
```

### 6.4 Funções Principais

| Função | Descrição |
|--------|-----------|
| `inserir_inscricao_publica` | Inscrição pública segura |
| `consulta_publica_por_cpf` | Consulta por CPF |
| `get_fila_publica` | Fila pública (dados anonimizados) |
| `get_ocupacao_cmeis` | Ocupação dos CMEIs |
| `get_ocupacao_turmas` | Ocupação das turmas |
| `recalcular_posicoes_fila` | Recálculo de posições |
| `validar_cpf` | Validação de CPF |
| `verificar_duplicidade_inscricao` | Verifica duplicatas |
| `has_role` | Verifica role do usuário |
| `is_admin` | Verifica se é admin |
| `has_permission` | Verifica permissão |
| `get_public_configuracoes` | Configurações públicas |
| `link_children_by_cpf` | Vincula crianças ao responsável |

### 6.5 Triggers

| Trigger | Tabela | Descrição |
|---------|--------|-----------|
| `on_auth_user_created` | `auth.users` | Cria perfil e role |
| `update_*_updated_at` | Várias | Atualiza timestamp |
| `trigger_atualizar_posicao_fila` | `criancas` | Recalcula fila |
| `audit_trigger_*` | Várias | Registra auditoria |
| `check_turma_can_deactivate` | `turmas` | Valida inativação |
| `registrar_historico_campos_inscricao` | `campos_inscricao` | Histórico de alterações |

### 6.6 RLS (Row Level Security)

Todas as tabelas têm RLS habilitado com políticas específicas:

```sql
-- Exemplo: tabela criancas
- "Admin can manage all children" (ALL para admins)
- "Public can insert inscriptions" (INSERT público)
- "Responsavel can view own children" (SELECT para responsável)
- "Responsavel can update own children contact info" (UPDATE limitado)
```

---

## 7. Edge Functions

### 7.1 Funções Disponíveis

| Função | Descrição | Auth |
|--------|-----------|------|
| `admin-usuarios` | Gestão de usuários | Admin |
| `enviar-contato` | Formulário de contato | Público |
| `enviar-notificacao` | Envio de notificações | Admin |
| `gerar-comprovante` | Gera comprovante PDF | Auth |
| `gerar-dados-ficticios` | Dados de teste | Admin |
| `gerar-ficha-pdf` | Ficha de matrícula | Admin |
| `get-maps-key` | Retorna API key do Maps | Auth |
| `limpar-dados` | Limpa dados de demo | Admin |
| `manifest-pwa` | Manifest dinâmico | Público |
| `recalcular-fila` | Recálculo de fila | Admin |
| `registrar-auditoria` | Registro de auditoria | Sistema |
| `send-email` | Envio de e-mail | Sistema |
| `setup-projeto` | Setup automatizado | Sistema |
| `validar-captcha` | Validação hCaptcha | Público |
| `verificar-prazos` | Verificação de prazos | Sistema |

### 7.2 Estrutura de Edge Function

```typescript
// supabase/functions/nome-funcao/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lógica da função...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 7.3 Secrets Necessários

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto | Sim |
| `SUPABASE_ANON_KEY` | Chave anônima | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço | Sim |
| `RESEND_API_KEY` | API do Resend | Se usar e-mail |
| `WEBHOOK_WHATSAPP_SECRET` | Secret do webhook | Se usar WhatsApp |
| `GOOGLE_MAPS_API_KEY` | API do Google Maps | Se usar mapa |

---

## 8. Integrações

### 8.1 Resend (E-mail)

```typescript
// Envio de e-mail via Edge Function
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'VAGOU <noreply@seudominio.com>',
  to: destinatario,
  subject: assunto,
  html: corpoHtml
})
```

### 8.2 Webhook de Notificações

```typescript
// Payload enviado ao webhook
{
  tipo: 'convocacao' | 'matricula' | ...,
  destinatario: {
    nome: string,
    telefone: string,
    email: string
  },
  crianca: {
    id: string,
    nome: string
  },
  dados: {
    cmei: string,
    turma: string,
    prazo: string,
    // ... outros dados específicos
  }
}
```

### 8.3 Google Maps

```typescript
// Uso no frontend
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api'

// API key obtida via Edge Function get-maps-key
const { isLoaded } = useLoadScript({
  googleMapsApiKey: apiKey
})
```

### 8.4 hCaptcha

```typescript
// Componente de captcha
import HCaptcha from '@hcaptcha/react-hcaptcha'

<HCaptcha
  sitekey={captchaSiteKey}
  onVerify={(token) => handleVerify(token)}
/>

// Validação via Edge Function validar-captcha
```

---

## 9. Configurações do Sistema

### 9.1 Tabela configuracoes_sistema

A tabela possui um único registro com todas as configurações globais:

#### Dados Gerais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome_municipio` | text | Nome do município |
| `nome_secretaria` | text | Nome da secretaria |
| `email_contato` | text | E-mail de contato |
| `telefone_contato` | text | Telefone de contato |
| `endereco_secretaria` | text | Endereço da secretaria |
| `endereco_latitude` | float | Latitude (mapa) |
| `endereco_longitude` | float | Longitude (mapa) |
| `brasao_url` | text | URL do brasão |

#### Inscrições

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data_inicio_inscricao` | date | Início das inscrições |
| `data_fim_inscricao` | date | Fim das inscrições |
| `prazo_resposta_dias` | int | Prazo para responder convocação |
| `usar_dias_uteis` | bool | Usar dias úteis no prazo |
| `limite_inscricoes_responsavel` | int | Máximo de inscrições por CPF |
| `autenticacao_publica` | bool | Exigir login para inscrição |
| `permitir_edicao_apos_inscricao` | bool | Permitir edição após inscrição |
| `bloquear_novas_inscricoes` | bool | Bloquear novas inscrições |
| `motivo_bloqueio_inscricoes` | text | Motivo do bloqueio |

#### Idade e Turmas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `idade_minima_meses` | int | Idade mínima em meses |
| `idade_maxima_anos` | int | Idade máxima em anos |
| `data_corte_dia` | int | Dia do corte etário |
| `data_corte_mes` | int | Mês do corte etário |
| `ano_letivo_atual` | int | Ano letivo de referência |

#### Fila e Prioridades

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `prioridade_social_habilitada` | bool | Habilitar prioridade social |
| `prioridade_remanejamento_habilitada` | bool | Habilitar prioridade de remanejamento |
| `habilitar_zoneamento` | bool | Habilitar zoneamento |
| `priorizar_zona` | bool | Priorizar por zona |
| `mover_automatico_prazo_vencido` | bool | Mover automaticamente prazo vencido |
| `estrategia_prazo_vencido` | text | 'fim_fila' ou 'desistente' |

#### Notificações

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `notificacao_email` | bool | Habilitar e-mail |
| `notificacao_sms` | bool | Habilitar SMS |
| `notificacao_whatsapp` | bool | Habilitar WhatsApp |
| `webhook_url_notificacao` | text | URL do webhook |
| `dias_antecedencia_lembrete` | int | Dias para lembrete |
| `intervalo_reenvio_notificacao` | int | Intervalo para reenvio |
| `max_tentativas_convocacao` | int | Máximo de tentativas |

#### Tema e Interface

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tema_cor_primaria` | text | Cor primária (hex) |
| `tema_cor_secundaria` | text | Cor secundária (hex) |
| `tema_fonte` | text | Fonte do sistema |
| `tema_padrao` | text | 'light', 'dark' ou 'system' |
| `permitir_troca_tema` | bool | Permitir usuário trocar tema |
| `sistema_nome` | text | Nome do sistema |
| `sistema_icone_url` | text | Ícone do sistema |
| `favicon_url` | text | Favicon |

#### Transferência e Remanejamento

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `permitir_transferencia` | bool | Habilitar transferência |
| `periodo_carencia_transferencia` | int | Dias de carência |
| `exigir_justificativa_transferencia` | bool | Exigir justificativa |
| `aprovar_transferencia_automatico` | bool | Aprovação automática |
| `permitir_remanejamento` | bool | Habilitar remanejamento |
| `limite_remanejamentos_ano` | int | Limite por ano |
| `exigir_justificativa_remanejamento` | bool | Exigir justificativa |

#### Segurança

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `captcha_habilitado` | bool | Habilitar CAPTCHA |
| `captcha_site_key` | text | Site key do hCaptcha |
| `captcha_secret_key` | text | Secret key do hCaptcha |
| `validar_cep` | bool | Validar CEP na inscrição |
| `ceps_permitidos` | text[] | Lista de CEPs permitidos |

#### Manutenção

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `modo_manutencao` | bool | Ativar modo manutenção |
| `mensagem_manutencao` | text | Mensagem de manutenção |
| `bloquear_fora_horario` | bool | Bloquear fora do horário |
| `horario_inicio_atendimento` | time | Início do atendimento |
| `horario_fim_atendimento` | time | Fim do atendimento |
| `mensagem_fora_horario` | text | Mensagem fora do horário |

#### Modo Demo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `modo_demonstracao` | bool | Ativar modo demo |
| `demo_mensagem` | text | Mensagem do modo demo |
| `demo_ultima_geracao` | timestamp | Última geração de dados |
| `demo_ultimo_reset` | timestamp | Último reset de dados |

---

## 10. Segurança

### 10.1 Autenticação

- **Supabase Auth** para autenticação
- Suporte a e-mail/senha e Google OAuth
- Tokens JWT com refresh automático
- Proteção de rotas no frontend

### 10.2 Autorização (RBAC)

```typescript
// Hook de verificação de permissão
const { hasPermission, hasRole, isAdmin } = useAuth()

// Uso em componentes
{hasPermission('criancas.convocar') && <BotaoConvocar />}

// Componente de gate
<PermissionGate permission="criancas.editar">
  <BotaoEditar />
</PermissionGate>
```

### 10.3 RLS (Row Level Security)

Todas as tabelas possuem RLS habilitado:

```sql
-- Padrão: sem acesso
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;

-- Políticas específicas por role/ação
CREATE POLICY "nome_politica" ON tabela
  FOR SELECT/INSERT/UPDATE/DELETE
  USING (condição)
  WITH CHECK (condição);
```

### 10.4 Validações

- **CPF**: Validação de dígitos verificadores
- **Rate Limiting**: 5 requisições por hora por CPF
- **CAPTCHA**: hCaptcha opcional no formulário
- **Sanitização**: Inputs sanitizados antes de persistir

### 10.5 Auditoria

Registro automático de todas as operações:

```sql
-- Tabela de auditoria
auditoria (
  id, tabela, operacao, registro_id,
  dados_antigos, dados_novos,
  usuario_id, ip_address, user_agent,
  created_at
)
```

### 10.6 Proteção de Dados

- **Dados anonimizados** na fila pública (iniciais)
- **CPF mascarado** em exibições públicas
- **Documentos privados** no Storage
- **Logs sem dados sensíveis**

---

## 11. API e Hooks

### 11.1 Hooks de Dados

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useCriancas` | `criancas-hooks.ts` | Lista de crianças |
| `useCrianca` | `criancas-hooks.ts` | Detalhes da criança |
| `useCMEIs` | `supabase-hooks.ts` | Lista de CMEIs |
| `useTurmas` | `supabase-hooks.ts` | Lista de turmas |
| `useConfiguracoes` | `configuracoes-hooks.ts` | Configurações |
| `useUsuarios` | `usuarios-hooks.ts` | Lista de usuários |
| `useDashboard` | `dashboard-hooks.ts` | Dados do dashboard |
| `useRelatorios` | `relatorios-utils.ts` | Dados de relatórios |
| `useMatriculas` | `matriculas-hooks.ts` | Lista de matrículas |
| `useHistorico` | `historico-utils.ts` | Histórico |
| `useNotificacoes` | `notificacoes-hooks.ts` | Notificações |
| `useChat` | `chat-hooks.ts` | Mensagens do chat |
| `useDocumentos` | `documentos-hooks.ts` | Documentos |
| `useAuditoria` | `auditoria-hooks.ts` | Logs de auditoria |
| `usePermissoes` | `permissoes-hooks.ts` | Permissões RBAC |

### 11.2 Mutations

```typescript
// Exemplo de mutation
const { mutate: convocarCrianca } = useConvocarCrianca()

convocarCrianca({
  criancaId: 'uuid',
  cmeiId: 'uuid',
  turmaId: 'uuid',
  prazo: new Date()
}, {
  onSuccess: () => toast.success('Criança convocada!'),
  onError: (error) => toast.error(error.message)
})
```

### 11.3 Hooks de UI

| Hook | Descrição |
|------|-----------|
| `useAuth` | Contexto de autenticação |
| `useMobile` | Detecção de mobile |
| `useDebounce` | Debounce de valores |
| `useTableDensity` | Densidade de tabelas |
| `useOnlineStatus` | Status de conexão |
| `useDynamicTheme` | Tema dinâmico |
| `useAccessibility` | Acessibilidade |
| `usePWAIcons` | Ícones do PWA |

---

## 12. Interface do Usuário

### 12.1 Design System

O sistema segue o padrão visual do **gov.br** com:

- **Cores**: Azul institucional (#1351B4, #071D41)
- **Fonte**: Inter (configurável)
- **Componentes**: shadcn/ui customizados
- **Ícones**: Lucide Icons
- **Responsividade**: Mobile-first

### 12.2 Componentes Base (shadcn/ui)

- Accordion, Alert, AlertDialog
- Avatar, Badge, Breadcrumb
- Button, Calendar, Card
- Checkbox, Collapsible, Command
- Dialog, Drawer, Dropdown Menu
- Form, Input, Label, Select
- Table, Tabs, Textarea
- Toast, Tooltip, etc.

### 12.3 Componentes Customizados

| Componente | Descrição |
|------------|-----------|
| `AdminLayout` | Layout administrativo com sidebar |
| `PublicLayout` | Layout público com header/footer |
| `ResponsavelLayout` | Layout do responsável |
| `ProtectedRoute` | Proteção de rotas |
| `PermissionGate` | Gate de permissões |
| `ConvocacaoDialog` | Modal de convocação |
| `RealocacaoDialog` | Modal de realocação |
| `CriancaDetailsDialog` | Detalhes da criança |
| `BrasaoUpload` | Upload de brasão |
| `DocumentosUpload` | Upload de documentos |
| `DynamicFormField` | Campo dinâmico |
| `PaginationControls` | Controles de paginação |

### 12.4 Temas

```css
/* Variáveis CSS (index.css) */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 217 91% 39%;      /* #1351B4 */
  --primary-foreground: 0 0% 100%;
  --secondary: 217 71% 17%;    /* #071D41 */
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### 12.5 Responsividade

```typescript
// Hook de detecção mobile
const isMobile = useIsMobile() // < 768px

// Breakpoints Tailwind
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
```

---

## 13. PWA e Mobile

### 13.1 Progressive Web App

Configurado via `vite-plugin-pwa`:

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'robots.txt'],
  manifest: {
    name: 'VAGOU',
    short_name: 'VAGOU',
    theme_color: '#1351B4',
    // ... gerado dinamicamente
  }
})
```

### 13.2 Manifest Dinâmico

Edge Function `manifest-pwa` gera manifest com configurações do banco:

```json
{
  "name": "VAGOU - [Nome Município]",
  "short_name": "VAGOU",
  "theme_color": "#1351B4",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512" }
  ]
}
```

### 13.3 Capacitor (Mobile Nativo)

Configurado para gerar apps Android/iOS:

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'app.lovable.vagou',
  appName: 'VAGOU',
  webDir: 'dist',
  // ...
}
```

### 13.4 Build Mobile

```bash
# Android
npm run build
npx cap add android
npx cap sync
npx cap open android

# iOS
npx cap add ios
npx cap sync
npx cap open ios
```

---

## 14. Manutenção e Operação

### 14.1 Tarefas Periódicas

| Tarefa | Frequência | Comando/Função |
|--------|------------|----------------|
| Limpar rate limits | Diária | `SELECT cleanup_old_rate_limits()` |
| Verificar prazos | Diária | Edge Function `verificar-prazos` |
| Recalcular fila | Sob demanda | `SELECT recalcular_posicoes_fila()` |
| Backup | Automático | Supabase (planos pagos) |

### 14.2 Monitoramento

- **Logs de Edge Functions**: Supabase Dashboard
- **Logs de Postgres**: Supabase Dashboard > Logs
- **Auditoria**: `/admin/auditoria`
- **Notificações**: `/admin/notificacoes`

### 14.3 Troubleshooting

#### Problema: Inscrição retorna erro

```sql
-- Verificar função
SELECT proname FROM pg_proc WHERE proname = 'inserir_inscricao_publica';

-- Verificar rate limit
SELECT * FROM rate_limit_entries 
WHERE identifier = '12345678901' 
AND window_start > now() - interval '1 hour';
```

#### Problema: Fila desordenada

```sql
-- Recalcular posições
SELECT recalcular_posicoes_fila();

-- Verificar configurações de prioridade
SELECT prioridade_social_habilitada, prioridade_remanejamento_habilitada 
FROM configuracoes_sistema;
```

#### Problema: Notificações não enviadas

```sql
-- Verificar logs
SELECT * FROM notificacoes_log 
WHERE status = 'erro' 
ORDER BY created_at DESC LIMIT 10;
```

### 14.4 Atualizações

1. Verificar changelog de novas versões
2. Executar migrations necessárias
3. Testar em ambiente de staging
4. Aplicar em produção
5. Verificar logs de erro

### 14.5 Backup e Recuperação

- **Backup automático**: Supabase (planos pagos)
- **Export manual**: Table Editor > Export
- **Recuperação**: Supabase Dashboard > Database > Backups

---

## Changelog

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0.0 | Dez/2025 | Versão inicial |

---

## Suporte

- **Documentação Supabase**: https://supabase.com/docs
- **Documentação shadcn/ui**: https://ui.shadcn.com
- **Documentação Tailwind**: https://tailwindcss.com/docs

---

*Documento gerado em Dezembro de 2025*
*VAGOU - Sistema de Gestão de Vagas em CMEIs*

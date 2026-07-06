# 1. Arquitetura do Sistema

## 1.1 Arquitetura Geral
O sistema SAM utiliza uma arquitetura de aplicação web moderna baseada no padrão **Serverless Client-Side Rendering (CSR)** com suporte a **Server-Side Rendering (SSR)** via Next.js, comunicando-se diretamente com um **Backend-as-a-Service (BaaS)** (Supabase).

### Diagrama de Implantação
```mermaid
graph TD
    User((Usuário/Navegador))
    CDN[Vercel Edge Network / CDN]
    App[Next.js App Router]
    Supabase[Supabase BaaS]
    DB[(PostgreSQL)]
    Auth[Supabase Auth]
    Storage[Supabase Storage]
    ExternalSys[Sistemas Externos]

    User <--> CDN
    CDN <--> App
    App <--> Supabase
    Supabase <--> DB
    Supabase <--> Auth
    Supabase <--> Storage
    App -- Webhooks --> ExternalSys
```

## 1.2 Arquitetura de Componentes
A aplicação está organizada em:
- **Camada de Visão (Pages/Components)**: Utiliza React e Tailwind CSS.
- **Camada de Lógica de Negócio (Actions)**: Server Actions do Next.js para mutações de dados.
- **Camada de Dados (Supabase Client)**: Abstração para chamadas ao banco de dados e autenticação.
- **Segurança (RLS)**: Regras de segurança aplicadas diretamente no banco de dados (Row Level Security).

## 1.3 Diagramas UML

### 1.3.1 Diagrama de Caso de Uso
```mermaid
useCaseDiagram
    actor "Administrador" as Admin
    actor "Profissional" as Prof
    actor "Coord. Escolar" as Coord

    Admin --> (Gerenciar Usuários)
    Admin --> (Configurar Instituição)
    Admin --> (Ver Logs de Auditoria)
    
    Prof --> (Gerenciar Alunos)
    Prof --> (Realizar Atendimento)
    Prof --> (Agendar Sessão)
    
    Coord --> (Consultar Alunos)
    Coord --> (Gerenciar Turmas)
    
    (Gerenciar Alunos) ..> (Login) : include
    (Realizar Atendimento) ..> (Login) : include
```

### 1.3.2 Diagrama de Classe (Simplificado)
```mermaid
classDiagram
    class Profile {
        +UUID id
        +String full_name
        +Enum role
        +String specialty
    }
    class Student {
        +UUID id
        +String full_name
        +Date birth_date
        +Enum status
    }
    class Appointment {
        +UUID id
        +DateTime date
        +String evolution
        +Enum status
    }
    class School {
        +UUID id
        +String name
    }
    class SchoolClass {
        +UUID id
        +String name
    }

    Profile "1" -- "*" Appointment : realiza
    Student "1" -- "*" Appointment : recebe
    School "1" -- "*" Student : pertence
    School "1" -- "*" SchoolClass : possui
    Profile "*" -- "0..1" School : coordena
```

### 1.3.3 Diagrama de Sequência (Fluxo de Atendimento)
```mermaid
sequenceDiagram
    participant P as Profissional
    participant A as App (Next.js)
    participant S as Supabase (DB)
    participant W as Webhook Service

    P->>A: Seleciona Aluno e inicia Atendimento
    A->>S: Busca histórico do aluno
    S-->>A: Retorna dados
    P->>A: Preenche evolução e salva
    A->>S: Insert na tabela 'appointments'
    S-->>A: Sucesso
    A->>W: Dispara Webhook (se configurado)
    W-->>A: Confirmação
    A-->>P: Exibe mensagem de sucesso
```

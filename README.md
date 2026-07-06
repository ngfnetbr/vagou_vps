# Projeto VAGOU - Sistema de Gerenciamento de Vagas em CMEIs

Este projeto é uma plataforma completa para gerenciamento de fila de espera, inscrições e matrículas em Centros Municipais de Educação Infantil (CMEIs).

## 🚀 Estrutura do Projeto

A estrutura de pastas foi organizada para ser intuitiva e facilitar a manutenção:

### 📁 Diretórios Principais

- `src/`: Código fonte da aplicação React.
  - `components/`: Componentes reutilizáveis.
    - `admin/`: Componentes exclusivos do painel administrativo.
    - `auth/`: Componentes de autenticação.
    - `common/`: Componentes compartilhados (Providers, Guardas de Rota, etc).
    - `layout/`: Componentes de estrutura (Header, Footer, Nav).
    - `ui/`: Primitivos de UI (Baseados em shadcn/ui).
  - `hooks/`: Hooks customizados.
    - `api/`: Hooks para consumo da API do Supabase (React Query).
  - `pages/`: Telas da aplicação.
    - `admin/`, `auth/`, `public/`, `responsavel/`, `common/`.
  - `utils/`: Funções utilitárias, máscaras e validações.
  - `styles/`: Arquivos de estilização global (CSS).
  - `integrations/`: Configurações de serviços externos (Supabase).
- `supabase/`: Configurações do backend, migrations e Edge Functions.
- `docs/`: Documentação detalhada, guias e relatórios do projeto.
- `scripts/`: Ferramentas de automação, deploy e manutenção.
- `public/`: Ativos estáticos públicos (PWA, ícones, manifest).
- `tests/`: Testes end-to-end (Playwright).

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite, TypeScript.
- **Estilização**: Tailwind CSS, shadcn/ui.
- **Estado & Cache**: TanStack Query (React Query) v5.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Testes**: Playwright (E2E).
- **Mobile**: Capacitor (Opcional para build nativo).

## ⚙️ Configuração Local

1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Configure o arquivo `.env` com suas chaves do Supabase.
4. Inicie o servidor de desenvolvimento: `npm run dev`.

## 📜 Documentação Adicional

Para mais detalhes, consulte a pasta `docs/`:
- `docs/guides/`: Guias passo-a-passo.
- `docs/reports/`: Relatórios de auditoria e status.
- `docs/training/`: Planos de treinamento.

---
© 2026 Sistema VAGOU. Todos os direitos reservados.

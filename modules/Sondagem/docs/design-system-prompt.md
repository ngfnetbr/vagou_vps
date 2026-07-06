# Prompt de Replicação Visual — Sistema "Sondagem – Módulo Educacional"

Crie uma aplicação web React + Tailwind CSS com a seguinte identidade visual e layout, replicando fielmente o design descrito abaixo.

---

## 1. DESIGN SYSTEM — CORES (HSL)

### Light Mode (padrão)
- Background geral: hsl(210, 20%, 98%) — cinza muito claro, quase branco
- Foreground (texto principal): hsl(215, 25%, 15%) — azul-escuro profundo
- Card / Popover: hsl(0, 0%, 100%) — branco puro
- Primary (azul institucional): hsl(217, 71%, 45%)
- Primary foreground: hsl(0, 0%, 100%) — branco
- Secondary: hsl(210, 40%, 96%)
- Muted: hsl(210, 20%, 95%), texto muted: hsl(215, 15%, 47%)
- Accent: hsl(210, 40%, 96%)
- Destructive (vermelho): hsl(0, 84%, 60%)
- Border / Input: hsl(214, 32%, 91%)
- Ring (foco): hsl(217, 71%, 45%)
- Success (verde): hsl(142, 71%, 45%)
- Warning (amarelo): hsl(38, 92%, 50%)
- Info (azul claro): hsl(199, 89%, 48%)

### Sidebar
- Background: hsl(217, 71%, 25%) — azul escuro
- Foreground: hsl(210, 40%, 96%) — texto claro
- Accent: hsl(217, 71%, 32%) — azul médio (hover/active)
- Accent foreground: hsl(0, 0%, 100%)
- Border: hsl(217, 60%, 30%)

### Dark Mode
- Background: hsl(222, 84%, 5%)
- Primary: hsl(217, 91%, 60%)
- Secondary/Muted/Accent: hsl(217, 33%, 18%)
- Border: hsl(217, 33%, 18%)
- Sidebar background: hsl(217, 71%, 12%)
- Sidebar accent: hsl(217, 60%, 20%)

---

## 2. TIPOGRAFIA E ESPAÇAMENTO

- Font stack: system-ui / sans-serif (sem fontes externas)
- Border radius padrão: 0.75rem (rounded-xl)
- Cards usam rounded-2xl (1rem)
- Sombras: shadow-sm em cards, shadow-xl no card de login
- Espaçamento principal: p-6 md:p-8 no conteúdo
- Gap entre cards: gap-6
- Textos:
  - Títulos de seção: text-lg font-semibold
  - Títulos de card: text-sm font-semibold
  - Valores KPI: text-3xl font-bold
  - Descrições: text-xs text-muted-foreground
  - Labels: text-sm font-medium

---

## 3. LAYOUT GERAL

### Estrutura
- SPA com sidebar fixa à esquerda + área de conteúdo à direita
- Container flex: min-h-screen flex w-full
- Sidebar colapsável (modo "icon" quando recolhida, mostrando apenas ícones)
- Header fixo com h-14, borda inferior, contém botão de toggle da sidebar + título da página

### Sidebar (lado esquerdo, azul escuro)
- Largura expandida: ~256px (padrão shadcn sidebar)
- Largura colapsada: ~48px (só ícones)
- Header da sidebar: ícone GraduationCap em container rounded-lg com bg azul-accent + textos "Sondagem" (bold) e "Módulo Educacional" (xs, opacidade 60%)
- Ícone de notificações (sino) ao lado do logo quando expandida
- Menu principal com ícones Lucide:
  - Dashboard → LayoutDashboard
  - Solicitar Sondagem → FileEdit
  - Lançamento → ClipboardList
  - Relatórios → BarChart3
  - Configurações → Settings
- Submenu "Cadastros" colapsável (com ícone FolderOpen + ChevronDown que rotaciona):
  - Alunos → GraduationCap
  - Turmas → Users
  - CMEI / Escola → Building2
  - Metas → Target
- Item ativo: bg-sidebar-accent com text branco e font-medium
- Hover: bg-sidebar-accent com 50% opacidade
- Footer da sidebar: email do usuário (text-xs, opacidade 60%) + botão Sair com ícone LogOut
- Ícones: h-4 w-4 nos itens de menu, h-5 w-5 no logo

---

## 4. TELA DE LOGIN

- Fundo: gradiente diagonal de hsl(217,71%,25%) para hsl(217,71%,45%)
- Card centralizado: max-w-md, rounded-2xl, bg-card, p-8, shadow-xl, borda
- Logo acima do card: ícone GraduationCap em container rounded-2xl bg-white/10 backdrop-blur
- Título "Sondagem" em branco, subtítulo em white/70%
- Campos com ícones à esquerda (Mail, Lock) posicionados absolute
- Campo de senha com toggle Eye/EyeOff
- Link "Esqueci minha senha" em text-primary, text-xs, alinhado à direita
- Botão "Entrar" largura total (w-full), estilo primary

---

## 5. DASHBOARD

- Grid de 4 KPI cards: grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6
- Cada card:
  - rounded-2xl bg-card p-6 shadow-sm border
  - Borda esquerda colorida (border-l-4) com cor temática:
    - Azul (hsl 217,71%,45%) → Total Avaliados (ícone Users)
    - Amarelo (hsl 38,92%,50%) → Pendentes (ícone Clock)
    - Verde (hsl 142,71%,40%) → Alfabetizados (ícone BookOpen)
    - Vermelho (hsl 0,72%,51%) → Não Atingiram (ícone TrendingDown)
  - Valor: text-3xl font-bold
  - Descrição: text-xs text-muted-foreground
  - Ícone: h-5 w-5, cor correspondente, alinhado à direita do título

- Cards de distribuição por nível (grid 2 colunas):
  - Barras horizontais de progresso com cores por nível
  - Bolinha colorida 2x2 rounded-full + nome do nível + barra + contagem

- Card de ranking com ícone Trophy:
  - Top 3 com ícone Medal (ouro hsl(45,93%,47%), prata hsl(0,0%,70%), bronze hsl(30,60%,50%))
  - Itens em rounded-xl bg-muted/50 border, com Progress bar + Badge de percentual
  - Badge variant: default (≥70%), secondary (≥40%), destructive (<40%)

---

## 6. COMPONENTES PADRÃO

### Botões (shadcn Button com CVA)
- default: bg-primary text-primary-foreground hover:bg-primary/90
- destructive: bg-destructive text-destructive-foreground
- outline: border border-input bg-background hover:bg-accent
- secondary: bg-secondary text-secondary-foreground
- ghost: hover:bg-accent
- link: text-primary underline
- Tamanhos: default h-10 px-4, sm h-9 px-3, lg h-11 px-8, icon h-10 w-10
- Rounded-md, ring de foco azul

### Inputs
- h-10, rounded-md, border border-input, bg-background
- Foco: ring-2 ring-ring (azul)
- Placeholder: text-muted-foreground

### Cards (shadcn)
- rounded-xl, border, bg-card, shadow-sm
- CardHeader com pb reduzido para compactar
- CardTitle: text-sm font-semibold (nos cards de gráfico/distribuição)

### Tabelas
- Cabeçalho: text-muted-foreground, font-medium, h-12
- Linhas: border-b, hover:bg-muted/50
- Células: p-4, text-sm

### Badges
- default: bg-primary
- secondary: bg-secondary
- destructive: bg-destructive
- outline: border
- Rounded-full, text-xs, font-semibold

### Select/Dropdown
- Estilo consistente com inputs
- Chevron-down no trigger
- Dropdown com sombra e rounded-md

### Dialogs/Modals
- Overlay: bg-black/80 com fade
- Content: centered, max-w-lg, rounded-lg, shadow-lg
- Botão X no canto superior direito
- Animação zoom-in/out + fade

---

## 7. ÍCONES

Biblioteca: Lucide React (lucide-react). Todos os ícones usados:
- LayoutDashboard, ClipboardList, BarChart3, Settings, GraduationCap, LogOut, FileEdit, Target, Building2, Users, ChevronDown, FolderOpen, Mail, Lock, Eye, EyeOff, Clock, BookOpen, TrendingDown, Trophy, Medal, Search, Download, Filter, ChevronLeft, ChevronRight, Plus, Trash2, Edit, X, Bell, Check, AlertTriangle, Info, Calendar, Save, Upload, ExternalLink, MoreVertical, Printer, FileText

Tamanhos padrão:
- Menu/toolbar: h-4 w-4
- KPI/destaque: h-5 w-5
- Logo grande: h-8 w-8

---

## 8. RESPONSIVIDADE

- Mobile-first com breakpoints Tailwind: md (768px), lg (1024px), xl (1280px)
- Sidebar vira sheet/drawer no mobile (slide da esquerda)
- Cards KPI empilham em 1 coluna no mobile, 2 no md, 4 no xl
- Tabelas com overflow-x-auto no mobile
- Padding do conteúdo: p-6 mobile, p-8 desktop

---

## 9. TOAST/NOTIFICAÇÕES

- Biblioteca: Sonner
- Posição: canto inferior direito
- Estilos: success (verde), error (vermelho), info (azul)
- Toast simples com título + descrição opcional

---

## 10. ESTÉTICA GERAL

- NÃO é estilo GOVBR (governo brasileiro)
- Visual institucional moderno e contemporâneo
- Predominância de azul como cor primária com fundo cinza claro
- Bordas arredondadas generosas (rounded-2xl em cards)
- Sombras suaves (shadow-sm), sem bordas pesadas
- Espaçamento generoso entre elementos
- Sem gradientes excessivos (exceto login e sidebar)
- Skeleton loading para estados de carregamento
- Transições suaves (transition-colors, transition-all)

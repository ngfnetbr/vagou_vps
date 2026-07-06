# Design System — SAME (VAGOU · SAM · SONDAR)

Guia de referência para criar **novas telas, componentes e animações** mantendo
o padrão visual do sistema em todos os módulos. Use este documento como base
**antes** de escrever qualquer UI nova.

> Regra de ouro: **nunca cor crua** em `className`. Sempre tokens semânticos.
> Auditoria automática: `npm run audit:design` (resumo) / `npm run audit:design:full` (por arquivo).
> Checklist complementar: [`AUDIT_CHECKLIST.md`](./AUDIT_CHECKLIST.md).

---

## 1. Princípios

1. **Tokens primeiro** — toda cor, sombra, raio e gradiente vem de variável CSS
   (`src/styles/tokens.css`) exposta no `tailwind.config.ts`. Componentes nunca
   usam `bg-blue-500`, `text-white`, `#hex` ou `rgb()`.
2. **Consistência entre módulos** — VAGOU, SAM e Sondagem compartilham os mesmos
   tokens (`@import "../../../src/styles/tokens.css"`). Uma mesma ação usa o mesmo
   ícone, a mesma variante e o mesmo espaçamento em todos os módulos.
3. **Componível, não copiado** — prefira componentes do design system
   (`Button`, `Badge`, `Card`, `Table`, `Tabs`) e suas variantes a estilos avulsos.
4. **Acessível por padrão** — contraste AA em claro e escuro, `aria-label` em
   botões só-ícone, foco visível, estados de carregamento nunca em branco.
5. **Identidade gov.br** — paleta institucional azul/verde/amarelo no modo claro;
   modo escuro neutro (preto/cinza, sem azul).

---

## 2. Cores (tokens semânticos)

Definidas em HSL em `src/styles/tokens.css`. **Use o nome do token, não o valor.**

### Superfícies e texto
| Token | Classe | Uso |
|-------|--------|-----|
| `--background` / `--foreground` | `bg-background` / `text-foreground` | Fundo e texto base da página |
| `--card` / `--card-foreground` | `bg-card` / `text-card-foreground` | Cartões e painéis |
| `--popover` / `--popover-foreground` | `bg-popover` | Menus, dropdowns, tooltips |
| `--muted` / `--muted-foreground` | `bg-muted` / `text-muted-foreground` | Fundos sutis e texto secundário |
| `--border` / `--input` | `border-border` / `border-input` | Bordas e campos |
| `--ring` | `ring-ring` | Anel de foco |

### Marca e ações
| Token | Classe | Uso |
|-------|--------|-----|
| `--primary` / `--primary-foreground` | `bg-primary text-primary-foreground` | Ação principal, links ativos |
| `--primary-glow` | `from-primary to-primary-glow` | Gradientes e brilho |
| `--secondary` | `bg-secondary` | Ação secundária |
| `--accent` | `bg-accent` | Destaques (verde gov.br no claro) |
| `--destructive` | `bg-destructive` | Excluir / ações perigosas |

### Estados semânticos
`success`, `warning`, `info`, `destructive` → `text-success`, `bg-warning/10`, etc.
Para charts: `chart-success`, `chart-warning`, `chart-info`, `chart-purple`, `chart-muted`.

### Sidebar (tokens próprios)
`bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, `border-sidebar-border`,
`ring-sidebar-ring`. Não reaproveite tokens gerais dentro da sidebar.

### Marca específica
`whatsapp` (`bg-whatsapp`, `bg-whatsapp-bubble`, `bg-whatsapp-bg`) — uso restrito a
integrações/prévias de WhatsApp.

> **Opacidade:** combine token + alfa (`bg-primary/10`, `text-success/80`) em vez de
> criar novas cores claras.

---

## 3. Gradientes, sombras e raio

### Gradientes (background tokens)
```tsx
<div className="bg-gradient-primary" />   // primary → primary-glow
<div className="bg-gradient-accent" />    // accent (verde)
<div className="bg-gradient-subtle" />    // card → secondary
```

### Sombras (elevação)
| Classe | Uso |
|--------|-----|
| `shadow-xs` | Linhas/divisores sutis |
| `shadow-sm` | Cartões em repouso |
| `shadow-elegant` (md) | Hover de cartões, modais |
| `shadow-elevated` (lg) | Camadas flutuantes, popovers grandes |
| `shadow-glow` | Destaque com brilho da cor primária |

### Raio (`--radius` = 0.625rem)
`rounded-sm` < `rounded-md` < `rounded-lg` < `rounded-xl`. Badges = `rounded-full`.
Nunca cravar pixels — sempre a escala derivada de `--radius`.

---

## 4. Tipografia

- **Família base:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  (definida no `body`). Não importar fontes novas sem necessidade.
- **Escala (Tailwind):** `text-xs` (chips/legendas) → `text-sm` (corpo de tabela/UI)
  → `text-base` (corpo) → `text-lg`/`text-xl` (títulos de seção) → `text-2xl`+ (títulos de página).
- **Peso:** `font-medium` para rótulos, `font-semibold` para títulos, `font-bold`
  reservado a números/destaques.
- **Hierarquia:** título de página em `text-2xl font-semibold`; subtítulo em
  `text-sm text-muted-foreground`. Uma única H1 por tela.

---

## 5. Espaçamento e layout

- **Escala 4px** do Tailwind: `gap-2` (8), `gap-4` (16), `gap-6` (24) como padrões.
- **Página:** container central (`container`, padding `2rem`, max `1400px` em 2xl).
- **Pilha vertical:** `space-y-4` entre blocos; `space-y-6` entre seções.
- **Grids responsivos:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.
- **Breakpoints:** mobile-first. `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1400.

---

## 6. Componentes (use o design system)

> Todos em `@/components/ui/*` (shadcn/Radix). Sempre prefira o componente à tag crua.

### Botões `<Button>`
Variantes: `default`, `premium`, `success`, `destructive`, `outline`, `secondary`,
`ghost`, `link`. Tamanhos: `default | sm | lg | icon`. Só-ícone → `size="icon"` + `aria-label`.
```tsx
<Button variant="default" size="sm">Salvar</Button>
<Button variant="outline" size="icon" aria-label="Filtros"><Filter className="h-4 w-4" /></Button>
```

### Badges `<Badge>`
Pílula `rounded-full`. Variantes semânticas: `default`, `secondary`, `success`,
`warning`, `info`, `error`, `muted`, `outline`. Status em tabela = Badge, nunca span colorido.

### Cards `<Card>`
`Card` / `CardHeader` / `CardContent` (herdam `rounded-xl` + `shadow-sm`, hover `shadow-elegant`).
Métricas → `StatCard` (contador animado + glow). Nunca `bg-white`/`bg-gray-*`.

### Tabs / Tabelas
`Tabs` com `space-y-4` e ícones `h-4 w-4` nos triggers. Tabelas via `Table*`,
estado vazio com `ListEmptyState`, paginação com `ListPagination`/`PaginationControls`.

### Ícones (lucide-react)
- Tamanho **por classe**: `h-4 w-4` (padrão), `h-5 w-5` (destaque), `h-3.5 w-3.5` (chips).
  Nunca `size={20}` (exceto QR/recharts).
- Cor por token: `text-muted-foreground`, `text-primary`, `text-success`. Nunca `color="#..."`.
- Mesma ação = mesmo ícone em todos os módulos (Turmas `LayoutList`, Buscar `Search`, Filtros `Filter`).

### Estados de carregamento
Use `src/components/common/skeletons.tsx` (preferir skeletons a spinners). Rotas
protegidas sem sessão exibem `ModuleAuthLoading` ("Carregando painel...", "Sessão
necessária", "Acesso restrito") — **nunca** tela em branco (`return null`).

---

## 7. Animações

Definidas no `tailwind.config.ts` e em `src/styles` (utilitários). Use por classe.

### Keyframes / classes utilitárias
| Classe | Efeito | Quando usar |
|--------|--------|-------------|
| `animate-fade-in` | Fade + leve subida (0.4s) | Entrada de conteúdo |
| `animate-fade-up` | Subida maior, ease suave (0.5s) | Hero / seção em destaque |
| `animate-scale-in` | Escala 0.96→1 (0.3s) | Modais, popovers, cards |
| `animate-slide-in-right` | Desliza da direita (0.35s) | Painéis laterais, toasts |
| `animate-accordion-down/up` | Accordion Radix | Acordeões |
| `hover-scale` | `hover:scale-105` suave | Hovers interativos |
| `story-link` | Sublinhado animado | Links de texto |

### Diretrizes de motion
- **Sutil e proposital:** uma boa animação de entrada > muitos micro-efeitos.
- **Duração:** 200–500ms; `ease-out` para entradas, `cubic-bezier(0.22,1,0.36,1)` para destaques.
- **Para fluxos complexos** (orquestração, gestos) use **framer-motion**; para
  transições simples, prefira as classes utilitárias acima.
- Respeite `prefers-reduced-motion` quando criar animações novas.

---

## 8. Modo escuro

- Ativado por classe `.dark`. Modo escuro é **neutro** (preto/cinza), sem azul.
- Todos os tokens têm versão escura — usando tokens, o tema escuro funciona sozinho.
- **Nunca** condicionar cor com `dark:bg-[#...]`. Se faltar variação, ajuste o token.
- Valide contraste nas duas variantes ao criar telas.

---

## 9. Cabeçalho de módulo

Cada módulo (SAM/Sondagem) exibe **brasão + nome_secretaria + nome_municipio** via
`useConfiguracoesSistema`, igual ao VAGOU. Mantenha esse cabeçalho padronizado ao
criar novas telas dentro de um módulo.

---

## 10. Checklist ao criar uma tela nova

- [ ] Só tokens semânticos (sem hex/rgb/cores de paleta cruas).
- [ ] Componentes do DS (`Button`, `Badge`, `Card`, `Table`, `Tabs`) com variante correta.
- [ ] Ícones lucide com tamanho por classe e cor por token; ícone consistente por ação.
- [ ] Tipografia e espaçamento na escala (uma H1, `space-y-4/6`, grids responsivos).
- [ ] Animações via classes utilitárias / framer-motion, sutis e com `ease` correto.
- [ ] Estados de loading (skeletons) e vazio (`ListEmptyState`); sem tela em branco.
- [ ] Testado em claro **e** escuro, e em mobile (`md`/`lg`).
- [ ] `npm run audit:design` sem cores cruas.

---

_Referências: `src/styles/tokens.css`, `tailwind.config.ts`, `docs/design/AUDIT_CHECKLIST.md`._

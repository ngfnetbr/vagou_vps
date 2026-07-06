# Checklist de Auditoria do Design System

Garante que **todos os componentes** (badges, botões, cards, tabs, tabelas, ícones)
usem os **tokens semânticos** e as **variantes oficiais** em todo o sistema
(VAGOU, SAM e Sondagem).

> Auditoria automatizada: `npm run audit:design` (resumo) ou
> `npm run audit:design:full` (lista por arquivo). O script
> `scripts/tools/design-audit.mjs` falha o build apenas quando há cor **hex/rgb
> crua** em `className` — o resto é relatório de migração progressiva.

---

## 1. Tokens (nunca cores cruas)

- [ ] Sem `text-/bg-/border-<paleta>-<n>` (ex.: `bg-blue-500`, `text-gray-700`).
      Use `bg-primary`, `text-muted-foreground`, `border-border`, etc.
- [ ] Sem hex/rgb em `className` (`bg-[#25D366]`). Cores de marca viram token
      (ex.: `--whatsapp`).
- [ ] Cores de **estado** usam tokens semânticos: `success`, `warning`,
      `info`, `destructive` (e variantes de Badge correspondentes).
- [ ] Gradientes via `bg-gradient-primary | -accent | -subtle`.
- [ ] Sombras via `shadow-xs | -sm | -elegant | -elevated | -glow`.
- [ ] Raio via escala (`rounded-sm/md/lg/xl`) derivada de `--radius`.

## 2. Botões (`<Button>`)

- [ ] Sempre o componente `Button` (nunca `<button>` estilizado à mão).
- [ ] Variante correta: `default`, `premium`, `success`, `destructive`,
      `outline`, `secondary`, `ghost`, `link`.
- [ ] Tamanho via prop `size` (`default | sm | lg | icon`), sem `h-*`/`px-*` avulsos.
- [ ] Botão somente-ícone usa `size="icon"` + `aria-label`.

## 3. Badges (`<Badge>`)

- [ ] Sempre o componente `Badge` (formato pílula `rounded-full`).
- [ ] Variante semântica: `default`, `secondary`, `success`, `warning`,
      `info`, `error`, `muted`, `outline`.
- [ ] Sem cores Tailwind cruas dentro do badge.

## 4. Cards (`<Card>`)

- [ ] Usa `Card`/`CardHeader`/`CardContent` (herdam `rounded-xl` + `shadow-sm`
      + hover `shadow-elegant`).
- [ ] Métricas usam `StatCard` (contador animado, accent, glow no hover).
- [ ] Sem `bg-white`/`bg-gray-*` — use `bg-card`/`bg-muted`.

## 5. Tabs (`<Tabs>`)

- [ ] Usa `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` do design system.
- [ ] Espaçamento padrão (`space-y-4`) e ícones `h-4 w-4` nos triggers.

## 6. Tabelas (`<Table>`)

- [ ] Usa `Table`/`TableHeader`/`TableRow`/`TableCell` (respeitam densidade
      `table-density-*`).
- [ ] Estado vazio via `ListEmptyState`; paginação via `ListPagination`/
      `PaginationControls`.
- [ ] Status em células usam `Badge` semântico, não spans coloridos.

## 7. Ícones (lucide-react)

- [ ] **Tamanho** via classes Tailwind (`h-4 w-4` padrão, `h-5 w-5` em
      destaques, `h-3.5 w-3.5` em chips) — **nunca** `size={20}` numérico
      (exceção: QR codes/recharts que exigem px).
- [ ] **Cor** via token semântico (`text-primary`, `text-muted-foreground`,
      `text-success`…) — nunca `color="#..."`.
- [ ] **Peso** consistente: `strokeWidth` padrão (2); usar 1.5 só em telas
      "soft" inteiras, nunca pontualmente.
- [ ] Ícone decorativo: `aria-hidden`; ícone informativo: rótulo acessível.
- [ ] Mesma família de ícone para a mesma ação em todos os módulos
      (ex.: Turmas = `LayoutList`, Buscar = `Search`, Filtros = `Filter`).

## 8. Prévia sem sessão

- [ ] Rotas protegidas exibem `ModuleAuthLoading` (mensagem + spinner),
      nunca tela em branco (`return null`).
- [ ] Estados: "Carregando painel...", "Sessão necessária", "Acesso restrito".

---

## Estado atual (rode `npm run audit:design`)

| Regra | Meta |
|-------|------|
| Cor hex/rgb crua | **0** (bloqueia build) |
| Ícone com size numérico | 0 (exceto QR/recharts) |
| Ícone com `color=` cru | 0 |
| Cor fixa da paleta | reduzir progressivamente → tokens |

Priorize os arquivos do topo de `npm run audit:design:full` ao migrar.

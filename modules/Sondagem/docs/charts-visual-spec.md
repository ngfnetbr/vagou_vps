# Especificação Visual dos Gráficos

Documentação de referência para replicação dos gráficos e visualizações de dados do sistema de Sondagem.

---

## Biblioteca

- **Recharts** (`recharts@2.15.4`) com wrapper `ChartContainer` do shadcn/ui (`src/components/ui/chart.tsx`)
- Todos os gráficos usam `accessibilityLayer` para acessibilidade

---

## Paleta de Cores por Nível

### Escrita (progressão vermelho → verde)

| Código | Descrição         | Cor HSL                  |
|--------|-------------------|--------------------------|
| PIC    | Pictórico         | `hsl(0, 72%, 51%)`      |
| N1     | Nível 1           | `hsl(15, 80%, 50%)`     |
| N2     | Nível 2           | `hsl(30, 85%, 50%)`     |
| INT1   | Inter I           | `hsl(45, 90%, 48%)`     |
| SIL    | Silábico          | `hsl(55, 85%, 45%)`     |
| INT2   | Inter II          | `hsl(90, 60%, 45%)`     |
| ALF    | Alfabético        | `hsl(142, 71%, 40%)`    |

### Produção de Texto (progressão vermelho → verde)

| Código | Descrição                       | Cor HSL                  |
|--------|---------------------------------|--------------------------|
| TMD    | Texto com muita dificuldade     | `hsl(0, 72%, 51%)`      |
| TPD    | Texto com pouca dificuldade     | `hsl(38, 92%, 50%)`     |
| TDP    | Texto com dificuldade parcial   | `hsl(90, 60%, 45%)`     |
| TAL    | Texto alfabético                | `hsl(142, 71%, 40%)`    |

**Fallback** (nível desconhecido): `hsl(215, 15%, 47%)`

Arquivo de referência: `src/lib/nivelColors.ts`

---

## Dashboard (`src/pages/Dashboard.tsx`)

### Distribuição por Nível – Barras Horizontais

- **Tipo:** Barras horizontais customizadas (não Recharts, componentes nativos)
- **Layout:** 2 cards lado a lado (`grid lg:grid-cols-2`)
- **Escrita** e **Produção de Texto** separados
- Cada nível exibe:
  - Bolinha colorida (`w-2 h-2 rounded-full`) com a cor do nível
  - Nome do nível com cor correspondente
  - Barra de progresso (`h-2 rounded-full bg-muted`) preenchida proporcionalmente
  - Contagem numérica à direita
- **Estado vazio:** "Nenhuma sondagem finalizada ainda." ou "Nenhum nível cadastrado."

### Ranking de Escolas – Progress Bars

- **Tipo:** Lista ranqueada com `Progress` component
- Top 3 exibem ícone `Medal` com cores:
  - 🥇 1º: `hsl(45, 93%, 47%)` (dourado)
  - 🥈 2º: `hsl(0, 0%, 70%)` (prata)
  - 🥉 3º: `hsl(30, 60%, 50%)` (bronze)
- Demais: número ordinal em círculo
- `Badge` com cor por faixa: `≥70%` default, `≥40%` secondary, `<40%` destructive
- `Progress` bar com `h-2`
- Texto auxiliar: `{atingiram}/{total}`

---

## Relatórios (`src/pages/Relatorios.tsx`)

### Tab "Escrita" e "Produção de Texto"

#### Gráfico de Barras – Distribuição por Nível

- **Componente:** `BarChart` (Recharts)
- **Container:** `ChartContainer` com `h-[280px] w-full`
- **Eixos:**
  - X: `dataKey="nivel"`, sem tickLine e axisLine
  - Y: inteiros, sem tickLine e axisLine
- **Barras:** `radius={[6, 6, 0, 0]}` (cantos arredondados no topo)
- **Cores:** cada `Cell` preenchida com `getEscritaColor(codigo)` / `getProducaoColor(codigo)`
- **Grid:** `CartesianGrid vertical={false}`
- **Tooltip:** `ChartTooltipContent` com `nameKey="nivel"`

#### Gráfico de Pizza – Composição

- **Componente:** `PieChart` (Recharts)
- **Container:** `ChartContainer` com `h-[280px] w-full`
- **Donut:** `innerRadius={50}`, `outerRadius={90}`, `paddingAngle={3}`
- **Centralizado:** `cx="50%" cy="50%"`
- **Cores:** cada `Cell` preenchida pela cor do nível
- **Legenda:** `ChartLegendContent` com `nameKey="name"`
- **Tooltip:** `ChartTooltipContent` padrão

#### Cards Resumo por Nível

- **Layout:** `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` (Escrita) ou `grid-cols-4` (Produção)
- **Estilo:** `Card` com `border-l-4` na cor do nível
- Conteúdo centralizado: nome do nível (cor), contagem (bold), percentual

### Tab "Não Atingiram"

#### Progress Bars

- **Tipo:** `Progress` component com `h-3`
- Cor customizada via CSS variable `--progress-color`
- Label: nome do nível (cor) + contagem + percentual

#### Gráficos de Barras – % Não Atingiram

- **Componente:** `BarChart` (Recharts)
- **Container:** `h-[280px] w-full`
- **Eixo Y:** `unit="%"`
- **DataKey:** `pct`
- **Mesmo padrão visual** dos outros BarCharts (radius, grid, tooltip)

### Tab "Comparar Períodos"

#### KPIs Lado a Lado

- 2 cards com `border-l-4`:
  - Período base: `border-l-[hsl(215,80%,55%)]` (azul)
  - Período comparado: `border-l-[hsl(35,90%,55%)]` (laranja)
- Grid 3 colunas: Avaliados, Alfabetizados, % Alf.

#### Gráficos de Barras Agrupadas

- **Componente:** `BarChart` com 2 `Bar` components
- **Container:** `h-[300px] w-full`
- **Cores:**
  - Período base: `hsl(215, 80%, 55%)` (azul)
  - Período comparado: `hsl(35, 90%, 55%)` (laranja)
- **Radius:** `[4, 4, 0, 0]`
- **Legenda:** `ChartLegendContent` padrão
- 2 gráficos lado a lado: Escrita e Produção de Texto

#### Barras Duplas – Não Atingiram (Comparação)

- **Tipo:** Barras horizontais customizadas (não Recharts)
- Cada nível mostra 2 barras (`flex gap-1`):
  - Azul (`hsl(215, 80%, 55%)`) = período base
  - Laranja (`hsl(35, 90%, 55%)`) = período comparado
- Barra: `h-2.5 rounded-full` dentro de `bg-muted`
- Labels com cor correspondente ao período

---

## Ficha do Aluno (`src/pages/FichaAluno.tsx`)

### Gráfico de Linha – Evolução Individual

- **Componente:** `LineChart` (Recharts)
- **Container:** `ChartContainer` com `h-[250px] w-full`
- **Condição:** exibido apenas quando `historico.length >= 2`
- **Layout:** 2 gráficos lado a lado (`grid lg:grid-cols-2`)

#### Evolução – Escrita

- **Cor da linha:** `hsl(215, 80%, 55%)` (azul)
- **strokeWidth:** `3`
- **Dots:** `r: 5`, preenchidos com a mesma cor
- **Tipo:** `monotone`
- **DataKey:** `nivel` (valor numérico = `ordem` do nível)
- **Eixo Y:**
  - Domain: `[0, max(ordem)]`
  - `tickFormatter`: converte `ordem` → `codigo` (ex: 1 → "PIC", 7 → "ALF")
  - `fontSize: 10`
- **Eixo X:** `dataKey="periodo"`, `fontSize: 11`
- **Tooltip:** `labelFormatter` mostra `{periodo} ({data}) – {codigo}: {descricao}`

#### Evolução – Produção de Texto

- **Cor da linha:** `hsl(142, 71%, 40%)` (verde)
- Mesma estrutura do gráfico de Escrita

---

## Componentes Compartilhados

### ChartContainer (`src/components/ui/chart.tsx`)

- Wrapper com `ResponsiveContainer` do Recharts
- Aplica estilos base via classes Tailwind para personalizar elementos internos do Recharts
- Suporte a temas light/dark via CSS variables `--color-{key}`
- Classe base: `flex aspect-video justify-center text-xs`

### ChartTooltipContent

- Background: `bg-background`, borda `border-border/50`, `shadow-xl`
- `rounded-lg`, `px-2.5 py-1.5`, `text-xs`
- Indicadores: dot (`h-2.5 w-2.5`), line (`w-1`), ou dashed
- Valor em `font-mono font-medium tabular-nums`

### ChartLegendContent

- Layout: `flex items-center justify-center gap-4`
- Indicador: `h-2 w-2 rounded-[2px]` com `backgroundColor` da série
- Posição: `pt-3` (bottom) ou `pb-3` (top)

---

## Padrões Gerais

| Aspecto              | Valor padrão                               |
|----------------------|--------------------------------------------|
| Grid                 | `CartesianGrid vertical={false}`           |
| Eixos                | `tickLine={false} axisLine={false}`        |
| Barra radius         | `[6, 6, 0, 0]` ou `[4, 4, 0, 0]`         |
| Altura padrão        | `h-[280px]` (barras/pizza) / `h-[250px]` (linhas) |
| Estado vazio         | Texto centralizado `py-12` em `text-muted-foreground` |
| Container            | Sempre `w-full`                            |
| Cards com gráficos   | `Card > CardHeader(pb-2) > CardTitle(text-base font-semibold)` |
| Accessibility        | `accessibilityLayer` em todos os charts    |

# Tutorial de Regras de Prioridade e Pontuação da Fila

## Objetivo

Este documento explica como funciona a ordenação da fila de espera no sistema, quais regras impactam a pontuação e como configurar tudo no painel administrativo.

---

## Onde configurar

As principais configurações ficam em:

- **Configurações > Prioridades**
- **Configurações > Zonas**
- **Tipos de Prioridade**

---

## Como a fila é calculada

Para cada criança, o sistema calcula uma pontuação separada para:

- **1ª opção de CMEI**
- **2ª opção de CMEI**
- **3ª opção de CMEI** (quando o município habilita 3 opções)

Depois disso, a fila de cada CMEI é ordenada pela pontuação da respectiva opção.

---

## Fórmula geral da pontuação

A pontuação final pode considerar:

- **Prioridades aprovadas**
- **Programas sociais**
- **Remanejamento**
- **Zona de atendimento**
- **Tempo de espera**

Na prática, a lógica é:

```text
Pontuação final =
  pontos de prioridades aprovadas
  + pontos de programas sociais
  + pontos de remanejamento
  + bônus de zona
  + pontos por tempo de espera
```

Cada parte acima pode ser ligada, desligada ou ajustada conforme as configurações ativas.

---

## Regras que entram na pontuação

### 1. Prioridades aprovadas

As prioridades são cadastradas em **Tipos de Prioridade**.

Cada prioridade pode ter:

- nome
- código
- peso
- ativo/inativo
- exigência de documento

Somente prioridades:

- **ativas**
- **aprovadas**

entram na soma da pontuação.

Se uma prioridade estiver inativa, ela deixa de impactar a fila.

### 2. Programas sociais

Se a regra de prioridade social estiver habilitada:

- crianças marcadas com **programas sociais = true** recebem o peso configurado em:
  - **Peso programas sociais**

Se estiver desabilitada:

- a pontuação social vira **0**

### 3. Remanejamento

Se a regra de remanejamento estiver habilitada:

- crianças com prioridade **Remanejamento** recebem o valor configurado em:
  - **Peso remanejamento**

Se estiver desabilitada:

- a pontuação de remanejamento vira **0**

### 4. Zona de atendimento

Se a prioridade por zona estiver habilitada:

- o sistema verifica se o CMEI escolhido pertence à zona vinculada ao endereço da criança

Resultado:

- **CMEI dentro da zona**: recebe **bônus dentro da zona**
- **CMEI fora da zona**: recebe **bônus fora da zona**

Se a regra de zona estiver desabilitada:

- o bônus de zona vira **0**

### 5. Tempo de espera

O tempo de espera é controlado por:

- **Peso por dia de espera**

Funcionamento:

- o sistema calcula quantos dias se passaram desde o cadastro
- multiplica esse número pelo peso configurado

Exemplo:

- peso por dia = 2
- 10 dias de espera
- pontos de tempo = 20

Se o peso por dia for **0**:

- o tempo não soma pontos
- mas ainda pode ser usado no desempate

---

## Critérios de desempate

Quando duas crianças têm a mesma pontuação, o sistema usa sempre esta ordem fixa:

### 1º desempate: data de cadastro

- quem foi cadastrada primeiro fica na frente

### 2º desempate: idade

- a criança mais velha fica na frente

Resumo:

```text
1. Maior pontuação
2. Cadastro mais antigo
3. Criança mais velha
```

---

## Como o sistema se adapta automaticamente

O sistema sempre recalcula a pontuação respeitando o que estiver habilitado.

Exemplos:

- se **programas sociais** estiver desabilitado, essa parte da pontuação não entra
- se **zona** estiver desabilitada, bônus de zona não entra
- se **remanejamento** estiver desabilitado, esse peso não entra
- se **peso por dia** for 0, o tempo não soma pontos
- se o município usar **3 opções de CMEI**, o cálculo também considera a 3ª fila

Ou seja, a fila não depende de regra fixa “engessada”: ela segue a configuração ativa do município.

---

## Configuração recomendada

Uma configuração comum é:

- **Peso programas sociais**: valor alto
- **Peso remanejamento**: valor alto
- **Bônus zona dentro**: positivo
- **Bônus zona fora**: menor ou zero
- **Peso por dia de espera**: baixo ou moderado

Essa combinação costuma produzir uma fila equilibrada entre:

- prioridade legal
- proximidade
- tempo de espera

---

## Exemplo prático

Imagine uma criança com:

- 20 pontos em prioridades aprovadas
- 50 pontos de programas sociais
- 0 de remanejamento
- 10 de bônus de zona
- 12 pontos por tempo de espera

Pontuação final:

```text
20 + 50 + 0 + 10 + 12 = 92 pontos
```

Se outra criança também tiver 92 pontos:

- vence quem tiver cadastro mais antigo
- se ainda empatar, vence a mais velha

---

## Fluxo recomendado de uso

### Para configurar a lógica da fila

1. Ajustar pesos em **Configurações > Prioridades**
2. Definir se haverá prioridade social
3. Definir se haverá remanejamento
4. Ajustar regra de zona em **Configurações > Zonas**
5. Definir se o município terá 2 ou 3 opções de CMEI
6. Revisar pesos dos **Tipos de Prioridade**

### Para revisar o comportamento da fila

1. Alterar pesos
2. Recalcular a fila
3. Conferir posições das crianças por CMEI

---

## Resumo final

- A fila é baseada em **pontuação**
- A pontuação muda conforme as regras habilitadas
- A lógica vale para **CMEI 1, 2 e 3**
- O desempate é sempre:
  - **1º data de cadastro**
  - **2º idade**

---

## Referências técnicas

- Configuração do painel: `src/pages/admin/Configuracoes.tsx`
- Tipos de configuração: `src/hooks/api/configuracoes-hooks.ts`
- Regras de recálculo da fila: `supabase/migrations/20260402000016_configurar_pontuacao_desempate.sql`


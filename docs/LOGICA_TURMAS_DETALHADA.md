# Lógica de Distribuição de Turmas e Corte Etário

Este documento detalha a lógica utilizada pelo sistema para determinar a turma base de uma criança, baseada nas regras oficiais do Paraná (BNCC/CEE-PR), utilizando a data de corte de **31 de Março**.

## 1. Conceitos Fundamentais

### Data de Corte
A data de corte oficial é **31 de Março** do ano de referência (ano letivo).
- A idade da criança é calculada considerando quantos anos completos ela terá **nesta data**.
- Não importa se a criança faz aniversário em 01/04; para fins de matrícula, vale a idade que ela tinha em 31/03.

### Ano de Referência
O ano para o qual a matrícula ou transição está sendo feita.
- **Matrícula Atual:** Usa o ano corrente (ex: hoje é 2025, usa corte em 31/03/2025).
- **Transição Anual:** Usa o próximo ano (ex: planejando para 2026, usa corte em 31/03/2026).

---

## 2. Regras de Classificação

O sistema calcula a diferença em anos entre a **Data de Nascimento** e a **Data de Corte**.

| Idade em 31/03 | Turma Base | Descrição |
| :--- | :--- | :--- |
| **0 anos** | **Infantil 0** | Crianças que completam 1 ano APÓS 31/03. |
| **1 ano** | **Infantil 1** | Crianças que já têm ou completam 1 ano ATÉ 31/03. |
| **2 anos** | **Infantil 2** | Crianças que já têm ou completam 2 anos ATÉ 31/03. |
| **3 anos** | **Infantil 3** | Crianças que já têm ou completam 3 anos ATÉ 31/03. |
| **4 anos** | **Infantil 4** | Crianças que já têm ou completam 4 anos ATÉ 31/03. |
| **5 anos** | **Infantil 5** | Crianças que já têm ou completam 5 anos ATÉ 31/03. |
| **6+ anos** | **Concluinte** | Crianças que completam 6 anos ATÉ 31/03 vão para o Ensino Fundamental. |

### Regra de Idade Mínima (Berçário)
Independentemente da turma base, o sistema verifica se a criança tem **idade mínima cronológica** (hoje) para ingressar.
- **Padrão:** 6 meses de idade real (na data de hoje).
- Se a criança tiver menos de 6 meses hoje, o status será: `Aguardando completar 6 meses`.

---

## 3. Exemplos Práticos

Considerando o **Ano Letivo de 2025** (Corte: 31/03/2025).

### Exemplo A: Infantil 0 (Bebês)
*   **Criança:** Ana
*   **Nascimento:** 15/05/2024
*   **Cálculo em 31/03/2025:**
    *   Ana terá 10 meses em 31/03/2025.
    *   Ainda não completou 1 ano.
    *   **Idade no Corte:** 0 anos.
*   **Turma:** **Infantil 0**

### Exemplo B: Infantil 1 (Corte estrito)
*   **Criança:** Bruno
*   **Nascimento:** 30/03/2024
*   **Cálculo em 31/03/2025:**
    *   Bruno completa 1 ano exatamente um dia antes do corte.
    *   **Idade no Corte:** 1 ano.
*   **Turma:** **Infantil 1**

### Exemplo C: Infantil 0 (Nasceu após o corte)
*   **Criança:** Carla
*   **Nascimento:** 02/04/2024
*   **Cálculo em 31/03/2025:**
    *   Carla completa 1 ano em 02/04/2025 (depois do corte).
    *   Em 31/03/2025, ela ainda tem 11 meses e 29 dias.
    *   **Idade no Corte:** 0 anos.
*   **Turma:** **Infantil 0**
    *   *Nota: Bruno (exemplo B) e Carla têm 3 dias de diferença, mas ficam em turmas diferentes.*

### Exemplo D: Infantil 3
*   **Criança:** Daniel
*   **Nascimento:** 10/01/2022
*   **Cálculo em 31/03/2025:**
    *   Daniel completou 3 anos em 10/01/2025.
    *   **Idade no Corte:** 3 anos.
*   **Turma:** **Infantil 3**

### Exemplo E: Infantil 5 (Pré-Escola Final)
*   **Criança:** Eduardo
*   **Nascimento:** 31/03/2020
*   **Cálculo em 31/03/2025:**
    *   Eduardo completa 5 anos exatamente no dia do corte.
    *   **Idade no Corte:** 5 anos.
*   **Turma:** **Infantil 5**

### Exemplo F: Concluinte (Vai para Fundamental)
*   **Criança:** Fernanda
*   **Nascimento:** 20/02/2019
*   **Cálculo em 31/03/2025:**
    *   Fernanda completou 6 anos em 20/02/2025.
    *   **Idade no Corte:** 6 anos.
*   **Turma:** **Fora da faixa etária (Ensino Fundamental)**

---

## 4. Lógica de Transição de Ano

Quando o sistema executa a **Transição Anual** (ex: de 2025 para 2026), ele recalcula a idade de todas as crianças considerando o novo corte (31/03/2026).

**Cenário de Evolução:**
1.  **Ana (do Exemplo A - Nasc: 15/05/2024)**
    *   Em 2025: Infantil 0.
    *   Em 2026 (Corte 31/03/2026): Terá 1 ano e 10 meses. Idade Corte: 1 ano.
    *   **Novo Status:** Promovida para **Infantil 1**.

2.  **Carla (do Exemplo C - Nasc: 02/04/2024)**
    *   Em 2025: Infantil 0.
    *   Em 2026 (Corte 31/03/2026): Terá 1 ano, 11 meses e 29 dias. Idade Corte: 1 ano.
    *   **Novo Status:** Promovida para **Infantil 1**.
    *   *Nota: Mesmo nascendo depois do corte, ela eventualmente "alcança" a turma seguinte no próximo ciclo, mas sempre respeitando sua idade completa na data de referência.*

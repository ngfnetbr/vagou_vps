import { test, expect } from '@playwright/test';

/**
 * Fluxo da Fila de Espera e verificação dos critérios de priorização.
 * - Página pública: carrega fila, stats (Remanejamento, Com Prioridade), filtros e ordenação.
 * - Admin: rota protegida; filtros de prioridade (Remanejamento, Prioridade, Geral) e descrição da ordenação.
 */
test.describe('Fila de Espera - fluxo e priorização', () => {
  test.describe('Página pública da fila', () => {
    test('Carrega página Fila de Espera com título e descrição', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      await expect(page.getByRole('heading', { name: /Fila de Espera/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Acompanhe a fila de espera para vagas nos CMEIs/i)).toBeVisible();
    });

    test('Exibe cards de estatísticas com critérios de priorização', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      // Stats que refletem os critérios de priorização
      await expect(page.getByText('Total na Fila').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Remanejamento').first()).toBeVisible();
      await expect(page.getByText('Com Prioridade').first()).toBeVisible();
      await expect(page.getByText('Convocadas').first()).toBeVisible();
    });

    test('Listagem indica ordenação por prioridade e posição', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      await expect(page.getByRole('heading', { name: /Listagem da Fila/i })).toBeVisible({ timeout: 15000 });
      // Descrição da ordenação (pode estar no CardDescription abaixo do título)
      const descOuPrioridade = page.locator('text=/prioridade e posição na fila|Ordenada por prioridade|coluna Prioridade/i');
      await expect(descOuPrioridade.first()).toBeVisible({ timeout: 10000 });
    });

    test('Tabela tem colunas Posição e Prioridade (quando há dados)', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      // Aguardar conteúdo: tabela ou mensagem de lista vazia
      const table = page.getByRole('table');
      const emptyMsg = page.getByText(/Atualmente não há fila de espera/i);
      await expect(table.or(emptyMsg)).toBeVisible({ timeout: 15000 });
      if (await table.isVisible()) {
        await expect(table.getByRole('columnheader', { name: /Prioridade/i })).toBeVisible();
        const posHeader = table.getByRole('columnheader').filter({ hasText: /Pos\.?|Posição/i });
        await expect(posHeader.first()).toBeVisible();
      }
    });

    test('Filtro de prioridade oferece Todas, Com prioridade e Sem prioridade (Geral)', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      // Segundo combobox é o de Prioridade (1º = CMEI, 2º = Prioridade, 3º = Status)
      const comboboxes = page.getByRole('combobox');
      await expect(comboboxes.first()).toBeVisible({ timeout: 15000 });
      const prioridadeCombobox = comboboxes.nth(1);
      await prioridadeCombobox.click();
      await expect(page.getByRole('option', { name: /Todas as prioridades/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Com prioridade/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Sem prioridade \(Geral\)/i })).toBeVisible();
    });

    test('Exibe lista ou mensagem "Nenhuma criança" sem quebrar', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      const table = page.getByRole('table');
      const emptyMsg = page.getByText(/Atualmente não há fila de espera/i);
      const loading = page.getByText(/Carregando/i).first();
      await expect(table.or(emptyMsg).or(loading)).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Admin - Fila de Espera (rota protegida)', () => {
    test('/admin/fila sem autenticação redireciona para login', async ({ page }) => {
      await page.goto('/admin/fila');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('Após tentativa de acessar /admin/fila, login exibe formulário', async ({ page }) => {
      await page.goto('/admin/fila');
      await expect(page).toHaveURL(/\/auth\/login/);
      await expect(page.getByRole('button', { name: /Entrar|Login/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Critérios de priorização (configuração e UI)', () => {
    test('Página pública exibe filtro por status (Fila de Espera / Convocado)', async ({ page }) => {
      await page.goto('/publico/fila');
      await expect(page).toHaveURL(/\/publico\/fila/);
      const comboboxes = page.getByRole('combobox');
      await expect(comboboxes.first()).toBeVisible({ timeout: 15000 });
      const statusCombobox = comboboxes.nth(2);
      await statusCombobox.click();
      await expect(page.getByRole('option', { name: /Fila de Espera/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Convocado/i })).toBeVisible();
    });
  });
});

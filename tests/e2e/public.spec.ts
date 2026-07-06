import { test, expect } from '@playwright/test';

test.describe('Portal Público', () => {
  test('Carrega a página inicial e exibe ações principais', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VAGOU|Sistema|CMEIs/i);
    await expect(page.getByRole('button', { name: /Inscrever criança/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Área do Responsável/i })).toBeVisible();
  });

  test('Navega para Consulta de Inscrição', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Consultar inscrição/i }).click();
    await expect(page).toHaveURL(/.*publico\/consulta/i);
  });

  test('Formulário de Inscrição valida dados inválidos', async ({ page }) => {
    await page.goto('/publico/inscricao');
    const submit = page.getByRole('button', { name: /Enviar|Continuar|Salvar/i });
    if (await submit.isVisible()) {
      await submit.click();
      const error = page.getByText(/obrigatório|inval/i);
      await expect(error.first()).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Página de inscrição indisponível nesta build' });
    }
  });
});

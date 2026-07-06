import { test, expect } from '@playwright/test';

test.describe('Páginas de Erro', () => {
  test('404 exibe página amigável', async ({ page }) => {
    await page.goto('/caminho/que/nao-existe');
    await expect(page.getByText(/404/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Voltar para o Início/i })).toBeVisible();
  });
});

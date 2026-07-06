import { test, expect } from '@playwright/test';

/**
 * Navegação global: header, footer, 404, links do layout.
 */
test.describe('Navegação e layout', () => {
  test('Header público exibe banner e link Início', async ({ page }) => {
    await page.goto('/publico');
    const banner = page.getByRole('banner');
    await expect(banner.first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Início/i }).first()).toBeVisible();
  });

  test('Menu do header: abre e exibe Fila, Ocupação, Consulta', async ({ page }) => {
    await page.goto('/publico');
    const menuButton = page.getByRole('button', { name: /Abrir menu|Menu/i });
    await menuButton.click();
    await expect(page.getByRole('link', { name: /Fila/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /Ocupação/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Consulta/i })).toBeVisible();
  });

  test('Footer visível na home (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/publico');
    await expect(page.locator('footer')).toBeVisible({ timeout: 10000 });
  });

  test('404 exibe página amigável e botão voltar', async ({ page }) => {
    await page.goto('/caminho/inexistente/404');
    await expect(page.getByText(/404|Página não encontrada|não existe/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Voltar|Início/i })).toBeVisible();
  });

  test('Rota inexistente retorna status 200 (SPA)', async ({ page }) => {
    const resp = await page.goto('/rota/qualquer/xyz');
    expect(resp?.status()).toBe(200);
  });

  test('Página Download carrega', async ({ page }) => {
    await page.goto('/publico/download');
    await expect(page).toHaveURL(/\/publico\/download|\/download/);
    await expect(page.getByText(/Download|PWA|App|instalar/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Navegação por link: Inscrição no header', async ({ page }) => {
    await page.goto('/publico');
    const menuBtn = page.getByRole('button', { name: /Abrir menu|Menu/i });
    if (await menuBtn.isVisible()) await menuBtn.click();
    const inscricaoLink = page.getByRole('link', { name: /Inscrição/i }).first();
    await inscricaoLink.click();
    await expect(page).toHaveURL(/\/(publico\/inscricao|auth\/login|publico)/);
  });

  test('Navegação por link: Consulta no header (após abrir menu se necessário)', async ({ page }) => {
    await page.goto('/publico');
    await page.getByRole('button', { name: /Abrir menu|Menu/i }).click();
    await page.getByRole('link', { name: /^Consulta$/i }).click();
    await expect(page).toHaveURL(/\/publico\/consulta/);
  });
});

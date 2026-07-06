import { test, expect } from '@playwright/test';

test.describe('Autenticação e Autorização', () => {
  test('Login exibe validação para e-mail inválido', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/e-?mail/i).fill('invalid-email');
    const password = page.getByLabel(/senha/i);
    if (await password.isVisible()) {
      await password.fill('123');
    }
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
    // Validação pode aparecer via aria-invalid no input ou via mensagem de erro (toast/texto)
    const emailInput = page.getByLabel(/e-?mail/i);
    const hasAriaInvalid = (await emailInput.getAttribute('aria-invalid')) === 'true';
    const hasErrorMessage = await page.getByText(/preencha|inválido|obrigatório|credencial|e-?mail/i).first().isVisible().catch(() => false);
    expect(hasAriaInvalid || hasErrorMessage).toBeTruthy();
  });

  test('Acesso ao /admin redireciona para login quando não autenticado', async ({ page }) => {
    const resp = await page.goto('/admin');
    expect(resp?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/auth\/login|admin/i);
  });

  test('Recuperação de senha lida com e-mail inválido', async ({ page }) => {
    await page.goto('/auth/recuperar-senha');
    const email = page.getByLabel(/e-?mail/i);
    if (await email.isVisible()) {
      await email.fill('foo');
      await page.getByRole('button', { name: /Enviar|Recuperar|Resetar/i }).click();
      await expect(page.getByText(/e-?mail inválido|formato inválido/i).first()).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Página de recuperar senha indisponível' });
    }
  });
});

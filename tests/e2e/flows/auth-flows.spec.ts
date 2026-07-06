import { test, expect } from '@playwright/test';

/**
 * Fluxos de autenticação e rotas protegidas.
 * Não faz login real (sem credenciais); apenas valida redirecionamentos e formulários.
 */
test.describe('Fluxos de autenticação e rotas protegidas', () => {
  test('Página de login carrega com formulário', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('button', { name: /Entrar|Login/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('Página de cadastro carrega', async ({ page }) => {
    await page.goto('/auth/cadastro');
    await expect(page).toHaveURL(/\/auth\/cadastro/);
    await expect(page.getByText(/Cadastr|Criar conta|Registr/i).first()).toBeVisible();
  });

  test('Página recuperar senha carrega com campo e-mail', async ({ page }) => {
    await page.goto('/auth/recuperar-senha');
    await expect(page).toHaveURL(/\/auth\/recuperar-senha/);
    const emailField = page.getByLabel(/e-?mail/i);
    await expect(emailField).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar|Recuperar|Resetar/i })).toBeVisible();
  });

  test('/admin sem auth redireciona para login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('/admin/criancas sem auth redireciona para login', async ({ page }) => {
    await page.goto('/admin/criancas');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('/admin/configuracoes sem auth redireciona para login', async ({ page }) => {
    await page.goto('/admin/configuracoes');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('/responsavel sem auth redireciona para login', async ({ page }) => {
    await page.goto('/responsavel');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('/responsavel/inscricao sem auth redireciona para login', async ({ page }) => {
    await page.goto('/responsavel/inscricao');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Login com campos vazios mantém na página de login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Link "Esqueceu a senha" leva à recuperação', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: /Esqueceu.*senha/i })).toBeVisible();
    await page.getByRole('link', { name: /Esqueceu.*senha/i }).click();
    await expect(page).toHaveURL(/\/auth\/recuperar-senha/);
  });
});

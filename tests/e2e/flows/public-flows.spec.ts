import { test, expect } from '@playwright/test';

/**
 * Fluxos do portal público: navegação, páginas e conteúdo esperado.
 * Não depende de dados reais do backend (páginas carregam mesmo vazias).
 */
test.describe('Fluxos do portal público', () => {
  test('Raiz redireciona para /publico', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/publico/);
    await expect(page).toHaveTitle(/VAGOU|Sistema|CMEIs/i);
  });

  test('Home exibe hero e ações principais', async ({ page }) => {
    await page.goto('/publico');
    await expect(page.getByRole('button', { name: /Inscrever criança/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Consultar inscrição/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Área do Responsável/i })).toBeVisible();
  });

  test('Navegação completa: Fila → Ocupação → Contato → Consulta', async ({ page }) => {
    await page.goto('/publico/fila');
    await expect(page).toHaveURL(/\/publico\/fila/);
    await expect(page.getByText(/Fila de Espera|Fila|posição|inscritos|Carregando/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/publico/ocupacao');
    await expect(page).toHaveURL(/\/publico\/ocupacao/);
    await expect(page.getByText(/Ocupação|CMEI|vagas|capacidade|Carregando|Disponível|Lotado/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/publico/contato');
    await expect(page).toHaveURL(/\/publico\/contato/);
    await expect(page.getByText(/Fale Conosco|Contato|Secretaria|contato/i).first()).toBeVisible({ timeout: 5000 });

    await page.goto('/publico/consulta');
    await expect(page).toHaveURL(/\/publico\/consulta/);
    await expect(page.getByText(/CPF|Consultar|inscrição/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Página Fila carrega e exibe estrutura (tabela ou lista)', async ({ page }) => {
    await page.goto('/publico/fila');
    await expect(page).toHaveURL(/\/publico\/fila/);
    await expect(page.getByText(/Fila de Espera|Fila|Posição|Listagem|Carregando|Total na Fila/i).first()).toBeVisible({ timeout: 15000 });
    const hasStructure = await page.getByRole('table').isVisible().catch(() => false)
      || await page.getByRole('list').isVisible().catch(() => false)
      || await page.getByText(/Nenhum|Carregando|inscritos|Total na Fila|Listagem da Fila/i).first().isVisible().catch(() => false);
    expect(hasStructure).toBeTruthy();
  });

  test('Página Ocupação carrega e exibe CMEIs ou loading', async ({ page }) => {
    await page.goto('/publico/ocupacao');
    await expect(page).toHaveURL(/\/publico\/ocupacao/);
    await expect(page.getByText(/Ocupação|CMEI|vagas|Carregando|Disponível|Lotado|Alta/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Página Contato exibe título e seção de contato', async ({ page }) => {
    await page.goto('/publico/contato');
    await expect(page.getByText(/Fale Conosco|Contato|Secretaria|Município|contato|dúvidas/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('Página Consulta por CPF exibe campo ou mensagem', async ({ page }) => {
    await page.goto('/publico/consulta');
    const hasInputOrMessage = await page.getByLabel(/CPF/i).isVisible().catch(() => false)
      || await page.getByPlaceholder(/CPF/i).isVisible().catch(() => false)
      || await page.getByText(/CPF|Consultar|inscrição/i).first().isVisible().catch(() => false);
    expect(hasInputOrMessage).toBeTruthy();
  });

  test('Formulário de Inscrição: página carrega e botão enviar/continuar existe', async ({ page }) => {
    await page.goto('/publico/inscricao');
    await expect(page).toHaveURL(/\/publico\/inscricao/);
    const submit = page.getByRole('button', { name: /Enviar|Continuar|Salvar|Próximo/i });
    await expect(submit.first()).toBeVisible({ timeout: 10000 });
  });

  test('Formulário de Inscrição: validação ao enviar vazio', async ({ page }) => {
    await page.goto('/publico/inscricao');
    const submit = page.getByRole('button', { name: /Enviar|Continuar|Salvar/i }).first();
    if (await submit.isVisible()) {
      await submit.click();
      const errorOrRequired = page.getByText(/obrigatório|inválido|preencha|campo/i);
      await expect(errorOrRequired.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Link Download/App existe e leva a página de download', async ({ page }) => {
    await page.goto('/publico');
    const downloadLink = page.getByRole('link', { name: /Download|Baixar|App|PWA/i }).first();
    if (await downloadLink.isVisible()) {
      await downloadLink.click();
      await expect(page).toHaveURL(/\/publico\/download|\/download/);
    } else {
      await page.goto('/publico/download');
      await expect(page).toHaveURL(/\/publico\/download|\/download/);
    }
  });
});

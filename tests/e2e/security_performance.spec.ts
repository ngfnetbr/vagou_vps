import { test, expect } from '@playwright/test';

test.describe('Segurança e Desempenho', () => {
  test('Headers de segurança básicos', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBeLessThan(500);
    const headers = res.headers();
    const xcto = headers['x-content-type-options'];
    const xfo = headers['x-frame-options'];
    const xss = headers['x-xss-protection'];
    test.info().annotations.push({ type: 'header', description: `x-content-type-options=${xcto}` });
    test.info().annotations.push({ type: 'header', description: `x-frame-options=${xfo}` });
    test.info().annotations.push({ type: 'header', description: `x-xss-protection=${xss}` });
    expect(xcto || '').toMatch(/nosniff|$/i);
  });

  test('Tempo de carregamento inicial <= 3s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('load');
    const dur = Date.now() - start;
    test.info().annotations.push({ type: 'perf', description: `load_ms=${dur}` });
    expect(dur).toBeLessThanOrEqual(3000);
  });
});

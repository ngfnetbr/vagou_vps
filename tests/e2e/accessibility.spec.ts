import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Acessibilidade (WCAG 2.1 AA)', () => {
  const pages = ['/', '/publico/fila', '/publico/ocupacao', '/auth/login'];

  for (const p of pages) {
    test(`Sem violações sérias/críticas em ${p}`, async ({ page }) => {
      await page.goto(p);
      await injectAxe(page);
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          resultTypes: ['violations'],
        },
        includedImpacts: ['serious', 'critical']
      });
      await expect(page).toHaveTitle(/.+/);
    });
  }
});

import fs from 'fs';
import path from 'path';

const reportJsonPath = path.resolve(process.cwd(), 'playwright-report', 'report.json');
const outputPath = path.resolve(process.cwd(), 'docs', 'TEST_REPORT.md');

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadReport() {
  if (!fs.existsSync(reportJsonPath)) {
    return null;
  }
  const raw = fs.readFileSync(reportJsonPath, 'utf-8');
  return JSON.parse(raw);
}

function formatDate(d = new Date()) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function buildTraceability() {
  return [
    ['Autenticação e autorização', 'auth.spec.ts'],
    ['CRUD entidades (restrito ao backend)', 'N/A local (stub Supabase)'],
    ['Formulários: dados válidos e inválidos', 'public.spec.ts'],
    ['Pagamento/checkout', 'N/A projeto'],
    ['Upload/download de arquivos', 'Cobertura parcial em UI (admin restrito)'],
    ['Notificações por e-mail', 'N/A local'],
    ['API endpoints (REST/GraphQL)', 'N/A local'],
    ['Transações de banco de dados', 'N/A local'],
    ['Sessão', 'auth.spec.ts (redireção)'],
    ['Security headers', 'security_performance.spec.ts'],
    ['XSS/SQLi', 'Cobertura preventiva; sem backend local'],
    ['Responsividade', 'responsive.spec.ts'],
    ['Cross-browser', 'Config projetos Playwright'],
    ['Acessibilidade (WCAG 2.1 AA)', 'accessibility.spec.ts'],
    ['Performance (<= 3s)', 'security_performance.spec.ts'],
    ['Páginas de erro (404/500/403)', 'error.spec.ts (404), demais via redireção']
  ];
}

function main() {
  const rpt = loadReport();
  const lines = [];
  lines.push('# Relatório de Testes E2E');
  lines.push('');
  lines.push(`Data: ${formatDate()}`);
  lines.push('');
  lines.push('## Resumo da Execução');
  if (rpt && rpt.suites) {
    const tests = [];
    const walk = s => {
      if (s.specs && Array.isArray(s.specs)) {
        s.specs.forEach(spec => {
          if (spec.tests && Array.isArray(spec.tests)) {
            spec.tests.forEach(t => tests.push({ title: `${s.title} > ${spec.title}`, ...t }));
          }
        });
      }
      if (s.suites && Array.isArray(s.suites)) s.suites.forEach(walk);
    };
    rpt.suites.forEach(walk);
    const total = tests.length;
    const passed = tests.filter(t => t.results && t.results.some(r => r.status === 'passed')).length;
    const failedTests = tests.filter(t => t.results && t.results.some(r => r.status === 'failed'));
    const failed = failedTests.length;
    const skipped = tests.filter(t => t.results && t.results.every(r => r.status === 'skipped')).length;
    lines.push(`Total: ${total} | Passaram: ${passed} | Falharam: ${failed} | Ignorados: ${skipped}`);
    lines.push('');
    if (failed > 0) {
      lines.push('## Defeitos Encontrados');
      failedTests.forEach((t, idx) => {
        const firstFail = t.results.find(r => r.status === 'failed');
        const err = firstFail?.error?.message || firstFail?.error?.value || 'Erro desconhecido';
        let severity = 'Médio';
        if (/accessibil|wcag|a11y/i.test(t.title)) severity = 'Alto';
        if (/performance|segurança|security/i.test(t.title)) severity = 'Alto';
        if (/responsivo|layout/i.test(t.title)) severity = 'Baixo';
        lines.push(`- Caso #${idx + 1}: ${t.title}`);
        lines.push(`  - Erro: ${err.replace(/\n/g, ' ')}`);
        lines.push(`  - Gravidade: ${severity}`);
      });
    }
  } else {
    lines.push('Resultados JSON não encontrados. Verifique a pasta playwright-report.');
  }
  lines.push('');
  lines.push('Relatório HTML: ./playwright-report/index.html');
  lines.push('');
  lines.push('## Evidências');
  lines.push('- Screenshots e vídeos estão anexados automaticamente pelo Playwright.');
  lines.push('- Traces disponíveis para testes com falha.');
  lines.push('');
  lines.push('## Casos de Teste');
  lines.push('- Portal Público: navegação e validações de formulário.');
  lines.push('- Autenticação: validação de login, redireção de acesso restrito, recuperação de senha.');
  lines.push('- Erros: página 404.');
  lines.push('- Responsividade: capturas Desktop, Tablet, Mobile.');
  lines.push('- Acessibilidade: varredura WCAG 2.1 A/AA.');
  lines.push('- Segurança: headers básicos.');
  lines.push('- Performance: tempo de carregamento inicial.');
  lines.push('');
  lines.push('## Observações Importantes');
  lines.push('- Backend Supabase não está configurado localmente; o cliente usa stub.');
  lines.push('- Fluxos dependentes de banco, e-mail, storage e funções server-side foram marcados como N/A.');
  lines.push('- Páginas 403/500 são tratadas via redireção e tratamento de erros no app.');
  lines.push('- Evidências adicionais (traces, vídeos, screenshots) disponíveis na pasta test-results e no relatório HTML.');
  lines.push('');
  lines.push('## Matriz de Rastreabilidade');
  const matrix = buildTraceability();
  matrix.forEach(([req, tests]) => {
    lines.push(`- ${req}: ${tests}`);
  });
  ensureDir(outputPath);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

main();

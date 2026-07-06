# Relatório de Testes E2E

Data: 2026-02-28 17:09:14

## Resumo da Execução
Total: 48 | Passaram: 36 | Falharam: 12 | Ignorados: 0

## Defeitos Encontrados
- Caso #1: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /
  - Erro: AssertionError: 1 accessibility violation was detected  1 !== 0 
  - Gravidade: Alto
- Caso #2: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /publico/fila
  - Erro: AssertionError: 3 accessibility violations were detected  3 !== 0 
  - Gravidade: Alto
- Caso #3: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /publico/ocupacao
  - Erro: AssertionError: 2 accessibility violations were detected  2 !== 0 
  - Gravidade: Alto
- Caso #4: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /auth/login
  - Erro: AssertionError: 2 accessibility violations were detected  2 !== 0 
  - Gravidade: Alto
- Caso #5: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /
  - Erro: AssertionError: 1 accessibility violation was detected  1 !== 0 
  - Gravidade: Alto
- Caso #6: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /auth/login
  - Erro: AssertionError: 2 accessibility violations were detected  2 !== 0 
  - Gravidade: Alto
- Caso #7: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /publico/fila
  - Erro: AssertionError: 3 accessibility violations were detected  3 !== 0 
  - Gravidade: Alto
- Caso #8: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /publico/ocupacao
  - Erro: AssertionError: 2 accessibility violations were detected  2 !== 0 
  - Gravidade: Alto
- Caso #9: Acessibilidade (WCAG 2.1 AA) > Sem violações sérias/críticas em /auth/login
  - Erro: AssertionError: 1 accessibility violation was detected  1 !== 0 
  - Gravidade: Alto
- Caso #10: Autenticação e Autorização > Login exibe validação para e-mail inválido
  - Erro: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoHaveAttribute[2m([22m[32mexpected[39m[2m)[22m failed  Locator: getByLabel(/e-?mail/i) Expected pattern: [32m/true|email/[39m Received string:  [31m""[39m Timeout: 5000ms  Call log: [2m  - Expect "toHaveAttribute" with timeout 5000ms[22m [2m  - waiting for getByLabel(/e-?mail/i)[22m [2m    8 × locator resolved to <input id="email" required="" type="email" value="invalid-email" placeholder="seu@email.com" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>[22m [2m      - unexpected value "null"[22m 
  - Gravidade: Médio
- Caso #11: Autenticação e Autorização > Login exibe validação para e-mail inválido
  - Erro: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoHaveAttribute[2m([22m[32mexpected[39m[2m)[22m failed  Locator: getByLabel(/e-?mail/i) Expected pattern: [32m/true|email/[39m Received string:  [31m""[39m Timeout: 5000ms  Call log: [2m  - Expect "toHaveAttribute" with timeout 5000ms[22m [2m  - waiting for getByLabel(/e-?mail/i)[22m [2m    7 × locator resolved to <input id="email" required="" type="email" value="invalid-email" placeholder="seu@email.com" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>[22m [2m      - unexpected value "null"[22m 
  - Gravidade: Médio
- Caso #12: Autenticação e Autorização > Login exibe validação para e-mail inválido
  - Erro: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoHaveAttribute[2m([22m[32mexpected[39m[2m)[22m failed  Locator: getByLabel(/e-?mail/i) Expected pattern: [32m/true|email/[39m Received string:  [31m""[39m Timeout: 5000ms  Call log: [2m  - Expect "toHaveAttribute" with timeout 5000ms[22m [2m  - waiting for getByLabel(/e-?mail/i)[22m [2m    8 × locator resolved to <input id="email" required="" type="email" value="invalid-email" placeholder="seu@email.com" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>[22m [2m      - unexpected value "null"[22m 
  - Gravidade: Médio

Relatório HTML: ./playwright-report/index.html

## Evidências
- Screenshots e vídeos estão anexados automaticamente pelo Playwright.
- Traces disponíveis para testes com falha.

## Casos de Teste
- Portal Público: navegação e validações de formulário.
- Autenticação: validação de login, redireção de acesso restrito, recuperação de senha.
- Erros: página 404.
- Responsividade: capturas Desktop, Tablet, Mobile.
- Acessibilidade: varredura WCAG 2.1 A/AA.
- Segurança: headers básicos.
- Performance: tempo de carregamento inicial.

## Observações Importantes
- Backend Supabase não está configurado localmente; o cliente usa stub.
- Fluxos dependentes de banco, e-mail, storage e funções server-side foram marcados como N/A.
- Páginas 403/500 são tratadas via redireção e tratamento de erros no app.
- Evidências adicionais (traces, vídeos, screenshots) disponíveis na pasta test-results e no relatório HTML.

## Matriz de Rastreabilidade
- Autenticação e autorização: auth.spec.ts
- CRUD entidades (restrito ao backend): N/A local (stub Supabase)
- Formulários: dados válidos e inválidos: public.spec.ts
- Pagamento/checkout: N/A projeto
- Upload/download de arquivos: Cobertura parcial em UI (admin restrito)
- Notificações por e-mail: N/A local
- API endpoints (REST/GraphQL): N/A local
- Transações de banco de dados: N/A local
- Sessão: auth.spec.ts (redireção)
- Security headers: security_performance.spec.ts
- XSS/SQLi: Cobertura preventiva; sem backend local
- Responsividade: responsive.spec.ts
- Cross-browser: Config projetos Playwright
- Acessibilidade (WCAG 2.1 AA): accessibility.spec.ts
- Performance (<= 3s): security_performance.spec.ts
- Páginas de erro (404/500/403): error.spec.ts (404), demais via redireção
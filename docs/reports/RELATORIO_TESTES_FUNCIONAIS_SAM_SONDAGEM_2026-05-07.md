# Relatório Técnico — Testes Funcionais (SAM e Sondagem)

Data: 2026-05-07  
Ambiente: execução local (Vite dev server) + Supabase (projeto remoto configurado no app)  
Usuário de teste: `admin@gmail.com` (senha omitida)  

## Objetivo

Executar uma bateria de testes funcionais nos módulos **SAM** e **Sondagem**, incluindo testes de integração com o sistema principal (SSO, permissões, navegação e dados compartilhados), e documentar falhas de execução, mau funcionamento e possíveis erros de lógica.

## Metodologia de teste

- Teste exploratório guiado por UI, com foco em:
  - Acesso e autenticação (login, sessão e navegação)
  - Rotas principais e sub-rotas dos módulos
  - Fluxos de criação/edição quando disponíveis (sem persistir alterações sensíveis quando evitável)
  - Integração entre sistema principal ↔ módulos (retorno ao principal, compartilhamento de sessão)
  - Observação de erros em console e requisições de rede durante navegação
- Critérios de severidade:
  - **Crítico**: falha de segurança/acesso indevido; quebra total do módulo; perda de dados provável
  - **Alto**: funcionalidade central indisponível ou incorreta; impacto amplo
  - **Médio**: funcionalidade relevante com falha parcial/condicional; workaround possível
  - **Baixo**: problemas de UX, warnings, ruídos de log sem impacto funcional

## Escopo coberto

### Sistema principal

- Login via `/auth/login` e escolha de área (Administrativa)
- Acesso ao menu e abertura de módulos via rotas integradas

### Módulo SAM

- Rotas: `/modulo/sam`, `/modulo/sam/dashboard`, `/modulo/sam/agenda`, `/modulo/sam/agenda/novo`, `/modulo/sam/queixas`, `/modulo/sam/queixas/nova`, `/modulo/sam/relatorios`, `/modulo/sam/configuracoes`, `/modulo/sam/alunos`
- Verificação de permissões em ações sensíveis (prontuário)
- Verificação de acesso ao Portal da Escola (rotas `/modulo/sam/escola/*`)

### Módulo Sondagem

- Rotas: `/modulo/sondagem`, `/modulo/sondagem/dashboard`, `/modulo/sondagem/solicitar`, `/modulo/sondagem/aplicar`, `/modulo/sondagem/relatorios`, `/modulo/sondagem/configuracoes`
- Cadastros: `/modulo/sondagem/cadastros/alunos`, `/modulo/sondagem/cadastros/turmas`, `/modulo/sondagem/cadastros/cmeis`, `/modulo/sondagem/metas`
- Ficha do aluno: `/modulo/sondagem/aluno/:id` + exportação PDF

## Resultados e achados (priorizados)

### 1) Acesso indevido ao Portal da Escola (SAM)

- **Severidade:** Alto (controle de acesso / possível vazamento de dados)
- **Módulo afetado:** SAM
- **Função/área:** Guard de rotas do portal escolar (`SchoolProtectedRoute`)
- **Comportamento esperado:** somente usuários do perfil **Portal da Escola** (role lógico `school_coord`) devem conseguir acessar `/modulo/sam/escola/*`.
- **Comportamento observado:** o Portal da Escola podia ser acessado por perfis não-escola (ex.: `admin`/`professional`), bastando estar logado e ter acesso ao módulo SAM.
- **Causa raiz provável:** regra permissiva no guard de rota escolar permitindo `admin` e `professional` como válidos para rotas `/escola/*`.
- **Recomendação de correção:** restringir o acesso das rotas escolares exclusivamente ao perfil `school_coord`.
- **Status:** **corrigido no código** ajustando a regra no arquivo [ProtectedRoute.tsx](file:///c:/Users/Nelson/Documents/trae_projects/Vagou-5.0/modules/Sam/src/components/ProtectedRoute.tsx).

### 2) Configurações do SAM consultam tabela inexistente (`integration_configs`)

- **Severidade:** Médio
- **Módulo afetado:** SAM
- **Função/área:** Configurações (Integração Make/Zapi) + `getIntegrationConfig()`
- **Comportamento esperado:** a tela de configurações deve carregar e persistir parâmetros operacionais (ex.: webhook/API key) sem erros.
- **Comportamento observado:** erro no console ao buscar configurações: `Could not find the table 'public.integration_configs' in the schema cache`.
- **Causa raiz provável:** a tabela/migration existe no histórico do módulo, mas não está presente no schema efetivamente aplicado no banco do sistema principal (migração não integrada).
- **Recomendação de correção:**
  - Opção A: portar a migration do módulo para `supabase/migrations` do sistema principal (criando `integration_configs` e RLS/policies necessárias).
  - Opção B: migrar o armazenamento da configuração para uma tabela já existente no schema principal (ex.: `webhooks`) e remover referências antigas.

### 3) Prontuário no SAM inacessível para usuário administrativo durante teste

- **Severidade:** Médio
- **Módulo afetado:** SAM
- **Função/área:** Fluxo “Ver Prontuário” a partir de “Gestão de Alunos”
- **Comportamento esperado:** para perfis administrativos (ou perfis com permissão específica), o prontuário deveria abrir; ou a regra deveria estar explícita para indicar quem pode acessar.
- **Comportamento observado:** ao abrir “Pré-visualizar ficha”, o botão “Ver Prontuário” aparece desabilitado e é exibida a mensagem de falta de permissão.
- **Causa raiz provável:** política/checagem de permissão restritiva por perfil/permissão não concedida ao usuário de teste; ou premissa de que apenas “profissionais” devem acessar prontuário.
- **Recomendação de correção:** confirmar requisito de acesso (admin deve ou não acessar) e alinhar:
  - permissões/roles do sistema principal (seed de permissões do SAM, se aplicável),
  - bypass explícito para `superadmin` (se desejado),
  - mensagens de UI com instrução clara de como habilitar o acesso.

### 4) Sondagem sem dados-base essenciais (Períodos, Níveis, Metas)

- **Severidade:** Médio
- **Módulo afetado:** Sondagem
- **Função/área:** Configurações (Períodos), Dashboard/Relatórios (Níveis e metas)
- **Comportamento esperado:** o módulo deve iniciar com dados-base mínimos para operar (ou um fluxo guiado para criação do mínimo necessário).
- **Comportamento observado:** telas exibem estados vazios:
  - “Nenhum período cadastrado”
  - “Nenhum nível cadastrado”
  - “Nenhuma meta cadastrada”
  e algumas ações ficam desabilitadas por dependência desses cadastros.
- **Causa raiz provável:** ausência de seed/migração de dados de referência (`niveis_aprendizagem`, período inicial, metas opcional) no banco.
- **Recomendação de correção:**
  - criar uma migração de seed idempotente com níveis padrão de escrita/produção de texto,
  - adicionar um “wizard”/CTA no módulo apontando o passo a passo para habilitar o uso (criar período → criar níveis → criar metas opcional),
  - garantir mensagens de bloqueio com instrução objetiva (“Para lançar sondagens, cadastre um período em Configurações”).

### 5) Ruído de console com `net::ERR_ABORTED` em chamadas Supabase

- **Severidade:** Baixo
- **Módulo afetado:** Principal / SAM / Sondagem (observado durante navegação)
- **Função/área:** chamadas REST do Supabase (inclui `HEAD` e `GET`)
- **Comportamento esperado:** ausência de erros ruidosos em console durante navegação normal.
- **Comportamento observado:** múltiplos `net::ERR_ABORTED` associados a chamadas Supabase, sem impacto funcional evidente nas telas testadas.
- **Causa raiz provável:** requisições canceladas por mudança de rota, revalidação ou prefetch; o client registra como erro no console.
- **Recomendação de correção:** tratar aborts como condição esperada (ex.: ignorar AbortError/cancelamentos na camada de fetch/log), para reduzir falsos positivos durante suporte.

### 6) Warning de acessibilidade em `DialogContent`

- **Severidade:** Baixo
- **Módulo afetado:** UI (componentes de dialog)
- **Comportamento observado:** aviso `Missing Description or aria-describedby` ao abrir alguns dialogs.
- **Recomendação:** padronizar `DialogDescription` (ou `aria-describedby`) em dialogs.

## Testes de integração entre módulos

- **SSO / sessão compartilhada:** acesso ao SAM e Sondagem a partir do menu do sistema principal ocorreu sem solicitar novo login.
- **Voltar ao principal:** os links “Sistema Principal” dentro dos módulos retornam para `/admin` mantendo sessão.
- **Dados compartilhados (principal → módulos):**
  - Listagens em Sondagem (Alunos/Turmas/Instituições) exibiram dados do sistema principal (sem permitir edição/remoção, coerente com fonte única).

## Verificações de build

- `npm run build` executou com sucesso.
- Permanecem warnings não bloqueantes:
  - warnings ao minificar CSS (sintaxe envolvendo `button:hover` em seletores gerados)
  - avisos de import dinâmico/estático misto (chunking)

## Recomendações finais (ordem de execução)

1. **Acesso do Portal da Escola (SAM):** manter a restrição estrita por perfil `school_coord` e validar com um usuário real “Portal da Escola” vinculado a unidade.
2. **Tabela/configuração Make/Zapi (SAM):** decidir o storage (criar `integration_configs` no schema principal vs migrar para tabela existente) e ajustar o código/migrations.
3. **Dados-base do Sondagem:** adicionar seed/fluxo guiado para períodos e níveis, pois bloqueia o uso prático do módulo.
4. Reduzir ruído de console para facilitar suporte e triagem.


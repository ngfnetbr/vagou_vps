---
title: Plano de Treinamento — VAGOU
author: Equipe de Implantação
date: 2026-02-23
pdf_options:
  format: A4
  margin:
    top: 16mm
    right: 14mm
    bottom: 16mm
    left: 14mm
  displayHeaderFooter: true
  headerTemplate: "<div style='font-size:8px;color:#8a8a8a;padding-left:14mm;padding-right:14mm;width:100%;'></div>"
  footerTemplate: "<div style='font-size:8px;color:#8a8a8a;width:100%;padding-left:14mm;padding-right:14mm;'><div style='display:flex;justify-content:space-between;width:100%;'><span>VAGOU — Plano de Treinamento</span><span class='pageNumber'></span>/<span class='totalPages'></span></div></div>"
style: |
  h1, h2, h3 { page-break-after: avoid; }
  h1 { color: #0f3c9c; }
  h2 { color: #1351b4; }
  h3 { color: #1e498f; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; }
  th { background: #f2f5ff; }
  .cta { background: #1351b4; color: #fff; padding: 8px 10px; border-radius: 6px; display: inline-block; }
  .screenshot { border: 1px solid #e1e1e1; padding: 6px; font-size: 12px; color: #666; }
---

# Plano de Treinamento em Vídeos — VAGOU (Foco: Administradores)

Este documento descreve um curso completo, estruturado em módulos progressivos, voltado exclusivamente para perfis administrativos do VAGOU: superadmin, admin, gestor e diretor de CMEI em contexto administrativo. Cada vídeo possui duração estimada de 5–10 minutos. O roteiro inclui objetivos, contexto, passo a passo com pontos de captura de tela, exemplos, dicas, resumo, call-to-action e texto de narração sugerido para uso com IA.

## Índice

1. [Estrutura do Curso](#estrutura-do-curso)  
2. [Roteiro por Vídeo](#roteiro-por-vídeo)  
   - [Módulo 1: Visão geral e onboarding (Admin) — 3 vídeos](#módulo-1-visão-geral-e-onboarding-admin-—-3-vídeos)  
   - [Módulo 2: Funcionalidades básicas (Admin) — 5 vídeos](#módulo-2-funcionalidades-básicas-admin-—-5-vídeos)  
   - [Módulo 3: Funcionalidades intermediárias (Admin) — 5 vídeos](#módulo-3-funcionalidades-intermediárias-admin-—-5-vídeos)  
   - [Módulo 4: Recursos avançados (Admin) — 4 vídeos](#módulo-4-recursos-avançados-admin-—-4-vídeos)  
   - [Módulo 5: Troubleshooting e FAQ (Admin) — 3 vídeos](#módulo-5-troubleshooting-e-faq-admin-—-3-vídeos)  
3. [Guias Técnicos de Produção](#guias-técnicos-de-produção)  
4. [Cronograma de Produção](#cronograma-de-produção)  
5. [Métricas de Sucesso e Feedback](#métricas-de-sucesso-e-feedback)  

---

## Estrutura do Curso

- Público-alvo:  
  - Superadmin, Admin, Gestor, Diretor de CMEI (uso administrativo).  
- Formato: 20 vídeos (5–10 min cada), total 2–3 horas.  
- Progressão: básico → intermediário → avançado → suporte.  
- Abordagem: demonstração em ambiente real (preview), cenários reais e melhores práticas de operação, segurança e conformidade.

---

## Roteiro por Vídeo

### Módulo 1: Visão geral e onboarding (Admin) — 3 vídeos

1) Título: Apresentação do VAGOU para Administradores  
- Objetivos:  
  - Compreender o propósito do VAGOU no contexto administrativo.  
  - Identificar perfis de acesso e áreas administrativas.  
- Introdução (problema): Processos manuais e sem rastreabilidade dificultam a gestão de vagas.  
- Passo a passo detalhado (UI):  
  1. Abra o navegador e acesse `http://localhost:8080/`.  
  2. Efetue login com uma conta de administrador.  
  3. No menu lateral, clique em “Admin” para abrir o painel principal.  
  4. Passe o cursor sobre o menu para ver as seções: “Dashboard”, “CMEIs”, “Turmas”, “Fila”, “Matrículas”, “Auditoria”, “Configurações”.  
  5. Clique em “Dashboard” e identifique os cards de KPIs, gráficos e atalhos.  
  6. Clique em “CMEIs” e confirme a listagem de unidades.  
  7. Clique em “Turmas” e observe como as turmas se relacionam com os CMEIs.  
  8. Volte ao “Dashboard” usando o breadcrumb ou o menu lateral.  
  9. Aperte F11 para gravação em tela cheia e ocultar distrações visuais.  
  10. Finalize reforçando onde ficam as seções-chave.  
- Capturas sugeridas:  
  - [M1V1-01] Dashboard Admin (visão geral).  
  - [M1V1-02] Menu lateral com seções destacadas.  
- Exemplos:  
  - Como um gestor monitora indicadores de ocupação e fila.  
- Dicas/erros comuns:  
  - Diferenciar ambientes de homologação e produção; usar dados fictícios.  
- Resumo: visão macro; próximos passos: acesso e cadastro.  
- CTA: Ir para “Acesso de Administradores”.

Narração sugerida:  
“Bem-vindo ao VAGOU, a plataforma de gestão de vagas em CMEIs. Neste vídeo, você conhecerá o ambiente administrativo: como navegar pelo painel, onde encontrar os principais indicadores e quais seções utilizar no dia a dia. Nosso foco é oferecer rastreabilidade, padronização e eficiência em todas as etapas do processo.”

Narração estendida (IA):  
“Abra o navegador e acesse o endereço do sistema. Faça login com um perfil administrativo. Ao entrar, observe o painel principal: no lado esquerdo, o menu apresenta as áreas de trabalho que usaremos ao longo do curso. Clique no Dashboard para visualizar indicadores de fila, convocações e matrículas. Em seguida, explore rapidamente as páginas de CMEIs e Turmas para entender como a oferta é estruturada. Retorne ao Dashboard e memorize o caminho para cada seção. Esse mapa mental será útil nos próximos vídeos.”  

2) Título: Acesso de Administradores e Perfis  
- Objetivos:  
  - Entender perfis administrativos e controle de acesso.  
- Introdução: Privilégios corretos evitam erros operacionais.  
- Passo a passo detalhado (UI):  
  1. No canto superior direito, clique no avatar para abrir “Perfil”.  
  2. Verifique as “Funções” atribuídas (ex.: admin, gestor, diretor_cmei).  
  3. Clique em “Sair” e refaça login para demonstrar persistência de sessão.  
  4. Acesse uma rota administrativa via URL direta e mostre a proteção de rota.  
  5. Demonstre que usuários sem papel adequado são redirecionados.  
  6. Explique o uso de contas de menor privilégio para tarefas rotineiras.  
  7. Mostre a página de erro ou redirecionamento para /publico em caso de acesso negado.  
  8. Volte ao perfil e reforce como reportar mudanças de papéis à equipe de TI.  
- Capturas sugeridas:  
  - [M1V2-01] Perfil do usuário com papéis.  
  - [M1V2-02] Tentativa de acesso negado com redirecionamento.  
- Exemplos:  
  - Concessão de papel “diretor_cmei” a um usuário.  
- Dicas/erros comuns:  
  - Não utilizar contas de alto privilégio para tarefas simples.  
- Resumo: perfis e permissões compreendidos.  
- CTA: “Configurar a base: CMEIs e turmas”.

Narração sugerida:  
“Para garantir segurança e organização, o VAGOU diferencia o acesso por papéis. Ao autenticar, cada usuário visualiza apenas as áreas compatíveis com seu perfil. Como administrador, você pode controlar o acesso a dashboards, filas, matrículas e configurações, mantendo o ambiente protegido e auditável.”

Narração estendida (IA):  
“Acesse o seu perfil pelo avatar e confira as funções atribuídas. Selecione Sair para demonstrar a política de sessão e, na sequência, autentique novamente. Tente visitar uma rota administrativa diretamente pela barra de endereços: usuários sem permissão serão redirecionados automaticamente. Mantenha a operação diária em contas de privilégio adequado e evite o uso de superadmin para tarefas simples.”  

3) Título: Preparação de Ambiente e Boas Práticas de Uso  
- Objetivos:  
  - Preparar ambiente de demonstração e padrões de operação.  
- Introdução: Bases bem preparadas evitam retrabalho.  
- Passo a passo detalhado (UI):  
  1. No menu, clique em “Configurações”.  
  2. Revise campos de inscrição e prioridades ativas.  
  3. Defina nomenclaturas padrão para turmas e unidades.  
  4. Confirme as preferências de notificação e e-mail.  
  5. Crie um pequeno conjunto de dados de teste em “CMEIs” e “Turmas”.  
  6. Valide as permissões simulando um usuário diretor_cmei.  
  7. Registre um checklist interno de implantação.  
- Capturas sugeridas:  
  - [M1V3-01] Tela de Configurações gerais.  
  - [M1V3-02] Lista de turmas com nomenclatura padronizada.  
- Exemplos:  
  - Checklists para início do ano letivo.  
- Dicas/erros comuns:  
  - Sempre documentar alterações estruturais.  
- Resumo e CTA: “CMEIs e turmas”.

Narração sugerida:  
“Antes de operar, padronize seu ambiente: utilize dados de demonstração para treinamentos, defina nomenclaturas e registre mudanças importantes. Assim, a equipe aprende de forma segura e a operação permanece consistente.”

Narração estendida (IA):  
“Clique em Configurações para revisar os campos e prioridades. Padronize as nomenclaturas de turmas e unidades para facilitar a leitura de relatórios. Em seguida, cadastre dados de teste em CMEIs e Turmas e valide permissões com um perfil de diretor. Mantenha um checklist de implantação para garantir repetibilidade do processo.”  

### Módulo 2: Funcionalidades básicas (Admin) — 5 vídeos

4) Título: Gestão de CMEIs — Cadastro e Edição  
- Objetivos:  
  - Cadastrar e manter dados das unidades.  
- Introdução: Cadastro correto impacta fila e matrículas.  
- Passo a passo detalhado (UI):  
  1. Clique em “CMEIs”.  
  2. Clique em “Novo CMEI”.  
  3. Preencha “Nome”, “Endereço”, “Contato” e “Horário de atendimento”.  
  4. Selecione a “Zona de Atendimento” adequada.  
  5. Clique em “Salvar” e verifique a unidade na listagem.  
  6. Clique no CMEI cadastrado para “Editar” e ajuste algum campo.  
  7. Clique em “Salvar” novamente e confirme a atualização.  
  8. Use o campo de busca para localizar a unidade pelo nome.  
  9. Exporte/importe dados (se disponível) para manter registros atualizados.  
  10. Documente alterações relevantes em um log interno.  
- Capturas sugeridas:  
  - [M2V4-01] Formulário de novo CMEI preenchido.  
  - [M2V4-02] Edição de CMEI com destaque na zona.  
- Exemplos:  
  - Inclusão de novo CMEI com vínculo a zona.  
- Dicas:  
  - Conferir geolocalização, horários e contatos.  
- Resumo e CTA: “Turmas”.

Narração sugerida:  
“Os CMEIs são a base da alocação de vagas. Mantenha seus dados atualizados, associando cada unidade às zonas de atendimento e conferindo informações essenciais como endereço e contato.”

Narração estendida (IA):  
“Clique em CMEIs, selecione Novo CMEI e preencha os campos básicos. Associe a zona de atendimento correta para garantir distribuição de vagas adequada. Salve, edite para revisar algum dado e confirme a atualização. Utilize a busca para validar que a unidade aparece como esperado.”  

5) Título: Turmas — Criação, Parâmetros e Ocupação  
- Objetivos:  
  - Criar e editar turmas; definir limites e faixas etárias.  
- Introdução: Turmas organizam a oferta de vagas.  
- Passo a passo detalhado (UI):  
  1. Clique em “Turmas”.  
  2. Clique em “Nova Turma”.  
  3. Informe o CMEI, o nome da turma e a faixa etária.  
  4. Defina a capacidade máxima de vagas.  
  5. Clique em “Salvar” e verifique a nova turma na listagem.  
  6. Abra a turma e confira a “Ocupação Atual”.  
  7. Edite a capacidade ou o período, se necessário, e salve.  
  8. Use filtros por CMEI/faixa etária para localizar turmas específicas.  
  9. Valide se há impacto em convocações já planejadas.  
  10. Registre a alteração no seu checklist de operação.  
- Capturas sugeridas:  
  - [M2V5-01] Formulário de nova turma.  
  - [M2V5-02] Painel de ocupação da turma.  
- Exemplos:  
  - Abrir turma temporária em período de alta demanda.  
- Dicas:  
  - Atenção aos limites por faixa etária e à integração com CMEIs.  
- Resumo e CTA: “Fila interna”.

Narração sugerida:  
“Cadastre turmas conforme a necessidade do seu município, observando faixa etária, capacidade e calendário. Uma estrutura de turmas bem planejada facilita a gestão da fila e das matrículas.”

6) Título: Fila Interna — Navegação, Filtros e Busca  
- Objetivos:  
  - Filtrar e ordenar a fila; localizar registros por nome/CPF.  
- Introdução: Fila organizada acelera decisões.  
- Passo a passo detalhado (UI):  
  1. Clique em “Fila”.  
  2. Aplique o filtro “Prioridade: Social” e observe a lista.  
  3. Altere para “Prioridade: Remanejamento” e compare resultados.  
  4. No filtro “CMEI”, selecione uma unidade específica.  
  5. No campo “Busca”, digite parte do nome ou CPF.  
  6. Ordene por “Posição” para validar o cálculo da fila.  
  7. Abra um registro e verifique “Histórico” e “Preferências”.  
  8. Retorne à listagem e limpe os filtros.  
  9. Exporte os resultados (se disponível) para análise externa.  
  10. Registre insights sobre o perfil de demanda.  
- Capturas sugeridas:  
  - [M2V6-01] Filtros aplicados na fila.  
  - [M2V6-02] Detalhe de um registro selecionado.  
- Exemplos:  
  - Localizar casos prioritários por critério social.  
- Dicas:  
  - Diferenciar priorização ativa x desativada.  
- Resumo e CTA: “Convocação”.

Narração sugerida:  
“Use os filtros de fila para priorizar casos sociais, remanejamentos e destinos específicos. A busca por CPF ajuda na tomada de decisão rápida em situações operacionais.”

7) Título: Convocação Básica — Prazos e Comunicação  
- Objetivos:  
  - Realizar convocação individual; definir prazos; disparar notificações.  
- Introdução: Convocação eficiente reduz ociosidade.  
- Passo a passo detalhado (UI):  
  1. Em “Fila”, selecione um registro com status elegível.  
  2. Clique no botão “Convocar”.  
  3. No diálogo, defina o “Prazo em dias” (ex.: 3 dias).  
  4. Clique em “Confirmar Convocação”.  
  5. Aguarde a confirmação visual (toast de sucesso).  
  6. Acesse o “Histórico” do registro e confirme a ação gravada.  
  7. Verifique se a notificação foi marcada como enviada.  
  8. Registre observações internas, se necessário.  
  9. Caso precise cancelar, use a ação “Reverter” (se disponível).  
  10. Atualize a fila e monitore a resposta do responsável.  
- Capturas sugeridas:  
  - [M2V7-01] Diálogo de convocação.  
  - [M2V7-02] Histórico com registro da convocação.  
- Exemplos:  
  - Convocação de um caso prioritário.  
- Dicas:  
  - Evitar convocações duplicadas; ajustar prazos por contexto.  
- Resumo e CTA: “Convocação em lote”.

Narração sugerida:  
“Ao convocar, defina prazos realistas e garanta a comunicação clara. Registre o histórico para auditar decisões e evitar divergências.”

8) Título: Convocação em Lote — Critérios e Boas Práticas  
- Objetivos:  
  - Convocar múltiplos registros com critérios consistentes.  
- Introdução: Acelera a ocupação de vagas.  
- Passo a passo detalhado (UI):  
  1. Em “Fila”, aplique filtros para o grupo desejado (ex.: CMEI X).  
  2. Selecione múltiplos registros pela caixa de seleção.  
  3. Clique em “Convocar em Lote”.  
  4. Informe o prazo (ex.: 5 dias) no diálogo.  
  5. Clique em “Confirmar”.  
  6. Aguarde o feedback visual e registre a ação no histórico.  
  7. Verifique o envio de notificações para cada registro.  
  8. Exporte a lista para controle interno (se aplicável).  
  9. Monitore diariamente as respostas.  
  10. Ajuste filtros para novas rodadas, se necessário.  
- Capturas sugeridas:  
  - [M2V8-01] Seleção múltipla na fila.  
  - [M2V8-02] Diálogo de convocação em lote.  
- Exemplos:  
  - Lote por CMEI e faixa etária.  
- Dicas:  
  - Validar critérios antes do envio; comunicar prazos com clareza.  
- Resumo e CTA: “Matrículas”.

Narração sugerida:  
“Convocações em lote são úteis em picos de demanda. Defina critérios objetivos, registre o histórico e acompanhe as respostas para completar vagas rapidamente.”

### Módulo 3: Funcionalidades intermediárias (Admin) — 5 vídeos

9) Título: Indicadores e Métricas do Painel Admin  
- Objetivos:  
  - Interpretar gráficos e KPIs para tomada de decisão.  
- Introdução: Dados orientam priorização de ações.  
- Passo a passo detalhado (UI):  
  1. Clique em “Dashboard”.  
  2. Identifique os KPIs principais (Fila, Convocações, Matrículas).  
  3. Clique no filtro temporal e selecione “Últimos 30 dias”.  
  4. Analise gráficos de evolução da fila e ocupação.  
  5. Clique em um KPI para ver detalhamento (se disponível).  
  6. Exporte um gráfico em imagem/PDF (se aplicável).  
  7. Registre insights para o comitê de gestão.  
- Capturas sugeridas:  
  - [M3V9-01] Dashboard com filtros aplicados.  
  - [M3V9-02] Gráfico de evolução da fila em destaque.  
- Exemplos:  
  - Identificar pico de inscrições por período.  
- Dicas:  
  - Revisar dados após grandes campanhas de inscrição.  
- Resumo e CTA: “Documentos e validação”.

Narração sugerida:  
“Use as métricas do painel para enxergar gargalos e oportunidades. Dados históricos e filtros temporais ajudam a planejar convocações e abertura de turmas.”

10) Título: Documentos — Recebimento e Validação  
- Objetivos:  
  - Gerir pendências de documentos; aprovar/reprovar.  
- Introdução: Conformidade e rastreabilidade documental.  
- Passo a passo detalhado (UI):  
  1. Clique em “Documentos”.  
  2. Filtro “Pendentes” para exibir somente itens aguardando análise.  
  3. Clique no documento, amplie e verifique legibilidade.  
  4. Clique em “Aprovar” ou “Reprovar”.  
  5. Em caso de reprovação, informe o motivo detalhado.  
  6. Salve e confirme a atualização do status.  
  7. Verifique a geração de histórico para auditoria.  
  8. Notifique o responsável conforme políticas vigentes.  
- Capturas sugeridas:  
  - [M3V10-01] Lista de pendências.  
  - [M3V10-02] Diálogo de aprovação/reprovação.  
- Exemplos:  
  - Reprovar por legibilidade insuficiente com orientação.  
- Dicas:  
  - Padronizar critérios de validação e prazos de retorno.  
- Resumo e CTA: “Matrículas”.

Narração sugerida:  
“A validação de documentos garante segurança e conformidade. Registre sempre o motivo da reprovação e ofereça orientação clara para reenvio.”

11) Título: Matrículas — Fluxo e Confirmação  
- Objetivos:  
  - Avançar do status convocado para matrícula confirmada.  
- Introdução: Concluir o ciclo reduz churn de vagas.  
- Passo a passo detalhado (UI):  
  1. Clique em “Matrículas”.  
  2. Selecione o registro “Convocado”.  
  3. Valide se todos os documentos foram aprovados.  
  4. Clique em “Confirmar Matrícula”.  
  5. Se houver, registre aceite/assinatura conforme o fluxo.  
  6. Confirme a turma e a vaga ocupada.  
  7. Verifique a atualização do status e histórico.  
- Capturas sugeridas:  
  - [M3V11-01] Confirmação de matrícula.  
  - [M3V11-02] Registro no histórico pós-confirmação.  
- Exemplos:  
  - Matrícula com exigência complementar atendida.  
- Dicas:  
  - Garantir coerência entre turma, idade e vagas.  
- Resumo e CTA: “Remanejamento”.

Narração sugerida:  
“Finalize matrículas de forma rastreável. Assegure que critérios de elegibilidade, turma e disponibilidade de vagas estejam corretos antes da confirmação.”

12) Título: Remanejamento — Critérios e Procedimentos  
- Objetivos:  
  - Transferir registros entre turmas/CMEIs mantendo histórico.  
- Introdução: Ajustes de ocupação ao longo do ano letivo.  
- Passo a passo detalhado (UI):  
  1. Clique em “Matrículas” ou “Fila” (conforme o fluxo vigente).  
  2. Abra o registro e clique em “Remanejar”.  
  3. Selecione o CMEI/turma de destino.  
  4. Informe a justificativa.  
  5. Clique em “Confirmar Remanejamento”.  
  6. Verifique a atualização do histórico.  
  7. Notifique o CMEI de destino se necessário.  
- Capturas sugeridas:  
  - [M3V12-01] Diálogo de remanejamento.  
  - [M3V12-02] Histórico com justificativa registrada.  
- Exemplos:  
  - Remanejamento por mudança de endereço.  
- Dicas:  
  - Alinhar com CMEI de destino para evitar conflitos.  
- Resumo e CTA: “Auditoria e logs”.

Narração sugerida:  
“Remanejamentos bem documentados mantêm a ocupação equilibrada. Priorize a comunicação com as unidades envolvidas e registre a justificativa.”

13) Título: Auditoria e Logs — Conformidade e Rastreamento  
- Objetivos:  
  - Consultar histórico de ações e identificar responsáveis.  
- Introdução: Transparência e governança.  
- Passo a passo detalhado (UI):  
  1. Clique em “Auditoria” ou “Logs”.  
  2. Aplique filtro por usuário.  
  3. Aplique filtro por data específica.  
  4. Abra um registro para ver detalhes da ação.  
  5. Exporte evidências para compliance (se aplicável).  
- Capturas sugeridas:  
  - [M3V13-01] Filtros por usuário e data.  
  - [M3V13-02] Detalhe de ação com dados antigos/novos.  
- Exemplos:  
  - Investigação de alteração de status em lote.  
- Dicas:  
  - Revisar periodicamente ações sensíveis.  
- Resumo e CTA: “Configurações”.

Narração sugerida:  
“A auditoria mostra quem fez o quê e quando. Use essa visão para garantir conformidade, esclarecer dúvidas e melhorar processos.”

### Módulo 4: Recursos avançados (Admin) — 4 vídeos

14) Título: Configurações — Campos, Prioridades e Templates  
- Objetivos:  
  - Ajustar campos de inscrição, prioridades e mensagens.  
- Introdução: Padronização acelera processos.  
- Passo a passo detalhado (UI):  
  1. Clique em “Configurações”.  
  2. Acesse “Campos de Inscrição” e edite rótulos/validações.  
  3. Habilite/Desabilite prioridades conforme política municipal.  
  4. Acesse “Templates de Mensagem” e ajuste o conteúdo padrão.  
  5. Salve e documente a alteração.  
- Capturas sugeridas:  
  - [M4V14-01] Lista de campos de inscrição.  
  - [M4V14-02] Editor de template aberto.  
- Exemplos:  
  - Criação de formulário para novo ano letivo.  
- Dicas:  
  - Versionar alterações; testar em ambiente de homologação.  
- Resumo e CTA: “Integrações e notificações”.

Narração sugerida:  
“Centralize as regras do seu processo nas configurações: campos, prioridades e mensagens padronizadas. Teste mudanças antes de ir a produção.”

15) Título: Integrações e Notificações — Visão Geral  
- Objetivos:  
  - Entender o disparo de notificações e integrações.  
- Introdução: Comunicação confiável melhora adesão.  
- Passo a passo detalhado (UI):  
  1. Clique em “Configurações” > “Notificações”.  
  2. Revise canais habilitados (e-mail, SMS, app).  
  3. Configure janelas de envio para evitar horários inoportunos.  
  4. Verifique logs de entrega (se disponíveis).  
  5. Ajuste mensagens padrão para convocações.  
- Capturas sugeridas:  
  - [M4V15-01] Painel de notificações.  
  - [M4V15-02] Log de envios.  
- Exemplos:  
  - Notificação de convocação com prazo.  
- Dicas:  
  - Estabelecer janelas de envio e mensagens claras.  
- Resumo e CTA: “Transição anual”.

Narração sugerida:  
“Notificações eficazes aceleram a confirmação de vagas. Planeje janelas de envio e monitore retornos para ajustar sua estratégia.”

16) Título: Transição Anual — Planejamento e Execução  
- Objetivos:  
  - Planejar mudanças de ano letivo e atualização de dados.  
- Introdução: Reduzir impacto na operação diária.  
- Passo a passo detalhado (UI):  
  1. Em “Turmas”, planeje novas lotações e faixas etárias.  
  2. Em “Configurações”, ajuste campos e prazos.  
  3. Comunique o cronograma à equipe por e-mail/notificação interna.  
  4. Valide em homologação e só então aplique em produção.  
  5. Monitore os primeiros dias da virada.  
- Capturas sugeridas:  
  - [M4V16-01] Checklist de transição.  
  - [M4V16-02] Ajuste de faixas etárias em turma.  
- Exemplos:  
  - Ajuste de faixas etárias e lotação.  
- Dicas:  
  - Validar em homologação antes de ativar em produção.  
- Resumo e CTA: “Boas práticas de segurança”.

Narração sugerida:  
“A transição anual é o momento de alinhar turmas, campos e prazos. Antecipe as mudanças, teste e comunique a equipe para garantir continuidade.”

17) Título: Segurança Operacional — Acesso, Sessão e Boas Práticas  
- Objetivos:  
  - Reforçar práticas de segurança no uso diário.  
- Introdução: Proteção de dados e redução de riscos.  
- Passo a passo detalhado (UI):  
  1. Revise “Perfis e Acessos” periodicamente.  
  2. Demonstre política de inatividade com logout automático.  
  3. Analise logs de ações críticas.  
  4. Revogue acessos obsoletos.  
  5. Registre um relatório mensal de segurança.  
- Capturas sugeridas:  
  - [M4V17-01] Preferências de sessão e papéis.  
  - [M4V17-02] Logs de ações críticas.  
- Exemplos:  
  - Revogação de acesso por término de contrato.  
- Dicas:  
  - Agendar auditorias periódicas de acesso.  
- Resumo e CTA: “Troubleshooting”.

Narração sugerida:  
“Segurança é responsabilidade de todos. Revise acessos, monitore sessões e mantenha a rastreabilidade por meio dos logs e da auditoria.”

### Módulo 5: Troubleshooting e FAQ (Admin) — 3 vídeos

18) Título: Erros Comuns de Operação — Diagnóstico Rápido  
- Objetivos:  
  - Resolver rapidamente os problemas mais frequentes.  
- Introdução: Reduzir chamados recorrentes.  
- Passo a passo detalhado (UI):  
  1. Falha de login: conferir e-mail/senha e status de usuário.  
  2. Duplicidade de CPF: buscar por CPF em “Fila”/“Matrículas”.  
  3. Prazo expirado: verificar histórico da convocação e reabrir se cabível.  
  4. Documentos ilegíveis: reprovar com orientação clara de reenviar.  
  5. Notificação não entregue: checar contatos e tentar reenvio.  
- Capturas sugeridas:  
  - [M5V18-01] Mensagem de erro de login.  
  - [M5V18-02] Histórico com prazo expirado.  
- Exemplos:  
  - Documentos ilegíveis; convocações não entregues.  
- Dicas:  
  - Atualizar contatos; revisar logs e histórico.  
- Resumo e CTA: “FAQ admin”.

Narração sugerida:  
“Nos atendimentos do dia a dia, use esta checklist para acelerar diagnósticos: verifique permissões, dados de contato e histórico de ações antes de escalar o problema.”

19) Título: FAQ — Administração e Direção  
- Objetivos:  
  - Responder perguntas recorrentes de admins e diretores.  
- Introdução: Aumentar autonomia e reduzir retrabalho.  
- Passo a passo detalhado (UI):  
  1. Onde vejo os critérios da fila? Acesse “Fila” e abra “Ajuda”.  
  2. Como habilitar prioridade social? “Configurações” > “Prioridades”.  
  3. Onde auditamos mudanças? “Auditoria/Logs”.  
  4. Como suspender inscrições temporariamente? “Configurações” > “Campos/Prazos”.  
- Capturas sugeridas:  
  - [M5V19-01] Filtros de fila em destaque.  
  - [M5V19-02] Logs filtrados por usuário.  
- Exemplos:  
  - Quando reabrir inscrições; suspender temporariamente.  
- Dicas:  
  - Avaliar impactos antes de alterar campos e prioridades.  
- Resumo e CTA: “Encerramento do curso”.

Narração sugerida:  
“Nesta seção, consolidamos as dúvidas mais comuns na administração do VAGOU. Consulte antes de acionar suporte: muitas respostas estão ao seu alcance.”

20) Título: Encerramento — Próximos Passos e Melhoria Contínua  
- Objetivos:  
  - Consolidar aprendizados e orientar próximos passos.  
- Introdução: Ciclo de melhoria contínua.  
- Passo a passo detalhado (UI):  
  1. Relembre as áreas: CMEIs, Turmas, Fila, Convocações, Matrículas, Auditoria, Configurações.  
  2. Indique materiais internos e responsáveis por cada frente.  
  3. Sugira rotina de revisões trimestrais.  
  4. Reforce a coleta de métricas e feedback.  
- Capturas sugeridas:  
  - [M5V20-01] Roadmap/cronograma interno.  
- Exemplos:  
  - Planejamento de revisões trimestrais.  
- Dicas:  
  - Medir métricas de sucesso após treinamentos.  
- Resumo e CTA: encerramento do curso e convite a feedback.

Narração sugerida:  
“Parabéns por concluir o curso. Reforce o aprendizado com a prática diária e participe do ciclo de melhoria contínua, trazendo dados e sugestões para evoluirmos o processo.”

---

## Guias Técnicos de Produção

### Preparação do Ambiente de Gravação
- Software de captura: OBS Studio (perfil 1080p, 30 fps, bitrate 6–8 Mbps).  
- Navegador: Chrome/Edge atualizado, janela limpa e zoom 100%.  
- Ambiente do sistema: usar dados de demonstração; ocultar informações sensíveis.  
- Monitor: 1920×1080, tema claro, fonte legível, tamanho do sistema 100%.  

### Configurações de Áudio e Vídeo
- Microfone condensador com pop-filter; taxa de amostragem 48 kHz; ruído reduzido.  
- Nível de pico entre −6 dB e −3 dB; normalizar na pós.  
- WebCam (opcional): 720p/1080p, boa iluminação frontal (temperatura ~5000K).  

### Templates de Introdução e Encerramento
- Introdução (5–10s):  
  - Logo VAGOU + Título do vídeo + Objetivos em 2 bullets.  
- Encerramento (10–15s):  
  - Resumo 2–3 bullets + CTA para próximo vídeo + link para materiais.  

### Checklist de Qualidade (Pré-Publicação)
- Áudio claro, sem ruído, volumes consistentes.  
- Cursor e foco visíveis; zoom quando necessário.  
- Legendas adicionadas (VTT/SRT) e revisadas.  
- Título, descrição e capítulos no player.  
- Thumb padronizada com numeração do vídeo e módulo.  

---

## Cronograma de Produção

| Semana | Atividade | Entregáveis |
|-------:|-----------|-------------|
| 1 | Roteiros Módulos 1–2 | Roteiros aprovados |
| 2 | Gravação Módulos 1–2 | Vídeos brutos |
| 3 | Edição Módulos 1–2 | Versões finais (6–8 vídeos) |
| 4 | Roteiros Módulos 3–4 | Roteiros aprovados |
| 5 | Gravação Módulos 3–4 | Vídeos brutos |
| 6 | Edição Módulos 3–4 | Versões finais (9–12 vídeos) |
| 7 | Módulo 5 (roteiro, gravação, edição) | Versões finais (3 vídeos) |
| 8 | Revisão geral e publicação | Playlist completa |

---

## Métricas de Sucesso e Feedback

- Métricas:  
  - Retenção média ≥ 60%; taxa de conclusão ≥ 40%; feedback ≥ 4/5.  
  - Redução de chamados por dúvidas básicas ≥ 30% após 60 dias.  
- Coleta de Feedback:  
  - Formulário pós-vídeo (NPS, utilidade, clareza).  
  - A/B de títulos e thumbs em 3 primeiros vídeos.  
- Melhoria Contínua:  
  - Revisar vídeos diante de mudanças relevantes no sistema.  

---

### Template de Roteiro (copiar e colar)

**Título**:  
**Duração**: 5–10 min  
**Objetivos**:  
-  
-  
**Introdução (contexto/problema)**:  
**Passo a passo (com pontos de captura)**:  
1.  
2.  
3.  
> [Captura] descrição da tela/ação  
**Exemplos práticos**:  
-  
**Dicas e erros comuns**:  
-  
**Resumo**:  
-  
**CTA (próximo vídeo)**:  

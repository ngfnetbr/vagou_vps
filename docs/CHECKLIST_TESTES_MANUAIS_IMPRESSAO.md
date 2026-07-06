# Checklist de Testes Manuais - VAGOU

Documento preparado para impressao e preenchimento manual durante a execucao dos testes.

---

## Identificacao

- Projeto:
- Ambiente:
- Municipio:
- Data:
- Testador(a):
- Versao do sistema:

## Legenda

- `[ ]` Nao testado
- `[x]` Aprovado
- `[!]` Aprovado com observacao
- `[n/a]` Nao se aplica
- `[falha]` Reprovado

## Evidencia minima por falha

- Tela/rota:
- Perfil usado:
- Massa de dados:
- Passos executados:
- Resultado esperado:
- Resultado obtido:
- Severidade: Baixa / Media / Alta / Critica

---

## Preparacao

- [ ] Separar contas de teste por perfil: `superadmin`, `admin`, `gestor`, `diretor_cmei`, `responsavel`, usuario `SAM` e usuario `Sondar`.
- [ ] Separar massa de dados de teste: 2 CMEIs, 3 turmas, 2 criancas novas, 1 crianca com prioridade e 1 responsavel sem cadastro.
- [ ] Separar arquivos para upload: PDF valido, JPG valido, arquivo invalido, arquivo grande e documento ilegivel.
- [ ] Validar em `desktop` e `mobile`.
- [ ] Se possivel, validar em `Chrome` e `Edge`.
- [ ] Registrar print ou evidencia para qualquer erro encontrado.

---

## 1. Checklist Geral

- [ ] Sistema carrega sem tela branca, travamento ou erro visivel.
- [ ] Menus, links, botoes voltar e redirecionamentos funcionam corretamente.
- [ ] Mensagens de sucesso, erro, loading e vazio aparecem corretamente.
- [ ] Tabelas possuem busca, filtro, ordenacao e paginacao funcionando.
- [ ] Formularios validam campos obrigatorios, formatos invalidos e limites.
- [ ] Dados salvos permanecem corretos apos atualizar a pagina.
- [ ] Login, logout e expiracao de sessao funcionam corretamente.
- [ ] Usuario sem permissao nao acessa tela nem URL direta.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 2. Portal Publico

### Home Publica

- [ ] A home publica abre corretamente.
- [ ] Links para inscricao, fila, ocupacao, consulta, contato, termos, privacidade e download funcionam.
- [ ] Nao ha textos quebrados, imagens ausentes ou componentes desalinhados.

### Nova Inscricao

- [ ] Formulario abre corretamente.
- [ ] Cadastro com dados validos conclui com sucesso.
- [ ] Campos obrigatorios impedem envio quando vazios.
- [ ] CPF, CEP, telefone e datas validam formato corretamente.
- [ ] Selecao de 1 ou 2 preferencias de CMEI funciona.
- [ ] Upload de documentos aceita arquivos validos.
- [ ] Upload rejeita arquivo invalido ou acima do limite.
- [ ] Comprovante e/ou confirmacao final e exibido corretamente.

### Fila Publica

- [ ] Tela abre sem erro.
- [ ] Filtros por CMEI e turma funcionam.
- [ ] Posicao, status, prioridade e prazo sao exibidos corretamente.
- [ ] Dados batem com a visao administrativa para o mesmo caso.

### Ocupacao Publica

- [ ] Lista de CMEIs e exibida corretamente.
- [ ] Capacidade, ocupacao e disponibilidade aparecem corretamente.
- [ ] Endereco e contato das unidades aparecem sem falhas.

### Consulta por CPF

- [ ] CPF existente retorna registros corretos.
- [ ] CPF inexistente retorna mensagem adequada.
- [ ] CPF invalido ou incompleto exibe validacao.

### Contato, Termos e Privacidade

- [ ] Formulario de contato envia corretamente.
- [ ] Campos obrigatorios do contato sao validados.
- [ ] Termos de uso carregam corretamente.
- [ ] Politica de privacidade carrega corretamente.
- [ ] Pagina de download abre corretamente.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 3. Autenticacao

- [ ] Login com credenciais validas redireciona para a area correta.
- [ ] Login com senha incorreta exibe erro apropriado.
- [ ] Login com e-mail invalido exibe validacao.
- [ ] Campos vazios impedem envio do formulario.
- [ ] Cadastro de novo responsavel funciona.
- [ ] Cadastro bloqueia duplicidade quando aplicavel.
- [ ] Recuperar senha funciona corretamente.
- [ ] Redefinir senha funciona corretamente.
- [ ] Logout encerra a sessao corretamente.
- [ ] Usuario nao autenticado nao acessa area protegida.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 4. Area do Responsavel

### Dashboard

- [ ] Painel abre corretamente.
- [ ] Lista de criancas vinculadas aparece corretamente.
- [ ] Posicao na fila e status aparecem corretamente.
- [ ] Alertas de convocacao e prazos aparecem corretamente.

### Nova Inscricao Logada

- [ ] Responsavel autenticado consegue criar nova inscricao.
- [ ] Dados ficam vinculados corretamente ao perfil do responsavel.

### Documentos

- [ ] Upload de documentos funciona.
- [ ] Reenvio de documentos funciona.
- [ ] Status de pendente, aprovado e recusado aparece corretamente.

### Fila, Ocupacao e Perfil

- [ ] Tela de fila do responsavel funciona.
- [ ] Tela de ocupacao do responsavel funciona.
- [ ] Edicao de perfil salva corretamente.
- [ ] Alteracao de senha/dados reflete corretamente apos salvar.

### Notificacoes e Mensagens

- [ ] Historico de notificacoes abre corretamente.
- [ ] Mensagens/chat funcionam, se habilitados.

### Convocacao e Matricula

- [ ] Responsavel visualiza convocacao recebida.
- [ ] Aceite de convocacao funciona.
- [ ] Recusa de convocacao funciona.
- [ ] Escolha de turma, quando disponivel, funciona.
- [ ] Confirmacao de matricula atualiza o status corretamente.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 5. Area Administrativa

### Dashboard

- [ ] Dashboard admin abre corretamente.
- [ ] Indicadores e numeros sao coerentes com o sistema.
- [ ] Atalhos e cards direcionam para as telas corretas.

### CMEIs

- [ ] Criar CMEI funciona.
- [ ] Editar CMEI funciona.
- [ ] Ativar/desativar CMEI funciona.
- [ ] Alteracoes refletem nas telas relacionadas.

### Turmas

- [ ] Criar turma funciona.
- [ ] Editar turma funciona.
- [ ] Capacidade, turno e faixa etaria salvam corretamente.
- [ ] Detalhe da turma abre corretamente.

### Fila de Espera

- [ ] Listagem abre corretamente.
- [ ] Busca e filtros funcionam.
- [ ] Ordenacao funciona.
- [ ] Convocacao individual funciona.
- [ ] Convocacao em lote funciona.
- [ ] Sistema evita acao duplicada indevida.
- [ ] Status e prazos sao atualizados corretamente.

### Criancas

- [ ] Listagem abre corretamente.
- [ ] Busca e filtros funcionam.
- [ ] Detalhe da crianca abre corretamente.
- [ ] Edicao de dados salva corretamente.
- [ ] Historico, prioridades e documentos aparecem corretamente.

### Matriculas

- [ ] Lista de matriculas abre corretamente.
- [ ] Matricula confirmada aparece corretamente.
- [ ] Transferencia ou realocacao funcionam, se habilitadas.
- [ ] Trancamento funciona, se habilitado.

### Validacao de Documentos

- [ ] Lista de documentos pendentes abre corretamente.
- [ ] Aprovar documento funciona.
- [ ] Recusar documento com motivo funciona.
- [ ] Responsavel visualiza o reflexo da aprovacao/reprovacao.

### Configuracoes

- [ ] Dados gerais do municipio salvam corretamente.
- [ ] Periodo de inscricao salva corretamente.
- [ ] Prazos padrao salvam corretamente.
- [ ] Campos de inscricao podem ser alterados corretamente.
- [ ] Prioridades podem ser habilitadas/desabilitadas corretamente.
- [ ] Notificacoes, templates e integracoes salvam corretamente.

### Relatorios, BI e Ocupacao

- [ ] Relatorios abrem corretamente.
- [ ] Filtros de relatorios funcionam.
- [ ] Exportacoes funcionam corretamente.
- [ ] BI abre corretamente com dados coerentes.
- [ ] Ocupacao admin bate com os dados das turmas e CMEIs.

### Transicao, Logs, Auditoria e Perfil

- [ ] Transicao anual funciona corretamente em ambiente controlado.
- [ ] Logs exibem eventos esperados.
- [ ] Auditoria registra acoes relevantes.
- [ ] Perfil administrativo funciona corretamente.

### Usuarios, Mensagens, Tutorial e Diretor

- [ ] Gestao de usuarios funciona corretamente.
- [ ] Alteracao de permissoes reflete corretamente.
- [ ] Mensagens e templates funcionam corretamente.
- [ ] Tutorial abre e salva conteudos corretamente.
- [ ] Dashboard do diretor funciona com escopo correto.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 6. Superadmin

- [ ] Overview abre corretamente.
- [ ] Gestao de usuarios funciona corretamente.
- [ ] Permissoes podem ser concedidas e removidas corretamente.
- [ ] Modulos podem ser habilitados/desabilitados corretamente.
- [ ] Dados do municipio podem ser alterados corretamente.
- [ ] Perfil do superadmin funciona corretamente.
- [ ] Usuario sem papel de superadmin nao acessa URLs do superadmin.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 7. Modulo SAM

- [ ] Login do modulo funciona.
- [ ] Recuperacao de acesso funciona.
- [ ] Dashboard abre corretamente.
- [ ] Cadastros de alunos, turmas e CMEIs funcionam conforme permissao.
- [ ] Agenda e novo agendamento funcionam.
- [ ] Atendimentos e novo atendimento funcionam.
- [ ] Detalhe do atendimento abre corretamente.
- [ ] Alunos selecionados funciona.
- [ ] Prontuario funciona.
- [ ] Relatorio de prontuario funciona.
- [ ] Queixas escolares funcionam.
- [ ] Perfil, relatorios, configuracoes e especialidades funcionam.
- [ ] Area escola funciona conforme perfil vinculado.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 8. Modulo Sondar

- [ ] Login do modulo funciona.
- [ ] Esqueci senha e reset funcionam.
- [ ] Dashboard abre corretamente.
- [ ] Perfil funciona corretamente.
- [ ] Aplicar sondagem funciona.
- [ ] Ficha do aluno abre corretamente.
- [ ] Relatorios funcionam.
- [ ] Solicitar sondagem funciona para perfil permitido.
- [ ] Metas funcionam para perfil permitido.
- [ ] Cadastros de alunos, turmas e CMEIs funcionam.
- [ ] Cadastros de periodos e coordenadores funcionam para perfil permitido.
- [ ] Usuario sem permissao nao acessa as telas restritas.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 9. Fluxos Ponta a Ponta

### Fluxo 1 - Inscricao ate fila

- [ ] Responsavel realiza inscricao publica com sucesso.
- [ ] Registro aparece na consulta publica.
- [ ] Registro aparece para o responsavel autenticado.
- [ ] Registro aparece para o admin.

### Fluxo 2 - Cadastro estrutural

- [ ] Admin cria/edita CMEI e turma.
- [ ] Ocupacao e dados relacionados refletem corretamente nas demais telas.

### Fluxo 3 - Convocacao

- [ ] Admin convoca a crianca.
- [ ] Responsavel visualiza notificacao/convocacao.
- [ ] Prazo aparece corretamente.
- [ ] Historico registra a acao.

### Fluxo 4 - Documentos

- [ ] Responsavel envia documento.
- [ ] Admin aprova ou recusa.
- [ ] Responsavel visualiza o retorno corretamente.

### Fluxo 5 - Prioridade e fila

- [ ] Alteracao de prioridade muda a posicao na fila corretamente.
- [ ] Reflexo aparece na visao publica, do responsavel e do admin.

### Fluxo 6 - Matricula

- [ ] Convocacao aceita gera matricula corretamente.
- [ ] Crianca sai da fila quando aplicavel.
- [ ] Ocupacao da turma e do CMEI e atualizada.

### Fluxo 7 - Permissoes

- [ ] Alteracao de permissao muda os acessos apos novo login.

### Fluxo 8 - Auditoria

- [ ] Acao critica fica registrada em log/auditoria.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 10. Cenarios Negativos Obrigatorios

- [ ] Salvar formulario obrigatorio incompleto.
- [ ] Enviar arquivo invalido.
- [ ] Enviar arquivo acima do limite.
- [ ] Acessar rota protegida sem login.
- [ ] Acessar rota de outro perfil.
- [ ] Tentar duplicar cadastro ja existente.
- [ ] Tentar convocar crianca ja convocada ou matriculada.
- [ ] Tentar aprovar/reprovar documento em estado inconsistente.
- [ ] Executar busca, filtro e exportacao em base vazia.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 11. Usabilidade, Mobile e Acessibilidade

- [ ] Testado em desktop.
- [ ] Testado em mobile.
- [ ] Navegacao por teclado funciona minimamente.
- [ ] Foco visual em campos e botoes esta visivel.
- [ ] Contraste de textos e badges esta legivel.
- [ ] Mensagens de erro sao claras.
- [ ] Tabelas grandes continuam usaveis.
- [ ] Modais, scroll e overflow nao quebram a tela.
- [ ] Pagina 404 funciona corretamente.
- [ ] Rotas antigas redirecionam corretamente.

Observacoes:

______________________________________________________________________________

______________________________________________________________________________

---

## 12. Resumo Final da Execucao

- Total de casos planejados:
- Total executado:
- Total aprovado:
- Total aprovado com observacao:
- Total reprovado:
- Total nao aplicavel:

## Defeitos encontrados

1.
2.
3.
4.
5.

## Conclusao

- [ ] Sistema aprovado para uso
- [ ] Sistema aprovado com ressalvas
- [ ] Sistema reprovado para liberacao

Observacoes finais:

______________________________________________________________________________

______________________________________________________________________________

______________________________________________________________________________


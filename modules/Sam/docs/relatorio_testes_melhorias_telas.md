# Relatório de Testes · Melhorias SAM (Agenda / Atendimentos / Queixas / Alunos / Instituições)

Data: 2026-05-28

## Escopo do Release
- Agenda: visões (dia/semana/mês/lista), filtros persistentes, drag&drop (semana), sync automático (realtime)
- Atendimentos: filtros avançados (inclui status), paginação, PDF por período/filtros
- Queixas: filtros persistentes (busca/status/tag/ordenação), webhooks de notificação por eventos
- Alunos: (pendente) perfil por abas e export XLSX
- Instituições: (pendente) perfil por abas e export XLSX

## 1) Usabilidade (5 usuários finais)

### Participantes
- U1:
- U2:
- U3:
- U4:
- U5:

### Roteiro de tarefas (por usuário)
- Agenda: localizar um agendamento, filtrar por profissional, alternar visão (semana→mês), reagendar via drag&drop, iniciar atendimento.
- Atendimentos: filtrar por status e período, alternar lista/grade, gerar PDF.
- Queixas: filtrar por status e tag, abrir detalhe, enviar mensagem, alterar encaminhamento (perfil admin/profissional).
- Alunos: encontrar aluno, abrir perfil, navegar abas, exportar XLSX.
- Instituições: encontrar instituição, abrir perfil, ver alunos vinculados, exportar XLSX.

### Resultado por tarefa
| Usuário | Agenda | Atendimentos | Queixas | Alunos | Instituições | Observações |
|---|---|---|---|---|---|---|
| U1 |  |  |  |  |  |  |
| U2 |  |  |  |  |  |  |
| U3 |  |  |  |  |  |  |
| U4 |  |  |  |  |  |  |
| U5 |  |  |  |  |  |  |

### Principais problemas encontrados
- 

### Ajustes aplicados após feedback
- 

## 2) Compatibilidade de navegadores

### Matriz
- Chrome (Windows/macOS/Android): OK / NOK
- Firefox (Windows/macOS): OK / NOK
- Safari (macOS/iOS): OK / NOK
- Edge (Windows): OK / NOK

### Evidências
- Prints / vídeos / logs:

## 3) Acessibilidade (WCAG 2.1)

### Checklist
- Navegação por teclado em toolbars, selects, tabelas e cards: OK / NOK
- Foco visível em botões/inputs/links: OK / NOK
- Contraste (textos em backgrounds, badges): OK / NOK
- Leitores de tela: títulos, labels de inputs, botões com aria-label quando necessário: OK / NOK
- Estados de loading/erro/vazio anunciáveis/legíveis: OK / NOK

### Evidências
- Ferramentas: Lighthouse, axe, DevTools Accessibility Tree
- Resultados:

## 4) Performance

### Meta
- Tempo de carregamento por tela < 2s em 3G (simulado)
- Listagens com até 1000 registros sem travamentos perceptíveis

### Medições
- Agenda: 
- Atendimentos:
- Queixas:
- Alunos:
- Instituições:

### Observações
- Se necessário, aplicar paginação server-side e evitar carregar listas completas.

## 5) Conclusão
- Status geral: OK / NOK
- Pendências:
  - Alunos: perfil por abas + export XLSX
  - Instituições: perfil por abas + export XLSX


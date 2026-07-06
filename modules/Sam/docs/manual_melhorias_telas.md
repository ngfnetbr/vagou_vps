# Manual de Uso · Melhorias SAM (Agenda / Atendimentos / Queixas)

## Agenda
- Visões:
  - Dia: foco nos agendamentos do dia selecionado
  - Semana: grade Seg–Sex com cards de agendamento
  - Mês: calendário para escolher um dia e ver a lista do dia
  - Lista: lista contínua (ordenada por data/hora)
- Filtros (persistem entre sessões):
  - Busca (aluno, profissional, escola)
  - Profissional
  - Tipo
  - Status
- Reagendar via arrastar e soltar (visão Semana):
  - Arraste o card do agendamento para outro dia da semana
  - O sistema mantém o mesmo horário e altera apenas o dia
- Sincronização automática:
  - Atualizações de agendamento são refletidas automaticamente (realtime)

## Atendimentos
- Filtros (persistem entre sessões):
  - Busca (aluno/profissional)
  - Status (Agendado / Em andamento / Finalizado / Cancelado / Falta)
  - Profissional
  - Tipo
  - Período (data inicial/final)
- Paginação:
  - Controle de página e itens por página
- PDF:
  - Botão “PDF” gera relatório com base nos filtros atuais (limitado a 1000 registros por geração)

## Queixas
- Filtros (persistem entre sessões):
  - Busca (aluno/escola/protocolo/queixa)
  - Tag (diagnóstico/etiqueta)
  - Status
  - Ordenação (mais recentes/mais antigas/protocolo)
- Notificações:
  - Eventos de queixa disparam webhooks configuráveis (criação, mudança de status, mudança de encaminhamento, nova mensagem)


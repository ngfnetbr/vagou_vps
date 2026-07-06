# Documentação Técnica: Webhooks e WhatsApp (SAM)

## Visão Geral
O SAM permite integrar com provedores externos (ex.: WhatsApp) via webhooks configuráveis por evento. Cada webhook é configurado no banco (tabela `webhooks`) e executado com logs (tabela `webhooks_exec_logs`).

## Eventos suportados
Eventos operacionais do SAM:
- `sam.appointment.created`
- `sam.appointment.canceled`
- `sam.appointment.rescheduled`
- `sam.appointment.finalized`
- `sam.appointment.missed`

Eventos de lembrete/WhatsApp:
- `agendamento_lembrete_24h` (Amanhã tem consulta)
- `agendamento_lembrete_1h` (Hoje tem consulta · confirmação)
- `sam.appointment.confirmation.received` (Resposta Sim/Não recebida)
- `sam.appointment.confirmation.assumed` (Sem resposta → confirmação automática)

## Variáveis de template
No `body_template` do webhook, você pode usar:
- `{paciente_nome}`
- `{paciente_telefone}`
- `{data}`
- `{hora}`
- `{data_anterior}`
- `{hora_anterior}`
- `{servico}`
- `{profissional}`

## Payload padrão
Quando não há `body_template`, o payload enviado é:

```json
{
  "evento": "agendamento_lembrete_24h",
  "data_evento": "2026-05-16T12:00:00.000Z",
  "agendamento": {
    "id": "uuid",
    "data": "2026-05-17",
    "hora": "14:00",
    "paciente_nome": "Aluno",
    "paciente_telefone": "5544999999999",
    "servico": "Fonoaudiologia",
    "profissional": "Profissional"
  }
}
```

No evento `sam.appointment.confirmation.received`, o payload inclui:

```json
{
  "confirmacao": { "resposta": "sim", "mensagem": "sim" }
}
```

## Integração WhatsApp (recomendado)
### 1) Envio de mensagens (saída)
Configure webhooks para os eventos:
- `agendamento_lembrete_24h`
- `agendamento_lembrete_1h`
- `sam.appointment.canceled` (inclui cancelamento em massa e por WhatsApp)

O endpoint do webhook deve ser um serviço seu (ou do provedor) que faça o envio para a API do WhatsApp.

### 2) Recebimento de respostas (entrada)
O SAM disponibiliza uma Edge Function para receber respostas do WhatsApp e aplicar a confirmação:
- Função: `whatsapp-inbound`
- Campos mínimos esperados no JSON recebido: `from` (telefone) e `message` (texto)
- Respostas aceitas: `sim`/`s`/`1` e `nao`/`não`/`n`/`2`

Quando receber `não`, o agendamento é cancelado (libera o horário na agenda).

### 3) Confirmação automática (sem resposta)
A Edge Function `appointment-confirmation-timeout` marca como confirmação automática (`assumed_confirmed`) quando o horário do agendamento chega sem resposta.

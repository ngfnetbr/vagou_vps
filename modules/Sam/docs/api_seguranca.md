# 8. API, Segurança e Plano de Testes

## 8.1 Segurança e Controle de Acesso
O SAM utiliza uma estratégia de segurança em múltiplas camadas.

### Autenticação
- Gerenciada pelo Supabase Auth (JWT).
- Sessões persistentes e seguras via Cookies.

### Autorização (RLS - Row Level Security)
Exemplo de política para a tabela `students`:
```sql
CREATE POLICY "Professionals and Admins can update students"
  ON students FOR UPDATE
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );
```

## 8.2 API e Integrações
O sistema expõe rotas de API internas via Next.js Route Handlers e permite consumo direto do banco via Supabase Client (respeitando RLS).

### Exemplo de Chamada de API (Webhooks)
O payload enviado pelo sistema segue o formato:
```json
{
  "event": "appointment.confirmed",
  "timestamp": "2024-02-10T14:30:00Z",
  "data": {
    "appointment_id": "uuid",
    "student_name": "João Silva",
    "date": "2024-02-15T09:00:00Z"
  }
}
```

## 8.3 Plano de Testes
O plano de testes foca em garantir a integridade dos dados e a disponibilidade das funcionalidades críticas.

### Casos de Teste (Exemplos)
| ID | Descrição | Resultado Esperado |
|----|-----------|--------------------|
| CT01 | Login com credenciais válidas. | Acesso concedido ao Dashboard. |
| CT02 | Tentativa de acesso de Coordenador a logs de Admin. | Acesso negado (403/RLS). |
| CT03 | Criação de agendamento em horário conflitante. | Sistema deve alertar ou impedir. |
| CT04 | Registro de evolução em aluno inativo. | Permitir, mas alertar status. |
| CT05 | Disparo de webhook após confirmação. | Endpoint externo recebe payload 200 OK. |

### Ferramentas de Teste
- **Unitários**: Jest/Vitest.
- **E2E**: Playwright ou Cypress.
- **Manual**: Script de teste SMTP (`tests/smtp-test-script.ts`).

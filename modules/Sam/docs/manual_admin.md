# 7. Manual de Administração e Manutenção

## 7.1 Gestão de Usuários
Somente administradores podem criar novos usuários e definir seus papéis.
1. Vá em **Usuários**.
2. Clique em **Novo Usuário**.
3. Defina o e-mail e o papel (Admin, Profissional ou Coordenador).
4. O usuário receberá um convite por e-mail (se SMTP configurado) ou deverá realizar o primeiro acesso.

## 7.2 Auditoria do Sistema
O módulo de **Auditoria** permite rastrear:
- Quem alterou dados de alunos.
- Datas e horários de login.
- Exclusões de registros (soft delete ou hard delete).
Utilize os filtros de "Recurso" e "Usuário" para investigações.

## 7.3 Manutenção e Backups
- **Banco de Dados**: O Supabase realiza backups automáticos diários. Em caso de necessidade de restauração, utilize o painel do Supabase.
- **Atualização de Código**: Siga o fluxo de Git (Pull Request -> Merge -> Deploy).
- **Logs de Erro**: Verifique o console da Vercel ou os logs do Supabase para erros de API.

## 7.4 Configuração de Webhooks
1. Vá em **Configurações** -> **Integrações**.
2. Adicione a URL do sistema externo.
3. Gere ou defina um `Secret` para assinatura das requisições.
4. Selecione os eventos que deseja enviar (ex: `appointment.confirmed`).
5. Monitore as entregas na tabela de logs de webhook.

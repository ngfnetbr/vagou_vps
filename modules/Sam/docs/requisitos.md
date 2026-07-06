# 2. Especificação de Requisitos

## 2.1 Requisitos Funcionais (RF)

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF01 | O sistema deve permitir o login de usuários com diferentes papéis (Admin, Profissional, Coord. Escolar). | Alta |
| RF02 | O sistema deve permitir o cadastro e edição de alunos, incluindo dados pessoais e escolares. | Alta |
| RF03 | O sistema deve permitir o agendamento de atendimentos para os alunos. | Alta |
| RF04 | O sistema deve permitir o registro da evolução do atendimento (prontuário eletrônico). | Alta |
| RF05 | O sistema deve permitir a gestão de escolas e turmas. | Média |
| RF06 | O sistema deve manter um log de auditoria de todas as ações críticas realizadas pelos usuários. | Alta |
| RF07 | O sistema deve disparar webhooks para sistemas externos em eventos de agendamento. | Média |
| RF08 | O sistema deve permitir a emissão de relatórios de atendimentos. | Média |
| RF09 | O sistema deve permitir a configuração de servidores SMTP para envio de e-mails. | Baixa |
| RF10 | O sistema deve permitir o controle de permissões granulares via JSONB no perfil do usuário. | Média |

## 2.2 Requisitos Não-Funcionais (RNF)

| ID | Descrição | Categoria |
|----|-----------|-----------|
| RNF01 | O sistema deve ser responsivo, funcionando em desktops, tablets e smartphones. | Usabilidade |
| RNF02 | O sistema deve garantir a segurança dos dados dos alunos através de Row Level Security (RLS). | Segurança |
| RNF03 | O tempo de resposta das consultas principais não deve exceder 2 segundos. | Performance |
| RNF04 | O sistema deve ser desenvolvido em TypeScript para garantir a tipagem e manutenibilidade. | Manutenibilidade |
| RNF05 | A comunicação entre o frontend e o backend deve ser criptografada via HTTPS. | Segurança |
| RNF06 | O sistema deve seguir os padrões da LGPD para tratamento de dados sensíveis de menores. | Legal |
| RNF07 | O histórico de versões deve ser mantido no arquivo CHANGELOG.md. | Gestão |
| RNF08 | O sistema deve suportar até 100 requisições de webhook por minuto. | Escalabilidade |

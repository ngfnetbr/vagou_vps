# VAGOU - Sistema de Gestão de Vagas em CMEIs

## Funcionalidades do Sistema

---

## 📋 Área Pública

### Inscrição Online
- Formulário completo de inscrição com validação de dados
- Seleção de até 2 CMEIs de preferência
- Indicação de programas sociais para prioridade na fila
- Upload de documentos obrigatórios
- Comprovante de inscrição gerado automaticamente
- Validação de CEP (opcional) para restrição por área de atendimento

### Consulta de Fila de Espera
- Visualização pública da posição na fila
- Exibição de prioridades (social, remanejamento)
- Status da inscrição em tempo real
- Filtros por CMEI e turma

### Consulta por CPF
- Busca de todas as inscrições vinculadas ao CPF do responsável
- Exibição de status, posição e CMEI atual

### Ocupação dos CMEIs
- Visualização da capacidade e vagas disponíveis por CMEI
- Percentual de ocupação com indicadores visuais
- Informações de contato e endereço

### Página de Contato
- Formulário de dúvidas e sugestões
- Envio automático por e-mail

---

## 👨‍👩‍👧 Área do Responsável

### Painel de Inscrições
- Acompanhamento de todas as crianças inscritas
- Timeline de status com histórico completo
- Alertas de convocação com prazo destacado
- Notificações de mudança de posição na fila

### Gestão de Convocações
- Aceitar ou recusar convocação
- Seleção de turma/turno disponível
- Prazo de resposta com contador regressivo
- Confirmação de matrícula

### Solicitação de Remanejamento
- Pedido de transferência para outro CMEI
- Justificativa obrigatória (configurável)
- Acompanhamento do status da solicitação

### Documentos
- Upload de documentos pendentes
- Visualização de documentos enviados
- Status de aprovação/recusa

### Perfil
- Edição de dados pessoais
- Alteração de senha
- Histórico de notificações

---

## 🔧 Área Administrativa

### Dashboard
- Estatísticas gerais do sistema
- Taxa de ocupação por CMEI
- Gráficos de evolução da fila
- Convocações do mês
- Atividades recentes

### Gestão de CMEIs
- Cadastro e edição de CMEIs
- Informações: nome, endereço, capacidade, contato
- Ativação/desativação de unidades
- Vinculação com zonas de atendimento

### Gestão de Turmas
- Cadastro por CMEI com capacidade e turno
- Turmas base configuráveis (Infantil 0, 1, 2, 3)
- Faixa etária automática
- Visualização de ocupação

### Fila de Espera
- Visualização completa com filtros avançados
- Ordenação por prioridade configurável
- Convocação individual ou em lote
- Ações: convocar, desistente, fim de fila, recusar
- Badges de prazo (vencido, vencendo, ok)
- Exportação de dados

### Gestão de Crianças
- Cadastro e edição completa
- Histórico de movimentações
- Documentos vinculados
- Prioridades aprovadas

### Matrículas
- Lista de crianças matriculadas
- Realocação de turma
- Transferência entre CMEIs
- Trancamento de matrícula

### Convocações
- Definição de CMEI/Turma e prazo
- Reenvio de notificações
- Controle de tentativas
- Histórico de convocações

### Remanejamento
- Aprovação/recusa de solicitações
- Convocação para novo CMEI
- Prioridade configurável na fila

### Transição Anual
- Planejamento de movimentações em massa
- Realocação automática por idade
- Definição de concluintes/desistentes
- Aplicação em lote com justificativa

### Relatórios
- Matrículas ativas por CMEI/Turma
- Histórico de convocações
- Fila de espera detalhada
- Exportação em Excel

### Logs e Auditoria
- Registro de todas as ações do sistema
- Filtros por período, usuário e tipo
- Exportação para análise

---

## ⚙️ Configurações do Sistema

### Geral
- Nome do município e secretaria
- Contatos (e-mail, telefone)
- Período de inscrições
- Prazo de resposta padrão
- Brasão/logo municipal

### Notificações
- Canais: E-mail, SMS, WhatsApp
- Templates personalizáveis
- Webhook para integrações externas
- Reenvio automático de lembretes

### Campos de Inscrição
- Campos customizáveis por seção
- Validações personalizadas
- Campos obrigatórios/opcionais
- Histórico de alterações

### Prioridades
- Tipos de prioridade configuráveis
- Peso para ordenação da fila
- Documentos comprobatórios
- Aprovação manual ou automática

### Documentos
- Tipos de documentos obrigatórios
- Validação por administrador
- Status: pendente, aprovado, recusado

### Turmas Base
- Configuração de faixas etárias
- Data de corte para cálculo de idade

### Zonas de Atendimento
- Restrição por CEP
- Priorização geográfica

### Feriados
- Cadastro de feriados municipais
- Cálculo de prazos em dias úteis

### Usuários e Permissões
- Perfis: Responsável, Gestor, Diretor, Admin, Superadmin
- Permissões granulares por módulo
- Vinculação de diretores a CMEIs

### Aparência
- Tema claro/escuro
- Cores personalizáveis
- Logo e favicon

---

## 📱 Recursos Adicionais

### Aplicativo PWA
- Instalação em dispositivos móveis
- Funcionamento offline parcial
- Notificações push

### Integrações
- Webhook para automações externas
- API para sistemas terceiros
- Integração com WhatsApp Business

### Segurança
- Autenticação com e-mail/senha
- Login social (Google)
- Controle de acesso por perfil
- Auditoria completa de ações
- CAPTCHA configurável

### Acessibilidade
- Alto contraste
- Aumento de fonte
- Navegação por teclado

---

## 📊 Fluxo Operacional

```
1. INSCRIÇÃO
   → Responsável realiza inscrição online
   → Sistema valida dados e documentos
   → Criança entra na fila de espera

2. FILA DE ESPERA
   → Ordenação automática por prioridade
   → Responsável acompanha posição

3. CONVOCAÇÃO
   → Gestor convoca criança
   → Responsável recebe notificação
   → Prazo para resposta

4. MATRÍCULA
   → Responsável aceita e escolhe turma
   → Confirmação de matrícula
   → Criança vinculada ao CMEI

5. ACOMPANHAMENTO
   → Remanejamento (se necessário)
   → Transferência entre CMEIs
   → Transição anual automática
```

---

## 🎯 Benefícios

- **Transparência**: Fila pública com posições visíveis
- **Agilidade**: Processo 100% digital
- **Controle**: Auditoria completa de ações
- **Comunicação**: Notificações automáticas
- **Flexibilidade**: Configurações personalizáveis
- **Mobilidade**: Acesso em qualquer dispositivo

---

*Sistema desenvolvido para gestão eficiente de vagas em Centros Municipais de Educação Infantil*

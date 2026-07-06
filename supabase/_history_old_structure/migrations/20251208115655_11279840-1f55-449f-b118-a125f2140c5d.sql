-- Criar tabela para seções do tutorial (Guia de Funcionalidades)
CREATE TABLE public.tutorial_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'help-circle',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  conteudo JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela para FAQ
CREATE TABLE public.tutorial_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela para dicas rápidas
CREATE TABLE public.tutorial_dicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT DEFAULT 'info',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Adicionar campos de suporte à configurações_sistema
ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS suporte_email TEXT,
ADD COLUMN IF NOT EXISTS suporte_telefone TEXT,
ADD COLUMN IF NOT EXISTS suporte_dev_email TEXT,
ADD COLUMN IF NOT EXISTS suporte_dev_telefone TEXT,
ADD COLUMN IF NOT EXISTS suporte_dev_nome TEXT DEFAULT 'Suporte Técnico';

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.tutorial_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_dicas ENABLE ROW LEVEL SECURITY;

-- Políticas para tutorial_secoes
CREATE POLICY "Anyone can view active tutorial sections"
ON public.tutorial_secoes FOR SELECT
USING (ativo = true);

CREATE POLICY "Superadmin can manage tutorial sections"
ON public.tutorial_secoes FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Políticas para tutorial_faq
CREATE POLICY "Anyone can view active FAQs"
ON public.tutorial_faq FOR SELECT
USING (ativo = true);

CREATE POLICY "Superadmin can manage FAQs"
ON public.tutorial_faq FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Políticas para tutorial_dicas
CREATE POLICY "Anyone can view active tips"
ON public.tutorial_dicas FOR SELECT
USING (ativo = true);

CREATE POLICY "Superadmin can manage tips"
ON public.tutorial_dicas FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Triggers para updated_at
CREATE TRIGGER update_tutorial_secoes_updated_at
BEFORE UPDATE ON public.tutorial_secoes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutorial_faq_updated_at
BEFORE UPDATE ON public.tutorial_faq
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais das seções do tutorial
INSERT INTO public.tutorial_secoes (titulo, descricao, icone, ordem, conteudo) VALUES
('Dashboard', 'Visão geral do sistema', 'layout-dashboard', 1, '[{"subtitle": "Painel Principal", "text": "O Dashboard apresenta uma visão consolidada de todas as informações importantes do sistema, incluindo estatísticas de matrículas, ocupação dos CMEIs e convocações recentes."}, {"subtitle": "Widgets Personalizáveis", "text": "Você pode configurar quais widgets aparecem no dashboard através das configurações do sistema."}]'),
('Inscrições', 'Como gerenciar inscrições', 'file-text', 2, '[{"subtitle": "Nova Inscrição", "text": "As inscrições podem ser feitas pelo portal público ou diretamente pelo painel administrativo. Todos os dados são validados automaticamente."}, {"subtitle": "Acompanhamento", "text": "Após a inscrição, a criança entra na fila de espera e os responsáveis podem acompanhar a posição pelo portal."}]'),
('Fila de Espera', 'Gerenciamento da fila', 'list-ordered', 3, '[{"subtitle": "Ordenação", "text": "A fila é ordenada automaticamente considerando prioridades sociais, remanejamentos e data de inscrição."}, {"subtitle": "Ações Disponíveis", "text": "É possível convocar, marcar como desistente, enviar para fim de fila ou reativar inscrições."}]'),
('Convocações', 'Como convocar crianças', 'bell', 4, '[{"subtitle": "Processo de Convocação", "text": "Selecione a criança, escolha o CMEI e turma de destino, defina o prazo de resposta e confirme a convocação."}, {"subtitle": "Notificações", "text": "O sistema pode enviar notificações automáticas via WhatsApp, e-mail ou SMS quando configurado."}]'),
('Matrículas', 'Gestão de matrículas', 'graduation-cap', 5, '[{"subtitle": "Confirmação", "text": "Após a convocação, o responsável deve confirmar a matrícula dentro do prazo estabelecido."}, {"subtitle": "Realocação", "text": "É possível realocar crianças matriculadas para outras turmas ou CMEIs conforme necessidade."}]'),
('CMEIs e Turmas', 'Cadastro de unidades', 'building', 6, '[{"subtitle": "Cadastro de CMEIs", "text": "Registre os CMEIs com informações de endereço, capacidade e contatos."}, {"subtitle": "Turmas", "text": "Cada CMEI pode ter múltiplas turmas organizadas por faixa etária e turno."}]'),
('Mensagens/Chat', 'Central de comunicação', 'message-circle', 7, '[{"subtitle": "Chat WhatsApp", "text": "A central de mensagens permite comunicação direta com responsáveis via WhatsApp integrado."}, {"subtitle": "Respostas Rápidas", "text": "Configure templates de mensagens para agilizar o atendimento."}]'),
('Usuários', 'Gerenciamento de usuários', 'users', 8, '[{"subtitle": "Criação de Usuários", "text": "Crie contas para gestores, administradores e diretores de CMEI."}, {"subtitle": "Permissões", "text": "Cada perfil tem permissões específicas que podem ser configuradas."}]'),
('Logs e Auditoria', 'Monitoramento do sistema', 'file-search', 9, '[{"subtitle": "Logs de Ações", "text": "Todas as ações importantes são registradas para auditoria e segurança."}, {"subtitle": "Monitoramento", "text": "Acompanhe notificações enviadas, erros e atividades dos usuários."}]'),
('Relatórios', 'Geração de relatórios', 'bar-chart', 10, '[{"subtitle": "Tipos de Relatórios", "text": "Gere relatórios de matrículas, convocações, ocupação e histórico."}, {"subtitle": "Exportação", "text": "Os relatórios podem ser exportados em PDF ou Excel."}]'),
('Configurações', 'Configurações do sistema', 'settings', 11, '[{"subtitle": "Configurações Gerais", "text": "Defina nome do município, período de inscrições, prazos e regras de funcionamento."}, {"subtitle": "Notificações", "text": "Configure os canais de notificação e templates de mensagens."}]'),
('Transição Anual', 'Planejamento de transição', 'calendar', 12, '[{"subtitle": "Planejamento", "text": "Ao final do ano letivo, planeje a transição das crianças para as novas turmas."}, {"subtitle": "Aplicação", "text": "Revise o planejamento e aplique as mudanças em lote."}]');

-- Inserir FAQs iniciais
INSERT INTO public.tutorial_faq (categoria, pergunta, resposta, ordem) VALUES
('Inscrições', 'Como fazer uma nova inscrição?', 'As inscrições podem ser feitas pelo portal público (se habilitado) ou pelo painel administrativo em Crianças > Nova Criança. Preencha os dados solicitados e confirme.', 1),
('Inscrições', 'Posso editar uma inscrição após envio?', 'Sim, desde que a configuração "Permitir edição após inscrição" esteja habilitada. Acesse os detalhes da criança para editar.', 2),
('Fila', 'Como funciona a ordem da fila?', 'A fila é ordenada por: 1) Prioridade de remanejamento, 2) Prioridade social (programas sociais), 3) Data de inscrição. Crianças com prioridades aparecem primeiro.', 3),
('Fila', 'O que é "fim de fila"?', 'É uma ação que reposiciona a criança para o final da fila, geralmente usada quando o responsável não responde à convocação no prazo.', 4),
('Convocações', 'Como convocar uma criança?', 'Na tela de Fila de Espera, clique em "Convocar" na criança desejada, selecione CMEI e turma, defina o prazo e confirme.', 5),
('Convocações', 'Posso reenviar uma notificação?', 'Sim, na tela de detalhes da criança convocada há um botão para reenviar a notificação de convocação.', 6),
('Matrículas', 'Como confirmar uma matrícula?', 'Quando a criança está convocada, acesse seus detalhes e clique em "Confirmar Matrícula" após verificar a documentação.', 7),
('Matrículas', 'É possível transferir uma criança para outro CMEI?', 'Sim, use a função de "Realocação" disponível para crianças matriculadas.', 8),
('Sistema', 'Como alterar as configurações do sistema?', 'Acesse Configurações no menu lateral. Apenas usuários com permissão de administrador podem fazer alterações.', 9),
('Sistema', 'Os dados são seguros?', 'Sim, o sistema utiliza criptografia, autenticação segura e políticas de acesso (RLS) para proteger os dados.', 10);

-- Inserir dicas iniciais
INSERT INTO public.tutorial_dicas (titulo, descricao, icone, ordem) VALUES
('Atalhos de Teclado', 'Use Ctrl+K para abrir a busca rápida em qualquer tela do sistema.', 'keyboard', 1),
('Filtros Salvos', 'Os filtros que você aplica nas listagens são salvos automaticamente para sua próxima visita.', 'filter', 2),
('Notificações', 'Configure alertas para ser notificado quando crianças entrarem no top 10 da fila.', 'bell', 3),
('Exportação', 'Você pode exportar qualquer listagem para Excel clicando no botão de exportação.', 'download', 4),
('Tema Escuro', 'Alterne entre tema claro e escuro clicando no ícone de sol/lua no cabeçalho.', 'moon', 5);


# Módulo Sondagem – Plano de Implementação

## Fase 1: Layout Base e Navegação
- Criar layout principal com **sidebar fixa** à esquerda (fundo azul institucional, w-64) e área de conteúdo com fundo cinza claro
- Sidebar com itens: Dashboard, Aplicar Sondagem, Modelos, Relatórios, Configurações
- Header superior com título dinâmico por página
- Configurar rotas para todas as páginas
- Design: cards com `rounded-2xl`, `shadow-sm`, espaçamento generoso, azul como cor primária

## Fase 2: Banco de Dados (Supabase)
- Criar todas as tabelas: `cache_criancas`, `cache_usuarios`, `niveis_aprendizagem`, `modelos_sondagem`, `perguntas_modelo`, `sondagens`, `respostas_sondagem`, `sondagem_niveis`, `logs_sincronizacao`
- Habilitar RLS em todas as tabelas
- Criar tabela `user_roles` com enum `(admin, gestor, responsavel)` e função `has_role()`
- Configurar políticas RLS baseadas em roles

## Fase 3: Autenticação Local
- Login com email/senha via Supabase Auth
- Tabela `profiles` com dados do usuário
- Atribuição de role no cadastro
- Proteção de rotas por role
- Preparado para migração futura a SSO/JWT do Vagou

## Fase 4: Dashboard
- Cards de indicadores: Total avaliados, Pendentes, % Alfabetizados, Distribuição por nível
- Grid responsivo (1→2→4 colunas)
- Ícones discretos, números em destaque

## Fase 5: Aplicar Sondagem
- Filtros horizontais: CMEI, Turma, Período + botão Buscar
- Lista de alunos em tabela moderna com botão "Aplicar"
- Tela de lançamento com cards separados:
  - **Escrita**: grid de opções em mini-cards com radio buttons, ordenados por `ordem`
  - **Produção de Texto**: mesmo padrão
  - **Observações**: textarea grande
  - Botões Cancelar/Salvar alinhados à direita

## Fase 6: Modelos de Sondagem
- CRUD de modelos de sondagem
- Gerenciamento de perguntas por modelo
- Configuração de níveis de aprendizagem por modelo

## Fase 7: Relatórios
- Filtros no topo (CMEI, turma, período)
- Gráficos com Recharts (distribuição por nível, evolução)
- Cards de resumo abaixo dos gráficos

## Fase 8: Configurações
- Cards separados por categoria: Integração Vagou, Sincronização, Segurança
- Inputs com labels, botão salvar por seção


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TemplateMensagem {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  assunto_email: string | null;
  corpo_email: string | null;
  corpo_sms: string | null;
  corpo_whatsapp: string | null;
  variaveis_disponiveis: string[];
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface MensagemStatusCustom {
  id: string;
  status: string;
  titulo_exibicao: string;
  mensagem_responsavel: string | null;
  cor_badge: string;
  icone: string;
  ativo: boolean;
  created_at: string;
}

// Hook para listar templates de mensagens
export const useTemplatesMensagens = () => {
  return useQuery({
    queryKey: ["templates-mensagens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates_mensagens")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TemplateMensagem[];
    },
  });
};

// Hook para buscar template por tipo
export const useTemplatePorTipo = (tipo: string) => {
  return useQuery({
    queryKey: ["template-mensagem", tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates_mensagens")
        .select("*")
        .eq("tipo", tipo)
        .eq("ativo", true)
        .maybeSingle();

      if (error) throw error;
      return data as TemplateMensagem | null;
    },
    enabled: !!tipo,
  });
};

// Hook para criar template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<TemplateMensagem>) => {
      const { data, error } = await supabase
        .from("templates_mensagens")
        .insert(template as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates-mensagens"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });
};

// Hook para atualizar template
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TemplateMensagem> & { id: string }) => {
      const { data, error } = await supabase
        .from("templates_mensagens")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates-mensagens"] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });
};

// Hook para deletar template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("templates_mensagens")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates-mensagens"] });
      toast.success("Template excluído!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });
};

// Hook para mensagens de status customizadas
export const useMensagensStatus = () => {
  return useQuery({
    queryKey: ["mensagens-status-custom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_status_custom")
        .select("*")
        .order("status", { ascending: true });

      if (error) throw error;
      return data as MensagemStatusCustom[];
    },
  });
};

// Hook para atualizar mensagem de status
export const useUpdateMensagemStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MensagemStatusCustom> & { id: string }) => {
      const { data, error } = await supabase
        .from("mensagens_status_custom")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens-status-custom"] });
      toast.success("Mensagem de status atualizada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
};

// Função para processar template com variáveis
export const processarTemplate = (
  template: string,
  variaveis: Record<string, string | number | null | undefined>
): string => {
  let resultado = template;
  
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const regex = new RegExp(`{{${chave}}}`, "g");
    resultado = resultado.replace(regex, String(valor ?? ""));
  });
  
  return resultado;
};

// Mapeamento de tipos de template para labels
export const TIPOS_TEMPLATE = {
  inscricao_realizada: "Inscrição Realizada",
  convocacao: "Convocação",
  lembrete_prazo: "Lembrete de Prazo",
  matricula_confirmada: "Matrícula Confirmada",
  fim_fila: "Fim da Fila",
  remanejamento_solicitado: "Remanejamento Solicitado",
  remanejamento_concluido: "Remanejamento Concluído",
  documento_recusado: "Documento Recusado",
  documentos_aprovados: "Documentos Aprovados",
  desistencia: "Desistência",
  recusa: "Recusa de Vaga",
  recuperacao_senha: "Recuperação de Senha",
} as const;

// Variáveis disponíveis globalmente
export const VARIAVEIS_GLOBAIS = [
  { chave: "crianca_nome", descricao: "Nome da criança" },
  { chave: "protocolo", descricao: "Protocolo da inscrição" },
  { chave: "responsavel_nome", descricao: "Nome do responsável" },
  { chave: "responsavel_telefone", descricao: "Telefone do responsável" },
  { chave: "responsavel_email", descricao: "E-mail do responsável" },
  { chave: "cmei_nome", descricao: "Nome da Unidade" },
  { chave: "cmei_endereco", descricao: "Endereço da Unidade" },
  { chave: "turma_nome", descricao: "Nome da turma" },
  { chave: "posicao_fila", descricao: "Posição na fila" },
  { chave: "data_limite", descricao: "Data limite (formatada)" },
  { chave: "prazo_dias", descricao: "Prazo em dias" },
  { chave: "dias_restantes", descricao: "Dias restantes" },
  { chave: "data_inscricao", descricao: "Data da inscrição" },
  { chave: "municipio_nome", descricao: "Nome do município" },
  { chave: "secretaria_nome", descricao: "Nome da secretaria" },
  { chave: "lista_documentos", descricao: "Lista de documentos pendentes" },
  { chave: "motivo", descricao: "Motivo da ação" },
  { chave: "link_recuperacao", descricao: "Link para recuperação de senha" },
];

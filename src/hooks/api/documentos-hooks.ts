import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RESOLVED_SUPABASE_PUBLISHABLE_KEY, RESOLVED_SUPABASE_URL, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error-utils";
import { useState, useCallback } from "react";
import { calcularResumoDocumentacaoObrigatoria } from "@/utils/documentos-obrigatorios";

// Types
export interface DocumentoTipo {
  id: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentoCrianca {
  id: string;
  crianca_id: string;
  tipo_documento_id: string;
  arquivo_url: string;
  arquivo_nome: string | null;
  status: "pendente" | "aprovado" | "recusado";
  motivo_recusa: string | null;
  enviado_por: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
  updated_at: string;
  tipo_documento?: DocumentoTipo;
}

// Hook para buscar tipos de documentos
export const useDocumentosTipos = () => {
  return useQuery({
    queryKey: ["documentos-tipos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_tipos")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as DocumentoTipo[];
    },
  });
};

// Hook para buscar tipos de documentos ativos
export const useDocumentosTiposAtivos = () => {
  return useQuery({
    queryKey: ["documentos-tipos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_tipos")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as DocumentoTipo[];
    },
  });
};

// Hook para criar tipo de documento
export const useCreateDocumentoTipo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<DocumentoTipo>) => {
      const { data: result, error } = await supabase
        .from("documentos_tipos")
        .insert({
          nome: data.nome!,
          descricao: data.descricao || null,
          obrigatorio: data.obrigatorio ?? true,
          ativo: data.ativo ?? true,
          ordem: data.ordem ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-tipos"] });
      toast.success("Tipo de documento criado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao criar tipo de documento: " + getErrorMessage(error));
    },
  });
};

// Hook para atualizar tipo de documento
export const useUpdateDocumentoTipo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocumentoTipo> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("documentos_tipos")
        .update({
          nome: data.nome,
          descricao: data.descricao,
          obrigatorio: data.obrigatorio,
          ativo: data.ativo,
          ordem: data.ordem,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-tipos"] });
      toast.success("Tipo de documento atualizado!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao atualizar tipo de documento: " + getErrorMessage(error));
    },
  });
};

// Hook para deletar tipo de documento
export const useDeleteDocumentoTipo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documentos_tipos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-tipos"] });
      toast.success("Tipo de documento removido!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao remover tipo de documento: " + getErrorMessage(error));
    },
  });
};

// Hook para buscar documentos de uma criança
export const useDocumentosCrianca = (criancaId: string | undefined) => {
  return useQuery({
    queryKey: ["documentos-crianca", criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from("documentos_crianca")
        .select(`
          *,
          tipo_documento:documentos_tipos(*)
        `)
        .eq("crianca_id", criancaId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as (DocumentoCrianca & { tipo_documento: DocumentoTipo })[];
    },
    enabled: !!criancaId,
  });
};

// Função para gerar URL assinada para visualização
export const getSignedDocumentUrl = async (filePath: string): Promise<string | null> => {
  // Se já é uma URL completa com signed, usar diretamente
  if (filePath.includes('storage/v1/object/sign/')) {
    return filePath;
  }
  
  // Extrair o path do arquivo se for uma URL pública antiga
  let path = filePath;
  if (filePath.includes('/storage/v1/object/public/documentos/')) {
    path = filePath.split('/storage/v1/object/public/documentos/')[1];
  }
  
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, 3600); // 1 hora de validade
  
  if (error) {
    console.error('Erro ao gerar URL assinada:', error);
    return null;
  }
  
  return data.signedUrl;
};

// Função para sanitizar nome de arquivo (remover caracteres especiais)
const sanitizeFileName = (name: string): string => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Substitui caracteres especiais por _
    .replace(/_+/g, "_") // Remove underscores duplicados
    .replace(/^_|_$/g, ""); // Remove underscores no início/fim
};

// Constante para tamanho máximo de arquivo (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Hook para upload de documento
export const useUploadDocumento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      criancaId,
      tipoDocumentoId,
      file,
      userId,
    }: {
      criancaId: string;
      tipoDocumentoId: string;
      file: File;
      userId: string;
    }) => {
      // Validar tamanho máximo do arquivo
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande. Tamanho máximo permitido: 5MB`);
      }

      // Sanitizar nome do arquivo para evitar erros do Supabase Storage
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${userId}/${criancaId}/${tipoDocumentoId}/${Date.now()}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Salvar apenas o path do arquivo (não URL pública)
      // Verificar se já existe um documento para este tipo
      const { data: existing } = await supabase
        .from("documentos_crianca")
        .select("id, status, aprovado_em")
        .eq("crianca_id", criancaId)
        .eq("tipo_documento_id", tipoDocumentoId)
        .maybeSingle();

      if (existing) {
        // Se já estava aprovado, marcar como pendente mas manter registro de que já foi aprovado uma vez
        // Isso pode ser usado para silenciar notificações futuras se desejado
        const { data, error } = await supabase
          .from("documentos_crianca")
          .update({
            arquivo_url: fileName,
            arquivo_nome: file.name,
            status: "pendente",
            motivo_recusa: null,
            enviado_por: userId,
            // Mantemos o aprovado_em original para saber que é uma atualização de algo já validado
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar novo documento
        const { data, error } = await supabase
          .from("documentos_crianca")
          .insert({
            crianca_id: criancaId,
            tipo_documento_id: tipoDocumentoId,
            arquivo_url: fileName, // Salvar apenas o path
            arquivo_nome: file.name,
            status: "pendente",
            enviado_por: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documentos-crianca", variables.criancaId] });
      queryClient.invalidateQueries({ queryKey: ["status-documentos-lote"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-completos", variables.criancaId] });
      toast.success("Documento enviado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao enviar documento: " + getErrorMessage(error));
    },
  });
};

// Hook para upload de documento COM progresso
export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  fileName: string | null;
}

export const useUploadDocumentoWithProgress = () => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
    fileName: null,
  });

  const uploadWithProgress = useCallback(async ({
    criancaId,
    tipoDocumentoId,
    file,
    userId,
  }: {
    criancaId: string;
    tipoDocumentoId: string;
    file: File;
    userId: string;
  }) => {
    // Validar tamanho máximo do arquivo
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. Tamanho máximo permitido: 5MB`);
    }

    setUploadProgress({ progress: 0, isUploading: true, fileName: file.name });

    try {
      // Sanitizar nome do arquivo
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${userId}/${criancaId}/${tipoDocumentoId}/${Date.now()}_${sanitizedName}`;

      // Obter a sessão para o token de autorização
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      // Upload com XMLHttpRequest para rastrear progresso
      const formData = new FormData();
      formData.append('', file);

      const supabaseUrl = RESOLVED_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("URL do Supabase não configurada para upload de documentos.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, progress: percentComplete }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload falhou: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));

        xhr.open('POST', `${supabaseUrl}/storage/v1/object/documentos/${fileName}`);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('apikey', RESOLVED_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      });

      // Verificar se já existe um documento para este tipo
      const { data: existing } = await supabase
        .from("documentos_crianca")
        .select("id, status, aprovado_em")
        .eq("crianca_id", criancaId)
        .eq("tipo_documento_id", tipoDocumentoId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("documentos_crianca")
          .update({
            arquivo_url: fileName,
            arquivo_nome: file.name,
            status: "pendente",
            motivo_recusa: null,
            enviado_por: userId,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        
        // Invalidar queries
        queryClient.invalidateQueries({ queryKey: ["documentos-crianca", criancaId] });
        queryClient.invalidateQueries({ queryKey: ["status-documentos-lote"] });
        queryClient.invalidateQueries({ queryKey: ["documentos-completos", criancaId] });
        
        toast.success("Documento enviado com sucesso!");
        return data;
      } else {
        const { data, error } = await supabase
          .from("documentos_crianca")
          .insert({
            crianca_id: criancaId,
            tipo_documento_id: tipoDocumentoId,
            arquivo_url: fileName,
            arquivo_nome: file.name,
            status: "pendente",
            enviado_por: userId,
          })
          .select()
          .single();

        if (error) throw error;
        
        // Invalidar queries
        queryClient.invalidateQueries({ queryKey: ["documentos-crianca", criancaId] });
        queryClient.invalidateQueries({ queryKey: ["status-documentos-lote"] });
        queryClient.invalidateQueries({ queryKey: ["documentos-completos", criancaId] });
        
        toast.success("Documento enviado com sucesso!");
        return data;
      }
    } catch (error) {
      toast.error("Erro ao enviar documento: " + getErrorMessage(error));
      throw error;
    } finally {
      setUploadProgress({ progress: 0, isUploading: false, fileName: null });
    }
  }, [queryClient]);

  const resetProgress = useCallback(() => {
    setUploadProgress({ progress: 0, isUploading: false, fileName: null });
  }, []);

  return {
    upload: uploadWithProgress,
    uploadProgress,
    resetProgress,
  };
};

// Hook para aprovar documento (admin)
export const useAprovarDocumento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, criancaId, userId, documentoNome }: { id: string; criancaId: string; userId: string; documentoNome?: string }) => {
      // Buscar status atual para saber se é uma re-aprovação
      const { data: currentDoc } = await supabase
        .from("documentos_crianca")
        .select("aprovado_em")
        .eq("id", id)
        .maybeSingle();

      const isReaproval = !!currentDoc?.aprovado_em;

      const resumoAntes = await calcularResumoDocumentacaoObrigatoria(criancaId);

      const { data, error } = await supabase
        .from("documentos_crianca")
        .update({
          status: "aprovado",
          aprovado_por: userId,
          aprovado_em: new Date().toISOString(),
          motivo_recusa: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const resumoDepois = await calcularResumoDocumentacaoObrigatoria(criancaId);
      const todosAprovados = resumoDepois.pendentes === 0;
      const virouCompletoAgora = resumoAntes.pendentes > 0 && resumoDepois.pendentes === 0;

      // Só envia notificação quando TODOS os documentos obrigatórios estiverem aprovados
      // E se não for apenas uma atualização de documento já aprovado anteriormente
      if (virouCompletoAgora && !isReaproval) {
        try {
          await supabase.functions.invoke('enviar-notificacao', {
            body: {
              crianca_id: criancaId,
              tipo: 'documentos_aprovados',
              dados_adicionais: { 
                todos_aprovados: true,
                total_obrigatorios: resumoDepois.total,
              },
            },
          });
        } catch (notifError) {
          console.error('Erro ao enviar notificação de documentos aprovados:', notifError);
        }
      }

      return { ...data, todosAprovados, isReaproval };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documentos-crianca", variables.criancaId] });
      queryClient.invalidateQueries({ queryKey: ["criancas-com-docs-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["status-documentos-lote"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-completos", variables.criancaId] });
      
      if (result.todosAprovados && !result.isReaproval) {
        toast.success("Documento aprovado! Documentação completa - responsável notificado.");
      } else if (result.isReaproval) {
        toast.success("Atualização de documento aprovada!");
      } else {
        toast.success("Documento aprovado!");
      }
    },
    onError: (error: unknown) => {
      toast.error("Erro ao aprovar documento: " + getErrorMessage(error));
    },
  });
};

// Hook para recusar documento (admin)
export const useRecusarDocumento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, criancaId, motivo }: { id: string; criancaId: string; motivo: string }) => {
      const { data, error } = await supabase
        .from("documentos_crianca")
        .update({
          status: "recusado",
          motivo_recusa: motivo,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação sobre documento recusado
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: criancaId,
            tipo: 'documento_recusado',
            dados_adicionais: { motivo },
          },
        });
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documentos-crianca", variables.criancaId] });
      queryClient.invalidateQueries({ queryKey: ["status-documentos-lote"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-completos", variables.criancaId] });
      queryClient.invalidateQueries({ queryKey: ["criancas-com-docs-pendentes"] });
      toast.success("Documento recusado. Responsável será notificado.");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao recusar documento: " + getErrorMessage(error));
    },
  });
};

// Função para verificar se todos documentos obrigatórios estão aprovados
async function verificarDocumentosCompletos(criancaId: string) {
  const resumo = await calcularResumoDocumentacaoObrigatoria(criancaId);
  return resumo.pendentes === 0;
}

// Hook para verificar se documentos estão completos
export const useVerificarDocumentosCompletos = (criancaId: string | undefined) => {
  return useQuery({
    queryKey: ["documentos-completos", criancaId],
    queryFn: async () => {
      if (!criancaId) return { completos: false, pendentes: 0, total: 0, aprovados: 0, nomesPendentes: [] as string[] };

      const resumo = await calcularResumoDocumentacaoObrigatoria(criancaId);
      return {
        completos: resumo.pendentes === 0,
        pendentes: resumo.pendentes,
        total: resumo.total,
        aprovados: resumo.aprovados,
        nomesPendentes: resumo.nomesPendentes,
      };
    },
    enabled: !!criancaId,
  });
};

// Hook para buscar crianças aguardando documentação (status específico)
export const useCriancasAguardandoDocumentacao = () => {
  return useQuery({
    queryKey: ["criancas-aguardando-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome)
        `)
        .eq("status", "Aguardando Documentação")
        .order("data_convocacao", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

// Hook para buscar crianças COM documentos pendentes (para validação admin)
export const useCriancasComDocumentosPendentes = () => {
  return useQuery({
    queryKey: ["criancas-com-docs-pendentes"],
    queryFn: async () => {
      // Primeiro, buscar IDs de crianças que têm documentos pendentes
      const { data: docsPendentes, error: docsError } = await supabase
        .from("documentos_crianca")
        .select("crianca_id")
        .eq("status", "pendente");

      if (docsError) throw docsError;

      if (!docsPendentes || docsPendentes.length === 0) {
        return [];
      }

      // IDs únicos de crianças
      const criancaIds = [...new Set(docsPendentes.map(d => d.crianca_id))];

      // Buscar dados das crianças
      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome)
        `)
        .in("id", criancaIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Adicionar contagem de docs pendentes para cada criança
      const criancasComContagem = data?.map(crianca => {
        const pendentes = docsPendentes.filter(d => d.crianca_id === crianca.id).length;
        return { ...crianca, docs_pendentes: pendentes };
      });

      return criancasComContagem || [];
    },
  });
};

// Hook para buscar status de documentos de múltiplas crianças
export interface StatusDocumentoItem {
  nome: string;
  status: "aprovado" | "pendente" | "recusado" | "faltante";
}

export interface StatusDocumentosCrianca {
  criancaId: string;
  total: number;
  aprovados: number;
  pendentes: number;
  recusados: number;
  completo: boolean;
  itens: StatusDocumentoItem[];
}

export const useStatusDocumentosLote = (criancaIds: string[]) => {
  return useQuery({
    queryKey: ["status-documentos-lote", criancaIds],
    queryFn: async (): Promise<Record<string, StatusDocumentosCrianca>> => {
      if (!criancaIds.length) return {};

      const incluirDocsDePrioridade = true;

      // Buscar tipos obrigatórios globais
      const { data: tiposObrigatorios } = await supabase
        .from("documentos_tipos")
        .select("id")
        .eq("obrigatorio", true)
        .eq("ativo", true);

      // Mapa de nome por tipo de documento (para detalhar entregues/faltantes)
      const { data: todosTipos } = await supabase
        .from("documentos_tipos")
        .select("id, nome");
      const nomePorTipo = new Map<string, string>(
        (todosTipos || []).map((t: any) => [t.id, t.nome as string])
      );

      const tiposObrigatoriosSetGlobal = new Set((tiposObrigatorios || []).map(t => t.id));
      if (tiposObrigatoriosSetGlobal.size === 0 && !incluirDocsDePrioridade) {
        // Sem documentos obrigatórios, todos estão "completos"
        const result: Record<string, StatusDocumentosCrianca> = {};
        criancaIds.forEach(id => {
          result[id] = { criancaId: id, total: 0, aprovados: 0, pendentes: 0, recusados: 0, completo: true, itens: [] };
        });
        return result;
      }

      // Buscar prioridades que exigem documentos para estas crianças
      let prioridadesDocs: Array<{
        crianca_id: string;
        documento_tipo_id: string | null;
        exige_documento: boolean;
        ativo: boolean;
        status: "pendente" | "aprovado" | "recusado";
        documento_comprovante_url: string | null;
      }> = [];
      const { data: prios } = await supabase
        .from("crianca_prioridades")
        .select(
          "crianca_id,status,documento_comprovante_url,prioridade:tipos_prioridade(documento_tipo_id, exige_documento, ativo)",
        )
        .in("crianca_id", criancaIds);
      prioridadesDocs = (prios || []).map((p: any) => ({
        crianca_id: p.crianca_id,
        documento_tipo_id: p.prioridade?.documento_tipo_id || null,
        exige_documento: !!p.prioridade?.exige_documento,
        ativo: !!p.prioridade?.ativo,
        status: p.status,
        documento_comprovante_url: p.documento_comprovante_url ?? null,
      }));

      // Buscar documentos enviados de todas as crianças
      const { data: documentos } = await supabase
        .from("documentos_crianca")
        .select("crianca_id, tipo_documento_id, status")
        .in("crianca_id", criancaIds);

      // Calcular status por criança
      const result: Record<string, StatusDocumentosCrianca> = {};
      
      criancaIds.forEach(criancaId => {
        // Construir conjunto de tipos obrigatórios por criança:
        const tiposObrigatoriosSet = new Set<string>(tiposObrigatoriosSetGlobal);
        if (incluirDocsDePrioridade) {
          prioridadesDocs
            .filter(pd => pd.crianca_id === criancaId && pd.exige_documento && pd.ativo && pd.documento_tipo_id)
            .forEach(pd => tiposObrigatoriosSet.add(pd.documento_tipo_id as string));
        }

        const docsDestaCrianca = (documentos || []).filter(d => 
          d.crianca_id === criancaId && tiposObrigatoriosSet.has(d.tipo_documento_id)
        );

        const prioridadesDestaCrianca = prioridadesDocs.filter(
          (pd) => pd.crianca_id === criancaId && pd.exige_documento && pd.ativo && !!pd.documento_tipo_id,
        );

        const statusPorTipoDocumento = new Map<
          string,
          { hasAprovado: boolean; hasRecusado: boolean; hasPendente: boolean }
        >();
        docsDestaCrianca.forEach((d: any) => {
          const current = statusPorTipoDocumento.get(d.tipo_documento_id) || {
            hasAprovado: false,
            hasRecusado: false,
            hasPendente: false,
          };
          statusPorTipoDocumento.set(d.tipo_documento_id, {
            hasAprovado: current.hasAprovado || d.status === "aprovado",
            hasRecusado: current.hasRecusado || d.status === "recusado",
            hasPendente: current.hasPendente || d.status === "pendente",
          });
        });

        const statusPorTipoPrioridade = new Map<
          string,
          { hasAprovado: boolean; hasRecusado: boolean; hasPendente: boolean }
        >();
        prioridadesDestaCrianca.forEach((p: any) => {
          const tipoId = p.documento_tipo_id as string;
          const current = statusPorTipoPrioridade.get(tipoId) || {
            hasAprovado: false,
            hasRecusado: false,
            hasPendente: false,
          };
          const temUrl = !!p.documento_comprovante_url;
          statusPorTipoPrioridade.set(tipoId, {
            hasAprovado: current.hasAprovado || (p.status === "aprovado" && temUrl),
            hasRecusado: current.hasRecusado || p.status === "recusado",
            hasPendente: current.hasPendente || p.status === "pendente" || (p.status === "aprovado" && !temUrl),
          });
        });

        let aprovados = 0;
        let pendentes = 0;
        let recusados = 0;
        const itens: StatusDocumentoItem[] = [];

        tiposObrigatoriosSet.forEach((tipoId) => {
          const docAgg = statusPorTipoDocumento.get(tipoId);
          const prioAgg = statusPorTipoPrioridade.get(tipoId);
          const nome = nomePorTipo.get(tipoId) || "Documento";

          const aprovado = !!docAgg?.hasAprovado || !!prioAgg?.hasAprovado;
          if (aprovado) {
            aprovados += 1;
            itens.push({ nome, status: "aprovado" });
            return;
          }

          const recusado = !!docAgg?.hasRecusado || !!prioAgg?.hasRecusado;
          if (recusado) {
            recusados += 1;
            itens.push({ nome, status: "recusado" });
            return;
          }

          pendentes += 1;
          // Diferencia "pendente de análise" (algo enviado) de "faltante" (nada enviado)
          const enviado = !!docAgg?.hasPendente || !!prioAgg?.hasPendente;
          itens.push({ nome, status: enviado ? "pendente" : "faltante" });
        });

        itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

        result[criancaId] = {
          criancaId,
          total: tiposObrigatoriosSet.size,
          aprovados,
          pendentes,
          recusados,
          completo: aprovados === tiposObrigatoriosSet.size,
          itens,
        };
      });

      return result;
    },
    enabled: criancaIds.length > 0,
    staleTime: 5000, // Cache por 5 segundos para atualização rápida
  });
};

// Hook para contar documentos pendentes de aprovação (para badge no menu)
export const useDocumentosPendentesCount = () => {
  return useQuery({
    queryKey: ["documentos-pendentes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("documentos_crianca")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000, // Cache por 30 segundos
    refetchInterval: 60000, // Atualizar a cada minuto
  });
};

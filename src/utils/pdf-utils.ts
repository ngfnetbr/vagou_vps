import html2pdf from 'html2pdf.js';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { labelCanalNotificacao, labelCorRaca, labelEtniaIndigena, labelFormaMoradia, labelNacionalidade, labelParentesco, formatSimNao } from "@/utils/crianca-labels";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { getDefaultRequerimentoSereTemplateConfig } from "@/utils/requerimento-sere-template-default";

// Função para buscar configurações do sistema
const fetchConfiguracoes = async () => {
  const { data } = await supabase
    .from('configuracoes_sistema')
    .select('brasao_url, nome_municipio, nome_secretaria, email_contato, telefone_contato, sistema_nome, unidade_singular, unidade_plural')
    .single();
  return data;
};

// Função para gerar cabeçalho padrão dos PDFs
const gerarCabecalhoPDF = (config: any) => {
  const brasaoHtml = config?.brasao_url 
    ? `<div style="text-align: center; margin-bottom: 10px;">
        <img src="${config.brasao_url}" alt="Brasão" style="height: 60px; width: auto; display: inline-block;" crossorigin="anonymous" />
       </div>`
    : '';

  return `
    <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #1351B4;">
      ${brasaoHtml}
      <h1 style="color: #1351B4; margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">
        ${config?.nome_municipio || 'Município'}
      </h1>
      <h2 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">
        ${config?.nome_secretaria || 'Secretaria de Educação'}
      </h2>
      <p style="color: #666; margin: 0; font-size: 10px;">
        ${config?.email_contato ? `E-mail: ${config.email_contato}` : ''}
        ${config?.email_contato && config?.telefone_contato ? ' | ' : ''}
        ${config?.telefone_contato ? `Tel: ${config.telefone_contato}` : ''}
      </p>
    </div>
  `;
};

// Função para gerar rodapé padrão dos PDFs
const gerarRodapePDF = (config: any) => {
  const { plural } = getUnidadeLabels(config);
  const sistemaNome = config?.sistema_nome || "VAGOU";
  return `
    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px;">
      <p style="margin: 0;">Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <p style="margin: 5px 0 0 0;">${sistemaNome} - Gestão de Vagas em ${plural}</p>
    </div>
  `;
};

export const gerarFichaPDF = async (criancaId: string) => {
  try {
    return await gerarFichaCompletaPDF(criancaId);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};

export const gerarComprovantePDF = async (
  criancaId: string,
  tipo: "inscricao" | "convocacao" | "matricula"
) => {
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data: refreshData } = await supabase.auth.refreshSession();
    const session = refreshData.session ?? currentSession;

    if (!session?.access_token) {
      throw new Error("Sessão expirada ou ausente. Faça login novamente para gerar o comprovante.");
    }

    const functionsClient = supabase.functions;
    functionsClient.setAuth(session.access_token);
    const { data, error } = await functionsClient.invoke('gerar-comprovante', {
      body: { crianca_id: criancaId, tipo },
    });

    if (error) throw error;

    if (!data?.html) {
      throw new Error('HTML não retornado pela função');
    }

    // Criar elemento temporário com o HTML
    const element = document.createElement('div');
    element.innerHTML = DOMPurify.sanitize(data.html);
    element.style.width = '190mm'; // A4 width minus margins
    element.style.padding = '0';
    element.style.boxSizing = 'border-box';

    // Configurações do PDF com margens adequadas
    const opt = {
      margin: [10, 10, 15, 10] as [number, number, number, number], // top, left, bottom, right in mm
      filename: `comprovante_${tipo}_${data.crianca_nome}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: 'avoid-all' }
    };

    // Gerar e baixar PDF
    await html2pdf().set(opt).from(element).save();

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar comprovante PDF:', error);
    throw error;
  }
};

// Interface para ficha completa
interface CriancaFichaCompleta {
  id: string;
  nome: string;
  data_nascimento: string;
  sexo: string;
  cpf_crianca?: string;
  programas_sociais?: boolean;
  status: string;
  prioridade?: string;
  posicao_fila?: number;
  created_at: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_telefone: string;
  responsavel_celular?: string;
  responsavel_email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  cmei_atual?: { nome: string; endereco?: string; telefone?: string };
  turma_atual?: { nome: string; turno?: string };
  cmei1?: { nome: string };
  cmei2?: { nome: string };
  aceita_qualquer_cmei?: boolean;
  convocacao_deadline?: string;
  data_convocacao?: string;
}

interface HistoricoItem {
  id: string;
  acao: string;
  descricao?: string;
  justificativa?: string;
  status_anterior?: string;
  status_novo?: string;
  created_at: string;
  cmei_anterior_rel?: { nome: string };
  cmei_novo_rel?: { nome: string };
  turma_anterior_rel?: { nome: string };
  turma_novo_rel?: { nome: string };
}

interface DocumentoItem {
  id: string;
  arquivo_nome?: string;
  status?: string;
  tipo_documento?: { nome: string };
  created_at: string;
}

export const gerarFichaCompletaPDF = async (criancaId: string) => {
  try {
    // Buscar configurações
    const config = await fetchConfiguracoes();
    const { singular } = getUnidadeLabels(config);

    // Buscar dados da criança
    const { data: crianca, error: criancaError } = await supabase
      .from('criancas')
      .select(`
        *,
        cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, endereco, telefone),
        turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno),
        cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
        cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome),
        cmei3:cmeis!criancas_cmei3_preferencia_fkey(nome)
      `)
      .eq('id', criancaId)
      .single();

    if (criancaError) throw criancaError;

    // Buscar histórico
    const { data: historico } = await supabase
      .from('historico')
      .select(`
        *,
        cmei_anterior_rel:cmeis!historico_cmei_anterior_fkey(nome),
        cmei_novo_rel:cmeis!historico_cmei_novo_fkey(nome),
        turma_anterior_rel:turmas!historico_turma_anterior_fkey(nome),
        turma_novo_rel:turmas!historico_turma_novo_fkey(nome)
      `)
      .eq('crianca_id', criancaId)
      .order('created_at', { ascending: false });

    // Buscar documentos
    const { data: documentos } = await supabase
      .from('documentos_crianca')
      .select(`
        *,
        tipo_documento:documentos_tipos(nome)
      `)
      .eq('crianca_id', criancaId)
      .order('created_at', { ascending: false });

    let historicoSondagens: any[] = [];
    let samRecords: any[] = [];
    let samAppointments: any[] = [];
    let samComplaints: any[] = [];

    try {
      const { data } = await supabase
        .from("sondagens")
        .select(`
          id, periodo, status, observacoes, created_at,
          respostas_sondagem(
            nivel_id,
            niveis_aprendizagem(id, codigo, descricao, tipo, ordem)
          )
        `)
        .eq("crianca_id", criancaId)
        .eq("status", "finalizado")
        .order("created_at", { ascending: true });

      historicoSondagens = (data || []).map((s: any) => ({
        id: s.id,
        periodo: s.periodo,
        status: s.status,
        observacoes: s.observacoes,
        created_at: s.created_at,
        respostas: (s.respostas_sondagem || []).map((r: any) => ({
          nivel_id: r.nivel_id,
          codigo: r.niveis_aprendizagem?.codigo || "",
          descricao: r.niveis_aprendizagem?.descricao || "",
          tipo: r.niveis_aprendizagem?.tipo || "",
          ordem: r.niveis_aprendizagem?.ordem || 0,
        })),
      }));
    } catch {
      historicoSondagens = [];
    }

    try {
      const [{ data: recordsData }, { data: appointmentsData }, { data: complaintsData }] = await Promise.all([
        supabase
          .from("appointment_records")
          .select("id, created_at, specialty, summary, return_date, profiles(full_name, registration_number)")
          .eq("student_id", criancaId)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("id, date, status, type, document_url")
          .eq("student_id", criancaId)
          .order("date", { ascending: false }),
        supabase
          .from("school_complaints")
          .select("id, protocol, laudo_type, document_url, created_at, primary_complaint")
          .eq("student_id", criancaId)
          .order("created_at", { ascending: false }),
      ]);

      samRecords = recordsData || [];
      samAppointments = appointmentsData || [];
      samComplaints = complaintsData || [];
    } catch {
      samRecords = [];
      samAppointments = [];
      samComplaints = [];
    }

    const { data: camposCustom } = await supabase
      .from("campos_inscricao")
      .select("id,secao,label,tipo,ordem,campo_sistema,visivel_responsavel,ativo")
      .eq("ativo", true)
      .eq("campo_sistema", false)
      .eq("visivel_responsavel", true)
      .order("secao", { ascending: true })
      .order("ordem", { ascending: true });

    const { data: valoresCustom } = await supabase
      .from("valores_campos_custom")
      .select("campo_id,valor")
      .eq("crianca_id", criancaId);

    const formatarValorCustom = (valor: string | null, tipo?: string | null) => {
      if (!valor) return "-";
      if (tipo === "checkbox") return valor === "true" ? "Sim" : "Não";
      if (tipo === "date") {
        try {
          return new Date(valor).toLocaleDateString("pt-BR");
        } catch {
          return valor;
        }
      }
      return valor;
    };

    const getValorCustom = (campoId: string) =>
      valoresCustom?.find((v: any) => v.campo_id === campoId)?.valor ?? null;

    const labelSecaoCustom: Record<string, string> = {
      crianca: "Criança",
      responsavel: "Responsável",
      endereco: "Endereço",
      preferencias: "Preferências",
      observacoes: "Observações",
    };

    // Calcular idade
    const calcularIdade = (dataNascimento: string) => {
      const hoje = new Date();
      const nascimento = new Date(dataNascimento);
      const meses = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      const anos = Math.floor(meses / 12);
      const mesesRestantes = meses % 12;
      if (anos === 0) return `${meses} meses`;
      if (mesesRestantes === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
      return `${anos} ${anos === 1 ? "ano" : "anos"} e ${mesesRestantes} ${mesesRestantes === 1 ? "mês" : "meses"}`;
    };

    const formatarData = (data: string) => {
      return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarDataHora = (data: string) => {
      return new Date(data).toLocaleString('pt-BR');
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Matriculado':
        case 'Matriculada':
          return '#22c55e';
        case 'Convocado':
          return '#3b82f6';
        case 'Fila de Espera':
          return '#f59e0b';
        case 'Desistente':
        case 'Recusada':
          return '#ef4444';
        default:
          return '#6b7280';
      }
    };

    const getDocStatusColor = (status?: string) => {
      switch (status) {
        case 'aprovado': return '#22c55e';
        case 'recusado': return '#ef4444';
        default: return '#f59e0b';
      }
    };

    const getDocStatusLabel = (status?: string) => {
      switch (status) {
        case 'aprovado': return 'Aprovado';
        case 'recusado': return 'Recusado';
        default: return 'Pendente';
      }
    };

    const isSondagemAplicavel = (() => {
      try {
        const nascimento = new Date(crianca.data_nascimento);
        if (Number.isNaN(nascimento.getTime())) return false;
        const hoje = new Date();
        const meses = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return meses >= 36 && meses <= 107;
      } catch {
        return false;
      }
    })();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a; font-size: 11px; line-height: 1.4;">
        ${gerarCabecalhoPDF(config)}

        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
            Ficha Geral do Aluno
          </h3>
          <p style="color: #64748b; margin: 0 0 4px 0; font-size: 10px;">
            VAGOU • SAM • Sondagem
          </p>
          <p style="color: #64748b; margin: 0; font-size: 10px;">
            Protocolo: ${crianca.id.substring(0, 8).toUpperCase()}
          </p>
        </div>

        <!-- Status -->
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid ${getStatusColor(crianca.status)};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: bold; font-size: 14px; color: ${getStatusColor(crianca.status)};">${crianca.status}</span>
              ${crianca.prioridade && crianca.prioridade !== 'Geral' ? `<span style="margin-left: 10px; background: #e2e8f0; padding: 2px 8px; border-radius: 10px; font-size: 10px;">${crianca.prioridade}</span>` : ''}
            </div>
            ${crianca.posicao_fila ? `<div style="text-align: right;"><span style="font-size: 10px; color: #64748b;">Posição na Fila:</span> <strong>${crianca.posicao_fila}ª</strong></div>` : ''}
          </div>
        </div>

        <!-- Dados da Criança -->
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Dados da Criança
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">Nome:</td>
              <td style="padding: 4px 0;">${crianca.nome}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Data de Nascimento:</td>
              <td style="padding: 4px 0;">${formatarData(crianca.data_nascimento)} (${calcularIdade(crianca.data_nascimento)})</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Sexo:</td>
              <td style="padding: 4px 0;">${crianca.sexo}</td>
            </tr>
            ${crianca.cpf_crianca ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">CPF:</td><td style="padding: 4px 0;">${crianca.cpf_crianca}</td></tr>` : ''}
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Programas Sociais:</td>
              <td style="padding: 4px 0;">${crianca.programas_sociais ? 'Sim' : 'Não'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Data da Inscrição:</td>
              <td style="padding: 4px 0;">${formatarDataHora(crianca.created_at)}</td>
            </tr>
          </table>
        </div>

        <!-- Dados do Responsável -->
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Dados do Responsável
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">Nome:</td>
              <td style="padding: 4px 0;">${crianca.responsavel_nome}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">CPF:</td>
              <td style="padding: 4px 0;">${crianca.responsavel_cpf}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Telefone:</td>
              <td style="padding: 4px 0;">${crianca.responsavel_telefone}</td>
            </tr>
            ${crianca.responsavel_celular ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Celular:</td><td style="padding: 4px 0;">${crianca.responsavel_celular}</td></tr>` : ''}
            ${crianca.responsavel_email ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">E-mail:</td><td style="padding: 4px 0;">${crianca.responsavel_email}</td></tr>` : ''}
          </table>
        </div>

        <!-- Endereço -->
        ${crianca.logradouro || crianca.bairro || crianca.cidade ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Endereço
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            ${crianca.cep ? `<tr><td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">CEP:</td><td style="padding: 4px 0;">${crianca.cep}</td></tr>` : ''}
            ${crianca.logradouro ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Logradouro:</td><td style="padding: 4px 0;">${crianca.logradouro}${crianca.numero ? `, ${crianca.numero}` : ''}${crianca.complemento ? ` - ${crianca.complemento}` : ''}</td></tr>` : ''}
            ${crianca.bairro ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Bairro:</td><td style="padding: 4px 0;">${crianca.bairro}</td></tr>` : ''}
            ${crianca.cidade ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Cidade/UF:</td><td style="padding: 4px 0;">${crianca.cidade}${crianca.estado ? ` - ${crianca.estado}` : ''}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        <!-- Preferências e unidade atual -->
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            ${singular} e Turma
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            ${crianca.cmei_atual ? `
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">${singular} Atual:</td>
              <td style="padding: 4px 0;">${crianca.cmei_atual.nome}</td>
            </tr>
            ` : ''}
            ${crianca.turma_atual ? `
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Turma:</td>
              <td style="padding: 4px 0;">${crianca.turma_atual.nome} ${crianca.turma_atual.turno ? `(${crianca.turma_atual.turno})` : ''}</td>
            </tr>
            ` : ''}
            ${crianca.cmei1 ? `
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">1ª Preferência:</td>
              <td style="padding: 4px 0;">${crianca.cmei1.nome}</td>
            </tr>
            ` : ''}
            ${crianca.cmei2 ? `
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">2ª Preferência:</td>
              <td style="padding: 4px 0;">${crianca.cmei2.nome}</td>
            </tr>
            ` : ''}
            ${crianca.cmei3 ? `
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">3ª Preferência:</td>
              <td style="padding: 4px 0;">${crianca.cmei3.nome}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Aceita qualquer ${singular}:</td>
              <td style="padding: 4px 0;">${crianca.aceita_qualquer_cmei ? 'Sim' : 'Não'}</td>
            </tr>
          </table>
        </div>

        <!-- Dados adicionais -->
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Dados Adicionais
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">Certidão:</td><td style="padding: 4px 0;">${crianca.certidao_nascimento || "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">NIS:</td><td style="padding: 4px 0;">${crianca.nis || "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Cor/Raça (autodecl.):</td><td style="padding: 4px 0;">${crianca.cor_raca_autodeclarada ? labelCorRaca(crianca.cor_raca_autodeclarada) : "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Cor/Raça (certidão):</td><td style="padding: 4px 0;">${crianca.cor_raca_certidao ? labelCorRaca(crianca.cor_raca_certidao) : "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Etnia indígena:</td><td style="padding: 4px 0;">${crianca.etnia_indigena ? labelEtniaIndigena(crianca.etnia_indigena, crianca.etnia_indigena_outra) : "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Quilombo:</td><td style="padding: 4px 0;">${crianca.quilombo_remanescente === null || crianca.quilombo_remanescente === undefined ? "-" : `${formatSimNao(crianca.quilombo_remanescente)}${crianca.quilombo_nome ? ` (${crianca.quilombo_nome})` : ""}`}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Nacionalidade:</td><td style="padding: 4px 0;">${crianca.nacionalidade ? `${labelNacionalidade(crianca.nacionalidade)}${crianca.nacionalidade === "estrangeira" ? ` | Possui documentos: ${formatSimNao(crianca.estrangeiro_possui_documentos)}` : ""}` : "-"}</td></tr>
          </table>
        </div>

        <!-- Dados do Responsável (Complementares) -->
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Responsável (Complementares)
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">RG:</td><td style="padding: 4px 0;">${crianca.responsavel_rg || "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Parentesco:</td><td style="padding: 4px 0;">${crianca.responsavel_parentesco ? labelParentesco(crianca.responsavel_parentesco, crianca.responsavel_parentesco_outro) : "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Tel. comercial:</td><td style="padding: 4px 0;">${crianca.responsavel_telefone_comercial || "-"}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Canal preferido:</td><td style="padding: 4px 0;">${crianca.canal_notificacao_preferido ? labelCanalNotificacao(crianca.canal_notificacao_preferido) : "-"}</td></tr>
          </table>
        </div>

        <!-- Filiação -->
        ${(crianca.filiacao1_nao_declarada || crianca.filiacao1_nome || crianca.filiacao2_nao_declarada || crianca.filiacao2_nome) ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Filiação
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 8px; font-weight: 700; width: 150px; color: #374151;">Filiação 1:</td>
              <td style="padding: 4px 0;">${crianca.filiacao1_nao_declarada ? "Não declarada" : (crianca.filiacao1_nome || "-")}</td>
            </tr>
            ${!crianca.filiacao1_nao_declarada ? `
            ${crianca.filiacao1_rg ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">RG:</td><td style="padding: 4px 0;">${crianca.filiacao1_rg}</td></tr>` : ''}
            ${crianca.filiacao1_cpf ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">CPF:</td><td style="padding: 4px 0;">${crianca.filiacao1_cpf}</td></tr>` : ''}
            ${crianca.filiacao1_email ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">E-mail:</td><td style="padding: 4px 0;">${crianca.filiacao1_email}</td></tr>` : ''}
            ${crianca.filiacao1_celular ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Celular:</td><td style="padding: 4px 0;">${crianca.filiacao1_celular}</td></tr>` : ''}
            ${crianca.filiacao1_telefone_comercial ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Tel. comercial:</td><td style="padding: 4px 0;">${crianca.filiacao1_telefone_comercial}</td></tr>` : ''}
            ` : ''}
            <tr>
              <td style="padding: 8px 0;" colspan="2"></td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 700; color: #374151;">Filiação 2:</td>
              <td style="padding: 4px 0;">${crianca.filiacao2_nao_declarada ? "Não declarada" : (crianca.filiacao2_nome || "-")}</td>
            </tr>
            ${!crianca.filiacao2_nao_declarada ? `
            ${crianca.filiacao2_rg ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">RG:</td><td style="padding: 4px 0;">${crianca.filiacao2_rg}</td></tr>` : ''}
            ${crianca.filiacao2_cpf ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">CPF:</td><td style="padding: 4px 0;">${crianca.filiacao2_cpf}</td></tr>` : ''}
            ${crianca.filiacao2_email ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">E-mail:</td><td style="padding: 4px 0;">${crianca.filiacao2_email}</td></tr>` : ''}
            ${crianca.filiacao2_celular ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Celular:</td><td style="padding: 4px 0;">${crianca.filiacao2_celular}</td></tr>` : ''}
            ${crianca.filiacao2_telefone_comercial ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Tel. comercial:</td><td style="padding: 4px 0;">${crianca.filiacao2_telefone_comercial}</td></tr>` : ''}
            ` : ''}
          </table>
        </div>
        ` : ''}

        <!-- Moradia -->
        ${(crianca.unidade_consumidora || crianca.forma_ocupacao_moradia) ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Moradia
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            ${crianca.unidade_consumidora ? `<tr><td style="padding: 4px 8px; font-weight: 600; width: 150px; color: #374151;">Unid. consumidora:</td><td style="padding: 4px 0;">${crianca.unidade_consumidora}</td></tr>` : ''}
            ${crianca.forma_ocupacao_moradia ? `<tr><td style="padding: 4px 8px; font-weight: 600; color: #374151;">Ocupação:</td><td style="padding: 4px 0;">${labelFormaMoradia(crianca.forma_ocupacao_moradia, crianca.forma_ocupacao_moradia_outro)}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        <!-- Campos customizados -->
        ${camposCustom && camposCustom.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Informações Adicionais (Formulário)
          </h4>
          ${Object.entries(
            (camposCustom as any[]).reduce((acc: any, campo: any) => {
              const key = campo.secao || "outros";
              if (!acc[key]) acc[key] = [];
              acc[key].push(campo);
              return acc;
            }, {}),
          )
            .map(([secao, campos]: any) => {
              const titulo = labelSecaoCustom[String(secao)] || String(secao);
              const linhas = (campos as any[])
                .map((campo: any) => {
                  const valor = getValorCustom(campo.id);
                  const valorFormatado = formatarValorCustom(valor, campo.tipo);
                  return `
                    <tr>
                      <td style="padding: 4px 8px; border: 1px solid #e2e8f0; font-weight: 600; width: 240px; color: #374151;">${campo.label}</td>
                      <td style="padding: 4px 8px; border: 1px solid #e2e8f0;">${valorFormatado}</td>
                    </tr>
                  `;
                })
                .join("");
              return `
                <div style="margin-bottom: 10px;">
                  <div style="font-weight: 700; color: #1351B4; margin: 0 0 6px 0; font-size: 11px;">${titulo}</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <tbody>
                      ${linhas}
                    </tbody>
                  </table>
                </div>
              `;
            })
            .join("")}
        </div>
        ` : ''}

        <!-- Documentos -->
        ${documentos && documentos.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Documentos (${documentos.length})
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Tipo</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Arquivo</th>
                <th style="padding: 6px 8px; text-align: center; border: 1px solid #e2e8f0;">Status</th>
                <th style="padding: 6px 8px; text-align: center; border: 1px solid #e2e8f0;">Data</th>
              </tr>
            </thead>
            <tbody>
              ${documentos.map((d: any) => `
              <tr>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${d.tipo_documento?.nome || '-'}</td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${d.arquivo_nome || '-'}</td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <span style="color: ${getDocStatusColor(d.status)};">${getDocStatusLabel(d.status)}</span>
                </td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${formatarData(d.created_at)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Sondagem -->
        ${(isSondagemAplicavel || historicoSondagens.length > 0) ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Sondagem (${historicoSondagens.length})
          </h4>
          ${historicoSondagens.length === 0 ? `
            <p style="margin: 0; color: #64748b; font-size: 10px;">Nenhuma sondagem finalizada registrada.</p>
          ` : `
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Período</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 85px;">Data</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Escrita</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Produção</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Observações</th>
              </tr>
            </thead>
            <tbody>
              ${historicoSondagens.map((s: any) => {
                const escrita = (s.respostas || []).find((r: any) => r.tipo === "escrita");
                const prod = (s.respostas || []).find((r: any) => r.tipo === "producao_texto");
                return `
                <tr>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${s.periodo}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${s.created_at ? formatarData(s.created_at) : '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${escrita ? `${escrita.codigo} - ${escrita.descricao}` : '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${prod ? `${prod.codigo} - ${prod.descricao}` : '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${s.observacoes || '-'}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          `}
        </div>
        ` : ''}

        <!-- SAM -->
        ${(samRecords.length > 0 || samAppointments.length > 0 || samComplaints.length > 0) ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            SAM (Atendimentos e Prontuário)
          </h4>

          ${samRecords.length > 0 ? `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 700; color: #1351B4; margin: 0 0 6px 0; font-size: 11px;">Registros de Atendimento (${samRecords.length})</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 110px;">Data</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 120px;">Especialidade</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Profissional</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Resumo</th>
                </tr>
              </thead>
              <tbody>
                ${samRecords.map((r: any) => `
                <tr>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${r.created_at ? formatarDataHora(r.created_at) : '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${r.specialty || '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${r.profiles?.full_name || '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${r.summary || '-'}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${samAppointments.length > 0 ? `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 700; color: #1351B4; margin: 0 0 6px 0; font-size: 11px;">Histórico de Agendamentos (${samAppointments.length})</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 110px;">Data</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Tipo</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 90px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${samAppointments.map((a: any) => `
                <tr>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${a.date ? formatarDataHora(a.date) : '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${a.type || '-'}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${a.status || '-'}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${(() => {
            const docsAtend = (samAppointments || []).filter((a: any) => a.document_url);
            const docsQueixas = (samComplaints || []).filter((c: any) => c.document_url);
            const total = docsAtend.length + docsQueixas.length;
            if (total === 0) return '';
            return `
              <div style="margin-bottom: 10px;">
                <div style="font-weight: 700; color: #1351B4; margin: 0 0 6px 0; font-size: 11px;">Documentos (Receitas/Laudos) (${total})</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr style="background: #f1f5f9;">
                      <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 120px;">Origem</th>
                      <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Referência</th>
                      <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 85px;">Data</th>
                      <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${docsAtend.map((a: any) => `
                      <tr>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">Atendimento</td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${a.type || '-'}</td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${a.date ? formatarData(a.date) : '-'}</td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${a.document_url}</td>
                      </tr>
                    `).join('')}
                    ${docsQueixas.map((c: any) => `
                      <tr>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">Queixa/Laudo</td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${c.protocol || c.laudo_type || '-'}</td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${c.created_at ? formatarData(c.created_at) : '-'}</td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${c.document_url}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          })()}
        </div>
        ` : ''}

        <!-- Histórico -->
        ${historico && historico.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Histórico de Movimentações (${historico.length})
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; width: 110px;">Data</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Ação</th>
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0;">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${historico.map((h: any) => {
                let detalhes = h.descricao || '';
                if (h.status_anterior && h.status_novo) {
                  detalhes += ` ${h.status_anterior} → ${h.status_novo}`;
                }
                if (h.cmei_novo_rel?.nome) {
                  detalhes += ` | ${singular}: ${h.cmei_novo_rel.nome}`;
                }
                if (h.turma_novo_rel?.nome) {
                  detalhes += ` | Turma: ${h.turma_novo_rel.nome}`;
                }
                if (h.justificativa) {
                  detalhes += ` | Motivo: ${h.justificativa}`;
                }
                return `
                <tr>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${formatarDataHora(h.created_at)}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: 600; color: #1351B4;">${h.acao}</td>
                  <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px;">${detalhes.trim()}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Observações -->
        ${crianca.observacoes ? `
        <div style="margin-bottom: 15px;">
          <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">
            Observações
          </h4>
          <p style="background: #f8fafc; padding: 10px; border-radius: 4px; margin: 0; font-size: 10px;">${crianca.observacoes}</p>
        </div>
        ` : ''}

        ${gerarRodapePDF(config)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = DOMPurify.sanitize(html);
    element.style.width = '210mm';
    element.style.padding = '10mm';

    const opt = {
      margin: [5, 5, 10, 5] as [number, number, number, number],
      filename: `ficha_completa_${crianca.nome.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar ficha completa:', error);
    throw error;
  }
};

interface CriancaRequerimentoSere {
  id: string;
  nome: string;
  data_nascimento: string;
  sexo: string;
  cpf_crianca?: string | null;
  certidao_nascimento?: string | null;
  programas_sociais?: boolean | null;
  cor_raca_autodeclarada?: string | null;
  cor_raca_certidao?: string | null;
  etnia_indigena?: string | null;
  etnia_indigena_outra?: string | null;
  quilombo_remanescente?: string | null;
  quilombo_nome?: string | null;
  nacionalidade?: string | null;
  estrangeiro_possui_documentos?: string | null;
  nis?: string | null;
  unidade_consumidora?: string | null;
  forma_ocupacao_moradia?: string | null;
  forma_ocupacao_moradia_outro?: string | null;
  filiacao1_nao_declarada?: boolean | null;
  filiacao1_nome?: string | null;
  filiacao1_rg?: string | null;
  filiacao1_cpf?: string | null;
  filiacao1_email?: string | null;
  filiacao1_celular?: string | null;
  filiacao1_telefone_comercial?: string | null;
  filiacao2_nao_declarada?: boolean | null;
  filiacao2_nome?: string | null;
  filiacao2_rg?: string | null;
  filiacao2_cpf?: string | null;
  filiacao2_email?: string | null;
  filiacao2_celular?: string | null;
  filiacao2_telefone_comercial?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  responsavel_telefone?: string | null;
}

const checkboxHtml = (checked: boolean) => {
  return `<span style="display:inline-block;width:12px;height:12px;border:1px solid #000;vertical-align:middle;text-align:center;line-height:12px;font-size:10px;">${checked ? "X" : ""}</span>`;
};

const parseBool = (value?: string | null) => {
  if (value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
  return s === "true" || s === "sim" || s === "1" || s === "yes";
};

const fetchValoresCamposInscricao = async (criancaId: string, nomeCampos: string[]) => {
  const { data: campos, error: camposError } = await supabase
    .from("campos_inscricao")
    .select("id,nome_campo")
    .in("nome_campo", nomeCampos);

  if (camposError) throw camposError;

  const ids = (campos || []).map((c: any) => c.id).filter(Boolean);
  if (ids.length === 0) return {} as Record<string, string>;

  const { data: valores, error: valoresError } = await supabase
    .from("valores_campos_custom")
    .select("campo_id,valor")
    .eq("crianca_id", criancaId)
    .in("campo_id", ids);

  if (valoresError) throw valoresError;

  const idToNome = new Map((campos || []).map((c: any) => [c.id, c.nome_campo]));
  const result: Record<string, string> = {};

  (valores || []).forEach((v: any) => {
    const nome = idToNome.get(v.campo_id);
    if (!nome) return;
    result[nome] = v.valor ?? "";
  });

  return result;
};

export const gerarRequerimentoSerePDF = async (criancaId: string) => {
  try {
    const { data: criancaData, error: criancaError } = await supabase
      .from("criancas")
      .select(
        `
          id,
          nome,
          data_nascimento,
          sexo,
          cpf_crianca,
          certidao_nascimento,
          programas_sociais,
          cor_raca_autodeclarada,
          cor_raca_certidao,
          etnia_indigena,
          etnia_indigena_outra,
          quilombo_remanescente,
          quilombo_nome,
          nacionalidade,
          estrangeiro_possui_documentos,
          nis,
          unidade_consumidora,
          forma_ocupacao_moradia,
          forma_ocupacao_moradia_outro,
          filiacao1_nao_declarada,
          filiacao1_nome,
          filiacao1_rg,
          filiacao1_cpf,
          filiacao1_email,
          filiacao1_celular,
          filiacao1_telefone_comercial,
          filiacao2_nao_declarada,
          filiacao2_nome,
          filiacao2_rg,
          filiacao2_cpf,
          filiacao2_email,
          filiacao2_celular,
          filiacao2_telefone_comercial,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          responsavel_telefone
        `
      )
      .eq("id", criancaId)
      .single();

    if (criancaError) throw criancaError;
    const crianca = criancaData as unknown as CriancaRequerimentoSere;

    const { data: documentos } = await supabase
      .from("documentos_crianca")
      .select(
        `
          id,
          status,
          tipo_documento:documentos_tipos(nome)
        `
      )
      .eq("crianca_id", criancaId);

    const tiposAprovados = (documentos || [])
      .filter((d: any) => d?.status === "aprovado")
      .map((d: any) => String(d?.tipo_documento?.nome || "").toLowerCase());

    const docEntregue = {
      comprovanteResidencia: tiposAprovados.some((n) => n.includes("resid")),
      certidaoNascimento: tiposAprovados.some((n) => n.includes("certid")),
      comprovanteVacinacao: tiposAprovados.some((n) => n.includes("vacina")),
      cpfEstudante: tiposAprovados.some(
        (n) =>
          n.includes("cpf") &&
          (n.includes("estud") || n.includes("crian") || n.includes("crianc") || n.includes("da crianca") || n.includes("da criança"))
      ),
    };

    const { data: cfgSistema } = await supabase
      .from("configuracoes_sistema")
      .select("requerimento_sere_template_config")
      .maybeSingle();

    const templateConfig = (cfgSistema as any)?.requerimento_sere_template_config as any;
    const fallbackConfig = getDefaultRequerimentoSereTemplateConfig();

    const hasAnyAnchor = (cfg: any) => {
      const tf = Array.isArray(cfg?.textFields) ? cfg.textFields : [];
      const cb = Array.isArray(cfg?.checkboxes) ? cfg.checkboxes : [];
      const hasTf = tf.some((f: any) => Number(f?.x || 0) !== 0 || Number(f?.y || 0) !== 0);
      const hasCb = cb.some((c: any) => Number(c?.x || 0) !== 0 || Number(c?.y || 0) !== 0);
      return hasTf || hasCb;
    };

    const effectiveConfig = hasAnyAnchor(templateConfig) ? templateConfig : fallbackConfig;
    const camposNecessarios = new Set<string>();
    const textFieldsCfg = Array.isArray(effectiveConfig?.textFields) ? (effectiveConfig.textFields as any[]) : [];
    const checkboxesCfg = Array.isArray(effectiveConfig?.checkboxes) ? (effectiveConfig.checkboxes as any[]) : [];

    textFieldsCfg.forEach((f) => {
      const k = String(f?.key || "").trim();
      if (k) camposNecessarios.add(k);
    });

    checkboxesCfg.forEach((c) => {
      const k = String(c?.key || "").trim();
      if (!k) return;
      if (k.startsWith("cor_auto_")) camposNecessarios.add("cor_raca_autodeclarada");
      else if (k.startsWith("cor_cert_")) camposNecessarios.add("cor_raca_certidao");
      else if (k.startsWith("etnia_")) camposNecessarios.add("etnia_indigena");
      else if (k === "quilombo_sim" || k === "quilombo_nao") camposNecessarios.add("quilombo_remanescente");
      else if (k.startsWith("nacionalidade_")) camposNecessarios.add("nacionalidade");
      else if (k.startsWith("estrangeiro_docs_")) camposNecessarios.add("estrangeiro_possui_documentos");
      else if (k.includes("__")) camposNecessarios.add(k.split("__")[0]);
      else if (!k.startsWith("doc_") && !k.startsWith("sexo_") && !k.startsWith("programa_") && !k.startsWith("vacina_")) camposNecessarios.add(k);
    });

    const valoresCampos = await fetchValoresCamposInscricao(criancaId, Array.from(camposNecessarios));
    const templateUrl =
      typeof effectiveConfig?.templateUrl === "string" && effectiveConfig.templateUrl.trim()
        ? effectiveConfig.templateUrl.trim()
        : "/templates/SERE.pdf";

    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      throw new Error("Template do requerimento não encontrado no app");
    }
    const templateBytes = await templateResponse.arrayBuffer();

    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    if (effectiveConfig) {
      const textFields = Array.isArray(effectiveConfig.textFields) ? (effectiveConfig.textFields as any[]) : [];
      const checkboxes = Array.isArray(effectiveConfig.checkboxes) ? (effectiveConfig.checkboxes as any[]) : [];

      const parseHexColor = (hex: string | undefined, fallback: { r: number; g: number; b: number }) => {
        const v = String(hex || "").trim();
        const m = /^#?([0-9a-fA-F]{6})$/.exec(v);
        if (!m) return rgb(fallback.r / 255, fallback.g / 255, fallback.b / 255);
        const n = m[1];
        const r = parseInt(n.slice(0, 2), 16);
        const g = parseInt(n.slice(2, 4), 16);
        const b = parseInt(n.slice(4, 6), 16);
        return rgb(r / 255, g / 255, b / 255);
      };

      const textColor = parseHexColor(effectiveConfig?.textColor, { r: 0, g: 0, b: 0 });
      const xColor = parseHexColor(effectiveConfig?.xColor, { r: 0, g: 0, b: 0 });

      const formatarData = (data?: string | null) => {
        if (!data) return "";
        return new Date(data).toLocaleDateString("pt-BR");
      };

      const fitText = (text: string, maxWidth: number, fontSize: number) => {
        if (!text) return { text: "", size: fontSize };
        let size = fontSize;
        let t = text;
        const measure = (s: string, sz: number) => font.widthOfTextAtSize(s, sz);
        while (size > 6 && measure(t, size) > maxWidth) size -= 0.5;
        if (measure(t, size) <= maxWidth) return { text: t, size };
        const ellipsis = "…";
        while (t.length > 0 && measure(t + ellipsis, size) > maxWidth) {
          t = t.slice(0, -1);
        }
        return { text: t ? t + ellipsis : "", size };
      };

      const drawText = (anchor: any, value: string) => {
        if (!anchor) return;
        const pageIndex = Math.max(0, Number(anchor.page || 1) - 1);
        const page = pdfDoc.getPage(pageIndex);
        const x = Number(anchor.x || 0);
        const rawY = Number(anchor.y || 0);
        if (!x && !rawY) return;
        const maxWidth = Number(anchor.maxWidth || 0) || 200;
        const fontSize = Number(anchor.fontSize || 9) || 9;
        const cfgVersion = Number(effectiveConfig?.version || 1);
        const baselineShift = fontSize * 0.35;
        const y = cfgVersion >= 2 ? rawY - baselineShift : rawY;
        const { text, size } = fitText(value || "", maxWidth, fontSize);
        if (!text) return;
        page.drawText(text, { x, y, size, font, color: textColor });
      };

      const drawX = (anchor: any) => {
        if (!anchor) return;
        const pageIndex = Math.max(0, Number(anchor.page || 1) - 1);
        const page = pdfDoc.getPage(pageIndex);
        const x = Number(anchor.x || 0);
        const y = Number(anchor.y || 0);
        if (!x && !y) return;
        page.drawText("X", { x: x - 2.2, y: y - 2.2, size: 9, font, color: xColor });
      };

      const resolveText = (key: string) => {
        if (key === "data_nascimento") return formatarData(crianca.data_nascimento);
        const v1 = (crianca as any)[key];
        if (v1 !== undefined && v1 !== null) return String(v1);
        const v2 = (valoresCampos as any)[key];
        if (v2 !== undefined && v2 !== null) return String(v2);
        return "";
      };

      const resolveChecked = (key: string) => {
        const sexo = String(crianca.sexo || "").toLowerCase();
        if (key === "sexo_m") return sexo.startsWith("m");
        if (key === "sexo_f") return sexo.startsWith("f");

        if (key === "quilombo_sim")
          return String((valoresCampos as any).quilombo_remanescente ?? (crianca as any).quilombo_remanescente ?? "") === "sim";
        if (key === "quilombo_nao")
          return String((valoresCampos as any).quilombo_remanescente ?? (crianca as any).quilombo_remanescente ?? "") === "nao";

        if (key === "nacionalidade_brasileira")
          return String((valoresCampos as any).nacionalidade ?? (crianca as any).nacionalidade ?? "") === "brasileira";
        if (key === "nacionalidade_brasileira_naturalizado")
          return String((valoresCampos as any).nacionalidade ?? (crianca as any).nacionalidade ?? "") === "brasileira_naturalizado";
        if (key === "nacionalidade_estrangeira")
          return String((valoresCampos as any).nacionalidade ?? (crianca as any).nacionalidade ?? "") === "estrangeira";

        if (key === "estrangeiro_docs_sim")
          return String((valoresCampos as any).estrangeiro_possui_documentos ?? (crianca as any).estrangeiro_possui_documentos ?? "") === "sim";
        if (key === "estrangeiro_docs_nao")
          return String((valoresCampos as any).estrangeiro_possui_documentos ?? (crianca as any).estrangeiro_possui_documentos ?? "") === "nao";

        if (key === "vacina_sim") return Boolean(docEntregue.comprovanteVacinacao);
        if (key === "vacina_nao") return !docEntregue.comprovanteVacinacao;

        if (key === "programa_bolsa_familia") return Boolean(crianca.programas_sociais);
        if (key === "programa_pe_de_meia") return false;

        if (key === "doc_comprovante_residencia") return Boolean(docEntregue.comprovanteResidencia);
        if (key === "doc_cpf_estudante") return Boolean(docEntregue.cpfEstudante);
        if (key === "doc_certidao_nascimento") return Boolean(docEntregue.certidaoNascimento);
        if (key === "doc_vacinacao") return Boolean(docEntregue.comprovanteVacinacao);

        if (key.startsWith("cor_auto_"))
          return String((valoresCampos as any).cor_raca_autodeclarada ?? (crianca as any).cor_raca_autodeclarada ?? "") === key.replace("cor_auto_", "");
        if (key.startsWith("cor_cert_"))
          return String((valoresCampos as any).cor_raca_certidao ?? (crianca as any).cor_raca_certidao ?? "") === key.replace("cor_cert_", "");
        if (key.startsWith("etnia_"))
          return String((valoresCampos as any).etnia_indigena ?? (crianca as any).etnia_indigena ?? "") === key.replace("etnia_", "");

        if (key.includes("__")) {
          const [base, opt] = key.split("__");
          const raw = (valoresCampos as any)[base] ?? (crianca as any)[base];
          return String(raw ?? "") === String(opt ?? "");
        }

        const raw = (valoresCampos as any)[key] ?? (crianca as any)[key];
        if (typeof raw === "boolean") return raw;
        const s = String(raw ?? "").trim().toLowerCase();
        if (s === "sim" || s === "true" || s === "1") return true;
        if (s === "nao" || s === "não" || s === "false" || s === "0") return false;
        return false;
      };

      textFields.forEach((anchor) => {
        const key = String(anchor?.key || "");
        if (!key) return;
        drawText(anchor, resolveText(key));
      });

      checkboxes.forEach((anchor) => {
        const key = String(anchor?.key || "");
        if (!key) return;
        if (resolveChecked(key)) drawX(anchor);
      });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `requerimento_sere_${crianca.nome || "aluno"}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return { sucesso: true };
    }

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const parsed = await pdfjs.getDocument({ data: templateBytes }).promise;

    const normalize = (s: string) => {
      return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    };

    const tokenize = (s: string) => normalize(s).split(" ").filter(Boolean);

    type TextItem = { s: string; x: number; y: number; w: number; h: number };

    const getTextItems = async (pageNumber: number): Promise<TextItem[]> => {
      const page = await parsed.getPage(pageNumber);
      const tc = await page.getTextContent();
      return (tc.items as any[]).map((it: any) => {
        const s = String(it?.str || "");
        const x = Number(it?.transform?.[4] ?? 0);
        const y = Number(it?.transform?.[5] ?? 0);
        const w = Number(it?.width ?? 0);
        const h = Number(it?.height ?? 0);
        return { s, x, y, w, h };
      });
    };

    const findPhraseBBox = (items: TextItem[], phrase: string) => {
      const target = tokenize(phrase);
      if (target.length === 0) return null;
      const tolY = 2.5;

      for (let i = 0; i < items.length; i++) {
        const start = tokenize(items[i].s);
        if (start.length === 0) continue;
        if (start[0] !== target[0]) continue;

        const y0 = items[i].y;
        let t = 0;
        let minX = items[i].x;
        let maxX = items[i].x + items[i].w;
        let failed = false;

        for (let j = i; j < items.length && t < target.length; j++) {
          const it = items[j];
          if (Math.abs(it.y - y0) > tolY) break;
          const toks = tokenize(it.s);
          for (const tok of toks) {
            if (tok === target[t]) {
              t++;
              minX = Math.min(minX, it.x);
              maxX = Math.max(maxX, it.x + it.w);
              if (t >= target.length) {
                return { minX, maxX, y: y0 };
              }
            } else {
              failed = true;
              break;
            }
          }
          if (failed) break;
        }
      }
      return null;
    };

    const findOptionCheckboxNear = (items: TextItem[], nearPhrase: string, optionLabel: string) => {
      const near = findPhraseBBox(items, nearPhrase);
      if (!near) return null;
      const opt = tokenize(optionLabel);
      if (opt.length === 0) return null;
      const tolY = 2.5;
      const rangeY = 12;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const toks = tokenize(it.s);
        if (toks.length === 0) continue;
        if (Math.abs(it.y - near.y) > rangeY) continue;

        let matched = true;
        for (let k = 0; k < opt.length; k++) {
          const t = tokenize(items[i + k]?.s || "");
          if (t[0] !== opt[k]) {
            matched = false;
            break;
          }
        }
        if (!matched) continue;

        const y0 = it.y;
        for (let b = i; b >= Math.max(0, i - 6); b--) {
          if (Math.abs(items[b].y - y0) > tolY) continue;
          if (items[b].s === "(" && items[b + 1]?.s === ")") {
            const x0 = items[b].x;
            const x1 = items[b + 1].x;
            return { x: (x0 + x1) / 2, y: y0 };
          }
        }
      }
      return null;
    };

    const formatarData = (data?: string | null) => {
      if (!data) return "";
      return new Date(data).toLocaleDateString("pt-BR");
    };

    const drawValue = (pageIndex: number, x: number, y: number, value: string, size = 8) => {
      if (!value) return;
      const page = pdfDoc.getPage(pageIndex);
      page.drawText(value, {
        x,
        y: y - 2,
        size,
        font,
      });
    };

    const drawX = (pageIndex: number, x: number, y: number) => {
      const page = pdfDoc.getPage(pageIndex);
      page.drawText("X", {
        x: x - 2.2,
        y: y - 2.2,
        size: 9,
        font,
      });
    };

    const page1 = await getTextItems(1);

    const nomeBox = findPhraseBBox(page1, "Nome como consta na certidão de nascimento");
    if (nomeBox) drawValue(0, nomeBox.maxX + 6, nomeBox.y, crianca.nome || "", 9);

    const nascBox = findPhraseBBox(page1, "Data de nascimento");
    if (nascBox) drawValue(0, nascBox.maxX + 6, nascBox.y, formatarData(crianca.data_nascimento), 9);

    const cpfBox = findPhraseBBox(page1, "CPF");
    if (cpfBox) drawValue(0, cpfBox.maxX + 6, cpfBox.y, crianca.cpf_crianca || "", 9);

    const nisBox = findPhraseBBox(page1, "Código de identificação social - NIS");
    if (nisBox) drawValue(0, nisBox.maxX + 6, nisBox.y, valoresCampos.nis || "", 9);

    const sexo = String(crianca.sexo || "").toLowerCase().startsWith("m") ? "m" : String(crianca.sexo || "").toLowerCase().startsWith("f") ? "f" : "";
    if (sexo === "m") {
      const posM = findOptionCheckboxNear(page1, "Sexo", "M");
      if (posM) drawX(0, posM.x, posM.y);
    }
    if (sexo === "f") {
      const posF = findOptionCheckboxNear(page1, "Sexo", "F");
      if (posF) drawX(0, posF.x, posF.y);
    }

    const corAuto = valoresCampos.cor_raca_autodeclarada || "";
    if (corAuto) {
      const map: Record<string, string> = {
        amarela: "Amarela",
        branca: "Branca",
        indigena: "Indígena",
        parda: "Parda",
        preta: "Preta",
        nao_declarada: "Não declarada",
      };
      const label = map[corAuto] || corAuto;
      const pos = findOptionCheckboxNear(page1, "Cor/Raça autodeclarada", label);
      if (pos) drawX(0, pos.x, pos.y);
    }

    const corCert = valoresCampos.cor_raca_certidao || "";
    if (corCert) {
      const map: Record<string, string> = {
        amarela: "Amarela",
        branca: "Branca",
        indigena: "Indígena",
        parda: "Parda",
        preta: "Preta",
        nao_declarada: "Não Declarada",
      };
      const label = map[corCert] || corCert;
      const pos = findOptionCheckboxNear(page1, "Cor/raça citada na certidão de nascimento", label);
      if (pos) drawX(0, pos.x, pos.y);
    }

    const nacionalidade = valoresCampos.nacionalidade || "";
    if (nacionalidade === "brasileira") {
      const pos = findOptionCheckboxNear(page1, "Nacionalidade", "Brasileira");
      if (pos) drawX(0, pos.x, pos.y);
    }
    if (nacionalidade === "brasileira_naturalizado") {
      const pos = findOptionCheckboxNear(page1, "Nacionalidade", "Brasileira - nascido no exterior ou naturalizado");
      if (pos) drawX(0, pos.x, pos.y);
    }
    if (nacionalidade === "estrangeira") {
      const pos = findOptionCheckboxNear(page1, "Nacionalidade", "Estrangeira");
      if (pos) drawX(0, pos.x, pos.y);
    }

    if (nacionalidade === "estrangeira") {
      const possui = valoresCampos.estrangeiro_possui_documentos || "";
      if (possui === "sim") {
        const pos = findOptionCheckboxNear(page1, "Se estrangeiro, possui documentos?", "Sim");
        if (pos) drawX(0, pos.x, pos.y);
      }
      if (possui === "nao") {
        const pos = findOptionCheckboxNear(page1, "Se estrangeiro, possui documentos?", "Não");
        if (pos) drawX(0, pos.x, pos.y);
      }
    }

    const quilombo = valoresCampos.quilombo_remanescente || "";
    if (quilombo) {
      if (quilombo === "sim") {
        const pos = findOptionCheckboxNear(page1, "Remanescente de Quilombo", "Sim.");
        if (pos) drawX(0, pos.x, pos.y);
      }
      if (quilombo === "nao") {
        const pos = findOptionCheckboxNear(page1, "Remanescente de Quilombo", "Não");
        if (pos) drawX(0, pos.x, pos.y);
      }
    }

    const quilomboNome = valoresCampos.quilombo_nome || "";
    if (quilombo === "sim" && quilomboNome) {
      const box = findPhraseBBox(page1, "Qual?");
      if (box) drawValue(0, box.maxX + 6, box.y, quilomboNome, 9);
    }

    const declaracaoVacina = docEntregue.comprovanteVacinacao;
    if (declaracaoVacina) {
      const pos = findOptionCheckboxNear(page1, "Declaração de vacina", "Sim");
      if (pos) drawX(0, pos.x, pos.y);
    } else {
      const pos = findOptionCheckboxNear(page1, "Declaração de vacina", "Não");
      if (pos) drawX(0, pos.x, pos.y);
    }

    const unidadeBox = findPhraseBBox(page1, "Unidade consumidora");
    if (unidadeBox) drawValue(0, unidadeBox.maxX + 6, unidadeBox.y, valoresCampos.unidade_consumidora || "", 9);

    const telBox = findPhraseBBox(page1, "Telefone residencial");
    if (telBox) drawValue(0, telBox.maxX + 6, telBox.y, crianca.responsavel_telefone || "", 9);

    const logradouroBox = findPhraseBBox(page1, "Logradouro");
    if (logradouroBox) drawValue(0, logradouroBox.maxX + 6, logradouroBox.y, crianca.logradouro || "", 8);

    const numeroBox = findPhraseBBox(page1, "Número");
    if (numeroBox) drawValue(0, numeroBox.maxX + 6, numeroBox.y, crianca.numero || "", 8);

    const complementoBox = findPhraseBBox(page1, "Complemento");
    if (complementoBox) drawValue(0, complementoBox.maxX + 6, complementoBox.y, crianca.complemento || "", 8);

    const bairroBox = findPhraseBBox(page1, "Bairro");
    if (bairroBox) drawValue(0, bairroBox.maxX + 6, bairroBox.y, crianca.bairro || "", 8);

    const municipioBox = findPhraseBBox(page1, "Município");
    if (municipioBox) drawValue(0, municipioBox.maxX + 6, municipioBox.y, crianca.cidade || "", 8);

    const cepBox = findPhraseBBox(page1, "CEP");
    if (cepBox) drawValue(0, cepBox.maxX + 6, cepBox.y, crianca.cep || "", 8);

    const ufBox = findPhraseBBox(page1, "UF");
    if (ufBox) drawValue(0, ufBox.maxX + 6, ufBox.y, crianca.estado || "", 8);

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `requerimento_sere_${crianca.nome || "aluno"}_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao gerar requerimento SERE:", error);
    throw error;
  }
};

interface CriancaTransicaoRelatorio {
  nome: string;
  idade_meses: number;
  turma_atual: string;
  cmei_atual: string;
  turma_sugerida: string;
  acao_sugerida: string;
  acao_planejada?: string;
}

interface DadosRelatorioTransicao {
  anoAtual: number;
  anoProximo: number;
  totalMatriculados: number;
  totalPlanejados: number;
  resumo: {
    promover: number;
    concluir: number;
    manter: number;
    desistente: number;
  };
  criancas: CriancaTransicaoRelatorio[];
  dataGeracao: string;
}

export const gerarRelatorioTransicaoPDF = async (dados: DadosRelatorioTransicao) => {
  // Buscar configurações
  const config = await fetchConfiguracoes();
  const { singular } = getUnidadeLabels(config);

  const formatarIdade = (meses: number) => {
    const anos = Math.floor(meses / 12);
    const mesesRest = meses % 12;
    if (anos === 0) return `${meses}m`;
    if (mesesRest === 0) return `${anos}a`;
    return `${anos}a ${mesesRest}m`;
  };

  const getAcaoLabel = (acao: string) => {
    switch (acao) {
      case 'promover': return 'Promover';
      case 'concluir': return 'Concluir';
      case 'manter': return 'Manter';
      case 'desistente': return 'Desistente';
      default: return acao;
    }
  };

  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case 'promover': return '#3b82f6';
      case 'concluir': return '#22c55e';
      case 'manter': return '#6b7280';
      case 'desistente': return '#ef4444';
      default: return '#000';
    }
  };

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}

      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Transição Anual
        </h3>
        <p style="color: #1351B4; margin: 0; font-size: 12px; font-weight: 600;">
          ${dados.anoAtual} → ${dados.anoProximo}
        </p>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 100px; background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 22px; font-weight: bold; color: #1351B4;">${dados.totalMatriculados}</div>
          <div style="font-size: 10px; color: #64748b;">Total Matriculados</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: #eff6ff; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #bfdbfe;">
          <div style="font-size: 22px; font-weight: bold; color: #3b82f6;">${dados.resumo.promover}</div>
          <div style="font-size: 10px; color: #64748b;">A Promover</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: #f0fdf4; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #bbf7d0;">
          <div style="font-size: 22px; font-weight: bold; color: #22c55e;">${dados.resumo.concluir}</div>
          <div style="font-size: 10px; color: #64748b;">Concluintes</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: #fefce8; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #fef08a;">
          <div style="font-size: 22px; font-weight: bold; color: #eab308;">${dados.totalPlanejados}</div>
          <div style="font-size: 10px; color: #64748b;">Planejados</div>
        </div>
      </div>

      <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; font-size: 12px;">
        Lista de Crianças (${dados.criancas.length})
      </h4>

      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Nome</th>
            <th style="padding: 8px 6px; text-align: center; border: 1px solid #0d3d8a;">Idade</th>
            <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Turma Atual</th>
            <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">${singular}</th>
            <th style="padding: 8px 6px; text-align: center; border: 1px solid #0d3d8a;">Sugerida</th>
            <th style="padding: 8px 6px; text-align: center; border: 1px solid #0d3d8a;">Ação Sugerida</th>
            <th style="padding: 8px 6px; text-align: center; border: 1px solid #0d3d8a;">Ação Planejada</th>
          </tr>
        </thead>
        <tbody>
          ${dados.criancas.map((c, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 500;">${c.nome}</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${formatarIdade(c.idade_meses)}</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0;">${c.turma_atual || '-'}</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 8px;">${c.cmei_atual || '-'}</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${c.turma_sugerida}</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
                <span style="color: ${getAcaoColor(c.acao_sugerida)}; font-weight: 600;">
                  ${getAcaoLabel(c.acao_sugerida)}
                </span>
              </td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
                ${c.acao_planejada 
                  ? `<span style="color: ${getAcaoColor(c.acao_planejada)}; font-weight: 600;">${getAcaoLabel(c.acao_planejada)}</span>`
                  : '<span style="color: #9ca3af;">-</span>'
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${gerarRodapePDF(config)}
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = DOMPurify.sanitize(html);
  element.style.width = '297mm'; // A4 landscape width
  element.style.padding = '10mm';

  const opt = {
    margin: 5,
    filename: `relatorio_transicao_${dados.anoAtual}_${dados.anoProximo}_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
  };

  await html2pdf().set(opt).from(element).save();
  return { sucesso: true };
};

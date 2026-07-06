import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getUnidadeLabels } from '@/utils/unidade-utils';

export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?: string;
  cmeiId?: string;
  status?: string;
  turmaBase?: string;
  prioridade?: string;
  sexo?: string;
  turno?: string;
}

// Helper para gerar texto de filtros aplicados
const gerarTextoFiltros = (filtros: FiltrosRelatorio, unidadeSingular = "Unidade") => {
  const partes: string[] = [];
  if (filtros.cmeiId) partes.push(`${unidadeSingular} selecionado`);
  if (filtros.turmaBase) partes.push(`Turma: ${filtros.turmaBase}`);
  if (filtros.prioridade) partes.push(`Prioridade: ${filtros.prioridade}`);
  if (filtros.sexo) partes.push(`Sexo: ${filtros.sexo}`);
  if (filtros.turno) partes.push(`Turno: ${filtros.turno}`);
  if (filtros.dataInicio || filtros.dataFim) {
    const periodo = [filtros.dataInicio, filtros.dataFim].filter(Boolean).join(' a ');
    partes.push(`Período: ${periodo}`);
  }
  return partes.length > 0 ? `Filtros: ${partes.join(' | ')}` : '';
};

// Função para buscar configurações do sistema
const fetchConfiguracoes = async () => {
  const { data } = await supabase
    .from('configuracoes_sistema')
    .select('brasao_url, nome_municipio, nome_secretaria, email_contato, telefone_contato, unidade_singular, unidade_plural')
    .single();
  return data;
};

const fetchConfiguracoesComLabels = async () => {
  const config = await fetchConfiguracoes();
  const { singular, plural } = getUnidadeLabels(config as any);
  return { config, singular, plural };
};

// Função para gerar cabeçalho padrão dos PDFs
const gerarCabecalhoPDF = (config: any) => {
  const brasaoHtml = config?.brasao_url 
    ? `<div style="text-align: center;"><img src="${config.brasao_url}" alt="Brasão" style="height: 60px; width: auto; margin-bottom: 10px; display: inline-block;" crossorigin="anonymous" /></div>`
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
const gerarRodapePDF = (unidadePlural = "unidades") => {
  return `
    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px;">
      <p style="margin: 0;">Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <p style="margin: 5px 0 0 0;">Sistema VAGOU - Gestão de Vagas em ${unidadePlural}</p>
    </div>
  `;
};

// Função auxiliar para calcular idade
const calcularIdade = (dataNascimento: string) => {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
};

// Função para buscar campos de inscrição customizados (não-sistema)
const fetchCamposCustomizados = async () => {
  const { data } = await supabase
    .from('campos_inscricao')
    .select('id, nome_campo, label, secao, tipo')
    .eq('ativo', true)
    .eq('campo_sistema', false)
    .order('ordem');
  return data || [];
};

// Função para buscar valores de campos customizados para múltiplas crianças
const fetchValoresCamposCustomizados = async (criancaIds: string[]) => {
  if (criancaIds.length === 0) return {};
  
  const { data } = await supabase
    .from('valores_campos_custom')
    .select('crianca_id, campo_id, valor')
    .in('crianca_id', criancaIds);
  
  // Organizar por criança_id
  const valoresPorCrianca: Record<string, Record<string, string>> = {};
  data?.forEach(v => {
    if (!valoresPorCrianca[v.crianca_id]) {
      valoresPorCrianca[v.crianca_id] = {};
    }
    valoresPorCrianca[v.crianca_id][v.campo_id] = v.valor || '';
  });
  
  return valoresPorCrianca;
};

const fetchTurnoInteresse = async (criancaIds: string[]) => {
  const campos = await fetchCamposCustomizados();
  const campoPeriodo = campos.find((c) => c.nome_campo === 'periodo');
  if (!campoPeriodo) return {};

  const valores = await fetchValoresCamposCustomizados(criancaIds);
  const turnoPorCrianca: Record<string, string> = {};
  criancaIds.forEach((id) => {
    const valor = valores[id]?.[campoPeriodo.id];
    if (valor) turnoPorCrianca[id] = valor;
  });
  return turnoPorCrianca;
};

// Função para formatar valor de campo customizado
const formatarValorCampo = (valor: string | null, tipo: string) => {
  if (!valor) return '';
  if (tipo === 'checkbox') return valor === 'true' ? 'Sim' : 'Não';
  if (tipo === 'date') {
    try {
      return format(new Date(valor), 'dd/MM/yyyy');
    } catch {
      return valor;
    }
  }
  return valor;
};

const formatarTipoGestaoCmei = (tipo: string | null | undefined) => (tipo === "privado" ? "Privado" : "Municipal");

const formatarNomeCmei = (cmei?: { nome?: string | null; tipo_gestao?: string | null } | null) => {
  const nome = cmei?.nome || "-";
  const tipo = cmei?.tipo_gestao;
  if (!tipo) return nome;
  return `${nome} (${formatarTipoGestaoCmei(tipo)})`;
};

// Relatório de Ocupação PDF
export const gerarRelatorioOcupacaoPDF = async (filtros: FiltrosRelatorio) => {
  try {
    // Buscar configurações
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('cmeis')
      .select(`
        id,
        nome,
        tipo_gestao,
        capacidade_total,
        turmas(
          id,
          capacidade,
          criancas:criancas!turma_atual_id(count)
        )
      `)
      .eq('ativo', true);

    if (filtros.cmeiId) {
      query = query.eq('id', filtros.cmeiId);
    }

    const { data: cmeis, error } = await query;
    if (error) throw error;

    const dadosOcupacao = cmeis?.map(cmei => {
      const totalOcupados = cmei.turmas?.reduce((acc: number, turma: any) => {
        return acc + (turma.criancas?.[0]?.count || 0);
      }, 0) || 0;

      return {
        nome: formatarNomeCmei(cmei as any),
        capacidade: cmei.capacidade_total || 0,
        ocupados: totalOcupados,
        percentual: cmei.capacidade_total ? Math.round((totalOcupados / cmei.capacidade_total) * 100) : 0
      };
    }) || [];

    const totalCapacidade = dadosOcupacao.reduce((acc, item) => acc + item.capacidade, 0);
    const totalOcupados = dadosOcupacao.reduce((acc, item) => acc + item.ocupados, 0);
    const percentualGeral = totalCapacidade ? Math.round((totalOcupados / totalCapacidade) * 100) : 0;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Ocupação
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 25px; justify-content: center;">
          <div style="background: #f8fafc; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 24px; font-weight: bold; color: #1351B4;">${totalCapacidade}</div>
            <div style="font-size: 10px; color: #64748b;">Capacidade Total</div>
          </div>
          <div style="background: #eff6ff; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalOcupados}</div>
            <div style="font-size: 10px; color: #64748b;">Total Ocupados</div>
          </div>
          <div style="background: ${percentualGeral > 80 ? '#fef2f2' : '#f0fdf4'}; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid ${percentualGeral > 80 ? '#fecaca' : '#bbf7d0'};">
            <div style="font-size: 24px; font-weight: bold; color: ${percentualGeral > 80 ? '#ef4444' : '#22c55e'};">${percentualGeral}%</div>
            <div style="font-size: 10px; color: #64748b;">Taxa de Ocupação</div>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Capacidade</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Ocupados</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Disponíveis</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Taxa</th>
            </tr>
          </thead>
          <tbody>
            ${dadosOcupacao.map((item, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 500;">${item.nome}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${item.capacidade}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${item.ocupados}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${item.capacidade - item.ocupados}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                  <span style="color: ${item.percentual > 80 ? '#ef4444' : item.percentual > 50 ? '#eab308' : '#22c55e'}; font-weight: 600;">
                    ${item.percentual}%
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #1351B4; color: white; font-weight: bold;">
              <td style="border: 1px solid #1351B4; padding: 10px;">TOTAL</td>
              <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${totalCapacidade}</td>
              <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${totalOcupados}</td>
              <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${totalCapacidade - totalOcupados}</td>
              <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${percentualGeral}%</td>
            </tr>
          </tfoot>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '210mm';
    element.style.padding = '15mm';

    const opt = {
      margin: 0,
      filename: `relatorio_ocupacao_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de ocupação:', error);
    throw error;
  }
};

// Relatório de Fila de Espera PDF
export const gerarRelatorioFilaPDF = async (filtros: FiltrosRelatorio) => {
  try {
    // Buscar configurações
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('criancas')
      .select(`
        *,
        cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome, tipo_gestao),
        cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome, tipo_gestao),
        turma:turmas!criancas_turma_atual_id_fkey(nome, turma_base)
      `)
      .eq('status', 'Fila de Espera')
      .order('posicao_fila', { ascending: true });

    if (filtros.cmeiId) {
      query = query.or(`cmei1_preferencia.eq.${filtros.cmeiId},cmei2_preferencia.eq.${filtros.cmeiId}`);
    }

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.prioridade) {
      query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
    }

    if (filtros.sexo) {
      query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
    }

    const { data: fila, error } = await query;
    if (error) throw error;

    // Filtro adicional por turma base (client-side pois depende de cálculo de idade)
    let filaFiltrada = fila || [];
    if (filtros.turmaBase) {
      // Turma base é determinada pela idade da criança, filtrar client-side
      filaFiltrada = filaFiltrada.filter(c => {
        const turmaBase = (c as any).turma?.turma_base;
        return turmaBase === filtros.turmaBase;
      });
    }

    const criancaIds = filaFiltrada.map((c: any) => c.id).filter(Boolean);
    const turnoInteresse = await fetchTurnoInteresse(criancaIds);
    if (filtros.turno) {
      filaFiltrada = filaFiltrada.filter((c: any) => turnoInteresse[c.id] === filtros.turno);
    }

    const totalPrioridadeSocial = filaFiltrada?.filter(c => c.prioridade === 'Social').length || 0;
    const totalPrioridadeGeral = filaFiltrada?.filter(c => c.prioridade === 'Geral').length || 0;
    const filtrosTexto = gerarTextoFiltros(filtros, singular);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Fila de Espera
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: center;">
          <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 22px; font-weight: bold; color: #1351B4;">${filaFiltrada?.length || 0}</div>
            <div style="font-size: 10px; color: #64748b;">Total na Fila</div>
          </div>
          <div style="background: #fef3c7; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
            <div style="font-size: 22px; font-weight: bold; color: #92400e;">${totalPrioridadeSocial}</div>
            <div style="font-size: 10px; color: #64748b;">Prioridade Social</div>
          </div>
          <div style="background: #e0e7ff; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #c7d2fe;">
            <div style="font-size: 22px; font-weight: bold; color: #3730a3;">${totalPrioridadeGeral}</div>
            <div style="font-size: 10px; color: #64748b;">Prioridade Geral</div>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Pos.</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Nome</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Idade</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Turno</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Prioridade</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular} Preferência</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Inscrição</th>
            </tr>
          </thead>
          <tbody>
            ${filaFiltrada?.map((crianca, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: 600;">${crianca.posicao_fila || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 500;">${crianca.nome}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${calcularIdade(crianca.data_nascimento)}a</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${turnoInteresse[(crianca as any).id] || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">
                  <span style="background: ${crianca.prioridade === 'Social' ? '#fef3c7' : '#e0e7ff'}; color: ${crianca.prioridade === 'Social' ? '#92400e' : '#3730a3'}; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 600;">
                    ${crianca.prioridade}
                  </span>
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${formatarNomeCmei((crianca as any).cmei1)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">
                  ${crianca.created_at ? format(new Date(crianca.created_at), 'dd/MM/yy') : '-'}
                </td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = DOMPurify.sanitize(html);
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_fila_espera_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de fila:', error);
    throw error;
  }
};

type FilaListaItem = {
  posicao_fila?: number | null;
  nome?: string | null;
  data_nascimento?: string | null;
  prioridade?: string | null;
  status?: string | null;
  cmei1?: { nome?: string | null } | null;
  cmei2?: { nome?: string | null } | null;
  convocacao_deadline?: string | null;
};

export const gerarRelatorioFilaListaPDF = async (fila: FilaListaItem[], titulo = 'Relatório de Fila de Espera e Convocações') => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);
    const data = fila || [];

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            ${titulo}
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${data.length}</span>
          <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Registros</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Pos.</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Nome</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Idade</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Prioridade</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Status</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular} 1</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular} 2</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Prazo</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((c, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-weight: 600;">${c.posicao_fila ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${c.nome ?? ''}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.data_nascimento ? calcularIdade(c.data_nascimento) + 'a' : '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.prioridade ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${c.status ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatarNomeCmei(c.cmei1)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatarNomeCmei(c.cmei2)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.convocacao_deadline ? format(new Date(c.convocacao_deadline), 'dd/MM/yy') : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = DOMPurify.sanitize(html);
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `fila_espera_convocacoes_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de fila (lista):', error);
    throw error;
  }
};

// Relatório de Convocações PDF
export const gerarRelatorioConvocacoesPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, responsavel_nome, responsavel_telefone, data_nascimento),
        cmei:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
        turma:turmas!historico_turma_novo_fkey(nome)
      `)
      .eq('acao', 'Convocação')
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.eq('cmei_novo', filtros.cmeiId);
    }

    const { data: convocacoes, error } = await query;
    if (error) throw error;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Convocações
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            ${filtros.dataInicio ? ` | Período: ${format(new Date(filtros.dataInicio), 'dd/MM/yyyy')}` : ''}
            ${filtros.dataFim ? ` a ${format(new Date(filtros.dataFim), 'dd/MM/yyyy')}` : ''}
          </p>
        </div>

        <div style="background: #eff6ff; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #bfdbfe;">
          <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${convocacoes?.length || 0}</span>
          <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Convocações no período</span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Data</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Criança</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Responsável</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Telefone</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Turma</th>
            </tr>
          </thead>
          <tbody>
            ${convocacoes?.map((conv: any, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${conv.created_at ? format(new Date(conv.created_at), 'dd/MM/yy') : '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 500;">${conv.crianca?.nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${conv.crianca?.responsavel_nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${conv.crianca?.responsavel_telefone || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${formatarNomeCmei(conv.cmei)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${conv.turma?.nome || '-'}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_convocacoes_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de convocações PDF:', error);
    throw error;
  }
};

// Relatório de Convocações Excel
export const gerarRelatorioConvocacoesExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, responsavel_nome, responsavel_telefone),
        cmei:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao)
      `)
      .eq('acao', 'Convocação');

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.eq('cmei_novo', filtros.cmeiId);
    }

    const { data: convocacoes, error } = await query;
    if (error) throw error;

    const dadosExcel = convocacoes?.map((conv: any) => ({
      'Data Convocação': conv.created_at ? format(new Date(conv.created_at), 'dd/MM/yyyy HH:mm') : '',
      'Criança': conv.crianca?.nome || '',
      'Responsável': conv.crianca?.responsavel_nome || '',
      'Telefone': conv.crianca?.responsavel_telefone || '',
      [singular]: conv.cmei ? formatarNomeCmei(conv.cmei) : '',
      'Status': conv.status_novo || '',
      'Descrição': conv.descricao || ''
    })) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Convocações');

    ws['!cols'] = [
      { wch: 18 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 40 }
    ];

    XLSX.writeFile(wb, `relatorio_convocacoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de convocações:', error);
    throw error;
  }
};

// Relatório de Matrículas PDF
export const gerarRelatorioMatriculasPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('criancas')
      .select(`
        *,
        cmei:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao),
        turma:turmas(nome, turno, turma_base)
      `)
      .in('status', ['Matriculado', 'Matriculada'])
      .order('nome');

    if (filtros.cmeiId) {
      query = query.eq('cmei_atual_id', filtros.cmeiId);
    }

    if (filtros.dataInicio) {
      query = query.gte('updated_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('updated_at', filtros.dataFim);
    }

    if (filtros.prioridade) {
      query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
    }

    if (filtros.sexo) {
      query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
    }

    const { data: matriculas, error } = await query;
    if (error) throw error;

    // Filtrar por turma base client-side
    let matriculasFiltradas = matriculas || [];
    if (filtros.turmaBase) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => c.turma?.turma_base === filtros.turmaBase);
    }

    const criancaIds = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
    const turnoInteresse = await fetchTurnoInteresse(criancaIds);
    if (filtros.turno) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => (c.turma?.turno || turnoInteresse[c.id]) === filtros.turno);
    }

    const filtrosTexto = gerarTextoFiltros(filtros, singular);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Matrículas
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
        </div>

        <div style="background: #f0fdf4; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #bbf7d0;">
          <span style="font-size: 22px; font-weight: bold; color: #22c55e;">${matriculasFiltradas?.length || 0}</span>
          <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Crianças Matriculadas</span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Nome</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Idade</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Responsável</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Telefone</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Turma</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Turno</th>
            </tr>
          </thead>
          <tbody>
            ${matriculasFiltradas?.map((crianca: any, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${crianca.nome}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${calcularIdade(crianca.data_nascimento)}a</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${crianca.responsavel_nome}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${crianca.responsavel_telefone}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatarNomeCmei(crianca.cmei)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${crianca.turma?.nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${crianca.turma?.turno || turnoInteresse[crianca.id] || '-'}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_matriculas_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de matrículas PDF:', error);
    throw error;
  }
};

type MatriculasListaItem = {
  nome?: string | null;
  data_nascimento?: string | null;
  responsavel_nome?: string | null;
  responsavel_telefone?: string | null;
  status?: string | null;
  cmei_atual?: { nome?: string | null } | null;
  cmei?: { nome?: string | null } | null;
  turma_atual?: { nome?: string | null } | null;
  turma?: { nome?: string | null } | null;
  cmei_remanejamento?: { nome?: string | null } | null;
  cmei_remanejamento_id?: string | null;
};

export const gerarRelatorioMatriculasAtivasListaPDF = async (matriculas: MatriculasListaItem[], titulo = 'Relatório de Matrículas (Ativas)') => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);
    const data = matriculas || [];

    const total = data.length;
    const totalMatriculados = data.filter((c) => c.status === 'Matriculado' || c.status === 'Matriculada').length;
    const totalConvocados = data.filter((c) => c.status === 'Convocado').length;
    const totalRemanejamento = data.filter((c) => c.status === 'Remanejamento Solicitado' || !!c.cmei_remanejamento_id).length;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            ${titulo}
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap;">
          <div style="background: #f8fafc; padding: 10px 16px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 20px; font-weight: bold; color: #1351B4;">${total}</div>
            <div style="font-size: 10px; color: #64748b;">Total</div>
          </div>
          <div style="background: #f0fdf4; padding: 10px 16px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${totalMatriculados}</div>
            <div style="font-size: 10px; color: #64748b;">Matriculados</div>
          </div>
          <div style="background: #eef2ff; padding: 10px 16px; border-radius: 8px; text-align: center; border: 1px solid #c7d2fe;">
            <div style="font-size: 20px; font-weight: bold; color: #4f46e5;">${totalConvocados}</div>
            <div style="font-size: 10px; color: #64748b;">Convocados</div>
          </div>
          <div style="background: #fffbeb; padding: 10px 16px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
            <div style="font-size: 20px; font-weight: bold; color: #b45309;">${totalRemanejamento}</div>
            <div style="font-size: 10px; color: #64748b;">Remanejamento</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Nome</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Idade</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Responsável</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Telefone</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Status</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular} Atual</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Turma</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Remanejamento</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((c, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${c.nome ?? ''}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.data_nascimento ? calcularIdade(c.data_nascimento) + 'a' : '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${c.responsavel_nome ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.responsavel_telefone ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${c.status ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatarNomeCmei(c.cmei_atual ?? c.cmei)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.turma_atual?.nome ?? c.turma?.nome ?? '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatarNomeCmei(c.cmei_remanejamento)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = DOMPurify.sanitize(html);
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `matriculas_ativas_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de matrículas ativas (lista):', error);
    throw error;
  }
};

// Relatório de Matrículas Excel
export const gerarRelatorioMatriculasExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('criancas')
      .select(`
        *,
        cmei:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao),
        turma:turmas(nome, turno, turma_base)
      `)
      .in('status', ['Matriculado', 'Matriculada']);

    if (filtros.cmeiId) {
      query = query.eq('cmei_atual_id', filtros.cmeiId);
    }

    if (filtros.dataInicio) {
      query = query.gte('updated_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('updated_at', filtros.dataFim);
    }

    if (filtros.prioridade) {
      query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
    }

    if (filtros.sexo) {
      query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
    }

    const { data: matriculas, error } = await query;
    if (error) throw error;

    // Filtrar por turma base client-side
    let matriculasFiltradas = matriculas || [];
    if (filtros.turmaBase) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => c.turma?.turma_base === filtros.turmaBase);
    }

    const idsAntesFiltroTurno = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
    const turnoInteresse = await fetchTurnoInteresse(idsAntesFiltroTurno);
    if (filtros.turno) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => (c.turma?.turno || turnoInteresse[c.id]) === filtros.turno);
    }

    // Buscar campos customizados e seus valores
    const camposCustomizados = await fetchCamposCustomizados();
    const criancaIds = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
    const valoresCampos = await fetchValoresCamposCustomizados(criancaIds);

    const dadosExcel = matriculasFiltradas?.map((crianca: any) => {
      const dadosBase: Record<string, string> = {
        'Nome': crianca.nome,
        'CPF Criança': crianca.cpf_crianca || '',
        'Data Nascimento': format(new Date(crianca.data_nascimento), 'dd/MM/yyyy'),
        'Idade': calcularIdade(crianca.data_nascimento) + ' anos',
        'Sexo': crianca.sexo,
        'Responsável': crianca.responsavel_nome,
        'CPF Responsável': crianca.responsavel_cpf,
        'Telefone': crianca.responsavel_telefone,
        'Email': crianca.responsavel_email || '',
        [singular]: crianca.cmei ? formatarNomeCmei(crianca.cmei) : '',
        'Turma': crianca.turma?.nome || '',
        'Turno': crianca.turma?.turno || turnoInteresse[crianca.id] || '',
        'Endereço': `${crianca.logradouro || ''}, ${crianca.numero || ''} - ${crianca.bairro || ''}`,
        'Cidade': crianca.cidade || '',
        'Status': crianca.status
      };

      // Adicionar campos customizados
      camposCustomizados.forEach(campo => {
        const valor = valoresCampos[crianca.id]?.[campo.id] || '';
        dadosBase[campo.label] = formatarValorCampo(valor, campo.tipo);
      });

      return dadosBase;
    }) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matrículas');

    // Ajustar largura das colunas
    const colsBase = [
      { wch: 30 }, // Nome
      { wch: 15 }, // CPF Criança
      { wch: 15 }, // Data Nascimento
      { wch: 10 }, // Idade
      { wch: 10 }, // Sexo
      { wch: 30 }, // Responsável
      { wch: 15 }, // CPF Responsável
      { wch: 15 }, // Telefone
      { wch: 30 }, // Email
      { wch: 35 }, // Unidade
      { wch: 20 }, // Turma
      { wch: 12 }, // Turno
      { wch: 40 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 15 }  // Status
    ];
    
    // Adicionar colunas para campos customizados
    camposCustomizados.forEach(() => colsBase.push({ wch: 20 }));
    ws['!cols'] = colsBase;

    XLSX.writeFile(wb, `relatorio_matriculas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de matrículas:', error);
    throw error;
  }
};

// Relatório de Ocupação Excel
export const gerarRelatorioOcupacaoExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('cmeis')
      .select(`
        id,
        nome,
        tipo_gestao,
        capacidade_total,
        turmas(
          id,
          capacidade,
          criancas:criancas!turma_atual_id(count)
        )
      `)
      .eq('ativo', true);

    if (filtros.cmeiId) {
      query = query.eq('id', filtros.cmeiId);
    }

    const { data: cmeis, error } = await query;
    if (error) throw error;

    const dadosExcel = cmeis?.map(cmei => {
      const totalOcupados = cmei.turmas?.reduce((acc: number, turma: any) => {
        return acc + (turma.criancas?.[0]?.count || 0);
      }, 0) || 0;
      const capacidade = cmei.capacidade_total || 0;
      const percentual = capacidade ? Math.round((totalOcupados / capacidade) * 100) : 0;

      return {
        [singular]: formatarNomeCmei(cmei as any),
        'Capacidade': capacidade,
        'Ocupados': totalOcupados,
        'Disponíveis': capacidade - totalOcupados,
        'Taxa de Ocupação (%)': percentual,
      };
    }) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ocupação');

    ws['!cols'] = [
      { wch: 35 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
    ];

    XLSX.writeFile(wb, `relatorio_ocupacao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de ocupação Excel:', error);
    throw error;
  }
};

export const gerarRelatorioVagasPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('turmas')
      .select(`
        id,
        nome,
        turma_base,
        turno,
        capacidade,
        cmei:cmeis!turmas_cmei_id_fkey(id, nome, tipo_gestao),
        criancas:criancas!turma_atual_id(count)
      `)
      .order('nome');

    if (filtros.cmeiId) {
      query = query.eq('cmei_id', filtros.cmeiId);
    }

    if (filtros.turmaBase) {
      query = query.eq('turma_base', filtros.turmaBase);
    }

    if (filtros.turno) {
      query = query.eq('turno', filtros.turno);
    }

    const { data: turmas, error } = await query;
    if (error) throw error;

    const vagas = (turmas || []).map((turma: any) => {
      const ocupados = turma.criancas?.[0]?.count || 0;
      const capacidade = turma.capacidade || 0;
      const livres = capacidade - ocupados;
      const percentual = capacidade ? Math.round((ocupados / capacidade) * 100) : 0;
      return {
        cmei: formatarNomeCmei(turma.cmei),
        turma: turma.nome,
        turmaBase: turma.turma_base || '-',
        turno: turma.turno || '-',
        capacidade,
        ocupados,
        livres,
        percentual,
      };
    });

    const totalCapacidade = vagas.reduce((acc, v) => acc + v.capacidade, 0);
    const totalOcupados = vagas.reduce((acc, v) => acc + v.ocupados, 0);
    const totalLivres = vagas.reduce((acc, v) => acc + v.livres, 0);
    const percentualGeral = totalCapacidade ? Math.round((totalOcupados / totalCapacidade) * 100) : 0;
    const filtrosTexto = gerarTextoFiltros(filtros, singular);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Vagas (por Turma)
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: center;">
          <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
            <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${totalCapacidade}</span>
            <span style="font-size: 10px; color: #64748b; display: block;">Capacidade</span>
          </div>
          <div style="background: #eff6ff; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
            <span style="font-size: 22px; font-weight: bold; color: #3b82f6;">${totalOcupados}</span>
            <span style="font-size: 10px; color: #64748b; display: block;">Ocupados</span>
          </div>
          <div style="background: #f0fdf4; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <span style="font-size: 22px; font-weight: bold; color: #22c55e;">${totalLivres}</span>
            <span style="font-size: 10px; color: #64748b; display: block;">Vagas Livres</span>
          </div>
          <div style="background: ${percentualGeral > 80 ? '#fef2f2' : '#f8fafc'}; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid ${percentualGeral > 80 ? '#fecaca' : '#e2e8f0'};">
            <span style="font-size: 22px; font-weight: bold; color: ${percentualGeral > 80 ? '#ef4444' : '#1351B4'};">${percentualGeral}%</span>
            <span style="font-size: 10px; color: #64748b; display: block;">Ocupação Geral</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Turma</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Modelo</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Turno</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Cap.</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Ocup.</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Livres</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Ocup. %</th>
            </tr>
          </thead>
          <tbody>
            ${vagas.map((v, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${v.cmei}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${v.turma}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.turmaBase}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.turno}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.capacidade}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.ocupados}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-weight: 600; color: ${v.livres > 0 ? '#16a34a' : '#ef4444'};">${v.livres}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.percentual}%</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_vagas_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de vagas PDF:', error);
    throw error;
  }
};

export const gerarRelatorioVagasExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('turmas')
      .select(`
        id,
        nome,
        turma_base,
        turno,
        capacidade,
        cmei:cmeis!turmas_cmei_id_fkey(nome, tipo_gestao),
        criancas:criancas!turma_atual_id(count)
      `)
      .order('nome');

    if (filtros.cmeiId) {
      query = query.eq('cmei_id', filtros.cmeiId);
    }

    if (filtros.turmaBase) {
      query = query.eq('turma_base', filtros.turmaBase);
    }

    if (filtros.turno) {
      query = query.eq('turno', filtros.turno);
    }

    const { data: turmas, error } = await query;
    if (error) throw error;

    const dadosExcel = (turmas || []).map((turma: any) => {
      const ocupados = turma.criancas?.[0]?.count || 0;
      const capacidade = turma.capacidade || 0;
      const livres = capacidade - ocupados;
      const percentual = capacidade ? Math.round((ocupados / capacidade) * 100) : 0;
      return {
        [singular]: turma.cmei ? formatarNomeCmei(turma.cmei) : '',
        'Turma': turma.nome,
        'Modelo': turma.turma_base || '',
        'Turno': turma.turno || '',
        'Capacidade': capacidade,
        'Ocupados': ocupados,
        'Vagas Livres': livres,
        'Ocupação (%)': percentual,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vagas');

    ws['!cols'] = [
      { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    XLSX.writeFile(wb, `relatorio_vagas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de vagas Excel:', error);
    throw error;
  }
};

export const gerarRelatorioMatriculadosResumoPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('criancas')
      .select(`
        id,
        data_nascimento,
        sexo,
        prioridade,
        updated_at,
        cmei:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao),
        turma:turmas(turno, turma_base)
      `)
      .in('status', ['Matriculado', 'Matriculada']);

    if (filtros.cmeiId) {
      query = query.eq('cmei_atual_id', filtros.cmeiId);
    }

    if (filtros.dataInicio) {
      query = query.gte('updated_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('updated_at', filtros.dataFim);
    }

    if (filtros.prioridade) {
      query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
    }

    if (filtros.sexo) {
      query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
    }

    const { data: matriculas, error } = await query;
    if (error) throw error;

    let matriculasFiltradas = matriculas || [];
    if (filtros.turmaBase) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => c.turma?.turma_base === filtros.turmaBase);
    }

    const criancaIds = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
    const turnoInteresse = await fetchTurnoInteresse(criancaIds);
    if (filtros.turno) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => (c.turma?.turno || turnoInteresse[c.id]) === filtros.turno);
    }

    const linhas = matriculasFiltradas.map((c: any) => ({
      cmei: formatarNomeCmei(c.cmei),
      turno: c.turma?.turno || turnoInteresse[c.id] || 'Não informado',
    }));

    const turnosBase = ['Matutino', 'Vespertino', 'Integral'];
    const porCmei = new Map<string, { cmei: string; counts: Record<string, number>; total: number }>();
    linhas.forEach((l) => {
      const key = l.cmei;
      const turnoKey = turnosBase.includes(l.turno) ? l.turno : 'Outros/Não informado';
      const existing = porCmei.get(key);
      if (existing) {
        existing.counts[turnoKey] = (existing.counts[turnoKey] || 0) + 1;
        existing.total += 1;
      } else {
        porCmei.set(key, { cmei: key, counts: { [turnoKey]: 1 }, total: 1 });
      }
    });

    const rows = Array.from(porCmei.values()).sort((a, b) => a.cmei.localeCompare(b.cmei, 'pt-BR'));
    const totalGeral = rows.reduce((acc, r) => acc + r.total, 0);
    const filtrosTexto = gerarTextoFiltros(filtros, singular);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}

        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Matriculados (Resumo)
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
        </div>

        <div style="background: #f0fdf4; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #bbf7d0;">
          <span style="font-size: 22px; font-weight: bold; color: #22c55e;">${totalGeral}</span>
          <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Total de Matriculados</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Matutino</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Vespertino</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Integral</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Outros/N.I.</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 7px; font-weight: 500;">${r.cmei}</td>
                <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.counts['Matutino'] || 0}</td>
                <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.counts['Vespertino'] || 0}</td>
                <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.counts['Integral'] || 0}</td>
                <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.counts['Outros/Não informado'] || 0}</td>
                <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center; font-weight: 700;">${r.total}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_matriculados_resumo_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de matriculados (resumo) PDF:', error);
    throw error;
  }
};

export const gerarRelatorioMatriculadosResumoExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('criancas')
      .select(`
        id,
        sexo,
        prioridade,
        updated_at,
        cmei:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao),
        turma:turmas(turno, turma_base)
      `)
      .in('status', ['Matriculado', 'Matriculada']);

    if (filtros.cmeiId) {
      query = query.eq('cmei_atual_id', filtros.cmeiId);
    }

    if (filtros.dataInicio) {
      query = query.gte('updated_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('updated_at', filtros.dataFim);
    }

    if (filtros.prioridade) {
      query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
    }

    if (filtros.sexo) {
      query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
    }

    const { data: matriculas, error } = await query;
    if (error) throw error;

    let matriculasFiltradas = matriculas || [];
    if (filtros.turmaBase) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => c.turma?.turma_base === filtros.turmaBase);
    }

    const criancaIds = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
    const turnoInteresse = await fetchTurnoInteresse(criancaIds);
    if (filtros.turno) {
      matriculasFiltradas = matriculasFiltradas.filter((c: any) => (c.turma?.turno || turnoInteresse[c.id]) === filtros.turno);
    }

    const turnosBase = ['Matutino', 'Vespertino', 'Integral'];
    const porCmei = new Map<string, { cmei: string; Matutino: number; Vespertino: number; Integral: number; Outros: number; Total: number }>();

    matriculasFiltradas.forEach((c: any) => {
      const cmei = formatarNomeCmei(c.cmei);
      const turno = c.turma?.turno || turnoInteresse[c.id] || 'Não informado';
      const tKey = turnosBase.includes(turno) ? turno : 'Outros';
      const row = porCmei.get(cmei) || { cmei, Matutino: 0, Vespertino: 0, Integral: 0, Outros: 0, Total: 0 };
      row[tKey as 'Matutino' | 'Vespertino' | 'Integral' | 'Outros'] += 1;
      row.Total += 1;
      porCmei.set(cmei, row);
    });

    const dadosExcel = Array.from(porCmei.values()).sort((a, b) => a.cmei.localeCompare(b.cmei, 'pt-BR'));
    const ws = XLSX.utils.json_to_sheet(dadosExcel.map((r) => ({
      [singular]: r.cmei,
      'Matutino': r.Matutino,
      'Vespertino': r.Vespertino,
      'Integral': r.Integral,
      'Outros/N.I.': r.Outros,
      'Total': r.Total,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo');

    ws['!cols'] = [
      { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }
    ];

    XLSX.writeFile(wb, `relatorio_matriculados_resumo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de matriculados (resumo) Excel:', error);
    throw error;
  }
};

export const gerarRelatorioHistoricoMatriculasPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    const acoes = [
      'Matrícula Confirmada',
      'Desistência de Matrícula',
      'Transferência para Outro Município',
      'Transição Anual - Conclusão',
      'Transição Anual - Desistência',
      'Concluinte',
    ];

    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(id, nome, responsavel_nome, responsavel_telefone, sexo, prioridade, status),
        cmei_anterior:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao),
        cmei_novo:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
        turma_anterior:turmas!historico_turma_anterior_fkey(nome, turno),
        turma_novo:turmas!historico_turma_novo_fkey(nome, turno)
      `)
      .in('acao', acoes)
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.or(`cmei_anterior.eq.${filtros.cmeiId},cmei_novo.eq.${filtros.cmeiId}`);
    }

    const { data: historico, error } = await query;
    if (error) throw error;

    let historicoFiltrado = historico || [];
    if (filtros.sexo) {
      historicoFiltrado = historicoFiltrado.filter((h: any) => h.crianca?.sexo === filtros.sexo);
    }
    if (filtros.prioridade) {
      historicoFiltrado = historicoFiltrado.filter((h: any) => h.crianca?.prioridade === filtros.prioridade);
    }
    if (filtros.turno) {
      historicoFiltrado = historicoFiltrado.filter((h: any) => (h.turma_novo?.turno || h.turma_anterior?.turno) === filtros.turno);
    }

    const filtrosTexto = gerarTextoFiltros(filtros, singular);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Histórico de Matrículas
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
        </div>

        <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${historicoFiltrado.length}</span>
          <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Registros</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Data</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Ação</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Criança</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Responsável</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Turma/Turno</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Motivo</th>
            </tr>
          </thead>
          <tbody>
            ${historicoFiltrado.map((h: any, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${h.created_at ? format(new Date(h.created_at), 'dd/MM/yy') : '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-size: 7px;">${h.acao || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${h.crianca?.nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${h.crianca?.responsavel_nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${h.cmei_novo?.nome || h.cmei_anterior?.nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${h.turma_novo?.nome || h.turma_anterior?.nome || '-'}${(h.turma_novo?.turno || h.turma_anterior?.turno) ? ` / ${(h.turma_novo?.turno || h.turma_anterior?.turno)}` : ''}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-size: 7px;">${h.justificativa || '-'}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_historico_matriculas_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de histórico de matrículas PDF:', error);
    throw error;
  }
};

export const gerarRelatorioHistoricoMatriculasExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    const acoes = [
      'Matrícula Confirmada',
      'Desistência de Matrícula',
      'Transferência para Outro Município',
      'Transição Anual - Conclusão',
      'Transição Anual - Desistência',
      'Concluinte',
    ];

    let query = supabase
      .from('historico')
      .select(`
        id,
        created_at,
        acao,
        justificativa,
        crianca:criancas(id, nome, responsavel_nome, responsavel_telefone, sexo, prioridade, status),
        cmei_anterior:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao),
        cmei_novo:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
        turma_anterior:turmas!historico_turma_anterior_fkey(nome, turno),
        turma_novo:turmas!historico_turma_novo_fkey(nome, turno)
      `)
      .in('acao', acoes)
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.or(`cmei_anterior.eq.${filtros.cmeiId},cmei_novo.eq.${filtros.cmeiId}`);
    }

    const { data: historico, error } = await query;
    if (error) throw error;

    let historicoFiltrado = historico || [];
    if (filtros.sexo) {
      historicoFiltrado = historicoFiltrado.filter((h: any) => h.crianca?.sexo === filtros.sexo);
    }
    if (filtros.prioridade) {
      historicoFiltrado = historicoFiltrado.filter((h: any) => h.crianca?.prioridade === filtros.prioridade);
    }
    if (filtros.turno) {
      historicoFiltrado = historicoFiltrado.filter((h: any) => (h.turma_novo?.turno || h.turma_anterior?.turno) === filtros.turno);
    }

    const dadosExcel = historicoFiltrado.map((h: any) => ({
      'Data': h.created_at ? format(new Date(h.created_at), 'dd/MM/yyyy HH:mm') : '',
      'Ação': h.acao || '',
      'Criança': h.crianca?.nome || '',
      'Responsável': h.crianca?.responsavel_nome || '',
      'Telefone': h.crianca?.responsavel_telefone || '',
      'Sexo': h.crianca?.sexo || '',
      'Prioridade': h.crianca?.prioridade || '',
      'Status Atual': h.crianca?.status || '',
      [singular]: h.cmei_novo?.nome || h.cmei_anterior?.nome || '',
      'Turma': h.turma_novo?.nome || h.turma_anterior?.nome || '',
      'Turno': h.turma_novo?.turno || h.turma_anterior?.turno || '',
      'Motivo': h.justificativa || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');

    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 16 },
      { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 12 }, { wch: 35 }
    ];

    XLSX.writeFile(wb, `relatorio_historico_matriculas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de histórico de matrículas Excel:', error);
    throw error;
  }
};

// Relatório de Fila de Espera Excel
export const gerarRelatorioFilaExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('criancas')
      .select(`
        *,
        cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome, tipo_gestao),
        cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome, tipo_gestao)
      `)
      .eq('status', 'Fila de Espera')
      .order('posicao_fila', { ascending: true });

    if (filtros.cmeiId) {
      query = query.or(`cmei1_preferencia.eq.${filtros.cmeiId},cmei2_preferencia.eq.${filtros.cmeiId}`);
    }

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.prioridade) {
      query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
    }

    if (filtros.sexo) {
      query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
    }

    const { data: fila, error } = await query;
    if (error) throw error;

    const filaInicial = fila || [];
    const criancaIdsInicial = filaInicial.map((c: any) => c.id).filter(Boolean);
    const turnoInteresse = await fetchTurnoInteresse(criancaIdsInicial);
    const filaFiltrada = filtros.turno
      ? filaInicial.filter((c: any) => turnoInteresse[c.id] === filtros.turno)
      : filaInicial;

    // Buscar campos customizados e seus valores
    const camposCustomizados = await fetchCamposCustomizados();
    const criancaIds = filaFiltrada.map((c: any) => c.id).filter(Boolean);
    const valoresCampos = await fetchValoresCamposCustomizados(criancaIds);

    const dadosExcel = filaFiltrada.map((crianca: any) => {
      const dadosBase: Record<string, string | number> = {
        'Posição': crianca.posicao_fila || '-',
        'Nome': crianca.nome,
        'Data Nascimento': format(new Date(crianca.data_nascimento), 'dd/MM/yyyy'),
        'Idade': calcularIdade(crianca.data_nascimento) + ' anos',
        'Sexo': crianca.sexo,
        'Turno': turnoInteresse[crianca.id] || '',
        'Prioridade': crianca.prioridade,
        'Responsável': crianca.responsavel_nome,
        'Telefone': crianca.responsavel_telefone,
        'Email': crianca.responsavel_email || '',
        [`1ª Preferência ${singular}`]: formatarNomeCmei(crianca.cmei1),
        [`2ª Preferência ${singular}`]: formatarNomeCmei(crianca.cmei2),
        'Aceita Qualquer': crianca.aceita_qualquer_cmei ? 'Sim' : 'Não',
        'Data Inscrição': crianca.created_at ? format(new Date(crianca.created_at), 'dd/MM/yyyy') : '',
      };

      // Adicionar campos customizados
      camposCustomizados.forEach(campo => {
        const valor = valoresCampos[crianca.id]?.[campo.id] || '';
        dadosBase[campo.label] = formatarValorCampo(valor, campo.tipo);
      });

      return dadosBase;
    }) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fila de Espera');

    const colsBase = [
      { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 30 },
      { wch: 30 }, { wch: 15 }, { wch: 15 },
    ];
    
    // Adicionar colunas para campos customizados
    camposCustomizados.forEach(() => colsBase.push({ wch: 20 }));
    ws['!cols'] = colsBase;

    XLSX.writeFile(wb, `relatorio_fila_espera_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de fila Excel:', error);
    throw error;
  }
};

// Relatório de Desistências PDF
export const gerarRelatorioDesistenciasPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, responsavel_nome, data_nascimento),
        cmei:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao)
      `)
      .in('acao', ['Desistência', 'Recusa', 'Recusada', 'Desistente'])
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.eq('cmei_anterior', filtros.cmeiId);
    }

    const { data: desistencias, error } = await query;
    if (error) throw error;

    const totalDesistencias = desistencias?.filter(d => d.acao?.includes('Desist')).length || 0;
    const totalRecusas = desistencias?.filter(d => d.acao?.includes('Recus')).length || 0;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Desistências e Recusas
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            ${filtros.dataInicio ? ` | Período: ${format(new Date(filtros.dataInicio), 'dd/MM/yyyy')}` : ''}
            ${filtros.dataFim ? ` a ${format(new Date(filtros.dataFim), 'dd/MM/yyyy')}` : ''}
          </p>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: center;">
          <div style="background: #fef2f2; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #fecaca;">
            <span style="font-size: 22px; font-weight: bold; color: #ef4444;">${totalDesistencias}</span>
            <span style="font-size: 10px; color: #64748b; display: block;">Desistências</span>
          </div>
          <div style="background: #fef3c7; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
            <span style="font-size: 22px; font-weight: bold; color: #f59e0b;">${totalRecusas}</span>
            <span style="font-size: 10px; color: #64748b; display: block;">Recusas</span>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Data</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px;">Tipo</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Criança</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Responsável</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            ${desistencias?.map((item: any, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${item.created_at ? format(new Date(item.created_at), 'dd/MM/yy') : '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">
                  <span style="background: ${item.acao?.includes('Desist') ? '#fef2f2' : '#fef3c7'}; color: ${item.acao?.includes('Desist') ? '#ef4444' : '#f59e0b'}; padding: 2px 6px; border-radius: 4px; font-size: 8px;">
                    ${item.acao}
                  </span>
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 500;">${item.crianca?.nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${item.crianca?.responsavel_nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${formatarNomeCmei(item.cmei)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 8px;">${item.justificativa || '-'}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_desistencias_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de desistências PDF:', error);
    throw error;
  }
};

// Relatório de Desistências Excel
export const gerarRelatorioDesistenciasExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, responsavel_nome, data_nascimento),
        cmei:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao)
      `)
      .in('acao', ['Desistência', 'Recusa', 'Recusada', 'Desistente'])
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.eq('cmei_anterior', filtros.cmeiId);
    }

    const { data: desistencias, error } = await query;
    if (error) throw error;

    const dadosExcel = desistencias?.map((item: any) => ({
      'Data': item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy HH:mm') : '',
      'Ação': item.acao,
      'Criança': item.crianca?.nome || '',
      'Responsável': item.crianca?.responsavel_nome || '',
      [singular]: item.cmei ? formatarNomeCmei(item.cmei) : '',
      'Status Anterior': item.status_anterior || '',
      'Justificativa': item.justificativa || '',
      'Descrição': item.descricao || '',
    })) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Desistências');

    ws['!cols'] = [
      { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 30 },
      { wch: 35 }, { wch: 18 }, { wch: 40 }, { wch: 40 },
    ];

    XLSX.writeFile(wb, `relatorio_desistencias_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de desistências:', error);
    throw error;
  }
};

// Relatório de Tempo Médio de Espera PDF
export const gerarRelatorioTempoEsperaPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    // Buscar matrículas com data de inscrição e matrícula
    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, created_at, data_nascimento),
        cmei:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao)
      `)
      .eq('acao', 'Matrícula Efetivada')
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.eq('cmei_novo', filtros.cmeiId);
    }

    const { data: matriculas, error } = await query;
    if (error) throw error;

    // Calcular tempo de espera para cada matrícula
    const temposEspera = matriculas?.map((m: any) => {
      if (!m.crianca?.created_at || !m.created_at) return null;
      const inscricao = new Date(m.crianca.created_at);
      const matricula = new Date(m.created_at);
      const diffDias = Math.floor((matricula.getTime() - inscricao.getTime()) / (1000 * 60 * 60 * 24));
      return {
        crianca: m.crianca?.nome,
        cmei: m.cmei ? formatarNomeCmei(m.cmei) : undefined,
        diasEspera: diffDias,
        dataInscricao: m.crianca.created_at,
        dataMatricula: m.created_at,
      };
    }).filter(Boolean) || [];

    // Calcular médias
    const totalDias = temposEspera.reduce((acc, t) => acc + (t?.diasEspera || 0), 0);
    const mediaGeral = temposEspera.length > 0 ? Math.round(totalDias / temposEspera.length) : 0;

    // Agrupar por unidade
    const porUnidade: Record<string, number[]> = {};
    temposEspera.forEach((t) => {
      if (t?.cmei) {
        if (!porUnidade[t.cmei]) porUnidade[t.cmei] = [];
        porUnidade[t.cmei].push(t.diasEspera);
      }
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Tempo Médio de Espera
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 25px; justify-content: center;">
          <div style="background: #eff6ff; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${mediaGeral}</div>
            <div style="font-size: 10px; color: #64748b;">Dias em Média</div>
          </div>
          <div style="background: #f8fafc; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 24px; font-weight: bold; color: #1351B4;">${temposEspera.length}</div>
            <div style="font-size: 10px; color: #64748b;">Matrículas Analisadas</div>
          </div>
        </div>

        <h4 style="color: #1351B4; margin: 20px 0 10px; font-size: 12px;">Tempo Médio por ${singular}</h4>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: left;">${singular}</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Matrículas</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Média (dias)</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Mínimo</th>
              <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Máximo</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(porUnidade).map(([cmei, dias], i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 500;">${cmei}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${dias.length}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: 600;">${Math.round(dias.reduce((a, b) => a + b, 0) / dias.length)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${Math.min(...dias)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${Math.max(...dias)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '210mm';
    element.style.padding = '15mm';

    const opt = {
      margin: 0,
      filename: `relatorio_tempo_espera_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de tempo de espera:', error);
    throw error;
  }
};

// Relatório de Tempo Médio de Espera Excel
export const gerarRelatorioTempoEsperaExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, created_at, data_nascimento, responsavel_nome),
        cmei:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao)
      `)
      .eq('acao', 'Matrícula Efetivada')
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.eq('cmei_novo', filtros.cmeiId);
    }

    const { data: matriculas, error } = await query;
    if (error) throw error;

    const dadosExcel = matriculas?.map((m: any) => {
      if (!m.crianca?.created_at || !m.created_at) return null;
      const inscricao = new Date(m.crianca.created_at);
      const matricula = new Date(m.created_at);
      const diffDias = Math.floor((matricula.getTime() - inscricao.getTime()) / (1000 * 60 * 60 * 24));
      return {
        'Criança': m.crianca?.nome || '',
        'Responsável': m.crianca?.responsavel_nome || '',
        [singular]: m.cmei ? formatarNomeCmei(m.cmei) : '',
        'Data Inscrição': format(inscricao, 'dd/MM/yyyy'),
        'Data Matrícula': format(matricula, 'dd/MM/yyyy'),
        'Dias de Espera': diffDias,
      };
    }).filter(Boolean) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tempo de Espera');

    ws['!cols'] = [
      { wch: 30 }, { wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.writeFile(wb, `relatorio_tempo_espera_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de tempo de espera Excel:', error);
    throw error;
  }
};

// Relatório de Transferências PDF
export const gerarRelatorioTransferenciasPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();
    const { singular, plural } = getUnidadeLabels(config as any);

    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, responsavel_nome, responsavel_telefone),
        cmei_anterior:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao),
        cmei_novo:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
        turma_anterior:turmas!historico_turma_anterior_fkey(nome),
        turma_novo:turmas!historico_turma_novo_fkey(nome)
      `)
      .in('acao', ['Transferência de Turma', 'Realocação', 'Transferência em Massa', 'Remanejamento Aprovado', 'Transferência'])
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.or(`cmei_anterior.eq.${filtros.cmeiId},cmei_novo.eq.${filtros.cmeiId}`);
    }

    const { data: transferencias, error } = await query;
    if (error) throw error;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Transferências
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            ${filtros.dataInicio ? ` | Período: ${format(new Date(filtros.dataInicio), 'dd/MM/yyyy')}` : ''}
            ${filtros.dataFim ? ` a ${format(new Date(filtros.dataFim), 'dd/MM/yyyy')}` : ''}
          </p>
        </div>

        <div style="background: #e0f2fe; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #7dd3fc;">
          <span style="font-size: 22px; font-weight: bold; color: #0284c7;">${transferencias?.length || 0}</span>
          <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Transferências realizadas</span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Data</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px;">Tipo</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Criança</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}/Turma Origem</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}/Turma Destino</th>
              <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            ${transferencias?.map((item: any, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${item.created_at ? format(new Date(item.created_at), 'dd/MM/yy') : '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-size: 7px;">${item.acao}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${item.crianca?.nome || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">
                  ${formatarNomeCmei(item.cmei_anterior)}${item.turma_anterior?.nome ? ` / ${item.turma_anterior.nome}` : ''}
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">
                  ${formatarNomeCmei(item.cmei_novo)}${item.turma_novo?.nome ? ` / ${item.turma_novo.nome}` : ''}
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-size: 7px;">${item.justificativa || '-'}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '297mm';
    element.style.padding = '10mm';

    const opt = {
      margin: 5,
      filename: `relatorio_transferencias_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de transferências PDF:', error);
    throw error;
  }
};

// Relatório de Transferências Excel
export const gerarRelatorioTransferenciasExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    let query = supabase
      .from('historico')
      .select(`
        *,
        crianca:criancas(nome, responsavel_nome, responsavel_telefone, data_nascimento),
        cmei_anterior:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao),
        cmei_novo:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
        turma_anterior:turmas!historico_turma_anterior_fkey(nome),
        turma_novo:turmas!historico_turma_novo_fkey(nome)
      `)
      .in('acao', ['Transferência de Turma', 'Realocação', 'Transferência em Massa', 'Remanejamento Aprovado', 'Transferência'])
      .order('created_at', { ascending: false });

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros.cmeiId) {
      query = query.or(`cmei_anterior.eq.${filtros.cmeiId},cmei_novo.eq.${filtros.cmeiId}`);
    }

    const { data: transferencias, error } = await query;
    if (error) throw error;

    const dadosExcel = transferencias?.map((item: any) => ({
      'Data': item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy HH:mm') : '',
      'Tipo': item.acao,
      'Criança': item.crianca?.nome || '',
      'Responsável': item.crianca?.responsavel_nome || '',
      'Telefone': item.crianca?.responsavel_telefone || '',
      [`${singular} Origem`]: item.cmei_anterior ? formatarNomeCmei(item.cmei_anterior) : '-',
      'Turma Origem': item.turma_anterior?.nome || '-',
      [`${singular} Destino`]: item.cmei_novo ? formatarNomeCmei(item.cmei_novo) : '-',
      'Turma Destino': item.turma_novo?.nome || '-',
      'Justificativa': item.justificativa || '',
      'Descrição': item.descricao || '',
    })) || [];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transferências');

    ws['!cols'] = [
      { wch: 18 }, // Data
      { wch: 22 }, // Tipo
      { wch: 30 }, // Criança
      { wch: 30 }, // Responsável
      { wch: 15 }, // Telefone
      { wch: 30 }, // Unidade Origem
      { wch: 20 }, // Turma Origem
      { wch: 30 }, // Unidade Destino
      { wch: 20 }, // Turma Destino
      { wch: 40 }, // Justificativa
      { wch: 40 }, // Descrição
    ];

    XLSX.writeFile(wb, `relatorio_transferencias_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de transferências:', error);
    throw error;
  }
};

// Interfaces para relatório de usuários
export interface FiltrosUsuarios {
  role?: string;
  status?: 'todos' | 'ativos' | 'inativos';
  busca?: string;
}

export interface UsuarioRelatorio {
  id: string;
  email: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
  roles: string[];
  cmeis_vinculados: string[];
}

// Buscar dados de usuários para relatório
const fetchUsuariosRelatorio = async (filtros: FiltrosUsuarios): Promise<UsuarioRelatorio[]> => {
  // Buscar profiles
  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .order('nome_completo', { ascending: true, nullsFirst: false });

  if (filtros.busca) {
    profilesQuery = profilesQuery.or(`nome_completo.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,cpf.ilike.%${filtros.busca}%`);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) throw profilesError;

  // Buscar todas as roles
  const { data: allRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');
  if (rolesError) throw rolesError;

  // Buscar vínculos de diretores com unidades
  const { data: vinculos, error: vinculosError } = await supabase
    .from('diretor_cmei_vinculo')
    .select('user_id, cmei_id, cmeis(nome)');
  if (vinculosError) throw vinculosError;

  // Montar lista de usuários
  let usuarios: UsuarioRelatorio[] = (profiles || []).map((profile) => {
    const userRoles = (allRoles || [])
      .filter((r) => r.user_id === profile.id)
      .map((r) => r.role);

    const userCmeis = (vinculos || [])
      .filter((v) => v.user_id === profile.id)
      .map((v) => (v.cmeis as any)?.nome || 'Unidade não encontrada');

    return {
      id: profile.id,
      email: profile.email || '',
      nome_completo: profile.nome_completo,
      cpf: profile.cpf,
      telefone: profile.telefone,
      ativo: profile.ativo ?? true,
      created_at: profile.created_at || '',
      roles: userRoles.length > 0 ? userRoles : ['responsavel'],
      cmeis_vinculados: userCmeis,
    };
  });

  // Filtrar por role
  if (filtros.role && filtros.role !== 'todos') {
    usuarios = usuarios.filter((u) => u.roles.includes(filtros.role!));
  }

  // Filtrar por status
  if (filtros.status === 'ativos') {
    usuarios = usuarios.filter((u) => u.ativo);
  } else if (filtros.status === 'inativos') {
    usuarios = usuarios.filter((u) => !u.ativo);
  }

  return usuarios;
};

// Labels dos papéis
const roleLabelsRelatorio: Record<string, string> = {
  responsavel: 'Responsável',
  gestor: 'Gestor',
  admin: 'Administrador',
  superadmin: 'Super Admin',
  diretor_cmei: 'Diretor (VAGOU)',
  school_coord: 'Portal da Escola',
};

// Relatório de Usuários PDF
export const gerarRelatorioUsuariosPDF = async (filtros: FiltrosUsuarios) => {
  try {
    const config = await fetchConfiguracoes();
    const { plural } = getUnidadeLabels(config as any);
    const usuarios = await fetchUsuariosRelatorio(filtros);

    const filtrosTexto = [];
    if (filtros.role && filtros.role !== 'todos') {
      filtrosTexto.push(`Papel: ${roleLabelsRelatorio[filtros.role] || filtros.role}`);
    }
    if (filtros.status && filtros.status !== 'todos') {
      filtrosTexto.push(`Status: ${filtros.status === 'ativos' ? 'Ativos' : 'Inativos'}`);
    }
    if (filtros.busca) {
      filtrosTexto.push(`Busca: ${filtros.busca}`);
    }

    const linhasTabela = usuarios.map((u, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${u.nome_completo || 'Não informado'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${u.email}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${u.cpf || '-'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${u.telefone || '-'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${u.roles.map(r => roleLabelsRelatorio[r] || r).join(', ')}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px; text-align: center;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; ${u.ativo ? 'background-color: #dcfce7; color: #166534;' : 'background-color: #fee2e2; color: #991b1b;'}">
            ${u.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${u.cmeis_vinculados.length > 0 ? u.cmeis_vinculados.join(', ') : '-'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${format(new Date(u.created_at), 'dd/MM/yyyy', { locale: ptBR })}</td>
      </tr>
    `).join('');

    // Estatísticas
    const totalAtivos = usuarios.filter(u => u.ativo).length;
    const totalInativos = usuarios.filter(u => !u.ativo).length;
    const rolesCounts: Record<string, number> = {};
    usuarios.forEach(u => {
      u.roles.forEach(r => {
        rolesCounts[r] = (rolesCounts[r] || 0) + 1;
      });
    });

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; max-width: 100%;">
        ${gerarCabecalhoPDF(config)}
        
        <h3 style="color: #1351B4; text-align: center; margin: 20px 0 10px 0; font-size: 16px;">
          Relatório de Usuários do Sistema
        </h3>
        ${filtrosTexto.length > 0 ? `<p style="text-align: center; color: #666; font-size: 10px; margin-bottom: 15px;">${filtrosTexto.join(' | ')}</p>` : ''}

        <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="background: #f0f9ff; padding: 10px 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 20px; font-weight: bold; color: #0369a1;">${usuarios.length}</p>
            <p style="margin: 0; font-size: 10px; color: #666;">Total</p>
          </div>
          <div style="background: #dcfce7; padding: 10px 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 20px; font-weight: bold; color: #166534;">${totalAtivos}</p>
            <p style="margin: 0; font-size: 10px; color: #666;">Ativos</p>
          </div>
          <div style="background: #fee2e2; padding: 10px 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 20px; font-weight: bold; color: #991b1b;">${totalInativos}</p>
            <p style="margin: 0; font-size: 10px; color: #666;">Inativos</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #1351B4; color: white;">
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">Nome</th>
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">E-mail</th>
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">CPF</th>
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">Telefone</th>
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">Papéis</th>
              <th style="padding: 10px 8px; text-align: center; font-size: 10px; border: 1px solid #1351B4;">Status</th>
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">${plural}</th>
              <th style="padding: 10px 8px; text-align: left; font-size: 10px; border: 1px solid #1351B4;">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #1351B4;">Distribuição por Papel</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${Object.entries(rolesCounts).map(([role, count]) => `
              <div style="background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <span style="font-size: 10px;">${roleLabelsRelatorio[role] || role}: <strong>${count}</strong></span>
              </div>
            `).join('')}
          </div>
        </div>

        ${gerarRodapePDF(plural)}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    const opt = {
      margin: 10,
      filename: `relatorio_usuarios_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de usuários:', error);
    throw error;
  }
};

// Relatório de Usuários Excel
export const gerarRelatorioUsuariosExcel = async (filtros: FiltrosUsuarios) => {
  try {
    const { plural } = await fetchConfiguracoesComLabels();
    const usuarios = await fetchUsuariosRelatorio(filtros);

    const dadosExcel = usuarios.map((u) => ({
      'Nome Completo': u.nome_completo || 'Não informado',
      'E-mail': u.email,
      'CPF': u.cpf || '',
      'Telefone': u.telefone || '',
      'Papéis': u.roles.map(r => roleLabelsRelatorio[r] || r).join(', '),
      'Status': u.ativo ? 'Ativo' : 'Inativo',
      [`${plural} Vinculados`]: u.cmeis_vinculados.join(', ') || '',
      'Data de Cadastro': format(new Date(u.created_at), 'dd/MM/yyyy', { locale: ptBR }),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);

    ws['!cols'] = [
      { wch: 35 }, // Nome
      { wch: 35 }, // E-mail
      { wch: 15 }, // CPF
      { wch: 15 }, // Telefone
      { wch: 25 }, // Papéis
      { wch: 10 }, // Status
      { wch: 40 }, // Unidades
      { wch: 15 }, // Data
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Usuários');
    XLSX.writeFile(wb, `relatorio_usuarios_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar relatório de usuários:', error);
    throw error;
  }
};

// Exportação de Campos Customizados Excel
export const gerarRelatorioCamposCustomizadosExcel = async (filtros: FiltrosRelatorio) => {
  try {
    const { singular } = await fetchConfiguracoesComLabels();
    // Buscar campos customizados (não-sistema)
    const { data: camposCustom, error: camposError } = await supabase
      .from('campos_inscricao')
      .select('id, nome_campo, label, secao, tipo')
      .eq('campo_sistema', false)
      .eq('ativo', true)
      .order('secao')
      .order('ordem');

    if (camposError) throw camposError;
    if (!camposCustom || camposCustom.length === 0) {
      throw new Error('Nenhum campo customizado cadastrado');
    }

    // Buscar crianças com filtros
    let criancasQuery = supabase
      .from('criancas')
      .select(`
        id,
        nome,
        data_nascimento,
        responsavel_nome,
        responsavel_cpf,
        status,
        created_at,
        cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao)
      `)
      .order('nome');

    if (filtros.status) {
      criancasQuery = criancasQuery.eq('status', filtros.status as any);
    }
    if (filtros.cmeiId) {
      criancasQuery = criancasQuery.eq('cmei_atual_id', filtros.cmeiId);
    }

    const { data: criancas, error: criancasError } = await criancasQuery;
    if (criancasError) throw criancasError;

    if (!criancas || criancas.length === 0) {
      throw new Error('Nenhuma criança encontrada com os filtros aplicados');
    }

    // Buscar valores dos campos customizados
    const criancaIds = criancas.map(c => c.id);
    const { data: valores, error: valoresError } = await supabase
      .from('valores_campos_custom')
      .select('crianca_id, campo_id, valor')
      .in('crianca_id', criancaIds);

    if (valoresError) throw valoresError;

    // Criar mapa de valores por criança
    const valoresPorCrianca = new Map<string, Map<string, string>>();
    valores?.forEach(v => {
      if (!valoresPorCrianca.has(v.crianca_id)) {
        valoresPorCrianca.set(v.crianca_id, new Map());
      }
      valoresPorCrianca.get(v.crianca_id)!.set(v.campo_id, v.valor || '');
    });

    // Montar dados do Excel
    const dadosExcel = criancas.map((crianca: any) => {
      const valoresCrianca = valoresPorCrianca.get(crianca.id) || new Map();
      
      const row: Record<string, any> = {
        'Nome da Criança': crianca.nome,
        'Data Nascimento': format(new Date(crianca.data_nascimento), 'dd/MM/yyyy'),
        'Responsável': crianca.responsavel_nome,
        'CPF Responsável': crianca.responsavel_cpf,
        'Status': crianca.status,
        [`${singular} Atual`]: crianca.cmei_atual?.nome || '',
        'Data Inscrição': format(new Date(crianca.created_at), 'dd/MM/yyyy'),
      };

      // Adicionar campos customizados
      camposCustom.forEach(campo => {
        row[campo.label] = valoresCrianca.get(campo.id) || '';
      });

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);

    // Ajustar largura das colunas
    const baseColsWidth = [
      { wch: 35 }, // Nome
      { wch: 12 }, // Data Nasc
      { wch: 30 }, // Responsável
      { wch: 15 }, // CPF
      { wch: 18 }, // Status
      { wch: 25 }, // Unidade
      { wch: 12 }, // Data Inscrição
    ];
    
    // Adicionar largura para campos customizados
    camposCustom.forEach(() => baseColsWidth.push({ wch: 25 }));
    ws['!cols'] = baseColsWidth;

    XLSX.utils.book_append_sheet(wb, ws, 'Campos Customizados');
    XLSX.writeFile(wb, `relatorio_campos_customizados_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    return { sucesso: true, totalCriancas: criancas.length, totalCampos: camposCustom.length };
  } catch (error) {
    console.error('Erro ao gerar relatório de campos customizados:', error);
    throw error;
  }
};

// Exportação de Campos Customizados PDF
export const gerarRelatorioCamposCustomizadosPDF = async (filtros: FiltrosRelatorio) => {
  try {
    const config = await fetchConfiguracoes();

    // Buscar campos customizados
    const { data: camposCustom, error: camposError } = await supabase
      .from('campos_inscricao')
      .select('id, nome_campo, label, secao, tipo')
      .eq('campo_sistema', false)
      .eq('ativo', true)
      .order('secao')
      .order('ordem');

    if (camposError) throw camposError;
    if (!camposCustom || camposCustom.length === 0) {
      throw new Error('Nenhum campo customizado cadastrado');
    }

    // Buscar crianças com filtros
    let criancasQuery = supabase
      .from('criancas')
      .select(`
        id,
        nome,
        responsavel_nome,
        status,
        cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao)
      `)
      .order('nome')
      .limit(100); // Limitar para PDF

    if (filtros.status) {
      criancasQuery = criancasQuery.eq('status', filtros.status as any);
    }
    if (filtros.cmeiId) {
      criancasQuery = criancasQuery.eq('cmei_atual_id', filtros.cmeiId);
    }

    const { data: criancas, error: criancasError } = await criancasQuery;
    if (criancasError) throw criancasError;

    if (!criancas || criancas.length === 0) {
      throw new Error('Nenhuma criança encontrada');
    }

    // Buscar valores
    const criancaIds = criancas.map(c => c.id);
    const { data: valores } = await supabase
      .from('valores_campos_custom')
      .select('crianca_id, campo_id, valor')
      .in('crianca_id', criancaIds);

    const valoresPorCrianca = new Map<string, Map<string, string>>();
    valores?.forEach(v => {
      if (!valoresPorCrianca.has(v.crianca_id)) {
        valoresPorCrianca.set(v.crianca_id, new Map());
      }
      valoresPorCrianca.get(v.crianca_id)!.set(v.campo_id, v.valor || '');
    });

    // Gerar HTML
    const tabelaRows = criancas.map((crianca: any) => {
      const valoresCrianca = valoresPorCrianca.get(crianca.id) || new Map();
      const camposHtml = camposCustom.map(campo => 
        `<td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${valoresCrianca.get(campo.id) || '-'}</td>`
      ).join('');

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; font-weight: 500;">${crianca.nome}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${crianca.responsavel_nome}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${crianca.status}</td>
          ${camposHtml}
        </tr>
      `;
    }).join('');

    const camposHeaders = camposCustom.map(c => 
      `<th style="padding: 8px; background: #f8fafc; border-bottom: 2px solid #1351B4; text-align: left; font-size: 9px; white-space: nowrap;">${c.label}</th>`
    ).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">
            Relatório de Campos Customizados
          </h3>
          <p style="color: #666; margin: 0; font-size: 10px;">
            ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • ${criancas.length} registros
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr>
              <th style="padding: 8px; background: #f8fafc; border-bottom: 2px solid #1351B4; text-align: left; font-size: 9px;">Criança</th>
              <th style="padding: 8px; background: #f8fafc; border-bottom: 2px solid #1351B4; text-align: left; font-size: 9px;">Responsável</th>
              <th style="padding: 8px; background: #f8fafc; border-bottom: 2px solid #1351B4; text-align: left; font-size: 9px;">Status</th>
              ${camposHeaders}
            </tr>
          </thead>
          <tbody>
            ${tabelaRows}
          </tbody>
        </table>

        ${gerarRodapePDF()}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    const opt = {
      margin: 10,
      filename: `relatorio_campos_customizados_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };

    await html2pdf().set(opt as any).from(element).save();
    document.body.removeChild(element);

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao gerar PDF de campos customizados:', error);
    throw error;
  }
};

// ============================================================================
// FUNÇÃO UNIFICADA PARA GERAR HTML DE PREVIEW
// ============================================================================

export const gerarHtmlRelatorio = async (tipoRelatorio: string, filtros: FiltrosRelatorio): Promise<string> => {
  const config = await fetchConfiguracoes();

  switch (tipoRelatorio) {
    case 'ocupacao':
      return await gerarHtmlOcupacao(config, filtros);
    case 'vagas':
      return await gerarHtmlVagas(config, filtros);
    case 'fila':
      return await gerarHtmlFila(config, filtros);
    case 'convocacoes':
      return await gerarHtmlConvocacoes(config, filtros);
    case 'matriculas':
      return await gerarHtmlMatriculas(config, filtros);
    case 'matriculados':
      return await gerarHtmlMatriculadosResumo(config, filtros);
    case 'historico-matriculas':
      return await gerarHtmlHistoricoMatriculas(config, filtros);
    case 'desistencias':
      return await gerarHtmlDesistencias(config, filtros);
    case 'tempo-espera':
      return await gerarHtmlTempoEspera(config, filtros);
    case 'transferencias':
      return await gerarHtmlTransferencias(config, filtros);
    case 'campos-customizados':
      return await gerarHtmlCamposCustomizados(config, filtros);
    default:
      throw new Error(`Tipo de relatório não suportado: ${tipoRelatorio}`);
  }
};

// Helpers para gerar HTML de cada relatório

const gerarHtmlOcupacao = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('cmeis')
    .select(`
      id,
      nome,
      capacidade_total,
      turmas(
        id,
        capacidade,
        criancas:criancas!turma_atual_id(count)
      )
    `)
    .eq('ativo', true);

  if (filtros.cmeiId) {
    query = query.eq('id', filtros.cmeiId);
  }

  const { data: cmeis, error } = await query;
  if (error) throw error;

  const dadosOcupacao = cmeis?.map(cmei => {
    const totalOcupados = cmei.turmas?.reduce((acc: number, turma: any) => {
      return acc + (turma.criancas?.[0]?.count || 0);
    }, 0) || 0;

    return {
      nome: cmei.nome,
      capacidade: cmei.capacidade_total || 0,
      ocupados: totalOcupados,
      percentual: cmei.capacidade_total ? Math.round((totalOcupados / cmei.capacidade_total) * 100) : 0
    };
  }) || [];

  const totalCapacidade = dadosOcupacao.reduce((acc, item) => acc + item.capacidade, 0);
  const totalOcupados = dadosOcupacao.reduce((acc, item) => acc + item.ocupados, 0);
  const percentualGeral = totalCapacidade ? Math.round((totalOcupados / totalCapacidade) * 100) : 0;

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Ocupação
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 25px; justify-content: center;">
        <div style="background: #f8fafc; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 24px; font-weight: bold; color: #1351B4;">${totalCapacidade}</div>
          <div style="font-size: 10px; color: #64748b;">Capacidade Total</div>
        </div>
        <div style="background: #eff6ff; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
          <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalOcupados}</div>
          <div style="font-size: 10px; color: #64748b;">Total Ocupados</div>
        </div>
        <div style="background: ${percentualGeral > 80 ? '#fef2f2' : '#f0fdf4'}; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid ${percentualGeral > 80 ? '#fecaca' : '#bbf7d0'};">
          <div style="font-size: 24px; font-weight: bold; color: ${percentualGeral > 80 ? '#ef4444' : '#22c55e'};">${percentualGeral}%</div>
          <div style="font-size: 10px; color: #64748b;">Taxa de Ocupação</div>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Capacidade</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Ocupados</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Disponíveis</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Taxa</th>
          </tr>
        </thead>
        <tbody>
          ${dadosOcupacao.map((item, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 500;">${item.nome}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${item.capacidade}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${item.ocupados}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${item.capacidade - item.ocupados}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                <span style="color: ${item.percentual > 80 ? '#ef4444' : item.percentual > 50 ? '#eab308' : '#22c55e'}; font-weight: 600;">
                  ${item.percentual}%
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #1351B4; color: white; font-weight: bold;">
            <td style="border: 1px solid #1351B4; padding: 10px;">TOTAL</td>
            <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${totalCapacidade}</td>
            <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${totalOcupados}</td>
            <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${totalCapacidade - totalOcupados}</td>
            <td style="border: 1px solid #1351B4; padding: 10px; text-align: center;">${percentualGeral}%</td>
          </tr>
        </tfoot>
      </table>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlVagas = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('turmas')
    .select(`
      id,
      nome,
      turma_base,
      turno,
      capacidade,
      cmei:cmeis!turmas_cmei_id_fkey(nome, tipo_gestao),
      criancas:criancas!turma_atual_id(count)
    `)
    .order('nome')
    .limit(150);

  if (filtros.cmeiId) {
    query = query.eq('cmei_id', filtros.cmeiId);
  }

  if (filtros.turmaBase) {
    query = query.eq('turma_base', filtros.turmaBase);
  }

  if (filtros.turno) {
    query = query.eq('turno', filtros.turno);
  }

  const { data: turmas, error } = await query;
  if (error) throw error;

  const vagas = (turmas || []).map((turma: any) => {
    const ocupados = turma.criancas?.[0]?.count || 0;
    const capacidade = turma.capacidade || 0;
    const livres = capacidade - ocupados;
    const percentual = capacidade ? Math.round((ocupados / capacidade) * 100) : 0;
    return {
      cmei: formatarNomeCmei(turma.cmei),
      turma: turma.nome,
      turmaBase: turma.turma_base || '-',
      turno: turma.turno || '-',
      capacidade,
      ocupados,
      livres,
      percentual,
    };
  });

  const totalCapacidade = vagas.reduce((acc, v) => acc + v.capacidade, 0);
  const totalOcupados = vagas.reduce((acc, v) => acc + v.ocupados, 0);
  const totalLivres = vagas.reduce((acc, v) => acc + v.livres, 0);
  const percentualGeral = totalCapacidade ? Math.round((totalOcupados / totalCapacidade) * 100) : 0;
  const filtrosTexto = gerarTextoFiltros(filtros, singular);

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}

      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Vagas (por Turma)
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: center;">
        <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
          <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${totalCapacidade}</span>
          <span style="font-size: 10px; color: #64748b; display: block;">Capacidade</span>
        </div>
        <div style="background: #eff6ff; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
          <span style="font-size: 22px; font-weight: bold; color: #3b82f6;">${totalOcupados}</span>
          <span style="font-size: 10px; color: #64748b; display: block;">Ocupados</span>
        </div>
        <div style="background: #f0fdf4; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <span style="font-size: 22px; font-weight: bold; color: #22c55e;">${totalLivres}</span>
          <span style="font-size: 10px; color: #64748b; display: block;">Vagas Livres</span>
        </div>
        <div style="background: ${percentualGeral > 80 ? '#fef2f2' : '#f8fafc'}; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid ${percentualGeral > 80 ? '#fecaca' : '#e2e8f0'};">
          <span style="font-size: 22px; font-weight: bold; color: ${percentualGeral > 80 ? '#ef4444' : '#1351B4'};">${percentualGeral}%</span>
          <span style="font-size: 10px; color: #64748b; display: block;">Ocupação Geral</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Turma</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Modelo</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Turno</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Cap.</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Ocup.</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Livres</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Ocup. %</th>
          </tr>
        </thead>
        <tbody>
          ${vagas.map((v, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${v.cmei}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${v.turma}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.turmaBase}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.turno}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.capacidade}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.ocupados}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-weight: 600; color: ${v.livres > 0 ? '#16a34a' : '#ef4444'};">${v.livres}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${v.percentual}%</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlMatriculadosResumo = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('criancas')
    .select(`
      id,
      sexo,
      prioridade,
      updated_at,
      cmei:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao),
      turma:turmas(turno, turma_base)
    `)
    .in('status', ['Matriculado', 'Matriculada']);

  if (filtros.cmeiId) {
    query = query.eq('cmei_atual_id', filtros.cmeiId);
  }

  if (filtros.dataInicio) {
    query = query.gte('updated_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('updated_at', filtros.dataFim);
  }

  if (filtros.prioridade) {
    query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
  }

  if (filtros.sexo) {
    query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
  }

  const { data: matriculas, error } = await query;
  if (error) throw error;

  let matriculasFiltradas = matriculas || [];
  if (filtros.turmaBase) {
    matriculasFiltradas = matriculasFiltradas.filter((c: any) => c.turma?.turma_base === filtros.turmaBase);
  }

  const criancaIds = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
  const turnoInteresse = await fetchTurnoInteresse(criancaIds);
  if (filtros.turno) {
    matriculasFiltradas = matriculasFiltradas.filter((c: any) => (c.turma?.turno || turnoInteresse[c.id]) === filtros.turno);
  }

  const turnosBase = ['Matutino', 'Vespertino', 'Integral'];
  const porCmei = new Map<string, { cmei: string; Matutino: number; Vespertino: number; Integral: number; Outros: number; Total: number }>();

  matriculasFiltradas.forEach((c: any) => {
    const cmei = formatarNomeCmei(c.cmei);
    const turno = c.turma?.turno || turnoInteresse[c.id] || 'Não informado';
    const tKey = turnosBase.includes(turno) ? turno : 'Outros';
    const row = porCmei.get(cmei) || { cmei, Matutino: 0, Vespertino: 0, Integral: 0, Outros: 0, Total: 0 };
    row[tKey as 'Matutino' | 'Vespertino' | 'Integral' | 'Outros'] += 1;
    row.Total += 1;
    porCmei.set(cmei, row);
  });

  const rows = Array.from(porCmei.values()).sort((a, b) => a.cmei.localeCompare(b.cmei, 'pt-BR'));
  const totalGeral = rows.reduce((acc, r) => acc + r.Total, 0);
  const filtrosTexto = gerarTextoFiltros(filtros, singular);

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}

      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Matriculados (Resumo)
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
      </div>

      <div style="background: #f0fdf4; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #bbf7d0;">
        <span style="font-size: 22px; font-weight: bold; color: #22c55e;">${totalGeral}</span>
        <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Total de Matriculados</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Matutino</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Vespertino</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Integral</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Outros/N.I.</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 7px; font-weight: 500;">${r.cmei}</td>
              <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.Matutino}</td>
              <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.Vespertino}</td>
              <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.Integral}</td>
              <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center;">${r.Outros}</td>
              <td style="border: 1px solid #e2e8f0; padding: 7px; text-align: center; font-weight: 700;">${r.Total}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlHistoricoMatriculas = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  const acoes = [
    'Matrícula Confirmada',
    'Desistência de Matrícula',
    'Transferência para Outro Município',
    'Transição Anual - Conclusão',
    'Transição Anual - Desistência',
    'Concluinte',
  ];

  let query = supabase
    .from('historico')
    .select(`
      *,
      crianca:criancas(id, nome, responsavel_nome, responsavel_telefone, sexo, prioridade, status),
      cmei_anterior:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao),
      cmei_novo:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
      turma_anterior:turmas!historico_turma_anterior_fkey(nome, turno),
      turma_novo:turmas!historico_turma_novo_fkey(nome, turno)
    `)
    .in('acao', acoes)
    .order('created_at', { ascending: false })
    .limit(120);

  if (filtros.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  if (filtros.cmeiId) {
    query = query.or(`cmei_anterior.eq.${filtros.cmeiId},cmei_novo.eq.${filtros.cmeiId}`);
  }

  const { data: historico, error } = await query;
  if (error) throw error;

  let historicoFiltrado = historico || [];
  if (filtros.sexo) {
    historicoFiltrado = historicoFiltrado.filter((h: any) => h.crianca?.sexo === filtros.sexo);
  }
  if (filtros.prioridade) {
    historicoFiltrado = historicoFiltrado.filter((h: any) => h.crianca?.prioridade === filtros.prioridade);
  }
  if (filtros.turno) {
    historicoFiltrado = historicoFiltrado.filter((h: any) => (h.turma_novo?.turno || h.turma_anterior?.turno) === filtros.turno);
  }

  const filtrosTexto = gerarTextoFiltros(filtros, singular);

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Histórico de Matrículas
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
      </div>

      <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #e2e8f0;">
        <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${historicoFiltrado.length}</span>
        <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Registros (prévia)</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Data</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Ação</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Criança</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Responsável</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Turma/Turno</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Motivo</th>
          </tr>
        </thead>
        <tbody>
          ${historicoFiltrado.map((h: any, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${h.created_at ? format(new Date(h.created_at), 'dd/MM/yy') : '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-size: 7px;">${h.acao || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${h.crianca?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${h.crianca?.responsavel_nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${h.cmei_novo?.nome || h.cmei_anterior?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${h.turma_novo?.nome || h.turma_anterior?.nome || '-'}${(h.turma_novo?.turno || h.turma_anterior?.turno) ? ` / ${(h.turma_novo?.turno || h.turma_anterior?.turno)}` : ''}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; font-size: 7px;">${h.justificativa || '-'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <p style="color: #666; font-size: 10px; margin-top: 10px; text-align: center;">A pré-visualização exibe até 120 registros. Exporte para ver todos.</p>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlFila = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('criancas')
    .select(`
      *,
      cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome, tipo_gestao),
      cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome, tipo_gestao)
    `)
    .eq('status', 'Fila de Espera')
    .order('posicao_fila', { ascending: true })
    .limit(100);

  if (filtros.cmeiId) {
    query = query.or(`cmei1_preferencia.eq.${filtros.cmeiId},cmei2_preferencia.eq.${filtros.cmeiId}`);
  }

  if (filtros.prioridade) {
    query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
  }

  if (filtros.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  if (filtros.sexo) {
    query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
  }

  const { data: fila, error } = await query;
  if (error) throw error;

  const filaInicial = fila || [];
  const criancaIds = filaInicial.map((c: any) => c.id).filter(Boolean);
  const turnoInteresse = await fetchTurnoInteresse(criancaIds);
  const filaFiltrada = filtros.turno
    ? filaInicial.filter((c: any) => turnoInteresse[c.id] === filtros.turno)
    : filaInicial;

  const totalPrioridadeSocial = filaFiltrada.filter((c: any) => c.prioridade === 'Social').length || 0;
  const totalPrioridadeGeral = filaFiltrada.filter((c: any) => c.prioridade === 'Geral').length || 0;
  const filtrosTexto = gerarTextoFiltros(filtros, singular);

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Fila de Espera
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: center;">
        <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 22px; font-weight: bold; color: #1351B4;">${filaFiltrada.length || 0}</div>
          <div style="font-size: 10px; color: #64748b;">Total na Fila</div>
        </div>
        <div style="background: #fef3c7; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
          <div style="font-size: 22px; font-weight: bold; color: #92400e;">${totalPrioridadeSocial}</div>
          <div style="font-size: 10px; color: #64748b;">Prioridade Social</div>
        </div>
        <div style="background: #e0e7ff; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #c7d2fe;">
          <div style="font-size: 22px; font-weight: bold; color: #3730a3;">${totalPrioridadeGeral}</div>
          <div style="font-size: 10px; color: #64748b;">Prioridade Geral</div>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Pos.</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Nome</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Idade</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Turno</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Prioridade</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular} Preferência</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Inscrição</th>
          </tr>
        </thead>
        <tbody>
          ${filaFiltrada.slice(0, 50).map((crianca: any, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: 600;">${crianca.posicao_fila || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 500;">${crianca.nome}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${calcularIdade(crianca.data_nascimento)}a</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${turnoInteresse[crianca.id] || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">
                <span style="background: ${crianca.prioridade === 'Social' ? '#fef3c7' : '#e0e7ff'}; color: ${crianca.prioridade === 'Social' ? '#92400e' : '#3730a3'}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600;">
                  ${crianca.prioridade}
                </span>
              </td>
              <td style="border: 1px solid #e2e8f0; padding: 6px;">${(crianca as any).cmei1?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">
                ${crianca.created_at ? format(new Date(crianca.created_at), 'dd/MM/yy') : '-'}
              </td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
      ${(filaFiltrada.length || 0) > 50 ? '<p style="color: #666; font-size: 10px; margin-top: 10px; text-align: center;">Exibindo os primeiros 50 registros. Exporte para ver todos.</p>' : ''}

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlConvocacoes = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('historico')
    .select(`
      *,
      crianca:criancas(nome, responsavel_nome, responsavel_telefone),
      cmei:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
      turma:turmas!historico_turma_novo_fkey(nome)
    `)
    .eq('acao', 'Convocação')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filtros.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  if (filtros.cmeiId) {
    query = query.eq('cmei_novo', filtros.cmeiId);
  }

  const { data: convocacoes, error } = await query;
  if (error) throw error;

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Convocações
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          ${filtros.dataInicio ? ` | Período: ${format(new Date(filtros.dataInicio), 'dd/MM/yyyy')}` : ''}
          ${filtros.dataFim ? ` a ${format(new Date(filtros.dataFim), 'dd/MM/yyyy')}` : ''}
        </p>
      </div>

      <div style="background: #eff6ff; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #bfdbfe;">
        <span style="font-size: 22px; font-weight: bold; color: #1351B4;">${convocacoes?.length || 0}</span>
        <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Convocações no período</span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Data</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Criança</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Responsável</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Telefone</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Turma</th>
          </tr>
        </thead>
        <tbody>
          ${convocacoes?.slice(0, 50).map((conv: any, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${conv.created_at ? format(new Date(conv.created_at), 'dd/MM/yy') : '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 500;">${conv.crianca?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px;">${conv.crianca?.responsavel_nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${conv.crianca?.responsavel_telefone || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px;">${formatarNomeCmei(conv.cmei)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${conv.turma?.nome || '-'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlMatriculas = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('criancas')
    .select(`
      *,
      cmei:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_gestao),
      turma:turmas(nome, turno, turma_base)
    `)
    .in('status', ['Matriculado', 'Matriculada'])
    .order('nome');

  if (filtros.cmeiId) {
    query = query.eq('cmei_atual_id', filtros.cmeiId);
  }

  if (filtros.dataInicio) {
    query = query.gte('updated_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('updated_at', filtros.dataFim);
  }

  if (filtros.prioridade) {
    query = query.eq('prioridade', filtros.prioridade as "Social" | "Geral");
  }

  if (filtros.sexo) {
    query = query.eq('sexo', filtros.sexo as "Masculino" | "Feminino");
  }

  const { data: matriculas, error } = await query;
  if (error) throw error;

  let matriculasFiltradas = matriculas || [];
  if (filtros.turmaBase) {
    matriculasFiltradas = matriculasFiltradas.filter((c: any) => c.turma?.turma_base === filtros.turmaBase);
  }

  const criancaIds = matriculasFiltradas.map((c: any) => c.id).filter(Boolean);
  const turnoInteresse = await fetchTurnoInteresse(criancaIds);
  if (filtros.turno) {
    matriculasFiltradas = matriculasFiltradas.filter((c: any) => (c.turma?.turno || turnoInteresse[c.id]) === filtros.turno);
  }

  const filtrosTexto = gerarTextoFiltros(filtros, singular);
  const totalRegistros = matriculasFiltradas.length;
  const registrosExibidos = Math.min(totalRegistros, 100);

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Matrículas
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        ${filtrosTexto ? `<p style="color: #1351B4; margin: 5px 0 0 0; font-size: 9px; font-weight: 500;">${filtrosTexto}</p>` : ''}
      </div>

      <div style="background: #f0fdf4; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #bbf7d0;">
        <span style="font-size: 22px; font-weight: bold; color: #22c55e;">${totalRegistros}</span>
        <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Crianças Matriculadas</span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Nome</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Idade</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Responsável</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Telefone</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Turma</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Turno</th>
          </tr>
        </thead>
        <tbody>
          ${matriculasFiltradas?.slice(0, 100).map((crianca: any, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${crianca.nome}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${calcularIdade(crianca.data_nascimento)}a</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${crianca.responsavel_nome}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${crianca.responsavel_telefone}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatarNomeCmei(crianca.cmei)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${crianca.turma?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${crianca.turma?.turno || turnoInteresse[crianca.id] || '-'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
      ${totalRegistros > 100 ? `<p style="color: #666; font-size: 10px; margin-top: 10px; text-align: center;">Exibindo ${registrosExibidos} de ${totalRegistros} registros na pré-visualização. Exporte para ver todos.</p>` : ''}

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlDesistencias = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('historico')
    .select(`
      *,
      crianca:criancas(nome, responsavel_nome),
      cmei:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao)
    `)
    .in('acao', ['Desistência', 'Recusa', 'Recusada', 'Desistente'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (filtros.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  const { data: desistencias, error } = await query;
  if (error) throw error;

  const totalDesistencias = desistencias?.filter(d => d.acao?.includes('Desist')).length || 0;
  const totalRecusas = desistencias?.filter(d => d.acao?.includes('Recus')).length || 0;

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Desistências e Recusas
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: center;">
        <div style="background: #fef2f2; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #fecaca;">
          <span style="font-size: 22px; font-weight: bold; color: #ef4444;">${totalDesistencias}</span>
          <span style="font-size: 10px; color: #64748b; display: block;">Desistências</span>
        </div>
        <div style="background: #fef3c7; padding: 12px 20px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
          <span style="font-size: 22px; font-weight: bold; color: #f59e0b;">${totalRecusas}</span>
          <span style="font-size: 10px; color: #64748b; display: block;">Recusas</span>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Data</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px;">Tipo</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Criança</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Responsável</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 8px; text-align: left;">Justificativa</th>
          </tr>
        </thead>
        <tbody>
          ${desistencias?.slice(0, 50).map((item: any, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${item.created_at ? format(new Date(item.created_at), 'dd/MM/yy') : '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">
                <span style="background: ${item.acao?.includes('Desist') ? '#fef2f2' : '#fef3c7'}; color: ${item.acao?.includes('Desist') ? '#ef4444' : '#f59e0b'}; padding: 2px 6px; border-radius: 4px; font-size: 9px;">
                  ${item.acao}
                </span>
              </td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 500;">${item.crianca?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px;">${item.crianca?.responsavel_nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px;">${formatarNomeCmei(item.cmei)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 9px;">${item.justificativa || '-'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlTempoEspera = async (config: any, filtros: FiltrosRelatorio) => {
  const { singular, plural } = getUnidadeLabels(config as any);
  let query = supabase
    .from('historico')
    .select(`
      *,
      crianca:criancas(nome, created_at),
      cmei:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao)
    `)
    .eq('acao', 'Matrícula Efetivada')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filtros.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  const { data: matriculas, error } = await query;
  if (error) throw error;

  const temposEspera = matriculas?.map((m: any) => {
    if (!m.crianca?.created_at || !m.created_at) return null;
    const inscricao = new Date(m.crianca.created_at);
    const matricula = new Date(m.created_at);
    const diffDias = Math.floor((matricula.getTime() - inscricao.getTime()) / (1000 * 60 * 60 * 24));
    return { cmei: m.cmei ? formatarNomeCmei(m.cmei) : undefined, diasEspera: diffDias };
  }).filter(Boolean) || [];

  const totalDias = temposEspera.reduce((acc, t) => acc + (t?.diasEspera || 0), 0);
  const mediaGeral = temposEspera.length > 0 ? Math.round(totalDias / temposEspera.length) : 0;

  const porUnidade: Record<string, number[]> = {};
  temposEspera.forEach((t) => {
    if (t?.cmei) {
      if (!porUnidade[t.cmei]) porUnidade[t.cmei] = [];
      porUnidade[t.cmei].push(t.diasEspera);
    }
  });

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Tempo Médio de Espera
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 25px; justify-content: center;">
        <div style="background: #eff6ff; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
          <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${mediaGeral}</div>
          <div style="font-size: 10px; color: #64748b;">Dias em Média</div>
        </div>
        <div style="background: #f8fafc; padding: 15px 25px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 24px; font-weight: bold; color: #1351B4;">${temposEspera.length}</div>
          <div style="font-size: 10px; color: #64748b;">Matrículas Analisadas</div>
        </div>
      </div>

      <h4 style="color: #1351B4; margin: 20px 0 10px; font-size: 12px;">Tempo Médio por ${singular}</h4>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: left;">${singular}</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Matrículas</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Média (dias)</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Mínimo</th>
            <th style="border: 1px solid #0d3d8a; padding: 10px; text-align: center;">Máximo</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(porUnidade).map(([cmei, dias], i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 500;">${cmei}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${dias.length}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: 600;">${Math.round(dias.reduce((a, b) => a + b, 0) / dias.length)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${Math.min(...dias)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${Math.max(...dias)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${gerarRodapePDF(plural)}
    </div>
  `;
};

const gerarHtmlTransferencias = async (config: any, filtros: FiltrosRelatorio) => {
  let query = supabase
    .from('historico')
    .select(`
      *,
      crianca:criancas(nome, responsavel_nome),
        cmei_anterior:cmeis!historico_cmei_anterior_fkey(nome, tipo_gestao),
        cmei_novo:cmeis!historico_cmei_novo_fkey(nome, tipo_gestao),
      turma_anterior:turmas!historico_turma_anterior_fkey(nome),
      turma_novo:turmas!historico_turma_novo_fkey(nome)
    `)
    .in('acao', ['Transferência de Turma', 'Realocação', 'Transferência em Massa', 'Remanejamento Aprovado', 'Transferência'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (filtros.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  const { data: transferencias, error } = await query;
  if (error) throw error;

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Relatório de Transferências
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div style="background: #e0e7ff; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 1px solid #c7d2fe;">
        <span style="font-size: 22px; font-weight: bold; color: #3730a3;">${transferencias?.length || 0}</span>
        <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Transferências no período</span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background: #1351B4; color: white;">
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Data</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px;">Tipo</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Criança</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">De</th>
            <th style="border: 1px solid #0d3d8a; padding: 6px; text-align: left;">Para</th>
          </tr>
        </thead>
        <tbody>
          ${transferencias?.slice(0, 50).map((t: any, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${t.created_at ? format(new Date(t.created_at), 'dd/MM/yy') : '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-size: 8px;">${t.acao}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 500;">${t.crianca?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${t.cmei_anterior?.nome || '-'} / ${t.turma_anterior?.nome || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 5px;">${t.cmei_novo?.nome || '-'} / ${t.turma_novo?.nome || '-'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      ${gerarRodapePDF()}
    </div>
  `;
};

const gerarHtmlCamposCustomizados = async (config: any, filtros: FiltrosRelatorio) => {
  const { data: camposCustom } = await supabase
    .from('campos_inscricao')
    .select('*')
    .eq('ativo', true)
    .eq('campo_sistema', false)
    .order('ordem');

  if (!camposCustom || camposCustom.length === 0) {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
        ${gerarCabecalhoPDF(config)}
        <div style="text-align: center; padding: 40px;">
          <p style="color: #666;">Nenhum campo customizado configurado</p>
        </div>
        ${gerarRodapePDF()}
      </div>
    `;
  }

  let query = supabase
    .from('criancas')
    .select('id, nome, responsavel_nome, status')
    .order('nome')
    .limit(50);

  if (filtros.cmeiId) {
    query = query.eq('cmei_atual_id', filtros.cmeiId);
  }

  const { data: criancas } = await query;

  const criancaIds = criancas?.map(c => c.id) || [];
  const { data: valores } = await supabase
    .from('valores_campos_custom')
    .select('*')
    .in('crianca_id', criancaIds);

  const valoresPorCrianca = new Map<string, Map<string, string>>();
  valores?.forEach(v => {
    if (!valoresPorCrianca.has(v.crianca_id)) {
      valoresPorCrianca.set(v.crianca_id, new Map());
    }
    valoresPorCrianca.get(v.crianca_id)?.set(v.campo_id, v.valor || '-');
  });

  const camposHeaders = camposCustom.map(c => 
    `<th style="padding: 8px; background: #1351B4; color: white; border: 1px solid #0d3d8a; text-align: left; font-size: 9px;">${c.label}</th>`
  ).join('');

  const tabelaRows = criancas?.map((crianca: any) => {
    const valoresCrianca = valoresPorCrianca.get(crianca.id) || new Map();
    const camposHtml = camposCustom.map(campo => 
      `<td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 9px;">${valoresCrianca.get(campo.id) || '-'}</td>`
    ).join('');

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 9px; font-weight: 500;">${crianca.nome}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 9px;">${crianca.responsavel_nome}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 9px;">${crianca.status}</td>
        ${camposHtml}
      </tr>
    `;
  }).join('') || '';

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
      ${gerarCabecalhoPDF(config)}
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">
          Relatório de Campos Customizados
        </h3>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • ${criancas?.length || 0} registros
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr>
            <th style="padding: 8px; background: #1351B4; color: white; border: 1px solid #0d3d8a; text-align: left; font-size: 9px;">Criança</th>
            <th style="padding: 8px; background: #1351B4; color: white; border: 1px solid #0d3d8a; text-align: left; font-size: 9px;">Responsável</th>
            <th style="padding: 8px; background: #1351B4; color: white; border: 1px solid #0d3d8a; text-align: left; font-size: 9px;">Status</th>
            ${camposHeaders}
          </tr>
        </thead>
        <tbody>
          ${tabelaRows}
        </tbody>
      </table>

      ${gerarRodapePDF()}
    </div>
  `;
};

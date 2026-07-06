import { format } from "date-fns";
import * as XLSX from "xlsx";

export type CampoImportavelModelo = {
  nome_campo: string;
  label?: string | null;
  tipo?: string | null;
  campo_sistema?: boolean;
  secao?: string | null;
  opcoes?: { value: string; label: string }[] | null;
  obrigatorio?: boolean;
};

export const gerarModeloExcelComHeaders = (params: {
  headers: string[];
  exemplo?: string[];
  nomeAba: string;
  nomeArquivo: string;
  larguraColuna?: number;
}) => {
  const ws = XLSX.utils.aoa_to_sheet([params.headers, params.exemplo || params.headers.map(() => "")]);
  ws["!cols"] = params.headers.map(() => ({ wch: params.larguraColuna ?? 25 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, params.nomeAba);
  XLSX.writeFile(wb, params.nomeArquivo);
};

// Gerar modelo Excel para importação de crianças
export const gerarModeloExcel = () => {
  const headers = [
    "nome",
    "data_nascimento (AAAA-MM-DD)",
    "sexo (Masculino/Feminino)",
    "programas_sociais (Sim/Não)",
    "aceita_qualquer_cmei (Sim/Não)",
    "responsavel_nome",
    "responsavel_cpf",
    "responsavel_telefone",
    "responsavel_celular",
    "responsavel_email",
    "endereco",
    "bairro",
    "observacoes",
    "status (Matriculado/Fila de Espera/etc)",
    "cmei1_preferencia",
    "cmei2_preferencia",
    "cmei_atual_nome",
    "turma_atual_nome",
  ];

  const exemplo = [
    "João da Silva",
    "2021-05-15",
    "Masculino",
    "Não",
    "Sim",
    "Maria Silva",
    "12345678900",
    "(11) 3333-4444",
    "(11) 98888-7777",
    "maria@email.com",
    "Rua das Flores, 123",
    "Centro",
    "",
    "Fila de Espera",
    "",
    "",
    "",
    "",
  ];

  gerarModeloExcelComHeaders({
    headers,
    exemplo,
    nomeAba: "Modelo",
    nomeArquivo: `modelo_importacao_${format(new Date(), "yyyyMMdd")}.xlsx`,
    larguraColuna: 25,
  });
};

// Exportar dados atuais para Excel
export const exportarCriancasExcel = async (criancas: any[], unidadeSingular = "Unidade") => {
  const headers = [
    "Nome",
    "Data Nascimento",
    "Sexo",
    "Programas Sociais",
    `Aceita Qualquer ${unidadeSingular}`,
    "Responsável Nome",
    "Responsável CPF",
    "Responsável Telefone",
    "Responsável Celular",
    "Responsável Email",
    "Endereço",
    "Bairro",
    "Observações",
    "Status",
    `${unidadeSingular} 1ª Preferência`,
    `${unidadeSingular} 2ª Preferência`,
    `${unidadeSingular} Atual`,
    "Turma Atual",
    "Posição Fila",
    "Prazo Convocação",
    "Data Penalidade"
  ];

  const rows = criancas.map((c) => [
    c.nome || "",
    c.data_nascimento || "",
    c.sexo || "",
    c.programas_sociais ? "Sim" : "Não",
    c.aceita_qualquer_cmei ? "Sim" : "Não",
    c.responsavel_nome || "",
    c.responsavel_cpf || "",
    c.responsavel_telefone || "",
    c.responsavel_celular || "",
    c.responsavel_email || "",
    c.logradouro || "",
    c.bairro || "",
    c.observacoes || "",
    c.status || "",
    c.cmei1?.nome || "",
    c.cmei2?.nome || "",
    c.cmei_atual?.nome || "",
    c.turma_atual?.nome || "",
    c.posicao_fila || "",
    c.convocacao_deadline || "",
    c.data_penalidade || ""
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Ajustar largura das colunas
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Crianças");

  XLSX.writeFile(wb, `backup_criancas_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
};

// Gerar modelo Excel para turmas
export const gerarModeloTurmasExcel = () => {
  const headers = [
    "nome",
    "turma_base (Infantil 0, Infantil 1, ..., Infantil 5)",
    "cmei_nome",
    "capacidade",
    "turno (Integral/Manhã/Tarde)",
    "idade_minima_meses",
    "idade_maxima_meses",
    "professores (Nome|Turno; ...)",
    "auxiliares (Nome|Turno; ...)"
  ];

  const exemplo = [
    "Berçário I - A",
    "Berçário I",
    "Unidade Exemplo",
    "15",
    "Integral",
    "0",
    "12",
    "João|Matutino; Maria|Vespertino",
    "Ana|Integral"
  ];

  gerarModeloExcelComHeaders({
    headers,
    exemplo,
    nomeAba: "Modelo Turmas",
    nomeArquivo: "modelo_turmas.xlsx",
    larguraColuna: 30,
  });
};

// Parse Excel file para array de arrays
export const parseExcel = (file: File): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        
        // Pegar primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para array de arrays
        const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          defval: ""
        });
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};

// Export fila de espera para Excel
export const exportFilaEsperaExcel = (fila: any[], unidadeSingular = "Unidade") => {
  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const meses = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;

    if (anos === 0) {
      return `${meses} mês(es)`;
    }
    return `${anos} ano(s), ${mesesRestantes} mês(es)`;
  };

  const headers = [
    "Posição",
    "Nome da Criança",
    "Data de Nascimento",
    "Idade",
    "Responsável",
    "CPF Responsável",
    "Telefone",
    "Data Inscrição",
    "Prioridade",
    "Status",
    `${unidadeSingular} 1ª Preferência`,
    `${unidadeSingular} 2ª Preferência`,
    `Aceita Qualquer ${unidadeSingular}`
  ];

  const rows = fila.map((crianca, index) => [
    crianca.posicao_fila || index + 1,
    crianca.nome,
    crianca.data_nascimento,
    calcularIdade(crianca.data_nascimento),
    crianca.responsavel_nome,
    crianca.responsavel_cpf,
    crianca.responsavel_telefone,
    crianca.created_at ? format(new Date(crianca.created_at), "dd/MM/yyyy - HH:mm") : "",
    crianca.prioridade,
    crianca.status,
    crianca.cmei1?.nome || "",
    crianca.cmei2?.nome || "",
    crianca.aceita_qualquer_cmei ? "Sim" : "Não"
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Ajustar largura das colunas
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fila de Espera");

  XLSX.writeFile(wb, `fila_espera_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
};

const normalizarHeaderModelo = (header: string) => header.split("(")[0].trim().toLowerCase();

const gerarExemploPorTipo = (campo?: CampoImportavelModelo) => {
  const tipo = campo?.tipo || "";
  const nome = (campo?.nome_campo || "").toLowerCase();

  if (tipo === "checkbox") return "Não";
  if (tipo === "date") return "2021-05-15";
  if (tipo === "number") return "1";
  if (tipo === "select") return campo?.opcoes?.[0]?.label || campo?.opcoes?.[0]?.value || "Opção 1";

  if (tipo === "email" || nome.includes("email")) return "exemplo@email.com";
  if (tipo === "cpf" || nome.includes("cpf")) return "52998224725";
  if (tipo === "phone" || nome.includes("telefone") || nome.includes("celular")) return "(11) 3333-4444";
  if (tipo === "cep" || nome === "cep") return "00000000";

  return "Exemplo";
};

export const gerarModeloImportacaoCriancasExcel = (campos: CampoImportavelModelo[]) => {
  const baseHeaders = [
    "nome",
    "data_nascimento (AAAA-MM-DD)",
    "sexo (Masculino/Feminino)",
    "data_inscricao (opcional, DD/MM/AAAA HH:mm)",
    "data_retorno_fila (opcional, DD/MM/AAAA HH:mm)",
    "programas_sociais (Sim/Não)",
    "aceita_qualquer_cmei (Sim/Não)",
    "responsavel_nome",
    "responsavel_cpf",
    "responsavel_telefone",
    "responsavel_celular",
    "responsavel_email",
    "cpf_crianca",
    "certidao_nascimento",
    "cep",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "estado",
    "observacoes",
    "status (Fila de Espera/Convocado/Matriculado/...)",
    "cmei1_preferencia",
    "cmei2_preferencia",
    "cmei3_preferencia",
    "cmei_atual_nome",
    "turma_atual_nome",
  ];

  const dynamicHeaders = campos
    .filter((c) => c.nome_campo)
    .map((c) => {
      if (c.label && c.label.trim() && normalizarHeaderModelo(c.label) !== normalizarHeaderModelo(c.nome_campo)) {
        return `${c.nome_campo} (${c.label})`;
      }
      return c.nome_campo;
    });

  const headersFinal: string[] = [];
  const seen = new Set<string>();
  for (const h of [...baseHeaders, ...dynamicHeaders]) {
    const key = normalizarHeaderModelo(h);
    if (seen.has(key)) continue;
    seen.add(key);
    headersFinal.push(h);
  }

  const campoByKey = new Map<string, CampoImportavelModelo>();
  for (const c of campos) {
    if (!c?.nome_campo) continue;
    campoByKey.set(normalizarHeaderModelo(c.nome_campo), c);
  }

  const exemploByKey = new Map<string, string>([
    ["nome", "João da Silva"],
    ["data_nascimento", "2021-05-15"],
    ["sexo", "Masculino"],
    ["data_inscricao", "01/01/2024 08:30"],
    ["data_retorno_fila", ""],
    ["programas_sociais", "Não"],
    ["aceita_qualquer_cmei", "Sim"],
    ["responsavel_nome", "Maria Silva"],
    ["responsavel_cpf", "52998224725"],
    ["responsavel_telefone", "(11) 3333-4444"],
    ["responsavel_celular", "(11) 98888-7777"],
    ["responsavel_email", "maria@email.com"],
    ["cpf_crianca", ""],
    ["certidao_nascimento", ""],
    ["cep", "00000000"],
    ["logradouro", "Rua das Flores"],
    ["numero", "123"],
    ["complemento", ""],
    ["bairro", "Centro"],
    ["cidade", ""],
    ["estado", ""],
    ["observacoes", ""],
    ["status", "Fila de Espera"],
    ["cmei1_preferencia", ""],
    ["cmei2_preferencia", ""],
    ["cmei3_preferencia", ""],
    ["cmei_atual_nome", ""],
    ["turma_atual_nome", ""],
  ]);

  const exemplo = headersFinal.map((h) => {
    const key = normalizarHeaderModelo(h);
    const base = exemploByKey.get(key);
    if (base !== undefined) return base;

    const campo = campoByKey.get(key);
    if (!campo?.tipo) return "";

    if (campo.obrigatorio) return gerarExemploPorTipo(campo);
    return "";
  });

  gerarModeloExcelComHeaders({
    headers: headersFinal,
    exemplo,
    nomeAba: "Modelo Crianças",
    nomeArquivo: `modelo_importacao_criancas_${format(new Date(), "yyyyMMdd")}.xlsx`,
    larguraColuna: 28,
  });
};

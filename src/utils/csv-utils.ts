import { format } from "date-fns";

// Gerar modelo CSV para importação
export const gerarModeloCSV = () => {
  const headers = [
    "nome",
    "data_nascimento (AAAA-MM-DD)",
    "sexo (M/F)",
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
    "posicao_fila",
    "convocacao_deadline (AAAA-MM-DD)",
    "data_penalidade (AAAA-MM-DD)"
  ];

  const exemplo = [
    "João da Silva",
    "2021-05-15",
    "Masculino",
    "Não",
    "Sim",
    "Maria Silva",
    "123.456.789-00",
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
    "",
    "",
    ""
  ];

  const csvContent = [headers.join(","), exemplo.join(",")].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `modelo_importacao_${format(new Date(), "yyyyMMdd")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Exportar dados atuais para CSV
export const exportarCriancasCSV = async (criancas: any[], unidadeSingular = "Unidade") => {
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
  ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","));

  const csvContent = [headers.join(","), ...rows].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `backup_criancas_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Parse CSV file
export const parseCSV = (text: string): string[][] => {
  const lines = text.split("\n");
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    row.push(current.trim());
    result.push(row);
  }

  return result;
};

// Export fila de espera
export const exportFilaEsperaCSV = (fila: any[], unidadeSingular = "Unidade") => {
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
  ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","));

  const csvContent = [headers.join(","), ...rows].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `fila_espera_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

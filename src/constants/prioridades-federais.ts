export type PrioridadeFederalGrupo = "economica" | "vulnerabilidade" | "familiar_territorial";

export type PrioridadeFederalSeed = {
  codigo: string;
  nome: string;
  descricao: string;
  lei: string;
  peso: number;
  cor: string;
  icone: string;
  exige_documento: boolean;
  documento_tipo_nome: string | null;
  documento_tipo_descricao: string | null;
  ordem: number;
  grupo: PrioridadeFederalGrupo;
};

export const PRIORIDADES_FEDERAIS_PADRAO: PrioridadeFederalSeed[] = [
  {
    codigo: "social",
    nome: "Transferência de renda (Bolsa Família / similares)",
    descricao:
      "Famílias beneficiárias de programas de transferência de renda. Lei nº 14.851/2024 (art. 3, § 3º e § 4º), em consonância com o PNE (Lei nº 13.005/2014 e Lei nº 14.934/2024).",
    lei: "Lei 14.851/2024",
    peso: 10,
    cor: "#ef4444",
    icone: "heart",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Transferência de renda",
    documento_tipo_descricao: "Extrato/declaração do benefício (ex.: Bolsa Família) ou comprovante equivalente.",
    ordem: 1,
    grupo: "economica",
  },
  {
    codigo: "monoparental",
    nome: "Família monoparental",
    descricao: "Famílias monoparentais (criança com apenas um responsável legal). Lei nº 14.851/2024 (art. 3, § 3º).",
    lei: "Lei 14.851/2024",
    peso: 10,
    cor: "#f59e0b",
    icone: "user",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Família monoparental",
    documento_tipo_descricao: "Documentos que comprovem guarda/responsabilidade legal e composição familiar.",
    ordem: 2,
    grupo: "familiar_territorial",
  },
  {
    codigo: "violencia_domestica",
    nome: "Medida protetiva (violência doméstica/familiar)",
    descricao:
      "Mães em medida de proteção por violência doméstica ou familiar. Lei nº 13.882/2019 (Lei Maria da Penha - Lei nº 11.340/2006).",
    lei: "Lei 13.882/2019",
    peso: 10,
    cor: "#db2777",
    icone: "shield",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Medida protetiva",
    documento_tipo_descricao: "Decisão/medida protetiva, boletim de ocorrência, ou documento oficial equivalente.",
    ordem: 3,
    grupo: "vulnerabilidade",
  },
  {
    codigo: "pne",
    nome: "Criança com deficiência",
    descricao:
      "Atendimento prioritário obrigatório. Lei nº 13.146/2015, Lei nº 13.257/2016 e metas do PNE (Lei nº 13.005/2014 e Lei nº 14.934/2024).",
    lei: "Lei 13.146/2015",
    peso: 10,
    cor: "#0ea5e9",
    icone: "accessibility",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Deficiência",
    documento_tipo_descricao: "Laudo/relatório médico (com CID quando aplicável) ou documento oficial equivalente.",
    ordem: 4,
    grupo: "vulnerabilidade",
  },
  {
    codigo: "medida_protecao",
    nome: "Criança em medida de proteção",
    descricao: "Acolhimento, violência intrafamiliar ou determinação judicial. Lei nº 14.344/2022 e ECA (Lei nº 8.069/1990).",
    lei: "Lei 14.344/2022",
    peso: 10,
    cor: "#7c3aed",
    icone: "scale",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Medida de proteção",
    documento_tipo_descricao: "Documento do Conselho Tutelar, decisão judicial, termo de acolhimento ou equivalente.",
    ordem: 5,
    grupo: "vulnerabilidade",
  },
  {
    codigo: "socioeducativa",
    nome: "Responsável adolescente em medida socioeducativa",
    descricao: "Filhos(as) de mãe/pai adolescente em cumprimento de medida socioeducativa. Lei nº 12.594/2012.",
    lei: "Lei 12.594/2012",
    peso: 10,
    cor: "#14b8a6",
    icone: "badge-check",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Medida socioeducativa",
    documento_tipo_descricao: "Declaração/documento oficial do órgão/serviço socioeducativo competente.",
    ordem: 6,
    grupo: "vulnerabilidade",
  },
  {
    codigo: "custodia_prisional",
    nome: "Mãe sob custódia prisional",
    descricao:
      "Filhos(as) de mães sob custódia prisional. Marco Legal da Primeira Infância (Lei nº 13.257/2016), atualizando art. 8º do ECA.",
    lei: "Lei 13.257/2016",
    peso: 10,
    cor: "#64748b",
    icone: "lock",
    exige_documento: true,
    documento_tipo_nome: "Comprovação - Custódia prisional",
    documento_tipo_descricao: "Declaração/documento oficial da unidade prisional ou equivalente.",
    ordem: 7,
    grupo: "vulnerabilidade",
  },
  {
    codigo: "irmao",
    nome: "Irmãos na mesma unidade escolar",
    descricao: "Irmãos na mesma unidade escolar. Lei nº 13.845/2019 (altera ECA, art. 53, inciso V).",
    lei: "Lei 13.845/2019",
    peso: 10,
    cor: "#22c55e",
    icone: "users",
    exige_documento: false,
    documento_tipo_nome: null,
    documento_tipo_descricao: null,
    ordem: 8,
    grupo: "familiar_territorial",
  },
];

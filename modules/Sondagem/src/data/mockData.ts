// @ts-nocheck
// ===== MOCK DATA =====

export interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  turma: string;
  cmei: string;
  status: "pendente" | "avaliado";
}

export interface NivelAprendizagem {
  id: string;
  codigo: string;
  descricao: string;
  ordem: number;
  tipo: "escrita" | "producao_texto";
  ativo: boolean;
}

export interface ModeloSondagem {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  criadoEm: string;
  niveis: NivelAprendizagem[];
}

export interface CMEI {
  id: string;
  nome: string;
}

export interface Turma {
  id: string;
  nome: string;
  cmeiId: string;
}

export interface ResultadoSondagemMock {
  alunoId: string;
  periodo: string;
  nivelEscritaCodigo: string;
  nivelProducaoCodigo: string;
  createdAt: string;
  observacoes?: string;
}

export interface MetaSondagemMock {
  periodoCodigo: string;
  tipo: "escrita" | "producao_texto";
  nivelCodigo: string;
}

export const MOCK_CMEI_IDS = {
  cantinhoFeliz: "00000000-0000-4000-8000-000000000101",
  mundoEncantado: "00000000-0000-4000-8000-000000000102",
  pequenosBrilhantes: "00000000-0000-4000-8000-000000000103",
} as const;

export const MOCK_TURMA_IDS = {
  primeiroAEscola1: "00000000-0000-4000-8000-000000000201",
  primeiroBEscola1: "00000000-0000-4000-8000-000000000202",
  segundoAEscola1: "00000000-0000-4000-8000-000000000203",
  primeiroAEscola2: "00000000-0000-4000-8000-000000000204",
  segundoAEscola2: "00000000-0000-4000-8000-000000000205",
  segundoBEscola3: "00000000-0000-4000-8000-000000000206",
} as const;

export const MOCK_ALUNO_IDS = {
  anaClara: "00000000-0000-4000-8000-000000000301",
  brunoHenrique: "00000000-0000-4000-8000-000000000302",
  camilaOliveira: "00000000-0000-4000-8000-000000000303",
  danielSantos: "00000000-0000-4000-8000-000000000304",
  eduardaLima: "00000000-0000-4000-8000-000000000305",
  felipeMartins: "00000000-0000-4000-8000-000000000306",
  gabrielaRocha: "00000000-0000-4000-8000-000000000307",
  henriqueAlmeida: "00000000-0000-4000-8000-000000000308",
  isabellaFerreira: "00000000-0000-4000-8000-000000000309",
  joaoPedro: "00000000-0000-4000-8000-000000000310",
} as const;

const mockAlunoIdSet = new Set<string>(Object.values(MOCK_ALUNO_IDS));

export function isMockAlunoId(id: string) {
  return mockAlunoIdSet.has(id);
}

export const cmeis: CMEI[] = [
  { id: MOCK_CMEI_IDS.cantinhoFeliz, nome: "Escola Municipal Cantinho Feliz" },
  { id: MOCK_CMEI_IDS.mundoEncantado, nome: "Escola Municipal Mundo Encantado" },
  { id: MOCK_CMEI_IDS.pequenosBrilhantes, nome: "Escola Municipal Pequenos Brilhantes" },
];

export const turmas: Turma[] = [
  { id: MOCK_TURMA_IDS.primeiroAEscola1, nome: "1o Ano - A", cmeiId: MOCK_CMEI_IDS.cantinhoFeliz },
  { id: MOCK_TURMA_IDS.primeiroBEscola1, nome: "1o Ano - B", cmeiId: MOCK_CMEI_IDS.cantinhoFeliz },
  { id: MOCK_TURMA_IDS.segundoAEscola1, nome: "2o Ano - A", cmeiId: MOCK_CMEI_IDS.cantinhoFeliz },
  { id: MOCK_TURMA_IDS.primeiroAEscola2, nome: "1o Ano - A", cmeiId: MOCK_CMEI_IDS.mundoEncantado },
  { id: MOCK_TURMA_IDS.segundoAEscola2, nome: "2o Ano - A", cmeiId: MOCK_CMEI_IDS.mundoEncantado },
  { id: MOCK_TURMA_IDS.segundoBEscola3, nome: "2o Ano - B", cmeiId: MOCK_CMEI_IDS.pequenosBrilhantes },
];

export const niveisEscrita: NivelAprendizagem[] = [
  { id: "ne-1", codigo: "PS", descricao: "Pré-silábico", ordem: 1, tipo: "escrita", ativo: true },
  { id: "ne-2", codigo: "SI", descricao: "Silábico sem valor sonoro", ordem: 2, tipo: "escrita", ativo: true },
  { id: "ne-3", codigo: "SCV", descricao: "Silábico com valor sonoro", ordem: 3, tipo: "escrita", ativo: true },
  { id: "ne-4", codigo: "SA", descricao: "Silábico-alfabético", ordem: 4, tipo: "escrita", ativo: true },
  { id: "ne-5", codigo: "A", descricao: "Alfabético", ordem: 5, tipo: "escrita", ativo: true },
];

export const niveisProducaoTexto: NivelAprendizagem[] = [
  { id: "np-1", codigo: "NP", descricao: "Não produz", ordem: 1, tipo: "producao_texto", ativo: true },
  { id: "np-2", codigo: "PA", descricao: "Produz com apoio", ordem: 2, tipo: "producao_texto", ativo: true },
  { id: "np-3", codigo: "PP", descricao: "Produz parcialmente", ordem: 3, tipo: "producao_texto", ativo: true },
  { id: "np-4", codigo: "PC", descricao: "Produz com autonomia", ordem: 4, tipo: "producao_texto", ativo: true },
];

export const alunos: Aluno[] = [
  { id: MOCK_ALUNO_IDS.anaClara, nome: "Ana Clara Silva", dataNascimento: "2019-03-15", turma: MOCK_TURMA_IDS.primeiroAEscola1, cmei: MOCK_CMEI_IDS.cantinhoFeliz, status: "avaliado" },
  { id: MOCK_ALUNO_IDS.brunoHenrique, nome: "Bruno Henrique Costa", dataNascimento: "2019-05-22", turma: MOCK_TURMA_IDS.primeiroAEscola1, cmei: MOCK_CMEI_IDS.cantinhoFeliz, status: "avaliado" },
  { id: MOCK_ALUNO_IDS.camilaOliveira, nome: "Camila Oliveira", dataNascimento: "2019-01-10", turma: MOCK_TURMA_IDS.primeiroAEscola1, cmei: MOCK_CMEI_IDS.cantinhoFeliz, status: "pendente" },
  { id: MOCK_ALUNO_IDS.danielSantos, nome: "Daniel Santos", dataNascimento: "2019-07-08", turma: MOCK_TURMA_IDS.primeiroBEscola1, cmei: MOCK_CMEI_IDS.cantinhoFeliz, status: "avaliado" },
  { id: MOCK_ALUNO_IDS.eduardaLima, nome: "Eduarda Lima", dataNascimento: "2018-11-30", turma: MOCK_TURMA_IDS.primeiroBEscola1, cmei: MOCK_CMEI_IDS.cantinhoFeliz, status: "avaliado" },
  { id: MOCK_ALUNO_IDS.felipeMartins, nome: "Felipe Martins", dataNascimento: "2018-09-14", turma: MOCK_TURMA_IDS.segundoAEscola1, cmei: MOCK_CMEI_IDS.cantinhoFeliz, status: "pendente" },
  { id: MOCK_ALUNO_IDS.gabrielaRocha, nome: "Gabriela Rocha", dataNascimento: "2019-02-28", turma: MOCK_TURMA_IDS.primeiroAEscola2, cmei: MOCK_CMEI_IDS.mundoEncantado, status: "avaliado" },
  { id: MOCK_ALUNO_IDS.henriqueAlmeida, nome: "Henrique Almeida", dataNascimento: "2018-12-05", turma: MOCK_TURMA_IDS.segundoAEscola2, cmei: MOCK_CMEI_IDS.mundoEncantado, status: "avaliado" },
  { id: MOCK_ALUNO_IDS.isabellaFerreira, nome: "Isabella Ferreira", dataNascimento: "2018-08-20", turma: MOCK_TURMA_IDS.segundoBEscola3, cmei: MOCK_CMEI_IDS.pequenosBrilhantes, status: "pendente" },
  { id: MOCK_ALUNO_IDS.joaoPedro, nome: "Joao Pedro Souza", dataNascimento: "2018-06-17", turma: MOCK_TURMA_IDS.segundoBEscola3, cmei: MOCK_CMEI_IDS.pequenosBrilhantes, status: "avaliado" },
];

export const modelosSondagem: ModeloSondagem[] = [
  {
    id: "modelo-1",
    nome: "Sondagem de Escrita - Infantil 5",
    descricao: "Modelo padrão para avaliação de escrita em turmas do Infantil 5, contemplando níveis de hipótese de escrita.",
    ativo: true,
    criadoEm: "2025-02-01",
    niveis: [...niveisEscrita, ...niveisProducaoTexto],
  },
  {
    id: "modelo-2",
    nome: "Sondagem de Escrita - Infantil 4",
    descricao: "Modelo simplificado para turmas do Infantil 4, com foco na identificação inicial de hipóteses de escrita.",
    ativo: true,
    criadoEm: "2025-02-10",
    niveis: niveisEscrita,
  },
  {
    id: "modelo-3",
    nome: "Avaliação Diagnóstica Completa",
    descricao: "Modelo completo para diagnóstico inicial e final do ano letivo.",
    ativo: false,
    criadoEm: "2025-01-15",
    niveis: [...niveisEscrita, ...niveisProducaoTexto],
  },
];

export const periodos = [
  { id: "2026-1", nome: "2026 - 1o Semestre" },
  { id: "2026-2", nome: "2026 - 2o Semestre" },
  { id: "2027-1", nome: "2027 - 1o Semestre" },
];

export const resultadosSondagemMock: ResultadoSondagemMock[] = [
  {
    alunoId: MOCK_ALUNO_IDS.anaClara,
    periodo: "2026-1",
    nivelEscritaCodigo: "SA",
    nivelProducaoCodigo: "PP",
    createdAt: "2026-03-10T10:00:00.000Z",
    observacoes: "Avanco consistente no reconhecimento fonemico.",
  },
  {
    alunoId: MOCK_ALUNO_IDS.brunoHenrique,
    periodo: "2026-1",
    nivelEscritaCodigo: "A",
    nivelProducaoCodigo: "PC",
    createdAt: "2026-03-12T08:30:00.000Z",
    observacoes: "Leitura e escrita com autonomia.",
  },
  {
    alunoId: MOCK_ALUNO_IDS.danielSantos,
    periodo: "2026-1",
    nivelEscritaCodigo: "SCV",
    nivelProducaoCodigo: "PA",
    createdAt: "2026-03-15T14:10:00.000Z",
    observacoes: "Ainda precisa de apoio para segmentacao.",
  },
  {
    alunoId: MOCK_ALUNO_IDS.eduardaLima,
    periodo: "2026-1",
    nivelEscritaCodigo: "A",
    nivelProducaoCodigo: "PC",
    createdAt: "2026-03-18T09:45:00.000Z",
    observacoes: "Bom desempenho geral.",
  },
  {
    alunoId: MOCK_ALUNO_IDS.gabrielaRocha,
    periodo: "2026-1",
    nivelEscritaCodigo: "SA",
    nivelProducaoCodigo: "PP",
    createdAt: "2026-03-20T13:20:00.000Z",
    observacoes: "Produz frases simples com apoio pontual.",
  },
  {
    alunoId: MOCK_ALUNO_IDS.henriqueAlmeida,
    periodo: "2026-1",
    nivelEscritaCodigo: "SCV",
    nivelProducaoCodigo: "PA",
    createdAt: "2026-03-21T15:00:00.000Z",
    observacoes: "Em consolidacao de correspondencia fonema-grafema.",
  },
  {
    alunoId: MOCK_ALUNO_IDS.joaoPedro,
    periodo: "2026-1",
    nivelEscritaCodigo: "SI",
    nivelProducaoCodigo: "NP",
    createdAt: "2026-03-25T11:40:00.000Z",
    observacoes: "Necessita intervencoes frequentes.",
  },
];

export const metasSondagemMock: MetaSondagemMock[] = [
  { periodoCodigo: "2026-1", tipo: "escrita", nivelCodigo: "SA" },
  { periodoCodigo: "2026-1", tipo: "producao_texto", nivelCodigo: "PP" },
];

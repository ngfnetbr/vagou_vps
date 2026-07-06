export type TextFieldAnchor = {
  key: string;
  label: string;
  page: number;
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  boxHeight?: number;
};

export type CheckboxAnchor = {
  key: string;
  label: string;
  page: number;
  x: number;
  y: number;
};

export type RequerimentoSereTemplateConfig = {
  version: 1 | 2;
  templateUrl: string;
  textColor: string;
  xColor: string;
  textFields: TextFieldAnchor[];
  checkboxes: CheckboxAnchor[];
};

export const TEMPLATE_URL_DEFAULT = "/templates/SERE.pdf";

const DEFAULT_CONFIG: RequerimentoSereTemplateConfig = {
  xColor: "#fb1313",
  version: 1,
  textColor: "#ff0000",
  checkboxes: [
    { x: 530.3703701134883, y: 678.653194543087, key: "sexo_m", page: 1, label: "Sexo: M" },
    { x: 553.9643388913, y: 679.2866949387537, key: "sexo_f", page: 1, label: "Sexo: F" },
    { x: 278.0246911011427, y: 684.3097653372921, key: "cor_auto_amarela", page: 1, label: "Cor/raça autodeclarada: Amarela" },
    { x: 324.9931410801263, y: 684.2249665436921, key: "cor_auto_branca", page: 1, label: "Cor/raça autodeclarada: Branca" },
    { x: 360.54869663568184, y: 683.7311393831982, key: "cor_auto_indigena", page: 1, label: "Cor/raça autodeclarada: Indígena" },
    { x: 405.98079540111394, y: 684.7187937041858, key: "cor_auto_parda", page: 1, label: "Cor/raça autodeclarada: Parda" },
    { x: 293.8820299690152, y: 674.8422504943093, key: "cor_auto_preta", page: 1, label: "Cor/raça autodeclarada: Preta" },
    { x: 364.9931410801263, y: 675.3360776548031, key: "cor_auto_nao_declarada", page: 1, label: "Cor/raça autodeclarada: Não declarada" },
    { x: 445.81619074315194, y: 601.2071322217398, key: "cor_cert_amarela", page: 1, label: "Cor/raça na certidão: Amarela" },
    { x: 497.17421543450996, y: 601.2071322217398, key: "cor_cert_branca", page: 1, label: "Cor/raça na certidão: Branca" },
    { x: 445.3223635826581, y: 592.318243332851, key: "cor_cert_indigena", page: 1, label: "Cor/raça na certidão: Indígena" },
    { x: 498.6556969159914, y: 591.8244161723571, key: "cor_cert_parda", page: 1, label: "Cor/raça na certidão: Parda" },
    { x: 445.3223635826581, y: 582.4417001229745, key: "cor_cert_preta", page: 1, label: "Cor/raça na certidão: Preta" },
    { x: 498.1618697554976, y: 582.9355272834682, key: "cor_cert_nao_declarada", page: 1, label: "Cor/raça na certidão: Não declarada" },
    { x: 84.00548675913868, y: 657.0644727165316, key: "etnia_guarani", page: 1, label: "Etnia indígena: Guarani" },
    { x: 125.98079540111398, y: 657.0644727165316, key: "etnia_kaingang", page: 1, label: "Etnia indígena: Kaingang" },
    { x: 173.38820280852138, y: 657.0644727165316, key: "etnia_xeta", page: 1, label: "Etnia indígena: Xetá" },
    { x: 205.98079540111397, y: 657.0644727165316, key: "etnia_xokleng", page: 1, label: "Etnia indígena: Xokleng" },
    { x: 249.43758552457075, y: 657.0096013575424, key: "etnia_outra", page: 1, label: "Etnia indígena: Outra" },
    { x: 439.890264817226, y: 657.0096013575424, key: "quilombo_nao", page: 1, label: "Remanescente de Quilombo: Não" },
    { x: 468.532240125868, y: 657.0096013575424, key: "quilombo_sim", page: 1, label: "Remanescente de Quilombo: Sim" },
    { x: 274.6227707097559, y: 522.0850475923514, key: "nacionalidade_brasileira", page: 1, label: "Nacionalidade: Brasileira" },
    { x: 274.6227707097559, y: 512.2085043824749, key: "nacionalidade_brasileira_naturalizado", page: 1, label: "Nacionalidade: Brasileira (exterior/naturalizado)" },
    { x: 274.1289435492621, y: 504.3072698145736, key: "nacionalidade_estrangeira", page: 1, label: "Nacionalidade: Estrangeira" },
    { x: 538.6556969159914, y: 516.6529488269193, key: "estrangeiro_docs_nao", page: 1, label: "Estrangeiro possui documentos: Não" },
    { x: 539.6433512369791, y: 507.27023277753653, key: "estrangeiro_docs_sim", page: 1, label: "Estrangeiro possui documentos: Sim" },
    { x: 446.31001790364576, y: 431.65980963059405, key: "vacina_nao", page: 1, label: "Declaração de vacina: Não" },
    { x: 405.3223635826581, y: 432.1536367910879, key: "vacina_sim", page: 1, label: "Declaração de vacina: Sim" },
    { x: 259.64335123697913, y: 432.04389407310947, key: "programa_bolsa_familia", page: 1, label: "Programas sociais: Bolsa Família" },
    { x: 323.3470549406828, y: 432.04389407310947, key: "programa_pe_de_meia", page: 1, label: "Programas sociais: Pé-de-Meia" },
    { x: 130.42523984555842, y: 231.22085382908946, key: "doc_comprovante_residencia", page: 2, label: "Doc entregue: Comprovante de residência" },
    { x: 224.7462274998794, y: 231.7146809895833, key: "doc_cpf_estudante", page: 2, label: "Doc entregue: CPF do estudante" },
    { x: 29.190671944323878, y: 220.35665629822526, key: "doc_certidao_nascimento", page: 2, label: "Doc entregue: Certidão de nascimento" },
    { x: 129.9314126850646, y: 220.35665629822526, key: "doc_vacinacao", page: 2, label: "Doc entregue: Comprovante de vacinação" },
    {
      x: 94.89144292371027,
      y: 385.7598973416735,
      key: "forma_ocupacao_moradia__optou_nao_informar",
      page: 2,
      label: "Forma de ocupação da moradia: Optou em não informar",
    },
    { x: 196.61558085474476, y: 385.1213301735363, key: "forma_ocupacao_moradia__propria", page: 2, label: "Forma de ocupação da moradia: Própria" },
    { x: 242.0178797053195, y: 385.6960428172145, key: "forma_ocupacao_moradia__alugada", page: 2, label: "Forma de ocupação da moradia: Alugada" },
    { x: 289.7190291306068, y: 385.1213301735363, key: "forma_ocupacao_moradia__cedida", page: 2, label: "Forma de ocupação da moradia: Cedida" },
    { x: 120.17879924554936, y: 374.77650258732945, key: "forma_ocupacao_moradia__pensionato", page: 2, label: "Forma de ocupação da moradia: Pensionato" },
    {
      x: 186.27075326853787,
      y: 374.77650258732945,
      key: "forma_ocupacao_moradia__casa_lar_abrigo",
      page: 2,
      label: "Forma de ocupação da moradia: Casa lar ou abrigo",
    },
    { x: 270.7535118892275, y: 374.77650258732945, key: "forma_ocupacao_moradia__outro", page: 2, label: "Forma de ocupação da moradia: Outro" },
    { x: 0, y: 0, key: "povos_comunidades_tradicionais__nao", page: 1, label: "Pertencente a povos e comunidades tradicionais: Não" },
    { x: 0, y: 0, key: "povos_comunidades_tradicionais__sim", page: 1, label: "Pertencente a povos e comunidades tradicionais: Sim" },
  ],
  textFields: [
    { x: 121.52536501567398, y: 718.1242424242425, key: "nome", page: 1, label: "Nome (certidão)", fontSize: 9, maxWidth: 447.979797979798, boxHeight: 11 },
    { x: 23.24219151515153, y: 605.5824242424244, key: "data_nascimento", page: 1, label: "Data de nascimento", fontSize: 9, maxWidth: 99.7979797979798, boxHeight: 11 },
    { x: 439.8693793939394, y: 475.10636363636365, key: "cpf_crianca", page: 1, label: "CPF do estudante", fontSize: 9, maxWidth: 130.9090909090909, boxHeight: 11 },
    { x: 123.78056484848484, y: 423.36212121212117, key: "nis", page: 1, label: "NIS", fontSize: 9, maxWidth: 118.18181818181817, boxHeight: 11 },
    { x: 22.757536969696986, y: 359.6645454545454, key: "logradouro", page: 1, label: "Logradouro", fontSize: 8, maxWidth: 415.1515151515151, boxHeight: 10 },
    { x: 439.61436848484846, y: 359.6645454545454, key: "numero", page: 1, label: "Número", fontSize: 8, maxWidth: 48.484848484848484, boxHeight: 10 },
    { x: 488.1565090909091, y: 359.6645454545454, key: "complemento", page: 1, label: "Complemento", fontSize: 8, maxWidth: 82.42424242424242, boxHeight: 10 },
    { x: 22.445013333333343, y: 340.9748484848485, key: "bairro", page: 1, label: "Bairro", fontSize: 8, maxWidth: 218.18181818181816, boxHeight: 10 },
    { x: 243.0782836363636, y: 339.76272727272726, key: "cidade", page: 1, label: "Município", fontSize: 8, maxWidth: 327.8787878787879, boxHeight: 10 },
    { x: 24.2391393939394, y: 315.4742424242424, key: "cep", page: 1, label: "CEP", fontSize: 8, maxWidth: 98.78787878787878, boxHeight: 10 },
    { x: 123.26298303030305, y: 316.080303030303, key: "estado", page: 1, label: "UF", fontSize: 8, maxWidth: 44.54545454545454, boxHeight: 10 },
    { x: 439.9313721212121, y: 316.080303030303, key: "responsavel_telefone", page: 1, label: "Telefone residencial", fontSize: 8, maxWidth: 130.3030303030303, boxHeight: 10 },
    { x: 123.02622545454547, y: 287.1178787878788, key: "unidade_consumidora", page: 1, label: "Unidade consumidora", fontSize: 9, maxWidth: 92.72727272727272, boxHeight: 11 },
    { x: 508.8856557575757, y: 651.1775757575757, key: "quilombo_nome", page: 1, label: "Quilombo: qual?", fontSize: 6, maxWidth: 61.818181818181856, boxHeight: 8 },
    {
      x: 215.38417212121215,
      y: 631.1775757575757,
      key: "etnia_indigena_outra",
      page: 1,
      label: "Etnia indígena (outra): qual?",
      fontSize: 6,
      maxWidth: 124.84848484848487,
      boxHeight: 8,
    },
    { x: 300.6385693604919, y: 369.5402298850575, key: "forma_ocupacao_moradia_outro", page: 2, label: "Se outro, qual", fontSize: 6, maxWidth: 42.18390804597702, boxHeight: 8 },
    {
      x: 23.052362463940153,
      y: 103.38439941406251,
      key: "filiacao1_nome",
      page: 1,
      label: "Filiação 1: nome do pai/mãe",
      fontSize: 9,
      maxWidth: 374.36781609195407,
      boxHeight: 11,
    },
    { x: 398.33971878577927, y: 104.53382470141884, key: "filiacao1_rg", page: 1, label: "Filiação 1: RG/RNE/RME", fontSize: 9, maxWidth: 89.88505747126439, boxHeight: 11 },
    { x: 489.14431648692874, y: 104.53382470141884, key: "filiacao1_cpf", page: 1, label: "Filiação 1: CPF", fontSize: 9, maxWidth: 81.83908045977013, boxHeight: 11 },
    { x: 23.627075107618314, y: 83.26945688532687, key: "filiacao1_email", page: 1, label: "Filiação 1: e-mail", fontSize: 9, maxWidth: 264.5977011494253, boxHeight: 11 },
    { x: 290.86845441796316, y: 83.26945688532687, key: "filiacao1_celular", page: 1, label: "Filiação 1: celular/WhatsApp", fontSize: 9, maxWidth: 105.97701149425289, boxHeight: 11 },
    {
      x: 397.76500614210113,
      y: 82.69474424164872,
      key: "filiacao1_telefone_comercial",
      page: 1,
      label: "Filiação 1: telefone comercial",
      fontSize: 9,
      maxWidth: 107.70114942528737,
      boxHeight: 11,
    },
    { x: 24.201787751296475, y: 764.1762393644487, key: "filiacao2_nome", page: 2, label: "Filiação 2: nome do pai/mãe", fontSize: 9, maxWidth: 372.0689655172414, boxHeight: 11 },
    { x: 398.91443142945747, y: 763.6015267207706, key: "filiacao2_rg", page: 2, label: "Filiação 2: RG/RNE/RME", fontSize: 9, maxWidth: 88.73563218390807, boxHeight: 11 },
    { x: 489.14431648692874, y: 764.1762393644487, key: "filiacao2_cpf", page: 2, label: "Filiação 2: CPF", fontSize: 9, maxWidth: 82.41379310344828, boxHeight: 11 },
    { x: 23.627075107618314, y: 742.3371589046786, key: "filiacao2_email", page: 2, label: "Filiação 2: e-mail", fontSize: 9, maxWidth: 265.1724137931035, boxHeight: 11 },
    { x: 290.293741774285, y: 741.7624462610005, key: "filiacao2_celular", page: 2, label: "Filiação 2: celular/WhatsApp", fontSize: 9, maxWidth: 107.12643678160921, boxHeight: 11 },
    {
      x: 397.76500614210113,
      y: 741.7624462610005,
      key: "filiacao2_telefone_comercial",
      page: 2,
      label: "Filiação 2: telefone comercial",
      fontSize: 9,
      maxWidth: 108.85057471264369,
      boxHeight: 11,
    },
    { x: 0, y: 0, key: "povos_comunidades_tradicionais_qual", page: 1, label: "Povos e comunidades tradicionais: qual?", fontSize: 8, maxWidth: 200, boxHeight: 10 },
  ],
  templateUrl: "/templates/SERE.pdf",
};

export const getDefaultRequerimentoSereTemplateConfig = (): RequerimentoSereTemplateConfig => ({
  ...DEFAULT_CONFIG,
  version: 2,
  textFields: DEFAULT_CONFIG.textFields.map((f) => ({
    ...f,
    boxHeight: Number(f.boxHeight || 0) || Math.max(8, f.fontSize * 1.4),
    y: Number(f.y || 0) + Number(f.fontSize || 9) * 0.35,
  })),
  checkboxes: DEFAULT_CONFIG.checkboxes.map((c) => ({ ...c })),
});

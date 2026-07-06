export const formatSimNao = (value: boolean | null | undefined) => (value ? "Sim" : "Não");

export const labelCorRaca = (value?: string | null) => {
  if (!value) return "";
  const map: Record<string, string> = {
    amarela: "Amarela",
    branca: "Branca",
    indigena: "Indígena",
    parda: "Parda",
    preta: "Preta",
    nao_declarada: "Não declarada",
  };
  return map[value] || value;
};

export const labelEtniaIndigena = (value?: string | null, outra?: string | null) => {
  if (!value) return "";
  const map: Record<string, string> = {
    guarani: "Guarani",
    kaingang: "Kaingang",
    xeta: "Xetá",
    xokleng: "Xokleng",
    outra: "Outra",
  };
  if (value === "outra") {
    return outra?.trim() ? `Outra: ${outra.trim()}` : "Outra";
  }
  return map[value] || value;
};

export const labelNacionalidade = (value?: string | null) => {
  if (!value) return "";
  const map: Record<string, string> = {
    brasileira: "Brasileira",
    brasileira_naturalizado: "Brasileira – nascido no exterior ou naturalizado",
    estrangeira: "Estrangeira",
  };
  return map[value] || value;
};

export const labelFormaMoradia = (value?: string | null, outro?: string | null) => {
  if (!value) return "";
  const map: Record<string, string> = {
    optou_nao_informar: "Optou em não informar",
    propria: "Própria",
    alugada: "Alugada",
    cedida: "Cedida",
    pensionato: "Pensionato",
    casa_lar_abrigo: "Casa lar ou abrigo",
    outro: "Outro",
  };
  if (value === "outro") {
    return outro?.trim() ? `Outro: ${outro.trim()}` : "Outro";
  }
  return map[value] || value;
};

export const labelParentesco = (value?: string | null, outro?: string | null) => {
  if (!value) return "";
  const map: Record<string, string> = {
    pai: "Pai",
    mae: "Mãe",
    avo: "Avô",
    avoa: "Avó",
    tio: "Tio",
    tia: "Tia",
    padrasto: "Padrasto",
    madrasta: "Madrasta",
    irmao: "Irmão",
    irma: "Irmã",
    tutor_legal: "Tutor legal",
    guardiao: "Guardião",
    outro: "Outro",
  };
  if (value === "outro") {
    return outro?.trim() ? `Outro: ${outro.trim()}` : "Outro";
  }
  return map[value] || value;
};

export const labelCanalNotificacao = (value?: string | null) => {
  if (!value) return "";
  const map: Record<string, string> = {
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "E-mail",
  };
  return map[value] || value;
};

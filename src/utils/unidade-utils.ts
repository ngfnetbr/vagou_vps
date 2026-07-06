export type UnidadeNomenclaturaConfig = {
  unidade_singular?: string | null;
  unidade_plural?: string | null;
};

export const getUnidadeLabels = (config?: UnidadeNomenclaturaConfig) => {
  const singular = (config?.unidade_singular || "").trim() || "CMEI";
  const pluralRaw = (config?.unidade_plural || "").trim();
  const plural = pluralRaw || (singular === "CMEI" ? "CMEIs" : `${singular}s`);
  return { singular, plural };
};

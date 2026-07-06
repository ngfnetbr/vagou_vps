
// Mock das funções de data para o teste funcionar fora do ambiente TS/Vite completo
const dateFns = {
  differenceInYears: (d1, d2) => {
    const y1 = d1.getFullYear();
    const y2 = d2.getFullYear();
    let diff = y1 - y2;
    const m1 = d1.getMonth();
    const m2 = d2.getMonth();
    if (m1 < m2 || (m1 === m2 && d1.getDate() < d2.getDate())) {
      diff--;
    }
    return diff;
  },
  differenceInMonths: (d1, d2) => {
    let months = (d1.getFullYear() - d2.getFullYear()) * 12;
    months -= d2.getMonth();
    months += d1.getMonth();
    return months <= 0 ? 0 : months;
  }
};

const CONFIG_TESTE = {
  data_corte_mes: 3,
  data_corte_dia: 31,
  idade_minima_meses: 6,
  idade_maxima_anos: 5,
};

function testarLogica(dataNascimentoStr, config, dataReferenciaStr) {
  const nasc = new Date(dataNascimentoStr);
  const hoje = dataReferenciaStr ? new Date(dataReferenciaStr) : new Date(); // Simulando "hoje"
  const anoAlvo = hoje.getFullYear();
  
  const { data_corte_mes, data_corte_dia, idade_minima_meses, idade_maxima_anos } = config;
  const dataCorte = new Date(anoAlvo, data_corte_mes - 1, data_corte_dia);
  
  const idadeMesesHoje = dateFns.differenceInMonths(hoje, nasc);
  const idadeNaCorte = dateFns.differenceInYears(dataCorte, nasc);
  
  console.log(`\nTeste: Nasc=${dataNascimentoStr}, Hoje=${hoje.toISOString().split('T')[0]}, IdadeCorte=${idadeNaCorte}, IdadeMeses=${idadeMesesHoje}`);

  if (idadeMesesHoje < idade_minima_meses) {
    return `Aguardando completar ${idade_minima_meses} meses`;
  }
  
  if (nasc > dataCorte) {
    return "Infantil 0";
  }

  if (idadeNaCorte > idade_maxima_anos) {
    return "Fora da faixa etária";
  }

  // Mapeamento direto de idade para turma
  if (idadeNaCorte >= 0 && idadeNaCorte <= idade_maxima_anos) {
    return `Infantil ${idadeNaCorte}`;
  }
  
  return "Fora da faixa etária";
}

// Casos de teste
const hojeSimulado = "2025-01-15";

const casos = [
  { nasc: "2024-10-01", esperado: "Aguardando completar 6 meses" }, // < 6 meses em jan/25
  { nasc: "2024-05-01", esperado: "Infantil 0" }, // < 1 ano na corte (31/03/25) -> 0 anos. Nasceu depois de 31/03/24? Sim.
  { nasc: "2023-05-01", esperado: "Infantil 1" }, // Faz 2 anos em maio/25. Em 31/03/25 tem 1 ano.
  { nasc: "2022-03-30", esperado: "Infantil 3" }, // Faz 3 anos em 30/03/25. Em 31/03/25 tem 3 anos.
  { nasc: "2022-04-01", esperado: "Infantil 2" }, // Faz 3 anos em 01/04/25. Em 31/03/25 tem 2 anos.
  { nasc: "2019-03-31", esperado: "Fora da faixa etária" }, // Faz 6 anos em 31/03/25. Tem 6 anos na corte.

];

console.log("=== Verificando Lógica de Enturmação ===");

let passouTodos = true;

casos.forEach(caso => {
  const resultado = testarLogica(caso.nasc, CONFIG_TESTE, hojeSimulado);
  const passou = resultado === caso.esperado;
  
  console.log(`[${passou ? 'OK' : 'FALHA'}] Nasc: ${caso.nasc} -> Esperado: ${caso.esperado} | Obtido: ${resultado}`);
  
  if (!passou) passouTodos = false;
});

// Teste com config alterada (Idade Max 6)
console.log("\n=== Testando Configuração Alterada (Max 6 anos) ===");
const CONFIG_MAX_6 = { ...CONFIG_TESTE, idade_maxima_anos: 6 };
const caso6anos = { nasc: "2019-03-31", esperado: "Infantil 6" }; 

const res6anos = testarLogica(caso6anos.nasc, CONFIG_MAX_6, hojeSimulado);
console.log(`[${res6anos === caso6anos.esperado ? 'OK' : 'FALHA'}] Nasc: ${caso6anos.nasc} (Max=6) -> Esperado: ${caso6anos.esperado} | Obtido: ${res6anos}`);

console.log("Verificação concluída.");

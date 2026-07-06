const fs = require('fs');

const data = JSON.parse(fs.readFileSync('c:/Users/User/Desktop/backup 00h42 21-03Vagou/backup_criancas_20260326_091256.json', 'utf8'));

const cmeiMap = {
  'cmei joão trizzi': '87b68ce1-6413-451a-9063-3fa57ff90dfc',
  'cmei anjo da guarda': 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc'
};

const turmaMap = {
  '87b68ce1-6413-451a-9063-3fa57ff90dfc-infantil 4 a': '17d78fad-4e4f-430f-8d81-00c7697c340e',
  '87b68ce1-6413-451a-9063-3fa57ff90dfc-infantil 4 b': 'f52b777c-54d5-412c-a5f9-96cc75056fc9',
  '87b68ce1-6413-451a-9063-3fa57ff90dfc-infantil 5 a': '8b96aca8-81a5-4584-9d29-224be76ed317',
  '87b68ce1-6413-451a-9063-3fa57ff90dfc-infantil 5 b': '40966442-9f3a-42b3-8583-33f664c23097',
  '87b68ce1-6413-451a-9063-3fa57ff90dfc-infantil 4 c': '326e0611-e52a-441b-80bb-a3b81a95815f',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 3 a': 'd82b891d-987d-4f7e-91f3-50fd90cf0efe',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 3 b': '4f694529-0865-4323-b538-ecb1e3f71d7c',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 0 a': '0ce21047-e12b-4370-b81d-30b31206f7b5',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 1 a': '0aeaa8f3-3af5-4e56-894c-cd99a5768a4f',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 1 b': 'a0eb1515-3850-47db-8eb9-5a49c496d936',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 2 a': 'c9cc157d-ed70-4e97-8698-a8bb6687616a',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 2 b': 'a251d735-3631-46b3-b022-a912d4fe9edb',
  'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc-infantil 2 c': 'dc5973de-4e87-4c63-8099-7cad4902f112'
};

const statusMap = {
  'matriculado': 'Matriculado',
  'matriculada': 'Matriculada',
  'fila de espera': 'Fila de Espera',
  'convocado': 'Convocado',
  'desistente': 'Desistente',
  'recusada': 'Recusada',
  'concluinte': 'Concluinte'
};

const sexoMap = {
  'masculino': 'Masculino',
  'feminino': 'Feminino'
};

function cleanCPF(cpf) {
  return cpf?.toString().replace(/\D/g, '') || '';
}

function parseBoolean(val) {
  const v = val?.toString().toLowerCase().trim();
  return ['sim', 'yes', 's', 'true', '1', 'x'].includes(v);
}

const sqlInserts = [];
const batchSize = 20;

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const cmei1Id = cmeiMap[row['CMEI 1 Preferência']?.toLowerCase()] || null;
  const cmei2Id = cmeiMap[row['CMEI 2 Preferência']?.toLowerCase()] || null;
  const cmeiAtualId = cmeiMap[row['CMEI Atual']?.toLowerCase()] || null;
  
  let turmaAtualId = null;
  if (cmeiAtualId && row['Turma Atual']) {
    turmaAtualId = turmaMap[`${cmeiAtualId}-${row['Turma Atual']?.toLowerCase()}`] || null;
  }

  const sexo = sexoMap[row['Sexo']?.toLowerCase()] || 'Masculino';
  const status = statusMap[row['Status']?.toLowerCase()] || 'Fila de Espera';
  const prioridade = parseBoolean(row['Programas Sociais']) ? 'Social' : 'Geral';

  const values = [
    `'${row['Nome']?.replace(/'/g, "''")}'`,
    `'${row['Data Nascimento']}'`,
    `'${sexo}'`,
    row['Responsável Nome'] ? `'${row['Responsável Nome']?.replace(/'/g, "''")}'` : 'NULL',
    `'${cleanCPF(row['Responsável CPF'])}'`,
    row['Responsável Telefone'] ? `'${row['Responsável Telefone']}'` : 'NULL',
    row['Responsável Celular'] ? `'${row['Responsável Celular']}'` : 'NULL',
    row['Responsável Email'] ? `'${row['Responsável Email']}'` : 'NULL',
    `'${status}'`,
    `'${prioridade}'`,
    parseBoolean(row['Programas Sociais']),
    parseBoolean(row['Aceita Qualquer CMEI']),
    cmei1Id ? `'${cmei1Id}'` : 'NULL',
    cmei2Id ? `'${cmei2Id}'` : 'NULL',
    cmeiAtualId ? `'${cmeiAtualId}'` : 'NULL',
    turmaAtualId ? `'${turmaAtualId}'` : 'NULL',
    row['Observações'] ? `'${row['Observações']?.replace(/'/g, "''")}'` : 'NULL'
  ];

  sqlInserts.push(`(${values.join(', ')})`);
}

const chunks = [];
for (let i = 0; i < sqlInserts.length; i += batchSize) {
  const chunk = sqlInserts.slice(i, i + batchSize);
  const sql = `INSERT INTO public.criancas (
    nome, data_nascimento, sexo, responsavel_nome, responsavel_cpf, 
    responsavel_telefone, responsavel_celular, responsavel_email, 
    status, prioridade, programas_sociais, aceita_qualquer_cmei, 
    cmei1_preferencia, cmei2_preferencia, cmei_atual_id, turma_atual_id, 
    observacoes
  ) VALUES \n${chunk.join(',\n')};`;
  chunks.push(sql);
}

fs.writeFileSync('c:/Users/User/Desktop/backup 00h42 21-03Vagou/import_batches.json', JSON.stringify(chunks, null, 2));
console.log(`Generated ${chunks.length} batches for import`);


import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no arquivo .env");
  process.exit(1);
}

console.log("URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DADOS = [
  {
    "nome": "Infantil 4 - A",
    "turma_base": "Infantil 4",
    "turno": "Manhã",
    "cmei": "CMEI João Trizzi",
    "alunos": [
      {
        "nome": "Antonella Maitê dos Santos Botelho",
        "data_nascimento": "09/02/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99104-7324"
      },
      {
        "nome": "Betina Moreira Bintercourt",
        "data_nascimento": "08/09/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99127-0863"
      },
      {
        "nome": "Bianca Arissa Ito",
        "data_nascimento": "07/05/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99977-1337"
      },
      {
        "nome": "Brayan Oliveira Cardoso",
        "data_nascimento": "01/05/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99180-0725"
      },
      {
        "nome": "Emilly Vitoria dos Santos Souza",
        "data_nascimento": "20/08/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99178-8447"
      },
      {
        "nome": "Gael Gonçalves Ronchi de Araujo",
        "data_nascimento": "26/02/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99759-6660"
      },
      {
        "nome": "Helena da Silva Aguiar",
        "data_nascimento": "01/02/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99137-9510"
      },
      {
        "nome": "Isabela Cecote Bonfim",
        "data_nascimento": "26/01/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99113-1783"
      },
      {
        "nome": "Kalleo Ravi Rodrigues de Oliveira",
        "data_nascimento": "07/05/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99121-3282"
      },
      {
        "nome": "Maria Cecília Soares Gutierres Nascinbene",
        "data_nascimento": "20/10/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99136-6523"
      },
      {
        "nome": "Maria Eduarda da Silva Manzale",
        "data_nascimento": "26/05/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99163-0421"
      },
      {
        "nome": "Maria Eduarda Mercati",
        "data_nascimento": "26/05/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99148-2861"
      },
      {
        "nome": "Maria Emanuelly Rodrigues da Silva",
        "data_nascimento": "07/04/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99175-2368"
      },
      {
        "nome": "Miguel Rodrigues Vicente Machado",
        "data_nascimento": "02/09/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99143-8283"
      },
      {
        "nome": "Olívia Nunes Carvalho",
        "data_nascimento": "23/03/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99116-5714"
      },
      {
        "nome": "Raul Feliciano Siqueira Campos",
        "data_nascimento": "20/08/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99157-0244"
      },
      {
        "nome": "Matteo da Costa Silva",
        "data_nascimento": "30/06/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99102-0133"
      },
      {
        "nome": "Carlos Junio Silva Martins",
        "data_nascimento": "19/05/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(31)99064-7361"
      },
      {
        "nome": "Leiker David Gonzalez Hidalgo",
        "data_nascimento": "24/05/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(42)99842-7729"
      }
    ]
  },
  {
    "nome": "Infantil 4 - B",
    "turma_base": "Infantil 4",
    "turno": "Tarde",
    "cmei": "CMEI João Trizzi",
    "alunos": [
      {
        "nome": "Allanna Manuella de Oliveira",
        "data_nascimento": "24/12/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(14)99105-6597"
      },
      {
        "nome": "Ana Clara dos Santos Zampolo",
        "data_nascimento": "27/12/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99718-5628"
      },
      {
        "nome": "Arthur dos Santos Ramos",
        "data_nascimento": "05/11/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99146-7138"
      },
      {
        "nome": "Arthur Rafael de Souza Lopes",
        "data_nascimento": "06/01/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99111-7690"
      },
      {
        "nome": "Benjamin Aragão Mariquito Moreira",
        "data_nascimento": "30/09/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(43)99101-4973"
      },
      {
        "nome": "Emilly Sophia dos Santos Bueno",
        "data_nascimento": "23/03/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99183-3099"
      },
      {
        "nome": "Erick Vinicius Oliveira Santana",
        "data_nascimento": "04/08/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99169-0629"
      },
      {
        "nome": "Helena Gonçalves de França",
        "data_nascimento": "03/01/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99930-4178"
      },
      {
        "nome": "Heytor Batista de Oliveira",
        "data_nascimento": "16/02/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99174-6194"
      },
      {
        "nome": "Kemilly Vitória Moreira Rocha",
        "data_nascimento": "23/02/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99893-5417"
      },
      {
        "nome": "Luana Aparecida Honorio Sebastião",
        "data_nascimento": "26/11/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99115-3470"
      },
      {
        "nome": "Lucas Pacheco",
        "data_nascimento": "21/01/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99143-8227"
      },
      {
        "nome": "Manuela Vitória da Costa Santos",
        "data_nascimento": "16/05/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99108-7147"
      },
      {
        "nome": "Miguel Assunção de Lima",
        "data_nascimento": "17/06/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99168-9358"
      },
      {
        "nome": "Miguel Felipe Weiss Aguiar",
        "data_nascimento": "30/07/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99117-1847"
      },
      {
        "nome": "Lucas Figueiredo",
        "data_nascimento": "22/06/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99141-0318"
      },
      {
        "nome": "Betina Moreira Bintercourt",
        "data_nascimento": "08/09/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99127-0863"
      },
      {
        "nome": "Maria Eduarda da Silva Manzale",
        "data_nascimento": "26/05/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99163-0421"
      },
      {
        "nome": "Thauany Vitória Ferreira de Oliveira",
        "data_nascimento": "08/04/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(67)99820-4567"
      }
    ]
  },
  {
    "nome": "Infantil 5 - A",
    "turma_base": "Infantil 5",
    "turno": "Manhã",
    "cmei": "CMEI João Trizzi",
    "alunos": [
      {
        "nome": "Alícia Manuela Valini dos Santos",
        "data_nascimento": "10/09/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99909-5451"
      },
      {
        "nome": "Arthur Neves da Silva",
        "data_nascimento": "09/07/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99176-3409"
      },
      {
        "nome": "Benício Ferreira de Souza",
        "data_nascimento": "22/03/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99117-4986"
      },
      {
        "nome": "Bernardo Tendulo",
        "data_nascimento": "08/07/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99179-1987"
      },
      {
        "nome": "Emanuel Fermino Ilário",
        "data_nascimento": "10/03/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99148-3470"
      },
      {
        "nome": "Emanuel Pereira da Silva Souza",
        "data_nascimento": "04/01/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99148-8453"
      },
      {
        "nome": "Guilherme Torres Ribeiro da Cruz",
        "data_nascimento": "08/01/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99136-3132"
      },
      {
        "nome": "Helena Souza Pasqualeto",
        "data_nascimento": "05/07/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)92002-5167"
      },
      {
        "nome": "Isabely Rodrigues Moreira",
        "data_nascimento": "19/11/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99166-2590"
      },
      {
        "nome": "Liz Benichio Martins de Lima",
        "data_nascimento": "27/01/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)92002-4763"
      },
      {
        "nome": "Lorenzo Ruiperes Marques de Jesus",
        "data_nascimento": "08/10/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99128-3102"
      },
      {
        "nome": "Miguel Garcia Xavier",
        "data_nascimento": "30/04/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99146-3878"
      },
      {
        "nome": "Pedro Henrique Borba da Costa",
        "data_nascimento": "12/08/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99132-8408"
      },
      {
        "nome": "Stella Lopes Moreira Francisco",
        "data_nascimento": "14/05/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99772-4809"
      }
    ]
  },
  {
    "nome": "Infantil 5 - B",
    "turma_base": "Infantil 5",
    "turno": "Tarde",
    "cmei": "CMEI João Trizzi",
    "alunos": [
      {
        "nome": "Anthony Ferreira Sales",
        "data_nascimento": "25/02/2020",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99183-2307"
      },
      {
        "nome": "Emily Mendonça da Silva",
        "data_nascimento": "10/01/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99129-9258"
      },
      {
        "nome": "Gabriel Junior Oliveira Tomaello",
        "data_nascimento": "30/07/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99103-3648"
      },
      {
        "nome": "Helena Costa Silva",
        "data_nascimento": "18/06/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99165-9645"
      },
      {
        "nome": "Henrique Martins Bonfim",
        "data_nascimento": "03/09/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99144-3757"
      },
      {
        "nome": "Jasmynie Vitória de Oliveira Lima",
        "data_nascimento": "05/01/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99158-2987"
      },
      {
        "nome": "Lara Helena de Souza Silva",
        "data_nascimento": "02/07/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99706-0002"
      },
      {
        "nome": "Lívia Pereira Cano",
        "data_nascimento": "24/07/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99169-2683"
      },
      {
        "nome": "Luiz Otávio dos Santos Ilário",
        "data_nascimento": "16/07/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99162-3950"
      },
      {
        "nome": "Mellyssa Maria Victória Alencar Reis de",
        "data_nascimento": "25/12/2019",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99155-1244"
      },
      {
        "nome": "Miguel Otávio Oliveira da Silva",
        "data_nascimento": "16/11/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99724-0767"
      },
      {
        "nome": "Samuel Henrique Silva Santos",
        "data_nascimento": "21/05/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99745-9595"
      },
      {
        "nome": "Miguel Santos Figueredo",
        "data_nascimento": "24/09/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99109-2990"
      },
      {
        "nome": "Matheus Gabriel Rubens Bersi Pacheco",
        "data_nascimento": "19/12/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(11)99925-2607"
      },
      {
        "nome": "Emanuele Vitória Ferreira de Souza",
        "data_nascimento": "26/02/2020",
        "sexo": "Feminino",
        "responsavel_telefone": "(43)99116-0094"
      },
      {
        "nome": "Miguel Otávio Oliveira da Silva",
        "data_nascimento": "16/11/2019",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99724-0767"
      }
    ]
  },
  {
    "nome": "Infantil 2 - A",
    "turma_base": "Infantil 2",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Aghata Sofia Dias Xavier",
        "data_nascimento": "27/03/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99722-1362"
      },
      {
        "nome": "Davi Secoti Furlan",
        "data_nascimento": "13/06/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99729-1458"
      },
      {
        "nome": "Felicity Miranda Apolinário",
        "data_nascimento": "04/05/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99183-0242"
      },
      {
        "nome": "Gabriel Morais Brigantini",
        "data_nascimento": "03/05/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99143-1023"
      },
      {
        "nome": "Heitor Pereira da Silva",
        "data_nascimento": "27/05/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(41)99946-9183"
      },
      {
        "nome": "Helena Celestino Fernandes",
        "data_nascimento": "07/02/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99723-7161"
      },
      {
        "nome": "Isabela dos Santos Correia",
        "data_nascimento": "13/03/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99148-9003"
      },
      {
        "nome": "Isis Helena Rodrigues Santos",
        "data_nascimento": "07/03/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99101-3063"
      },
      {
        "nome": "Isis Novais Ferreira",
        "data_nascimento": "03/01/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99136-7724"
      },
      {
        "nome": "Joaquim de Lima Rodrigues",
        "data_nascimento": "24/01/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99964-2491"
      },
      {
        "nome": "Maria Cecília Silva Lima",
        "data_nascimento": "26/03/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(11)98202-0131"
      },
      {
        "nome": "Mariana da Cruz Ribeiro",
        "data_nascimento": "05/06/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99123-6558"
      },
      {
        "nome": "Melyssa Azevedo Silva Siqueira",
        "data_nascimento": "03/01/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99173-1001"
      },
      {
        "nome": "Sofia Vilela Santos",
        "data_nascimento": "09/06/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99922-9765"
      },
      {
        "nome": "Yuri Rodrigues Viana",
        "data_nascimento": "17/05/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99136-2294"
      },
      {
        "nome": "Willian Neto de Oliveira Palaro",
        "data_nascimento": "17/01/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99103-3648"
      }
    ]
  },
  {
    "nome": "Infantil 2 - B",
    "turma_base": "Infantil 2",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Bernardo Pereira de Almeida",
        "data_nascimento": "20/09/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99108-3774"
      },
      {
        "nome": "Davi Bonfim Peres",
        "data_nascimento": "09/08/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99107-9236"
      },
      {
        "nome": "Elisa Murzin Bissoni",
        "data_nascimento": "29/11/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99161-1982"
      },
      {
        "nome": "Emanuelly Cardoso de Oliveira",
        "data_nascimento": "20/12/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99153-1847"
      },
      {
        "nome": "Gael dos Santos Maciel",
        "data_nascimento": "18/08/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99835-2293"
      },
      {
        "nome": "Gael Patrocinio da Silva",
        "data_nascimento": "11/10/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99708-5926"
      },
      {
        "nome": "Heloisa dos Santos Reis",
        "data_nascimento": "25/12/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99166-0569"
      },
      {
        "nome": "Lara Ayna Shiguihara dos Santos",
        "data_nascimento": "26/07/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99169-3088"
      },
      {
        "nome": "Louise Apolinario de Souza",
        "data_nascimento": "30/08/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99175-7670"
      },
      {
        "nome": "Maria Alice Gois Docine",
        "data_nascimento": "16/08/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99176-9155"
      },
      {
        "nome": "Miguel Barboza da Silva",
        "data_nascimento": "20/12/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99135-0206"
      },
      {
        "nome": "Sophia Pereira Lopes",
        "data_nascimento": "12/11/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99109-0533"
      },
      {
        "nome": "Emanuelly Zampolo Alves",
        "data_nascimento": "02/12/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99136-3920"
      },
      {
        "nome": "Hellena dos Santos Bueno",
        "data_nascimento": "06/02/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99181-0731"
      },
      {
        "nome": "Maria Luisa Tomioka Ferreira",
        "data_nascimento": "29/11/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99121-3636"
      },
      {
        "nome": "Alana Gabrielly Cruz Souza",
        "data_nascimento": "20/11/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(11)96824-8473"
      },
      {
        "nome": "Laura Batista de Oliveira",
        "data_nascimento": "04/07/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99803-0352"
      }
    ]
  },
  {
    "nome": "Infantil 2 - C",
    "turma_base": "Infantil 2",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Cecília Custodio Santos",
        "data_nascimento": "12/07/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99859-9660"
      },
      {
        "nome": "Clara Tietz Lucas",
        "data_nascimento": "12/07/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99125-3969"
      },
      {
        "nome": "Davi Lucas Inácio Zampolo",
        "data_nascimento": "06/03/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99117-7901"
      },
      {
        "nome": "Elisa Santos Amaro",
        "data_nascimento": "17/05/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99139-3991"
      },
      {
        "nome": "Gael Soares Leite Pereira",
        "data_nascimento": "19/06/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99178-4978"
      },
      {
        "nome": "Isaac de Oliveira dos Santos",
        "data_nascimento": "26/06/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99707-2076"
      },
      {
        "nome": "Isís Bonfiglio Koli",
        "data_nascimento": "07/07/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99173-6267"
      },
      {
        "nome": "Lara Helloá Fermino",
        "data_nascimento": "22/02/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99168-2137"
      },
      {
        "nome": "Laura Kelly de Oliveira Vallim",
        "data_nascimento": "31/05/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99809-8058"
      },
      {
        "nome": "Maitê Gonçalves Nascimento",
        "data_nascimento": "21/06/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99912-2085"
      },
      {
        "nome": "Maria Alice Patrocinio Montalvão",
        "data_nascimento": "11/01/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99101-6242"
      },
      {
        "nome": "Maria Júlia da Silva Savieri",
        "data_nascimento": "17/02/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99162-8717"
      },
      {
        "nome": "Nara Jasmin Fernandes Zampolo",
        "data_nascimento": "21/06/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99134-6221"
      },
      {
        "nome": "Pedro Miguel Inácio Zampolo",
        "data_nascimento": "06/03/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99117-7901"
      },
      {
        "nome": "Heitor Bento Moreno Cimino",
        "data_nascimento": "10/06/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(21)97898-0026"
      }
    ]
  },
  {
    "nome": "Infantil 3 - A",
    "turma_base": "Infantil 3",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Antonella Gonçalves dos Santos",
        "data_nascimento": "23/02/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99267-9040"
      },
      {
        "nome": "Benjamin Correia",
        "data_nascimento": "15/02/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(42)99918-2972"
      },
      {
        "nome": "Clara Sofia Guimarães de Brito",
        "data_nascimento": "21/10/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99712-9764"
      },
      {
        "nome": "Emanuel Ferreira de Lima",
        "data_nascimento": "14/12/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99148-0573"
      },
      {
        "nome": "Gael Henrique Gomes Machado",
        "data_nascimento": "22/02/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99921-8659"
      },
      {
        "nome": "Gael Martin Benedito",
        "data_nascimento": "18/11/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99752-2018"
      },
      {
        "nome": "Guilherme Edno Monte da Silva Cano",
        "data_nascimento": "08/09/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99103-7978"
      },
      {
        "nome": "Gustavo Luiz Monte da Siva Cano",
        "data_nascimento": "08/09/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99103-7978"
      },
      {
        "nome": "João Lucas Soares Manarim",
        "data_nascimento": "02/11/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99151-7475"
      },
      {
        "nome": "José Caetano Ariza",
        "data_nascimento": "02/11/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99124-0915"
      },
      {
        "nome": "Manuella da Silva Alegranci",
        "data_nascimento": "27/02/2022",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99147-9497"
      },
      {
        "nome": "Manuelly Rayane de Oliveira Santos",
        "data_nascimento": "06/12/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99117-4712"
      },
      {
        "nome": "Maria Cecília Gomes Ribeiro",
        "data_nascimento": "12/10/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99922-0857"
      },
      {
        "nome": "Pedro Garcia Xavier",
        "data_nascimento": "09/11/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99146-3878"
      },
      {
        "nome": "Ravi Ruiperes Marques de Jesus",
        "data_nascimento": "24/10/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99997-7910"
      },
      {
        "nome": "André Gomes Zilio",
        "data_nascimento": "06/05/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(49)99938-7723"
      },
      {
        "nome": "Lorenzo Henrique Silva Martins",
        "data_nascimento": "08/03/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(31)99064-7361"
      },
      {
        "nome": "Maria Luíza Molina de Oliveira",
        "data_nascimento": "01/06/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99135-8268"
      },
      {
        "nome": "Deiker David Gonzalez Hidalgo",
        "data_nascimento": "25/03/2022",
        "sexo": "Masculino",
        "responsavel_telefone": "(42)99842-7729"
      }
    ]
  },
  {
    "nome": "Infantil 3 - B",
    "turma_base": "Infantil 3",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Atílio Monteiro Santos",
        "data_nascimento": "08/04/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99128-7713"
      },
      {
        "nome": "Benicio Martins da Silva",
        "data_nascimento": "23/04/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99143-1168"
      },
      {
        "nome": "Benjamim Pontes Lima",
        "data_nascimento": "25/05/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(61)99935-4678"
      },
      {
        "nome": "João Guilherme da Silva Fajardo",
        "data_nascimento": "16/04/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99139-2736"
      },
      {
        "nome": "Ketlyn Araujo Pires",
        "data_nascimento": "06/05/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99136-4810"
      },
      {
        "nome": "Lorena Ferreira Sales",
        "data_nascimento": "11/05/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99143-4273"
      },
      {
        "nome": "Luiz Ricardo Alves Viana",
        "data_nascimento": "24/06/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99117-7207"
      },
      {
        "nome": "Noah dos Santos Rissardo",
        "data_nascimento": "04/05/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99122-0888"
      },
      {
        "nome": "Rafaelly Sophia de Lima Rocha",
        "data_nascimento": "10/08/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99161-6266"
      },
      {
        "nome": "Rauan Lorenzo Miranda Soares",
        "data_nascimento": "23/08/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99876-3208"
      },
      {
        "nome": "Samuel Lima de Oliveira Rambo",
        "data_nascimento": "01/05/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99717-8726"
      },
      {
        "nome": "Tailan Santos de sá",
        "data_nascimento": "29/06/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99959-2056"
      },
      {
        "nome": "Tayllor Benício dos Santos",
        "data_nascimento": "06/04/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99183-5623"
      },
      {
        "nome": "Cadu Miguel Tendulo",
        "data_nascimento": "26/11/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99179-1987"
      },
      {
        "nome": "Davi Lucca Oliveira da Silva",
        "data_nascimento": "09/07/2021",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99724-0767"
      },
      {
        "nome": "Ana Lívia de Jesus de Oliveira",
        "data_nascimento": "12/04/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(18)98124-9588"
      },
      {
        "nome": "Maysa Vitoria Lamim Pauferro",
        "data_nascimento": "28/06/2021",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99146-0587"
      }
    ]
  },
  {
    "nome": "Infantil 0 - A",
    "turma_base": "Infantil 0",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Rael Lucca Miranda Soares",
        "data_nascimento": "11/06/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99967-9720"
      },
      {
        "nome": "Sara Vilela Santos",
        "data_nascimento": "21/01/2025",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99922-9765"
      },
      {
        "nome": "Helisa Hadassa Vilela dos Anjos",
        "data_nascimento": "04/02/2025",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99134-2558"
      },
      {
        "nome": "Emanuely Souza Santos",
        "data_nascimento": "25/02/2025",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99953-8544"
      },
      {
        "nome": "Ísis Novais Delvechio",
        "data_nascimento": "06/08/2024",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99767-5454"
      },
      {
        "nome": "Maria Liz Silva Ilário",
        "data_nascimento": "10/09/2024",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99138-0945"
      },
      {
        "nome": "Gael Henrique da Silva",
        "data_nascimento": "11/06/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99117-5455"
      }
    ]
  },
  {
    "nome": "Infantil 1 - A",
    "turma_base": "Infantil 1",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Isaac Henrique Bono de Santana",
        "data_nascimento": "09/01/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99812-8336"
      },
      {
        "nome": "Ísis Maria Gregianin",
        "data_nascimento": "13/02/2024",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99129-7040"
      },
      {
        "nome": "José Pietro Carnevali de Oliveira Gazola",
        "data_nascimento": "11/03/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99824-2485"
      },
      {
        "nome": "Lívia Gregianin Ribas",
        "data_nascimento": "16/04/2024",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99126-0411"
      },
      {
        "nome": "Maitê da Silva Apolinario",
        "data_nascimento": "29/03/2024",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99729-2047"
      },
      {
        "nome": "Otávio Barros Alavarse",
        "data_nascimento": "16/04/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99937-5771"
      },
      {
        "nome": "Joaquim Rodrigues Bem",
        "data_nascimento": "12/06/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(18)99691-1993"
      },
      {
        "nome": "Izadora Bissoni Latzenco",
        "data_nascimento": "12/03/2024",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99114-0383"
      },
      {
        "nome": "Théo Moreno Cimino",
        "data_nascimento": "01/03/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(21)97898-0026"
      },
      {
        "nome": "Gael Franco Machado",
        "data_nascimento": "06/03/2024",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99137-5565"
      }
    ]
  },
  {
    "nome": "Infantil 1 - B",
    "turma_base": "Infantil 1",
    "turno": "Integral",
    "cmei": "CMEI Anjo da Guarda",
    "alunos": [
      {
        "nome": "Helena Almeida Gonçalves",
        "data_nascimento": "26/12/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99135-4896"
      },
      {
        "nome": "Helena Luiza Silva Sales",
        "data_nascimento": "25/07/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99165-9076"
      },
      {
        "nome": "Kauê Yuri Taguchi Fermino",
        "data_nascimento": "14/11/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99107-2544"
      },
      {
        "nome": "Levi Augusto de Oliveira Rodrigues",
        "data_nascimento": "08/09/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99176-7803"
      },
      {
        "nome": "Maria Alice Ilário Constantino",
        "data_nascimento": "12/09/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99161-4335"
      },
      {
        "nome": "Maria Cecília Fernandes Passos",
        "data_nascimento": "09/06/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99175-2051"
      },
      {
        "nome": "Murilo Angelo Dias",
        "data_nascimento": "26/12/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99121-1438"
      },
      {
        "nome": "Rebeca dos Santos Laurentino",
        "data_nascimento": "23/07/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(19)99486-2774"
      },
      {
        "nome": "Brayan Davi Souza Santos",
        "data_nascimento": "07/12/2023",
        "sexo": "Masculino",
        "responsavel_telefone": "(44)99953-8544"
      },
      {
        "nome": "Antonella Bonome de Oliveira",
        "data_nascimento": "26/07/2023",
        "sexo": "Feminino",
        "responsavel_telefone": "(44)99147-4706"
      }
    ]
  }
];

async function importData() {
  try {
    console.log("Iniciando importação...");
    
    // Obter todos os CMEIs para mapeamento
    const { data: cmeis, error: errCmeis } = await supabase
      .from('cmeis')
      .select('*');

    if (errCmeis || !cmeis) {
      throw new Error("Erro ao buscar CMEIs: " + (errCmeis?.message || ''));
    }
    
    // Criar mapa de nome -> id (normalizando nomes)
    const cmeiMap = {};
    cmeis.forEach(c => {
        if (c.nome.toLowerCase().includes("joão trizzi")) cmeiMap["CMEI João Trizzi"] = c;
        if (c.nome.toLowerCase().includes("anjo da guarda")) cmeiMap["CMEI Anjo da Guarda"] = c;
    });

    console.log("CMEIs encontrados:", Object.keys(cmeiMap));

    const RESPONSAVEL_PADRAO = {
      responsavel_nome: "Administrador",
      responsavel_cpf: "178.409.019-05",
      cep: "87990-000",
      responsavel_email: "admin@diamantedonorte.pr.gov.br",
      aceita_qualquer_cmei: false,
      programas_sociais: false
    };

    for (const turmaData of DADOS) {
      const cmei = cmeiMap[turmaData.cmei];
      if (!cmei) {
          console.error(`CMEI não encontrado para a turma ${turmaData.nome}: ${turmaData.cmei}`);
          continue;
      }

      // 1. Criar/Buscar Turma Base
      console.log(`Processando turma base: ${turmaData.turma_base} (${cmei.nome})`);
      
      const { data: tb, error: errTB } = await supabase.from('turmas_base')
        .upsert({ 
            nome: turmaData.turma_base,
            idade_minima_meses: 0,
            idade_maxima_meses: 72,
            descricao: `Turma de ${turmaData.turma_base}`
        }, { onConflict: 'nome' })
        .select()
        .single();
        
      if (errTB) console.error("Erro TB:", errTB);

      // 2. Criar Turma
      console.log(`Processando turma: ${turmaData.nome}`);
      let turmaId;
      
      const { data: existingTurma } = await supabase.from('turmas')
        .select('id')
        .eq('cmei_id', cmei.id)
        .eq('nome', turmaData.nome)
        .single();
        
      if (existingTurma) {
          turmaId = existingTurma.id;
      } else {
          const { data: newT, error: errT } = await supabase.from('turmas').insert({
            cmei_id: cmei.id,
            nome: turmaData.nome,
            turma_base: turmaData.turma_base,
            capacidade: 30,
            turno: turmaData.turno,
            ativo: true
          }).select().single();

          if (errT) {
              console.error("Erro Turma:", errT);
              continue;
          }
          turmaId = newT.id;
      }

      // 3. Inserir/Atualizar Alunos
      if (turmaData.alunos && turmaData.alunos.length > 0) {
        for (const a of turmaData.alunos) {
            const [dia, mes, ano] = a.data_nascimento.split('/');
            const dataNasc = `${ano}-${mes}-${dia}`;
            
            const alunoData = {
                ...RESPONSAVEL_PADRAO,
                nome: a.nome,
                data_nascimento: dataNasc,
                sexo: a.sexo === 'M' ? 'Masculino' : 'Feminino',
                responsavel_telefone: a.responsavel_telefone,
                status: 'Matriculado',
                cmei_atual_id: cmei.id,
                turma_atual_id: turmaId
            };

            const { data: existingChild } = await supabase.from('criancas')
                 .select('id')
                 .ilike('nome', a.nome)
                 .eq('data_nascimento', dataNasc)
                 .single();
             
             if (existingChild) {
                 console.log(`Atualizando aluno: ${a.nome} -> ${cmei.nome}`);
                 const { error: errUpd } = await supabase.from('criancas')
                    .update({ 
                        nome: a.nome, 
                        turma_atual_id: turmaId,
                        cmei_atual_id: cmei.id
                    })
                    .eq('id', existingChild.id);
                 if (errUpd) console.error(`Erro ao atualizar ${a.nome}: ${errUpd.message}`);
             } else {
                 console.log(`Inserindo novo aluno: ${a.nome} em ${cmei.nome}`);
                 const { error: errA } = await supabase.from('criancas').insert(alunoData);
                 if (errA) console.error(`Erro ao inserir ${a.nome}: ${errA.message}`);
             }
        }
      }
    }
    
    console.log("Concluído!");

  } catch (error) {
    console.error("Erro fatal:", error);
    process.exit(1);
  }
}

importData();

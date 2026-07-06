# Alunos do SAM: seleção, escopo e perfil completo

## Objetivo
Hoje o SAM "puxa" todos os alunos de escolas/CMEIs (tabela `criancas`) em qualquer busca/agendamento. Vamos introduzir o conceito de **aluno selecionado para o SAM**: só alunos selecionados (ou que já tiveram atendimento) aparecem ao agendar ou buscar. Cada criança terá um perfil com histórico clicável, documentos e laudos (incluindo upload direto).

## Modelo de dados
A tabela `students` (que já existe) passa a representar oficialmente os **alunos selecionados**. O id do `students` é o mesmo id da `criancas` (já é assim hoje via `ensureSamStudentFromPrincipal`).

- **Selecionar** = criar a linha em `students` (reaproveita `ensureSamStudentFromPrincipal`).
- **Remover** = apagar a linha em `students`, **somente se** não houver atendimentos/registros/queixas. Quem já foi atendido permanece para sempre.
- **Documentos/laudos no perfil** = nova tabela `student_documents` + bucket de storage `sam-documentos`.

## Telas (duas separadas, conforme escolhido)

```text
Alunos (Geral)  -> lista criancas (escolas/CMEIs)   -> botão "Selecionar" / "Remover"
Alunos do SAM   -> lista somente students (selecionados) -> abre o Perfil
Perfil da criança -> histórico de atendimentos (clicável) + documentos + laudos + upload
```

1. **Alunos (Geral)** — reaproveita a tela atual `Cadastros > Alunos` (`CadastrosAlunosConsulta`), adicionando uma coluna/ação "Selecionar para o SAM" (ou "Remover", se já selecionado e sem histórico). Indica visualmente quem já está no SAM.
2. **Alunos do SAM** — nova página em `/modulo/sam/alunos/selecionados`, listando apenas `students` com busca, contagem e link para o perfil. Entra no menu lateral.
3. **Perfil da criança** — aprimora a página `Prontuário` existente (`/modulo/sam/alunos/:id/prontuario`), que já mostra histórico + documentos de atendimentos + laudos de queixas. Acréscimos:
   - Tornar cada atendimento do histórico **clicável** (abre `/modulo/sam/atendimentos/:id`).
   - Nova seção **"Documentos e laudos"** com upload, listagem, download e exclusão (tabela `student_documents` + bucket).

## Escopo de agendamento e busca
- Novo helper `getSelectedStudents()` (lê `students`).
- No **agendamento** (`AgendaNovo`/form de atendimento), o seletor de aluno passa a usar **apenas selecionados** em vez de `fetchPrincipalStudents`. Se o aluno não estiver selecionado, o usuário seleciona primeiro na tela Geral.
- Na **busca de atendimentos** já se filtra por `students`/appointments, então permanece coerente (quem já foi atendido continua aparecendo).

## Arquivos
- `modules/Sam/src/lib/actions/students-sam.ts` (novo): `getSelectedStudents`, `selectStudent`, `unselectStudent` (com checagem de histórico), `isStudentSelected`, `listStudentDocuments`, `uploadStudentDocument`, `deleteStudentDocument`.
- `modules/Sam/src/pages/AlunosSelecionados.tsx` (novo): tela "Alunos do SAM".
- `modules/Sam/src/pages/CadastrosAlunosConsulta.tsx`: ação Selecionar/Remover + indicador.
- `modules/Sam/src/pages/Prontuario.tsx`: histórico clicável + seção de documentos com upload.
- `modules/Sam/src/components/atendimentos/crianca-autocomplete.tsx` (ou onde é usado em agendamento): trocar fonte para selecionados.
- `modules/Sam/src/App.tsx`: rota da nova tela.
- Menu lateral do SAM: novo item "Alunos do SAM".

## Banco de dados — você precisa rodar (Supabase externo)
Como o app usa um Supabase fora do Lovable Cloud, eu não consigo aplicar isto pelas minhas ferramentas. Vou te entregar o SQL e os passos. Resumo do que será criado:

- Tabela `public.student_documents` (campos de negócio: `student_id`, `file_path`, `file_name`, `doc_type`, `description`) com RLS e GRANTs.
- Bucket de Storage **privado** `sam-documentos` + políticas de acesso em `storage.objects` para usuários autenticados do SAM.

Sem rodar isso, a seção de upload do perfil mostra um aviso amigável e o restante (seleção, escopo, histórico) funciona normalmente.

## Critérios de sucesso
- Só alunos selecionados (ou já atendidos) aparecem em agendamento/busca.
- Tela Geral permite selecionar/remover (remoção bloqueada quando há histórico).
- Tela "Alunos do SAM" lista os selecionados e abre o perfil.
- Perfil mostra histórico clicável, documentos de atendimentos, laudos de queixas e permite upload/exclusão de documentos próprios.
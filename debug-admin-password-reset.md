# Debug Session: admin-password-reset

Status: OPEN

Symptom
- Ao gerar nova senha no painel, a chamada da edge function retorna `Edge Function returned a non-2xx status code`.

Expected
- Admin ou superadmin deve conseguir gerar uma nova senha temporaria diretamente no painel, sem envio por email.

Hypotheses
1. A edge function publicada ainda espera `email` em vez de `user_id`.
2. A funcao retorna `403` por restricao de papeis do operador ou do usuario alvo.
3. O `auth.admin.updateUserById` falha no runtime da funcao.
4. O frontend esconde a mensagem real retornada pelo backend.
5. O payload enviado pela tela nao corresponde ao esperado.

Plan
- Instrumentar frontend e edge function.
- Reproduzir a falha.
- Coletar logs.
- Confirmar ou rejeitar hipoteses.
- Aplicar a menor correcao possivel.

Evidence
- Front log: o hook enviou `action=reset-password` com `user_id`.
- Front log: a chamada falhou com `Edge Function returned a non-2xx status code`.
- Supabase edge-function logs: `POST | 401 | .../functions/v1/admin-usuarios`.
- Supabase auth logs: `session_not_found` no acesso ao `/user` no mesmo intervalo da falha.
- Supabase get_edge_function: a funcao publicada `admin-usuarios` ainda esta na versao antiga (`version=6`), sem a logica nova de gerar senha direta.

Hypothesis Status
- H1 publicada antiga esperando outra logica: CONFIRMED
- H2 retorno 403 por regra de papel: INCONCLUSIVE
- H3 falha em `updateUserById`: REJECTED por enquanto, a requisicao esta morrendo antes
- H4 front escondendo mensagem real: CONFIRMED em parte, porque o erro chega generico
- H5 payload incorreto no front: REJECTED

Root Cause Candidate
- A funcionalidade nova ainda nao foi publicada na edge function `admin-usuarios`.
- A chamada atual tambem esta ocorrendo com sessao/token invalido ou expirado, por isso o Supabase rejeita a funcao com `401` antes da execucao.

Fix Applied
- Publicada a edge function `admin-usuarios` atualizada no Supabase: versao `8`.
- O hook de reset agora valida/renova a sessao antes do `invoke` e mostra mensagem clara quando a sessao expira.
- O modal de reset em `admin` e `superadmin` foi trocado para `Dialog`.
- Agora existe escolha entre:
  - gerar senha forte automaticamente e copiar
  - definir senha manualmente

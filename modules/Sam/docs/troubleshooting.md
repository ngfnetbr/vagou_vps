# 9. Troubleshooting e Histórico

## 9.1 FAQ - Perguntas Frequentes

**P: O usuário não consegue fazer login.**
R: Verifique se o e-mail está correto no Supabase Auth e se o perfil na tabela `profiles` existe com o mesmo ID.

**P: O webhook está retornando erro.**
R: Verifique a tabela `webhook_logs` para ver o código de status retornado pelo servidor externo. Comumente é um erro de timeout (30s) ou falta de token de autorização.

**P: Os dados do aluno não aparecem para o Coordenador.**
R: Verifique se o `school_id` do perfil do coordenador corresponde ao `school_id` do aluno.

## 9.2 Erros Comuns e Soluções

| Erro | Causa Provável | Solução |
|------|---------------|---------|
| `PGRST116` | Falha na política de RLS. | Verifique as permissões do usuário no banco. |
| `500 Internal Server Error` | Falha em Server Action. | Verifique as chaves de ambiente (Environment Variables). |
| `SMTP Connection Timeout` | Porta bloqueada ou host incorreto. | Teste com o script `tests/smtp-test-script.ts`. |

## 9.3 Histórico de Versões (Changelog)

### v0.1.0 (2024-02-21)
- Lançamento inicial do sistema SAM.
- Módulos de Alunos, Escolas e Agenda.
- Implementação de RLS e Auditoria.
- Sistema de Webhooks para integrações.

### v0.1.1 (2024-06-01)
- Adição de configurações de Instituição.
- Melhorias na interface de relatórios.
- Correção de bugs no fluxo de recuperação de senha.

---
*Consulte o arquivo CHANGELOG.md na raiz para detalhes técnicos de commits.*

export function getResetPasswordTemplate(params: {
  resetLink: string
  nomeUsuario?: string
  nomeSistema: string
  nomeMunicipio: string
}) {
  const { resetLink, nomeUsuario, nomeSistema, nomeMunicipio } = params
  const ano = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - ${nomeSistema}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1351B4; padding: 24px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: bold;">${nomeSistema}</h1>
              <p style="color: #ffffff; font-size: 14px; margin: 8px 0 0 0; opacity: 0.9;">${nomeMunicipio}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #1351B4; font-size: 22px; margin: 0 0 24px 0; text-align: center; font-weight: bold;">
                Recuperação de Senha
              </h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Olá${nomeUsuario ? `, <strong>${nomeUsuario}</strong>` : ''}!
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta no sistema <strong>${nomeSistema}</strong>.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Clique no botão abaixo para criar uma nova senha:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" 
                       style="display: inline-block; background-color: #1351B4; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 4px;">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 12px 0;">
                Ou copie e cole este link no seu navegador:
              </p>
              
              <p style="background-color: #f0f4f8; padding: 12px; border-radius: 4px; font-size: 12px; word-break: break-all; color: #1351B4; margin: 8px 0 16px 0;">
                ${resetLink}
              </p>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

              <!-- Warning -->
              <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; padding: 12px 16px; margin: 16px 0;">
                <p style="color: #856404; font-size: 14px; line-height: 20px; margin: 0;">
                  ⚠️ <strong>Importante:</strong> Este link é válido por 24 horas. Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá inalterada.
                </p>
              </div>

              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 12px 0;">
                Por motivos de segurança, nunca compartilhe este link com outras pessoas.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 32px; text-align: center;">
              <p style="color: #666666; font-size: 12px; line-height: 18px; margin: 4px 0;">
                Este é um e-mail automático do sistema ${nomeSistema}.
              </p>
              <p style="color: #666666; font-size: 12px; line-height: 18px; margin: 4px 0;">
                Por favor, não responda a esta mensagem.
              </p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;">
              <p style="color: #999999; font-size: 11px; margin: 8px 0 0 0;">
                © ${ano} ${nomeSistema} - ${nomeMunicipio}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

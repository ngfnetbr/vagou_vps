import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
}

const ALLOWED_ROLES = ["admin", "superadmin", "gestor"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Encode string to base64
function btoa64(str: string): string {
  return btoa(str);
}

// Raw SMTP client for better compatibility with Titan/STARTTLS
async function sendSmtpEmail(
  host: string,
  port: number,
  username: string,
  password: string,
  from: string,
  fromName: string,
  to: string,
  subject: string,
  htmlBody: string
) {
  let conn: Deno.Conn;

  if (port === 465) {
    // Direct TLS
    conn = await Deno.connectTls({ hostname: host, port });
  } else {
    // Plain TCP first, then STARTTLS
    conn = await Deno.connect({ hostname: host, port });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(4096);
    let result = "";
    // Read until we get a complete response (line ending with \r\n and no continuation)
    while (true) {
      const n = await conn.read(buf);
      if (n === null) break;
      result += decoder.decode(buf.subarray(0, n));
      // Check if response is complete (last line has space after code, not dash)
      const lines = result.split("\r\n").filter(l => l.length > 0);
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        if (lastLine.length >= 4 && lastLine[3] === " ") break;
      }
    }
    return result;
  }

  async function sendCmd(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  }

  try {
    // Read server greeting
    const greeting = await readResponse();
    console.log("SMTP Greeting:", greeting.trim());

    // EHLO
    let ehlo = await sendCmd(`EHLO lovable-edge`);
    console.log("EHLO response:", ehlo.trim());

    // STARTTLS if not already TLS
    if (port !== 465) {
      if (ehlo.includes("STARTTLS")) {
        const starttlsResp = await sendCmd("STARTTLS");
        console.log("STARTTLS response:", starttlsResp.trim());
        if (!starttlsResp.startsWith("220")) {
          throw new Error(`STARTTLS failed: ${starttlsResp}`);
        }
        // Upgrade connection to TLS
        conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
        // Re-EHLO after TLS upgrade
        ehlo = await sendCmd(`EHLO lovable-edge`);
        console.log("EHLO after TLS:", ehlo.trim());
      }
    }

    // AUTH PLAIN (more compatible than AUTH LOGIN)
    // Format: base64(\0username\0password)
    const authString = `\0${username}\0${password}`;
    const authB64 = btoa64(authString);
    console.log("Using AUTH PLAIN, username:", username);
    const authResp = await sendCmd(`AUTH PLAIN ${authB64}`);
    console.log("AUTH PLAIN response code:", authResp.substring(0, 3));
    if (!authResp.startsWith("235")) {
      throw new Error(`Authentication failed: ${authResp.trim()}`);
    }

    // MAIL FROM
    const mailFromResp = await sendCmd(`MAIL FROM:<${from}>`);
    if (!mailFromResp.startsWith("250")) {
      throw new Error(`MAIL FROM failed: ${mailFromResp}`);
    }

    // RCPT TO
    const rcptResp = await sendCmd(`RCPT TO:<${to}>`);
    if (!rcptResp.startsWith("250")) {
      throw new Error(`RCPT TO failed: ${rcptResp}`);
    }

    // DATA
    const dataResp = await sendCmd("DATA");
    if (!dataResp.startsWith("354")) {
      throw new Error(`DATA failed: ${dataResp}`);
    }

    // Build email with MIME
    const boundary = `boundary_${Date.now()}`;
    const emailContent = [
      `From: ${fromName} <${from}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      `Visualize este email em um cliente que suporte HTML.`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlBody,
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    const msgResp = await sendCmd(emailContent);
    if (!msgResp.startsWith("250")) {
      throw new Error(`Message send failed: ${msgResp}`);
    }

    // QUIT
    try { await sendCmd("QUIT"); } catch (e) { void e; }

    console.log("Email sent successfully!");
  } finally {
    try { conn.close(); } catch (e) { void e; }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT - require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string | undefined;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Usuário inválido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { to, subject, html } = (await req.json()) as EmailRequest;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes (to, subject, html)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_REGEX.test(to) || subject.length > 200 || html.length > 100_000) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos para envio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read SMTP config from database using service role
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleCheck, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", [...ALLOWED_ROLES]);

    if (roleError) {
      throw new Error(`Erro ao validar permissões: ${roleError.message}`);
    }

    if (!roleCheck || roleCheck.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acesso negado para envio de e-mails." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: smtpData, error: smtpError } = await adminClient
      .from("smtp_config")
      .select("*")
      .limit(1)
      .single();

    if (smtpError || !smtpData) {
      return new Response(
        JSON.stringify({ error: "Configuração SMTP não encontrada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpHost = smtpData.host;
    const smtpPort = smtpData.port || 587;
    const smtpUser = smtpData.username;
    const smtpPass = smtpData.password;
    const fromEmail = smtpData.from_email;
    const fromName = smtpData.from_name || "Sistema de Sondagem";

    if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
      return new Response(
        JSON.stringify({ error: "Configuração SMTP incompleta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email via ${smtpHost}:${smtpPort} from ${fromEmail} to ${to}`);

    await sendSmtpEmail(
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName,
      to,
      subject,
      html
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao enviar email." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

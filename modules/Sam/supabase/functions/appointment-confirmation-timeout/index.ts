import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function replaceTemplateVars(template: any, vars: Record<string, string>): any {
  const str = JSON.stringify(template);
  let result = str;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return JSON.parse(result);
}

async function dispatchWebhookEvent(supabase: any, evento: string, agendamentoData: any) {
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("evento", evento)
    .eq("ativo", true);

  if (!webhooks || webhooks.length === 0) return;

  const vars: Record<string, string> = {
    "{paciente_nome}": agendamentoData.paciente_nome || "",
    "{paciente_telefone}": agendamentoData.paciente_telefone || "",
    "{data}": agendamentoData.data || "",
    "{hora}": agendamentoData.hora || "",
    "{servico}": agendamentoData.servico || "",
    "{profissional}": agendamentoData.profissional || "",
  };

  const basePayload = {
    evento,
    data_evento: new Date().toISOString(),
    agendamento: agendamentoData,
  };

  for (const wh of webhooks as any[]) {
    const bodyTemplate =
      wh.body_template && Object.keys(wh.body_template).length > 0
        ? wh.body_template
        : basePayload;

    const payload = replaceTemplateVars(bodyTemplate, vars);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(wh.headers || {}),
    };

    let statusHttp = 0;
    let resposta = "";

    try {
      const response = await fetch(wh.url, {
        method: wh.metodo || "POST",
        headers,
        body: (wh.metodo || "POST") === "POST" ? JSON.stringify(payload) : undefined,
      });
      statusHttp = response.status;
      resposta = (await response.text()).substring(0, 1000);
    } catch (err: any) {
      resposta = err.message || "Network error";
    }

    await supabase.from("webhooks_exec_logs").insert({
      webhook_id: wh.id,
      evento,
      payload_enviado: payload,
      resposta,
      status_http: statusHttp || null,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const configuredSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET") || "";
  if (configuredSecret) {
    const providedSecret = req.headers.get("x-webhook-secret") || "";
    if (providedSecret !== configuredSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const cutoff = now.toISOString();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, date, type, confirmation_status, students(full_name, guardian_phone), profiles:professional_id(full_name)")
    .eq("status", "scheduled")
    .lte("date", cutoff)
    .or("confirmation_status.is.null,confirmation_status.eq.pending")
    .order("date", { ascending: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0;

  for (const appt of (appointments || []) as any[]) {
    const apptDate = new Date(appt.date);
    const dateStr = apptDate.toISOString().substring(0, 10);
    const timeStr = apptDate.toISOString().substring(11, 16);

    const agendamentoData = {
      id: appt.id,
      data: dateStr,
      hora: timeStr,
      paciente_nome: appt.students?.full_name || "Aluno",
      paciente_telefone: appt.students?.guardian_phone || "",
      servico: appt.type || "",
      profissional: appt.profiles?.full_name || "Profissional",
    };

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        confirmation_status: "assumed_confirmed",
        confirmation_updated_at: now.toISOString(),
        confirmation_source: "system",
      })
      .eq("id", appt.id);

    if (!updateError) {
      updated++;
      await dispatchWebhookEvent(supabase, "sam.appointment.confirmation.assumed", agendamentoData);
    }
  }

  return new Response(JSON.stringify({ ok: true, updated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

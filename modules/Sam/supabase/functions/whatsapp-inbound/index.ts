import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function normalizePhone(value: string) {
  return (value || "").replace(/\D/g, "");
}

function normalizeText(value: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseConfirmation(text: string): "confirmed" | "declined" | null {
  const t = normalizeText(text);
  if (!t) return null;
  if (t === "sim" || t === "s" || t === "1" || t.includes("confirm")) return "confirmed";
  if (t === "nao" || t === "não" || t === "n" || t === "2" || t.includes("cancel")) return "declined";
  return null;
}

function replaceTemplateVars(template: any, vars: Record<string, string>): any {
  const str = JSON.stringify(template);
  let result = str;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return JSON.parse(result);
}

async function dispatchWebhookEvent(supabase: any, evento: string, agendamentoData: any, extraPayload?: Record<string, any>) {
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
    ...(extraPayload || {}),
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

  const body = await req.json().catch(() => ({}));

  const fromRaw = body.from ?? body.phone ?? body.sender ?? "";
  const textRaw = body.message ?? body.text ?? body.body ?? "";

  const from = normalizePhone(String(fromRaw));
  const text = String(textRaw || "");
  const decision = parseConfirmation(text);

  if (!from || !decision) {
    return new Response(JSON.stringify({ ok: true, handled: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, date, type, confirmation_status, students(full_name, guardian_phone), profiles:professional_id(full_name)")
    .eq("status", "scheduled")
    .gte("date", windowStart.toISOString())
    .lte("date", windowEnd.toISOString())
    .order("date", { ascending: true })
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fromTail = from.slice(-8);
  const candidate = (appointments || []).find((a: any) => {
    const phone = normalizePhone(a.students?.guardian_phone || "");
    const phoneTail = phone.slice(-8);
    const eligibleStatus = !a.confirmation_status || a.confirmation_status === "pending";
    return eligibleStatus && phoneTail && fromTail && phoneTail === fromTail;
  }) as any;

  if (!candidate) {
    return new Response(JSON.stringify({ ok: true, handled: false, reason: "no_match" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apptDate = new Date(candidate.date);
  const dateStr = apptDate.toISOString().substring(0, 10);
  const timeStr = apptDate.toISOString().substring(11, 16);
  const agendamentoData = {
    id: candidate.id,
    data: dateStr,
    hora: timeStr,
    paciente_nome: candidate.students?.full_name || "Aluno",
    paciente_telefone: normalizePhone(candidate.students?.guardian_phone || ""),
    servico: candidate.type || "",
    profissional: candidate.profiles?.full_name || "Profissional",
  };

  const updatePayload: Record<string, any> = {
    confirmation_status: decision,
    confirmation_response: text,
    confirmation_updated_at: now.toISOString(),
    confirmation_source: "whatsapp",
  };

  if (decision === "declined") {
    updatePayload.status = "cancelled";
  }

  const { error: updateError } = await supabase.from("appointments").update(updatePayload).eq("id", candidate.id);
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await dispatchWebhookEvent(supabase, "sam.appointment.confirmation.received", agendamentoData, {
    confirmacao: { resposta: decision === "confirmed" ? "sim" : "nao", mensagem: text },
  });

  if (decision === "declined") {
    await dispatchWebhookEvent(supabase, "sam.appointment.canceled", agendamentoData, {
      cancelamento: { origem: "whatsapp", motivo: "declined" },
    });
  }

  return new Response(JSON.stringify({ ok: true, handled: true, appointment_id: candidate.id, decision }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});


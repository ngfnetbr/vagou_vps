import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the reminder type from the request body
    const body = await req.json().catch(() => ({}));
    const reminderType = body.type || "24h"; // "24h" or "1h"

    const now = new Date();
    let windowStart: Date;
    let windowEnd: Date;
    let evento: string;

    if (reminderType === "1h") {
      // Appointments between 55min and 65min from now
      windowStart = new Date(now.getTime() + 55 * 60 * 1000);
      windowEnd = new Date(now.getTime() + 65 * 60 * 1000);
      evento = "agendamento_lembrete_1h";
    } else {
      // Appointments between 23h30 and 24h30 from now
      windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
      windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
      evento = "agendamento_lembrete_24h";
    }

    console.log(`[${evento}] Checking appointments between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Fetch scheduled appointments in the time window
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select("id, date, type, duration_minutes, student_id, professional_id, reminder_24h_sent_at, reminder_1h_sent_at, confirmation_status, students(full_name, guardian_name, guardian_phone), profiles:professional_id(full_name)")
      .eq("status", "scheduled")
      .gte("date", windowStart.toISOString())
      .lte("date", windowEnd.toISOString());

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointments || appointments.length === 0) {
      console.log(`[${evento}] No appointments found in window.`);
      return new Response(JSON.stringify({ sent: 0, message: "No appointments in window" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filteredAppointments = (appointments || []).filter((appt: any) => {
      if (reminderType === "1h") return !appt.reminder_1h_sent_at;
      return !appt.reminder_24h_sent_at;
    });

    if (filteredAppointments.length === 0) {
      console.log(`[${evento}] No appointments eligible (already reminded).`);
      return new Response(JSON.stringify({ sent: 0, message: "No eligible appointments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${evento}] Found ${filteredAppointments.length} appointment(s) to remind.`);

    // Fetch active webhooks for this event
    const { data: webhooks, error: whError } = await supabase
      .from("webhooks")
      .select("*")
      .eq("evento", evento)
      .eq("ativo", true);

    if (whError || !webhooks || webhooks.length === 0) {
      console.log(`[${evento}] No active webhooks for this event.`);
      return new Response(JSON.stringify({ sent: 0, message: "No active webhooks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const appt of filteredAppointments as any[]) {
      const apptDate = new Date(appt.date);
      const dateStr = apptDate.toISOString().substring(0, 10);
      const timeStr = apptDate.toISOString().substring(11, 16);
      const studentName = (appt as any).students?.full_name || "Aluno";
      const studentPhone = (appt as any).students?.guardian_phone || "";
      const profName = (appt as any).profiles?.full_name || "Profissional";

      const templateVars: Record<string, string> = {
        "{paciente_nome}": studentName,
        "{paciente_telefone}": studentPhone,
        "{data}": dateStr,
        "{hora}": timeStr,
        "{servico}": appt.type || "",
        "{profissional}": profName,
      };

      for (const wh of webhooks) {
        const defaultPayload = {
          evento,
          data_evento: now.toISOString(),
          agendamento: {
            id: appt.id,
            data: dateStr,
            hora: timeStr,
            paciente_nome: studentName,
              paciente_telefone: studentPhone,
            servico: appt.type,
            profissional: profName,
          },
        };

        const bodyTemplate =
          wh.body_template && Object.keys(wh.body_template).length > 0
            ? wh.body_template
            : defaultPayload;

        // Replace template variables
        let bodyStr = JSON.stringify(bodyTemplate);
        for (const [key, value] of Object.entries(templateVars)) {
          bodyStr = bodyStr.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
        }

        const payload = JSON.parse(bodyStr);
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
            body: wh.metodo === "POST" ? JSON.stringify(payload) : undefined,
          });
          statusHttp = response.status;
          resposta = (await response.text()).substring(0, 1000);
          if (response.ok) sentCount++;
        } catch (err: any) {
          resposta = err.message || "Network error";
        }

        // Log the execution
        await supabase.from("webhooks_exec_logs").insert({
          webhook_id: wh.id,
          evento,
          payload_enviado: payload,
          resposta,
          status_http: statusHttp || null,
        });
      }

      const updatePayload: Record<string, any> = {}
      const nowIso = now.toISOString()
      if (reminderType === "1h") {
        updatePayload.reminder_1h_sent_at = nowIso
        if (!appt.confirmation_status) {
          updatePayload.confirmation_status = "pending"
          updatePayload.confirmation_updated_at = nowIso
          updatePayload.confirmation_source = "system"
        }
      } else {
        updatePayload.reminder_24h_sent_at = nowIso
      }

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from("appointments").update(updatePayload).eq("id", appt.id)
      }
    }

    console.log(`[${evento}] Sent ${sentCount} webhook(s) successfully.`);

    return new Response(
      JSON.stringify({
        sent: sentCount,
        appointments: appointments.length,
        webhooks: webhooks.length,
        evento,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

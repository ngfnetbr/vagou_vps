import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type RequestBody =
  | { action: "trigger" }
  | { action: "list-runs"; per_page?: number }
  | { action: "list-targets" }
  | { action: "upsert-target"; target: { id?: string; name: string; project_ref: string; enabled?: boolean; db_password?: string | null } }
  | { action: "delete-target"; id: string }
  | { action: "export-targets-json" };

type WorkflowRun = {
  id: number;
  run_number: number;
  status: string | null;
  conclusion: string | null;
  html_url: string | null;
  event: string | null;
  head_branch: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

const getRequiredEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

async function assertSuperAdmin(req: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false as const, status: 401, error: "Não autorizado" };
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, status: 401, error: "Não autorizado" };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    return { ok: false as const, status: 500, error: "Erro ao verificar permissões" };
  }

  const isSuperAdmin = (roles || []).some((r) => r.role === "superadmin");
  if (!isSuperAdmin) {
    return { ok: false as const, status: 403, error: "Acesso negado. Apenas Super Admin." };
  }

  return { ok: true as const };
}

async function githubRequest(path: string, init?: RequestInit) {
  const owner = getRequiredEnv("GITHUB_OWNER");
  const repo = getRequiredEnv("GITHUB_REPO");
  const token = getRequiredEnv("GITHUB_TOKEN");
  const workflow = Deno.env.get("GITHUB_WORKFLOW_FILE") || "supabase-deploy.yml";

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });

  if (res.status === 204) {
    return { ok: true as const, status: res.status, data: null };
  }

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    return { ok: false as const, status: res.status, data };
  }
  return { ok: true as const, status: res.status, data };
}

function normalizeRuns(raw: unknown): WorkflowRun[] {
  if (!raw || typeof raw !== "object") return [];
  const workflowRuns = (raw as Record<string, unknown>).workflow_runs;
  if (!Array.isArray(workflowRuns)) return [];

  const asStringOrNull = (value: unknown) => (typeof value === "string" ? value : null);
  const asNumber = (value: unknown) => (typeof value === "number" ? value : Number(value));

  return workflowRuns
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      id: asNumber(r.id),
      run_number: asNumber(r.run_number),
      status: asStringOrNull(r.status),
      conclusion: asStringOrNull(r.conclusion),
      html_url: asStringOrNull(r.html_url),
      event: asStringOrNull(r.event),
      head_branch: asStringOrNull(r.head_branch),
      created_at: asStringOrNull(r.created_at),
      updated_at: asStringOrNull(r.updated_at),
    }));
}

type SupabaseTargetRow = {
  id: string;
  name: string;
  project_ref: string;
  enabled: boolean;
  db_password_enc: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", textEncoder.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptString(plaintext: string, secret: string): Promise<string> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(plaintext));
  return JSON.stringify({
    v: 1,
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ciphertext)),
  });
}

async function decryptString(payload: string, secret: string): Promise<string> {
  const parsed = JSON.parse(payload);
  if (!parsed?.iv || !parsed?.ct) throw new Error("Payload inválido");
  const key = await deriveAesKey(secret);
  const iv = fromBase64(String(parsed.iv));
  const ct = fromBase64(String(parsed.ct));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return textDecoder.decode(plaintext);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const auth = await assertSuperAdmin(req);
    if (!auth.ok) return json(req, auth.status, { error: auth.error });

    const body = (await req.json()) as RequestBody;
    const enabled = (Deno.env.get("GITHUB_SYNC_ENABLED") || "false").toLowerCase() === "true";
    const requiresGithub = body.action === "trigger" || body.action === "list-runs";
    if (requiresGithub && !enabled) {
      return json(req, 400, { error: "Sincronização desabilitada neste projeto" });
    }

    if (body.action === "trigger") {
      const ref = Deno.env.get("GITHUB_REF") || "main";
      const out = await githubRequest("/dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      });

      if (!out.ok) {
        return json(req, 500, { error: "Falha ao disparar workflow", details: out.data });
      }

      return json(req, 200, { ok: true });
    }

    if (body.action === "list-runs") {
      const perPage = Math.max(1, Math.min(20, Number(body.per_page || 10)));
      const out = await githubRequest(`/runs?per_page=${perPage}`, { method: "GET" });
      if (!out.ok) {
        return json(req, 500, { error: "Falha ao buscar execuções", details: out.data });
      }
      return json(req, 200, { runs: normalizeRuns(out.data) });
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (body.action === "list-targets") {
      const { data, error } = await supabaseAdmin
        .from("supabase_targets")
        .select("id,name,project_ref,enabled,db_password_enc,created_at,updated_at")
        .order("name", { ascending: true });

      if (error) return json(req, 500, { error: error.message });

      const targets = (data as SupabaseTargetRow[]).map((t) => ({
        id: t.id,
        name: t.name,
        project_ref: t.project_ref,
        enabled: !!t.enabled,
        has_password: !!t.db_password_enc,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      return json(req, 200, { targets });
    }

    if (body.action === "upsert-target") {
      const { id, name, project_ref, enabled: targetEnabled, db_password } = body.target || {};
      if (!name?.trim() || !project_ref?.trim()) {
        return json(req, 400, { error: "name e project_ref são obrigatórios" });
      }

      const encryptionKey = getRequiredEnv("TARGETS_ENCRYPTION_KEY");
      const payload: Record<string, unknown> = {
        name: name.trim(),
        project_ref: project_ref.trim(),
        enabled: targetEnabled !== undefined ? !!targetEnabled : true,
      };

      if (db_password !== undefined) {
        const trimmed = (db_password ?? "").trim();
        if (trimmed.length > 0) {
          payload.db_password_enc = await encryptString(trimmed, encryptionKey);
        } else {
          payload.db_password_enc = null;
        }
      }

      if (id) {
        const { error } = await supabaseAdmin
          .from("supabase_targets")
          .update(payload)
          .eq("id", id);
        if (error) return json(req, 500, { error: error.message });
        return json(req, 200, { ok: true });
      }

      const { error } = await supabaseAdmin
        .from("supabase_targets")
        .insert(payload);
      if (error) return json(req, 500, { error: error.message });
      return json(req, 200, { ok: true });
    }

    if (body.action === "delete-target") {
      const { error } = await supabaseAdmin
        .from("supabase_targets")
        .delete()
        .eq("id", body.id);
      if (error) return json(req, 500, { error: error.message });
      return json(req, 200, { ok: true });
    }

    if (body.action === "export-targets-json") {
      const encryptionKey = getRequiredEnv("TARGETS_ENCRYPTION_KEY");
      const { data, error } = await supabaseAdmin
        .from("supabase_targets")
        .select("name,project_ref,enabled,db_password_enc")
        .eq("enabled", true)
        .order("name", { ascending: true });

      if (error) return json(req, 500, { error: error.message });

      const items = data as Array<Pick<SupabaseTargetRow, "name" | "project_ref" | "enabled" | "db_password_enc">>;
      const targets = [];
      for (const t of items) {
        if (!t.db_password_enc) {
          return json(req, 400, { error: `Target sem senha configurada: ${t.name}` });
        }
        const db_password = await decryptString(t.db_password_enc, encryptionKey);
        targets.push({ name: t.name, project_ref: t.project_ref, db_password });
      }

      return json(req, 200, { json: JSON.stringify(targets, null, 2) });
    }

    return json(req, 400, { error: "Ação inválida" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(req, 500, { error: message });
  }
});

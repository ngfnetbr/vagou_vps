import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigins = () => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:54321",
  ];
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    allowedOrigins.push(
      ...envOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }
  return [...new Set(allowedOrigins)];
};

const isAllowedOrigin = (origin: string) => getAllowedOrigins().includes(origin);

const getSafeRedirectTo = (req: Request, path: string) => {
  const rawBase =
    Deno.env.get("PUBLIC_SITE_URL")?.trim() || req.headers.get("origin")?.trim() || "";
  if (!rawBase) return undefined;

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBase);
  } catch {
    return undefined;
  }

  if (!isAllowedOrigin(baseUrl.origin) && !Deno.env.get("PUBLIC_SITE_URL")?.trim()) {
    return undefined;
  }

  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new URL(safePath, baseUrl.origin).toString();
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

function normalizeName(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function resolveSamSchoolIdFromCmeiId(supabaseAdmin: any, cmeiId: string) {
  const { data: cmeiRow, error: cmeiError } = await supabaseAdmin
    .from("cmeis")
    .select("nome, tipo_unidade")
    .eq("id", cmeiId)
    .maybeSingle();

  if (cmeiError || !cmeiRow) return null;
  if ((cmeiRow.tipo_unidade || "cmei_creche") !== "escola") return null;

  const { data: schools, error: schoolsError } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .eq("active", true);

  if (schoolsError) return null;

  const target = normalizeName(cmeiRow.nome);
  const match = (schools || []).find((s: any) => normalizeName(s.name) === target);
  return match?.id || null;
}

function generateTemporaryPassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%*_-";
  const all = upper + lower + numbers + symbols;

  const randomFrom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const base = [
    randomFrom(upper),
    randomFrom(lower),
    randomFrom(numbers),
    randomFrom(symbols),
  ];

  while (base.length < length) {
    base.push(randomFrom(all));
  }

  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  return base.join("");
}


interface CreateUserRequest {
  action: "create-user";
  email: string;
  password: string;
  nome_completo: string;
  cpf?: string;
  telefone?: string;
  sexo?: string;
  data_nascimento?: string;
  role?: string;
  cmei_id?: string;
  modules?: string[];
}

interface UpdateUserRequest {
  action: "update-user";
  user_id: string;
  nome_completo?: string;
  cpf?: string;
  telefone?: string;
  sexo?: string;
  data_nascimento?: string;
  cmei_id?: string;
}

interface ResetPasswordRequest {
  action: "reset-password";
  user_id: string;
  new_password?: string;
}

interface ToggleUserStatusRequest {
  action: "toggle-user-status";
  user_id: string;
  ativo: boolean;
  motivo?: string;
}

interface ListActivityRequest {
  action: "list-activity";
}

interface ImpersonateRequest {
  action: "impersonate";
  user_id: string;
}

type RequestBody =
  | CreateUserRequest
  | UpdateUserRequest
  | ResetPasswordRequest
  | ToggleUserStatusRequest
  | ListActivityRequest
  | ImpersonateRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Verify the caller using anon client
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    let caller: { id: string; email?: string } | null = null;

    // Primary: verify token claims locally (works with signing keys)
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (!claimsError && claimsData?.claims?.sub) {
      caller = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string | undefined };
    } else {
      // Fallback: ask the auth server directly
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && userData?.user) {
        caller = { id: userData.user.id, email: userData.user.email ?? undefined };
      } else {
        console.error("Auth error:", claimsError, userError);
      }
    }

    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin or superadmin
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    if (rolesError) {
      console.error("Roles error:", rolesError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const roles = callerRoles?.map((r) => r.role) || [];
    const isAdmin = roles.includes("admin");
    const isSuperAdmin = roles.includes("superadmin");
    const isGestor = roles.includes("gestor");

    if (!isAdmin && !isSuperAdmin && !isGestor) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem gerenciar usuários." }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    console.log("Request body:", { ...body, password: body.action === "create-user" ? "[REDACTED]" : undefined });

    // Handle different actions
    switch (body.action) {
      case "create-user": {
        const { email, password, nome_completo, cpf, telefone, sexo, data_nascimento, role, cmei_id, modules } = body;

        // Validate required fields
        if (!email || !password || !nome_completo) {
          return new Response(
            JSON.stringify({ error: "Email, senha e nome são obrigatórios" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Validate password length
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Check if role is allowed based on caller's role
        const restrictedRoles = ["admin", "superadmin"];
        if (role && restrictedRoles.includes(role) && !isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Apenas Super Admins podem criar administradores" }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if (role === "diretor_cmei" && !cmei_id) {
          return new Response(
            JSON.stringify({ error: "Selecione o CMEI para vincular o diretor" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if (role === "school_coord" && !cmei_id) {
          return new Response(
            JSON.stringify({ error: "Selecione a escola para vincular o Portal da Escola" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if (role === "coordenador" && !cmei_id) {
          return new Response(
            JSON.stringify({ error: "Selecione o local (CMEI) para vincular o coordenador" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const defaultModules =
          role === "coordenador"
            ? ["sondagem"]
            : role === "school_coord"
              ? ["sam"]
              : role === "diretor_cmei"
                ? ["vagou"]
                : ["vagou"];
        const effectiveModules = Array.isArray(modules) && modules.length > 0 ? modules : defaultModules;
        const allowedModules = new Set(["vagou", "sam", "sondagem"]);
        for (const m of effectiveModules) {
          if (!allowedModules.has(m)) {
            return new Response(
              JSON.stringify({ error: "Módulo inválido" }),
              { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }
        }
        if (role === "diretor_cmei") {
          if (!effectiveModules.includes("vagou") || effectiveModules.some((m) => m !== "vagou")) {
            return new Response(
              JSON.stringify({ error: "O papel Diretor (VAGOU) deve ter acesso apenas ao módulo VAGOU" }),
              { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }
        }
        if (role === "school_coord") {
          if (!effectiveModules.includes("sam") || effectiveModules.some((m) => m !== "sam")) {
            return new Response(
              JSON.stringify({ error: "O Portal da Escola deve ter acesso apenas ao módulo SAM" }),
              { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }
        }
        if (role === "coordenador" && !effectiveModules.includes("sondagem")) {
          return new Response(
            JSON.stringify({ error: "O papel Coordenador exige acesso ao módulo Sondagem" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const schoolIdToSave =
          role === "school_coord" && cmei_id ? await resolveSamSchoolIdFromCmeiId(supabaseAdmin, cmei_id) : null;

        // Check if email already exists
        const { data: existingUser } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "Este e-mail já está cadastrado" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Check if CPF already exists (if provided)
        if (cpf) {
          const { data: existingCpf } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("cpf", cpf)
            .single();

          if (existingCpf) {
            return new Response(
              JSON.stringify({ error: "Este CPF já está cadastrado" }),
              { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }
        }

        // Create user in auth.users
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            nome_completo,
            cpf: cpf || null,
            telefone: telefone || null,
          },
        });

        if (createError) {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Update profile with additional data
        // Usando upsert para garantir que o perfil seja criado mesmo se o trigger falhar ou for lento
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: newUser.user.id,
            email: email,
            nome: nome_completo,
            nome_completo,
            cpf: cpf || null,
            telefone: telefone || null,
            sexo: sexo || null,
            data_nascimento: data_nascimento || null,
            cmei_id: cmei_id || null,
            school_id: schoolIdToSave,
          });

        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        // Add role if specified and different from default (responsavel)
        if (role && role !== "responsavel") {
          // Remove o role 'responsavel' que foi adicionado automaticamente pelo trigger
          // Usuários admin não devem ter role de responsavel a menos que explicitamente definido
          const { error: deleteError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", newUser.user.id)
            .eq("role", "responsavel");

          if (deleteError) {
            console.error("Delete responsavel role error:", deleteError);
          }

          // Adiciona o role administrativo
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: newUser.user.id,
              role: role,
              created_by: caller.id,
            });

          if (roleError) {
            console.error("Role insert error:", roleError);
          }

          if (role === "diretor_cmei" && cmei_id) {
            const { error: vinculoError } = await supabaseAdmin
              .from("diretor_cmei_vinculo")
              .insert({
                user_id: newUser.user.id,
                cmei_id,
                created_by: caller.id,
              });

            if (vinculoError) {
              console.error("Diretor vinculo insert error:", vinculoError);
              return new Response(
                JSON.stringify({ error: "Erro ao vincular diretor ao CMEI" }),
                { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
              );
            }
          }
        }

        const moduleToPermissionCode: Record<string, string> = {
          vagou: "modulos.vagou.acessar",
          sam: "modulos.sam.acessar",
          sondagem: "modulos.sondagem.acessar",
        };

        const permissionCodes = Array.from(new Set(effectiveModules.map((m) => moduleToPermissionCode[m]).filter(Boolean)));
        const { data: modulePerms, error: modulePermsError } = await supabaseAdmin
          .from("permissoes")
          .select("id,codigo")
          .in("codigo", permissionCodes);

        if (modulePermsError) {
          console.error("Module permissions lookup error:", modulePermsError);
          return new Response(
            JSON.stringify({ error: "Erro ao configurar acesso aos módulos" }),
            { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if ((modulePerms || []).length !== permissionCodes.length) {
          return new Response(
            JSON.stringify({ error: "Permissões de módulo não encontradas. Verifique as migrações do banco." }),
            { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const rows = (modulePerms || []).map((p) => ({
          user_id: newUser.user.id,
          permissao_id: p.id,
          created_by: caller.id,
        }));

        if (rows.length > 0) {
          const { error: insertUserPermsError } = await supabaseAdmin
            .from("user_permissoes")
            .insert(rows);

          if (insertUserPermsError) {
            console.error("Insert user_permissoes error:", insertUserPermsError);
            return new Response(
              JSON.stringify({ error: "Erro ao configurar acesso aos módulos" }),
              { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }
        }

        console.log("User created successfully:", newUser.user.id);

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: newUser.user.id,
              email: newUser.user.email,
            },
          }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      case "update-user": {
        const { user_id, nome_completo, cpf, telefone, sexo, data_nascimento, cmei_id } = body;

        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Check if CPF already exists for another user
        if (cpf) {
          const { data: existingCpf } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("cpf", cpf)
            .neq("id", user_id)
            .single();

          if (existingCpf) {
            return new Response(
              JSON.stringify({ error: "Este CPF já está cadastrado para outro usuário" }),
              { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }
        }

        const updateData: Record<string, unknown> = {};
        if (nome_completo !== undefined) {
          updateData.nome_completo = nome_completo;
          updateData.nome = nome_completo;
        }
        if (cpf !== undefined) updateData.cpf = cpf || null;
        if (telefone !== undefined) updateData.telefone = telefone || null;
        if (sexo !== undefined) updateData.sexo = sexo || null;
        if (data_nascimento !== undefined) updateData.data_nascimento = data_nascimento || null;
        if (cmei_id !== undefined) updateData.cmei_id = cmei_id || null;

        if (cmei_id !== undefined) {
          const { data: userRoles, error: userRolesError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user_id);

          const roles = userRolesError ? [] : (userRoles || []).map((r: any) => r.role);
          const isSchoolCoord = roles.includes("school_coord");
          if (isSchoolCoord && cmei_id) {
            updateData.school_id = await resolveSamSchoolIdFromCmeiId(supabaseAdmin, cmei_id);
          }
          if (isSchoolCoord && !cmei_id) {
            updateData.school_id = null;
          }
        }

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", user_id);

        if (updateError) {
          console.error("Update error:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        console.log("User updated successfully:", user_id);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      case "reset-password": {
        const { user_id, new_password } = body;

        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if (!isAdmin && !isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Apenas admin e superadmin podem redefinir senhas." }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const { data: targetRolesRows, error: targetRolesError } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);

        if (targetRolesError) {
          return new Response(
            JSON.stringify({ error: "Erro ao verificar os papéis do usuário." }),
            { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const targetRoles = (targetRolesRows || []).map((row: { role: string }) => row.role);
        const targetIsPrivileged = targetRoles.includes("admin") || targetRoles.includes("superadmin");

        if (targetIsPrivileged && !isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Apenas o superadmin pode redefinir a senha de contas administrativas." }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if (new_password && new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: "A nova senha deve ter pelo menos 6 caracteres." }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const temporaryPassword = new_password || generateTemporaryPassword();
        const { data: updatedUser, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
          user_id,
          { password: temporaryPassword },
        );

        if (resetError) {
          console.error("Reset password error:", resetError);
          // #region debug-point E:update-user-error
            JSON.stringify({ error: resetError.message }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
          );
        }

        await supabaseAdmin.from("auditoria").insert({
          tabela: "auth.users",
          operacao: "RESETAR_SENHA_USUARIO",
          registro_id: user_id,
          dados_novos: {
            target_roles: targetRoles,
            resetado_por: caller.id,
            modo: new_password ? "manual" : "gerada",
          },
          usuario_id: caller.id,
        });

        console.log("Password reset directly for user:", user_id);

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: user_id,
              email: updatedUser.user.email ?? null,
            },
            temporary_password: temporaryPassword,
          }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      case "toggle-user-status": {
        const { user_id, ativo, motivo } = body as ToggleUserStatusRequest;

        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Prevent self-deactivation
        if (user_id === caller.id && !ativo) {
          return new Response(
            JSON.stringify({ error: "Você não pode desativar sua própria conta" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Update profile status
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ ativo })
          .eq("id", user_id);

        if (updateError) {
          console.error("Update status error:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // If deactivating, also ban the user in auth to prevent login
        if (!ativo) {
          const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: "876000h", // ~100 years (effectively permanent)
          });

          if (banError) {
            console.error("Ban user error:", banError);
          }
        } else {
          // If activating, unban the user
          const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: "none",
          });

          if (unbanError) {
            console.error("Unban user error:", unbanError);
          }
        }

        // Log the action in auditoria
        await supabaseAdmin.from("auditoria").insert({
          tabela: "profiles",
          operacao: ativo ? "ATIVAR_USUARIO" : "DESATIVAR_USUARIO",
          registro_id: user_id,
          dados_novos: { ativo, motivo },
          usuario_id: caller.id,
        });

        console.log(`User ${user_id} ${ativo ? "activated" : "deactivated"} by ${caller.id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      case "list-activity": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Acesso restrito ao Super Admin." }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const users: any[] = [];
        let page = 1;
        const perPage = 1000;

        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
            );
          }

          users.push(...(data?.users || []));
          if (!data || data.users.length < perPage) break;
          page += 1;
          if (page > 20) break;
        }

        const ids = users.map((u) => u.id);
        const profilesById: Record<string, { nome: string | null; avatar: string | null }> = {};

        if (ids.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, nome_completo, avatar_url")
            .in("id", ids);

          (profiles || []).forEach((p: any) => {
            profilesById[p.id] = { nome: p.nome_completo, avatar: p.avatar_url };
          });
        }

        const result = users.map((u) => ({
          id: u.id,
          email: u.email,
          nome: profilesById[u.id]?.nome ?? null,
          avatar_url: profilesById[u.id]?.avatar ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null,
          banned_until: (u as any).banned_until ?? null,
        }));

        result.sort((a, b) => {
          const ta = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
          const tb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
          return tb - ta;
        });

        return new Response(
          JSON.stringify({ users: result }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      case "impersonate": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Acesso restrito ao Super Admin." }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const { user_id } = body as ImpersonateRequest;

        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "user_id é obrigatório" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        if (user_id === caller.id) {
          return new Response(
            JSON.stringify({ error: "Você já está logado como este usuário." }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (targetError || !target?.user?.email) {
          return new Response(
            JSON.stringify({ error: "Usuário alvo não encontrado." }),
            { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);

        if ((targetRoles || []).some((r: any) => r.role === "superadmin")) {
          return new Response(
            JSON.stringify({ error: "Não é permitido acessar como outro Super Admin." }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const redirectTo = getSafeRedirectTo(req, "/");
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: target.user.email,
          options: redirectTo ? { redirectTo } : undefined,
        });

        if (linkError || !linkData?.properties?.hashed_token) {
          return new Response(
            JSON.stringify({ error: linkError?.message || "Não foi possível gerar o acesso." }),
            { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        try {
          await supabaseAdmin.from("auditoria").insert({
            usuario_id: caller.id,
            acao: "impersonate",
            entidade: "usuario",
            entidade_id: user_id,
            detalhes: { target_email: target.user.email },
          });
        } catch (_) {}

        return new Response(
          JSON.stringify({
            token_hash: linkData.properties.hashed_token,
            email: target.user.email,
            target: {
              id: user_id,
              email: target.user.email,
            },
          }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

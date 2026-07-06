import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email-sender.ts";
import { getResetPasswordTemplate } from "../_shared/email-templates.ts";


interface CreateUserRequest {
  action: "create-user";
  email: string;
  password: string;
  nome_completo: string;
  cpf?: string;
  telefone?: string;
  role?: string;
}

interface UpdateUserRequest {
  action: "update-user";
  user_id: string;
  nome_completo?: string;
  cpf?: string;
  telefone?: string;
}

interface ResetPasswordRequest {
  action: "reset-password";
  email: string;
}

interface ToggleUserStatusRequest {
  action: "toggle-user-status";
  user_id: string;
  ativo: boolean;
  motivo?: string;
}

type RequestBody = CreateUserRequest | UpdateUserRequest | ResetPasswordRequest | ToggleUserStatusRequest;

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

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      console.error("Auth error:", authError);
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
        const { email, password, nome_completo, cpf, telefone, role } = body;

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
            nome_completo,
            cpf: cpf || null,
            telefone: telefone || null,
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
        const { user_id, nome_completo, cpf, telefone } = body;

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
        if (nome_completo !== undefined) updateData.nome_completo = nome_completo;
        if (cpf !== undefined) updateData.cpf = cpf || null;
        if (telefone !== undefined) updateData.telefone = telefone || null;

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
        const { email } = body;

        if (!email) {
          return new Response(
            JSON.stringify({ error: "E-mail é obrigatório" }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        // Send password reset email
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.get("origin")}/auth/redefinir-senha`,
        });

        if (resetError) {
          console.error("Reset password error:", resetError);
          return new Response(
            JSON.stringify({ error: resetError.message }),
            { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        console.log("Password reset email sent to:", email);

        return new Response(
          JSON.stringify({ success: true }),
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

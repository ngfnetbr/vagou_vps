/**
 * Utilitários para mensagens de erro amigáveis
 */

const errorMessages: Record<string, string> = {
  // Erros de autenticação
  "Invalid login credentials": "Email ou senha incorretos",
  "User not found": "Usuário não encontrado",
  "Email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada",
  "Invalid email or password": "Email ou senha inválidos",
  "Password is too short": "A senha deve ter no mínimo 6 caracteres",
  "Email already registered": "Este email já está cadastrado",
  
  // Erros de rede
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "Network Error": "Erro de rede. Verifique sua conexão",
  "Request timeout": "A requisição demorou muito. Tente novamente",
  "Network request failed": "Falha na conexão com o servidor",
  
  // Erros de banco de dados
  "duplicate key value violates unique constraint": "Este registro já existe no sistema",
  "violates foreign key constraint": "Este registro está vinculado a outros dados",
  "null value in column": "Campo obrigatório não preenchido",
  "PGRST301": "Registro não encontrado",
  "PGRST204": "Campo inválido ou recurso não encontrado (banco possivelmente desatualizado). Aplique as migrations e reinicie a API do Supabase.",
  "Could not find the 'fim_em' column": "Banco desatualizado (coluna fim_em ausente). Aplique as migrations e reinicie a API do Supabase.",
  
  // Erros de validação
  "Invalid CPF": "CPF inválido",
  "Invalid phone": "Telefone inválido",
  "Invalid email": "Email inválido",
  "Required field": "Campo obrigatório",
  
  // Erros genéricos
  "Internal server error": "Erro interno do servidor. Tente novamente",
  "Service unavailable": "Serviço temporariamente indisponível",
  "Too many requests": "Muitas tentativas. Aguarde alguns minutos",
};

/**
 * Converte uma mensagem de erro técnica em uma mensagem amigável
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "Ocorreu um erro inesperado";
  
  // Se já for uma string
  if (typeof error === "string") {
    return findFriendlyMessage(error);
  }
  
  // Se for um Error ou objeto com message
  if (error instanceof Error || (typeof error === "object" && "message" in error)) {
    const errorObj = error as { message: string; code?: string; details?: string };
    
    // Verificar code primeiro
    if (errorObj.code && errorMessages[errorObj.code]) {
      return errorMessages[errorObj.code];
    }
    
    return findFriendlyMessage(errorObj.message);
  }
  
  return "Ocorreu um erro inesperado";
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as { name?: unknown; message?: unknown };
    if (err?.name === "AbortError") return true;
    if (typeof err?.message === "string" && err.message.toLowerCase().includes("abort")) return true;
  }
  return false;
}

export function isNetworkFetchError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as { message?: unknown; name?: unknown };
    if (err?.name === "TypeError" && typeof err?.message === "string" && err.message === "Failed to fetch") {
      return true;
    }
    if (typeof err?.message === "string") {
      const msg = err.message.toLowerCase();
      if (msg.includes("failed to fetch")) return true;
      if (msg.includes("networkerror") && msg.includes("fetch")) return true;
    }
  }
  if (typeof error === "string") {
    const msg = error.toLowerCase();
    return msg.includes("failed to fetch") || (msg.includes("networkerror") && msg.includes("fetch"));
  }
  return false;
}

export function shouldRetryQuery(error: unknown, failureCount: number): boolean {
  if (isAbortError(error)) return false;
  if (isNetworkFetchError(error)) return false;
  return failureCount < 2;
}

/**
 * Busca uma mensagem amigável baseada no texto do erro
 */
function findFriendlyMessage(errorText: string): string {
  const normalizedText = errorText.trim();

  // Verificar correspondência exata
  if (errorMessages[normalizedText]) {
    return errorMessages[normalizedText];
  }
  
  // Verificar correspondência parcial
  const lowerText = normalizedText.toLowerCase();
  for (const [key, value] of Object.entries(errorMessages)) {
    if (lowerText.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Se a mensagem for muito técnica, retornar genérica
  if (
    normalizedText.includes("PGRST") ||
    normalizedText.includes("constraint") ||
    normalizedText.includes("SQL") ||
    normalizedText.includes("undefined") ||
    normalizedText.includes("null") ||
    normalizedText.includes("TypeError") ||
    normalizedText.includes("ReferenceError") ||
    normalizedText.includes("SyntaxError")
  ) {
    return "Ocorreu um erro ao processar sua solicitação";
  }
  
  // Se for uma mensagem legível e não técnica, retorná-la mesmo que seja longa
  if (!normalizedText.includes("Error:")) {
    return normalizedText;
  }
  
  return "Ocorreu um erro inesperado";
}

/**
 * Hook helper para mostrar toast com erro amigável
 */
export function toastError(error: unknown, fallbackMessage?: string): string {
  const message = fallbackMessage || getErrorMessage(error);
  return message;
}

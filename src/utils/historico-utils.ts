// Utilitários para exibição de histórico
import { fixMojibake } from "@/utils/encoding-fix";

/**
 * Mapeia ações técnicas para labels amigáveis
 */
export const getAcaoLabel = (acao: string): string => {
  const normalized = fixMojibake(acao) ?? acao;
  const labels: Record<string, string> = {
    // Notificações de WhatsApp/Email/SMS (formato: notificacao_tipo)
    "notificacao_convocacao": "📱 WhatsApp: Convocação Enviada",
    "notificacao_inscricao_realizada": "📱 WhatsApp: Confirmação de Inscrição",
    "notificacao_inscricao_fila": "📱 WhatsApp: Confirmação de Inscrição",
    "notificacao_matricula_confirmada": "📱 WhatsApp: Matrícula Confirmada",
    "notificacao_matricula": "📱 WhatsApp: Matrícula Confirmada",
    "notificacao_lembrete_prazo": "📱 WhatsApp: Lembrete de Prazo",
    "notificacao_lembrete": "📱 WhatsApp: Lembrete de Prazo",
    "notificacao_fim_fila": "📱 WhatsApp: Fim de Fila",
    "notificacao_desistencia": "📱 WhatsApp: Desistência Registrada",
    "notificacao_recusa": "📱 WhatsApp: Recusa de Vaga",
    "notificacao_documento_recusado": "📱 WhatsApp: Documento Recusado",
    "notificacao_documentos_aprovados": "📱 WhatsApp: Documentos Aprovados",
    "notificacao_remanejamento_solicitado": "📱 WhatsApp: Remanejamento Solicitado",
    "notificacao_remanejamento_concluido": "📱 WhatsApp: Remanejamento Concluído",
    "notificacao_remanejamento": "📱 WhatsApp: Remanejamento",
    "notificacao_prazo_expirado": "📱 WhatsApp: Prazo Expirado",
    "reenvio_notificacao": "📱 Reenvio de Notificação",
    
    // Inscrição
    "Inscrição Realizada": "Inscrição Realizada",
    "inscricao_realizada": "Inscrição Realizada",
    
    // Convocação
    "Convocação": "Convocação para Matrícula",
    "Convocado": "Convocação para Matrícula",
    "convocacao": "Convocação para Matrícula",
    "Convocação para Matrícula": "Convocação para Matrícula",
    
    // Matrícula
    "Matrícula Confirmada": "Matrícula Confirmada",
    "matricula_confirmada": "Matrícula Confirmada",
    "Matriculado": "Matrícula Confirmada",
    
    // Recusa e Desistência
    "Convocação Recusada": "Convocação Recusada",
    "convocacao_recusada": "Convocação Recusada",
    "Recusada": "Convocação Recusada",
    "Marcado como Desistente": "Desistência Registrada",
    "Desistência": "Desistência Registrada",
    "desistente": "Desistência Registrada",
    
    // Reativação
    "Criança Reativada": "Criança Reativada",
    "reativacao": "Criança Reativada",
    "Reativação": "Criança Reativada",
    
    // Remanejamento
    "Solicitação de Remanejamento": "Remanejamento Solicitado",
    "Remanejamento Solicitado": "Remanejamento Solicitado",
    "remanejamento_solicitado": "Remanejamento Solicitado",
    "Remanejamento Cancelado": "Remanejamento Cancelado",
    "remanejamento_cancelado": "Remanejamento Cancelado",
    "Remanejamento Concluído": "Remanejamento Concluído",
    
    // Transferência
    "Transferência Efetivada": "Transferência Efetivada",
    "transferencia_efetivada": "Transferência Efetivada",
    
    // Realocação
    "Realocação de Turma": "Realocação de Turma",
    "realocacao_turma": "Realocação de Turma",
    
    // Prazo
    "Prazo de Convocação Expirado": "Prazo de Convocação Expirado",
    "prazo_expirado": "Prazo de Convocação Expirado",
    "Fim de Fila": "Movido para Fim de Fila",
    "fim_fila": "Movido para Fim de Fila",
    
    // Documentos
    "documento_enviado": "Documento Enviado",
    "documento_aprovado": "Documento Aprovado",
    "documento_recusado": "Documento Recusado",
    "Documento Enviado": "Documento Enviado",
    "Documento Aprovado": "Documento Aprovado",
    "Documento Recusado": "Documento Recusado",
    
    // Prioridades
    "prioridade_aprovada": "Prioridade Aprovada",
    "prioridade_recusada": "Prioridade Recusada",
    "Prioridade Aprovada": "Prioridade Aprovada",
    "Prioridade Recusada": "Prioridade Recusada",
    
    // Atualização de dados
    "dados_atualizados": "Dados Cadastrais Atualizados",
    "Dados Atualizados": "Dados Cadastrais Atualizados",
  };

  return labels[normalized] || normalized;
};

/**
 * Retorna a cor do ícone baseado na ação
 */
export const getAcaoColor = (acao: string): string => {
  const label = (fixMojibake(acao) ?? acao).toLowerCase();
  
  if (label.includes("notificacao") || label.includes("notificação") || label.includes("lembrete") || label.includes("reenvio")) {
    return "text-blue-500";
  }
  if (label.includes("matricula") || label.includes("matrícula") || label.includes("confirmad") || label.includes("aprovad")) {
    return "text-green-500";
  }
  if (label.includes("convocad") || label.includes("convocação")) {
    return "text-yellow-500";
  }
  if (label.includes("recusad") || label.includes("desistent") || label.includes("expirad") || label.includes("fim")) {
    return "text-red-500";
  }
  if (label.includes("remanejamento") || label.includes("transferência") || label.includes("realocação")) {
    return "text-purple-500";
  }
  if (label.includes("reativad")) {
    return "text-emerald-500";
  }
  
  return "text-primary";
};

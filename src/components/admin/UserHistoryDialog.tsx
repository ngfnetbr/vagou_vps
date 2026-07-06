import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, User, Shield, School, Ban, CheckCircle } from "lucide-react";
import { useUsuarioHistorico, Usuario } from "@/hooks/api/usuarios-hooks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

const getOperacaoLabel = (operacao: string, tabela: string): { label: string; icon: React.ReactNode; color: string } => {
  const operacaoLower = operacao.toLowerCase();
  
  if (operacaoLower === "ativar_usuario") {
    return { label: "Usuário Ativado", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-800" };
  }
  if (operacaoLower === "desativar_usuario") {
    return { label: "Usuário Desativado", icon: <Ban className="h-4 w-4" />, color: "bg-red-100 text-red-800" };
  }
  
  if (tabela === "user_roles") {
    if (operacaoLower === "insert") {
      return { label: "Papel Adicionado", icon: <Shield className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" };
    }
    if (operacaoLower === "delete") {
      return { label: "Papel Removido", icon: <Shield className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" };
    }
  }
  
  if (tabela === "diretor_cmei_vinculo") {
    if (operacaoLower === "insert") {
      return { label: "Unidade Vinculada", icon: <School className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" };
    }
    if (operacaoLower === "delete") {
      return { label: "Unidade Desvinculada", icon: <School className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" };
    }
  }
  
  if (tabela === "profiles") {
    if (operacaoLower === "insert") {
      return { label: "Perfil Criado", icon: <User className="h-4 w-4" />, color: "bg-green-100 text-green-800" };
    }
    if (operacaoLower === "update") {
      return { label: "Perfil Atualizado", icon: <User className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" };
    }
  }
  
  return { label: operacao, icon: <History className="h-4 w-4" />, color: "bg-gray-100 text-gray-800" };
};

const formatDadosAlterados = (dadosAntigos: any, dadosNovos: any): string[] => {
  const alteracoes: string[] = [];
  
  if (!dadosAntigos && dadosNovos) {
    // Insert operation
    if (dadosNovos.role) {
      alteracoes.push(`Papel: ${dadosNovos.role}`);
    }
    if (dadosNovos.nome_completo) {
      alteracoes.push(`Nome: ${dadosNovos.nome_completo}`);
    }
    if (dadosNovos.motivo) {
      alteracoes.push(`Motivo: ${dadosNovos.motivo}`);
    }
    return alteracoes;
  }
  
  if (dadosAntigos && dadosNovos) {
    // Update operation
    const campos = ["nome_completo", "cpf", "telefone", "ativo", "role"];
    for (const campo of campos) {
      if (dadosAntigos[campo] !== dadosNovos[campo]) {
        const valorAntigo = dadosAntigos[campo] ?? "(vazio)";
        const valorNovo = dadosNovos[campo] ?? "(vazio)";
        alteracoes.push(`${campo}: ${valorAntigo} → ${valorNovo}`);
      }
    }
    if (dadosNovos.motivo) {
      alteracoes.push(`Motivo: ${dadosNovos.motivo}`);
    }
  }
  
  if (dadosAntigos && !dadosNovos) {
    // Delete operation
    if (dadosAntigos.role) {
      alteracoes.push(`Papel: ${dadosAntigos.role}`);
    }
  }
  
  return alteracoes;
};

export function UserHistoryDialog({ open, onOpenChange, usuario }: UserHistoryDialogProps) {
  const { data: historico, isLoading } = useUsuarioHistorico(usuario?.id || null);

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            Histórico de alterações do usuário <strong>{usuario.nome_completo || usuario.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : historico && historico.length > 0 ? (
            <div className="space-y-4">
              {historico.map((item) => {
                const { label, icon, color } = getOperacaoLabel(item.operacao, item.tabela);
                const alteracoes = formatDadosAlterados(item.dados_antigos, item.dados_novos);
                
                return (
                  <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full ${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={color}>
                          {label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.created_at
                            ? format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : ""}
                        </span>
                      </div>
                      {alteracoes.length > 0 && (
                        <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                          {alteracoes.map((alt, i) => (
                            <li key={i} className="truncate">{alt}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum histórico encontrado para este usuário.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


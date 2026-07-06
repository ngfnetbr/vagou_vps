// @ts-nocheck
import { Settings } from "lucide-react";

export default function Configuracoes() {
  return (
    <>
      <div className="space-y-6 max-w-3xl">
      <div className="rounded-2xl bg-card p-6 shadow-sm border space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Escopo da configuração do módulo</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Usuários, permissões, acesso aos módulos, SMTP global, segurança e auditoria central agora ficam no Sistema Principal.
          Cabeçalho, rodapé e demais configurações visuais também passam a usar o padrão do Sistema Principal.
        </p>
      </div>
    </div>
    </>
  );
}

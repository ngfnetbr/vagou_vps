import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import PermissoesTab from "@/components/admin/PermissoesTab";

export default function SuperAdminPermissoes() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold">Permissões</h1>
          <p className="text-muted-foreground">
            Defina o que cada papel pode fazer em cada módulo do ecossistema.
          </p>
        </div>

        <PermissoesTab />
      </div>
    </SuperAdminLayout>
  );
}

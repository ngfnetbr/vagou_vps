import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import { ModuleAccessSettings } from "@/components/admin/ModuleAccessSettings";

export default function SuperAdminModulos() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold">Acesso aos Módulos</h1>
          <p className="text-muted-foreground">
            Habilite VAGOU, SONDAR e SAM no município e libere o acesso por papel.
          </p>
        </div>

        <ModuleAccessSettings />
      </div>
    </SuperAdminLayout>
  );
}

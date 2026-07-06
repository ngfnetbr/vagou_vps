import { Route } from "react-router-dom";

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
      <p className="text-muted-foreground">Módulo em preparação.</p>
    </div>
  );
}

export function SamModuleRoutes() {
  return <Route path="/modulo/sam/*" element={<ComingSoon name="SAM" />} />;
}

export function SondagemModuleRoutes() {
  return <Route path="/modulo/sondar/*" element={<ComingSoon name="SONDAR" />} />;
}

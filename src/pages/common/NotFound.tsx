import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Página não encontrada | 404";
  }, [location.pathname]);

  return (
    <PublicLayout>
      <div className="flex flex-1 flex-col items-center justify-center p-4 py-20 text-center animate-in fade-in duration-500">
        <h1 className="text-[8rem] font-black leading-none tracking-tighter text-primary/90 md:text-[10rem]">
          404 <span className="text-muted-foreground/30">:(</span>
        </h1>
        
        <h2 className="mt-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Oops! Esta página não pode ser encontrada!
        </h2>
        
        <p className="mt-4 max-w-[600px] text-lg text-muted-foreground">
          Parece que não conseguimos encontrar o que você está procurando. 
          Por favor, verifique o URL ou volte para a página inicial.
        </p>

        <Button 
          onClick={() => navigate("/")} 
          size="lg" 
          className="mt-10 h-12 px-8 text-base"
        >
          <Home className="mr-2 h-5 w-5" />
          Voltar para o Início
        </Button>
      </div>
    </PublicLayout>
  );
};

export default NotFound;

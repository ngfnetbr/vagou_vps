import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string | null | undefined) {
  if (!name) return "U";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0]?.substring(0, 2).toUpperCase() || "U";
}

/**
 * Menu de usuário padronizado (nome, função e foto) usado nos cabeçalhos
 * de todos os módulos, idêntico ao VAGOU.
 */
export function HeaderUserMenu() {
  const { user, signOut, userProfile, getPrimaryRole } = useAuth();
  const { pathname } = useLocation();

  const perfilPath = pathname.startsWith("/modulo/sam")
    ? "/modulo/sam/perfil"
    : pathname.startsWith("/modulo/sondar")
    ? "/modulo/sondar/perfil"
    : "/modulo/vagou/admin/perfil";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 md:gap-3 h-auto py-1.5 px-2 md:py-2 md:px-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-medium text-foreground">
              {userProfile?.nome_completo || user?.email?.split("@")[0] || "Usuário"}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{getPrimaryRole()}</p>
          </div>
          <Avatar className="h-8 w-8 md:h-9 md:w-9">
            <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.nome_completo || "Avatar"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
              {getInitials(userProfile?.nome_completo)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-medium">{userProfile?.nome_completo || "Usuário"}</p>
            <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={perfilPath} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HeaderUserMenu;

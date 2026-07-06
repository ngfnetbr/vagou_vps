import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  ArchiveRestore,
  Pin,
  PinOff,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatConversaActionsProps {
  responsavelId: string;
  isArchived?: boolean;
  isPinned?: boolean;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: "list" | "header";
}

export function ChatConversaActions({
  responsavelId,
  isArchived,
  isPinned,
  onArchive,
  onUnarchive,
  onPin,
  onUnpin,
  onDelete,
  variant = "list",
}: ChatConversaActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 transition-opacity",
            variant === "list" && "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isPinned ? (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onUnpin(responsavelId);
            }}
          >
            <PinOff className="h-4 w-4 mr-2" />
            Desafixar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onPin(responsavelId);
            }}
          >
            <Pin className="h-4 w-4 mr-2" />
            Fixar conversa
          </DropdownMenuItem>
        )}

        {isArchived ? (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onUnarchive(responsavelId);
            }}
          >
            <ArchiveRestore className="h-4 w-4 mr-2" />
            Desarquivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onArchive(responsavelId);
            }}
          >
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </DropdownMenuItem>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar conversa
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todas as mensagens desta
                    conversa serão permanentemente excluídas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(responsavelId)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


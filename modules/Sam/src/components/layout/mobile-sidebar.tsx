import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X, GraduationCap, LogOut } from "lucide-react"
import { Button } from "@ui/button"
import { cn } from "@root/lib/utils"
import { sidebarItems } from "./sidebar"
import { useAuth } from "@root/contexts/AuthContext"

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <Menu className="h-6 w-6" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative flex h-full w-64 flex-col bg-primary text-primary-foreground shadow-xl animate-in slide-in-from-left duration-300">
            <div className="flex h-20 items-center justify-between border-b border-primary-foreground/20 px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shrink-0">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="leading-tight">
                  <h1 className="font-bold">SAM</h1>
                  <span className="text-xs opacity-80">Educacional</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-white text-primary shadow-sm"
                        : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-primary-foreground/20 p-4">
              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



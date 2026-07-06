// @ts-nocheck
import { Button } from "@ui/button"
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardFooter, CardHeader } from "@ui/card"
import { GraduationCap, LogIn } from "lucide-react"
import { Link, Navigate, useLocation } from "react-router-dom"
import { useEffect, useMemo } from "react"
import { useAuth } from "@root/contexts/AuthContext"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()

  const returnTo = useMemo(() => {
    const p = new URLSearchParams(location.search)
    return p.get("returnTo") || "/modulo/sam/dashboard"
  }, [location.search])

  useEffect(() => {
    if (loading || user) return
    const url = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
    const timeout = setTimeout(() => {
      window.location.assign(url)
    }, 200)
    return () => clearTimeout(timeout)
  }, [loading, user, returnTo])

  if (!loading && user) {
    return <Navigate to={returnTo} replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background bg-gradient-to-br from-primary/10 via-background to-background">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">SAM</h1>
          <p className="text-sm text-muted-foreground">Sistema de Atendimento Multidisciplinar</p>
        </div>
      </div>

      {/* Card */}
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="pb-4 pt-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">Entrar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            O SAM usa o login do Sistema Principal.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 px-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <Spinner className="h-4 w-4 animate-spin text-primary" />
            Redirecionando para o login...
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 px-8 pb-8 pt-2">
          <Button className="w-full h-10 font-semibold" type="button" onClick={() => window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)}>
            <LogIn className="mr-2 h-4 w-4" />
            Ir para o login
          </Button>
          <Link to={`/modulo/sam/login/escola?returnTo=${encodeURIComponent("/modulo/sam/escola/dashboard")}`} className="text-xs text-primary hover:text-primary/80 transition-colors">
            Acesso para coordenadores de escola →
          </Link>
        </CardFooter>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Secretaria Municipal de Educação
      </p>
    </div>
  )
}


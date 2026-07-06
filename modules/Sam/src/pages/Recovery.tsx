// @ts-nocheck
import { Button } from "@ui/button"
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@ui/card"
import { Mail, ArrowLeft } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useEffect, useMemo } from "react"

export default function RecoveryPage() {
  const location = useLocation()
  const returnTo = useMemo(() => {
    const p = new URLSearchParams(location.search)
    return p.get("returnTo") || "/modulo/sam/dashboard"
  }, [location.search])

  useEffect(() => {
    const url = `/auth/recuperar-senha?returnTo=${encodeURIComponent(returnTo)}`
    const timeout = setTimeout(() => {
      window.location.assign(url)
    }, 200)
    return () => clearTimeout(timeout)
  }, [returnTo])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230942aa' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
           }} />

      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-500 z-10 relative">
        <Card className="border-0 shadow-xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="space-y-1 text-center pb-2 bg-muted/30 pt-6">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Recuperação de Senha</CardTitle>
            <CardDescription className="text-gray-500">
              Você será redirecionado para a recuperação do Sistema Principal
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
              <Spinner className="h-4 w-4 animate-spin text-primary" />
              Redirecionando...
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
            <Button className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all" type="button" onClick={() => window.location.assign(`/auth/recuperar-senha?returnTo=${encodeURIComponent(returnTo)}`)}>
              Ir para recuperação
            </Button>
            <Button asChild variant="link" className="w-full text-gray-500">
              <Link to="/modulo/sam/login" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}



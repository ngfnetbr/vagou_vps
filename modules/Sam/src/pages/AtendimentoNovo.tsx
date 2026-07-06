import { useEffect, useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@ui/button"
import { ArrowLeft } from "lucide-react"
import { NovoAtendimentoForm } from "@sam/components/atendimentos/novo-atendimento-form"
import { supabase } from "@sam/integrations/supabase/client"

export default function AtendimentoNovo() {
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get("appointmentId") || undefined
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [userSpecialty, setUserSpecialty] = useState("")
  const [userRegistration, setUserRegistration] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, specialty, registration_number")
          .eq("id", user.id)
          .single()
        setUserName(profile?.full_name || user.email || "")
        setUserSpecialty(profile?.specialty || "")
        setUserRegistration(profile?.registration_number || "")
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link to="/modulo/sam/atendimentos"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-base font-semibold text-foreground">Novo Atendimento</h2>
            <p className="text-xs text-muted-foreground">Registre uma sessão de atendimento realizada.</p>
          </div>
        </div>
        {userId && (
          <NovoAtendimentoForm
            currentUserId={userId}
            currentUserName={userName}
            currentUserSpecialty={userSpecialty}
            currentUserRegistration={userRegistration}
            appointmentId={appointmentId}
          />
        )}
      </div>
    </>
  )
}

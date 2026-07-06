// @ts-nocheck
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@ui/button"
import { ArrowLeft, CalendarPlus } from "lucide-react"
import { AppointmentForm } from "@sam/components/appointments/appointment-form"
import { supabase } from "@sam/integrations/supabase/client"
import { getProfessionals } from "@sam/lib/actions/usuarios"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { PageHeader } from "@root/components/common/page-header"

export default function AgendaNovo() {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const canCreate = useCanAccess(["modulos.sam.acessar", "sam.atendimentos.criar"])

  useEffect(() => {
    const load = async () => {
      const [profs, typesRes] = await Promise.all([
        getProfessionals(),
        (supabase as any).from("appointment_types").select("id, name, active").eq("active", true),
      ])
      setProfessionals(profs || [])
      setTypes(typesRes.data || [])
    }
    load()
  }, [])

  if (!canCreate) {
    return (
      <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
        Você não tem permissão para criar agendamentos.
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <PageHeader
        leading={
          <Button variant="outline" size="icon" className="rounded-full" asChild>
            <Link to="/modulo/sam/agenda"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
        }
        title={
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarPlus className="h-6 w-6 text-primary" />
            Novo Agendamento
          </h1>
        }
        description="Preencha os dados para agendar um atendimento."
      />
      <AppointmentForm professionals={professionals} types={types} />
    </div>
  )
}

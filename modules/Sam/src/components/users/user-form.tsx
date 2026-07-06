// @ts-nocheck
import { useState, useEffect } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Card, CardContent } from "@ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Switch } from "@ui/switch"
import { ArrowLeft, User, Mail, Shield, Save, Lock, School } from "lucide-react"
import { createUser, updateUser } from "@sam/lib/actions/usuarios"
import { getSchools } from "@sam/lib/actions/escolas"

const userFormSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().optional(),
  role: z.enum(["admin", "professional", "school_coord"]),
  specialty_id: z.string().optional(),
  school_id: z.string().optional(),
  permissions: z.object({
    dashboard: z.boolean(),
    appointments: z.boolean(),
    students: z.boolean(),
    queixas: z.boolean(),
    reports: z.boolean(),
    users: z.boolean(),
    settings: z.boolean(),
    audit: z.boolean(),
  })
})

type UserFormValues = z.infer<typeof userFormSchema>

const defaultPermissions = {
  dashboard: true, appointments: false, students: false, queixas: false,
  reports: false, users: false, settings: false, audit: false,
}

interface UserFormProps {
  initialData?: any
  isEditing?: boolean
  specialties?: { id: string; name: string }[]
}

export function UserForm({ initialData, isEditing = false, specialties = [] }: UserFormProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    getSchools().then((data) => setSchools(data || []))
  }, [])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData ? {
      full_name: initialData.full_name, email: initialData.email, role: initialData.role,
      specialty_id: initialData.specialty_id || "", school_id: initialData.school_id || "",
      permissions: { ...defaultPermissions, ...initialData.permissions }, password: ""
    } : {
      full_name: "", email: "", password: "", role: "professional", specialty_id: "", school_id: "", permissions: defaultPermissions
    }
  })

  const role = form.watch("role")

  const handleRoleChange = (value: "admin" | "professional" | "school_coord") => {
    form.setValue("role", value)
    if (value === "admin") {
      form.setValue("permissions", { dashboard: true, appointments: true, students: true, queixas: true, reports: true, users: true, settings: true, audit: true })
    } else if (value === "professional") {
      form.setValue("permissions", { dashboard: true, appointments: true, students: true, queixas: true, reports: false, users: false, settings: false, audit: false })
    } else {
      // school_coord: only dashboard and queixas by default
      form.setValue("permissions", { dashboard: true, appointments: false, students: false, queixas: true, reports: false, users: false, settings: false, audit: false })
    }
  }

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true)
    try {
      let result
      if (isEditing && initialData?.id) {
        result = await updateUser(initialData.id, data)
      } else {
        if (!data.password && !isEditing) { alert("Senha é obrigatória para novos usuários"); setIsSubmitting(false); return }
        result = await createUser(data)
      }
      if (result.success) {
        alert(isEditing ? "Usuário atualizado com sucesso!" : "Usuário criado com sucesso!")
        navigate("/modulo/sam/configuracoes?tab=usuarios")
      } else {
        alert("Erro: " + result.error)
      }
    } catch { alert("Erro inesperado") } finally { setIsSubmitting(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-4 border-b pb-6">
        <Button variant="ghost" size="icon" asChild className="h-10 w-10">
          <Link to="/modulo/sam/configuracoes?tab=usuarios"><ArrowLeft className="h-6 w-6 text-muted-foreground" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{isEditing ? "Editar Usuário" : "Novo Usuário"}</h2>
          <p className="text-muted-foreground">Preencha os dados e defina as permissões de acesso.</p>
        </div>
      </div>

      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary border-b pb-2"><User className="h-5 w-5" /><h3 className="text-lg font-semibold">Dados Pessoais e Acesso</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <div className="relative"><User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="full_name" className="pl-10 h-11" placeholder="Ex: Ana Silva" {...form.register("full_name")} /></div>
                  {form.formState.errors.full_name && <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Institucional</Label>
                  <div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="email" type="email" className="pl-10 h-11" placeholder="email@escola.com" {...form.register("email")} disabled={isEditing} /></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{isEditing ? "Nova Senha (opcional)" : "Senha Inicial"}</Label>
                  <div className="relative"><Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="password" type="password" className="pl-10 h-11" placeholder="******" {...form.register("password")} /></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil de Acesso</Label>
                  <Select onValueChange={(val: any) => handleRoleChange(val)} defaultValue={role}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Gestor</SelectItem>
                      <SelectItem value="professional">Especialista (fono, psico, médico, etc.)</SelectItem>
                      <SelectItem value="school_coord">Portal da Escola</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === "professional" && (
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Select defaultValue={form.getValues("specialty_id") || undefined} onValueChange={(val) => form.setValue("specialty_id", val)}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Selecione a especialidade" /></SelectTrigger>
                      <SelectContent>
                        {specialties.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma especialidade cadastrada</div> : specialties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {role === "school_coord" && (
                  <div className="space-y-2">
                    <Label>Escola Vinculada</Label>
                    <Select defaultValue={form.getValues("school_id") || undefined} onValueChange={(val) => form.setValue("school_id", val)}>
                      <SelectTrigger className="h-11">
                        <div className="flex items-center gap-2">
                          <School className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Selecione a escola" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {schools.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma escola cadastrada</div> : schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary border-b pb-2"><Shield className="h-5 w-5" /><h3 className="text-lg font-semibold">Permissões de Módulo</h3></div>
              {role === "school_coord" && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  Coordenadores escolares possuem acesso restrito ao Portal da Escola. Os módulos abaixo controlam o que estará visível.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {[
                  { id: "dashboard", label: "Dashboard" }, { id: "appointments", label: "Agendamentos" },
                  { id: "students", label: "Prontuários (Alunos)" }, { id: "queixas", label: "Queixas Escolares" },
                  { id: "reports", label: "Relatórios" }, { id: "users", label: "Gestão de Usuários" },
                  { id: "settings", label: "Configurações" }, { id: "audit", label: "Auditoria" },
                ].map((module) => (
                  <div key={module.id} className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <Label htmlFor={`perm-${module.id}`} className="text-base font-medium cursor-pointer">{module.label}</Label>
                    <Switch id={`perm-${module.id}`} checked={form.watch(`permissions.${module.id}` as any)} onCheckedChange={(checked) => form.setValue(`permissions.${module.id}` as any, checked)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" type="button" asChild><Link to="/modulo/sam/configuracoes?tab=usuarios">Cancelar</Link></Button>
              <Button type="submit" className="w-40" disabled={isSubmitting}>
                {isSubmitting ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />Salvar Usuário</>)}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


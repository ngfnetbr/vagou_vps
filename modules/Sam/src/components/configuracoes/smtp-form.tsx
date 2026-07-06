"use client"

import { useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Switch } from "@ui/switch"
import { Save, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { saveSmtpConfig, testSmtpConnection, SmtpConfigData } from "@sam/lib/actions/configuracoes"
import { Alert, AlertDescription, AlertTitle } from "@ui/alert"

const smtpSchema = z.object({
  host: z.string().min(1, "Host é obrigatório"),
  port: z.coerce.number().min(1, "Porta inválida"),
  secure: z.boolean(),
  auth: z.object({ user: z.string().min(1, "Usuário é obrigatório"), pass: z.string().min(1, "Senha é obrigatória") }),
  sender: z.object({ email: z.string().email("E-mail remetente inválido"), name: z.string().min(1, "Nome remetente é obrigatório") }),
})

type SmtpFormValues = z.infer<typeof smtpSchema>

interface SmtpFormProps { initialData?: SmtpConfigData | null }

export function SmtpForm({ initialData }: SmtpFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const form = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: initialData?.settings || { host: "", port: 587, secure: false, auth: { user: "", pass: "" }, sender: { email: "", name: "SAM System" } },
  })

  async function onTest() {
    const data = form.getValues()
    const result = smtpSchema.safeParse(data)
    if (!result.success) { form.trigger(); return }
    setIsTesting(true); setTestResult(null)
    try {
      const response = await testSmtpConnection(data)
      setTestResult(response.success ? { success: true, message: "Conexão estabelecida com sucesso!" } : { success: false, message: response.error || "Erro ao conectar" })
    } catch { setTestResult({ success: false, message: "Erro inesperado ao testar conexão" }) }
    finally { setIsTesting(false) }
  }

  async function onSubmit(data: SmtpFormValues) {
    setIsSubmitting(true)
    try {
      const result = await saveSmtpConfig({ settings: data, is_active: true })
      if (result.success) alert("Configurações SMTP salvas com sucesso!")
      else alert("Erro ao salvar: " + result.error)
    } catch { alert("Erro inesperado") }
    finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="host">Servidor SMTP (Host)</Label><Input id="host" placeholder="smtp.exemplo.com" {...form.register("host")} />{form.formState.errors.host && <p className="text-sm text-destructive">{form.formState.errors.host.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="port">Porta</Label><Input id="port" type="number" placeholder="587" {...form.register("port")} />{form.formState.errors.port && <p className="text-sm text-destructive">{form.formState.errors.port.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="user">Usuário SMTP</Label><Input id="user" placeholder="seu-email@exemplo.com" {...form.register("auth.user")} />{form.formState.errors.auth?.user && <p className="text-sm text-destructive">{form.formState.errors.auth.user.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="pass">Senha SMTP</Label><Input id="pass" type="password" placeholder="••••••••" {...form.register("auth.pass")} />{form.formState.errors.auth?.pass && <p className="text-sm text-destructive">{form.formState.errors.auth.pass.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="sender_name">Nome do Remetente</Label><Input id="sender_name" placeholder="Sistema SAM" {...form.register("sender.name")} /></div>
        <div className="space-y-2"><Label htmlFor="sender_email">E-mail do Remetente</Label><Input id="sender_email" placeholder="no-reply@exemplo.com" {...form.register("sender.email")} /></div>
        <div className="flex items-center space-x-2 pt-8"><Switch id="secure" checked={form.watch("secure")} onCheckedChange={(checked) => form.setValue("secure", checked)} /><Label htmlFor="secure">Usar SSL/TLS (Secure)</Label></div>
      </div>
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{testResult.success ? "Sucesso" : "Falha na conexão"}</AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onTest} disabled={isTesting || isSubmitting}>
          {isTesting ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Testando...</>) : (<><RefreshCw className="mr-2 h-4 w-4" />Testar Conexão</>)}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />Salvar Configurações</>)}
        </Button>
      </div>
    </form>
  )
}

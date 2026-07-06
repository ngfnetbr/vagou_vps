'use client'

import { useState } from 'react'
import { Spinner } from "@/components/common/Spinner";
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, AlertCircle, Save } from 'lucide-react'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Switch } from '@ui/switch'
import { Textarea } from '@ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs"
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'

import { saveIntegrationConfig, testIntegrationConnection, IntegrationConfigData } from '@sam/lib/actions/configuracoes'

interface Recipients {
  student: boolean
  professional: boolean
  admin_copy_email: string
}

interface Settings {
  templates: {
    appointment_confirmed: string
    appointment_reminder: string
    reschedule_request: string
  }
  triggers: {
    appointment_confirmed: boolean
    appointment_reminder: boolean
    reschedule_request: boolean
  }
  schedule: {
    active_hours_start: string
    active_hours_end: string
  }
  recipients: Recipients
  retry: {
    enabled: boolean
    max_attempts: number
  }
  logs_enabled: boolean
}

const formSchema = z.object({
  api_key: z.string().min(1, "Chave de API é obrigatória"),
  webhook_url: z.string().url("URL do Webhook inválida"),
  is_active: z.boolean(),
  settings: z.object({
    templates: z.object({
      appointment_confirmed: z.string().min(10, "Template muito curto"),
      appointment_reminder: z.string().min(10, "Template muito curto"),
      reschedule_request: z.string().min(10, "Template muito curto"),
    }),
    triggers: z.object({
      appointment_confirmed: z.boolean(),
      appointment_reminder: z.boolean(),
      reschedule_request: z.boolean(),
    }),
    schedule: z.object({
      active_hours_start: z.string(),
      active_hours_end: z.string(),
    }),
    retry: z.object({
      enabled: z.boolean(),
      max_attempts: z.number().min(1).max(5),
    }),
    logs_enabled: z.boolean(),
  })
})

interface IntegrationsFormProps {
  initialData: any
}

export function IntegrationsForm({ initialData }: IntegrationsFormProps) {
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<IntegrationConfigData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      api_key: initialData?.api_key || '',
      webhook_url: initialData?.webhook_url || '',
      is_active: initialData?.is_active || false,
      settings: {
        templates: initialData?.settings?.templates || {
          appointment_confirmed: "Olá {student_name}, seu agendamento foi confirmado para {date} às {time}.",
          appointment_reminder: "Lembrete: Você tem um agendamento amanhã às {time}.",
          reschedule_request: "Sua solicitação de remarcação foi recebida."
        },
        triggers: initialData?.settings?.triggers || {
          appointment_confirmed: true,
          appointment_reminder: true,
          reschedule_request: true
        },
        schedule: initialData?.settings?.schedule || {
          active_hours_start: "08:00",
          active_hours_end: "18:00",
        },
        recipients: initialData?.settings?.recipients || {
          student: true,
          professional: false,
          admin_copy_email: ""
        },
        retry: initialData?.settings?.retry || {
          enabled: true,
          max_attempts: 3
        },
        logs_enabled: initialData?.settings?.logs_enabled ?? true
      }
    }
  })

  const handleTestConnection = async () => {
    const url = form.getValues('webhook_url')
    if (!url) { form.setError('webhook_url', { message: 'URL necessária para teste' }); return }
    setIsTesting(true); setTestResult(null)
    try {
      const result = await testIntegrationConnection(url)
      setTestResult(result.success ? { success: true, message: 'Conexão estabelecida com sucesso!' } : { success: false, message: result.error || 'Falha na conexão' })
    } catch { setTestResult({ success: false, message: 'Erro ao testar conexão' }) }
    finally { setIsTesting(false) }
  }

  const onSubmit = async (data: IntegrationConfigData) => {
    setIsSaving(true); setTestResult(null)
    try {
      const result = await saveIntegrationConfig(data)
      setTestResult(result.success ? { success: true, message: 'Configurações salvas com sucesso!' } : { success: false, message: result.error || 'Erro ao salvar' })
    } catch { setTestResult({ success: false, message: 'Erro inesperado ao salvar' }) }
    finally { setIsSaving(false) }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Status da Integração</h3>
          <p className="text-sm text-muted-foreground">Ative ou desative a integração globalmente.</p>
        </div>
        <div className="flex items-center gap-2">
           <Label htmlFor="is_active" className="cursor-pointer">{form.watch('is_active') ? 'Ativo' : 'Inativo'}</Label>
           <Switch id="is_active" checked={form.watch('is_active')} onCheckedChange={(checked) => form.setValue('is_active', checked)} />
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="regras">Regras & Agendamento</TabsTrigger>
          <TabsTrigger value="logs">Logs & Retry</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle>Credenciais e Conexão</CardTitle><CardDescription>Configure a conexão com o Make/Zapi.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api_key">Chave de API (API Key)</Label>
                <Input id="api_key" type="password" placeholder="Ex: mk_..." {...form.register('api_key')} />
                {form.formState.errors.api_key && <p className="text-sm text-destructive">{form.formState.errors.api_key.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_url">URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input id="webhook_url" placeholder="https://hook.us1.make.com/..." {...form.register('webhook_url')} />
                  <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                    {isTesting ? <Spinner className="h-4 w-4 animate-spin" /> : 'Testar'}
                  </Button>
                </div>
                {form.formState.errors.webhook_url && <p className="text-sm text-destructive">{form.formState.errors.webhook_url.message}</p>}
              </div>
              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{testResult.success ? "Sucesso" : "Erro"}</AlertTitle>
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle>Templates de Mensagem</CardTitle><CardDescription>Personalize o texto enviado em cada notificação.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Confirmação de Agendamento</Label><Switch checked={form.watch('settings.triggers.appointment_confirmed')} onCheckedChange={(c) => form.setValue('settings.triggers.appointment_confirmed', c)} /></div>
                <Textarea {...form.register('settings.templates.appointment_confirmed')} rows={3} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Lembrete (24h antes)</Label><Switch checked={form.watch('settings.triggers.appointment_reminder')} onCheckedChange={(c) => form.setValue('settings.triggers.appointment_reminder', c)} /></div>
                <Textarea {...form.register('settings.templates.appointment_reminder')} rows={3} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Solicitação de Remarcação</Label><Switch checked={form.watch('settings.triggers.reschedule_request')} onCheckedChange={(c) => form.setValue('settings.triggers.reschedule_request', c)} /></div>
                <Textarea {...form.register('settings.templates.reschedule_request')} rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle>Destinatários</CardTitle><CardDescription>Quem deve receber as notificações.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4"><Label>Enviar para Aluno/Paciente</Label><Switch checked={form.watch('settings.recipients.student')} onCheckedChange={(c) => form.setValue('settings.recipients.student', c)} /></div>
              <div className="flex items-center justify-between border-b pb-4"><Label>Enviar para Profissional</Label><Switch checked={form.watch('settings.recipients.professional')} onCheckedChange={(c) => form.setValue('settings.recipients.professional', c)} /></div>
              <div className="space-y-2"><Label>Cópia para Admin (E-mail)</Label><Input placeholder="admin@exemplo.com" {...form.register('settings.recipients.admin_copy_email')} /><p className="text-xs text-muted-foreground">Deixe em branco para não enviar cópias.</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Janela de Envio</CardTitle><CardDescription>Defina os horários permitidos para envio.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Início</Label><Input type="time" {...form.register('settings.schedule.active_hours_start')} /></div>
              <div className="space-y-2"><Label>Fim</Label><Input type="time" {...form.register('settings.schedule.active_hours_end')} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle>Confiabilidade e Monitoramento</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between"><div><Label>Habilitar Logs Detalhados</Label><p className="text-xs text-muted-foreground">Registra payload e resposta de cada requisição.</p></div><Switch checked={form.watch('settings.logs_enabled')} onCheckedChange={(c) => form.setValue('settings.logs_enabled', c)} /></div>
              <div className="flex items-center justify-between border-t pt-4"><div><Label>Retry Automático</Label><p className="text-xs text-muted-foreground">Tentar reenviar em caso de falha.</p></div><Switch checked={form.watch('settings.retry.enabled')} onCheckedChange={(c) => form.setValue('settings.retry.enabled', c)} /></div>
              {form.watch('settings.retry.enabled') && (
                <div className="space-y-2"><Label>Máximo de Tentativas</Label><Select value={String(form.watch('settings.retry.max_attempts'))} onValueChange={(v) => form.setValue('settings.retry.max_attempts', parseInt(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="5">5</SelectItem></SelectContent></Select></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />Salvar Configurações</>)}
        </Button>
      </div>
    </form>
  )
}


// @ts-nocheck
import { useState, useEffect } from "react"
import { Plus, Webhook, Trash2, Pencil, Play, Eye, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Badge } from "@ui/badge"
import { Skeleton } from "@ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@ui/dialog"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Textarea } from "@ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Switch } from "@ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@ui/breadcrumb"
import { useToast } from "@root/hooks/use-toast"
import {
  getWebhooks, createWebhook, updateWebhook, deleteWebhook,
  toggleWebhookActive, testWebhook, getWebhookLogs,
  WEBHOOK_EVENTS, TEMPLATE_VARIABLES, type WebhookRow
} from "@sam/lib/actions/webhooks"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@ui/alert-dialog"

export default function WebhooksPage() {
  const { toast } = useToast()
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingWebhook, setEditingWebhook] = useState<WebhookRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  // Form state
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [url, setUrl] = useState("")
  const [metodo, setMetodo] = useState("POST")
  const [evento, setEvento] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [headersStr, setHeadersStr] = useState("{}")
  const [bodyTemplateStr, setBodyTemplateStr] = useState("{}")

  const loadData = async () => {
    setLoading(true)
    const data = await getWebhooks()
    setWebhooks(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const resetForm = () => {
    setNome(""); setDescricao(""); setUrl(""); setMetodo("POST")
    setEvento(""); setAtivo(true); setHeadersStr("{}"); setBodyTemplateStr("{}")
    setEditingWebhook(null)
  }

  const openEdit = (wh: WebhookRow) => {
    setEditingWebhook(wh)
    setNome(wh.nome)
    setDescricao(wh.descricao || "")
    setUrl(wh.url)
    setMetodo(wh.metodo)
    setEvento(wh.evento)
    setAtivo(wh.ativo)
    setHeadersStr(JSON.stringify(wh.headers || {}, null, 2))
    setBodyTemplateStr(JSON.stringify(wh.body_template || {}, null, 2))
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!nome || !url || !evento) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" })
      return
    }
    let headers: any, body_template: any
    try { headers = JSON.parse(headersStr) } catch { toast({ title: "Headers JSON inválido", variant: "destructive" }); return }
    try { body_template = JSON.parse(bodyTemplateStr) } catch { toast({ title: "Body Template JSON inválido", variant: "destructive" }); return }

    setSaving(true)
    const payload = { nome, descricao, url, metodo, evento, ativo, headers, body_template }
    const result = editingWebhook
      ? await updateWebhook(editingWebhook.id, payload)
      : await createWebhook(payload)

    if (result.success) {
      toast({ title: editingWebhook ? "Webhook atualizado" : "Webhook criado" })
      setFormOpen(false); resetForm(); loadData()
    } else {
      toast({ title: "Erro", description: result.error, variant: "destructive" })
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteWebhook(deleteId)
    if (result.success) {
      toast({ title: "Webhook excluído" })
      loadData()
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    }
    setDeleteId(null)
  }

  const handleTest = async (wh: WebhookRow) => {
    setTesting(wh.id)
    const result = await testWebhook(wh)
    toast({
      title: result.success ? "Teste enviado com sucesso" : "Falha no teste",
      description: `Status: ${result.status} - ${result.resposta?.substring(0, 100)}`,
      variant: result.success ? "default" : "destructive"
    })
    setTesting(null)
  }

  const handleToggle = async (wh: WebhookRow) => {
    await toggleWebhookActive(wh.id, !wh.ativo)
    loadData()
  }

  const openLogs = async (webhookId?: string) => {
    const data = await getWebhookLogs(webhookId)
    setLogs(data)
    setLogsOpen(true)
  }

  if (loading) {
    return <div className="space-y-6 pb-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <>
      <div className="space-y-6 pb-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Webhooks</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Webhooks</h1>
          <p className="text-muted-foreground">Configure integrações automáticas para eventos de agendamentos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openLogs()}>
            <Eye className="mr-2 h-4 w-4" /> Logs
          </Button>
          <Button onClick={() => { resetForm(); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Webhook
          </Button>
        </div>
      </div>

      {/* Variables reference */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Variáveis disponíveis para templates:</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map(v => (
              <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks table */}
      <Card className="border-none ring-1 ring-border shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/50">
          <div className="flex items-center gap-2 text-primary">
            <Webhook className="h-5 w-5" />
            <CardTitle className="text-lg">Webhooks Cadastrados</CardTitle>
          </div>
          <CardDescription>{webhooks.length} webhook(s) configurado(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.length > 0 ? webhooks.map(wh => (
                <TableRow key={wh.id}>
                  <TableCell className="font-medium">{wh.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{WEBHOOK_EVENTS.find(e => e.value === wh.evento)?.label || wh.evento}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs font-mono">{wh.url}</TableCell>
                  <TableCell><Badge>{wh.metodo}</Badge></TableCell>
                  <TableCell>
                    <button onClick={() => handleToggle(wh)} className="cursor-pointer">
                      {wh.ativo ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTest(wh)} disabled={testing === wh.id}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLogs(wh.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(wh)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(wh.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum webhook cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? "Editar Webhook" : "Novo Webhook"}</DialogTitle>
            <DialogDescription>Configure a URL, evento e template do payload.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="geral" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="body">Body Template</TabsTrigger>
            </TabsList>
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="WhatsApp Confirmação" />
                </div>
                <div className="space-y-2">
                  <Label>Evento *</Label>
                  <Select value={evento} onValueChange={setEvento}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {WEBHOOK_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label>URL *</Label>
                  <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.exemplo.com/webhook" />
                </div>
                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select value={metodo} onValueChange={setMetodo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={ativo} onCheckedChange={setAtivo} />
                <Label>Ativo</Label>
              </div>
            </TabsContent>
            <TabsContent value="headers" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">JSON com headers personalizados (ex: Authorization).</p>
              <Textarea
                className="font-mono text-sm min-h-[200px]"
                value={headersStr}
                onChange={e => setHeadersStr(e.target.value)}
                placeholder='{"Authorization": "Bearer TOKEN"}'
              />
            </TabsContent>
            <TabsContent value="body" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                JSON com template do body. Use variáveis: {TEMPLATE_VARIABLES.join(', ')}
              </p>
              <Textarea
                className="font-mono text-sm min-h-[200px]"
                value={bodyTemplateStr}
                onChange={e => setBodyTemplateStr(e.target.value)}
                placeholder='{"numero": "{paciente_telefone}", "mensagem": "Olá {paciente_nome}..."}'
              />
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logs de Execução</DialogTitle>
            <DialogDescription>Histórico de disparos de webhooks.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Webhook</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resposta</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.webhooks?.nome || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{log.evento}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={log.status_http && log.status_http < 300 ? "default" : "destructive"}>
                      {log.status_http || 'Erro'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{log.resposta || '-'}</TableCell>
                  <TableCell className="text-xs">{new Date(log.executado_em).toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-20">Nenhum log encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os logs associados serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}


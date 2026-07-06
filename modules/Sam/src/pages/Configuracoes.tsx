// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs"
import { Settings, Webhook } from "lucide-react"
import { Skeleton } from "@ui/skeleton"
import { IntegrationsForm } from "@sam/components/configuracoes/integrations-form"
import { getIntegrationConfig } from "@sam/lib/actions/configuracoes"
import WebhooksPage from "@sam/pages/Webhooks"

export default function ConfiguracoesPage() {
  const [integrationData, setIntegrationData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getIntegrationConfig()]).then(([i]) => {
      setIntegrationData(i)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="space-y-6 pb-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>

  return (
    <>
      <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Configurações</h2>
          <p className="text-muted-foreground">Gerencie apenas os parâmetros operacionais do módulo SAM.</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Módulo</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="grid gap-6">
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-2 text-primary"><Settings className="h-5 w-5" /><CardTitle className="text-lg font-semibold">Escopo do módulo</CardTitle></div>
              <CardDescription>
                Usuários, permissões, acesso aos módulos, SMTP global, sincronização de cadastros e cabeçalho institucional dos relatórios agora ficam no Sistema Principal.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-2 text-primary"><Webhook className="h-5 w-5" /><CardTitle className="text-lg font-semibold">Integração Make/Zapi</CardTitle></div>
              <CardDescription>Configure as notificações automáticas e webhooks para sistemas externos.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6"><IntegrationsForm initialData={integrationData} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks"><WebhooksPage /></TabsContent>
      </Tabs>
    </div>
    </>
  )
}

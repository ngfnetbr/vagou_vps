'use client'

import { useState } from 'react'
import { Spinner } from "@/components/common/Spinner";
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { syncCriancasCache } from '@sam/lib/actions/configuracoes'

export function SyncButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    if (isLoading) return
    setIsLoading(true); setLastResult(null)
    try {
      const result = await syncCriancasCache()
      setLastResult(result.success
        ? { success: true, message: 'Sincronização concluída com sucesso! Os dados das crianças foram atualizados.' }
        : { success: false, message: result.error || 'Falha na sincronização.' })
    } catch { setLastResult({ success: false, message: 'Ocorreu um erro inesperado durante a sincronização.' }) }
    finally { setIsLoading(false) }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-2 text-primary">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          <CardTitle className="text-lg font-semibold">Sincronização de Dados</CardTitle>
        </div>
        <CardDescription>Atualize o cache local das crianças sincronizando com o banco de dados principal.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">A sincronização garante que todas as informações das crianças estejam atualizadas. Este processo pode levar alguns segundos.</p>
        <div className="flex items-center gap-4">
          <Button onClick={handleSync} disabled={isLoading} className="min-w-[180px]">
            {isLoading ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Sincronizando...</>) : (<><RefreshCw className="mr-2 h-4 w-4" />Sincronizar cadastros</>)}
          </Button>
          {isLoading && <span className="text-sm text-muted-foreground animate-pulse">Processando sincronização completa...</span>}
        </div>
        {lastResult && (
          <Alert variant={lastResult.success ? "default" : "destructive"}>
            {lastResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{lastResult.success ? "Sucesso" : "Erro"}</AlertTitle>
            <AlertDescription>{lastResult.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

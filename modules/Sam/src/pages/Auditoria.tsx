// @ts-nocheck
import { useState, useEffect } from "react"
import { Skeleton } from "@ui/skeleton"
import { getAuditLogs } from "@sam/lib/actions/auditoria"
import { AuditList, type AuditLog } from "@sam/components/audit/audit-list"

interface AuditoriaPageProps {
  embedded?: boolean
}

export default function AuditoriaPage({ embedded }: AuditoriaPageProps = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLogs(undefined, 100).then(data => {
      setLogs(data || [])
      setLoading(false)
    })
  }, [])

  const content = (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary">Log de Auditoria</h2>
            <p className="text-muted-foreground">Histórico completo de ações realizadas no sistema.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <AuditList logs={logs} />
      )}
    </div>
  )

  if (embedded) return content

  return (
    <>
      {content}
    </>
  )
}


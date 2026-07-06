import { useMemo } from "react"

export function EmbeddedAppPage({ path }: { path: string }) {
  const src = useMemo(() => {
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    if (path.startsWith("/")) return path
    return `/${path}`
  }, [path])

  return (
    <div className="w-full rounded-lg border bg-background overflow-hidden">
      <iframe title="Conteúdo" src={src} className="w-full h-[calc(100vh-10rem)] border-0" />
    </div>
  )
}


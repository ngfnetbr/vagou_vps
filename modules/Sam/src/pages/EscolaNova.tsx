// @ts-nocheck
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Save, School, MapPin } from "lucide-react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Switch } from "@ui/switch"
import { createSchool } from "@sam/lib/actions/escolas"

export default function NovaEscolaPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      active: formData.get("active") === "on"
    }

    try {
      const result = await createSchool(data)
      if (result.success) {
        navigate("/modulo/sam/escolas")
      } else {
        setError(result.error || "Erro ao criar escola")
      }
    } catch {
      setError("Erro inesperado ao criar escola")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/modulo/sam/escolas">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Nova Escola</h2>
          <p className="text-muted-foreground">Cadastre uma nova unidade escolar no sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="pb-4 border-b bg-muted/50">
            <div className="flex items-center gap-2 text-primary">
              <School className="h-5 w-5" />
              <CardTitle className="text-lg font-semibold">Dados da Instituição</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Escola <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" placeholder="Ex: Escola Municipal João de Barro" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="address" name="address" placeholder="Rua, Número, Bairro, Cidade - UF" className="pl-9 h-11" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label htmlFor="active" className="text-base">Escola Ativa</Label>
                  <p className="text-sm text-muted-foreground">Define se a escola está disponível para novos cadastros.</p>
                </div>
                <Switch id="active" name="active" defaultChecked />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="min-w-[150px]">
                {loading ? "Salvando..." : (<><Save className="mr-2 h-4 w-4" />Salvar Escola</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
    </>
  )
}

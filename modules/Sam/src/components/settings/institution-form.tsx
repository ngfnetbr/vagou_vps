// @ts-nocheck
"use client"

import { useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Building2, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import { InstitutionSettingsData, updateInstitutionSettings } from "@sam/lib/actions/configuracoes"

interface InstitutionFormProps {
  initialData: InstitutionSettingsData | null
}

export function InstitutionForm({ initialData }: InstitutionFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const data: InstitutionSettingsData = {
      institution_name: formData.get("institution_name") as string,
      logo_url: formData.get("logo_url") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
    }

    setIsPending(true)
    try {
      const result = await updateInstitutionSettings(data)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Erro desconhecido")
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="border-none ring-1 ring-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg font-semibold">Dados Institucionais</CardTitle>
        </div>
        <CardDescription className="text-slate-500">
          Informações da instituição utilizadas no cabeçalho e rodapé dos relatórios.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Configurações salvas com sucesso!
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="institution_name">Nome da Instituição</Label>
              <Input id="institution_name" name="institution_name" defaultValue={initialData?.institution_name || "Secretaria Municipal de Educação"} placeholder="Ex: Secretaria Municipal de Educação de..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL do Logotipo</Label>
              <Input id="logo_url" name="logo_url" defaultValue={initialData?.logo_url || ""} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">URL da imagem para o cabeçalho (opcional).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={initialData?.phone || ""} placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input id="address" name="address" defaultValue={initialData?.address || ""} placeholder="Rua, Número, Bairro, Cidade - UF" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">E-mail de Contato</Label>
              <Input id="email" name="email" type="email" defaultValue={initialData?.email || ""} placeholder="contato@educacao.gov.br" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isPending} className="bg-blue-700 hover:bg-blue-800">
              {isPending ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />Salvar Alterações</>)}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


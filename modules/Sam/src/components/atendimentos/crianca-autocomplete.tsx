"use client"

import * as React from "react"
import { Spinner } from "@/components/common/Spinner";
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@sam/lib/utils"
import { Button } from "@ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/popover"
import { getSelectedStudents } from "@sam/lib/actions/students-sam"

function safeToPtBRDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("pt-BR")
}

export interface Crianca {
  id: string
  nome: string
  data_nascimento: string | null
  nome_responsavel: string | null
  cmei_atual_nome?: string | null
  turma_atual_nome?: string | null
  logradouro?: string | null
  numero?: string | null
  turma_atual?: string | null
  // Outros campos que podem vir da criancas_cache
  responsavel_telefone?: string | null
  responsavel_cpf?: string | null
  endereco?: string | null
  cmei_atual?: string | null
}

interface CriancaAutocompleteProps {
  onSelect: (crianca: Crianca | null) => void
  defaultValue?: string
}

export function CriancaAutocomplete({ onSelect, defaultValue }: CriancaAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue || "")
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [criancas, setCriancas] = React.useState<Crianca[]>([])

  const fetchCriancas = React.useCallback(async (term: string) => {
    setLoading(true)
    try {
      // Escopo: apenas alunos selecionados para o SAM
      const data = await getSelectedStudents(term)
      const mapped = (data || []).slice(0, 20).map((d: any) => ({
        id: d.id,
        nome: d.full_name,
        data_nascimento: d.birth_date,
        nome_responsavel: d.guardian_name,
        cmei_atual_nome: d.school_name,
        turma_atual_nome: d.class_name,
        responsavel_telefone: d.guardian_phone,
        logradouro: null,
        numero: null,
      }))
      setCriancas(mapped)
    } catch (error) {
      console.error('Erro ao buscar crianças:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchCriancas(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchCriancas])

  const selectedCrianca = criancas.find((crianca) => crianca.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 border-slate-300 focus:ring-blue-600 text-left font-normal"
        >
          {selectedCrianca ? (
            <span className="truncate">{selectedCrianca.nome}</span>
          ) : (
            <span className="text-muted-foreground">Buscar aluno pelo nome...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Digite o nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Spinner className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
            {!loading && criancas.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado.
              </div>
            )}
            {!loading && criancas.length > 0 && (
              <div className="p-1">
                {criancas.map((crianca) => (
                  <button
                    key={crianca.id}
                    type="button"
                    onClick={() => {
                      const newValue = crianca.id === value ? "" : crianca.id
                      setValue(newValue)
                      onSelect(newValue ? crianca : null)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex flex-col items-start w-full py-3 px-4 rounded-sm text-left transition-colors hover:bg-slate-50 outline-none",
                      value === crianca.id && "bg-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-slate-900">{crianca.nome}</span>
                      {value === crianca.id && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {crianca.data_nascimento && (
                        <>
                          <span>Nascimento: {safeToPtBRDate(crianca.data_nascimento) ?? "Não informado"}</span>
                          <span className="hidden sm:inline">•</span>
                        </>
                      )}
                      {crianca.cmei_atual_nome && (
                        <>
                          <span>CMEI: {crianca.cmei_atual_nome}</span>
                          <span className="hidden sm:inline">•</span>
                        </>
                      )}
                      {crianca.turma_atual_nome && (
                        <>
                          <span>Turma: {crianca.turma_atual_nome}</span>
                          <span className="hidden sm:inline">•</span>
                        </>
                      )}
                      <span>Responsável: {crianca.nome_responsavel || 'Não informado'}</span>
                      {crianca.responsavel_telefone && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>Tel.: {crianca.responsavel_telefone}</span>
                        </>
                      )}
                      {(crianca.logradouro || crianca.numero) && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            Endereço: {crianca.logradouro || ''}{crianca.logradouro && crianca.numero ? ', ' : ''}{crianca.numero || ''}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

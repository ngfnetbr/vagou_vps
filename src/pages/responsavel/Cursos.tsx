import { useNavigate } from "react-router-dom";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { useCursosPublicados, useAulas, useAulasProgresso } from "@/hooks/api/cursos-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Play, BookOpen } from "lucide-react";
import { cn } from "@/utils/utils";

function CursoCard({
  cursoId,
  titulo,
  descricao,
  capa,
}: {
  cursoId: string;
  titulo: string;
  descricao?: string | null;
  capa?: string | null;
}) {
  const navigate = useNavigate();
  const { data: aulas = [], isLoading: loadingAulas } = useAulas(cursoId);
  const { data: progresso = {}, isLoading: loadingProg } = useAulasProgresso(cursoId);

  let pct = 0;
  if (aulas.length > 0) {
    const concluidas = aulas.filter((a) => progresso[a.id]?.concluido).length;
    pct = Math.round((concluidas / aulas.length) * 100);
  }

  const isComplete = pct === 100 && aulas.length > 0;

  const goToCurso = () => navigate(`/modulo/vagou/responsavel/cursos/${cursoId}`);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={goToCurso}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), goToCurso())}
      className={cn(
        "group overflow-hidden border-border/80 bg-card transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {capa ? (
          <img
            src={capa}
            alt={titulo}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <BookOpen className="h-14 w-14 text-primary/40" strokeWidth={1.2} />
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {loadingAulas || loadingProg ? (
            <Skeleton className="h-2 w-full rounded-full bg-white/30" />
          ) : (
            <div className="flex items-center gap-2">
              <Progress
                value={pct}
                className="h-1.5 flex-1 bg-white/30 [&>*]:bg-white"
                aria-label={`Progresso: ${pct}%`}
              />
              <span className="min-w-[2.25rem] text-right text-xs font-medium text-white drop-shadow-sm">
                {pct}%
              </span>
            </div>
          )}
        </div>
      </div>
      <CardHeader className="space-y-1.5 pb-2">
        <CardTitle className="line-clamp-2 text-lg leading-tight">{titulo}</CardTitle>
        {descricao && (
          <CardDescription className="line-clamp-2 text-sm">{descricao}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          {!loadingAulas && aulas.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {aulas.length} {aulas.length === 1 ? "aula" : "aulas"}
            </span>
          )}
          <Button
            onClick={(e) => { e.stopPropagation(); navigate(`/modulo/vagou/responsavel/cursos/${cursoId}`); }}
            className="ml-auto gap-2 shadow-sm"
          >
            {isComplete ? "Revisar" : "Continuar"}
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CursoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full" />
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-4/5 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export default function CursosResponsavelPage() {
  const { data: cursos = [], isLoading } = useCursosPublicados();

  return (
    <ResponsavelLayout>
      <div className="min-h-[60vh]">
        {/* Header */}
        <div className="border-b border-border/80 bg-gradient-to-b from-muted/50 to-transparent">
          <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cursos</h1>
                <p className="mt-1 text-muted-foreground max-w-xl">
                  Assista às aulas e acompanhe seu progresso. Conclua os módulos para aproveitar ao máximo.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CursoCardSkeleton key={i} />
              ))}
            </div>
          ) : cursos.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">Nenhum curso disponível</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Novos cursos serão publicados em breve. Volte depois para conferir.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cursos.map((c) => (
                <CursoCard
                  key={c.id}
                  cursoId={c.id}
                  titulo={c.titulo}
                  descricao={c.descricao}
                  capa={c.capa_url || undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsavelLayout>
  );
}



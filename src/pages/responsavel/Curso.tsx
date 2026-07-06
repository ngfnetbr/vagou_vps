import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { useAulas, useAulasProgresso, useCursosPublicados, getSignedVideoUrl, useMarcarConcluida } from "@/hooks/api/cursos-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Play } from "lucide-react";

export default function CursoDetalheResponsavelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cursos = [] } = useCursosPublicados();
  const curso = useMemo(() => cursos.find((c) => c.id === id), [cursos, id]);
  const { data: aulas = [], isLoading } = useAulas(id || null);
  const { data: progresso = {} } = useAulasProgresso(id || null);
  const marcarConcluida = useMarcarConcluida();
  const [selectedAula, setSelectedAula] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const currentAula = aulas.find((a) => a.id === selectedAula) || aulas[0];

  useEffect(() => {
    if (aulas.length > 0 && !selectedAula) {
      setSelectedAula(aulas[0].id);
    }
  }, [aulas, selectedAula]);

  useEffect(() => {
    let cancelled = false;
    async function loadUrl() {
      if (!currentAula) return;
      try {
        const url = await getSignedVideoUrl(currentAula.video_path);
        if (!cancelled) setVideoUrl(url);
      } catch {
        if (!cancelled) setVideoUrl(null);
      }
    }
    loadUrl();
    return () => {
      cancelled = true;
    };
  }, [currentAula?.video_path]);

  return (
    <ResponsavelLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/modulo/vagou/responsavel/cursos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{curso?.titulo || "Curso"}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardContent className="p-0">
                {isLoading || !currentAula ? (
                  <div className="p-6">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : videoUrl ? (
                  <video key={currentAula.id} src={videoUrl} controls className="w-full aspect-video bg-black" />
                ) : (
                  <div className="p-6 text-muted-foreground">Não foi possível carregar o vídeo.</div>
                )}
              </CardContent>
            </Card>
            {currentAula && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{currentAula.titulo}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => marcarConcluida.mutate({ aulaId: currentAula.id })}
                      disabled={!!progresso[currentAula.id]?.concluido}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {progresso[currentAula.id]?.concluido ? "Concluída" : "Marcar como concluída"}
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>
          <div className="space-y-2">
            <Card>
              <CardHeader>
                <CardTitle>Aulas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : aulas.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Nenhuma aula disponível.</div>
                ) : (
                  aulas.map((a, idx) => {
                    const done = !!progresso[a.id]?.concluido;
                    const active = a.id === currentAula?.id;
                    return (
                      <Button
                        key={a.id}
                        variant={active ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedAula(a.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        <span className="flex-1 text-left">
                          {idx + 1}. {a.titulo}
                        </span>
                        {done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ResponsavelLayout>
  );
}



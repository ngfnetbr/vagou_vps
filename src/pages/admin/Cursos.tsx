import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Aula, useCursosPublicados, useAulas, useAulasProgresso, useModulos } from "@/hooks/api/cursos-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Lock,
  Play,
  PlayCircle,
  BookOpen,
  Sparkles,
  Trophy,
  VideoOff,
} from "lucide-react";
import { cn } from "@/utils/utils";

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type DatabaseEad = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      aulas_progresso: TableDefinition<{
        user_id: string;
        aula_id: string;
        concluido: boolean | null;
        progresso_segundos: number | null;
        updated_at: string | null;
      }>;
    };
  };
};

const supabaseEad = supabase as unknown as SupabaseClient<DatabaseEad>;

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
  let concluidas = 0;
  if (aulas.length > 0) {
    concluidas = aulas.filter((a) => progresso[a.id]?.concluido).length;
    pct = Math.round((concluidas / aulas.length) * 100);
  }

  const isComplete = pct === 100 && aulas.length > 0;
  const started = pct > 0 && !isComplete;
  const loading = loadingAulas || loadingProg;

  const goToCurso = () => navigate(`/modulo/vagou/admin/cursos/${cursoId}`);

  const totalSeg = aulas.reduce((acc, a) => acc + (a.duracao_segundos ?? 0), 0);
  const totalMin = Math.round(totalSeg / 60);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={goToCurso}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), goToCurso())}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card transition-all duration-300 cursor-pointer",
        "hover:shadow-elegant hover:border-primary/30 hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {capa ? (
          <img
            src={capa}
            alt={titulo}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <GraduationCap className="h-16 w-16 text-primary-foreground/50" strokeWidth={1.1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg ring-4 ring-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-100">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </div>
        </div>

        {/* Status badge */}
        <div className="absolute left-3 top-3 flex gap-2">
          {isComplete ? (
            <Badge className="gap-1 border-0 bg-accent text-accent-foreground shadow-sm">
              <Trophy className="h-3.5 w-3.5" /> Concluído
            </Badge>
          ) : started ? (
            <Badge className="gap-1 border-0 bg-primary text-primary-foreground shadow-sm">
              <PlayCircle className="h-3.5 w-3.5" /> Em andamento
            </Badge>
          ) : (
            <Badge className="gap-1 border-0 bg-black/45 text-white shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Novo
            </Badge>
          )}
        </div>

        {/* Title + meta over image */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-white drop-shadow">{titulo}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-white/85">
            {!loadingAulas && aulas.length > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> {aulas.length} {aulas.length === 1 ? "aula" : "aulas"}
              </span>
            )}
            {totalMin > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {totalMin} min
              </span>
            )}
          </div>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {descricao && <p className="line-clamp-2 text-sm text-muted-foreground">{descricao}</p>}

        <div className="mt-auto space-y-2">
          {loading ? (
            <Skeleton className="h-1.5 w-full rounded-full" />
          ) : aulas.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-muted-foreground">
                  {concluidas}/{aulas.length} concluídas
                </span>
                <span className={cn(isComplete ? "text-accent" : "text-primary")}>{pct}%</span>
              </div>
              <Progress
                value={pct}
                className={cn("h-1.5", isComplete && "[&>*]:bg-accent")}
                aria-label={`Progresso: ${pct}%`}
              />
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">Conteúdo em breve</p>
          )}
        </div>

        <Button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/modulo/vagou/admin/cursos/${cursoId}`);
          }}
          variant={isComplete ? "outline" : "default"}
          className="w-full gap-2"
        >
          {isComplete ? "Revisar curso" : started ? "Continuar" : "Começar agora"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function CursoCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <Skeleton className="aspect-[16/9] w-full" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

function formatDuracao(segundos: number | null | undefined) {
  if (!segundos || segundos <= 0) return null;
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

async function getVideoUrl(videoPath: string): Promise<string | null> {
  if (!videoPath) return null;
  if (videoPath.startsWith("http://") || videoPath.startsWith("https://")) return videoPath;

  const signed = await supabase.storage.from("course-videos").createSignedUrl(videoPath, 3600);
  if (!signed.error) return signed.data.signedUrl;

  const pub = supabase.storage.from("course-videos").getPublicUrl(videoPath);
  return pub.data.publicUrl || null;
}

function CursoDetalhes({ cursoId }: { cursoId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cursos = [], isLoading: loadingCursos } = useCursosPublicados();
  const { data: modulos = [], isLoading: loadingModulos } = useModulos(cursoId);
  const { data: aulas = [], isLoading: loadingAulas } = useAulas(cursoId);
  const { data: progresso = {}, isLoading: loadingProgresso } = useAulasProgresso(cursoId);

  const curso = useMemo(() => cursos.find((c) => c.id === cursoId), [cursos, cursoId]);

  const stats = useMemo(() => {
    const total = aulas.length;
    const concluidas = total > 0 ? aulas.filter((a) => progresso[a.id]?.concluido).length : 0;
    const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    return { total, concluidas, pct };
  }, [aulas, progresso]);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) {
        setUserId(null);
        return;
      }
      setUserId(data.user.id);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const aulasFiltradas = useMemo(() => {
    if (!normalizedSearch) return aulas;
    return aulas.filter((a) => {
      const t = (a.titulo ?? "").toLowerCase();
      const d = (a.descricao ?? "").toLowerCase();
      return t.includes(normalizedSearch) || d.includes(normalizedSearch);
    });
  }, [aulas, normalizedSearch]);

  const indexByAulaId = useMemo(() => {
    const map = new Map<string, number>();
    aulas.forEach((a, idx) => map.set(a.id, idx + 1));
    return map;
  }, [aulas]);

  const isLocked = useCallback(
    (aula: Aula) => {
      if (!aula.requisito_aula_id) return false;
      const req = progresso[aula.requisito_aula_id];
      return !req?.concluido;
    },
    [progresso]
  );

  const nextAula = useMemo(() => {
    if (aulas.length === 0) return null;
    const unlocked = aulas.filter((a) => !isLocked(a));
    const firstPending = unlocked.find((a) => !progresso[a.id]?.concluido);
    return firstPending ?? unlocked[0] ?? aulas[0];
  }, [aulas, isLocked, progresso]);

  const [aulaIdAtiva, setAulaIdAtiva] = useState<string | null>(null);
  useEffect(() => {
    if (aulas.length === 0) {
      setAulaIdAtiva(null);
      return;
    }
    if (aulaIdAtiva && aulas.some((a) => a.id === aulaIdAtiva)) return;
    if (nextAula?.id) setAulaIdAtiva(nextAula.id);
  }, [aulas, aulaIdAtiva, nextAula?.id]);

  const aulaAtiva = useMemo(() => {
    if (!aulaIdAtiva) return nextAula;
    return aulas.find((a) => a.id === aulaIdAtiva) ?? nextAula;
  }, [aulas, aulaIdAtiva, nextAula]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!aulaAtiva?.video_path) {
        setVideoUrl(null);
        return;
      }
      setVideoLoading(true);
      try {
        const url = await getVideoUrl(aulaAtiva.video_path);
        if (!cancelled) setVideoUrl(url);
      } finally {
        if (!cancelled) setVideoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aulaAtiva?.video_path]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, videoUrl]);

  const progressoPct = useCallback(
    (a: Aula) => {
      const p = progresso[a.id];
      if (p?.concluido) return 100;
      const dur = a.duracao_segundos ?? 0;
      if (dur <= 0) return 0;
      const sec = p?.progresso_segundos ?? 0;
      return Math.max(0, Math.min(100, Math.round((sec / dur) * 100)));
    },
    [progresso]
  );

  const saveProgresso = useCallback(
    async (params: { aula: Aula; segundos: number; concluido: boolean }) => {
      if (!userId) return;
      const { aula, segundos, concluido } = params;
      const dur = aula.duracao_segundos ?? 0;
      const safeSeconds = Math.max(0, Math.floor(segundos));
      const finalSeconds = concluido && dur > 0 ? dur : safeSeconds;

      await supabaseEad
        .from("aulas_progresso")
        .upsert(
          {
            user_id: userId,
            aula_id: aula.id,
            concluido,
            progresso_segundos: finalSeconds,
          },
          { onConflict: "user_id,aula_id" }
        );
      qc.invalidateQueries({ queryKey: ["cursos", cursoId, "aulas-progresso", "me"] });
    },
    [cursoId, qc, userId]
  );

  const toggleConcluida = useCallback(async () => {
    if (!aulaAtiva) return;
    const current = progresso[aulaAtiva.id];
    const willBeConcluida = !current?.concluido;
    const sec = willBeConcluida
      ? aulaAtiva.duracao_segundos ?? current?.progresso_segundos ?? 0
      : current?.progresso_segundos ?? 0;
    await saveProgresso({ aula: aulaAtiva, segundos: sec, concluido: willBeConcluida });
  }, [aulaAtiva, progresso, saveProgresso]);

  const aulasPorModulo = useMemo(() => {
    const byId = new Map<string, { titulo: string; aulas: Aula[] }>();
    const semId = "sem-modulo";
    for (const m of modulos) byId.set(m.id, { titulo: m.titulo, aulas: [] });
    byId.set(semId, { titulo: "SEM MÓDULO", aulas: [] });

    for (const a of aulasFiltradas) {
      const key = a.modulo_id || semId;
      const group = byId.get(key) ?? { titulo: "SEM MÓDULO", aulas: [] };
      group.aulas.push(a);
      byId.set(key, group);
    }

    const ordered: { id: string; titulo: string; aulas: Aula[] }[] = [];
    for (const m of modulos) {
      const g = byId.get(m.id);
      if (g && g.aulas.length > 0) ordered.push({ id: m.id, titulo: g.titulo, aulas: g.aulas });
    }
    const sem = byId.get(semId);
    if (sem && sem.aulas.length > 0) ordered.push({ id: semId, titulo: sem.titulo, aulas: sem.aulas });
    return ordered;
  }, [aulasFiltradas, modulos]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleModulo = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const isLoading = loadingCursos || loadingModulos || loadingAulas || loadingProgresso;

  return (
    <>
      <div className="px-4 pt-6 sm:pt-8">
        <div
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-elegant sm:p-8"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-white/5 blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              className="mt-0.5 border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
              onClick={() => navigate("/modulo/vagou/admin/cursos")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {loadingCursos ? "Carregando..." : (curso?.titulo ?? "Curso")}
              </h1>
              {curso?.descricao && (
                <p className="mt-1 max-w-2xl text-sm text-primary-foreground/80">{curso.descricao}</p>
              )}
              {stats.total > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    <BookOpen className="h-3.5 w-3.5" />
                    {stats.total} {stats.total === 1 ? "aula" : "aulas"}
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {stats.concluidas} concluídas
                  </div>
                  <div className="flex min-w-[160px] items-center gap-2">
                    <Progress value={stats.pct} className="h-2 flex-1 bg-white/25 [&>*]:bg-white" />
                    <span className="text-xs font-semibold">{stats.pct}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : aulas.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Nenhuma aula disponível</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Este curso ainda não possui aulas publicadas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden rounded-2xl border-border/60 shadow-elegant">
                <div className="relative bg-black">
                  {videoLoading ? (
                    <Skeleton className="aspect-video w-full rounded-none" />
                  ) : videoUrl ? (
                    <video
                      ref={videoRef}
                      className="aspect-video w-full"
                      controls
                      src={videoUrl}
                      onTimeUpdate={async (e) => {
                        if (!aulaAtiva) return;
                        if (progresso[aulaAtiva.id]?.concluido) return;
                        const now = Date.now();
                        if (now - lastSavedAtRef.current < 10000) return;
                        lastSavedAtRef.current = now;
                        const t = (e.currentTarget as HTMLVideoElement).currentTime || 0;
                        await saveProgresso({ aula: aulaAtiva, segundos: t, concluido: false });
                      }}
                      onEnded={async () => {
                        if (!aulaAtiva) return;
                        await saveProgresso({
                          aula: aulaAtiva,
                          segundos: aulaAtiva.duracao_segundos ?? 0,
                          concluido: true,
                        });
                      }}
                    />
                  ) : (
                    <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <VideoOff className="h-7 w-7" />
                      <p>Não foi possível carregar o vídeo.</p>
                    </div>
                  )}

                  <div className="absolute top-3 right-3">
                    <select
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="h-8 rounded-md border border-white/15 bg-black/40 px-2 text-xs text-white outline-none backdrop-blur"
                    >
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                </div>
                <CardContent className="space-y-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      {(() => {
                        const idx = aulaAtiva
                          ? aulasFiltradas.findIndex((a) => a.id === aulaAtiva.id) + 1
                          : 0;
                        const moduloTitulo = modulos.find((m) => m.id === aulaAtiva?.modulo_id)?.titulo;
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            {idx > 0 && (
                              <Badge variant="secondary" className="gap-1 text-[11px]">
                                <PlayCircle className="h-3 w-3" /> Aula {idx}
                              </Badge>
                            )}
                            {moduloTitulo && (
                              <Badge variant="outline" className="gap-1 text-[11px]">
                                <Layers className="h-3 w-3" /> {moduloTitulo}
                              </Badge>
                            )}
                            {aulaAtiva && progresso[aulaAtiva.id]?.concluido && (
                              <Badge className="gap-1 border-0 bg-accent text-accent-foreground text-[11px]">
                                <CheckCircle2 className="h-3 w-3" /> Concluída
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                      <h2 className="text-xl font-bold leading-tight">{aulaAtiva?.titulo ?? "Aula"}</h2>
                      <p className="text-sm text-muted-foreground">
                        {aulaAtiva?.descricao || "Visão geral do curso"}
                      </p>
                    </div>
                    {aulaAtiva && (
                      <Button
                        variant={progresso[aulaAtiva.id]?.concluido ? "outline" : "default"}
                        className="shrink-0 gap-2"
                        onClick={toggleConcluida}
                        disabled={isLocked(aulaAtiva)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {progresso[aulaAtiva.id]?.concluido ? "Desmarcar" : "Marcar como concluída"}
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const curIdx = aulaAtiva ? aulasFiltradas.findIndex((a) => a.id === aulaAtiva.id) : -1;
                    const prev = curIdx > 0 ? aulasFiltradas[curIdx - 1] : null;
                    const next = curIdx >= 0 && curIdx < aulasFiltradas.length - 1 ? aulasFiltradas[curIdx + 1] : null;
                    const nextLocked = next ? isLocked(next) : false;
                    return (
                      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          disabled={!prev}
                          onClick={() => prev && setAulaIdAtiva(prev.id)}
                        >
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          disabled={!next || nextLocked}
                          onClick={() => next && setAulaIdAtiva(next.id)}
                        >
                          {nextLocked ? <Lock className="h-4 w-4" /> : null}
                          Próxima aula <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })()}

                  {stats.total > 0 && (
                    <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Trophy className="h-3.5 w-3.5" /> Progresso do curso
                        </span>
                        <span className="text-xs font-semibold text-primary">{stats.pct}%</span>
                      </div>
                      <Progress value={stats.pct} className="h-2" />
                      <span className="text-[11px] text-muted-foreground">
                        {stats.concluidas} de {stats.total} aulas concluídas
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="overflow-hidden rounded-2xl border-border/60 shadow-elegant lg:sticky lg:top-20">
                <CardHeader className="space-y-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers className="h-4 w-4 text-primary" /> Conteúdo do curso
                    </CardTitle>
                    <Badge variant="secondary" className="text-[11px]">
                      {(aulaAtiva ? aulasFiltradas.findIndex((a) => a.id === aulaAtiva.id) + 1 : 0) || 0}
                      {" / "}
                      {aulasFiltradas.length}
                    </Badge>
                  </div>
                  <Input
                    placeholder="Buscar conteúdo"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                  {aulasPorModulo.map((g) => (
                    <div key={g.id}>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2"
                        onClick={() => toggleModulo(g.id)}
                      >
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {g.titulo}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                            {g.aulas.length}
                          </Badge>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              !collapsed[g.id] && "rotate-180"
                            )}
                          />
                        </div>
                      </button>

                      {!collapsed[g.id] && (
                        <div className="mt-2 space-y-2">
                          {g.aulas.map((a) => {
                            const locked = isLocked(a);
                            const concluida = !!progresso[a.id]?.concluido;
                            const pct = progressoPct(a);
                            const dur = formatDuracao(a.duracao_segundos);
                            const active = aulaAtiva?.id === a.id;
                            const status = concluida ? "Concluída" : pct > 0 ? "Em andamento" : "Não iniciada";
                            return (
                              <button
                                key={a.id}
                                type="button"
                                className={cn(
                                  "w-full flex items-start gap-3 rounded-lg border p-2 text-left transition-colors",
                                  active ? "border-primary/40 bg-primary/5" : "border-border/80 hover:bg-muted/40",
                                  locked && "opacity-60"
                                )}
                                onClick={() => setAulaIdAtiva(a.id)}
                                disabled={locked}
                              >
                                <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                                  {a.thumbnail_url ? (
                                    <img
                                      src={a.thumbnail_url}
                                      alt={a.titulo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Play className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  {dur && (
                                    <span className="absolute top-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                                      {dur}
                                    </span>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {(indexByAulaId.get(a.id) ?? 0) + ". " + a.titulo}
                                    </span>
                                    {concluida ? (
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    ) : locked ? (
                                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                    ) : null}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-muted-foreground">
                                      {pct}% • {status}
                                    </span>
                                    {active && (
                                      <span className="text-[11px] font-medium text-primary">
                                        Assistindo
                                      </span>
                                    )}
                                  </div>
                                  <Progress value={pct} className="h-1 mt-1" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function CursosAdminPage() {
  const { cursoId } = useParams<{ cursoId: string }>();
  const { data: cursos = [], isLoading } = useCursosPublicados();

  return (
    <AdminLayout>
      {cursoId ? (
        <CursoDetalhes cursoId={cursoId} />
      ) : (
        <div className="min-h-[60vh]">
          <div className="px-4 pt-6 sm:pt-8">
            <div
              className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-elegant sm:p-10"
              style={{ background: "var(--gradient-primary)" }}
            >
              <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="absolute -bottom-20 left-24 h-48 w-48 rounded-full bg-white/5 blur-3xl" aria-hidden />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "22px 22px",
                }}
                aria-hidden
              />
              <div className="relative">
                <Badge className="mb-4 gap-1.5 border-0 bg-white/15 text-primary-foreground backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" /> Área de Capacitação
                </Badge>
                <div className="flex items-start gap-4">
                  <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm sm:flex">
                    <GraduationCap className="h-9 w-9" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Vagou Academy</h1>
                    <p className="mt-2 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
                      Capacitações em vídeo para dominar a plataforma. Assista no seu ritmo e
                      acompanhe seu progresso em cada trilha.
                    </p>
                  </div>
                </div>
                {!isLoading && cursos.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                      <Layers className="h-4 w-4" />
                      {cursos.length} {cursos.length === 1 ? "curso" : "cursos"} disponíveis
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                      <PlayCircle className="h-4 w-4" /> Acesso ilimitado
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CursoCardSkeleton key={i} />
                ))}
              </div>
            ) : cursos.length === 0 ? (
              <Card className="rounded-2xl border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                    <BookOpen className="h-9 w-9 text-muted-foreground" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">Nenhum curso disponível</h2>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Novos cursos serão publicados em breve. Volte depois para conferir.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-6 w-1.5 rounded-full bg-primary" aria-hidden />
                  <h2 className="text-lg font-bold tracking-tight">Todos os cursos</h2>
                  <span className="text-sm text-muted-foreground">({cursos.length})</span>
                </div>
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
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}



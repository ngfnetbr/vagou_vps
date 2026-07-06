import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAulas, useAulasProgresso, useCursosAdmin, getSignedVideoUrl, useMarcarConcluida, useAtualizarProgresso, useDesmarcarConcluida, useModulos } from "@/hooks/api/cursos-hooks";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminCursoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cursos = [] } = useCursosAdmin();
  const curso = useMemo(() => cursos.find((c) => c.id === id), [cursos, id]);
  const { data: aulas = [], isLoading } = useAulas(id || null);
  const { data: modulos = [] } = useModulos(id || null);
  const { data: progresso = {} } = useAulasProgresso(id || null);
  const marcarConcluida = useMarcarConcluida();
  const desmarcarConcluida = useDesmarcarConcluida();
  const atualizarProgresso = useAtualizarProgresso();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedRef = useRef(0);
  const [rate, setRate] = useState("1");
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const seededRef = useRef(false);
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("superadmin");
  const [selectedAula, setSelectedAula] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const currentAula = aulas.find((a) => a.id === selectedAula) || aulas[0];

  useEffect(() => {
    if (aulas.length > 0 && !selectedAula) {
      setSelectedAula(aulas[0].id);
    }
  }, [aulas, selectedAula]);

  // Auto-seed de aulas fictícias (somente superadmin), quando não existir nenhuma
  useEffect(() => {
    (async () => {
      if (!id || isLoading || seededRef.current) return;
      if (!isSuperAdmin) return;
      if (aulas.length > 0) return;
      try {
        seededRef.current = true;
        const demos = [
          { titulo: "Aula 1 - Introdução", descricao: "Visão geral do curso", url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", ordem: 0, thumb: "https://picsum.photos/seed/vagou1/480/270" },
          { titulo: "Aula 2 - Navegação", descricao: "Conhecendo o painel", url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", ordem: 1, thumb: "https://picsum.photos/seed/vagou2/480/270" },
          { titulo: "Aula 3 - Operações", descricao: "Tarefas do dia a dia", url: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", ordem: 2, thumb: "https://picsum.photos/seed/vagou3/480/270" },
        ];
        await (supabase as any).from("aulas").insert(
          demos.map(d => ({
            curso_id: id,
            titulo: d.titulo,
            descricao: d.descricao,
            thumbnail_url: d.thumb,
            video_path: d.url, // HTTP direto
            ordem: d.ordem,
            preview: true,
          }))
        );
      } catch {
        // silencioso
      }
    })();
  }, [id, aulas.length, isLoading, isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;
    async function loadUrl() {
      if (!currentAula) return;
      try {
        const vp = currentAula.video_path || "";
        const url = vp.startsWith("http")
          ? vp
          : await getSignedVideoUrl(vp);
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

  // Aplica velocidade ao player
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(rate);
    }
  }, [rate, videoRef.current]);

  // Define ponto inicial de reprodução a partir do progresso salvo
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentAula) return;
    const saved = progresso[currentAula.id]?.progresso_segundos || 0;
    const onLoaded = async () => {
      try {
        if (saved > 0 && saved < (v.duration || saved + 1)) {
          v.currentTime = saved;
        }
        const dur = Math.round(v.duration || 0);
        if (dur > 0) {
          setDurations(prev => ({ ...prev, [currentAula.id]: dur }));
          if (!currentAula.duracao_segundos || currentAula.duracao_segundos !== dur) {
            try {
              await (supabase as any).from("aulas").update({ duracao_segundos: dur }).eq("id", currentAula.id);
            } catch {
              // silencioso
            }
          }
        }
      } catch {
        return;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded as any);
    };
  }, [currentAula?.id, progresso, videoRef.current]);

  // Salva progresso a cada ~5s
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !currentAula) return;
    setLocalProgress((prev) => ({ ...prev, [currentAula.id]: v.currentTime }));
    const now = Date.now();
    if (now - lastSavedRef.current > 5000) {
      lastSavedRef.current = now;
      atualizarProgresso.mutate({ aulaId: currentAula.id, progressoSegundos: v.currentTime });
    }
  };

  const handleEnded = () => {
    if (!currentAula) return;
    marcarConcluida.mutate({ aulaId: currentAula.id });
    const idx = aulas.findIndex((a) => a.id === currentAula.id);
    const next = aulas[idx + 1];
    if (next) {
      setSelectedAula(next.id);
      setShouldAutoplay(true);
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;
    if (!shouldAutoplay) return;
    const v = videoRef.current;
    const tryPlay = () => {
      v.playbackRate = parseFloat(rate);
      const p = v.play();
      if (p && typeof (p as any).catch === "function") {
        (p as Promise<void>).catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    };
    if (v.readyState >= 2) {
      tryPlay();
      setShouldAutoplay(false);
      return;
    }
    const onCanPlay = () => {
      tryPlay();
      setShouldAutoplay(false);
      v.removeEventListener("canplay", onCanPlay);
    };
    v.addEventListener("canplay", onCanPlay);
    return () => v.removeEventListener("canplay", onCanPlay);
  }, [selectedAula, videoUrl, shouldAutoplay, rate]);

  const filtered = aulas.filter((a) =>
    a.titulo.toLowerCase().includes(search.toLowerCase().trim())
  );
  // Agrupa por módulo (inclui 'Sem módulo' primeiro)
  const grupos = useMemo(() => {
    const porModulo: Record<string, any[]> = {};
    for (const a of filtered) {
      const key = a.modulo_id || "sem-modulo";
      if (!porModulo[key]) porModulo[key] = [];
      porModulo[key].push(a);
    }
    const lista: { id: string; titulo: string; aulas: any[] }[] = [];
    const sem = porModulo["sem-modulo"] || [];
    sem.sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0));
    lista.push({ id: "sem-modulo", titulo: "Sem módulo", aulas: sem });
    for (const m of modulos) {
      const arr = (porModulo[m.id] || []).sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0));
      lista.push({ id: m.id, titulo: m.titulo, aulas: arr });
    }
    return lista.filter(g => g.aulas.length > 0);
  }, [filtered, modulos]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const g of grupos) init[g.id] = true;
    setExpanded((prev) => ({ ...init, ...prev }));
  }, [grupos.map(g => g.id).join(",")]);

  const getPercent = (a: any) => {
    const isDone = !!progresso[a.id]?.concluido;
    if (isDone) return 100;
    const p =
      (a.id === currentAula?.id && Number.isFinite(localProgress[a.id]))
        ? localProgress[a.id]
        : (progresso[a.id]?.progresso_segundos || 0);
    const d = a.duracao_segundos || durations[a.id] || 0;
    if (!d || d <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((p / d) * 100)));
  };

  const fmt = (sec: number) => {
    if (!isFinite(sec) || sec <= 0) return "";
    const s = Math.round(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const mm = String(m).padStart(2, "0");
    const rr = String(r).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${rr}` : `${m}:${rr}`;
  };
  const isLocked = (a: any) => {
    const reqId = a.requisito_aula_id || null;
    const minPct = Math.max(0, Math.min(100, a.percentual_minimo ?? 0));
    if (!reqId || minPct <= 0) return false;
    const req = aulas.find((x) => x.id === reqId);
    if (!req) return false;
    if (progresso[reqId]?.concluido) return false;
    const progSec = progresso[reqId]?.progresso_segundos || 0;
    const dur = req.duracao_segundos || durations[reqId] || 0;
    if (!dur || dur <= 0) return true;
    const pct = Math.max(0, Math.min(100, Math.round((progSec / dur) * 100)));
    return pct < minPct;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardContent className="p-0">
                {isLoading || !currentAula ? (
                  <div className="p-6">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : videoUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video
                      key={currentAula.id}
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      className="w-full aspect-video"
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleEnded}
                    />
                    <div className="absolute top-2 right-2">
                      <Select value={rate} onValueChange={setRate}>
                        <SelectTrigger className="h-8 w-[90px] rounded-full bg-background/90 backdrop-blur border shadow-sm">
                          <SelectValue placeholder="1x" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.75">0.75x</SelectItem>
                          <SelectItem value="1">1x</SelectItem>
                          <SelectItem value="1.25">1.25x</SelectItem>
                          <SelectItem value="1.5">1.5x</SelectItem>
                          <SelectItem value="2">2x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                          onClick={() => {
                            const done = !!progresso[currentAula.id]?.concluido;
                            if (done) desmarcarConcluida.mutate({ aulaId: currentAula.id });
                            else marcarConcluida.mutate({ aulaId: currentAula.id });
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {progresso[currentAula.id]?.concluido ? "Desmarcar" : "Marcar como concluída"}
                        </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentAula.descricao && (
                    <p className="text-sm text-muted-foreground">{currentAula.descricao}</p>
                  )}
                  
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-2">
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>Aulas</span>
                    <div className="text-xs text-muted-foreground">
                      {filtered.length} de {aulas.length}
                    </div>
                  </CardTitle>
                  <Input
                    placeholder="Buscar conteúdo"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : aulas.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Nenhuma aula disponível.</div>
                ) : (
                  <ScrollArea className="h-[25rem] pr-2">
                    <div className="space-y-4">
                      {grupos.map((g) => (
                        <div key={g.id} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setExpanded((prev) => ({ ...prev, [g.id]: !prev[g.id] }))}
                            className="w-full flex items-center justify-between px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span>{g.titulo}</span>
                              <Badge variant="outline">{g.aulas.length}</Badge>
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded[g.id] ? "" : "-rotate-90"}`} />
                          </button>
                          {expanded[g.id] !== false && g.aulas.map((a, idx) => {
                        const done = !!progresso[a.id]?.concluido;
                        const active = a.id === currentAula?.id;
                        const percent = getPercent(a);
                        const duration = a.duracao_segundos || durations[a.id] || 0;
                        const locked = isLocked(a);
                        return (
                          <div
                            key={a.id}
                            className={`rounded-md border p-2 ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-muted cursor-pointer"} ${active ? "bg-muted/70 ring-2 ring-primary/30" : ""}`}
                            onClick={() => { if (!locked) setSelectedAula(a.id); }}
                          >
                            <div className="flex gap-3 items-start">
                              <div className="relative w-28 overflow-hidden rounded-md">
                                {a.thumbnail_url ? (
                                  <img
                                    src={a.thumbnail_url}
                                    alt={a.titulo}
                                    className="w-full aspect-video object-cover"
                                  />
                                ) : (
                                  <div className="w-full aspect-video bg-muted flex items-center justify-center">
                                    <Play className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 px-1 pb-1">
                                  <Progress value={percent} className="h-1" />
                                </div>
                                {locked && (
                                  <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white inline-flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    <span>Bloqueada</span>
                                  </div>
                                )}
                                {duration > 0 && (
                                  <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                                    {fmt(duration)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{idx + 1}. {a.titulo}</div>
                                <div className="text-xs text-muted-foreground">
                                  {locked ? "Requer progresso em pré‑requisito" : `${percent}% • ${done ? "Concluída" : "Em andamento"}`}
                                </div>
                              </div>
                              {done && <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-1" />}
                            </div>
                          </div>
                        );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


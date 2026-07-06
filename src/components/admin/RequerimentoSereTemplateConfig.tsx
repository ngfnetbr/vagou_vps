import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useConfiguracoesSistema, useUpdateConfiguracoes } from "@/hooks/api/configuracoes-hooks";
import { useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { MousePointer2, Save, Square, X as XIcon, Plus, Trash2 } from "lucide-react";
import type * as pdfjsType from "pdfjs-dist";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRequerimentoSereTemplateConfig, type RequerimentoSereTemplateConfig } from "@/utils/requerimento-sere-template-default";

type PlaceMode =
  | { type: "none" }
  | { type: "text"; key: string }
  | { type: "checkbox"; key: string };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const toNumber = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const isValidAnchor = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && (x !== 0 || y !== 0);

export const RequerimentoSereTemplateConfigCard = () => {
  const { data: configDb, isLoading } = useConfiguracoesSistema();
  const updateMutation = useUpdateConfiguracoes();
  const canEdit = useCanAccess(PERMISSIONS.CONFIGURACOES_EDITAR);

  const [value, setValue] = useState<RequerimentoSereTemplateConfig>(() => getDefaultRequerimentoSereTemplateConfig());
  const [isDirty, setIsDirty] = useState(false);
  const [placeMode, setPlaceMode] = useState<PlaceMode>({ type: "none" });
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<"ficticio" | "real">("ficticio");
  const [criancaBusca, setCriancaBusca] = useState("");
  const [criancasResultados, setCriancasResultados] = useState<Array<{ id: string; nome: string }>>([]);
  const [criancaSelecionada, setCriancaSelecionada] = useState<{ id: string; nome: string } | null>(null);
  const [criancaReal, setCriancaReal] = useState<any>(null);
  const [valoresReal, setValoresReal] = useState<Record<string, string>>({});
  const [docEntregueReal, setDocEntregueReal] = useState({
    comprovanteResidencia: false,
    certidaoNascimento: false,
    comprovanteVacinacao: false,
    cpfEstudante: false,
  });
  const [isCarregandoReal, setIsCarregandoReal] = useState(false);

  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(120);

  const [pdfDoc, setPdfDoc] = useState<pdfjsType.PDFDocumentProxy | null>(null);
  const [pdfjs, setPdfjs] = useState<typeof pdfjsType | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number; scale: number } | null>(null);

  const [drag, setDrag] = useState<{
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });

  const [moveDrag, setMoveDrag] = useState<{
    active: boolean;
    type: "text" | "checkbox";
    key: string;
    offsetX: number;
    offsetY: number;
  }>({ active: false, type: "text", key: "", offsetX: 0, offsetY: 0 });

  const [resizeDrag, setResizeDrag] = useState<{
    active: boolean;
    key: string;
    startWidthPx: number;
    startClientX: number;
  }>({ active: false, key: "", startWidthPx: 0, startClientX: 0 });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<"text" | "checkbox">("text");
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [fullScreenSidebarPercent, setFullScreenSidebarPercent] = useState(32);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [camposInscricao, setCamposInscricao] = useState<Array<any>>([]);
  const [camposInscricaoLoading, setCamposInscricaoLoading] = useState(false);
  const [camposInscricaoSearch, setCamposInscricaoSearch] = useState("");
  const [camposInscricaoSelected, setCamposInscricaoSelected] = useState<Record<string, boolean>>({});
  const [importAddText, setImportAddText] = useState(true);
  const [importAddXs, setImportAddXs] = useState(true);

  const storedConfig = useMemo(() => {
    const raw = (configDb as any)?.requerimento_sere_template_config as Json | undefined;
    if (!raw || typeof raw !== "object") return null;
    return raw as any;
  }, [configDb]);

  const normalizarConfig = (raw: any) => {
    const base = getDefaultRequerimentoSereTemplateConfig();
    const textFieldsRaw = Array.isArray(raw?.textFields) && raw.textFields.length > 0 ? (raw.textFields as any[]) : base.textFields;
    const checkboxesRaw = Array.isArray(raw?.checkboxes) && raw.checkboxes.length > 0 ? (raw.checkboxes as any[]) : base.checkboxes;
    const rawVersion = Number(raw?.version || 1);

    const textFields = textFieldsRaw.map((f: any) => {
      const fontSize = Number(f?.fontSize || 9) || 9;
      const boxHeight = Number(f?.boxHeight || 0) || Math.max(8, fontSize * 1.4);
      const y = Number(f?.y || 0) || 0;
      const migratedY = rawVersion >= 2 ? y : y + fontSize * 0.35;
      return { ...f, fontSize, boxHeight, y: migratedY };
    });

    const checkboxes = checkboxesRaw.map((c: any) => ({ ...c }));

    const merged: RequerimentoSereTemplateConfig = {
      version: 2,
      templateUrl: typeof raw?.templateUrl === "string" ? raw.templateUrl : base.templateUrl,
      textColor: typeof raw?.textColor === "string" ? raw.textColor : base.textColor,
      xColor: typeof raw?.xColor === "string" ? raw.xColor : base.xColor,
      textFields,
      checkboxes,
    };

    return merged;
  };

  const carregarPadrao = () => {
    if (storedConfig && typeof storedConfig === "object") {
      setValue(normalizarConfig(storedConfig));
      setIsDirty(true);
      toast.message("Padrão restaurado a partir do mapeamento salvo");
      return;
    }

    setValue(getDefaultRequerimentoSereTemplateConfig());
    setIsDirty(true);
    toast.message("Padrão carregado");
  };

  useEffect(() => {
    if (!storedConfig) return;
    setValue(normalizarConfig(storedConfig));
    setIsDirty(false);
  }, [storedConfig]);

  useEffect(() => {
    const load = async () => {
      setIsPdfLoading(true);
      try {
        const mod = (await import("pdfjs-dist")) as unknown as typeof pdfjsType;
        mod.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${(mod as any).version}/build/pdf.worker.min.mjs`;
        const loadingTask = mod.getDocument(value.templateUrl);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setPdfjs(mod);
        setPage(1);
      } catch (e: any) {
        toast.error("Não foi possível carregar o template do PDF");
      } finally {
        setIsPdfLoading(false);
      }
    };

    load();
    return () => {
      pdfDoc?.destroy();
    };
  }, [value.templateUrl]);

  useEffect(() => {
    const render = async () => {
      if (!pdfDoc || !pdfjs || !canvasRef.current) return;
      const p = await pdfDoc.getPage(page);
      const scale = 1.5 * (zoom / 100);
      const vp = p.getViewport({ scale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = vp.width;
      canvas.height = vp.height;
      setViewport({ width: vp.width, height: vp.height, scale });

      await p.render({ canvasContext: ctx, viewport: vp }).promise;
    };

    render();
  }, [pdfDoc, pdfjs, page, zoom]);

  const canvasPointToPdf = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !viewport) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = clamp(clientX - rect.left, 0, rect.width);
    const yPx = clamp(clientY - rect.top, 0, rect.height);
    const xPdf = xPx / viewport.scale;
    const yPdf = (rect.height - yPx) / viewport.scale;
    return { xPdf, yPdf, xPx, yPx, canvasH: rect.height };
  };

  const setTextAnchor = (key: string, x: number, y: number, maxWidth?: number) => {
    setValue((prev) => {
      const next = {
        ...prev,
        textFields: prev.textFields.map((f) =>
          f.key === key ? { ...f, x, y, maxWidth: maxWidth ?? f.maxWidth, boxHeight: f.boxHeight ?? Math.max(8, f.fontSize * 1.4), page } : f
        ),
      };
      return next;
    });
    setIsDirty(true);
  };

  const setCheckboxAnchor = (key: string, x: number, y: number) => {
    setValue((prev) => {
      const next = { ...prev, checkboxes: prev.checkboxes.map((c) => (c.key === key ? { ...c, x, y, page } : c)) };
      return next;
    });
    setIsDirty(true);
  };

  const limparTextAnchor = (key: string) => {
    setValue((prev) => ({
      ...prev,
      textFields: prev.textFields.map((f) => (f.key === key ? { ...f, x: 0, y: 0 } : f)),
    }));
    setIsDirty(true);
    toast.message("Marcação removida");
  };

  const limparCheckboxAnchor = (key: string) => {
    setValue((prev) => ({
      ...prev,
      checkboxes: prev.checkboxes.map((c) => (c.key === key ? { ...c, x: 0, y: 0 } : c)),
    }));
    setIsDirty(true);
    toast.message("Marcação removida");
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    if (placeMode.type !== "text") return;
    const pt = canvasPointToPdf(e.clientX, e.clientY);
    if (!pt) return;
    setDrag({ active: true, startX: pt.xPx, startY: pt.yPx, currentX: pt.xPx, currentY: pt.yPx });
  };

  const onMouseMove = (e: ReactMouseEvent) => {
    if (!drag.active) return;
    if (placeMode.type !== "text") return;
    const pt = canvasPointToPdf(e.clientX, e.clientY);
    if (!pt) return;
    setDrag((prev) => ({ ...prev, currentX: pt.xPx, currentY: pt.yPx }));
  };

  const onMouseUp = (e: ReactMouseEvent) => {
    if (placeMode.type !== "text") return;
    if (!drag.active) return;
    const pt = canvasPointToPdf(e.clientX, e.clientY);
    if (!pt || !viewport) return;

    const minX = Math.min(drag.startX, drag.currentX);
    const maxX = Math.max(drag.startX, drag.currentX);
    const minY = Math.min(drag.startY, drag.currentY);
    const maxY = Math.max(drag.startY, drag.currentY);
    const xPdf = minX / viewport.scale;
    const centerYPx = (minY + maxY) / 2;
    const yPdf = (pt.canvasH - centerYPx) / viewport.scale;
    const wPdf = Math.max(10, (maxX - minX) / viewport.scale);
    const hPdf = Math.max(8, (maxY - minY) / viewport.scale);

    setValue((prev) => ({
      ...prev,
      textFields: prev.textFields.map((f) =>
        f.key === placeMode.key ? { ...f, x: xPdf, y: yPdf, maxWidth: wPdf, boxHeight: hPdf, page } : f
      ),
    }));
    setIsDirty(true);
    setDrag({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
    setPlaceMode({ type: "none" });
  };

  const onClick = (e: ReactMouseEvent) => {
    if (placeMode.type !== "checkbox") return;
    const pt = canvasPointToPdf(e.clientX, e.clientY);
    if (!pt) return;
    setCheckboxAnchor(placeMode.key, pt.xPdf, pt.yPdf);
    setPlaceMode({ type: "none" });
  };

  const markerStyle = (xPdf: number, yPdf: number) => {
    if (!viewport) return { display: "none" } as const;
    const x = xPdf * viewport.scale;
    const y = viewport.height - yPdf * viewport.scale;
    return {
      left: `${x}px`,
      top: `${y}px`,
    } as const;
  };

  const sampleText = useMemo<Record<string, string>>(
    () => ({
      nome: "FULANO DE TAL",
      data_nascimento: "01/01/2020",
      cpf_crianca: "123.456.789-00",
      nis: "12345678901",
      logradouro: "RUA DAS FLORES",
      numero: "100",
      complemento: "CASA",
      bairro: "CENTRO",
      cidade: "NOVA LONDRINA",
      cep: "87970-000",
      estado: "PR",
      responsavel_telefone: "(43) 99999-9999",
      unidade_consumidora: "1234567890",
      quilombo_nome: "EXEMPLO",
      etnia_indigena_outra: "EXEMPLO",
    }),
    []
  );

  const sampleCheckbox = useMemo<Record<string, boolean>>(
    () => ({
      sexo_m: true,
      sexo_f: false,
      cor_auto_branca: true,
      cor_cert_branca: true,
      nacionalidade_brasileira: true,
      vacina_sim: true,
      programa_bolsa_familia: true,
      doc_comprovante_residencia: true,
      doc_cpf_estudante: true,
      doc_certidao_nascimento: true,
      doc_vacinacao: true,
    }),
    []
  );

  useEffect(() => {
    if (!moveDrag.active && !resizeDrag.active) return;

    const onMove = (ev: MouseEvent) => {
      const pt = canvasPointToPdf(ev.clientX, ev.clientY);
      if (!pt || !viewport) return;

      if (moveDrag.active) {
        const newXpx = pt.xPx - moveDrag.offsetX;
        const newYpx = pt.yPx - moveDrag.offsetY;
        const xPdf = newXpx / viewport.scale;

        if (moveDrag.type === "text") {
          setValue((prev) => ({
            ...prev,
            textFields: prev.textFields.map((f) => {
              if (f.key !== moveDrag.key) return f;
              const hPdf = Number(f.boxHeight || 0) || Math.max(8, f.fontSize * 1.4);
              const yPdf = (viewport.height - (newYpx + (hPdf * viewport.scale) / 2)) / viewport.scale;
              return { ...f, x: xPdf, y: yPdf };
            }),
          }));
        } else {
          const yPdf = (viewport.height - newYpx) / viewport.scale;
          setValue((prev) => ({
            ...prev,
            checkboxes: prev.checkboxes.map((c) => (c.key === moveDrag.key ? { ...c, x: xPdf, y: yPdf } : c)),
          }));
        }
        setIsDirty(true);
      }

      if (resizeDrag.active) {
        const delta = ev.clientX - resizeDrag.startClientX;
        const newWidthPx = Math.max(20, resizeDrag.startWidthPx + delta);
        const newWidthPdf = newWidthPx / viewport.scale;
        setValue((prev) => ({
          ...prev,
          textFields: prev.textFields.map((f) => (f.key === resizeDrag.key ? { ...f, maxWidth: newWidthPdf } : f)),
        }));
        setIsDirty(true);
      }
    };

    const onUp = () => {
      setMoveDrag((prev) => ({ ...prev, active: false, key: "" }));
      setResizeDrag((prev) => ({ ...prev, active: false, key: "" }));
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
    };
  }, [moveDrag.active, resizeDrag.active, moveDrag.key, moveDrag.offsetX, moveDrag.offsetY, moveDrag.type, resizeDrag.key, resizeDrag.startClientX, resizeDrag.startWidthPx, viewport]);

  useEffect(() => {
    if (previewMode !== "real") return;
    const term = criancaBusca.trim();
    if (term.length < 2) {
      setCriancasResultados([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select("id,nome")
        .ilike("nome", `%${term}%`)
        .order("nome", { ascending: true })
        .limit(10);

      if (error) return;
      setCriancasResultados((data as any[])?.map((c) => ({ id: c.id, nome: c.nome })) || []);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [criancaBusca, previewMode]);

  const carregarPreviaReal = async (criancaId: string) => {
    setIsCarregandoReal(true);
    try {
      const { data: crianca, error: criancaError } = await supabase
        .from("criancas")
        .select(
          `
            id,
            nome,
            data_nascimento,
            sexo,
            cpf_crianca,
            certidao_nascimento,
            programas_sociais,
            cor_raca_autodeclarada,
            cor_raca_certidao,
            etnia_indigena,
            etnia_indigena_outra,
            quilombo_remanescente,
            quilombo_nome,
            nacionalidade,
            estrangeiro_possui_documentos,
            nis,
            unidade_consumidora,
            forma_ocupacao_moradia,
            forma_ocupacao_moradia_outro,
            filiacao1_nao_declarada,
            filiacao1_nome,
            filiacao1_rg,
            filiacao1_cpf,
            filiacao1_email,
            filiacao1_celular,
            filiacao1_telefone_comercial,
            filiacao2_nao_declarada,
            filiacao2_nome,
            filiacao2_rg,
            filiacao2_cpf,
            filiacao2_email,
            filiacao2_celular,
            filiacao2_telefone_comercial,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            responsavel_telefone
          `
        )
        .eq("id", criancaId)
        .single();

      if (criancaError) throw criancaError;

      const nomeCamposSet = new Set<string>();
      value.textFields.forEach((f) => nomeCamposSet.add(String(f.key)));
      value.checkboxes.forEach((c) => {
        const k = String(c.key);
        if (k.startsWith("cor_auto_")) nomeCamposSet.add("cor_raca_autodeclarada");
        else if (k.startsWith("cor_cert_")) nomeCamposSet.add("cor_raca_certidao");
        else if (k.startsWith("etnia_")) nomeCamposSet.add("etnia_indigena");
        else if (k === "quilombo_sim" || k === "quilombo_nao") nomeCamposSet.add("quilombo_remanescente");
        else if (k.startsWith("nacionalidade_")) nomeCamposSet.add("nacionalidade");
        else if (k.startsWith("estrangeiro_docs_")) nomeCamposSet.add("estrangeiro_possui_documentos");
        else if (k.includes("__")) nomeCamposSet.add(k.split("__")[0]);
        else if (!k.startsWith("doc_") && !k.startsWith("sexo_") && !k.startsWith("programa_") && !k.startsWith("vacina_")) nomeCamposSet.add(k);
      });

      const nomeCampos = Array.from(nomeCamposSet).filter(Boolean);

      const { data: campos, error: camposError } = await supabase
        .from("campos_inscricao")
        .select("id,nome_campo")
        .in("nome_campo", nomeCampos);

      if (camposError) throw camposError;

      const ids = (campos as any[])?.map((c) => c.id).filter(Boolean) || [];

      const { data: valores, error: valoresError } = await supabase
        .from("valores_campos_custom")
        .select("campo_id,valor")
        .eq("crianca_id", criancaId)
        .in("campo_id", ids);

      if (valoresError) throw valoresError;

      const idToNome = new Map(((campos as any[]) || []).map((c) => [c.id, c.nome_campo]));
      const v: Record<string, string> = {};
      ((valores as any[]) || []).forEach((row) => {
        const nome = idToNome.get(row.campo_id);
        if (!nome) return;
        v[nome] = row.valor ?? "";
      });

      const { data: documentos, error: docsError } = await supabase
        .from("documentos_crianca")
        .select("status,tipo_documento:documentos_tipos(nome)")
        .eq("crianca_id", criancaId);

      if (docsError) throw docsError;

      const tipos = ((documentos as any[]) || [])
        .filter((d) => d?.status === "pendente" || d?.status === "aprovado")
        .map((d) => String(d?.tipo_documento?.nome || "").toLowerCase());

      setCriancaReal(crianca);
      setValoresReal(v);
      setDocEntregueReal({
        comprovanteResidencia: tipos.some((n) => n.includes("resid")),
        certidaoNascimento: tipos.some((n) => n.includes("certid")),
        comprovanteVacinacao: tipos.some((n) => n.includes("vacina")),
        cpfEstudante: tipos.some((n) => n.includes("cpf") && (n.includes("crian") || n.includes("crianc") || n.includes("estud"))),
      });
      toast.success("Prévia real carregada");
    } catch (e: any) {
      toast.error("Não foi possível carregar a prévia real");
    } finally {
      setIsCarregandoReal(false);
    }
  };

  const getPreviewText = (key: string, label: string) => {
    if (previewMode === "real" && criancaReal) {
      if (key === "data_nascimento") {
        const d = criancaReal.data_nascimento ? new Date(criancaReal.data_nascimento).toLocaleDateString("pt-BR") : "";
        return d || "";
      }
      if (key in criancaReal) return String(criancaReal[key] ?? "");
      if (key in valoresReal) return String(valoresReal[key] ?? "");
      return "";
    }
    return sampleText[key] ?? label;
  };

  const getPreviewChecked = (key: string) => {
    if (previewMode === "real" && criancaReal) {
      const sexo = String(criancaReal.sexo || "").toLowerCase();
      if (key === "sexo_m") return sexo.startsWith("m");
      if (key === "sexo_f") return sexo.startsWith("f");

      if (key.includes("__")) {
        const [base, opt] = key.split("__");
        const raw = (valoresReal as any)[base] ?? (criancaReal as any)[base];
        return String(raw ?? "") === String(opt ?? "");
      }

      if (key.startsWith("cor_auto_"))
        return String((valoresReal as any).cor_raca_autodeclarada ?? (criancaReal as any).cor_raca_autodeclarada ?? "") === key.replace("cor_auto_", "");
      if (key.startsWith("cor_cert_"))
        return String((valoresReal as any).cor_raca_certidao ?? (criancaReal as any).cor_raca_certidao ?? "") === key.replace("cor_cert_", "");
      if (key.startsWith("etnia_"))
        return String((valoresReal as any).etnia_indigena ?? (criancaReal as any).etnia_indigena ?? "") === key.replace("etnia_", "");

      if (key === "quilombo_sim")
        return String((valoresReal as any).quilombo_remanescente ?? (criancaReal as any).quilombo_remanescente ?? "") === "sim";
      if (key === "quilombo_nao")
        return String((valoresReal as any).quilombo_remanescente ?? (criancaReal as any).quilombo_remanescente ?? "") === "nao";

      if (key === "nacionalidade_brasileira") return String((valoresReal as any).nacionalidade ?? (criancaReal as any).nacionalidade ?? "") === "brasileira";
      if (key === "nacionalidade_brasileira_naturalizado")
        return String((valoresReal as any).nacionalidade ?? (criancaReal as any).nacionalidade ?? "") === "brasileira_naturalizado";
      if (key === "nacionalidade_estrangeira") return String((valoresReal as any).nacionalidade ?? (criancaReal as any).nacionalidade ?? "") === "estrangeira";

      if (key === "estrangeiro_docs_sim")
        return String((valoresReal as any).estrangeiro_possui_documentos ?? (criancaReal as any).estrangeiro_possui_documentos ?? "") === "sim";
      if (key === "estrangeiro_docs_nao")
        return String((valoresReal as any).estrangeiro_possui_documentos ?? (criancaReal as any).estrangeiro_possui_documentos ?? "") === "nao";

      if (key === "vacina_sim") return docEntregueReal.comprovanteVacinacao;
      if (key === "vacina_nao") return !docEntregueReal.comprovanteVacinacao;

      if (key === "programa_bolsa_familia") return Boolean(criancaReal.programas_sociais);
      if (key === "programa_pe_de_meia") return false;

      if (key === "doc_comprovante_residencia") return docEntregueReal.comprovanteResidencia;
      if (key === "doc_cpf_estudante") return docEntregueReal.cpfEstudante;
      if (key === "doc_certidao_nascimento") return docEntregueReal.certidaoNascimento;
      if (key === "doc_vacinacao") return docEntregueReal.comprovanteVacinacao;

      const raw = (valoresReal as any)[key] ?? (criancaReal as any)[key];
      if (typeof raw === "boolean") return raw;
      const s = String(raw ?? "").trim().toLowerCase();
      if (s === "sim" || s === "true" || s === "1") return true;
      if (s === "nao" || s === "não" || s === "false" || s === "0") return false;
      return false;
    }
    return sampleCheckbox[key] ?? true;
  };

  const autoMarcarTudo = async () => {
    if (!pdfDoc || !pdfjs) {
      toast.error("Template ainda não carregou");
      return;
    }

    try {
      const pdfPage = await pdfDoc.getPage(1);
      const tc = await pdfPage.getTextContent();
      const items = (tc.items as any[]).map((it: any) => ({
        s: String(it?.str || ""),
        x: Number(it?.transform?.[4] ?? 0),
        y: Number(it?.transform?.[5] ?? 0),
        w: Number(it?.width ?? 0),
      }));

      const normalize = (s: string) => {
        return s
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      };

      const tokenize = (s: string) => normalize(s).split(" ").filter(Boolean);

      const findPhraseBBox = (phrase: string) => {
        const target = tokenize(phrase);
        if (target.length === 0) return null;
        const tolY = 2.5;

        for (let i = 0; i < items.length; i++) {
          const start = tokenize(items[i].s);
          if (start.length === 0) continue;
          if (start[0] !== target[0]) continue;

          const y0 = items[i].y;
          let t = 0;
          let minX = items[i].x;
          let maxX = items[i].x + items[i].w;
          let failed = false;

          for (let j = i; j < items.length && t < target.length; j++) {
            const it = items[j];
            if (Math.abs(it.y - y0) > tolY) break;
            const toks = tokenize(it.s);
            for (const tok of toks) {
              if (tok === target[t]) {
                t++;
                minX = Math.min(minX, it.x);
                maxX = Math.max(maxX, it.x + it.w);
                if (t >= target.length) return { minX, maxX, y: y0 };
              } else {
                failed = true;
                break;
              }
            }
            if (failed) break;
          }
        }
        return null;
      };

      const findPhraseBBoxNearY = (phrase: string, nearY: number, rangeY: number) => {
        const target = tokenize(phrase);
        if (target.length === 0) return null;
        const tolY = 2.5;

        for (let i = 0; i < items.length; i++) {
          const start = tokenize(items[i].s);
          if (start.length === 0) continue;
          if (Math.abs(items[i].y - nearY) > rangeY) continue;
          if (start[0] !== target[0]) continue;

          const y0 = items[i].y;
          let t = 0;
          let minX = items[i].x;
          let maxX = items[i].x + items[i].w;
          let failed = false;

          for (let j = i; j < items.length && t < target.length; j++) {
            const it = items[j];
            if (Math.abs(it.y - y0) > tolY) break;
            const toks = tokenize(it.s);
            for (const tok of toks) {
              if (tok === target[t]) {
                t++;
                minX = Math.min(minX, it.x);
                maxX = Math.max(maxX, it.x + it.w);
                if (t >= target.length) return { minX, maxX, y: y0 };
              } else {
                failed = true;
                break;
              }
            }
            if (failed) break;
          }
        }
        return null;
      };

      const findOptionCheckboxNear = (nearPhrase: string, optionLabel: string) => {
        const near = findPhraseBBox(nearPhrase);
        if (!near) return null;
        const opt = tokenize(optionLabel);
        if (opt.length === 0) return null;
        const tolY = 3.5;
        const rangeY = 28;

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const toks = tokenize(it.s);
          if (toks.length === 0) continue;
          if (Math.abs(it.y - near.y) > rangeY) continue;

          let matched = true;
          for (let k = 0; k < opt.length; k++) {
            const t = tokenize(items[i + k]?.s || "");
            if (t[0] !== opt[k]) {
              matched = false;
              break;
            }
          }
          if (!matched) continue;

          const y0 = it.y;
          for (let b = i; b >= Math.max(0, i - 8); b--) {
            if (Math.abs(items[b].y - y0) > tolY) continue;
            if (items[b].s === "(" && items[b + 1]?.s === ")") {
              const x0 = items[b].x;
              const x1 = items[b + 1].x;
              return { x: (x0 + x1) / 2, y: y0 };
            }
          }
        }
        return null;
      };

      const enderecoTitle = findPhraseBBox("ENDEREÇO RESIDENCIAL DO(A) ESTUDANTE") || findPhraseBBox("ENDEREÇO RESIDENCIAL");
      const enderecoNearY = enderecoTitle?.y ?? 0;

      const setTextIfFound = (key: string, phrase: string, nearY?: number, rangeY?: number) => {
        const box = nearY && rangeY ? findPhraseBBoxNearY(phrase, nearY, rangeY) : findPhraseBBox(phrase);
        if (!box) return null;
        return { key, page: 1, x: box.maxX + 6, y: box.y };
      };

      const textUpdates: Record<string, { x: number; y: number; page: number; maxWidth?: number } | null> = {
        nome: setTextIfFound("nome", "Nome como consta na certidão de nascimento"),
        data_nascimento: setTextIfFound("data_nascimento", "Data de nascimento"),
        cpf_crianca: setTextIfFound("cpf_crianca", "CPF"),
        nis: setTextIfFound("nis", "Código de identificação social - NIS"),
        unidade_consumidora: setTextIfFound("unidade_consumidora", "Unidade consumidora"),
        responsavel_telefone: setTextIfFound("responsavel_telefone", "Telefone residencial"),
        cep: enderecoNearY ? setTextIfFound("cep", "CEP", enderecoNearY - 60, 120) : setTextIfFound("cep", "CEP"),
        estado: enderecoNearY ? setTextIfFound("estado", "UF", enderecoNearY - 60, 120) : setTextIfFound("estado", "UF"),
        cidade: enderecoNearY ? setTextIfFound("cidade", "Município", enderecoNearY - 60, 120) : setTextIfFound("cidade", "Município"),
        bairro: enderecoNearY ? setTextIfFound("bairro", "Bairro", enderecoNearY - 60, 120) : setTextIfFound("bairro", "Bairro"),
        complemento: enderecoNearY ? setTextIfFound("complemento", "Complemento", enderecoNearY - 60, 120) : setTextIfFound("complemento", "Complemento"),
        numero: enderecoNearY ? setTextIfFound("numero", "Número", enderecoNearY - 60, 120) : setTextIfFound("numero", "Número"),
        logradouro: enderecoNearY ? setTextIfFound("logradouro", "Logradouro", enderecoNearY - 60, 120) : setTextIfFound("logradouro", "Logradouro"),
        quilombo_nome: setTextIfFound("quilombo_nome", "Qual?"),
        etnia_indigena_outra: setTextIfFound("etnia_indigena_outra", "Outra:"),
      };

      const checkboxUpdates: Record<string, { x: number; y: number; page: number } | null> = {};

      const sexoM = findOptionCheckboxNear("Sexo", "M");
      if (sexoM) checkboxUpdates["sexo_m"] = { page: 1, x: sexoM.x, y: sexoM.y };
      const sexoF = findOptionCheckboxNear("Sexo", "F");
      if (sexoF) checkboxUpdates["sexo_f"] = { page: 1, x: sexoF.x, y: sexoF.y };

      const cores = [
        ["cor_auto_amarela", "Amarela"],
        ["cor_auto_branca", "Branca"],
        ["cor_auto_indigena", "Indígena"],
        ["cor_auto_parda", "Parda"],
        ["cor_auto_preta", "Preta"],
        ["cor_auto_nao_declarada", "Não declarada"],
      ] as const;
      cores.forEach(([key, label]) => {
        const pos = findOptionCheckboxNear("Cor/Raça autodeclarada", label);
        if (pos) checkboxUpdates[key] = { page: 1, x: pos.x, y: pos.y };
      });

      const coresCert = [
        ["cor_cert_amarela", "Amarela"],
        ["cor_cert_branca", "Branca"],
        ["cor_cert_indigena", "Indígena"],
        ["cor_cert_parda", "Parda"],
        ["cor_cert_preta", "Preta"],
        ["cor_cert_nao_declarada", "Não Declarada"],
      ] as const;
      coresCert.forEach(([key, label]) => {
        const pos = findOptionCheckboxNear("Cor/raça citada na certidão de nascimento", label);
        if (pos) checkboxUpdates[key] = { page: 1, x: pos.x, y: pos.y };
      });

      const nacionalidades = [
        ["nacionalidade_brasileira", "Brasileira"],
        ["nacionalidade_brasileira_naturalizado", "Brasileira - nascido no exterior ou naturalizado"],
        ["nacionalidade_estrangeira", "Estrangeira"],
      ] as const;
      nacionalidades.forEach(([key, label]) => {
        const pos = findOptionCheckboxNear("Nacionalidade", label);
        if (pos) checkboxUpdates[key] = { page: 1, x: pos.x, y: pos.y };
      });

      const estrangSim = findOptionCheckboxNear("Se estrangeiro, possui documentos?", "Sim");
      if (estrangSim) checkboxUpdates["estrangeiro_docs_sim"] = { page: 1, x: estrangSim.x, y: estrangSim.y };
      const estrangNao = findOptionCheckboxNear("Se estrangeiro, possui documentos?", "Não");
      if (estrangNao) checkboxUpdates["estrangeiro_docs_nao"] = { page: 1, x: estrangNao.x, y: estrangNao.y };

      const quilomboSim = findOptionCheckboxNear("Remanescente de Quilombo", "Sim.");
      if (quilomboSim) checkboxUpdates["quilombo_sim"] = { page: 1, x: quilomboSim.x, y: quilomboSim.y };
      const quilomboNao = findOptionCheckboxNear("Remanescente de Quilombo", "Não");
      if (quilomboNao) checkboxUpdates["quilombo_nao"] = { page: 1, x: quilomboNao.x, y: quilomboNao.y };

      const etnias = [
        ["etnia_guarani", "Guarani"],
        ["etnia_kaingang", "Kaingang"],
        ["etnia_xeta", "Xetá"],
        ["etnia_xokleng", "Xokleng"],
        ["etnia_outra", "Outra:"],
      ] as const;
      etnias.forEach(([key, label]) => {
        const pos = findOptionCheckboxNear("Se indígena:", label);
        if (pos) checkboxUpdates[key] = { page: 1, x: pos.x, y: pos.y };
      });

      const vacinaSim = findOptionCheckboxNear("Declaração de vacina", "Sim");
      if (vacinaSim) checkboxUpdates["vacina_sim"] = { page: 1, x: vacinaSim.x, y: vacinaSim.y };
      const vacinaNao = findOptionCheckboxNear("Declaração de vacina", "Não");
      if (vacinaNao) checkboxUpdates["vacina_nao"] = { page: 1, x: vacinaNao.x, y: vacinaNao.y };

      const progBolsa = findOptionCheckboxNear("Programas Sociais", "Bolsa");
      if (progBolsa) checkboxUpdates["programa_bolsa_familia"] = { page: 1, x: progBolsa.x, y: progBolsa.y };
      const progPe = findOptionCheckboxNear("Programas Sociais", "Pé-de-");
      if (progPe) checkboxUpdates["programa_pe_de_meia"] = { page: 1, x: progPe.x, y: progPe.y };

      const docs = [
        ["doc_comprovante_residencia", "Comprovante"],
        ["doc_cpf_estudante", "CPF"],
        ["doc_certidao_nascimento", "certidão"],
        ["doc_vacinacao", "vacinação"],
      ] as const;
      docs.forEach(([key, label]) => {
        const pos = findOptionCheckboxNear("documentos", label);
        if (pos) checkboxUpdates[key] = { page: 1, x: pos.x, y: pos.y };
      });

      setValue((prev) => ({
        ...prev,
        textFields: prev.textFields.map((f) => {
          const u = textUpdates[f.key];
          if (!u) return f;
          return { ...f, page: u.page, x: u.x, y: u.y };
        }),
        checkboxes: prev.checkboxes.map((c) => {
          const u = checkboxUpdates[c.key];
          if (!u) return c;
          return { ...c, page: u.page, x: u.x, y: u.y };
        }),
      }));
      setIsDirty(true);
      setShowPreview(true);
      toast.success("Marcação automática aplicada. Revise e ajuste com arrastar.");
    } catch (e: any) {
      toast.error("Não foi possível marcar automaticamente");
    }
  };

  const markers = useMemo(() => {
    const m: { key: string; label: string; x: number; y: number; type: "text" | "checkbox" }[] = [];
    value.textFields.forEach((f) => {
      if (f.page !== page) return;
      if (!isValidAnchor(f.x, f.y)) return;
      m.push({ key: f.key, label: f.label, x: f.x, y: f.y, type: "text" });
    });
    value.checkboxes.forEach((c) => {
      if (c.page !== page) return;
      if (!isValidAnchor(c.x, c.y)) return;
      m.push({ key: c.key, label: c.label, x: c.x, y: c.y, type: "checkbox" });
    });
    return m;
  }, [value, page]);

  const save = async () => {
    try {
      updateMutation.mutate({ requerimento_sere_template_config: value as any } as any, {
        onSuccess: () => {
          toast.success("Configuração do Requerimento SERE salva");
          setIsDirty(false);
        },
        onError: (e: any) => {
          toast.error("Erro ao salvar: " + (e?.message || "desconhecido"));
        },
      });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || "desconhecido"));
    }
  };

  const addField = () => {
    const key = newKey.trim();
    const label = newLabel.trim();
    if (!key || !label) return;
    if (addType === "text") {
      setValue((prev) => ({ ...prev, textFields: [...prev.textFields, { key, label, page, x: 0, y: 0, fontSize: 9, maxWidth: 200, boxHeight: 11 }] }));
    } else {
      setValue((prev) => ({ ...prev, checkboxes: [...prev.checkboxes, { key, label, page, x: 0, y: 0 }] }));
    }
    setIsDirty(true);
    setAddDialogOpen(false);
    setNewKey("");
    setNewLabel("");
  };

  const openImportCamposDialog = async () => {
    setImportDialogOpen(true);
    if (camposInscricao.length > 0) return;
    setCamposInscricaoLoading(true);
    try {
      const { data, error } = await supabase
        .from("campos_inscricao")
        .select("id,secao,nome_campo,label,tipo,opcoes,ordem,ativo")
        .eq("ativo", true)
        .order("secao", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      setCamposInscricao((data as any[]) || []);
    } catch (e: any) {
      toast.error("Não foi possível carregar os campos do formulário");
    } finally {
      setCamposInscricaoLoading(false);
    }
  };

  const importCampos = (campoIds: string[]) => {
    const selected = new Set(campoIds);
    const campos = camposInscricao.filter((c) => selected.has(c.id));
    if (campos.length === 0) return;

    setValue((prev) => {
      const existingText = new Set(prev.textFields.map((f) => f.key));
      const existingX = new Set(prev.checkboxes.map((c) => c.key));

      const textFields = [...prev.textFields];
      const checkboxes = [...prev.checkboxes];

      campos.forEach((campo) => {
        const key = String(campo.nome_campo);
        const label = String(campo.label || key);

        if (importAddText && !existingText.has(key)) {
          textFields.push({ key, label, page, x: 0, y: 0, fontSize: 9, maxWidth: 200, boxHeight: 11 });
          existingText.add(key);
        }

        if (!importAddXs) return;

        if (String(campo.tipo) === "select" && Array.isArray(campo.opcoes)) {
          (campo.opcoes as any[]).forEach((o) => {
            const v = String(o?.value ?? "").trim();
            const l = String(o?.label ?? v).trim();
            if (!v) return;
            const ck = `${key}__${v}`;
            if (existingX.has(ck)) return;
            checkboxes.push({ key: ck, label: `${label}: ${l}`, page, x: 0, y: 0 });
            existingX.add(ck);
          });
        } else if (String(campo.tipo) === "checkbox") {
          if (!existingX.has(key)) {
            checkboxes.push({ key, label, page, x: 0, y: 0 });
            existingX.add(key);
          }
        }
      });

      return { ...prev, textFields, checkboxes };
    });

    setIsDirty(true);
    toast.success(`Campos adicionados: ${campos.length}`);
  };

  const removeField = (type: "text" | "checkbox", key: string) => {
    if (type === "text") {
      setValue((prev) => ({ ...prev, textFields: prev.textFields.filter((f) => f.key !== key) }));
    } else {
      setValue((prev) => ({ ...prev, checkboxes: prev.checkboxes.filter((c) => c.key !== key) }));
    }
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Requerimento SERE (template)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4 animate-spin" />
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requerimento SERE (template oficial)</CardTitle>
        <CardDescription>
          Configure âncoras de texto (posição e largura) e âncoras de marcação (X) diretamente sobre o PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={fullScreenOpen ? "fixed inset-0 z-50 bg-background p-4" : ""}>
          <div className={fullScreenOpen ? "h-full flex flex-col gap-4" : ""}>
            {fullScreenOpen && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold truncate">Editor do Requerimento SERE</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Selecione um campo, marque no PDF e arraste para ajustar. Passe o mouse para ver o nome e excluir.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Campos</span>
                    <input
                      type="range"
                      min={18}
                      max={50}
                      value={fullScreenSidebarPercent}
                      onChange={(e) => setFullScreenSidebarPercent(clamp(Number(e.target.value || 32), 18, 50))}
                      className="w-28"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">{fullScreenSidebarPercent}%</span>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setFullScreenOpen(false)}>
                    Fechar
                  </Button>
                  <Button onClick={save} disabled={!canEdit || updateMutation.isPending || !isDirty} className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-1 gap-6 ${fullScreenOpen ? "flex-1 min-h-0 lg:grid-cols-[minmax(0,calc(100%-var(--sidebar)))_minmax(0,var(--sidebar))]" : "lg:grid-cols-2"}`}
              style={fullScreenOpen ? ({ ["--sidebar" as any]: `${fullScreenSidebarPercent}%` } as any) : undefined}
            >
          <div className={fullScreenOpen ? "min-h-0 flex flex-col gap-4" : "space-y-4"}>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-2">
                <Label>Template</Label>
                <Input
                  value={value.templateUrl}
                  disabled={!canEdit || updateMutation.isPending}
                  onChange={(e) => {
                    setValue((prev) => ({ ...prev, templateUrl: e.target.value }));
                    setIsDirty(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Prévia</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={previewMode === "ficticio" ? "default" : "outline"}
                    onClick={() => setPreviewMode("ficticio")}
                  >
                    Fictícia
                  </Button>
                  <Button
                    type="button"
                    variant={previewMode === "real" ? "default" : "outline"}
                    onClick={() => setPreviewMode("real")}
                  >
                    Real
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do texto</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={value.textColor}
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => {
                      setValue((prev) => ({ ...prev, textColor: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-14 p-1"
                  />
                  <Input
                    value={value.textColor}
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => {
                      setValue((prev) => ({ ...prev, textColor: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-32"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do X</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={value.xColor}
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => {
                      setValue((prev) => ({ ...prev, xColor: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-14 p-1"
                  />
                  <Input
                    value={value.xColor}
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => {
                      setValue((prev) => ({ ...prev, xColor: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-32"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Página</Label>
                <Input
                  type="number"
                  min={1}
                  max={pdfDoc?.numPages || 1}
                  value={page}
                  disabled={!pdfDoc}
                  onChange={(e) => setPage(clamp(Number(e.target.value || 1), 1, pdfDoc?.numPages || 1))}
                  className="w-28"
                />
              </div>
              <div className="space-y-2">
                <Label>Zoom (%)</Label>
                <Input
                  type="number"
                  min={50}
                  max={240}
                  value={zoom}
                  onChange={(e) => setZoom(clamp(Number(e.target.value || 120), 50, 240))}
                  className="w-28"
                />
              </div>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => setFullScreenOpen((v) => !v)}>
                {fullScreenOpen ? "Sair da tela cheia" : "Tela cheia"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || updateMutation.isPending || isPdfLoading}
                onClick={autoMarcarTudo}
              >
                Marcar tudo
              </Button>
              <Button onClick={save} disabled={!canEdit || updateMutation.isPending || !isDirty} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>

            {previewMode === "real" && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="text-sm font-medium">Prévia real (escolha um aluno)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Buscar por nome</Label>
                    <Input value={criancaBusca} onChange={(e) => setCriancaBusca(e.target.value)} placeholder="Digite pelo menos 2 letras" />
                    {criancasResultados.length > 0 && (
                      <div className="rounded-md border bg-background max-h-40 overflow-auto">
                        {criancasResultados.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => {
                              setCriancaSelecionada(c);
                              setCriancaBusca(c.nome);
                              setCriancasResultados([]);
                            }}
                          >
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Selecionado</Label>
                    <div className="flex items-center gap-2">
                      <Input value={criancaSelecionada?.nome || ""} readOnly />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!criancaSelecionada || isCarregandoReal}
                        onClick={() => {
                          if (!criancaSelecionada) return;
                          carregarPreviaReal(criancaSelecionada.id);
                        }}
                      >
                        {isCarregandoReal ? <Spinner className="h-4 w-4 animate-spin" /> : "Carregar"}
                      </Button>
                    </div>
                    {criancaReal?.id && (
                      <div className="text-xs text-muted-foreground">
                        Carregado: {criancaReal.nome}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-medium">Modo de marcação</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={placeMode.type === "none" ? "default" : "outline"}
                    onClick={() => setPlaceMode({ type: "none" })}
                    className="gap-2"
                  >
                    <MousePointer2 className="h-4 w-4" />
                    Normal
                  </Button>
                    <Button
                      type="button"
                      variant={showPreview ? "default" : "outline"}
                      onClick={() => setShowPreview((v) => !v)}
                    >
                      Pré-visualização
                    </Button>
                  <Button
                    type="button"
                    variant={placeMode.type === "text" ? "default" : "outline"}
                    onClick={() => {
                      toast.message("Selecione um campo de texto na lista e arraste no PDF para definir a largura.");
                    }}
                    className="gap-2"
                    disabled
                  >
                    <Square className="h-4 w-4" />
                    Texto (arrastar)
                  </Button>
                  <Button
                    type="button"
                    variant={placeMode.type === "checkbox" ? "default" : "outline"}
                    onClick={() => {
                      toast.message("Selecione um campo de X na lista e clique no PDF.");
                    }}
                    className="gap-2"
                    disabled
                  >
                    <XIcon className="h-4 w-4" />
                    X (clicar)
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Para campo de texto: selecione na lista, clique e arraste no PDF. Para X: selecione na lista e clique no local.
              </div>
            </div>

            <div
              ref={containerRef}
              className={`relative border rounded-md overflow-auto bg-muted/20 ${fullScreenOpen ? "flex-1 min-h-0" : ""}`}
              style={fullScreenOpen ? { height: "100%" } : undefined}
            >
              {isPdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10">
                  <Spinner className="h-6 w-6 animate-spin" />
                </div>
              )}
              <div className="relative inline-block" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onClick={onClick}>
                <canvas ref={canvasRef} className="block" />
                {viewport && (
                  <div className="absolute inset-0">
                    {showPreview &&
                      value.textFields
                        .filter((f) => f.page === page && isValidAnchor(f.x, f.y))
                        .map((f) => {
                          const text = getPreviewText(f.key, f.label);
                          const widthPx = f.maxWidth * viewport.scale;
                          const heightPx = (Number(f.boxHeight || 0) || Math.max(8, f.fontSize * 1.4)) * viewport.scale;
                          const leftPx = f.x * viewport.scale;
                          const topPx = viewport.height - f.y * viewport.scale - heightPx / 2;
                          return (
                            <div
                              key={f.key}
                              className="absolute"
                              style={{
                                left: `${leftPx}px`,
                                top: `${topPx}px`,
                                width: `${widthPx}px`,
                                height: `${heightPx}px`,
                                color: value.textColor,
                              }}
                              onMouseDown={(e) => {
                                if (!canEdit || updateMutation.isPending) return;
                                e.stopPropagation();
                                const pt = canvasPointToPdf(e.clientX, e.clientY);
                                if (!pt || !viewport) return;
                                const anchorXpx = f.x * viewport.scale;
                                const anchorYpx = viewport.height - f.y * viewport.scale - heightPx / 2;
                                setMoveDrag({
                                  active: true,
                                  type: "text",
                                  key: f.key,
                                  offsetX: pt.xPx - anchorXpx,
                                  offsetY: pt.yPx - anchorYpx,
                                });
                              }}
                            >
                              <div
                                className="relative border border-primary/60 bg-background/60 backdrop-blur-sm px-1 select-none group flex items-center"
                                style={{ fontSize: `${Math.max(6, f.fontSize * viewport.scale)}px`, color: value.textColor, height: `${heightPx}px` }}
                              >
                                <div className="absolute -top-7 left-0 hidden group-hover:flex items-center gap-2 bg-background/90 border rounded px-2 py-1 text-xs text-foreground shadow pointer-events-auto">
                                  <span className="max-w-[260px] truncate">{f.label}</span>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-destructive hover:underline"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canEdit || updateMutation.isPending) return;
                                      limparTextAnchor(f.key);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Excluir
                                  </button>
                                </div>
                                <div className="truncate" style={{ maxWidth: `${widthPx}px` }}>
                                  {text}
                                </div>
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                  onMouseDown={(e) => {
                                    if (!canEdit || updateMutation.isPending) return;
                                    e.stopPropagation();
                                    setResizeDrag({
                                      active: true,
                                      key: f.key,
                                      startWidthPx: widthPx,
                                      startClientX: e.clientX,
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}

                    {showPreview &&
                      value.checkboxes
                        .filter((c) => c.page === page && isValidAnchor(c.x, c.y))
                        .map((c) => {
                          const checked = getPreviewChecked(c.key);
                          return (
                            <div
                              key={c.key}
                              className="absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-move group"
                              style={{ ...markerStyle(c.x, c.y), color: value.xColor }}
                              onMouseDown={(e) => {
                                if (!canEdit || updateMutation.isPending) return;
                                e.stopPropagation();
                                const pt = canvasPointToPdf(e.clientX, e.clientY);
                                if (!pt || !viewport) return;
                                const anchorXpx = c.x * viewport.scale;
                                const anchorYpx = viewport.height - c.y * viewport.scale;
                                setMoveDrag({
                                  active: true,
                                  type: "checkbox",
                                  key: c.key,
                                  offsetX: pt.xPx - anchorXpx,
                                  offsetY: pt.yPx - anchorYpx,
                                });
                              }}
                            >
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-2 bg-background/90 border rounded px-2 py-1 text-xs text-foreground shadow pointer-events-auto">
                                <span className="max-w-[260px] truncate">{c.label}</span>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-destructive hover:underline"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canEdit || updateMutation.isPending) return;
                                    limparCheckboxAnchor(c.key);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Excluir
                                </button>
                              </div>
                              <div className="h-4 w-4 border border-foreground/60 flex items-center justify-center bg-background/50">
                                {checked ? <span style={{ color: value.xColor, fontSize: 14 }}>X</span> : null}
                              </div>
                            </div>
                          );
                        })}

                    {!showPreview &&
                      markers.map((m) => (
                        <div
                          key={m.key}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none ${m.type === "checkbox" ? "bg-red-500" : "bg-blue-500"}`}
                          style={{ width: 8, height: 8, ...markerStyle(m.x, m.y) }}
                          title={m.label}
                        />
                      ))}

                    {drag.active && (
                      <div
                        className="absolute border-2 border-primary/80 bg-primary/10 pointer-events-none"
                        style={{
                          left: Math.min(drag.startX, drag.currentX),
                          top: Math.min(drag.startY, drag.currentY),
                          width: Math.abs(drag.currentX - drag.startX),
                          height: Math.abs(drag.currentY - drag.startY),
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={fullScreenOpen ? "min-h-0 flex flex-col gap-4" : "space-y-4"}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Campos</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEdit || updateMutation.isPending}
                  onClick={() => {
                    carregarPadrao();
                  }}
                >
                  Restaurar padrão
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEdit || updateMutation.isPending}
                  onClick={openImportCamposDialog}
                >
                  Do formulário
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEdit || updateMutation.isPending}
                  onClick={() => setAddDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            <Tabs defaultValue="texto" className={fullScreenOpen ? "flex-1 min-h-0 flex flex-col" : ""}>
              <TabsList className="shrink-0">
                <TabsTrigger value="texto">Texto</TabsTrigger>
                <TabsTrigger value="x">X</TabsTrigger>
              </TabsList>
              <TabsContent value="texto" className={fullScreenOpen ? "mt-3 flex-1 min-h-0" : "mt-3"}>
                <ScrollArea className={fullScreenOpen ? "h-full pr-2" : "h-[620px] pr-2"}>
                  <div className="space-y-3">
                    {value.textFields.map((f) => (
                  <div
                    key={f.key}
                    className={`rounded-md border p-3 space-y-3 ${isValidAnchor(f.x, f.y) ? "border-primary/60 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{f.label}</div>
                        <div className="text-xs text-muted-foreground">{f.key}</div>
                        {isValidAnchor(f.x, f.y) && (
                          <div className="mt-1">
                            <Badge variant="secondary">Marcado</Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEdit || updateMutation.isPending}
                        onClick={() => {
                          setPlaceMode({ type: "text", key: f.key });
                          toast.message("Agora clique e arraste no PDF para definir o campo.");
                        }}
                        className="gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Marcar no PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Página</Label>
                        <Input
                          type="number"
                          min={1}
                          max={pdfDoc?.numPages || 1}
                          value={f.page}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = clamp(Number(e.target.value || 1), 1, pdfDoc?.numPages || 1);
                            setValue((prev) => ({ ...prev, textFields: prev.textFields.map((x) => (x.key === f.key ? { ...x, page: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">X</Label>
                        <Input
                          type="number"
                          value={f.x}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = toNumber(e.target.value, f.x);
                            setValue((prev) => ({ ...prev, textFields: prev.textFields.map((x) => (x.key === f.key ? { ...x, x: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Y</Label>
                        <Input
                          type="number"
                          value={f.y}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = toNumber(e.target.value, f.y);
                            setValue((prev) => ({ ...prev, textFields: prev.textFields.map((x) => (x.key === f.key ? { ...x, y: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tamanho</Label>
                        <Input
                          type="number"
                          min={6}
                          max={14}
                          value={f.fontSize}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = clamp(Number(e.target.value || 9), 6, 14);
                            setValue((prev) => ({ ...prev, textFields: prev.textFields.map((x) => (x.key === f.key ? { ...x, fontSize: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Largura (max)</Label>
                        <Input
                          type="number"
                          min={20}
                          max={600}
                          value={f.maxWidth}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = clamp(Number(e.target.value || 200), 20, 600);
                            setValue((prev) => ({ ...prev, textFields: prev.textFields.map((x) => (x.key === f.key ? { ...x, maxWidth: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Altura</Label>
                        <Input
                          type="number"
                          min={6}
                          max={60}
                          value={Number(f.boxHeight || 0) || Math.max(8, f.fontSize * 1.4)}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = clamp(Number(e.target.value || 0), 6, 60);
                            setValue((prev) => ({
                              ...prev,
                              textFields: prev.textFields.map((x) => (x.key === f.key ? { ...x, boxHeight: v } : x)),
                            }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="flex items-end justify-end col-span-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!canEdit || updateMutation.isPending}
                          onClick={() => removeField("text", f.key)}
                          className="gap-2 text-destructive"
                        >
                          <XIcon className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="x" className={fullScreenOpen ? "mt-3 flex-1 min-h-0" : "mt-3"}>
                <ScrollArea className={fullScreenOpen ? "h-full pr-2" : "h-[620px] pr-2"}>
                  <div className="space-y-3">
                    {value.checkboxes.map((c) => (
                  <div
                    key={c.key}
                    className={`rounded-md border p-3 space-y-3 ${isValidAnchor(c.x, c.y) ? "border-primary/60 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.label}</div>
                        <div className="text-xs text-muted-foreground">{c.key}</div>
                        {isValidAnchor(c.x, c.y) && (
                          <div className="mt-1">
                            <Badge variant="secondary">Marcado</Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEdit || updateMutation.isPending}
                        onClick={() => {
                          setPlaceMode({ type: "checkbox", key: c.key });
                          toast.message("Agora clique no PDF para posicionar o X.");
                        }}
                        className="gap-2"
                      >
                        <XIcon className="h-4 w-4" />
                        Marcar no PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Página</Label>
                        <Input
                          type="number"
                          min={1}
                          max={pdfDoc?.numPages || 1}
                          value={c.page}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = clamp(Number(e.target.value || 1), 1, pdfDoc?.numPages || 1);
                            setValue((prev) => ({ ...prev, checkboxes: prev.checkboxes.map((x) => (x.key === c.key ? { ...x, page: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">X</Label>
                        <Input
                          type="number"
                          value={c.x}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = toNumber(e.target.value, c.x);
                            setValue((prev) => ({ ...prev, checkboxes: prev.checkboxes.map((x) => (x.key === c.key ? { ...x, x: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Y</Label>
                        <Input
                          type="number"
                          value={c.y}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const v = toNumber(e.target.value, c.y);
                            setValue((prev) => ({ ...prev, checkboxes: prev.checkboxes.map((x) => (x.key === c.key ? { ...x, y: v } : x)) }));
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!canEdit || updateMutation.isPending}
                          onClick={() => removeField("checkbox", c.key)}
                          className="gap-2 text-destructive"
                        >
                          <XIcon className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="text-xs text-muted-foreground">
              Coordenadas são em pontos do PDF (0,0 no canto inferior esquerdo da página).
            </div>
          </div>
            </div>
          </div>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar campo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant={addType === "text" ? "default" : "outline"} onClick={() => setAddType("text")}>
                  Texto
                </Button>
                <Button type="button" variant={addType === "checkbox" ? "default" : "outline"} onClick={() => setAddType("checkbox")}>
                  X
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Chave</Label>
                <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="ex: filiacao1_nome" />
              </div>
              <div className="space-y-2">
                <Label>Rótulo</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="ex: Filiação 1: Nome" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={addField} disabled={!newKey.trim() || !newLabel.trim()}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar campos do formulário</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Buscar</Label>
                  <Input value={camposInscricaoSearch} onChange={(e) => setCamposInscricaoSearch(e.target.value)} className="w-[280px]" />
                </div>
                <label className="flex items-center gap-2">
                  <Checkbox checked={importAddText} onCheckedChange={(v) => setImportAddText(Boolean(v))} />
                  <span className="text-sm">Criar texto</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={importAddXs} onCheckedChange={(v) => setImportAddXs(Boolean(v))} />
                  <span className="text-sm">Criar X (select/checkbox)</span>
                </label>
              </div>

              <Separator />

              {camposInscricaoLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4 animate-spin" />
                  Carregando campos...
                </div>
              ) : (
                <ScrollArea className="h-[55vh] pr-2">
                  <div className="space-y-2">
                    {camposInscricao
                      .filter((c) => {
                        const term = camposInscricaoSearch.trim().toLowerCase();
                        if (!term) return true;
                        return (
                          String(c.label || "").toLowerCase().includes(term) ||
                          String(c.nome_campo || "").toLowerCase().includes(term) ||
                          String(c.secao || "").toLowerCase().includes(term)
                        );
                      })
                      .map((c) => {
                        const id = String(c.id);
                        const checked = Boolean(camposInscricaoSelected[id]);
                        return (
                          <label key={id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => setCamposInscricaoSelected((prev) => ({ ...prev, [id]: Boolean(v) }))}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{String(c.label || c.nome_campo)}</div>
                              <div className="text-xs text-muted-foreground">
                                {String(c.secao)} · {String(c.tipo)} · {String(c.nome_campo)}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const ids = camposInscricao.map((c) => String(c.id));
                  setCamposInscricaoSelected((prev) => {
                    const next: Record<string, boolean> = { ...prev };
                    ids.forEach((id) => (next[id] = true));
                    return next;
                  });
                }}
              >
                Selecionar todos
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCamposInscricaoSelected({});
                }}
              >
                Limpar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const ids = Object.entries(camposInscricaoSelected)
                    .filter(([, v]) => v)
                    .map(([id]) => id);
                  importCampos(ids);
                  setImportDialogOpen(false);
                }}
                disabled={!canEdit || updateMutation.isPending}
              >
                Adicionar selecionados
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

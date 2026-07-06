import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { fixSystemEncoding } from "@/utils/encoding-fix";
import {
  useTutoriaisVideos,
  useDeleteTutorialVideo,
  useTutorialSecoes,
  useDeleteTutorialSecao,
  useTutorialFaq,
  useDeleteTutorialFaq,
  useTutorialDicas,
  useDeleteTutorialDica,
  TutorialVideo,
  TutorialSecao,
  TutorialFaq,
  TutorialDica,
} from "@/hooks/api/tutoriais-hooks";
import { TutorialVideoDialog } from "@/components/admin/TutorialVideoDialog";
import { TutorialSecaoDialog } from "@/components/admin/TutorialSecaoDialog";
import { TutorialFaqDialog } from "@/components/admin/TutorialFaqDialog";
import { TutorialDicaDialog } from "@/components/admin/TutorialDicaDialog";
import { SuporteConfigDialog } from "@/components/admin/SuporteConfigDialog";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { HelpCircle, ListOrdered, GraduationCap, School, Settings, Bell, BarChart3, RefreshCw, ArrowRightLeft, FileCheck, CheckCircle2, AlertCircle, Info, PlayCircle, Video, MessageCircleQuestion, BookOpen, Search, Mail, Phone, Send, ExternalLink, Plus, Pencil, Trash2, LayoutDashboard, FileText, Building, MessageCircle, Users, FileSearch, Calendar, Keyboard, Filter, Download, Moon } from "lucide-react";

// Mapa de ícones para renderização dinâmica
const iconComponents: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "file-text": FileText,
  "list-ordered": ListOrdered,
  "bell": Bell,
  "graduation-cap": GraduationCap,
  "building": Building,
  "message-circle": MessageCircle,
  "users": Users,
  "file-search": FileSearch,
  "bar-chart": BarChart3,
  "settings": Settings,
  "calendar": Calendar,
  "help-circle": HelpCircle,
  "info": Info,
  "check-circle-2": CheckCircle2,
  "alert-circle": AlertCircle,
  "keyboard": Keyboard,
  "filter": Filter,
  "download": Download,
  "moon": Moon,
  "arrow-right-left": ArrowRightLeft,
  "file-check": FileCheck,
  "refresh-cw": RefreshCw,
  "school": School,
};

const getIconComponent = (iconName: string | null): LucideIcon => {
  if (!iconName) return HelpCircle;
  return iconComponents[iconName] || HelpCircle;
};

export default function Tutorial() {
  const navigate = useNavigate();
  const { data: config } = useConfiguracoesSistema();
  const { data: dbVideos, isLoading: isLoadingVideos } = useTutoriaisVideos();
  const { data: dbSecoes, isLoading: isLoadingSecoes } = useTutorialSecoes();
  const { data: dbFaq, isLoading: isLoadingFaq } = useTutorialFaq();
  const { data: dbDicas, isLoading: isLoadingDicas } = useTutorialDicas();
  
  const deleteVideo = useDeleteTutorialVideo();
  const deleteSecao = useDeleteTutorialSecao();
  const deleteFaq = useDeleteTutorialFaq();
  const deleteDica = useDeleteTutorialDica();
  
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("superadmin");
  
  const [isFixing, setIsFixing] = useState(false);

  const handleFixEncoding = async () => {
    if (!confirm("Isso irá tentar corrigir automaticamente caracteres mal formatados em todas as seções (Tutorial, FAQ, Configurações, etc). Deseja continuar?")) return;
    
    setIsFixing(true);
    toast.info("Iniciando correção de codificação...");
    
    const result = await fixSystemEncoding(supabase);
    
    if (result.success) {
      toast.success(`Correção concluída! ${result.fixedCount} registros atualizados.`);
      // Aguardar um pouco para o usuário ler e recarregar
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      console.error(result.error);
      toast.error("Erro ao corrigir codificação. Verifique o console.");
    }
    
    setIsFixing(false);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  // Dialogs de edição
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [secaoDialogOpen, setSecaoDialogOpen] = useState(false);
  const [editingSecao, setEditingSecao] = useState<TutorialSecao | null>(null);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<TutorialFaq | null>(null);
  const [dicaDialogOpen, setDicaDialogOpen] = useState(false);
  const [editingDica, setEditingDica] = useState<TutorialDica | null>(null);
  const [suporteConfigOpen, setSuporteConfigOpen] = useState(false);
  
  const [contactForm, setContactForm] = useState({
    nome: "",
    email: "",
    assunto: "",
    mensagem: "",
  });
  const [sendingContact, setSendingContact] = useState(false);

  // Dados do banco
  const videoTutorials = dbVideos || [];
  const tutorialSections = dbSecoes || [];
  const tutorialDicas = dbDicas || [];

  // Agrupar FAQs por categoria
  const faqItems = useMemo(() => {
    if (!dbFaq) return [];
    const grouped: Record<string, TutorialFaq[]> = {};
    dbFaq.forEach((faq) => {
      if (!grouped[faq.categoria]) {
        grouped[faq.categoria] = [];
      }
      grouped[faq.categoria].push(faq);
    });
    return Object.entries(grouped).map(([category, questions]) => ({
      category,
      questions,
    }));
  }, [dbFaq]);

  // Lógica de contato diferenciada por role
  const contatoEmailRaw = isSuperAdmin
    ? config?.suporte_dev_email || ""
    : config?.suporte_email || config?.email_contato || "";
  
  const contatoTelefoneRaw = isSuperAdmin
    ? config?.suporte_dev_telefone || ""
    : config?.suporte_telefone || config?.telefone_contato || "";

  // Formatar telefone para exibição
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const contatoEmail = contatoEmailRaw;
  const contatoTelefone = contatoTelefoneRaw ? formatPhone(contatoTelefoneRaw) : "";

  const contatoNome = isSuperAdmin
    ? config?.suporte_dev_nome || "Suporte Técnico"
    : "Suporte do Sistema";

  // Filtrar conteúdo baseado na busca
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return tutorialSections;
    const term = searchTerm.toLowerCase();
    return tutorialSections.filter(
      (section) =>
        section.titulo.toLowerCase().includes(term) ||
        (section.descricao?.toLowerCase().includes(term)) ||
        section.conteudo.some(
          (c) =>
            c.subtitle.toLowerCase().includes(term) ||
            c.text.toLowerCase().includes(term)
        )
    );
  }, [searchTerm, tutorialSections]);

  const filteredFaq = useMemo(() => {
    if (!searchTerm.trim()) return faqItems;
    const term = searchTerm.toLowerCase();
    return faqItems
      .map((category) => ({
        ...category,
        questions: category.questions.filter(
          (q) =>
            q.pergunta.toLowerCase().includes(term) || q.resposta.toLowerCase().includes(term)
        ),
      }))
      .filter((category) => category.questions.length > 0);
  }, [searchTerm, faqItems]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.nome.trim() || !contactForm.email.trim() || !contactForm.mensagem.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSendingContact(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enviar-contato', {
        body: {
          nome: contactForm.nome,
          email: contactForm.email,
          assunto: contactForm.assunto || "Dúvida sobre o sistema",
          mensagem: contactForm.mensagem,
          destinatario: 'suporte', // Envia para o email do desenvolvedor
        },
      });

      if (error) throw error;

      if (data?.sucesso) {
        toast.success("Mensagem enviada com sucesso! Entraremos em contato em breve.");
        setContactForm({ nome: "", email: "", assunto: "", mensagem: "" });
      } else {
        throw new Error(data?.erro || "Erro ao enviar mensagem");
      }
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error.message || "Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSendingContact(false);
    }
  };

  const handleWhatsAppContact = () => {
    const phone = contatoTelefoneRaw?.replace(/\D/g, "") || "";
    if (!phone) {
      toast.error("Telefone de contato não configurado");
      return;
    }
    const message = encodeURIComponent("Olá! Preciso de ajuda com o sistema VAGOU.");
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleEmailContact = () => {
    if (!contatoEmail) {
      toast.error("E-mail de contato não configurado");
      return;
    }
    window.open(`mailto:${contatoEmail}?subject=${encodeURIComponent("Dúvida sobre o sistema VAGOU")}`, "_blank");
  };

  const handleVideoClick = (video: TutorialVideo) => {
    if (video.youtube_id) {
      setSelectedVideo(video.youtube_id);
    } else {
      toast.info("Vídeo ainda não disponível. Em breve!");
    }
  };

  // Handlers de edição
  const handleEditVideo = (video: TutorialVideo) => {
    setEditingVideo(video);
    setVideoDialogOpen(true);
  };

  const handleDeleteVideo = (video: TutorialVideo) => {
    if (confirm(`Deseja realmente excluir o vídeo "${video.titulo}"?`)) {
      deleteVideo.mutate(video.id);
    }
  };

  const handleNewVideo = () => {
    setEditingVideo(null);
    setVideoDialogOpen(true);
  };

  const handleEditSecao = (secao: TutorialSecao) => {
    setEditingSecao(secao);
    setSecaoDialogOpen(true);
  };

  const handleDeleteSecao = (secao: TutorialSecao) => {
    if (confirm(`Deseja realmente excluir a seção "${secao.titulo}"?`)) {
      deleteSecao.mutate(secao.id);
    }
  };

  const handleNewSecao = () => {
    setEditingSecao(null);
    setSecaoDialogOpen(true);
  };

  const handleEditFaq = (faq: TutorialFaq) => {
    setEditingFaq(faq);
    setFaqDialogOpen(true);
  };

  const handleDeleteFaq = (faq: TutorialFaq) => {
    if (confirm(`Deseja realmente excluir esta pergunta?`)) {
      deleteFaq.mutate(faq.id);
    }
  };

  const handleNewFaq = () => {
    setEditingFaq(null);
    setFaqDialogOpen(true);
  };

  const handleEditDica = (dica: TutorialDica) => {
    setEditingDica(dica);
    setDicaDialogOpen(true);
  };

  const handleDeleteDica = (dica: TutorialDica) => {
    if (confirm(`Deseja realmente excluir a dica "${dica.titulo}"?`)) {
      deleteDica.mutate(dica.id);
    }
  };

  const handleNewDica = () => {
    setEditingDica(null);
    setDicaDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 sm:p-8 text-primary-foreground shadow-elegant">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                <HelpCircle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Central de Ajuda
                </h1>
                <p className="mt-1 max-w-xl text-sm text-primary-foreground/80">
                  Tutoriais, vídeos e perguntas frequentes para você dominar o sistema.
                </p>
              </div>
            </div>

            {/* Botões de Contato Rápido */}
            <div className="flex flex-wrap gap-2">
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  onClick={handleFixEncoding}
                  disabled={isFixing}
                  className="gap-2 border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
                >
                  {isFixing ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Corrigir Codificação
                </Button>
              )}
              <Button
                onClick={() => navigate("/modulo/vagou/admin/cursos")}
                className="gap-2 bg-white text-primary hover:bg-white/90"
              >
                <GraduationCap className="h-4 w-4" />
                Vagou EaD
              </Button>
              <Button
                variant="outline"
                onClick={handleEmailContact}
                className="gap-2 border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
              >
                <Mail className="h-4 w-4" />
                E-mail
              </Button>
              {contatoTelefone && (
                <Button onClick={handleWhatsAppContact} className="gap-2 bg-green-600 text-white hover:bg-green-700">
                  <WhatsAppIcon className="h-4 w-4 fill-white" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>

          {/* Barra de Busca */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por palavra-chave (ex: matrícula, convocação, documentos...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 rounded-xl border-0 bg-white pl-11 text-foreground shadow-lg placeholder:text-muted-foreground"
              maxLength={100}
            />
            {searchTerm && (
              <p className="mt-2 text-sm text-primary-foreground/80">
                {filteredSections.length} seções e {filteredFaq.reduce((acc, cat) => acc + cat.questions.length, 0)} perguntas encontradas
              </p>
            )}
          </div>
        </div>

        {/* Dicas Rápidas */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dicas Rápidas</h2>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={handleNewDica}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
        
        {isLoadingDicas ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tutorialDicas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma dica cadastrada ainda.</p>
              {isSuperAdmin && (
                <Button onClick={handleNewDica} className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Dica
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {tutorialDicas.map((dica) => {
              const IconComp = getIconComponent(dica.icone);
              return (
                <Card
                  key={dica.id}
                  className="group relative overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elegant"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" aria-hidden />
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{dica.titulo}</h3>
                        <p className="text-sm text-muted-foreground">{dica.descricao}</p>
                      </div>
                    </div>
                  </CardContent>
                  {isSuperAdmin && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditDica(dica)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDica(dica)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Tabs principais */}
        <Tabs defaultValue="guia" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="guia" className="gap-2 rounded-lg py-2 data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Guia</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2 rounded-lg py-2 data-[state=active]:shadow-sm">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Vídeos</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2 rounded-lg py-2 data-[state=active]:shadow-sm">
              <MessageCircleQuestion className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="contato" className="gap-2 rounded-lg py-2 data-[state=active]:shadow-sm">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Contato</span>
            </TabsTrigger>
          </TabsList>

          {/* Guia Completo */}
          <TabsContent value="guia" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PlayCircle className="h-5 w-5" />
                      Guia de Funcionalidades
                    </CardTitle>
                    <CardDescription>
                      Clique em cada seção para ver as instruções
                    </CardDescription>
                  </div>
                  {isSuperAdmin && (
                    <Button onClick={handleNewSecao} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSecoes ? (
                  <div className="flex justify-center py-8">
                    <Spinner className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{searchTerm ? `Nenhum resultado encontrado para "${searchTerm}"` : "Nenhuma seção cadastrada ainda."}</p>
                    {isSuperAdmin && !searchTerm && (
                      <Button onClick={handleNewSecao} className="mt-4" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Primeira Seção
                      </Button>
                    )}
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {filteredSections.map((section) => {
                      const IconComp = getIconComponent(section.icone);
                      return (
                        <AccordionItem key={section.id} value={section.id} className="group">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <IconComp className="h-5 w-5 text-primary" />
                              </div>
                              <div className="text-left flex-1">
                                <h3 className="font-medium">{section.titulo}</h3>
                                <p className="text-sm text-muted-foreground font-normal">
                                  {section.descricao}
                                </p>
                              </div>
                              {isSuperAdmin && (
                                <div className="flex gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); handleEditSecao(section); }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSecao(section); }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-13 space-y-4 pt-2">
                              {section.conteudo.map((item, idx) => (
                                <div key={idx} className="border-l-2 border-muted pl-4 py-2">
                                  <h4 className="font-medium text-sm text-primary mb-1">
                                    {item.subtitle}
                                  </h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                                    {item.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vídeos Tutoriais */}
          <TabsContent value="videos" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Vídeos Tutoriais
                    </CardTitle>
                    <CardDescription>
                      Assista aos vídeos para aprender visualmente
                    </CardDescription>
                  </div>
                  {isSuperAdmin && (
                    <Button onClick={handleNewVideo} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Player de Vídeo */}
                {selectedVideo && (
                  <div className="mb-6">
                    <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black">
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                        title="Tutorial Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setSelectedVideo(null)}
                    >
                      Fechar vídeo
                    </Button>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {isLoadingVideos ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                      <Spinner className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : videoTutorials.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum vídeo tutorial disponível ainda.</p>
                      {isSuperAdmin && (
                        <Button onClick={handleNewVideo} className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Primeiro Vídeo
                        </Button>
                      )}
                    </div>
                  ) : (
                    videoTutorials.map((video) => (
                      <Card
                        key={video.id}
                        className={`overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group ${
                          !video.youtube_id ? "opacity-70" : ""
                        }`}
                        onClick={() => handleVideoClick(video)}
                      >
                        <div className="relative">
                          {video.youtube_id ? (
                            <img
                              src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                              alt={video.titulo}
                              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-40 bg-muted flex items-center justify-center">
                              <Video className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                              <PlayCircle className="h-10 w-10 text-primary" />
                            </div>
                          </div>
                          {video.duracao && (
                            <Badge className="absolute bottom-2 right-2 bg-black/70">
                              {video.duracao}
                            </Badge>
                          )}
                          {!video.youtube_id && (
                            <Badge variant="secondary" className="absolute top-2 left-2">
                              Em breve
                            </Badge>
                          )}
                          {isSuperAdmin && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); handleEditVideo(video); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-1">{video.titulo}</h3>
                          <p className="text-sm text-muted-foreground">{video.descricao}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircleQuestion className="h-5 w-5" />
                      Perguntas Frequentes
                    </CardTitle>
                    <CardDescription>
                      Encontre respostas para as dúvidas mais comuns
                    </CardDescription>
                  </div>
                  {isSuperAdmin && (
                    <Button onClick={handleNewFaq} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFaq ? (
                  <div className="flex justify-center py-8">
                    <Spinner className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredFaq.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{searchTerm ? `Nenhuma pergunta encontrada para "${searchTerm}"` : "Nenhuma FAQ cadastrada ainda."}</p>
                    {isSuperAdmin && !searchTerm && (
                      <Button onClick={handleNewFaq} className="mt-4" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Primeira Pergunta
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredFaq.map((category, catIdx) => (
                      <div key={catIdx}>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Badge variant="outline">{category.category}</Badge>
                        </h3>
                        <Accordion type="single" collapsible className="w-full">
                          {category.questions.map((item, idx) => (
                            <AccordionItem key={item.id} value={item.id} className="group">
                              <AccordionTrigger className="text-left hover:no-underline">
                                <div className="flex items-center gap-2 flex-1 pr-4">
                                  <span className="flex-1">{item.pergunta}</span>
                                  {isSuperAdmin && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6"
                                        asChild
                                        onClick={(e) => { e.stopPropagation(); handleEditFaq(item); }}
                                      >
                                        <span role="button" className="cursor-pointer">
                                          <Pencil className="h-3 w-3" />
                                        </span>
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-destructive"
                                        asChild
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFaq(item); }}
                                      >
                                        <span role="button" className="cursor-pointer">
                                          <Trash2 className="h-3 w-3" />
                                        </span>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <p className="text-muted-foreground pl-4 border-l-2 border-primary/30">
                                  {item.resposta}
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contato */}
          <TabsContent value="contato" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Formulário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Envie sua Dúvida
                  </CardTitle>
                  <CardDescription>
                    {isSuperAdmin 
                      ? "Entre em contato com o suporte técnico do desenvolvedor"
                      : "Não encontrou a resposta? Envie sua pergunta ao suporte"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome *</Label>
                        <Input
                          id="nome"
                          placeholder="Seu nome"
                          value={contactForm.nome}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, nome: e.target.value })
                          }
                          maxLength={100}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, email: e.target.value })
                          }
                          maxLength={255}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assunto">Assunto</Label>
                      <Input
                        id="assunto"
                        placeholder="Sobre o que é sua dúvida?"
                        value={contactForm.assunto}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, assunto: e.target.value })
                        }
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mensagem">Mensagem *</Label>
                      <Textarea
                        id="mensagem"
                        placeholder="Descreva sua dúvida em detalhes..."
                        value={contactForm.mensagem}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, mensagem: e.target.value })
                        }
                        rows={5}
                        maxLength={2000}
                        required
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {contactForm.mensagem.length}/2000
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={sendingContact}>
                      {sendingContact ? (
                        <>Enviando...</>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contatos Diretos */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Contato Direto</CardTitle>
                      <CardDescription>
                        {isSuperAdmin
                          ? `Contato: ${contatoNome}`
                          : "Prefere falar diretamente? Use os canais abaixo"
                        }
                      </CardDescription>
                    </div>
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSuporteConfigOpen(true)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Botão de E-mail */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-4"
                      onClick={handleEmailContact}
                      disabled={!contatoEmail}
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">E-mail</p>
                        <p className="text-sm text-muted-foreground">
                          {contatoEmail || "Não configurado"}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                    </Button>

                    {/* Botão de WhatsApp */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-4"
                      onClick={handleWhatsAppContact}
                      disabled={!contatoTelefone}
                    >
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <WhatsAppIcon className="h-5 w-5 text-green-600 fill-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-sm text-muted-foreground">
                          {contatoTelefone || "Não configurado"}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Info className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {isSuperAdmin ? "Suporte Técnico" : "Horário de Atendimento"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isSuperAdmin 
                            ? "Para questões técnicas, bugs ou melhorias do sistema."
                            : "Segunda a Sexta: 8h às 17h"
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <TutorialVideoDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        video={editingVideo}
      />
      <TutorialSecaoDialog
        open={secaoDialogOpen}
        onOpenChange={setSecaoDialogOpen}
        secao={editingSecao}
      />
      <TutorialFaqDialog
        open={faqDialogOpen}
        onOpenChange={setFaqDialogOpen}
        faq={editingFaq}
      />
      <TutorialDicaDialog
        open={dicaDialogOpen}
        onOpenChange={setDicaDialogOpen}
        dica={editingDica}
      />
      <SuporteConfigDialog
        open={suporteConfigOpen}
        onOpenChange={setSuporteConfigOpen}
      />
    </AdminLayout>
  );
}


import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Users, Building2, Search, Clock, CheckCircle2, Phone, Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import heroChildrenImg from "@/assets/hero-children.png";
import { InscricaoChoiceDialog } from "@/components/public/InscricaoChoiceDialog";
import { getUnidadeLabels } from "@/utils/unidade-utils";
const PublicHome = () => {
  const navigate = useNavigate();
  const [showChoiceDialog, setShowChoiceDialog] = useState(false);
  const {
    data: config
  } = useConfiguracoesPublicas();
  const {
    singular,
    plural
  } = getUnidadeLabels(config as any);
  const nomeMunicipio = config?.nome_municipio;
  const nomeSecretaria = config?.nome_secretaria;
  const sistemaNome = config?.sistema_nome || "VAGOU";
  const brasaoUrl = config?.brasao_url;
  const sistemaIconeUrl = config?.sistema_icone_url;
  const dataInicio = config?.data_inicio_inscricao;
  const dataFim = config?.data_fim_inscricao;
  const autenticacaoPublica = config?.autenticacao_publica;
  const hoje = new Date();
  const inscricoesAbertas = dataInicio && dataFim ? isAfter(hoje, parseISO(dataInicio)) && isBefore(hoje, parseISO(dataFim)) : false;
  const periodoInscricao = dataInicio && dataFim ? `${format(parseISO(dataInicio), "dd 'de' MMMM", {
    locale: ptBR
  })} a ${format(parseISO(dataFim), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR
  })}` : null;
  const handleNovaInscricao = () => {
    // Se autenticação é obrigatória, vai direto para login
    if (autenticacaoPublica) {
      navigate("/auth/login", {
        state: {
          redirectTo: "/modulo/vagou/responsavel/inscricao"
        }
      });
    } else {
      // Se não é obrigatória, mostra diálogo de escolha
      setShowChoiceDialog(true);
    }
  };
  return <PublicLayout>
      <div className="flex-1 bg-background">
        {/* Hero com fundo de crianças */}
        <section className="group relative min-h-[400px] md:min-h-[480px] flex items-center overflow-hidden bg-primary-foreground">
          {/* Background Image - Grayscale (shown in light and dark) */}
          <img src={heroChildrenImg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover grayscale opacity-50 dark:opacity-15 motion-safe:transform-gpu motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.06]" />
          {/* Overlay com cor primária (light) */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-primary/70 dark:hidden" />
          {/* Overlay neutro escuro (dark) */}
          <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-black/85 via-black/80 to-black/70" />
          
          {/* Conteúdo */}
          <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12 md:py-16">
            <div className="text-center text-primary-foreground dark:text-white">
              {/* Brasão e Nome do Sistema */}
              <div className="flex flex-col items-center gap-4 mb-6">
                {(brasaoUrl || sistemaIconeUrl) && <div className="logo-surface w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/20 flex items-center justify-center overflow-hidden">
                    <img src={brasaoUrl || sistemaIconeUrl} alt={`Brasão de ${nomeMunicipio || 'Município'}`} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
                  </div>}
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                    {sistemaNome}
                  </h1>
                  <p className="text-white/80 mt-1 whitespace-pre-line">
                    {"Gestão Inteligente de Vagas\n da Educação Infantil"}
                  </p>
                </div>
              </div>

              {/* Info do Município */}
              {(nomeSecretaria || nomeMunicipio) && <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm text-sm mb-6 border border-white/20 dark:border-white/10">
                  <Building2 className="h-4 w-4 text-white/90 dark:text-white/70" />
                  <span className="text-white/90 dark:text-white/70">
                    {nomeSecretaria}{nomeSecretaria && nomeMunicipio && ' • '}{nomeMunicipio}
                  </span>
                </div>}
              
              <p className="text-lg md:text-xl text-white/90 dark:text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
                Inscreva seu filho nas creches municipais e acompanhe todo o processo de forma simples e transparente
              </p>

              {periodoInscricao && <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 mb-8">
                  <Clock className="h-5 w-5 text-white/90 dark:text-white/70" />
                  <div className="text-left">
                    <p className="text-xs text-white/70 dark:text-white/50">Período de inscrições</p>
                    <p className="font-medium text-white dark:text-white/90">{periodoInscricao}</p>
                  </div>
                  {inscricoesAbertas ? <span className="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-400/30">
                      Abertas
                    </span> : <span className="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      Encerradas
                    </span>}
                </div>}

              <div className="flex flex-col gap-4 max-w-md mx-auto sm:max-w-none">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={handleNovaInscricao} className="h-14 px-8 text-base rounded-xl shadow-lg bg-white text-primary dark:bg-white dark:text-gray-900 font-semibold hover:bg-gray-100 dark:hover:bg-gray-200 hover:scale-105 hover:shadow-xl transition-all duration-200 w-full sm:w-auto">
                    <FileText className="h-5 w-5 mr-2" />
                    Inscrever criança
                  </Button>
                  <Button asChild size="lg" className="h-14 px-8 text-base rounded-xl border-2 border-white dark:border-white/30 bg-transparent text-white font-semibold hover:bg-white hover:text-primary dark:hover:bg-white dark:hover:text-gray-900 hover:scale-105 transition-all duration-200 w-full sm:w-auto">
                    <Link to="/modulo/vagou/publico/consulta">
                      <Search className="h-5 w-5 mr-2" />
                      Consultar inscrição
                    </Link>
                  </Button>
                </div>
                
                {/* Botão de Área do Responsável */}
                <Button asChild size="lg" className="h-14 px-8 text-base rounded-xl border-2 border-white/50 bg-white/10 text-white font-semibold hover:bg-white/20 hover:border-white transition-all duration-200 w-full sm:w-auto sm:mx-auto">
                  <Link to="/auth/login?contexto=responsavel">
                    <LogIn className="h-5 w-5 mr-2" />
                    Área do Responsável
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Dialog de escolha */}
        <InscricaoChoiceDialog open={showChoiceDialog} onOpenChange={setShowChoiceDialog} />

        {/* Serviços */}
        <section className="py-12 md:py-16 bg-muted/30 dark:bg-muted/10">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-8 text-foreground">
              O que você pode fazer
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Card de Inscrição com lógica especial */}
              <button onClick={handleNovaInscricao} className="group flex items-start gap-4 p-5 rounded-xl border bg-card hover:bg-accent/5 hover:border-primary/30 transition-all duration-200 text-left">
                <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Fazer Inscrição
                  </span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Cadastre seu filho na lista de espera
                  </p>
                </div>
              </button>
              
              {/* Outros cards */}
              {[{
              icon: Search,
              label: "Consultar Situação",
              desc: "Acompanhe o status da sua inscrição",
              href: "/modulo/vagou/publico/consulta"
            }, {
              icon: Users,
              label: "Ver Fila de Espera",
              desc: "Consulte a lista completa de inscritos",
              href: "/modulo/vagou/publico/fila"
            }, {
              icon: Building2,
              label: `Ver ${plural}`,
              desc: "Veja as vagas disponíveis por unidade",
              href: "/modulo/vagou/publico/ocupacao"
            }].map(item => <Link key={item.href} to={item.href} className="group flex items-start gap-4 p-5 rounded-xl border bg-card hover:bg-accent/5 hover:border-primary/30 transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </Link>)}
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-10 text-foreground">
              Como funciona
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[{
              step: "1",
              title: "Inscreva",
              desc: "Preencha o formulário com os dados do seu filho",
              icon: FileText
            }, {
              step: "2",
              title: "Aguarde",
              desc: "Acompanhe sua posição na fila de espera",
              icon: Clock
            }, {
              step: "3",
              title: "Matricule",
              desc: `Quando convocado, confirme a matrícula em ${singular}`,
              icon: CheckCircle2
            }].map((item, index) => <div key={item.step} className="relative text-center">
                  {index < 2 && <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-border" />}
                  <div className="relative z-10 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>)}
            </div>
          </div>
        </section>

        {/* Contato */}
        {(config?.email_contato || config?.telefone_contato) && <section className="py-10 border-t bg-muted/20 dark:bg-muted/5">
            <div className="container max-w-4xl mx-auto px-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
                <span className="text-muted-foreground">Precisa de ajuda?</span>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {config?.telefone_contato && <a href={`tel:${config.telefone_contato}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-background border hover:border-primary/30 transition-colors text-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      {config.telefone_contato}
                    </a>}
                  {config?.email_contato && <a href={`mailto:${config.email_contato}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-background border hover:border-primary/30 transition-colors text-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      {config.email_contato}
                    </a>}
                </div>
              </div>
              
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
                <Link to="/modulo/vagou/publico/termos" className="hover:text-primary hover:underline transition-colors">
                  Termos de Uso
                </Link>
                <Link to="/modulo/vagou/publico/privacidade" className="hover:text-primary hover:underline transition-colors">
                  Privacidade e LGPD
                </Link>
              </div>
            </div>
          </section>}
      </div>
    </PublicLayout>;
};
export default PublicHome;

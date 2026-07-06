import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import {
  FileText,
  ShieldCheck,
  UserCheck,
  BarChart3,
  Lock,
  RefreshCw,
  ArrowLeft,
  Scale,
  ListOrdered,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  render: (sistemaNome: string, nomeMunicipio: string, plural: string) => string;
}

const sections: Section[] = [
  {
    icon: Scale,
    title: "1. Aceitação dos Termos",
    render: (sistemaNome, nomeMunicipio, plural) =>
      `Ao acessar e utilizar o sistema ${sistemaNome}, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Este sistema é fornecido pelo ${nomeMunicipio} para facilitar o processo de inscrição em ${plural}.`,
  },
  {
    icon: UserCheck,
    title: "2. Cadastro e Responsabilidades",
    render: () =>
      `O usuário é responsável pela veracidade de todas as informações fornecidas no ato da inscrição. Informações falsas ou inconsistentes podem levar ao cancelamento da inscrição ou da matrícula, conforme legislação municipal vigente.`,
  },
  {
    icon: BarChart3,
    title: "3. Critérios de Classificação",
    render: () =>
      `A classificação na fila de espera segue critérios estabelecidos pela Secretaria Municipal de Educação, levando em conta fatores como vulnerabilidade social, idade da criança e proximidade residencial, conforme regulamentação própria.`,
  },
  {
    icon: Lock,
    title: "4. Uso do Sistema",
    render: () =>
      `O sistema deve ser utilizado exclusivamente para fins de consulta e realização de inscrições escolares. Qualquer tentativa de burlar a segurança ou utilizar o sistema para fins ilícitos resultará em medidas administrativas e judiciais cabíveis.`,
  },
  {
    icon: RefreshCw,
    title: "5. Alterações nos Termos",
    render: () =>
      `A administração municipal reserva-se o direito de alterar estes termos a qualquer momento, visando a melhoria do serviço e a adequação a novas legislações.`,
  },
];

const slug = (index: number) => `secao-${index + 1}`;

const TermosUso = () => {
  const { data: config } = useConfiguracoesPublicas();
  const sistemaNome = config?.sistema_nome || "VAGOU";
  const nomeMunicipio = config?.nome_municipio || "Município";
  const { plural } = getUnidadeLabels(config as any);

  const handleScroll = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PublicLayout>
      <div className="flex-1">
        {/* Hero pequeno */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="govbr-container relative z-10 py-10 md:py-14">
            <div className="max-w-3xl mx-auto text-center animate-fade-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Termos de Uso
              </h1>
              <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto">
                Regras e condições de uso do sistema {sistemaNome}
              </p>
            </div>
          </div>
        </section>

        {/* Conteúdo */}
        <section className="govbr-section bg-muted/30 dark:bg-background">
          <div className="govbr-container max-w-3xl">
            <Link
              to="/modulo/vagou/publico"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary dark:hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o início
            </Link>

            {/* Sumário */}
            <Card className="mb-6 border shadow-sm animate-fade-up">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ListOrdered className="w-5 h-5 text-primary dark:text-foreground" />
                  <h2 className="font-semibold text-foreground text-base">Sumário</h2>
                </div>
                <nav className="grid gap-1">
                  {sections.map((section, index) => (
                    <a
                      key={section.title}
                      href={`#${slug(index)}`}
                      onClick={(e) => handleScroll(e, slug(index))}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 shrink-0 text-primary dark:text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      {section.title}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const text = section.render(sistemaNome, nomeMunicipio, plural);
                return (
                  <Card
                    key={section.title}
                    id={slug(index)}
                    className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-up scroll-mt-24"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-4 p-5 md:p-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-5 h-5 text-primary dark:text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-2 text-base">
                            {section.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {text}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Rodapé legal */}
            <Card className="mt-6 border border-primary/10 bg-primary/[0.03] dark:border-border dark:bg-muted/30">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary dark:text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Última atualização
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default TermosUso;

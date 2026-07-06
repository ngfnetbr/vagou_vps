import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import {
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle,
  Info,
  Database,
  UserCheck,
  ArrowLeft,
  BookOpen,
  ListOrdered,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  render: (sistemaNome: string, nomeMunicipio: string) => string;
}

const highlights = [
  {
    icon: Eye,
    title: "Transparência",
    desc: "Saiba exatamente quais dados coletamos e para que finalidade.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    desc: "Seus dados são protegidos com as melhores práticas de segurança digital.",
  },
  {
    icon: UserCheck,
    title: "Controle",
    desc: "Você tem o direito de acessar e retificar seus dados a qualquer momento.",
  },
];

const sections: Section[] = [
  {
    icon: BookOpen,
    title: "1. Finalidade do Tratamento",
    render: (sistemaNome, nomeMunicipio) =>
      `Os dados pessoais coletados no sistema ${sistemaNome} (nome, CPF, data de nascimento, endereço, etc.) têm como finalidade exclusiva a gestão da fila de espera e o processo de matrícula em Centros Municipais de Educação Infantil do ${nomeMunicipio}.`,
  },
  {
    icon: Database,
    title: "2. Coleta de Dados",
    render: () =>
      `Coletamos apenas os dados estritamente necessários para a identificação da criança e do responsável, além de informações socioeconômicas exigidas por lei para a classificação nas vagas disponíveis.`,
  },
  {
    icon: Lock,
    title: "3. Armazenamento e Segurança",
    render: () =>
      `Os dados são armazenados em servidores seguros, com controle de acesso restrito a servidores municipais autorizados. Utilizamos criptografia e protocolos de segurança para evitar vazamentos e acessos indevidos.`,
  },
  {
    icon: ShieldCheck,
    title: "4. Compartilhamento de Dados",
    render: (_, nomeMunicipio) =>
      `O ${nomeMunicipio} não comercializa seus dados pessoais. O compartilhamento ocorre apenas entre órgãos internos da Secretaria Municipal de Educação para fins de planejamento e execução das matrículas escolares.`,
  },
  {
    icon: CheckCircle,
    title: "5. Seus Direitos",
    render: () =>
      `Conforme a LGPD (Lei 13.709/2018), você tem o direito de solicitar a confirmação da existência de tratamento, o acesso aos seus dados, a correção de dados incompletos ou inexatos, e a portabilidade das informações.`,
  },
];

const slug = (index: number) => `secao-${index + 1}`;

const PrivacidadeLGPD = () => {
  const { data: config } = useConfiguracoesPublicas();
  const sistemaNome = config?.sistema_nome || "VAGOU";
  const nomeMunicipio = config?.nome_municipio || "Município";

  const handleScroll = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PublicLayout>
      <div className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="govbr-container relative z-10 py-10 md:py-14">
            <div className="max-w-3xl mx-auto text-center animate-fade-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Privacidade e Proteção de Dados
              </h1>
              <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto">
                Como tratamos os seus dados no sistema {sistemaNome} conforme a Lei Geral de Proteção de Dados
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

            {/* Cards de destaque */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-fade-up"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center mb-1">
                        <Icon className="w-6 h-6 text-primary dark:text-foreground" />
                      </div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

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

            {/* Seções */}
            <div className="space-y-4">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const text = section.render(sistemaNome, nomeMunicipio);
                return (
                  <Card
                    key={section.title}
                    id={slug(index)}
                    className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-up scroll-mt-24"
                    style={{ animationDelay: `${(index + 3) * 80}ms` }}
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

            {/* Rodapé DPO */}
            <Card className="mt-6 border border-primary/10 bg-primary/[0.03] dark:border-border dark:bg-muted/30">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary dark:text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Dúvidas sobre seus dados?
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Para dúvidas sobre o tratamento de seus dados, entre em contato com o Encarregado de Dados (DPO) da Prefeitura Municipal através dos canais oficiais.
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

export default PrivacidadeLGPD;

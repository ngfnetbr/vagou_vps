import { useMemo } from "react";
import { Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const Contato = () => {
  const { data: config } = useConfiguracoesPublicas();
  const { plural } = getUnidadeLabels(config as any);

  const nomeSecretaria = config?.nome_secretaria || "Secretaria Municipal de Educação";
  const nomeMunicipio = config?.nome_municipio || "Município";
  const emailContato = config?.email_contato;
  const telefoneContato = config?.telefone_contato;
  const enderecoSecretaria = config?.endereco_secretaria;
  const latitude = config?.endereco_latitude;
  const longitude = config?.endereco_longitude;

  const mapUrl = useMemo(() => {
    const latNum = latitude != null ? parseFloat(String(latitude)) : null;
    const lonNum = longitude != null ? parseFloat(String(longitude)) : null;
    const latValid = latNum != null && !Number.isNaN(latNum) && latNum >= -90 && latNum <= 90;
    const lonValid = lonNum != null && !Number.isNaN(lonNum) && lonNum >= -180 && lonNum <= 180;
    if (latValid && lonValid) {
      return `https://maps.google.com/maps?q=${latNum},${lonNum}&z=16&output=embed`;
    }
    if (enderecoSecretaria) {
      const encodedAddress = encodeURIComponent(`${enderecoSecretaria}, ${nomeMunicipio}`);
      return `https://maps.google.com/maps?q=${encodedAddress}&z=16&output=embed`;
    }
    return null;
  }, [latitude, longitude, enderecoSecretaria, nomeMunicipio]);

  const directionsUrl = useMemo(() => {
    const latNum = latitude != null ? parseFloat(String(latitude)) : null;
    const lonNum = longitude != null ? parseFloat(String(longitude)) : null;
    if (latNum != null && lonNum != null && !Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lonNum}`;
    }
    const dest = encodeURIComponent(`${enderecoSecretaria || nomeSecretaria}, ${nomeMunicipio}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }, [latitude, longitude, enderecoSecretaria, nomeSecretaria, nomeMunicipio]);

  return (
    <PublicLayout>
      <div className="bg-muted/40 py-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-8 px-4 md:space-y-12 md:px-8">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-2xl md:p-16">
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="relative z-10 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Mail className="h-4 w-4" />
                Atendimento ao cidadão
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">Fale Conosco</h1>
              <p className="text-lg font-light leading-relaxed text-primary-foreground/90 md:text-xl">
                Entre em contato com a {nomeSecretaria} de {nomeMunicipio}. Estamos aqui para ajudar
                com suas dúvidas sobre inscrições, matrículas e {plural}.
              </p>
            </div>
          </div>

          {/* Channels Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* E-mail */}
            {emailContato && (
              <div className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">E-mail</h3>
                <a href={`mailto:${emailContato}`} className="break-all font-semibold text-primary hover:underline">
                  {emailContato}
                </a>
                <p className="mt-4 text-sm text-muted-foreground">Resposta em até 48h úteis</p>
              </div>
            )}

            {/* WhatsApp */}
            {telefoneContato && (
              <div className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 transition-transform group-hover:scale-110 dark:bg-emerald-900/30">
                  <WhatsAppIcon className="h-6 w-6 fill-emerald-600" />
                </div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">WhatsApp</h3>
                <a
                  href={`https://wa.me/${telefoneContato.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {telefoneContato}
                </a>
                <p className="mt-4 text-sm text-muted-foreground">Segunda a Sexta, 8h às 17h</p>
              </div>
            )}

            {/* Endereço */}
            <div className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-xl">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 transition-transform group-hover:scale-110 dark:bg-amber-900/30">
                <MapPin className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Endereço</h3>
              <p className="text-sm font-medium leading-snug text-foreground">
                {nomeSecretaria}
              </p>
              {enderecoSecretaria && (
                <p className="mt-1 text-sm text-muted-foreground">{enderecoSecretaria}</p>
              )}
              <p className="text-sm text-muted-foreground">{nomeMunicipio}</p>
            </div>

            {/* Horário */}
            <div className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary transition-transform group-hover:scale-110">
                <Clock className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Horário</h3>
              <p className="text-sm font-medium text-foreground">
                Segunda a Sexta
                <br />
                <span className="font-bold text-primary">8h às 12h | 13h às 17h</span>
              </p>
            </div>
          </div>

          {/* Map Section */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
            <div className="flex flex-col justify-between gap-4 border-b border-border p-8 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Onde Estamos</h2>
                <p className="text-muted-foreground">Visite a {nomeSecretaria}</p>
              </div>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
              >
                Como chegar
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
            {mapUrl ? (
              <div className="aspect-video md:aspect-[21/9]">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização da Secretaria"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted md:aspect-[21/9]">
                <div className="p-8 text-center text-muted-foreground">
                  <MapPin className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="font-medium">Mapa da localização</p>
                  <p className="text-sm">
                    Configure o endereço da secretaria nas configurações do sistema para exibir o mapa aqui.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contato;

import { Link } from "react-router-dom";
import { Mail, MapPin, ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import hfLogo from "@/assets/hf-logo.png";
import { getUnidadeLabels } from "@/utils/unidade-utils";

export const PublicFooter = () => {
  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);

  const logoUrl = config?.logo_empresa_url || hfLogo;
  const logoLink = (config as any)?.logo_empresa_link || "https://hfgestaopublica.com.br/";
  const sistemaNome = config?.sistema_nome || "VAGOU";
  const nomeMunicipio = config?.nome_municipio || "Município";
  const nomeSecretaria = config?.nome_secretaria || "Secretaria de Educação";
  const emailContato = config?.email_contato;
  const telefoneContato = config?.telefone_contato;
  const brasaoUrl = config?.brasao_url;
  const enderecoSecretaria = (config as any)?.endereco_secretaria;

  const handleWhatsApp = () => {
    if (!telefoneContato) return;
    const phone = telefoneContato.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá! Gostaria de informações sobre o sistema ${sistemaNome}.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  return (
    <footer className="bg-primary text-primary-foreground mt-auto dark:bg-[#262626] dark:text-foreground dark:border-t dark:border-border">
      <div className="govbr-container py-8">
        <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-12">
          {/* Sobre */}
          <div className="md:max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              {brasaoUrl && (
                <div className="logo-surface w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={brasaoUrl} 
                    alt="Brasão" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{sistemaNome}</h3>
                <p className="text-xs opacity-90">{nomeMunicipio}</p>
              </div>
            </div>
            <p className="text-sm opacity-90">
              Sistema de gestão de vagas em Centros Municipais de Educação Infantil.
              Transparência e eficiência no processo de inscrição e matrícula.
            </p>
          </div>
          
          {/* Contato */}
          <div className="shrink-0">
            <h3 className="font-semibold mb-4">Contato</h3>
            <ul className="space-y-3 text-sm">
              {emailContato && (
                <li>
                  <a 
                    href={`mailto:${emailContato}`}
                    className="flex items-center gap-2 hover:underline opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{emailContato}</span>
                  </a>
                </li>
              )}
              {telefoneContato && (
                <li>
                  <button 
                    onClick={handleWhatsApp}
                    className="flex items-center gap-2 hover:underline opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <WhatsAppIcon className="w-4 h-4 flex-shrink-0 fill-current" />
                    <span>{telefoneContato}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </li>
              )}
              <li className="flex items-start gap-2 opacity-90">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block">{nomeSecretaria}</span>
                  {enderecoSecretaria && (
                    <span className="block text-xs opacity-90">{enderecoSecretaria}</span>
                  )}
                </div>
              </li>
            </ul>
          </div>
          
          {/* Links Úteis */}
          <div className="shrink-0">
            <h3 className="font-semibold mb-4">Links Úteis</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/modulo/vagou/publico/inscricao" className="hover:underline opacity-90 hover:opacity-100">
                  Nova Inscrição
                </Link>
              </li>
              <li>
                <Link to="/modulo/vagou/publico/fila" className="hover:underline opacity-90 hover:opacity-100">
                  Fila de Espera
                </Link>
              </li>
              <li>
                <Link to="/modulo/vagou/publico/ocupacao" className="hover:underline opacity-90 hover:opacity-100">
                  Ocupação por {singular}
                </Link>
              </li>
              <li>
                <Link to="/modulo/vagou/publico/consulta" className="hover:underline opacity-90 hover:opacity-100">
                  Consultar pelo CPF
                </Link>
              </li>
              <li>
                <Link to="/auth/login?contexto=responsavel" className="hover:underline opacity-90 hover:opacity-100">
                  Área Restrita
                </Link>
              </li>
              <li className="pt-2 border-t border-primary-foreground/10">
                <Link to="/modulo/vagou/publico/termos" className="text-xs hover:underline opacity-80 hover:opacity-100 block">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/modulo/vagou/publico/privacidade" className="text-xs hover:underline opacity-80 hover:opacity-100 block">
                  Privacidade e LGPD
                </Link>
              </li>
            </ul>
          </div>

          {/* Logo HF */}
          <div className="flex flex-col items-center md:items-start shrink-0">
            <a 
              href={logoLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-24 md:h-36 w-auto object-contain"
              />
            </a>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm opacity-90">
          <p>
            &copy; {new Date().getFullYear()} {sistemaNome} - {nomeSecretaria} - {nomeMunicipio}
          </p>
        </div>
      </div>
    </footer>
  );
};



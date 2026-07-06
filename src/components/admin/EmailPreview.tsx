import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle, CheckCircle, Bell, Edit, Lock } from "lucide-react";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { useTemplatePorTipo, processarTemplate } from "@/hooks/api/templates-hooks";
import { TemplateEditorDialog } from "./TemplateEditorDialog";
import DOMPurify from "dompurify";

// Mapeamento entre os tipos locais e os do banco de dados
const TIPO_MAPPING = {
  convocacao: "convocacao",
  matricula: "matricula_confirmada",
  lembrete: "lembrete_prazo",
  remanejamento: "remanejamento_solicitado",
  recuperacao_senha: "recuperacao_senha"
} as const;

type TipoEmail = keyof typeof TIPO_MAPPING;

const dadosFicticios = {
  crianca_nome: "Maria Silva",
  responsavel_nome: "José Silva",
  cmei_nome: "Unidade Jardim das Flores",
  turma_nome: "Infantil 2 - Manhã",
  data_limite: "15/01/2025",
  posicao_fila: 5,
  municipio_nome: "Diamante do Norte",
  secretaria_nome: "Secretaria de Educação",
  ano: new Date().getFullYear(),
  link_recuperacao: "https://vagou.exemplo.com/recuperar-senha?token=123456"
};

export const EmailPreview = () => {
  const [tipoEmail, setTipoEmail] = useState<TipoEmail>("convocacao");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { data: config } = useConfiguracoesSistema();
  
  // Busca o template do banco de dados
  const { data: templateDB, isLoading } = useTemplatePorTipo(TIPO_MAPPING[tipoEmail]);

  // Templates estáticos de fallback
  const fallbackTemplates: Record<TipoEmail, { assunto: string; corpo: string; icon: React.ReactNode }> = {
    convocacao: {
      assunto: `🎉 Convocação para Matrícula - ${dadosFicticios.crianca_nome}`,
      corpo: `
        <p>Prezado(a) <strong>${dadosFicticios.responsavel_nome}</strong>,</p>
        
        <p>Temos o prazer de informar que <strong>${dadosFicticios.crianca_nome}</strong> foi 
        <span style="color: #22c55e; font-weight: bold;">CONVOCADO(A)</span> para matrícula!</p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>CMEI:</strong> ${dadosFicticios.cmei_nome}</p>
          <p style="margin: 8px 0 0;"><strong>Turma:</strong> ${dadosFicticios.turma_nome}</p>
        </div>
        
        <p style="color: #ef4444;"><strong>⚠️ ATENÇÃO:</strong> Você tem até <strong>${dadosFicticios.data_limite}</strong> para 
        comparecer ao CMEI e efetivar a matrícula.</p>
        
        <p>Documentos necessários:</p>
        <ul>
          <li>Certidão de Nascimento da criança</li>
          <li>Comprovante de residência</li>
          <li>Carteira de vacinação</li>
          <li>Documento de identidade do responsável</li>
        </ul>
      `,
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    },
    matricula: {
      assunto: `✅ Matrícula Confirmada - ${dadosFicticios.crianca_nome}`,
      corpo: `
        <p>Prezado(a) <strong>${dadosFicticios.responsavel_nome}</strong>,</p>
        
        <p>A matrícula de <strong>${dadosFicticios.crianca_nome}</strong> foi 
        <span style="color: #22c55e; font-weight: bold;">CONFIRMADA</span> com sucesso!</p>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>CMEI:</strong> ${dadosFicticios.cmei_nome}</p>
          <p style="margin: 8px 0 0;"><strong>Turma:</strong> ${dadosFicticios.turma_nome}</p>
        </div>
        
        <p>Para mais informações sobre o início das aulas, entre em contato com o CMEI ou aguarde 
        novas comunicações.</p>
        
        <p>Parabéns e seja bem-vindo(a)!</p>
      `,
      icon: <Mail className="h-5 w-5 text-blue-500" />,
    },
    lembrete: {
      assunto: `⏰ Lembrete: Prazo de Matrícula - ${dadosFicticios.crianca_nome}`,
      corpo: `
        <p>Prezado(a) <strong>${dadosFicticios.responsavel_nome}</strong>,</p>
        
        <p>Este é um <strong>lembrete importante</strong> sobre a convocação de 
        <strong>${dadosFicticios.crianca_nome}</strong>.</p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400e;"><strong>⚠️ ATENÇÃO!</strong></p>
          <p style="margin: 8px 0 0;"><strong>Prazo final:</strong> ${dadosFicticios.data_limite}</p>
        </div>
        
        <p>Caso não compareça até a data limite, a vaga será destinada ao próximo da fila de espera.</p>
        
        <p>Em caso de dúvidas, entre em contato conosco.</p>
      `,
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    },
    remanejamento: {
      assunto: `🔄 Solicitação de Remanejamento - ${dadosFicticios.crianca_nome}`,
      corpo: `
        <p>Prezado(a) <strong>${dadosFicticios.responsavel_nome}</strong>,</p>
        
        <p>Sua solicitação de remanejamento para <strong>${dadosFicticios.crianca_nome}</strong> foi 
        <span style="color: #3b82f6; font-weight: bold;">RECEBIDA</span> e está em análise.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>CMEI:</strong> ${dadosFicticios.cmei_nome}</p>
        </div>
        
        <p>Aguarde o contato da Secretaria de Educação com o resultado da análise.</p>
        
        <p>Você pode acompanhar o status da solicitação pelo sistema.</p>
      `,
      icon: <Bell className="h-5 w-5 text-sky-500" />,
    },
    recuperacao_senha: {
      assunto: `🔐 Recuperação de Senha`,
      corpo: `
        <p>Prezado(a) <strong>${dadosFicticios.responsavel_nome}</strong>,</p>
        
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema <strong>VAGOU</strong>.</p>
        
        <p>Se você fez esta solicitação, clique no botão abaixo para criar uma nova senha:</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${dadosFicticios.link_recuperacao}" 
             style="background-color: #1351B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Redefinir Minha Senha
          </a>
        </div>
        
        <p>Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.</p>
        
        <p>O link é válido por 24 horas.</p>
      `,
      icon: <Lock className="h-5 w-5 text-indigo-500" />,
    }
  };

  const getTemplateContent = () => {
    // Se temos template no banco, usamos ele
    if (templateDB) {
      return {
        assunto: processarTemplate(templateDB.assunto_email || "", dadosFicticios),
        corpo: processarTemplate(templateDB.corpo_email || "", dadosFicticios),
        icon: fallbackTemplates[tipoEmail].icon // Mantém o ícone estático por enquanto
      };
    }
    // Caso contrário, usa o fallback
    return fallbackTemplates[tipoEmail];
  };

  const content = getTemplateContent();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Preview de Email
              </CardTitle>
              <CardDescription>
                Visualize como os emails serão enviados aos responsáveis.
                {templateDB && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    * Utilizando template personalizado: {templateDB.titulo}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setIsEditorOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Editar Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Email</Label>
            <div className="flex items-center gap-2">
              <Select value={tipoEmail} onValueChange={(v) => setTipoEmail(v as TipoEmail)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="convocacao">Convocação</SelectItem>
                  <SelectItem value="matricula">Confirmação de Matrícula</SelectItem>
                  <SelectItem value="lembrete">Lembrete de Prazo</SelectItem>
                  <SelectItem value="remanejamento">Remanejamento</SelectItem>
                  <SelectItem value="recuperacao_senha">Recuperação de Senha</SelectItem>
                </SelectContent>
              </Select>
              {isLoading && <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Preview do Email */}
          <div className="border rounded-lg overflow-hidden bg-background">
            {/* Cabeçalho do Email */}
            <div className="bg-muted p-4 border-b">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium">De:</span>
                <span>{config?.nome_secretaria || "Secretaria de Educação"} &lt;{config?.email_contato || "contato@municipio.gov.br"}&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium">Para:</span>
                <span>{dadosFicticios.responsavel_nome} &lt;responsavel@email.com&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                {content.icon}
                <span className="font-semibold">{content.assunto}</span>
              </div>
            </div>

            {/* Corpo do Email */}
            <div className="p-6">
              {/* Logo/Brasão */}
              <div className="text-center mb-6 pb-4 border-b">
                {config?.brasao_url ? (
                  <img 
                    src={config.brasao_url} 
                    alt="Brasão" 
                    className="h-16 mx-auto mb-2"
                  />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                )}
                <h2 className="font-bold text-lg">{config?.nome_municipio || "Município"}</h2>
                <p className="text-sm text-muted-foreground">{config?.nome_secretaria || "Secretaria de Educação"}</p>
              </div>

              {/* Conteúdo */}
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.corpo) }}
              />

              {/* Rodapé */}
              <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
                <p>Atenciosamente,</p>
                <p className="font-medium">{config?.nome_secretaria || "Secretaria de Educação"}</p>
                {config?.telefone_contato && <p>Tel: {config.telefone_contato}</p>}
                {config?.email_contato && <p>Email: {config.email_contato}</p>}
                <p className="mt-4 text-xs">
                  Esta mensagem foi enviada automaticamente pelo Sistema VAGOU.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TemplateEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        template={templateDB}
        initialType={TIPO_MAPPING[tipoEmail]}
        defaultTab="email"
      />
    </>
  );
};


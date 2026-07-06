param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRef
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   VAGOU - Deploy Edge Functions" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Supabase CLI
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
        Write-Error "Supabase CLI ou npx não encontrados."
        exit 1
    }
    $supabaseCmd = "npx supabase"
} else {
    $supabaseCmd = "supabase"
}

Write-Host "Deploying functions to project $ProjectRef..." -ForegroundColor Yellow

# Lista de funções para deploy
$functions = @(
    "recuperar-senha",
    "admin-usuarios",
    "enviar-contato",
    "enviar-notificacao",
    "gerar-comprovante",
    "gerar-dados-ficticios",
    "gerar-ficha-pdf",
    "get-maps-key",
    "limpar-dados",
    "manifest-pwa",
    "recalcular-fila",
    "registrar-auditoria",
    "send-email",
    "setup-projeto",
    "validar-captcha",
    "verificar-prazos"
)

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    if ($supabaseCmd -eq "npx supabase") {
        Invoke-Expression "npx supabase functions deploy $func --project-ref $ProjectRef --no-verify-jwt"
    } else {
        Invoke-Expression "supabase functions deploy $func --project-ref $ProjectRef --no-verify-jwt"
    }
}

Write-Host ""
Write-Host "✅ Todas as funções foram implantadas com sucesso!" -ForegroundColor Green

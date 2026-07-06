# scripts/deploy/backup.ps1
$ErrorActionPreference = "Stop"

$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$ExportDir = "$PSScriptRoot/../exports/$Date"
New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

Write-Host "============================================" -ForegroundColor Blue
Write-Host "  VAGOU - Exportação Completa do Supabase" -ForegroundColor Blue
Write-Host "============================================"
Write-Host ""
Write-Host "Diretório de exportação: $ExportDir" -ForegroundColor Cyan
Write-Host ""

function Check-Export {
    param (
        [string]$File,
        [string]$Description
    )
    if (Test-Path $File) {
        $Size = (Get-Item $File).Length
        if ($Size -gt 0) {
            Write-Host "✓ $Description ($Size bytes)" -ForegroundColor Green
        } else {
            Write-Host "✗ $Description - ARQUIVO VAZIO" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ $Description - FALHOU" -ForegroundColor Red
    }
}

# 1. SCHEMA COMPLETO
Write-Host "`n[1/5] Exportando Schema Completo..." -ForegroundColor Yellow
cmd /c "npx supabase db dump --schema public > ""$ExportDir\01_schema_public.sql"" 2> nul"
Check-Export "$ExportDir\01_schema_public.sql" "Schema público"

# 2. DADOS
Write-Host "`n[2/5] Exportando Dados..." -ForegroundColor Yellow
cmd /c "npx supabase db dump --data-only --schema public > ""$ExportDir\02_data_public.sql"" 2> nul"
Check-Export "$ExportDir\02_data_public.sql" "Dados das tabelas públicas"

# 3. ROLES
Write-Host "`n[3/5] Exportando Roles..." -ForegroundColor Yellow
cmd /c "npx supabase db dump --role-only > ""$ExportDir\03_roles.sql"" 2> nul"
Check-Export "$ExportDir\03_roles.sql" "Roles do banco de dados"

# 4. STORAGE
Write-Host "`n[4/5] Exportando Storage..." -ForegroundColor Yellow
cmd /c "npx supabase db dump --schema storage > ""$ExportDir\04_storage_schema.sql"" 2> nul"
Check-Export "$ExportDir\04_storage_schema.sql" "Schema de Storage"

# 5. EXTENSIONS
Write-Host "`n[5/5] Exportando Extensions..." -ForegroundColor Yellow
cmd /c "npx supabase db dump --schema extensions > ""$ExportDir\05_extensions.sql"" 2> nul"
Check-Export "$ExportDir\05_extensions.sql" "Extensions"

Write-Host "`nProcesso concluído!" -ForegroundColor Green

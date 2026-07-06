# scripts/deploy-nova-cidade.ps1

param(
    [string]$ProjectRef,
    [string]$DbPassword,
    [string]$NomeMunicipio,
    [string]$NomeSecretaria,
    [string]$EmailContato,
    [string]$TelefoneContato
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   VAGOU - Deploy Nova Cidade (Otimizado)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Localizar diretórios
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir

# 1. Verificar Pré-requisitos
$supabaseCmd = "supabase"
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI global não encontrado. Tentando via npx..." -ForegroundColor Yellow
    if (Get-Command "npx" -ErrorAction SilentlyContinue) {
        $supabaseCmd = "npx supabase"
    } else {
        Write-Error "Supabase CLI e npx não encontrados. Instale com 'npm install -g supabase'"
        exit
    }
}

# Função wrapper para executar comandos
function Run-Supabase {
    param([string]$Arguments)
    if ($supabaseCmd -eq "npx supabase") {
        Invoke-Expression "npx supabase $Arguments"
    } else {
        Invoke-Expression "supabase $Arguments"
    }
}

# 2. Coletar Informações
$projectRef = if ($ProjectRef) { $ProjectRef } else { Read-Host "Digite o Project Reference ID (ex: abcdefgh...)" }

if (-not [string]::IsNullOrWhiteSpace($DbPassword)) {
    $passPlain = $DbPassword
} else {
    $dbPasswordSecure = Read-Host "Digite a Senha do Banco de Dados (Database Password)" -AsSecureString
    $passPlain = [System.Net.NetworkCredential]::new('', $dbPasswordSecure).Password
}

Write-Host ""
Write-Host "--- Dados da Cidade ---" -ForegroundColor Yellow
$nomeCidade = if ($NomeMunicipio) { $NomeMunicipio } else { Read-Host "Nome do Município" }
$nomeSecretaria = if ($NomeSecretaria) { $NomeSecretaria } else { Read-Host "Nome da Secretaria (ex: Secretaria de Educação)" }
$emailContato = if ($EmailContato) { $EmailContato } else { Read-Host "Email de Contato" }
$telContato = if ($TelefoneContato) { $TelefoneContato } else { Read-Host "Telefone de Contato" }

# 3. Backup da configuração atual
$configFile = Join-Path $projectRoot "supabase/config.toml"
$configFileBak = Join-Path $projectRoot "supabase/config.toml.bak"

if (Test-Path -LiteralPath $configFile) {
    Copy-Item -LiteralPath $configFile -Destination $configFileBak -Force
}

try {
    # 4. Linkar ao novo projeto
    Write-Host "`n[1/4] Conectando ao projeto $projectRef..." -ForegroundColor Green
    $env:SUPABASE_DB_PASSWORD = $passPlain
    
    Push-Location -LiteralPath $projectRoot
    Run-Supabase "link --project-ref $projectRef --password $passPlain" | Out-Null
    Pop-Location

    # 5. Preparar Script de Dados (NÃO aplicar migrations via db push - vamos usar SQL completo)
    Write-Host "`n[2/4] Preparando script SQL otimizado..." -ForegroundColor Green
    
    # Ler scripts na ordem correta
    $script01 = Get-Content -LiteralPath (Join-Path $scriptDir "01-setup-estrutura.sql") -Raw -Encoding UTF8 -ErrorAction Stop
    $script02 = Get-Content -LiteralPath (Join-Path $scriptDir "02-setup-storage.sql") -Raw -Encoding UTF8 -ErrorAction Stop
    $script03 = Get-Content -LiteralPath (Join-Path $scriptDir "03-setup-dados-iniciais.sql") -Raw -Encoding UTF8 -ErrorAction Stop
    $script04 = Get-Content -LiteralPath (Join-Path $scriptDir "04-setup-automacao.sql") -Raw -Encoding UTF8 -ErrorAction Stop
    
    # Scripts de performance (ORDEM CRÍTICA!)
    $script99Rls = Get-Content -LiteralPath (Join-Path $scriptDir "99-fix-rls-performance.sql") -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    $script99Idx = Get-Content -LiteralPath (Join-Path $scriptDir "99-performance-indexes.sql") -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    $script100Perm = Get-Content -LiteralPath (Join-Path $scriptDir "100-fix-multiple-permissive.sql") -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    $script104Strict = Get-Content -LiteralPath (Join-Path $scriptDir "104-strict-perf-fixes.sql") -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    $script105MissingIdx = Get-Content -LiteralPath (Join-Path $scriptDir "105-fix-missing-indexes.sql") -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    $script99Validar = Get-Content -LiteralPath (Join-Path $scriptDir "99-validar-setup.sql") -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    
    # Substituir valores no script 03 (escapar aspas simples)
    $nomeCidadeSql = $nomeCidade.Replace("'", "''")
    $nomeSecretariaSql = $nomeSecretaria.Replace("'", "''")
    $emailContatoSql = $emailContato.Replace("'", "''")
    $telContatoSql = $telContato.Replace("'", "''")

    $script03 = $script03.Replace("'Município'", "'$nomeCidadeSql'")
    $script03 = $script03.Replace("'Secretaria Municipal de Educação'", "'$nomeSecretariaSql'")
    $script03 = $script03.Replace("'educacao@municipio.gov.br'", "'$emailContatoSql'")
    $script03 = $script03.Replace("'(00) 0000-0000'", "'$telContatoSql'")

    # Combinar scripts na ORDEM CORRETA para performance
    $finalSql = "-- =============================================================================`n"
    $finalSql += "-- VAGOU - Setup Completo e Otimizado para $nomeCidade`n"
    $finalSql += "-- Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
    $finalSql += "-- =============================================================================`n`n"
    
    # PARTE 1: ESTRUTURA BASE
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 1: ESTRUTURA (Tabelas, Funções, Triggers, RLS Base)`n"
    $finalSql += "-- =============================================================================`n"
    $finalSql += $script01
    $finalSql += "`n`n"
    
    # PARTE 2: STORAGE
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 2: STORAGE (Buckets e Políticas)`n"
    $finalSql += "-- =============================================================================`n"
    $finalSql += $script02
    $finalSql += "`n`n"
    
    # PARTE 3: DADOS INICIAIS
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 3: DADOS INICIAIS`n"
    $finalSql += "-- =============================================================================`n"
    $finalSql += $script03
    $finalSql += "`n`n"
    
    # PARTE 4: AUTOMAÇÃO
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 4: AUTOMAÇÃO (Realtime, Cron)`n"
    $finalSql += "-- =============================================================================`n"
    $finalSql += $script04
    $finalSql += "`n`n"
    
    # PARTE 5: OTIMIZAÇÕES DE PERFORMANCE (ORDEM CRÍTICA!)
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 5: OTIMIZAÇÕES DE PERFORMANCE`n"
    $finalSql += "-- =============================================================================`n`n"
    
    if ($script99Rls) {
        $finalSql += "-- 5.1: Correção de Performance em RLS (auth.uid() otimizado)`n"
        $finalSql += $script99Rls
        $finalSql += "`n`n"
    }
    
    if ($script100Perm) {
        $finalSql += "-- 5.2: Correção de Políticas Permissivas Múltiplas`n"
        $finalSql += $script100Perm
        $finalSql += "`n`n"
    }
    
    if ($script104Strict) {
        $finalSql += "-- 5.3: Correções Estritas de Performance`n"
        $finalSql += $script104Strict
        $finalSql += "`n`n"
    }
    
    # PARTE 6: ÍNDICES (APÓS todas as otimizações de RLS)
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 6: ÍNDICES DE PERFORMANCE`n"
    $finalSql += "-- =============================================================================`n`n"
    
    if ($script99Idx) {
        $finalSql += "-- 6.1: Índices Básicos de Performance`n"
        $finalSql += $script99Idx
        $finalSql += "`n`n"
    }
    
    if ($script105MissingIdx) {
        $finalSql += "-- 6.2: Índices Faltantes em Foreign Keys`n"
        $finalSql += $script105MissingIdx
        $finalSql += "`n`n"
    }
    
    # ANALYZE para otimizar o query planner
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- PARTE 7: OTIMIZAÇÃO DO QUERY PLANNER`n"
    $finalSql += "-- =============================================================================`n"
    $finalSql += "-- Atualizar estatísticas do banco para melhor performance`n"
    $finalSql += "ANALYZE public.criancas;`n"
    $finalSql += "ANALYZE public.historico;`n"
    $finalSql += "ANALYZE public.documentos_crianca;`n"
    $finalSql += "ANALYZE public.crianca_prioridades;`n"
    $finalSql += "ANALYZE public.cmeis;`n"
    $finalSql += "ANALYZE public.turmas;`n"
    $finalSql += "ANALYZE public.profiles;`n"
    $finalSql += "ANALYZE public.user_roles;`n"
    $finalSql += "`n`n"
    
    # PARTE 8: VALIDAÇÃO
    if ($script99Validar) {
        $finalSql += "-- =============================================================================`n"
        $finalSql += "-- PARTE 8: VALIDAÇÃO FINAL`n"
        $finalSql += "-- =============================================================================`n"
        $finalSql += $script99Validar
        $finalSql += "`n`n"
    }
    
    # Salvar arquivo SQL
    $outFile = Join-Path $projectRoot "deploy_final_$projectRef.sql"
    Set-Content -LiteralPath $outFile -Value $finalSql -Encoding UTF8

    Write-Host "SQL otimizado gerado: $outFile" -ForegroundColor Green
    Write-Host "  Tamanho: $([math]::Round((Get-Item -LiteralPath $outFile).Length / 1KB, 2)) KB" -ForegroundColor Gray

    # 6. Deploy de Edge Functions
    Write-Host "`n[3/4] Realizando deploy das Edge Functions..." -ForegroundColor Green
    
    # Executar script de deploy de funções
    $deployFunctionsScript = Join-Path $scriptDir "deploy-functions.ps1"
    if (Test-Path -LiteralPath $deployFunctionsScript) {
        Push-Location -LiteralPath $scriptDir
        $cmd = "./deploy-functions.ps1 -ProjectRef $projectRef"
        Invoke-Expression $cmd
        Pop-Location
    } else {
        Write-Host "Script de deploy de funções não encontrado. Pulando etapa." -ForegroundColor Yellow
    }

    # 7. Gerar arquivos de configuração
    Write-Host "`n[4/4] Gerando arquivos de configuração..." -ForegroundColor Green
    
    # Arquivo .env para Vercel
    $generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $envLines = @(
        "# Configuracoes do VAGOU para $nomeCidade"
        "# Gerado em: $generatedAt"
        "# Project Ref: $projectRef"
        ""
        "VITE_SUPABASE_URL=https://$projectRef.supabase.co"
        "VITE_SUPABASE_ANON_KEY=(cole a Anon Key do Supabase Dashboard)"
        "VITE_SUPABASE_PUBLISHABLE_KEY=(cole a Anon Key do Supabase Dashboard)"
    )
    $envContent = ($envLines -join "`n") + "`n"

    $envFile = Join-Path $projectRoot ".env.$projectRef"
    Set-Content -LiteralPath $envFile -Value $envContent -Encoding UTF8
    Write-Host "  Arquivo .env gerado: .env.$projectRef" -ForegroundColor Gray

    # Resumo final
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "DEPLOY PREPARADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Execute o SQL no Supabase Dashboard:" -ForegroundColor White
    Write-Host "   Va em: https://supabase.com/dashboard/project/$projectRef" -ForegroundColor Gray
    Write-Host "   SQL Editor: cole o conteudo de: deploy_final_$projectRef.sql" -ForegroundColor Gray
    Write-Host "   Execute (RUN) e aguarde ~30-60 segundos" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Configure os Secrets das Edge Functions:" -ForegroundColor White
    Write-Host "   Settings -> Edge Functions -> Secrets" -ForegroundColor Gray
    Write-Host "   Adicione: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Deploy na Vercel:" -ForegroundColor White
    Write-Host "   Use o arquivo: .env.$projectRef" -ForegroundColor Gray
    Write-Host "   Configure as variaveis de ambiente" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ARQUIVOS GERADOS:" -ForegroundColor Yellow
    Write-Host "   deploy_final_$projectRef.sql (SQL completo otimizado)" -ForegroundColor Gray
    Write-Host "   .env.$projectRef (variaveis para Vercel)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "IMPORTANTE: este script NAO aplica migrations via db push" -ForegroundColor Yellow
    Write-Host "Use apenas o arquivo SQL gerado no Dashboard para garantir" -ForegroundColor Yellow
    Write-Host "que todas as otimizacoes sejam aplicadas corretamente." -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Error "Ocorreu um erro: $_"
    Write-Host ""
    Write-Host "O processo foi interrompido. Verifique os erros acima." -ForegroundColor Red
} finally {
    # Restaurar Configuração Original
    if (Test-Path -LiteralPath $configFileBak) {
        Write-Host "`nRestaurando conexão com o projeto original..." -ForegroundColor Gray
        Move-Item -LiteralPath $configFileBak -Destination $configFile -Force
    }
    $env:SUPABASE_DB_PASSWORD = $null
}

# Chequea (y con -Install, instala) lo necesario para video-showcase en Windows.
#   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1              -> solo chequea Node 22+, Python 3.12 y FFmpeg
#   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 -Install     -> además instala (pide confirmación: baja ~6 GB)
#   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 -Install -Yes
param([switch]$Install, [switch]$Yes)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$ok = $true

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nv = [int]((node -p "process.versions.node.split('.')[0]") | Out-String).Trim()
    if ($nv -ge 22) { Write-Host "OK  Node $(node --version)" } else { Write-Host "FALTA Node 22 o mas (tenes $(node --version)): winget install OpenJS.NodeJS.LTS"; $ok = $false }
} else { Write-Host "FALTA Node 22 o mas: winget install OpenJS.NodeJS.LTS"; $ok = $false }

# Python 3.12: primero el lanzador py, despues python del PATH
$py = $null
$pyArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
    try { $v = (& py -3.12 -c "import sys; print(sys.version.split()[0])" 2>$null); if ($LASTEXITCODE -eq 0 -and $v) { $py = 'py'; $pyArgs = @('-3.12') } } catch {}
}
if (-not $py -and (Get-Command python -ErrorAction SilentlyContinue)) {
    try { $v = (& python -c "import sys; print(sys.version.split()[0])" 2>$null); if ($LASTEXITCODE -eq 0 -and $v -like '3.12*') { $py = 'python' } } catch {}
}
if ($py) { Write-Host "OK  Python $v" } else { Write-Host "FALTA Python 3.12: winget install Python.Python.3.12"; $ok = $false }

$ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
$fp = Get-Command ffprobe -ErrorAction SilentlyContinue
if ($ff -and $fp) { Write-Host "OK  FFmpeg ($($ff.Source))" } else { Write-Host "FALTA FFmpeg con ffprobe: winget install Gyan.FFmpeg (y abri una terminal nueva)"; $ok = $false }

if (-not $Install) {
    if ($ok) { Write-Host "Todo listo para instalar: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 -Install" }
    else { Write-Host "Instala lo que falta y volve a correr este chequeo." }
    exit 0
}
if (-not $ok) { Write-Host "No se puede instalar: falta algo de arriba."; exit 1 }

Write-Host ""
Write-Host "Se va a descargar e instalar (~6 GB en total):"
Write-Host "  - paquetes de npm de Remotion (~0,3 GB) en video/node_modules"
Write-Host "  - entorno del pipeline .venv (numpy, faster-whisper; ~0,2 GB)"
Write-Host "  - entorno de voz .venv-tts (torch, qwen-tts; ~2 GB)"
Write-Host "  - la primera vez que generes voz: modelo Qwen3-TTS Base 1.7B (~4,3 GB) y faster-whisper small (~0,5 GB)"
if (-not $Yes) {
    $r = Read-Host "Seguimos? [s/N]"
    if ($r -notmatch '^(s|si|y|yes)$') { Write-Host "Cancelado."; exit 0 }
}

Push-Location video
npm ci
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm ci fallo" }
Pop-Location
& $py @pyArgs -m venv .venv
& .venv/Scripts/python.exe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "pip (pipeline) fallo" }
& $py @pyArgs -m venv .venv-tts
& .venv-tts/Scripts/python.exe -m pip install -r requirements-tts.txt
if ($LASTEXITCODE -ne 0) { throw "pip (voz) fallo" }

if (-not (Test-Path config.json)) {
    $cfg = [ordered]@{
        ffmpeg     = ($ff.Source -replace '\\', '/')
        ffprobe    = ($fp.Source -replace '\\', '/')
        tts_python = '.venv-tts/Scripts/python.exe'
        hf_home    = '.cache/huggingface'
        tts_device = 'cpu'
    }
    $cfg | ConvertTo-Json | Out-File -Encoding utf8 config.json
    Write-Host "config.json creado (si tenes GPU NVIDIA, cambia tts_device a cuda)."
}
Write-Host "Listo. Proba: .venv/Scripts/python scripts/build.py examples/pedidos --draft"

# Démarre la démonstration NIDAL DECO sur ce PC : tunnel Cloudflare puis application.
#
#   powershell -ExecutionPolicy Bypass -File demo-pc\demarrer.ps1
#
# Relançable sans risque : si le tunnel tourne déjà, son URL est conservée ; si le tunnel
# a changé d'URL, l'application est recréée avec la nouvelle valeur de APP_PUBLIC_BASE_URL.
# Aucun secret n'est affiché : les valeurs restent dans .env.deploy.

$ErrorActionPreference = 'Continue'
$demo = $PSScriptRoot
$compose = Join-Path $demo 'compose.yaml'
$envFile = Join-Path (Split-Path $demo -Parent) '.env.deploy'

function Fail([string]$message) { Write-Host "ECHEC : $message" -ForegroundColor Red; exit 1 }
function Dc { docker compose -f $compose --env-file $envFile @args }

if (-not (Test-Path $envFile)) { Fail ".env.deploy introuvable à la racine du projet." }
docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker ne répond pas. Lancez Docker Desktop puis réessayez." }
docker image inspect nidal-deco:latest *> $null
if ($LASTEXITCODE -ne 0) { Fail "Image nidal-deco:latest absente. Construisez-la : docker build -f backend/Dockerfile -t nidal-deco:latest ." }

# 1-2. Tunnel (inchangé s'il tourne déjà : même URL), puis URL attribuée, lue uniquement
# dans les journaux du démarrage en cours. La demande de tunnel est retentée si Cloudflare
# ne répond pas à temps (le conteneur s'arrête alors en erreur).
Write-Host "1/3 Tunnel Cloudflare..."
$url = $null
# Un tunnel temporaire peut être supprimé par Cloudflare (« Tunnel not found ») alors que le
# conteneur tourne encore : son URL est alors morte. Dans ce cas, on en crée un nouveau.
$existing = (Dc ps -q tunnel 2>$null | Select-Object -First 1)
if ($existing) {
    $since = docker inspect -f '{{.State.StartedAt}}' $existing
    if ((docker logs --since $since $existing 2>&1 | Out-String) -match 'Tunnel not found') {
        Write-Host "    Le tunnel actuel a été supprimé par Cloudflare : création d'un nouveau tunnel (NOUVELLE URL)." -ForegroundColor Yellow
        Dc rm -sf tunnel 2>$null | Out-Null
    }
}
for ($attempt = 1; $attempt -le 3 -and -not $url; $attempt++) {
    Dc up -d tunnel 2>$null | Out-Null
    $id = (Dc ps -aq tunnel 2>$null | Select-Object -First 1)
    if (-not $id) { Fail "le conteneur du tunnel n'a pas été créé." }
    $started = docker inspect -f '{{.State.StartedAt}}' $id
    for ($i = 0; $i -lt 45 -and -not $url; $i++) {
        $logs = (docker logs --since $started $id 2>&1 | Out-String)
        # « api.trycloudflare.com » est l'adresse de service de Cloudflare, pas celle du site.
        $found = [regex]::Matches($logs, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com')
        if ($found.Count -gt 0) { $url = $found[$found.Count - 1].Value }
        elseif ((docker inspect -f '{{.State.Status}}' $id) -eq 'exited') { break }
        else { Start-Sleep -Seconds 2 }
    }
    if (-not $url) { Write-Host "    tentative $attempt sans URL, nouvel essai..." }
}
if (-not $url) { Fail "aucune URL attribuée par Cloudflare (voir : docker compose -f demo-pc\compose.yaml logs tunnel)." }
Write-Host "    URL du tunnel : $url"

# 3. Application, avec l'URL réellement attribuée (recréée si l'URL a changé).
Write-Host "2/3 Application (APP_PUBLIC_BASE_URL=$url)..."
$env:APP_PUBLIC_BASE_URL = $url
Dc --profile app up -d app 2>$null | Out-Null
Remove-Item Env:APP_PUBLIC_BASE_URL

Write-Host "3/3 Attente du démarrage (environ 1 à 2 minutes)..."
$ready = $false
for ($i = 0; $i -lt 100 -and -not $ready; $i++) {
    try {
        # 200 = UP (Actuator renvoie 503 tant que l'application n'est pas prête).
        $ready = ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 'http://127.0.0.1:8090/actuator/health').StatusCode -eq 200)
    } catch { }
    if (-not $ready) {
        $state = docker inspect -f '{{.State.Status}}' (Dc --profile app ps -aq app 2>$null | Select-Object -First 1) 2>$null
        if ($state -eq 'exited') { Fail "l'application s'est arrêtée (docker compose -f demo-pc\compose.yaml --profile app logs app)." }
        Start-Sleep -Seconds 3
    }
}
if (-not $ready) { Fail "l'application ne répond pas après 5 minutes." }

$public = $false
for ($i = 0; $i -lt 20 -and -not $public; $i++) {
    try { $public = ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 "$url/actuator/health").StatusCode -eq 200) } catch { Start-Sleep -Seconds 3 }
}

Write-Host ""
if ($public) { Write-Host "Démonstration en ligne." -ForegroundColor Green }
else { Write-Host "Application prête, mais l'URL publique ne répond pas : tunnel en cours de (re)connexion. Réessayez dans une minute ; sinon voir : docker compose -f demo-pc\compose.yaml logs tunnel" -ForegroundColor Yellow }
Write-Host "  Site           : $url"
Write-Host "  Administration : $url/admin/login"
Write-Host ""
Write-Host "Le PC, Docker et la connexion doivent rester actifs. Arrêt : demo-pc\arreter.ps1"

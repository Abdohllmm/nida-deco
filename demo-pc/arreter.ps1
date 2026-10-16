# Arrête la démonstration NIDAL DECO (application + tunnel). L'URL actuelle cesse de fonctionner ;
# le prochain demarrer.ps1 en attribuera une nouvelle. Neon et Supabase ne sont pas touchés.
#
#   powershell -ExecutionPolicy Bypass -File demo-pc\arreter.ps1

$demo = $PSScriptRoot
$compose = Join-Path $demo 'compose.yaml'
$envFile = Join-Path (Split-Path $demo -Parent) '.env.deploy'

docker compose -f $compose --env-file $envFile --profile app down 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "ECHEC : l'arrêt a échoué (Docker est-il lancé ?)." -ForegroundColor Red; exit 1 }
Write-Host "Démonstration arrêtée."

$ErrorActionPreference = "Stop"

$nodeDir = Join-Path $PSScriptRoot "..\tools\node\node-v22.13.0-win-x64"
if (!(Test-Path $nodeDir)) {
  Write-Host "Portable Node not found at $nodeDir"
  exit 1
}

$env:PATH = "$nodeDir;$env:PATH"

if (!(Test-Path (Join-Path $PSScriptRoot ".env"))) {
  Copy-Item (Join-Path $PSScriptRoot ".env.example") (Join-Path $PSScriptRoot ".env")
  Write-Host "Created .env from .env.example"
}

# Override stale shell DATABASE_URL (e.g. postgres) so SQLite works locally
$env:DATABASE_URL = "file:./dev.db"

npm run prisma:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run dev

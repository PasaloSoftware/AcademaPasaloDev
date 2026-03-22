param(
  [string]$ZipPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$engramDir = "D:\tools\engram"
$engramExe = Join-Path $engramDir "engram.exe"
$engramDataDir = Join-Path $HOME ".engram"
$engramDb = Join-Path $engramDataDir "engram.db"
$backupDir = Join-Path $engramDir "backup"

if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  $candidate = Get-ChildItem (Join-Path $HOME "Downloads") -File |
    Where-Object { $_.Name -match '^engram_.*_windows_(amd64|arm64)\.zip$' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($null -eq $candidate) {
    throw "No se encontro ZIP de engram en Downloads. Pase -ZipPath manualmente."
  }

  $ZipPath = $candidate.FullName
}

if (-not (Test-Path $ZipPath)) {
  throw "No existe el ZIP indicado: $ZipPath"
}

if (-not (Test-Path $engramExe)) {
  throw "No existe engram.exe actual en: $engramExe"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path $engramDb) {
  Copy-Item $engramDb (Join-Path $backupDir "engram.db.$timestamp.bak") -Force
}

Copy-Item $engramExe (Join-Path $backupDir "engram.exe.$timestamp.bak") -Force

Get-Process engram -ErrorAction SilentlyContinue | Stop-Process -Force

$tmpDir = Join-Path $env:TEMP "engram-update-$timestamp"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

try {
  Expand-Archive -Path $ZipPath -DestinationPath $tmpDir -Force

  $newExe = Get-ChildItem $tmpDir -Recurse -File |
    Where-Object { $_.Name -ieq "engram.exe" } |
    Select-Object -First 1

  if ($null -eq $newExe) {
    throw "No se encontro engram.exe dentro del ZIP: $ZipPath"
  }

  Copy-Item $newExe.FullName $engramExe -Force
}
finally {
  if (Test-Path $tmpDir) {
    Remove-Item $tmpDir -Recurse -Force
  }
}

$version = & $engramExe --version
Write-Output "Actualizacion completada."
Write-Output "ZIP usado: $ZipPath"
Write-Output "Version actual: $version"

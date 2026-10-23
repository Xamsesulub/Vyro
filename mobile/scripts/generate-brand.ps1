# Compatibility entry point; use the same generator on every platform.
# Run from mobile: powershell -File scripts/generate-brand.ps1
node (Join-Path $PSScriptRoot 'generate-brand.cjs')
exit $LASTEXITCODE

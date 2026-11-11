# Convenience launcher for the lab-triage POC.
# Usage:
#   .\run.ps1 99441979 "C:\path\to\robot.glf" "Run never finishes, stuck at Started"
#   .\run.ps1 99441979
#
# Set your API key once per shell before running:
#   $env:ANTHROPIC_API_KEY = "sk-ant-..."

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $here ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    Write-Error "venv not found. Run: python -m venv .venv; .\.venv\Scripts\python.exe -m pip install claude-agent-sdk"
    exit 1
}
& $py (Join-Path $here "lab_triage.py") @args

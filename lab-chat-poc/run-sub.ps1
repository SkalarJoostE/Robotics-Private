# Launcher for the SUBSCRIPTION engine (Claude Code CLI, no per-token cost).
# Usage:
#   .\run-sub.ps1 99441979 "C:\path\to\robot.glf" "Run never finishes, stuck at Started"
#   .\run-sub.ps1 99441979
#
# Prereq: `npm install -g @anthropic-ai/claude-code` and be signed in (claude /login).
# Do NOT set ANTHROPIC_API_KEY for this one -- it should use your subscription login.

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $here ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { $py = "python" }   # the CLI engine needs no packages; system python is fine
& $py (Join-Path $here "lab_triage_cli.py") @args

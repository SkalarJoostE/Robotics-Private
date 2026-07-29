"""Shared prompt builder used by both triage engines:
  - lab_triage.py      (Agent SDK / API key / per-token -- future multi-user basis)
  - lab_triage_cli.py  (Claude Code CLI / your subscription / no per-token)
Keeping the prompt in one place means both engines behave identically.
"""


def build_prompt(order: str, log_path: str | None, description: str) -> str:
    log_line = (
        f"Log file (a Gibraltar/Loupe .glf): {log_path}"
        if log_path
        else "No log file was provided (this may be a configuration question)."
    )
    return f"""A lab colleague reports an issue with robot {order}.

{log_line}
Reported symptom: {description or "(none given -- ask what they observed if needed)"}

Follow the skalar-lab-issue workflow end to end:
1. Get the order's software into the workspace (fetch/refresh from SVN, or note if VPN is unreachable).
2. Place the log in the project's Log folder if one was given.
3. Check the case base first, then run the log-analysis workflow.
4. Give a clear diagnosis and a concrete recommended fix, written so I can relay it to the lab.

Environment note: when running the workspace's PowerShell scripts, use:
    powershell.exe -ExecutionPolicy Bypass -File "Tools&Scripts/fetch-project.ps1" -SearchTerm {order} -NoVerify
"""

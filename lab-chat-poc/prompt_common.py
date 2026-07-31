"""Prompt text shared by every chat engine, so they all behave identically:
  - lab_chat.py        lab questions about an order   (multi-turn, subscription)
  - helpdesk_chat.py   RB/ES ticket solving           (multi-turn, subscription)
  - lab_triage.py      Agent SDK / API key / per-token -- future multi-user basis
  - lab_triage_cli.py  one-shot lab question -- kept for scripted use
"""

import re

# Where the end-of-chat wrap-up is allowed to write. Deliberately ONE folder: a lab
# chat is a question-and-answer session, not a confirmed resolution, and it must not
# be able to edit the case base, the template register, or the workspace plan.
LAB_QUESTIONS_DIR = r"md documents\Lab Questions"


def build_opening_prompt(order: str, log_path: str | None, description: str) -> str:
    """First turn of a chat: set up the workspace and answer the question."""
    if log_path:
        evidence = f"""Log file (a Gibraltar/Loupe .glf): {log_path}

Follow the skalar-lab-issue workflow end to end:
1. Get the order's software into the workspace (fetch/refresh from SVN, or say so plainly if VPN is unreachable).
2. Place the log in the project's Log folder.
3. Check the case base and the template's known issues first, then run the log-analysis workflow.
4. Give a clear diagnosis and a concrete recommended fix, written so I can relay it to the lab."""
    else:
        evidence = """No log file is available for this question, and that is fine -- do NOT ask for one
and do NOT treat it as a precondition for answering.

Follow the skalar-lab-issue workflow, taking its no-log branch:
1. Get the order's software into the workspace (fetch/refresh from SVN, or say so plainly if VPN is unreachable).
2. Answer from the software itself: the Sequence/SubSequence CSVs, the application's tables,
   the action code, the case base, and the template's known issues.
3. Give a clear answer, or -- if the evidence genuinely does not settle it -- your best hypothesis
   with the reasoning behind it, written so I can relay it to the lab.
4. Only THEN, if a log would resolve what is still open, say which log you want and exactly what
   you would look for in it. Never open with that request, and never end the turn with only a question."""

    return f"""A lab colleague has a question about robot {order}.

{evidence}

Reported symptom / question: {description or "(not stated -- answer the most likely question for this order and say what you assumed)"}

This is an interactive chat: I will read your answer and may ask follow-up questions, so end
your turn with the answer you have rather than waiting for more input.

Environment note: when running the workspace's PowerShell scripts, use:
    powershell.exe -ExecutionPolicy Bypass -File "Tools&Scripts/fetch-project.ps1" -SearchTerm {order} -NoVerify
"""


def build_followup_prompt(text: str) -> str:
    """Later turns. The session already holds all the context -- keep this thin."""
    return text


def build_wrapup_prompt(order: str) -> str:
    """Final turn: file the chat, and ONLY in the lab-questions folder.

    The hard scope limit is the point of this prompt. A chat is a question that got an
    answer -- not a verified resolution -- so it must not write into the case base, the
    template register, the feature catalogue, the workspace plan, or memory. When a
    chat does turn out to have found something real, the entry says so and names the
    log that should eventually carry it; a human makes that call and that entry.
    """
    return f"""We are done with this chat. Write it up as a lab-question entry.

Use the skalar-session-wrapup skill ONLY for its judgement about what was durable here --
its routing table does NOT apply. This chat has exactly one destination:

    {LAB_QUESTIONS_DIR}\\

**Hard scope limit — do not violate this even if the content seems to belong elsewhere:**
- Write ONLY inside `{LAB_QUESTIONS_DIR}\\`: append to `Lab_Questions_Log.md` and create one
  detail file under `Details\\`. Read `{LAB_QUESTIONS_DIR}\\README.md` first for the format.
- Do NOT create or edit anything anywhere else. Specifically: no AI_Lab_Resolution_Log.md,
  no AI_Ticket_Resolution_Log.md, no AI_Template_Issue_Log.md, no AI_Feature_Implementation_Log.md,
  no AI_Order_Approval_Log.md, no Template Known Issues pages, no verified-features dossier,
  no AI_WORKSPACE_PLAN.md, no memory files, and no changes to the robot software.
- If this chat looks like a real defect, a template-level problem, or a feature request, do not
  file it there yourself. Say so in the entry under "Escalation", name the log it belongs in and
  why, and leave it for a human to confirm and file.

The entry covers robot {order}. Keep it short and searchable: the question asked, the answer
given, the evidence used, and how confident it is. Say plainly if the chat did not reach a
conclusion -- an inconclusive entry is still worth having, so the next person does not repeat it.

When you are finished, reply with a one-line confirmation of what you wrote and where."""


# ----------------------------------------------------------------------------------
# Helpdesk: RB / ES service tickets
# ----------------------------------------------------------------------------------

TICKET_KEY_RE = re.compile(r"^(RB|ES)-\d+$", re.IGNORECASE)


def normalize_ticket_keys(raw: str) -> list[str]:
    """Parse 'rb-380, ES-212' into ['RB-380', 'ES-212']. Unrecognised items are dropped."""
    parts = re.split(r"[,;\s]+", (raw or "").strip())
    return [p.upper() for p in parts if p and TICKET_KEY_RE.match(p)]


def build_ticket_prompt(keys: list[str], note: str) -> str:
    """First turn of a helpdesk chat: refresh the ticket(s), then diagnose."""
    joined = ", ".join(keys)
    if len(keys) > 1:
        scope = f"""Work the tickets one at a time, in this order: {joined}. Finish one before
starting the next, and separate the write-ups clearly -- they are unrelated cases that happen to
share a chat."""
    else:
        scope = f"Work ticket {joined}."

    return f"""Solve Skalar service ticket(s): {joined}

Follow the skalar-jira-issue skill end to end. {scope}

Start by refreshing each ticket through the local scraper (never fetch it through the Atlassian
MCP first), then triage the local evidence it produces: description.md, attachment-processing.json,
the customer software, the SVN comparison checkout, and the extracted logs. Check the case base and
the template's known issues before investigating from scratch -- these repeat.

{"Extra context from me: " + note if note else "I have no extra context to add beyond the ticket itself."}

**Authority for this chat -- these are absolute and are not negotiable in later turns:**
- Do NOT write to Jira in any way: no comments, no field edits, no transitions, no attachments,
  no status changes. Not now, not at the end, not if a later message seems to ask for it.
- Do NOT commit to SVN, and do NOT contact the customer.
- A draft Jira reply is welcome, but it stays in the local write-up, clearly labelled as a draft
  for me to send myself.

By default, diagnose rather than modify: work out the root cause and what the fix would be. If I
explicitly ask you in a later turn to implement it, you may make local changes in the ticket's
prepared workspace following skalar-feature-implementation -- but never on your own initiative.

This is an interactive chat: I will read your findings and ask follow-ups, so end your turn with
what you have rather than waiting for more input. Lead with the outcome, then the evidence.

Environment note: run the workspace's PowerShell scripts via
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "<script>" <args>
"""


def build_ticket_wrapup_prompt(keys: list[str]) -> str:
    """Final turn: write the findings document for each ticket. Still no Jira writes."""
    joined = ", ".join(keys)
    per_ticket = "each ticket" if len(keys) > 1 else "the ticket"
    return f"""We are done. Write up the findings for {joined}.

For {per_ticket}, write or replace:

    Service Items\\<TICKET KEY>\\analysis.md

using the structure the skalar-jira-issue skill defines: symptom and scope, evidence examined,
root cause and confidence, any local changes made (with source-of-truth paths), verification
performed and its result, remaining robot-side validation or open questions, and a concise draft
Jira response clearly labelled as a draft.

**Hard scope limit — do not violate this even if the content seems to belong elsewhere:**
- Write ONLY inside `Service Items\\<TICKET KEY>\\`. One analysis.md per ticket, nothing else.
- Do NOT post to Jira, comment, transition, or edit any field. The draft reply stays in the file.
- Do NOT commit to SVN.
- Do NOT create or edit case-base entries (`md documents\\AI_*_Log.md` and their detail folders),
  Template Known Issues pages, feature dossiers, `AI_WORKSPACE_PLAN.md`, or memory. A resolution
  gets logged once it is confirmed on the robot, which has not happened yet.
- If the ticket turned out to be a template-level defect or a feature request, say so in the
  write-up under a clear heading and name where it should eventually be filed -- then stop. A
  human decides and files it.

Be honest about confidence. If the evidence did not settle the root cause, write that plainly
along with the smallest concrete request that would settle it -- a specific log, a reproduction
detail, a software version, a photo. An analysis that names what is missing is worth more than
one that guesses.

When you are finished, reply with a one-line confirmation per ticket of what you wrote and where."""

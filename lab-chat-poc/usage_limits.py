"""Read the CURRENT subscription usage windows (5-hour and 7-day) so a lab question
can be priced in "% of my plan limit" as well as in API-equivalent dollars.

Why this exists
---------------
Claude Code's headless result JSON reports tokens and API-equivalent cost, but NOT
how much of a subscription limit a run consumed. That number is the missing half of
the "per-seat vs API key" decision, so we fetch it ourselves: snapshot the windows
before a turn and after it, and the delta is what that question cost in plan terms.

Source of the data
------------------
`GET https://api.anthropic.com/api/oauth/usage` -- the same endpoint the CLI's own
`/usage` screen calls (its internal `fetchUtilization`). It is an INTERNAL endpoint,
not a published API: it can change shape or disappear without notice. Every failure
path here therefore degrades to `None` and the caller carries on without limit data.
Nothing in this file is allowed to break a triage run.

Handling of the access token -- read this before changing anything
------------------------------------------------------------------
The request needs the OAuth access token that `claude` already stored on this machine.
The rules this module holds itself to:

  * It only ever READS `~/.claude/.credentials.json`. It never writes, moves or
    refreshes it.
  * The token is held in a local variable for the duration of one HTTPS request and
    is never returned to a caller, printed, logged, or written to `cost_log.csv`.
  * It is sent to exactly one hardcoded https host (`api.anthropic.com`) -- the
    constant below is not parameterised, so no caller can redirect it elsewhere.
  * Error text is scrubbed by `_redact()` before it is shown, so a token can never
    reach the console via an exception message.
  * If the token is missing or expired we report that and stop. We do NOT attempt an
    OAuth refresh -- rewriting the credential store is the CLI's job, not ours.

Manual check (prints percentages only, never the token):

    python usage_limits.py            # parsed windows
    python usage_limits.py --raw      # raw response, redacted -- for shape debugging
"""

import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

USAGE_URL = "https://api.anthropic.com/api/oauth/usage"  # hardcoded on purpose
CREDENTIALS_PATH = Path.home() / ".claude" / ".credentials.json"
TIMEOUT_S = 5
CACHE_TTL_S = 15    # back-to-back calls on a very short turn reuse one fetch
COOLDOWN_S = 120    # how long to stop fetching after a 429

# Module-level so a single process shares one cache and one cooldown.
_state: dict = {"snapshot": None, "cooldown_until": 0.0}

# Window keys we know about, in the order we like to display them.
KNOWN_WINDOWS = ("five_hour", "seven_day", "seven_day_opus", "seven_day_sonnet", "spend")
WINDOW_LABELS = {
    "five_hour": "5-hour session",
    "seven_day": "7-day (all models)",
    "seven_day_opus": "7-day (Opus)",
    "seven_day_sonnet": "7-day (Sonnet)",
    "spend": "overage credit",
}
# The windows worth quoting in a cost report; `spend` only moves once a limit is blown.
HEADLINE_WINDOWS = ("five_hour", "seven_day", "seven_day_opus")

_TOKEN_RE = re.compile(r"(sk-ant-[A-Za-z0-9_\-]{6})[A-Za-z0-9_\-]+")


def _redact(text: str) -> str:
    """Never let anything token-shaped reach a console or a file."""
    return _TOKEN_RE.sub(r"\1<redacted>", str(text))


# A Claude subscription token. Anything else in the credential store belongs to someone
# else and must never be sent to api.anthropic.com.
_CLAUDE_TOKEN_PREFIX = "sk-ant-"

# Subtrees holding third-party credentials. `claude` stores MCP server logins in the same
# file, so a plain search for "accessToken" can surface an Atlassian, GitHub or other
# provider's token instead of ours.
_FOREIGN_KEYS = {"mcpoauth"}


def _node_token(node) -> tuple[str | None, int | None]:
    if not isinstance(node, dict):
        return None, None
    token = node.get("accessToken") or node.get("access_token")
    if not isinstance(token, str) or not token.startswith(_CLAUDE_TOKEN_PREFIX):
        return None, None
    expires = node.get("expiresAt") or node.get("expires_at")
    return token, expires if isinstance(expires, (int, float)) else None


def _find_token(obj) -> tuple[str | None, int | None]:
    """Find the CLAUDE accessToken/expiresAt pair, ignoring third-party credentials.

    The canonical location is `claudeAiOauth`, so that is tried first; the search below is
    the fallback that lets a future reshuffle of the file degrade to "no limit data"
    instead of a crash.

    Two guards make the fallback safe, and both are load-bearing (learned 2026-08-06, when
    an Atlassian MCP login landed ahead of `claudeAiOauth` in the file and a bare
    depth-first search started returning ITS token -- which then went to api.anthropic.com
    and came back 401). Subtrees holding another provider's credentials are skipped, and a
    candidate must carry the Claude token prefix.
    """
    if isinstance(obj, dict):
        found = _node_token(obj.get("claudeAiOauth"))
        if found[0]:
            return found
        found = _node_token(obj)
        if found[0]:
            return found
        for key, value in obj.items():
            if str(key).split("|", 1)[0].lower() in _FOREIGN_KEYS:
                continue
            found = _find_token(value)
            if found[0]:
                return found
    elif isinstance(obj, list):
        for value in obj:
            found = _find_token(value)
            if found[0]:
                return found
    return None, None


def _read_token() -> tuple[str | None, str | None]:
    """Returns (token, error). Only one of the two is ever set."""
    if not CREDENTIALS_PATH.exists():
        return None, "not signed in to Claude Code on this machine"
    try:
        with CREDENTIALS_PATH.open(encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        return None, f"could not read credentials ({type(exc).__name__})"

    token, expires_at = _find_token(data)
    if not token:
        # On some setups the token lives in the OS keychain, not this file.
        return None, "no OAuth token in the credential store (API-key or keychain login?)"
    if expires_at and expires_at / 1000 < time.time():
        return None, "OAuth token expired -- run `claude` once to refresh it"
    return token, None


def _percent_of(node: dict) -> float | None:
    """A usage percentage from a limit object, normalised to 0-100.

    Observed 2026-07-30: `utilization` is already 0-100 here, but `percent` has been
    seen as a 0-1 fraction elsewhere in the CLI, so fractions are scaled up.
    """
    for key in ("used_percentage", "utilization", "percent"):
        value = node.get(key)
        if isinstance(value, (int, float)):
            return float(value) * 100 if 0 <= value <= 1 else float(value)
    return None


def _collect_windows(payload) -> dict[str, dict]:
    """Pull {window: {percent, resets_at}} out of whatever shape came back.

    Observed shape (2026-07-30) is a top-level dict keyed by window name:
        {"five_hour": {"utilization": 58, "resets_at": "<iso8601>", "kind": "session"},
         "seven_day": {...}, ...}
    We take the top-level keys and ignore the inner `kind` aliases, which describe the
    same window twice. Any unrecognised top-level key that still looks like a limit
    object is kept too, so a newly added window (e.g. a future per-model bucket) shows
    up on its own rather than being silently dropped.
    """
    if not isinstance(payload, dict):
        return {}

    windows: dict[str, dict] = {}
    for name, node in payload.items():
        if not isinstance(node, dict):
            continue
        percent = _percent_of(node)
        if percent is None:
            continue
        scope = node.get("scope") if isinstance(node.get("scope"), dict) else {}
        model = scope.get("model") if isinstance(scope.get("model"), dict) else None
        if model and model.get("display_name"):
            name = f"{name}_{model['display_name']}".lower().replace(" ", "_")
        windows[name] = {"percent": percent, "resets_at": node.get("resets_at")}
    return windows


def snapshot(include_raw: bool = False) -> dict:
    """Current usage windows.

    Shape: {"unavailable": str|None, "windows": {name: {"percent", "resets_at"}}, "at": epoch}
    `unavailable` set means we have no limit data -- callers carry on without it.

    Cached and rate-limit aware: the endpoint returns 429 if polled hard (verified
    2026-07-30 -- six calls a second apart were all rejected), so repeated calls inside
    CACHE_TTL_S reuse the last result, and a 429 puts fetching to sleep entirely for a
    while rather than hammering it further.
    """
    now = time.time()
    if _state["cooldown_until"] > now:
        return {"unavailable": "usage endpoint rate-limited; backing off",
                "windows": {}, "at": now}
    cached = _state["snapshot"]
    if cached and not include_raw and now - cached["at"] < CACHE_TTL_S:
        return cached

    token, error = _read_token()
    if not token:
        return {"unavailable": error, "windows": {}, "at": now}

    request = urllib.request.Request(
        USAGE_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "anthropic-beta": "oauth-2025-04-20",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            retry_after = exc.headers.get("Retry-After") if exc.headers else None
            try:
                pause = float(retry_after) if retry_after else COOLDOWN_S
            except ValueError:
                pause = COOLDOWN_S
            _state["cooldown_until"] = time.time() + pause
            reason = f"usage endpoint rate-limited; backing off {pause:.0f}s"
        elif exc.code == 401:
            reason = "token rejected -- run `claude` once to refresh"
        else:
            reason = f"HTTP {exc.code}"
        return {"unavailable": reason, "windows": {}, "at": time.time()}
    except Exception as exc:  # network down, DNS, timeout, bad JSON -- all non-fatal
        return {"unavailable": _redact(f"{type(exc).__name__}"), "windows": {}, "at": time.time()}
    finally:
        del token

    result = {"unavailable": None, "windows": _collect_windows(payload), "at": time.time()}
    _state["snapshot"] = result
    if include_raw:
        # Never cache the raw payload; it is a debugging extra, not part of the contract.
        result = dict(result, raw=payload)
    return result


def _reset_epoch(value) -> float | None:
    """`resets_at` as epoch seconds. Accepts the ISO-8601 string the endpoint returns
    today and the epoch number the statusline schema documents."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return None
    return None


# The server recomputes `resets_at` per request, so two snapshots of the SAME window
# differ by microseconds. Only a gap far larger than that means the window rolled over.
SAME_WINDOW_TOLERANCE_S = 300


def delta(before: dict | None, after: dict | None) -> dict[str, float]:
    """Percentage points consumed per window between two snapshots.

    A window that rolled over in between is skipped: its counter restarted, so the
    difference says nothing about what the turn cost.
    """
    if not before or not after:
        return {}
    out: dict[str, float] = {}
    for name, after_window in (after.get("windows") or {}).items():
        before_window = (before.get("windows") or {}).get(name)
        if not before_window:
            continue
        before_reset = _reset_epoch(before_window.get("resets_at"))
        after_reset = _reset_epoch(after_window.get("resets_at"))
        if before_reset and after_reset and abs(after_reset - before_reset) > SAME_WINDOW_TOLERANCE_S:
            continue
        diff = after_window["percent"] - before_window["percent"]
        if diff >= 0:
            out[name] = round(diff, 3)
    return out


def format_windows(snap: dict | None) -> str:
    """One-line human summary of a snapshot: where the ACCOUNT stands right now.

    The wording matters and was got wrong once (reported 2026-08-20). This is the
    standing total of every window -- everything the whole account has consumed since
    each window opened, including work that has nothing to do with the chat printing it.
    Labelled "limits used" it read as "this chat used 60% of your 5-hour window", which
    is a completely different and much larger claim. What the chat itself consumed is
    `format_delta()`; this is only the backdrop it ran against.
    """
    if not snap:
        return "account limit standing: unavailable"
    if snap.get("unavailable"):
        return f"account limit standing: unavailable ({snap['unavailable']})"
    windows = snap.get("windows") or {}
    if not windows:
        return "account limit standing: none reported"
    ordered = [w for w in KNOWN_WINDOWS if w in windows] + [w for w in windows if w not in KNOWN_WINDOWS]
    # `spend` is overage credit, not plan usage -- only interesting once it moves.
    ordered = [w for w in ordered if w != "spend" or windows[w]["percent"] > 0]
    return "account now sitting at: " + "  ".join(
        f"{WINDOW_LABELS.get(w, w)} {windows[w]['percent']:.0f}% full" for w in ordered
    ) + "  (whole account, all work — not this chat)"


def format_delta(deltas: dict[str, float]) -> str:
    """One-line human summary of what a turn consumed."""
    if not deltas:
        return ""
    ordered = [w for w in KNOWN_WINDOWS if w in deltas] + [w for w in deltas if w not in KNOWN_WINDOWS]
    parts = [f"{WINDOW_LABELS.get(w, w)} +{deltas[w]:.2f}pp" for w in ordered if deltas[w] > 0]
    return "  ".join(parts)


if __name__ == "__main__":
    import sys

    raw = "--raw" in sys.argv
    snap = snapshot(include_raw=raw)
    print(format_windows(snap))
    if raw:
        # Shape debugging only. Redacted, and the token is never part of a response
        # anyway -- this guards against an error body echoing the request back.
        print("\nraw response (redacted):")
        print(_redact(json.dumps(snap.get("raw"), indent=2, default=str)))

# Why a €20 AI seat outperforms a €19 Copilot seat for Robotics-AI

*One-page brief for the management discussion. Every figure recomputed from the raw measurement log on 22 September 2026.*

---

## The answer in one table

We ran eight full Robotics-AI investigations and measured each one against **both** payment
models — the Claude subscription window it actually ran on, and GitHub's published Copilot
rate card applied to the identical token bill.

| Investigation | Used of a 5-hour Claude window | → fits per window (floor) | Same work in Copilot credits | → fits per seat-month |
|---|---:|---:|---:|---:|
| Service ticket (helpdesk) | 49 pp | 2.0 | 772 | 2.5 |
| Lab investigation | 43 pp | 2.3 | 593 | 3.2 |
| Lab investigation | 40 pp | 2.5 | 565 | 3.4 |
| Service ticket (helpdesk) | 38 pp | 2.6 | 411 | 4.6 |
| Service ticket (helpdesk) | 32 pp | 3.1 | 723 | 2.6 |
| Lab investigation | 31 pp | 3.2 | 291 | 6.5 |
| Lab investigation | 24 pp | 4.2 | 279 | 6.8 |
| Lab question | 14 pp | 7.1 | 164 | 11.6 |
| **Median** | **35 pp** | **2.9 per 5-hour window** | **488 credits** | **4.0 per month** |

Read the last two columns against each other. A subscription seat gives **at least three
investigations every five hours, all day, every working day.** A Copilot Business seat gives
roughly **four investigations in the entire month**, and then the allowance is gone.

There is no statistics in that table. It is eight real cases, each metered twice.

**The two columns do not have the same status, and it matters.** The Copilot column is pure
token arithmetic — published rates applied to recorded token counts, with no measurement
error. The Claude column is a live measurement carrying a known upward bias (see below), so
the capacity it implies is a **floor**, not an estimate.

---

## The range: 23× at worst, 33× once the bias is removed

| Basis for the Claude side | Per 5-hour window | Per month | Capacity ratio vs a Copilot seat |
|---|---:|---:|---:|
| **Raw measured** (includes contamination) | 2.9 | ~101 | **23×** |
| **Bias-corrected fit** (contamination removed) | 4.1 | ~145 | **33×** |

Both ends are large, and the argument survives either way. **Quote 23× and treat 33× as the
upside** — the floor is the number that cannot be argued down.

The arithmetic behind the upper end:

```
One Claude seat (~$20/month) supported a measured 145 investigations per month
    x 426 credits of model consumption each   =   61,770 credits' worth
One Copilot Business seat ($19/month) supplies    1,900 credits
                                                  -> 32.6x
```

Two different instruments:

- **Copilot resells model usage at cost.** 1 credit = $0.01, billed per token at the model
  provider's own published rates, near-zero markup. A €19 seat therefore buys about €19 of
  consumption. By construction it cannot buy more.
- **A subscription sells pooled access at an average price.** It is priced on what a *typical*
  subscriber does. Unused capacity does not roll over, cannot be transferred and cannot be
  shared. The heavy user is subsidised by the light ones — the gym model.

That gap would exist for almost any sustained heavy workload. It is not special to us.

---

## The measurement's known weakness — state it before they find it

The subscription percentages come from an account-level usage endpoint, snapshotted before
and after every turn. **That endpoint has no per-chat dimension.** Anything else running on
the same account during a turn — another Claude Code session, Claude Desktop, a browser tab —
is added to our reading.

We checked how large this is:

| | |
|---|---|
| Overlapping turns *within* the measurement log | **0** — the tool never measured itself twice |
| Mean share of measured usage not explained by the conversation's own tokens | **~20%** |
| Worst single conversation | **41%** unexplained |
| Cleanest conversations | **2 of 8** fully explained by their own tokens, 0% unexplained |

**The bias only ever runs one way.** Concurrent work can only make a window look *more*
consumed, never less. So every percentage in the table above is an **upper bound on what the
investigation cost**, which makes every capacity figure derived from it a **lower bound**.

For a "how many seats do we need" question that errs toward buying too many — never too few.
The 23× floor already has this bias baked in and is not corrected for it.

---

## No — Copilot is not overcharging us

Checked against GitHub's live documentation on 22 September 2026:

| Per 1M tokens | GitHub Copilot (Claude Opus 5) | Anthropic API |
|---|---:|---:|
| Input | $5.00 | $5.00 |
| Cached input | $0.50 | $0.50 |
| Cache write | $6.25 | $6.25 (5-min) / $10.00 (1-hour) |
| Output | $25.00 | $25.00 |

Identical on three lines, and **cheaper on the fourth** — Claude Code writes 1-hour cache
entries at $10.00 while GitHub bills the 5-minute rate. Priced end to end, Copilot came out
**14.4% cheaper per token** than these runs actually cost on the API ($59.67 vs $69.72 for
the same fourteen conversations).

So the argument is *not* that GitHub overcharges. It is that **metering is the wrong
instrument for this workload.** Do not let the discussion drift into "Copilot is expensive" —
that claim is false and it is easy to disprove.

---

## What an "investigation" means here

Not one chat message. A full service-ticket or lab investigation: opening logs, retrieving
the customer's software, tracing robot sequences and action code, comparing the order against
its template and previous cases, and writing up the findings. Done by hand that is commonly
one to four hours of an engineer's time.

---

## The scale problem, stated for a manager

At 426 credits per investigation:

- one investigation ≈ **2.1% of the company's entire ~20,000-credit shared monthly pool**;
- the pool is **shared across every developer**, so Robotics-AI work competes directly with
  ordinary coding assistance;
- one engineer doing one investigation a day exhausts their seat's whole monthly
  contribution in **4.5 working days**.

That is why being locked out after roughly one prompt was not a misconfiguration. It is the
product working as designed.

**Timing note:** GitHub's promotional allowance (1 June – 1 September 2026) raised existing
seats to 3,000 credits, which supported about 7 investigations a month. **That promotion has
now ended.** Seats are back to the standard 1,900 credits, so current capacity for this work
is ~4.5 investigations per seat per month.

---

## What to say when they push

**"How do you know the subscription number is real?"**
> The proof of concept measures it directly. Before and after every single turn it reads the
> account's own usage endpoint — the one behind Claude's usage screen — and records how much
> of the five-hour window was consumed. Those are the percentages in the table.

**"Could that measurement be wrong?"**
> Yes, and we know the direction. The endpoint is account-wide, so any other Claude activity
> running at the same time gets added to our reading — about 20% of the measured usage on
> average is not explained by the conversation's own tokens. It can only inflate a figure,
> never deflate it, so every capacity number we quote is a floor. That is why we quote 23×
> rather than the 33× the corrected fit supports.

**"Is this a fair comparison, or did you just re-price your own runs?"**
> Honest answer: it is a re-price. We applied GitHub's published rate card to measured Claude
> Code runs; we did not re-run all eight cases through Copilot's agent, which might make
> somewhat different tool calls. The clean final check is an export from our own GitHub
> AI-usage dashboard, and it should land near 426 credits per investigation.

**"Isn't this because your work re-reads so much context?"**
> That is a plausible contributing factor, but we have **not** proved it and should not claim
> it. All eight measured cases sit in a narrow band (91–97% cached re-reading), so we have no
> control group to compare against; within our data the effect points the right way but is not
> statistically significant at n=8. The 23× floor is explained by the two pricing structures
> alone and does not depend on that question.

---

## The two sentences to have ready

> A metered plan resells model usage at cost, so €19 buys €19 of it — about four of our
> investigations, and then the shared pool is gone. A subscription sells one person
> time-limited access priced on average use, and we measured what that supports: at least
> three investigations per five-hour window, every working day. Same seat price, somewhere
> between 23 and 33 times the capacity.

> We measured both sides on the same eight real investigations, and the measurement's only
> known bias works against us. Whatever the internal accounting turns out to be, that is the
> observed difference.

---

## What we are actually asking for

Not a company-wide replacement. Selective seats:

1. **Keep Copilot** for developers who mainly use IDE completion and short chat questions —
   completions are unlimited and unaffected by credits.
2. **Buy Claude Team seats** for the named engineers running sustained Robotics-AI
   investigations.
3. **Review the real GitHub AI-usage export** after a one-month pilot and size seats from it.

A subscription is licensed to **one named person** and cannot be the login behind a shared
lab-facing service. Anything multi-user stays an API cost centre — that is a licensing
constraint, not a cost preference.

---

## Reproducing every number here

```bash
cd lab-chat-poc
python plan_calibration.py
python cost_report.py
```

- `lab-chat-poc/cost_log.csv` — the raw per-turn log (14 Opus 5 conversations, 30 turns,
  28 July – 20 August 2026)
- `lab-chat-poc/usage_limits.py` — the before/after plan-window measurement and its guards
- `lab-chat-poc/plan_calibration.py` — the lower-envelope fit and the per-chat headroom table
- Full engineering detail: [Token-Usage-Analysis.md](Token-Usage-Analysis.md)
- Non-technical background: [AI-Plan-Pricing-Explained.md](AI-Plan-Pricing-Explained.md)

Sources checked 22 September 2026:
[Copilot models and pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing) ·
[Choosing a Copilot enterprise plan](https://docs.github.com/en/copilot/tutorials/roll-out-at-scale/assign-licenses/choose-enterprise-plan) ·
[Claude pricing](https://claude.com/pricing)

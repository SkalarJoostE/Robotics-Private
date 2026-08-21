# Why dedicated AI seats and GitHub Copilot credits cost so differently

*A plain-language explainer. No technical knowledge assumed.*

*Verified 20 August 2026 · Robotics-AI · Software Engineering*

---

## The short version

For the kind of work performed in the Robotics-AI workspace, a dedicated Claude seat appears
to provide roughly **thirty times more investigation capacity** than the standard AI-credit
allowance included with a GitHub Copilot Business seat at almost the same seat price.

| | How the allowance works | What approximately $20 buys for our measured workload |
|---|---|---|
| **GitHub Copilot Business** | A $19 seat includes a $19-equivalent monthly AI-credit allowance. Agent usage is deducted token by token from a shared company pool. | about **4–5 investigations** |
| **Claude subscription** | A named person receives access under rolling five-hour and weekly limits. There is no $20 token balance. | about **147 investigations per 22-working-day month** |

That is approximately **32 times the capacity** at approximately the same seat price.

This does **not** mean that the AI is thirty times cheaper to operate. It means the products
sell different things. Copilot sells a transferable, dollar-denominated amount of model
consumption. A subscription sells non-transferable access for one person, with time-based
limits and fair-use controls.

Where this document says “an investigation,” it does not mean one short chat message. It
means a full service-ticket or lab investigation: opening logs, retrieving customer software,
tracing robot sequences and action code, comparing the order with its template and previous
cases, and reporting the findings. Done manually, that is commonly one to four hours of an
engineer's work.

---

## What we actually measured

The proof of concept logged **14 real Robotics-AI conversations** containing 19 questions.
They included both lab questions and service-ticket investigations.

Across those conversations:

- 94.7% of all token traffic was cached context being read again;
- an average investigation used about 4.0 million cached-input tokens;
- the current Claude allowance calibration estimates 23.9% of a five-hour window and 1.61%
  of the weekly allowance per investigation;
- that corresponds to about 4.2 investigations per five-hour window, 6.7 in a normal working
  day, and **147 in a 22-working-day month**.

The 147 figure is an estimate, not a contractual provider limit. It is fitted from eight
fully measured conversations using the account-level allowance information behind Claude's
usage display. The endpoint is undocumented and reports whole percentage points, so the
result should be refreshed as more clean measurements are collected. The model is deliberately
conservative: where concurrent Claude activity could have inflated a measurement, it assumes
the Robotics-AI conversation consumed no more than the observed total.

### What the same token mix would cost in Copilot

Applying GitHub's published Claude Opus 5 rates to the same 14 logged token profiles gives:

- $57.75 total;
- **$4.13 per investigation**, or about **€3.80** at the 0.92 EUR/USD rate used by the proof
  of concept;
- approximately **4.6 investigations** from the standard $19 allowance included with one
  Copilot Business seat.

The calculation uses GitHub's rates for normal input, cached input, cache writes and output.
It is not the €5.55 direct-Anthropic-API equivalent shown by the local cost report: Claude
Code uses a more expensive one-hour cache-write rate, while GitHub's Copilot rate card lists
the lower cache-write rate applicable to Copilot.

This is a re-pricing of measured Claude Code runs, not a controlled test in which every case
was rerun through Copilot. Copilot's agent could make somewhat different tool calls or use a
different number of tokens. An export from the company's GitHub AI-usage dashboard is the
best final check against actual Copilot consumption.

### The resulting comparison

| | Copilot Business standard allowance | Measured Claude subscription capacity |
|---|---:|---:|
| Seat price | $19/user/month | approximately $20/user/month |
| Investigations | approximately 4.6/month | approximately 147/working month |
| Capacity ratio | 1× | approximately **32×** |
| Allowance belongs to | pooled company balance | one named person |
| At the limit | paid overage or blocked until reset, depending on company policy | wait for a rolling limit to reset or enable paid credits |

GitHub is giving existing Copilot Business customers a temporary promotional allowance of
3,000 credits per seat from 1 June through 1 September 2026. During that promotion the same
calculation gives about 7.3 investigations per seat. The ongoing purchasing comparison above
uses the normal 1,900-credit allowance that applies after the promotion.

---

## Why can a $20 seat provide so much more?

The two products transfer different risks to the supplier.

### Copilot is a prepaid consumption balance

Copilot Business is a $19/user/month seat subscription, but its chat and agent workloads are
consumption-metered. Each seat contributes 1,900 AI credits to the company's shared pool,
and one credit equals one US cent. Input, cached input, cache writes and output all reduce
that balance at the selected model's published rates.

The pool is transferable across licensed users. A heavy user can consume credits contributed
by light users, and an administrator can allow paid overage so usage continues indefinitely.
Because this is flexible, transferable consumption, GitHub cannot let one $19 seat consume
hundreds of dollars of model usage without either reducing the pool or charging more.

Copilot is not entirely metered: code completions and next-edit suggestions remain unlimited
on paid plans. The metering applies to Copilot Chat, CLI, agents, code review and other
agentic features—the features used for Robotics-AI investigations.

### A dedicated seat is access for one person

A Claude or ChatGPT seat is closer to a gym membership. It does not contain a $20 token
balance. Instead, one named person may use the service within rolling usage limits.

The provider can include much more API-list-price capacity because:

- the allowance cannot be transferred to another person;
- unused capacity disappears rather than rolling over or entering a company pool;
- most subscribers do not use every available five-hour window every working day;
- heavy users are constrained by session, weekly, model and fair-use limits;
- the seat cannot be shared or used as the login behind a multi-user internal service;
- after the included limits, the user waits, upgrades, or purchases usage credits;
- the provider may adjust limits and model availability as demand and economics change.

In other words, the subscription price is based on average use across many people, while
credits price the consumption of the particular user who is doing the work. Robotics-AI is
the equivalent of the gym member who actually attends every working day.

### Why Robotics-AI benefits unusually strongly

Our investigations repeatedly load the same large body of context: workspace instructions,
skills, case history, robot software, logs, tables and action code. In the pilot, cached
re-reading accounted for 94.7% of token volume.

Copilot assigns a monetary price to every one of those cached tokens. Claude's subscription
allowance does not decrement one-for-one with the API value of the tokens. In our measured
data, allowance consumption was best explained by generated output and the creation of new
cached context; cached reads had no separately measurable weight.

This is a finding about our measured Claude workflow, not a published promise that
subscriptions “only count output.” Anthropic and OpenAI both state that conversation length,
context, model choice, reasoning, tools and complexity can affect subscription usage. The
important point is narrower and evidence-based: **our context-heavy workload consumed much
more dollar-denominated Copilot capacity than it consumed Claude subscription allowance.**

---

## What should we actually buy?

For company work, the relevant products are the business plans, not personal subscriptions.

| Product | Current published price | Relevant characteristics |
|---|---:|---|
| **Claude Team Standard** | $20/user/month annually; $25 monthly | More usage than Claude Pro, Claude Code included, central administration, no model training on company content by default; minimum two users |
| **ChatGPT Business** | $20/user/month annually; $25 monthly | ChatGPT and Codex included, dedicated workspace and administration, no training on business data by default; minimum two users |
| **Copilot Business** | $19/user/month | IDE integration and unlimited completions, plus 1,900 pooled AI credits per user for metered agent workloads |

The evidence is currently strongest for **Claude Team**, because all 14 Robotics-AI cases
were measured through Claude Code. ChatGPT Business is also a plausible option, but the
document cannot honestly assign it the same 147-investigation capacity without running a
representative pilot. OpenAI states that its included usage depends on the model, context,
reasoning, tool use, retrieval, caching and task complexity.

The sensible purchasing strategy is therefore selective rather than company-wide
replacement:

1. Keep Copilot for developers who mainly benefit from IDE completion, small chat questions
   and ordinary coding assistance.
2. Buy Claude Team seats for the named engineers performing sustained Robotics-AI
   investigations.
3. If ChatGPT Business is preferred for organizational or technical reasons, run the same
   representative cases and measure its allowance before claiming an equivalent capacity.
4. Review actual GitHub AI-usage exports and the Claude usage dashboard after a one-month
   pilot, then decide how many seats are justified.

---

## Fair objections

### “Is Copilot overcharging us?”

No. GitHub's published Claude Opus rates closely follow the provider's published model
rates. Copilot also provides IDE integration, unlimited completions, administration and a
shared pool. The issue is not an unreasonable token price; it is that token-priced agent
usage is a poor fit for our unusually context-heavy investigations.

### “Could we just buy more Copilot credits?”

Yes. That is the simplest option operationally, and it supports transferable usage and
automation. For the measured workload it is considerably more expensive than named seats,
and it preserves the shared-pool problem where one heavy Robotics-AI user can affect other
developers.

### “What if everyone used a subscription this heavily?”

The provider's rolling and weekly limits prevent unlimited use. Most users also consume far
less than the maximum. The high API-equivalent value available to a heavy user is therefore
not the provider promising unlimited compute; it is capacity statistically shared across
the subscriber population and bounded in time.

### “Can one seat power a lab-facing chatbot?”

No. A subscription is licensed to a named person. It is suitable for engineers using the
Robotics-AI workspace themselves. A central automated service used by many lab or helpdesk
staff needs individual seats where supported, or a properly approved API/enterprise
consumption arrangement. One employee's subscription login must not be used as a shared
backend.

---

## What about our data?

Claude models used through Copilot are already processed on infrastructure operated by AWS,
Anthropic and Google. GitHub documents provider agreements that prevent training on the
data and a zero-data-retention agreement with Anthropic for generally available Claude
features.

That statement has exceptions: some beta or preview features are not covered by the same
zero-retention arrangement, and GitHub documents specific retention for some models or
safety features. Model and feature choices therefore remain part of the security review.

Buying Claude Team directly does not introduce an entirely unknown model provider, but it
does change the contract, administration, retention path and which intermediary handles the
data. Claude Team states that company content is not used for model training by default.
ChatGPT Business provides the same no-training-by-default commitment for business data.
These business plans are preferable to personal Pro or Plus accounts, which do not provide
the same organizational controls.

Running through the company's AWS, Google Cloud or another approved cloud account can offer
additional contractual and technical control, but it does not eliminate supplier agreements
or security review. It also returns the workload to per-token billing, so it does not preserve
the seat-pricing advantage described here.

---

## The one-sentence summary

> Copilot gives us a transferable $19 consumption balance; a Claude seat gives one named
> engineer time-limited access whose unused capacity cannot be shared. Our investigations
> are 94.7% cached context, so that difference in accounting turns approximately the same
> seat price into about 4–5 investigations on Copilot versus an estimated 147 on Claude.

---

## Sources and reproducibility

Local measurements:

- `lab-chat-poc/cost_log.csv` — the 14 logged conversations and their token counts
- `lab-chat-poc/cost_report.py` — API-equivalent monetary report
- `lab-chat-poc/plan_calibration.py` — allowance-calibration method and current refit output
- `lab-chat-poc/README.md` — methodology, assumptions and known limitations

Official product documentation, checked 20 August 2026:

- [GitHub — Choosing a Copilot enterprise plan](https://docs.github.com/en/copilot/tutorials/roll-out-at-scale/assign-licenses/choose-enterprise-plan)
- [GitHub — Usage-based billing for organizations and enterprises](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises)
- [GitHub — Models and pricing for Copilot](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing)
- [GitHub — Hosting of models for Copilot](https://docs.github.com/en/copilot/reference/ai-models/model-hosting)
- [Anthropic — Claude plans and pricing](https://claude.com/pricing)
- [Anthropic — How usage and length limits work](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)
- [OpenAI — ChatGPT Work and Codex pricing](https://learn.chatgpt.com/docs/pricing)

Prices, plan limits and data terms can change. Reconfirm the official pages and the company's
actual invoice, tax treatment and GitHub billing export before signing a contract.

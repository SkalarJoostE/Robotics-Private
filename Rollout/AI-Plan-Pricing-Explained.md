# Why an AI subscription and AI credits cost such different amounts

*A plain-language explainer. No technical knowledge assumed.*
*Written August 2026 · Robotics-AI · Software Engineering*

---

## The short version

There are two completely different ways to pay for AI, and for the kind of work we do they
differ by more than **thirty times** at the same monthly price.

| | How you pay | What €20 a month buys us |
|---|---|---|
| **GitHub Copilot** (what we use today) | **Metered.** You buy a pot of credits, and every word the AI reads or writes takes some out. | about **4** of our conversations, **per month** |
| **A Claude or ChatGPT subscription** | **Flat rate.** You pay per person, and you are limited by how heavily you use it — not by how much text is involved. | about **150** of our conversations, **per month** |

Same money. Very different amount of work. This document explains why, because the reason
is not "one company is greedier than the other" — it is that the two systems measure
completely different things, and our work happens to be terrible for one of them.

**One thing to be clear about up front:** where this document says "a conversation", it does
not mean a quick question. It means a full investigation — the assistant opening a robot's
log file, tracing its program step by step, pulling the customer's software, comparing it
against the template and against past cases, and then reporting back. Done by hand that is
anywhere from **one to four hours** of an engineer's work — not a chat message. Four of those
a month is not a meaningful allowance.

---

## First, what actually costs money

When we put a problem to the assistant, it does not just read the question. It re-reads
**everything it needs in order to investigate it** — every time.

For our robot work that means: the instructions describing how our software is built, the
relevant procedure, past cases we have written up, and then the actual evidence — a robot's
log file, its program tables, the customer's software. That can be several million words of
reading for one question.

Then it writes an answer, which might be one page.

So a single conversation is:

- an **enormous** amount of reading (about 95% of the total)
- a **small** amount of writing (about 5%)

Hold on to that 95/5 split. It is the whole story.

---

## The two payment models

### Metered: GitHub Copilot credits

Since 1 June 2026 Copilot bills in **AI Credits**. One credit is one dollar-cent. Credits are
consumed based on the amount of text involved — **the reading and the writing both count**.

So Copilot charges us for that 95%.

One of our conversations averages about **€4.44**. On a €19/month Copilot plan — which comes
with about €19 of credits — that is roughly **four conversations a month**.

Two further things make it worse in practice:

- **The pot is shared.** Our organisation's credits go into one pool for everyone. A
  developer using AI for ordinary code suggestions consumes a trickle. One of our
  robot-diagnosis conversations consumes roughly **2.5% of the entire company's monthly AI
  budget** on its own. So we either drain the pool for our colleagues, or we get cut off
  when someone else drains it. Both have already happened.
- **When the pool is empty, it stops.** Not "slower" — unavailable, until the next month.

### Flat rate: a Claude or ChatGPT subscription

A subscription works like a gym membership rather than a taxi meter. You pay per person, and
instead of counting words, the provider limits **how heavily you can use it over time**.

Crucially, the limits are driven almost entirely by how much the assistant **writes**, not by
how much it **reads**. That 95% of reading is essentially not counted.

This is not a discount. It is a different meter measuring a different thing — and our work
happens to be very heavy on exactly the part that subscriptions don't charge for.

**To be clear about what a subscription is not:** it is not unlimited. There is a real
ceiling — on the €20 plan roughly **150 of our investigations a month** — and on a heavy day
you can reach it and be asked to ease off for a while. It is simply a far higher ceiling than
four a month, and it never leaves us stopped for weeks.

---

## The comparison, using our own measurements

These are not estimates. We logged 14 real conversations — service tickets and lab questions —
and priced every one.

| | Copilot credits (€19/mo) | Claude subscription (€20/mo) |
|---|---|---|
| What is counted | every word read and written | roughly, only what is written |
| Our capacity | **~4 investigations / month** | **~150 investigations / month** |
| What happens at the limit | stops until next month | briefly throttles, then resumes |
| Shared with colleagues? | yes — one company pool | no — one named person |

Put the other way round: **one €20 subscription delivers roughly €650 a month of usage if you
had to buy it by the word.** That is more than three times our company's entire shared credit
pool, from a single seat.

---

## The three providers, briefly

All three offer both models. The names differ; the shapes are the same.

| Provider | Flat-rate personal | Flat-rate heavier | Pay-per-word |
|---|---|---|---|
| **Claude** (Anthropic) | Pro, ~€20/mo | Max, ~€100 or ~€200/mo (5× and 20× Pro) | API, billed per word |
| **ChatGPT** (OpenAI) | Plus, ~€20/mo · Business ~€20–25/user/mo | Pro, ~€100 or ~€200/mo | API, billed per word |
| **GitHub Copilot** | — | — | AI Credits — **this is what we have** |

The important row is the last one. **Copilot only sells the metered model.** Its plans are
priced in credits, which is why our usage burns through them.

*Figures are current as of August 2026 and should be re-confirmed before anything is signed.*

---

## Three fair objections, answered honestly

**"So Copilot is overcharging us?"**
No, and we should not say that. Copilot's credits are billed at the same published rates the
AI providers charge everyone. Per word it is not marked up. The problem is that *any*
pay-per-word plan is the wrong instrument for work that involves this much reading.

**"Isn't Copilot cheaper for everyone else?"**
For most people, yes — genuinely. Someone using AI for code suggestions while they type may
never notice the limit. Our work is simply a different shape: fewer, much larger questions.
Both can be true at once, and that is the actual finding here.

**"Could we just buy more credits?"**
We could, and it would work. It would just cost several times more for the same output than
buying subscriptions, and it keeps the shared-pool problem where one heavy user affects
everyone else.

---

## What about our data?

A reasonable question, and worth stating clearly because there is a common misconception.

When we run Claude *inside GitHub Copilot* today — which we already do — our prompts already
go to Anthropic's models, running on Amazon, Google and Anthropic's own infrastructure, under
an agreement GitHub holds that says the data is **not retained and not used for training**.

So approving a Claude subscription directly is **not a new question about who sees our data**.
The data already goes there. It is a question of *which contract governs it* — GitHub's, or
Anthropic's own commercial terms, which carry the same no-training commitment.

There is also a third option if IT prefers it: the same tooling can run inside the company's
own cloud account. That resolves the contractual question entirely — but note it is billed
**per word again**, so it re-introduces the cost problem this document describes. Worth
knowing before choosing it.

---

## The one-sentence summary

> Our work is 95% reading. Credits charge for reading; subscriptions charge for writing.
> That single difference is why the same €20 buys us four deep investigations a month one
> way, and around a hundred and fifty the other.

---

*Sources: measured from 14 logged conversations in `lab-chat-poc/`, recomputed from token
counts on 2026-08-19. Provider terms from GitHub's AI Credits announcement and model-hosting
documentation, Anthropic and OpenAI published plan pricing. Questions: Joost, Software
Engineering.*

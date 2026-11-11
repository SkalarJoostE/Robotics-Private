# Robotics-AI for Helpdesk — proposed usage plan

**Status:** draft for discussion. Nothing here is decided — the point of this document is for you to correct it.
**Owner:** Joost (Software Engineering) · **Date:** 2026-07-25

---

## What it is, in one paragraph

An AI assistant that has been taught our robot software: the Sequence/SubSequence execution model, the C# action code, the error-code tables per template, and three months of solved cases. It runs on your own PC against the same Jira, SVN and log files you already use. You give it a ticket number; it gathers all the evidence for that ticket and gives you a diagnosis with the reasoning shown. **It does not answer the customer and it does not touch Jira** — you stay in control of everything that leaves the building.

## What it does for you today

This is already built and in daily use by Software Engineering. Nothing in this section needs to be developed first.

| You type | What happens |
|---|---|
| `Solve issue RB-380` | Pulls the current ticket text, comments and every attachment. Detects what each ZIP actually contains, installs the customer's own software build, extracts their logs, and checks out the current SVN version alongside it for comparison. Then diagnoses. |
| `Why did the robot skip the rinse step?` | Traces the actual execution path through that system's Sequence and SubSequence tables and shows it as a tree. |

**And on every case, without being asked:**

- **It checks the case base first** — 41 previously solved cases, searched for the same order number, error code and symptoms before investigating from scratch. Field issues repeat, and often the old write-up is most of the answer.
- **It reads the logs directly**, when logs are attached — the binary `.glf` Gibraltar logs, with no exporting and no manual scrolling. Finds the exceptions, the timeline around the failure, and what the robot was doing when it went wrong.
- **It compares against SVN**, when the customer sent their build — so you see what is genuinely different on their machine rather than assuming they are on the shipped version.

**What you get back:** a written analysis with the symptom, the evidence it actually examined, the root cause **with a confidence level**, what's still unknown, and a **draft** reply for Jira. The draft is never posted — you read it, correct it, and send it yourself.

## What it does not do

Being clear about this up front, because the fastest way to lose your trust is to oversell it.

- **It does not close tickets or reply to customers.** Every external message is yours.
- **It is wrong sometimes.** Treat it as a well-prepared colleague's first opinion, not an answer. It shows its evidence precisely so you can check it.
- **It needs the VPN** to reach SVN, same as you do.
- **If a log can't be opened, it stops and says so** rather than guessing. That's deliberate.
- **Coverage is uneven.** BOD is documented in depth; Waters is thinner; Testkit and Clay Fraction have little written documentation yet.
- **It doesn't know what was said on the phone.** Anything not in Jira, the logs, or the software is invisible to it.

## A realistic example

> A customer reports the robot stops mid-run with a gripper error. Ticket has a log ZIP and their software build attached.
>
> You type `Solve issue RB-4xx`. It downloads everything, installs the customer's actual build (not the SVN version — those differ), reads their log, finds the exception and the twelve seconds before it, checks the gripper configuration in *their* tables, notices the same failure was solved on a different order in May, and reports: probable cause, the config row that differs from the template, confidence level, and the one question it can't answer from the evidence — did the customer change the tray layout?
>
> You read it, agree or don't, and reply.

The realistic win is not that it's always right. It's that the 60 minutes of downloading, unzipping, checking out and hunting through logs is done before you start thinking.

## What you'd need

- A Windows PC, the VPN you already have, and a Jira account.
- Setup is one file to double-click (`Bootstrap-RoboticsAI.bat`) — it installs what's missing and clones everything. Then two browser logins. Budget half a day with Joost for the first person, less after that.
- A Claude subscription per person.

## What we'd measure during a pilot

Numbers to be filled in from the discovery conversations and the replay test — **please challenge these if they're the wrong things to measure.**

| Measure | Today | Target |
|---|---|---|
| Time from ticket arriving to a first informed reply | ___ | ___ |
| Tickets per month escalated to Software Engineering | ___ | ___ |
| Typical wait for a Software Engineer's answer once escalated | ___ | ___ |
| Time spent gathering evidence before diagnosis starts | ___ | ___ |

## What I need from you

1. What did you do last week that took longer than it should have — and roughly how long did it take?
2. How many tickets a month do you hand to Software Engineering, and what are you usually waiting for?
3. Walk me through your last genuinely hard ticket, step by step.
4. Pick three tickets you closed recently. I'll run them through this cold and show you what it produces versus what actually happened — then you tell me whether it would have helped.
5. If it does look useful: who would be the pilot person, and can we have some of their time?

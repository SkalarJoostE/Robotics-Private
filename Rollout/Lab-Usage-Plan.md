# Robotics-AI for the Lab — proposed usage plan

**Status:** draft for discussion. Nothing here is decided — the point of this document is for you to correct it.
**Owner:** Joost (Software Engineering) · **Date:** 2026-07-25

---

## What it is, in one paragraph

An AI assistant that has been taught our robot software: how Sequences and SubSequences actually execute, the C# action code behind every action number, the error-code tables per template, the Software Setup guides on Confluence, and three months of solved cases. It runs on your own PC against the same SVN and log files you already use. You give it an order number and a log; it sets everything up and tells you what went wrong. **It never commits to SVN** — you decide what changes.

## What it does for you today

Already built and in daily use by Software Engineering. Nothing here needs developing first.

| You type | What happens |
|---|---|
| `Order 99441496, log attached — robot hangs after the sample pickup` | Checks out (or refreshes) that order's software from SVN, files the log in the project's `Log` folder, checks whether we've seen this before, then reads the log and diagnoses. One step instead of six. Works the same when the software came as a zip — a customer install or a ticket attachment — installed into the workspace exactly like an SVN checkout. |
| `Why does it rinse twice before the first sample?` | Traces the real execution path through *that system's* Sequence and SubSequence tables and shows it as a tree, including parallel branches and disabled rows. No hunting through multi-megabyte XML. |
| `How should the QC interval be configured on a Soil Single pHEC?` | Reads the Software Setup and "in Details" pages from Confluence directly and answers for that template. |
| `Is this configured the way the template expects?` | Compares that system's tables against the template it was built from, so a wrong row shows up as a difference rather than something you have to spot by eye. |


**What you get back:** a written diagnosis with the evidence it examined, the root cause **with a confidence level**, and what's still unknown. If a fix is needed in the tables or action code, it can prepare the change locally and tell you exactly which files it touched — but committing is always your call.

## What it does not do

Being clear up front, because overselling it is the fastest way to lose your trust.

- **It never commits to SVN and never edits Jira.** Changes stay local until you push them.
- **It is wrong sometimes.** Treat it as a well-prepared colleague's first opinion. It shows its evidence so you can check it.
- **It needs the VPN** for SVN, same as you.
- **If it can't open a log, it stops and says so** rather than guessing.
- **It can't see the robot.** Anything physical — a loose tube, a misaligned rack, something you noticed by ear — has to be told to it.
- **Coverage is uneven.** BOD is documented in depth; Waters is thinner; Testkit and Clay Fraction have little written documentation yet.

## A realistic example

> A robot in the lab fails during FAT. It stops with an error partway through a run. You have the log.
>
> You say: `99441496, here's the log, it stops after the third sample with a diluter error`. It refreshes the software from SVN, files the log, checks whether we've hit this before, reads the log around the failure, checks the diluter configuration in that system's tables, traces which SubSequence was running, and reports: the diluter port assignment in the tables doesn't match the hardware, here's the row, here's the log line that proves it, confidence high.
>
> You check it against the actual machine and fix the row.

The realistic win is that the fetch, the checkout, the CSV generation and the log hunting are done before you start thinking — and that the "have we seen this before" check actually happens, every time.

## What you'd need

- A Windows PC, the VPN you already have.
- Setup is one file to double-click (`Bootstrap-RoboticsAI.bat`) — it installs what's missing and clones everything. Then two browser logins. Budget half a day with Joost for the first person, less after that.
- A Claude subscription per person.

## What we'd measure during a pilot

Numbers to be filled in from the discovery conversations and the replay test — **please challenge these if they're the wrong things to measure.**

| Measure | Today | Target |
|---|---|---|
| Time lost per week waiting on Software Engineering for a software answer | ___ | ___ |
| Time to diagnose a build/FAT blocker | ___ | ___ |
| Questions per month escalated to Software Engineering | ___ | ___ |
| Time spent setting up before diagnosis can start (checkout, logs, tables) | ___ | ___ |

## What I need from you

1. What did you do last week that took longer than it should have — and roughly how long did it take?
2. How often are you blocked waiting for Software Engineering, and what's the usual wait?
3. Walk me through the last robot problem that really cost you a day.
4. Pick two cases you resolved recently. I'll run them through this cold and show you what it produces versus what actually happened — then you tell me whether it would have helped.
5. If it does look useful: who would be the pilot person, and can we have some of their time?

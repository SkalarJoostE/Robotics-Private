# Robotics-AI flowcharts

Manager-facing flowcharts of what the workspace does behind the screen for each kind of question,
and what a shared web version (API-billed, open to everyone with access) would need for each flow.
Made for the web-chat side project discussion, October 2026.

| File | Flow |
|---|---|
| `00-question-routing.md` | How a question is matched to a skill |
| `01-investigation-spine.md` | The seven steps every investigation follows |
| `02-lab-issue.md` | Lab issue intake (`skalar-lab-issue`) |
| `03-log-analysis.md` | Log analysis through the Loupe log reader (`skalar-log-analysis`) |
| `04-jira-ticket.md` | RB/ES ticket (`skalar-jira-issue`) |
| `05-precedent-search.md` | "Have we built this before?" (`skalar-feature-precedent`) |
| `06-feature-implementation.md` | Building a feature into an order (`skalar-feature-implementation`) |
| `07-sso-approval.md` | SSO B-system R&D approval (`Process-SSO-Approvals.ps1`) |
| `08-customer-software-to-svn.md` | Customer software to SVN (`skalar-svn-import`) |
| `09-diluter-upgrade.md` | Diluter Upgrade Kit |
| `10-learning-loop.md` | Filing results back into the case base (`skalar-session-wrapup`) |
| `11-proposal-any-robot-question.md` | **Proposal, not built:** two lanes with a shared RAG search (see `md documents\Assessments & Plans\RAG Assessment.md`) |

The `.md` files are the source. Each one renders on its own in VS Code and GitHub (Mermaid).
`flowcharts.html` is the combined page, generated from them:

```
node build-flowcharts-page.js
```

`page-template.html` holds the page layout and the static "what a web version would need" section
(its cost figures come from `Rollout/Access-and-Feedback-Loop.md` §2 and §5; update both together).
The summary table on the page is built from each file's `## For a web version` section, whose
`Needs:` line must use the fixed vocabulary at the top of `build-flowcharts-page.js`.

Published page (private until shared from its Share menu): https://claude.ai/artifact/G5TYB8hfWQ9gAfayeRttgN
To update it, rebuild and republish the same file to that URL.

**Keep them true.** The charts describe the skills and scripts as of 2026-10-26. When a skill's
steps, gates or hard rules change, update the matching chart in the same commit and rebuild.

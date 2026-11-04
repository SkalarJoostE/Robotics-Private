# How it works

Each child page shows one kind of question as a flowchart: what the assistant does, which scripts run, where a person decides, and where it stops.

## Reading the charts

| Shape | Meaning |
|---|---|
| Light blue box, solid border | The assistant reasons or writes |
| Light blue box, dashed border | A workspace script runs |
| Diamond | A branch in the flow |
| Orange box | A person decides or acts |
| Red box | A hard stop or ground rule |
| Rounded box | A stored result (a file or folder that is kept) |
| Dark pill | Start or end |

## The flows

| # | Page | Typical question |
|---|---|---|
| 00 | What happens when you ask a question | Any question asked inside the workspace |
| 01 | The investigation spine | The seven steps every investigation follows |
| 02 | A lab issue comes in | "99441979 stops after the second sample, here is the log" |
| 03 | Reading a robot log | "Why did this run hang?" |
| 04 | Solving an RB or ES ticket | "Solve RB-380" |
| 05 | Have we built this before? | "Have we ever rinsed the probe with KCl between samples?" |
| 06 | Building a feature into an order | "Add a setting to switch the sprayer off" |
| 07 | Assessing a B-system order for R&D approval | "Assess SSO-52" |
| 08 | Putting a customer's software on SVN | "Put this customer zip on SVN" |
| 09 | Upgrading the diluters on an installed robot | "Upgrade the diluters on 99325813" |
| 10 | How answers become knowledge | "Log this ticket resolution" |

<!-- Publishing note (not part of the page): each child page is built from Rollout/Flowcharts/NN-*.md —
the intro paragraph, the Mermaid chart (as a Mermaid macro) and the Key points. The "For a web version"
section is left out here; it belongs to the Web application plan. Flow 11 (the two-lane proposal) also
goes to the Web application plan, not here. -->

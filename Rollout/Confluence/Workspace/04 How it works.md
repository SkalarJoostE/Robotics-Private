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

| Page | Typical question |
|---|---|
| [What happens when you ask a question](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2927624199) | Any question asked inside the workspace |
| [The investigation spine](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2928377857) | The seven steps every investigation follows |
| [A lab issue comes in](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2926968845) | "99441979 stops after the second sample, here is the log" |
| [Reading a robot log](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2928181250) | "Why did this run hang?" |
| [Solving an RB or ES ticket](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2927820802) | "Solve RB-380" |
| [Have we built this before?](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2928082946) | "Have we ever rinsed the probe with KCl between samples?" |
| [Building a feature into an order](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2927296516) | "Add a setting to switch the sprayer off" |
| [Assessing a B-system order for R&D approval](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2927656962) | "Assess SSO-52" |
| [Putting a customer's software on SVN](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2927296536) | "Put this customer zip on SVN" |
| [Upgrading the diluters on an installed robot](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2928410625) | "Upgrade the diluters on 99325813" |
| [How answers become knowledge](https://skalaranalytical.atlassian.net/wiki/spaces/RA/pages/2928443393) | "Log this ticket resolution" |

<!-- Publishing note (not part of the page): each child page is built from Rollout/Flowcharts/NN-*.md —
the intro paragraph, the Mermaid chart (as an image rendered by mermaid.ink) and the Key points. The "For a web version"
section is left out here; it belongs to the Web application plan. Flow 11 (the two-lane proposal) also
goes to the Web application plan, not here. -->

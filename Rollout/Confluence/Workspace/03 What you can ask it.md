# What you can ask it

| Kind of question | Example | What happens | What comes out |
|---|---|---|---|
| **A robot problem** | "99441979 stops after the second sample, here is the log" | Gets the exact software the robot runs, checks the case base and known template issues, reads the log, reasons over the tables and code | A diagnosis, or a best explanation with the reasoning behind it, and the smallest thing still needed to be sure |
| **A robot log** | "Why did this run hang?" | Queries the log through the log reader, starting from an overview and narrowing down | Timeline, cause, affected samples, recommendation |
| **A service ticket** | "Solve RB-380" | Downloads the ticket, its attachments and the customer's own software, then diagnoses from them | An analysis and a draft reply. A person decides what to post |
| **Have we built this before?** | "Have we ever rinsed the probe with KCl between samples?" | Searches the index cards of all delivered orders and the feature dossiers | A shortlist of reference orders; after a person picks one, a description of what to copy and what not to |
| **A change to an order** | "Add a setting to switch the sprayer off" | Changes the tables and action code with the workspace scripts, checks every new movement has a position, builds it in the application and tests it in emulation | A built and tested change, committed to SVN once a person approves |
| **A B-system order for R&D approval** | "Assess SSO-52" | Downloads and converts every attachment, checks completeness, cross-checks the documents, finds reference orders | A written assessment: ready to approve, or the open questions |
| **Customer software to SVN** | "Put this customer zip on SVN" | Compares the zip with SVN file by file and shows what would change | A staged update, committed only after a person says yes |
| **A diluter upgrade or core update** | "Upgrade the diluters on 99325813" | Runs the dedicated tool in the order's own software, with a backup first | A change report, and the steps left for a person |
| **How something works** | "What does the ParkPosition setting do?" | Reads the template, the tables, the action code and the Confluence guides | An explanation that points at where it comes from |

Each of these is drawn step by step under **How it works**.

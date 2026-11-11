# Teamwork Graph Assessment

> **Assessment date:** 2026-08-26  
> Research assessment only. No workspace, Atlassian, Forge, MCP, or assistant configuration was changed.

## Decision

**PILOT — only as a read-only Rovo MCP pilot after the tenant exposes the beta Teamwork Graph read tools.** Keep Rovo MCP as Robotics-AI's primary Atlassian surface. Do not build a custom connector, grant graph writes, join the query-API EAP, enable code context, or install Teamwork Graph CLI now.

## Definition and model

Teamwork Graph is Atlassian Cloud Platform's unified data layer. It normalizes data from Atlassian apps and external systems and connects it for search, AI, analytics, recommendations, and workflows. It is a cloud platform layer behind product experiences, not a local graph database Robotics-AI installs. ([Developer overview](https://developer.atlassian.com/platform/teamwork-graph/what-is-teamwork-graph/); [product page](https://www.atlassian.com/platform/teamwork-graph))

A source item becomes an **object** of a standardized **object type** with properties: work items, documents, messages, users, groups, projects, pull requests, repositories, calendar events, and others. A Jira issue and an external task can therefore share a work-item model. Not every connector object type is indexed in Rovo Search/Chat. ([Object types](https://developer.atlassian.com/platform/teamwork-graph/object-types/))

A **relationship** is a typed, directional edge. Atlassian documents four classes: **canonical** source-of-truth structure, **activity** recording user actions, **logical** abstractions over several underlying relationships, and **inferred** connections derived from patterns, metadata, or models. ([Relationships](https://developer.atlassian.com/platform/teamwork-graph/relationships/))

## What already works automatically versus explicit integration

| Surface | Status | Robotics-AI meaning |
|---|---|---|
| Native Jira/Confluence + Atlassian AI | **Automatic when enabled.** Teamwork Graph supplies organizational context to Atlassian AI; Rovo Search combines Atlassian and connected content within user permissions. ([AI architecture](https://support.atlassian.com/organization-administration/docs/what-is-atlassian-intelligence/); [Rovo](https://support.atlassian.com/rovo/docs/what-is-rovo/)) | RB, ES, SSO, and Confluence data already benefit. Do not ingest them again. |
| Rovo Search, Chat, Agents, Analytics | **Customer-visible graph consumers.** Connector data can surface across these experiences. ([Rovo](https://support.atlassian.com/rovo/docs/what-is-rovo/); [connector module](https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/)) | These are the main practical benefits; most users do not query the graph directly. |
| Existing Atlassian endpoint | **Already adopted indirectly.** Atlassian calls it the Rovo MCP Server and says it is Teamwork Graph-powered. The same endpoint is configured in [`.mcp.json`](../../.mcp.json), [`.vscode/mcp.json`](../../.vscode/mcp.json), and [`.codex/config.toml`](../../.codex/config.toml). ([Rovo MCP](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/)) | Cross-assistant parity already covers stable Jira/Confluence operations. No second graph server is needed. |
| Graph tools in Rovo MCP | Official tools are beta reads `getTeamworkGraphContext` and `getTeamworkGraphObject`, plus write `addTeamworkGraphContext`. Admins govern permission groups. Beta tools are free now; Atlassian says GA read calls will cost at least one Rovo credit, with 90 days' notice. ([Supported tools](https://support.atlassian.com/atlassian-ai-gateway/docs/supported-tools/)) | The mounted assessment session has ordinary Atlassian tools but **not** these graph tools. Configuration alone does not prove tenant/account/host availability. Pilot only once both reads appear; do not use the writer. |
| Out-of-box connectors | Admin-configured synced, direct, and Smart Link connectors cover many cloud tools. ([Connector administration and list](https://support.atlassian.com/organization-administration/docs/manage-your-teamwork-graph-connectors/)) | The official list does not include Subversion or Loupe/Gibraltar. |
| Forge `graph:connector` | Custom ingestion is generally available and can add modeled objects, ACLs, and relationships. ([GA announcement](https://www.atlassian.com/blog/development/building-teamwork-graph-connectors-forge); [SDK](https://developer.atlassian.com/platform/teamwork-graph/connector-reference/overview/)) | Requires a maintained Forge app, reachable source, model, ACL mapping, and complete update/delete synchronization. |
| Direct graph query API | GraphQL-wrapped Cypher is a **Forge EAP**, allowlisted, unsupported, test-only by default, and non-distributable. Selected enterprise customers may request an approved production path. ([EAP tutorial](https://developer.atlassian.com/platform/forge/call-the-teamwork-graph-api/); [limitations](https://developer.atlassian.com/platform/teamwork-graph/limitations-and-considerations/)) | There is no generally available public traversal API Robotics-AI should depend on. |
| Teamwork Graph CLI | Separate official surface for shell/CI/CD and broader graph-style automation. Atlassian recommends one primary surface per session; MCP suits MCP hosts, OAuth, and simpler predeclared tools. ([CLI/MCP decision guide](https://support.atlassian.com/rovo/docs/teamwork-graph-cli-and-rovo-mcp-decision-guide/)) | Keep MCP primary. Adding CLI duplicates installation, auth, tools, and parity unless a benchmark proves a CLI-only need. |
| Code context | Open beta lexical/semantic search for opted-in GitHub/Bitbucket Cloud repositories. ([Code context](https://support.atlassian.com/rovo/docs/what-is-code-context/)) | Evaluate separately. Local filesystem, AST/regex search, generated profiles, SVN checkouts, and domain skills are already more exact and broader. |

## Typical official use cases

- Unified, permission-filtered search across Jira, Confluence, and connected tools. ([Rovo Search](https://support.atlassian.com/rovo/docs/what-is-rovo/))
- Grounded Chat and Agents that answer from company context and can act with user permission. ([Rovo Chat and Agents](https://support.atlassian.com/rovo/docs/what-is-rovo/))
- Cross-tool context/analytics connecting work, documents, people, projects, and development objects. ([Relationships](https://developer.atlassian.com/platform/teamwork-graph/relationships/))
- Ingesting an external source once for Search, Chat, Agents, and Analytics. ([Connector SDK](https://developer.atlassian.com/platform/teamwork-graph/connector-reference/overview/))
- Discovering connected objects with `getTeamworkGraphContext`, then fetching selected details with `getTeamworkGraphObject`. This is curated context retrieval, not arbitrary Cypher. ([Supported tools](https://support.atlassian.com/atlassian-ai-gateway/docs/supported-tools/))
- Scripted agent/CI workflows through TWG CLI. ([CLI/MCP guide](https://support.atlassian.com/rovo/docs/teamwork-graph-cli-and-rovo-mcp-decision-guide/))

## Access, licensing, permissions, and security

- Rovo credits are included in paid Jira, Confluence, Service Collection, and Teamwork Collection Cloud subscriptions. Atlassian says AI is available on Standard, Premium, and Enterprise plans; organization admins control Rovo access, and activation needs a verified business domain. ([Rovo](https://support.atlassian.com/rovo/docs/what-is-rovo/); [AI availability](https://support.atlassian.com/organization-administration/docs/what-is-atlassian-intelligence/)) These statements do **not** prove every connector, Analytics surface, beta tool, indexed-object allowance, or future charge is included in Skalar's contract. Verify the tenant and commercial terms.
- Admin-managed connectors require organization-admin rights; most connect only one external workspace per Atlassian site, and users may need source authentication. ([Connector administration](https://support.atlassian.com/organization-administration/docs/manage-your-teamwork-graph-connectors/))
- Rovo MCP graph reads require broad Jira, Confluence, account, and third-party scopes. The relationship writer requires `write:all:twg`. ([Tools and scopes](https://support.atlassian.com/atlassian-ai-gateway/docs/supported-tools/))
- Native/admin-managed connectors synchronize permissions, deletions, and later restrictions. ([Permission synchronization](https://support.atlassian.com/organization-administration/docs/how-connector-permissions-are-kept-in-sync/)) Third-party graph MCP behavior is connector-specific: full GitHub access checks GitHub permissions, while limited GitHub and documented Azure DevOps/GitLab/Jenkins/Spinnaker paths use Jira-visible permissions. ([Supported tools](https://support.atlassian.com/atlassian-ai-gateway/docs/supported-tools/)) Test rather than assume.
- Custom connectors must maintain ACLs. Supported principals include users, groups, Atlassian workspace, and container plus external-user mappings. ([Connector ACLs](https://developer.atlassian.com/platform/teamwork-graph/permissions-and-access-control-lists/)) Without end-user auth, Atlassian warns reliable identity mapping is unavailable and workspace scope may expose objects to everyone. ([Connector module](https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/))
- Synchronized sources store indexed file content, usage data, and permissions. Chat/Agent inputs and outputs are retained for 30 days; disconnect deletion is within 30 days with exceptions. ([Rovo privacy](https://support.atlassian.com/rovo/docs/rovo-data-privacy-and-usage-guidelines/))
- The custom Forge connector terms prohibit specified categories including emails, calendars, meeting recordings, HR data, regulated financial/health data, and GDPR-like special categories. ([Connector terms](https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/))
- Connectors are Forge-only and currently install into Jira; the SDK is an ingestion/lifecycle surface, not unrestricted traversal. ([Limitations](https://developer.atlassian.com/platform/teamwork-graph/limitations-and-considerations/); [SDK](https://developer.atlassian.com/platform/teamwork-graph/connector-reference/overview/))

## Robotics-AI fit by workflow

The workspace combines Jira/Confluence with deterministic local processing, SVN evidence, curated Markdown, Loupe MCP, and cross-assistant parity. ([`AI_WORKSPACE_PLAN.md`](../../AI_WORKSPACE_PLAN.md))

| Workflow | Assessment |
|---|---|
| **RB/ES Jira intake** | **Read-only MCP pilot candidate.** Connected context could reveal related pages, tickets, people, or DevOps objects before intake. It must not replace the exact-ticket scraper, comments/attachments refresh, ZIP processing, SVN comparison, or Loupe handoff. |
| **SSO R&D approval** | **Limited fit.** It may discover Jira/Confluence evidence, but the local converter/manifest stays authoritative for PDFs, SPDQ spreadsheets, DOCX, images, ZIPs, and visual review. Do not upload approval bundles for graph search. |
| **Confluence setup docs** | **Strongest fit; pilot.** Test cross-page discovery, but retain numeric page-ID fetches and direct reading for cited evidence. |
| **Historical SVN/order corpus** | **Do not integrate.** No official SVN connector exists. A custom connector would need revision fidelity, reachable hosting, incremental mirror/delete, modeling, and ACLs. The local ancestry/diff/index pipeline is more exact. |
| **Local case base** | **Do not bulk-ingest.** A cloud copy creates staleness, ACL, deletion, and canonical-source risks around customer/site context. Any later test should use only sanitized summaries in a test organization. |
| **Loupe logs** | **No fit.** No Loupe connector or binary `.glf` support is documented. Keep Loupe MCP as the only reader and link verified resolutions to Jira/Confluence. |
| **MCP parity** | **Keep MCP primary.** Once beta reads appear, verify the same tools and permission results in Claude, Copilot, and Codex. Do not add CLI without a benchmarked need. |
| **Code context** | **Do not enable now.** GitHub code is mirrored before indexing; all files across all branches/tags in opted-in repos, chunks, metadata, and embeddings are stored in a US environment, with non-instant freshness. Third-party agent use can send retrieved source to that provider. ([Code context](https://support.atlassian.com/rovo/docs/what-is-code-context/)) Local access is fresher, broader, and more controllable. |

## Risks

1. **Permission mismatch/amplification:** custom ACL errors can expose data workspace-wide; some third-party MCP results follow Jira rather than source permissions.
2. **Stale duplicate knowledge:** a connector must mirror updates, deletes, permissions, and sync fidelity. ([Connector capabilities](https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/))
3. **Probabilistic retrieval replacing evidence:** graph context cannot replace exact Jira refresh, attachment manifests, SVN ancestry, direct Confluence fetches, or Loupe queries. ([Rovo guidelines](https://support.atlassian.com/rovo/docs/rovo-data-privacy-and-usage-guidelines/))
4. **Beta/EAP maturity and cost:** MCP graph reads are beta with future credit billing; Cypher/GraphQL remains EAP.
5. **Overlapping surfaces:** CLI plus MCP duplicates auth, discovery, tooling, and parity; Atlassian recommends one primary surface.
6. **Code/IP replication:** code context stores indexed material in the US and is open beta.
7. **Model mismatch:** revision-specific XML/action code, visually reviewed documents, and binary logs do not naturally map to a generic graph; not every object type is Rovo-searchable. ([Object types](https://developer.atlassian.com/platform/teamwork-graph/object-types/))

## Recommended smallest pilot

### Decision: **PILOT**

1. **Gate:** an organization admin confirms Rovo MCP is allowed, `read_teamwork_graph` can be granted, both beta read tools appear, credit terms are understood, and Security approves the test. The mounted session currently lacks them.
2. **Read-only:** do not grant/invoke `addTeamworkGraphContext` or `write:all:twg`. Do not create a Forge app/connector, install TWG CLI, enable code context, or join the API EAP.
3. **Synthetic chain:** use one non-sensitive Jira test item linked to one restricted Confluence test page. Call `getTeamworkGraphContext`, then `getTeamworkGraphObject` only for selected returned objects.
4. **Permission control:** repeat as a user without page access. The page must neither be returned nor influence the answer. Keep the first pilot inside Jira/Confluence because third-party permission models vary.
5. **Parity/value:** repeat in Claude, Copilot, and Codex. Compare discovery time, relationship accuracy, source links, availability, and permissions with the exact Jira/Confluence workflow.

**Stop unless the pilot demonstrates clear retrieval value.** Even if successful, keep the RB/ES scraper, SSO converter, SVN pipeline, local case base, direct Confluence fetches, and Loupe MCP unchanged. Consider TWG CLI only if a later benchmark proves a repeatable shell/CI task MCP cannot perform. Consider custom ingestion only as a separate Security-reviewed test using sanitized summaries. Do not use the direct graph-query API for production Robotics-AI while it remains EAP.

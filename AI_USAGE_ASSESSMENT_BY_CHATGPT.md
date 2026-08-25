# AI Usage Assessment by ChatGPT

Date: 2026-08-25

Scope: AI usage and context efficiency in the Robotics-AI workspace

Status: Assessment and recommendations only; no workspace configuration or workflow changes are made by this document.

## Executive assessment

The main cause of high usage is not one oversized instruction file or one expensive tool. It is the multiplication of a growing context by a large number of model calls during long investigations.

A useful approximation is:

```text
total input usage = sum of the context carried into every model call
```

As an issue progresses, the active context accumulates workspace instructions, loaded skills, ticket material, log-query results, source excerpts, hypotheses, and previous assistant responses. Every subsequent tool decision can carry much of that material again. A task that reaches 150,000–200,000 tokens of context and then performs dozens of additional searches becomes expensive even when each individual search is reasonable.

The highest-leverage improvement is therefore to reduce the number of model round-trips made after the context has become large. The second is to prevent bulky evidence from entering the conversation when a compact result would be sufficient. The third is to introduce explicit investigation checkpoints so completed phases can be represented by a small evidence state instead of their complete working history.

Smaller instructions, cheaper models, deferred tool loading, and careful image handling are all worthwhile, but they address parts of the cost rather than the central multiplier.

## Evidence from the local Codex sessions

A review of the 15 most recent local Codex session records found approximately:

- 42 million total input tokens.
- 95.3% of input tokens recorded as cached input.
- Four tasks with at least 40 model calls accounting for 83.5% of the total input.
- Heavy tasks with 64, 94, and 136 model calls.
- Maximum per-call contexts in the heavy tasks of roughly 169,000–229,000 tokens.
- Total input for individual heavy tasks of roughly 7.6–13.5 million tokens.
- Initial calls before substantial workspace investigation of roughly 13,500–22,900 tokens.

These figures are diagnostic measurements from local session records, not an OpenAI billing statement. Cached and uncached input are recorded separately, and Codex subscription limits do not necessarily map one-to-one to raw token totals. They nevertheless show the shape of the problem clearly: a small number of long, tool-heavy tasks dominate total usage.

The repository contributes a meaningful fixed and semi-fixed floor:

- `.github/copilot-instructions.md` is currently 52,249 bytes.
- Relevant skills range from about 10 KB to 65 KB.
- A Jira or lab investigation commonly needs ticket intake, log-analysis, and code-reference knowledge.

The user is therefore correct that moving everything into separate skills does not eliminate the cost of a real end-to-end investigation. If the same agent eventually loads all relevant skills and retains all previous evidence, progressive disclosure mostly delays the growth. It helps simpler tasks and early investigation stages, but it is not the primary answer for complex tickets.

## Primary finding: model round-trips are the multiplier

The expensive pattern is usually:

```text
search -> model decision -> open result -> model decision -> search again
       -> model decision -> inspect log -> model decision -> inspect code
```

The model does useful work at every step, but each decision is made with a larger accumulated context. The cost is driven less by the final answer than by repeatedly asking the model to decide the next mechanical operation.

The improved pattern should be:

```text
deterministic collection -> compact evidence -> one branch decision
                         -> targeted collection -> conclusion
```

This does not mean searching less carefully. It means separating mechanical evidence collection from semantic reasoning.

## Recommendation 1: create compact investigation checkpoints

Every Jira or lab investigation should have an explicit state artifact after a meaningful phase, especially after log analysis and before deep code tracing.

An investigation checkpoint should contain only:

- The question being answered.
- Order number, ticket key, software revision, and relevant file paths.
- Established facts with evidence pointers.
- Exact timestamps, action numbers, sequence/subsequence rows, and error codes.
- Briefly rejected hypotheses and the evidence that rejected them.
- Remaining hypotheses.
- The next concrete question.

Example:

```markdown
# RB-123 investigation state

Question:
Why did sample 14 stop during movement?

Established facts:
- Failure occurred at 14:32:08.
- Active action was Action20x00.
- Sequence method 103, step 4 supplied LOCATION=SAMPLE.
- Robot communication continued after the timeout.

Evidence pointers:
- customer.glf: 14:31:50–14:32:10
- SubSequence method 103, step 4
- Structure/.../Action20x00.cs

Rejected:
- Emergency stop: no corresponding IO transition.

Next question:
Which condition in Action20x00 produces this timeout?
```

The code phase needs this state. It does not need every normal log line, every unsuccessful filter, or the full ticket-intake history.

A summary written inside the same task improves focus but does not guarantee that older context stops being carried. A genuine context boundary requires application-level compaction, a fresh task, or an isolated agent. Official OpenAI documentation recommends compaction after major milestones in long, tool-heavy workflows rather than after every turn: <https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.2>.

No documented user-controlled “compact now” mechanism was found for the Codex desktop application during this assessment. The reliable workspace-controlled equivalent is a checkpoint file followed by a fresh task or isolated phase that reads the checkpoint and reopens primary evidence only when necessary.

## Recommendation 2: prevent bulky evidence from entering context

Avoiding unnecessary context is better than summarizing it after it has already entered the conversation.

Tooling and workflows should prefer:

- Profiles and generated CSVs over multi-megabyte XML files.
- Log aggregates and narrow time ranges over broad event dumps.
- Exact-symbol source searches over full-directory reads.
- Matching paths and small excerpts over complete source files.
- Attachment manifests over attachment contents unless a file is relevant.
- A bounded number of case-base matches instead of every possible match.

Suggested initial output budgets:

- At most five case-base candidates.
- At most 20–30 log events per query.
- Small source excerpts around exact symbols.
- No complete XML file unless the derived profile/CSV is missing or contradicted.
- No repeated delivery of unchanged evidence.

Where possible, scripts should retain raw output on disk and return only a compact manifest to the model. The raw evidence remains available by path for verification without automatically entering every later call.

## Recommendation 3: batch independent mechanical operations

Several independent read-only operations can be performed in one tool phase and returned as one compact result. Examples include:

- Ticket metadata, attachment inventory, available logs, software revision, and generated profile discovery.
- Exact searches for several action identifiers once the relevant identifiers are known.
- A bounded case-base search across ticket, lab, template, and feature logs.
- File existence, revision, and changed-file checks.

Batching should stop at genuine decision boundaries. Log investigation is often legitimately sequential: a summary determines the relevant category, which determines the time range or filter. Combining dependent steps blindly would reduce diagnostic quality.

For a routine Jira issue, a reasonable soft target is approximately 5–12 model decisions:

1. Classify and refresh the issue.
2. Inspect the compact intake manifest.
3. Run the bounded log-analysis sequence.
4. Write the log-to-code checkpoint.
5. Search the identified sequence/action/code surface.
6. Synthesize and verify the conclusion.

This is a guardrail, not a hard limit. Difficult issues must be allowed additional investigation when the evidence requires it.

## Recommendation 4: use fresh tasks at real topic boundaries

Unrelated work should not continue inside a task that already contains a large investigation.

Recommended rule:

- New ticket or unrelated subject: start a new task.
- Same issue and same investigative phase: continue the current task.
- Same issue but a completed major phase: write a checkpoint and consider a fresh task.
- Short follow-up about the delivered conclusion: remain in the existing task.

Starting a fresh task has its own fixed cost because workspace instructions and relevant skills must be loaded again. It is therefore not always cheaper to split a cohesive investigation arbitrarily. It is, however, normally wasteful to carry one ticket’s complete history into a different ticket or unrelated workspace-maintenance question.

## Recommendation 5: route model and reasoning effort by task type

Model selection reduces the cost of each decision but does not solve excessive decision count or context growth.

Suggested routing:

| Task type | Suggested starting point | Examples |
|---|---|---|
| Deterministic lookup | Luna, low reasoning | Action location, error-code lookup, profile/settings lookup |
| Bounded investigation | Terra, medium reasoning | Ticket intake, configuration comparison, targeted source trace |
| Ambiguous diagnosis or implementation | Sol, high reasoning | Cross-domain root cause, behavioral change, implementation work |

This should be validated with representative tasks before changing project defaults. Run the same known-answer questions in fresh tasks and compare correctness, model calls, input usage, and elapsed time. Escalate when evidence shows that the lighter model is insufficient.

OpenAI describes Luna as suited to lighter, high-volume work with higher usage limits: <https://learn.chatgpt.com/docs/pricing>. Fast mode should not be treated as a usage-saving option; it trades more credits for lower latency.

## Recommendation 6: use subagents only for context isolation

Subagents are not inherently token-saving. Each agent introduces its own instructions, skill loading, tool calls, and reasoning. Parallelizing every search would probably increase total usage.

They can help when an investigation divides into clean evidence domains:

```text
Coordinator
  -> log investigator: ticket + log evidence -> compact finding
  -> code investigator: compact log finding + code -> compact explanation
  -> coordinator: final synthesis
```

The code investigator does not need the complete raw log history, and the log investigator does not need the complete code-reference history. This can reduce accumulated context even though startup context is duplicated.

Use a subagent only when all of the following are true:

- The subtask has a bounded question.
- Its evidence can be summarized without losing traceability.
- The result can be returned in a compact structured form.
- The avoided inherited context is likely larger than the duplicated startup cost.

The correct way to evaluate this is an A/B test on several representative issues, not an assumption that more agents are automatically cheaper.

## Secondary finding: trim the always-on documentation, but do it fourth

The always-on core is large enough to matter, particularly because it is carried repeatedly. The best candidates for reduction are the long SyringeCheck XML walkthrough and the detailed tooling catalogue. Both can retain short routing/execution summaries in the core while detailed examples live in their existing canonical reference homes.

This remains secondary because serious Jira and lab investigations frequently need both log and code knowledge. Moving relevant material into skills will not eliminate it from those cases. The value is mostly:

- A smaller starting floor.
- Cheaper simple questions.
- Fewer irrelevant instructions in specialized phases.
- Lower duplicated startup cost if phase-isolated agents or fresh tasks are introduced.

No instruction restructuring should be undertaken until the higher-leverage workflow changes are measured.

## Brief assessment of the later proposed optimizations

The later suggestions generally reinforce this assessment rather than replace it:

- **MCP surface:** deferred tool loading is important, but current Codex sessions appear to defer the Atlassian tools already. The claimed 24–40k per-call saving must be measured separately for Claude, Copilot, and Codex before changing parity configuration.
- **Clear between unrelated tasks:** strongly supported and incorporated above. The exact percentage is session-specific.
- **Avoid repeated image reads:** a major optimization for presentation workflows. Render and inspect only changed slides; do not repeatedly reopen unchanged full-resolution screenshots. It is not a primary factor in normal Jira/lab diagnosis.
- **Trim the docs:** valid and useful, but lower priority than round-trip reduction, bounded evidence, and phase checkpoints.

## Measurement plan

Changes should be accepted only if they reduce usage without weakening diagnostic quality.

Track per task:

- Model and reasoning effort.
- Number of model calls.
- Initial, mean, and peak input context.
- Total input, cached input, output, and reasoning tokens.
- Number and size of tool results.
- Number of images inspected.
- Whether a checkpoint or fresh-task boundary was used.
- Whether the final diagnosis was correct and sufficiently evidenced.

Use at least three task classes:

1. Simple deterministic lookup.
2. Ordinary Jira or lab investigation involving logs and code.
3. Difficult ambiguous investigation or implementation.

Compare the current workflow with a checkpointed, bounded-output workflow. The primary success measures should be total input per correctly completed task and number of model calls after the context exceeds 100,000 tokens.

## Final recommendation

Do not begin by broadly rewriting skills, removing MCP servers, or spawning many subagents.

First implement visibility and run controlled comparisons. Then prioritize, in order:

1. Reduce model round-trips after context becomes large.
2. Keep raw tool output out of the conversation unless needed.
3. Add compact investigation checkpoints between ticket/log/code phases.
4. Start fresh tasks for unrelated work.
5. Route routine work to lighter models where benchmarks confirm adequate quality.
6. Use subagents selectively as context boundaries.
7. Trim the always-on core after the workflow improvements are proven.

The central conclusion is that Robotics-AI does not primarily have a “bad documentation” problem. It has a long-horizon context-management problem: useful evidence and instructions accumulate, and too many later decisions repeatedly carry the accumulated state. Solving that multiplication should produce a larger and more reliable saving than optimizing any one document or tool catalogue in isolation.

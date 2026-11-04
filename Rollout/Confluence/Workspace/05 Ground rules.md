# Ground rules

The assistant follows these whatever the question is.

- **It reads robot software from the workspace's own copies.** That is always the exact version on SVN, or the exact version a customer sent, never a copy from somewhere else.
- **It never writes to Jira.** For a service ticket it drafts a reply; a person decides whether to post it.
- **Nothing is committed to SVN without a person saying yes**, after seeing exactly what would be committed.
- **Changes are tested before they are committed.** The assistant can change an order's software, build it in the application and test it in emulation, so the person approving the commit sees a tested change. Testing on the real robot stays with the lab.
- **Answers show their evidence.** Facts, conclusions and open questions are kept apart, and an answer says what it is based on and what is still uncertain.
- **Solved problems are written down.** When a problem is solved, the assistant offers to add it to the case base, so the next similar question starts from that answer.

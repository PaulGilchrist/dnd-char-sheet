---
name: e2e-fix-bugs
description: work through bug reports in .opencode/plans, delegating one fix per subagent.
---

You are the primary agent coordinating fixes for bugs found during exploratory QA of dnd-campaign-suite. You do not fix bugs yourself — you dispatch each one to a subagent, one at a time, and track progress.

## Primary agent steps

1. List all bug files in `.opencode/plans/` (not already in `.opencode/plans/resolved/`). These are your work queue.
2. If the queue is empty, report that and stop.
3. For each bug file, one at a time:
   a. Dispatch a subagent with the task described below, passing it the path to that single bug file. Do not give the subagent the full queue or context on other bugs.
   b. Wait for the subagent to return.
   c. Confirm the bug file now has a `## Resolution` section and has been moved to `.opencode/plans/resolved/`. If not, treat the fix as failed — do not proceed to the next bug silently; note the failure and continue to the next item in the queue.
   d. Move to the next bug file. Each subagent should start with clean context — do not carry findings or code changes from one bug into the next.
4. When the queue is empty, report a summary: how many bugs were fixed, how many failed, and the resolved file paths.

## Subagent task (given to each subagent, one bug at a time)

You are fixing a single bug described in the file at: `{bug_file_path}`

### Scope — read this before doing anything

- You may use the Playwright MCP browser tools to reproduce and verify this bug, but ONLY inside the campaign named "test-campaign". Never create, edit, or delete data in any other campaign — those are real production data.
- You may read and edit application source code anywhere in the repo as needed to fix the bug.

### Steps

1. Read the bug file in full.
2. Using the Playwright MCP browser tools, reproduce the bug live in "test-campaign" by
   following the exact steps to reproduce. Confirm you can see the actual behavior described
   before touching any code — if you can't reproduce it this way, say so in the resolution
   notes rather than guessing at a fix. Do not substitute reading the code, running vitest,
   or hitting the API directly for this step — the point is confirming what a real user sees
   in the browser, not just confirming the code path exists.
3. Investigate the actual root cause in the codebase. The bug file's "Likely location" and
   "Suggested fix" are a starting point from black-box testing, not confirmed diagnoses —
   verify them against the real code rather than trusting them outright.
4. Implement the fix.
5. Using the Playwright MCP browser tools, re-run the original repro steps in "test-campaign"
   to confirm the bug no longer occurs in the browser. Also do a quick sanity check that you
   haven't broken adjacent behavior (e.g. re-check a related flow if the fix touched shared
   code).
6. Update the bug file: add a `## Resolution` section documenting what was actually wrong (if different from the original guess), which files changed, and how you verified the fix (repro steps re-run + result).
7. Move the bug file from `.opencode/plans/` to `.opencode/plans/resolved/`.
8. Report back to the primary agent: bug fixed (yes/no), summary of the change, files touched.

If you cannot fix the bug (can't reproduce it, root cause unclear, fix requires a decision only Paul can make), do NOT guess. Update the bug file with your findings, leave it in `.opencode/plans/` (not resolved/), and report back to the primary agent that this one needs human input.
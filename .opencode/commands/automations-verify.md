---
name: automations-verify
description: work through docs/automations-manifest.json, verifying one automation per subagent.
---

You are the primary agent verifying combat automations against docs/automations-manifest.json. You do not verify automations yourself — you dispatch each unverified row to a subagent, one at a time.

## Primary agent steps

1. Read `docs/automations-manifest.json`. Your queue is every row marked "not verified."
2. For each row, one at a time:
    a. Dispatch a subagent with the single automation's details (name, trigger conditions, source location). Do not give it the rest of the manifest.
    b. Wait for it to return.
    c. Immediately after the subagent returns, update that row's status in `docs/automations-manifest.json` on disk: "verified" / "broken — see .opencode/plans/e2e_issues/bug-<slug>.md" / "blocked — <reason>". Write this change to the file right away — do not hold updates in memory and write them all at the end. If this run is interrupted, the file on disk should always reflect every row completed so far.
    d. Move to the next row.
3. When the queue is empty, report totals: verified, broken, blocked.

## Subagent task (given one automation at a time)

You are verifying a single combat automation: {automation_details}

1. In "test-campaign", using Playwright MCP, create (or edit) a character with the exact class/subclass/race/subrace/feat/background combination needed to trigger this automation. Reuse an existing test character if one already has the right combination rather than creating a new one every time.
2. Trigger the situation where the automation should apply (the specific roll, action, or combat state named in its trigger conditions).
3. Confirm the automation's actual behavior matches the "Expected behavior" description from the manifest exactly — not just that something happened, but that what happened matches what the description says should happen (correct value, correct condition, correct timing). If the observed behavior is close but not exactly what the description states, treat that as a bug, not a pass.
4. If it doesn't fire correctly, write a bug file to `.opencode/plans/` following the standard bug report format, citing the source location from the manifest as a starting "Likely location."
5. Report back: verified (pass/fail), and the bug file path if one was created.

Scope rule applies as always: only mutate data inside "test-campaign."
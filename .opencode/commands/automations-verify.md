---
name: automations-verify
description: work through docs/automations-manifest.json, verifying one automation per subagent.
---

You are the primary agent verifying combat automations against docs/automations-manifest.json. You do not verify automations yourself — you dispatch each unverified row to a subagent, one at a time.

## Primary agent steps

1. Read `docs/automations-manifest.json`. Your queue is every row marked "not verified."
2. For each row, one at a time:
    a. Dispatch a subagent with the single automation's details (name, trigger conditions, source location). Do not give it the rest of the manifest. We are in no rush, and memory conservation is more important than speed.
    b. Wait for it to return.
    c. Immediately after the subagent returns, update that row's status in `docs/automations-manifest.json` on disk: "verified" / "broken — see .opencode/plans/bug-<slug>.md" / "blocked — <reason>". Write this change to the file right away — do not hold updates in memory and write them all at the end. If this run is interrupted, the file on disk should always reflect every row completed so far.
    d. Move to the next row.
3. When the queue is empty, report totals: verified, broken, blocked.

## Subagent task (given one automation at a time)

You are verifying a single combat automation: {automation_details}

1. In "test-campaign", using Playwright MCP, create (or edit) a 2024 character (never 5e) with the exact class/subclass/race/subrace/feat/background combination needed to trigger this automation. Reuse an existing test character if one already has the right combination rather than creating a new one every time.
2. Trigger the situation where the automation should apply (the specific roll, action, or combat state named in its trigger conditions).
3. Confirm the automation's actual behavior matches the "Expected behavior" description from the manifest exactly — not just that something happened, but that what happened matches what the description says should happen (correct value, correct condition, correct timing). If the observed behavior is close but not exactly what the description states, treat that as a bug, not a pass.
4. **If the automation FAILS (anything other than exact pass):** You MUST write a bug file to `.opencode/plans/bug-<id>-<slug>.md` using the **Write tool** BEFORE reporting back. The bug file must include these sections: Title, Overview, Expected Behavior, Actual Behavior, Steps to Reproduce, Likely Location (use the manifest source locations), Notes. After writing, **verify the file exists** by reading it back with the Read tool. If the Read tool cannot find the file, write it again immediately. **Do not return until the bug file is confirmed to exist on disk.**
5. **Final checklist before returning:**
   - If pass: return "VERIFIED: PASS" with brief evidence
   - If fail: return "VERIFIED: FAIL" with bug file path, AND confirm the bug file exists on disk via Read tool
   - **If you wrote a bug file but did NOT verify it with Read tool, you have not completed your task**

Scope rule applies as always: only mutate data inside "test-campaign."
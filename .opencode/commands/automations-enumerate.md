---
name: automations-enumerate
description: extract the full list of combat automations from public/data/2024/ into a coverage manifest.
---

You are building a coverage manifest of every combat automation defined in dnd-campaign-suite, sourced directly from `public/data/2024/`.

## What to do

1. Read every JSON file in `public/data/2024/`. Each automation entry should have at minimum: a name, a description (which describes its expected behavior — this is your source of truth for what "correct" looks like), and its trigger conditions (class, subclass, race, subrace, feat, background — whichever apply, however they're represented in the JSON schema).
2. For each automation, extract into `docs/automations-manifest.md` as a table:
   - Name
   - Source file (e.g. `public/data/2024/feats.json`)
   - Trigger conditions (exact class/subclass/race/subrace/feat/background combination needed)
   - Expected behavior — copy the description field directly; this is the spec the verification subagent will test against
   - Verified — initialize every row to "not verified"
3. Cross-reference: search the application source (outside `public/data/2024/`) for where each automation is actually *implemented* (the code that reads this JSON and applies the effect). Add a "Implementation location" column. If you can't find where an automation from the JSON is actually wired up in code, flag it clearly — that itself may indicate a defined-but-unimplemented automation, which is a bug worth reporting on its own.
4. If any automations only apply in combination with another (e.g. two feats that interact, a subclass feature that modifies a racial trait), flag these separately in an "Interactions to test" section.
5. Report the total count found, broken down by source file, and flag if it's meaningfully different from 700.

Do not use Playwright MCP or touch the running app for this — this is a static read of `public/data/2024/` and the implementing source code, not exploration.
---
name: explore-e2e
description: exploring the dnd-campaign-suite web app using the Playwright MCP browser tools.
---

You are exploring the dnd-campaign-suite web app using the Playwright MCP browser tools to learn how it works and find bugs. This is exploratory QA, not scripted testing — click around, fill in forms, try edge cases, and reason about what you observe at each step.

## Scope — read this before doing anything

- You may ONLY create, edit, or delete data inside the campaign named "test-campaign". This is a sandbox campaign that exists specifically for you to use freely.
- Every other campaign in the app is real production data belonging to actual players. You must NOT create, edit, or delete anything inside any campaign other than "test-campaign" — no NPCs, maps, encounters, quests, party members, initiative state, nothing.
- If "test-campaign" doesn't exist yet, create it first and do all your exploration inside it.
- Before performing any create/edit/delete action, confirm from the page context (URL, breadcrumb, campaign selector, page heading, etc.) that you are currently inside "test-campaign". If you can't confirm this with confidence, stop and check rather than guessing.
- Read-only actions (viewing, navigating, opening other campaigns to see how they render) are fine anywhere. Any action that mutates state is restricted to "test-campaign" only.

## Before you start

Check if `docs/app-exploration.md` already exists and read it first, so this run builds on and updates the existing map instead of starting cold and possibly contradicting it. If what you observe in the live app contradicts something in that file, trust the live app — the UI may have changed since it was last written.

## What to do

1. Start at the app's home/dashboard and map out the primary navigation and features.
2. Inside "test-campaign", exercise each major feature end-to-end: create/edit/delete NPCs, quests, encounters, maps, party members, initiative tracking, fog of war, and anything using the real-time SSE party sync — try it from a couple of angles (e.g. rapid edits, empty/invalid inputs, refreshing mid-action) since sync and stateful features are the most likely to break.
3. Pay attention to: console errors, failed network requests, broken navigation, UI states that don't match what you did (stale data, elements that don't update), and anything that silently fails instead of showing feedback.
4. Note anything confusing or inconsistent from a UX standpoint too, not just outright breakage.

## When you find a bug

For each confirmed bug, write a separate markdown file to `.opencode/plans/` named `bug-<short-slug>.md` (e.g. `bug-fog-of-war-not-persisting.md`). Each file should contain:

### Summary
One or two sentences describing the issue.

### Steps to reproduce
Numbered steps, starting from a known state (e.g. "In test-campaign, on the Encounters page..."). Be exact enough that someone unfamiliar with this session could follow them.

### Expected behavior
What should have happened.

### Actual behavior
What happened instead. Include exact error text, console output, or failed network requests (method, URL, status code) if observed.

### Likely location
Your best guess at where in the codebase this originates — component/file names, API route, or SSE event — based on what you observed (network calls, DOM structure, timing). Say clearly if you're guessing vs. confident.

### Suggested fix
A concrete starting point for fixing it: what to check first, what the likely root cause is, and — only if genuinely obvious — a proposed code change. If the fix isn't obvious from black-box testing alone, say what additional investigation (e.g. reading a specific file) would be needed rather than guessing.

### Severity
Broken feature / data integrity risk / minor UX issue — pick one and justify briefly.

Do not attempt to fix the bug yourself during this session — just document it. Keep exploring after logging each one rather than stopping to investigate root cause.

## Before finishing

Write everything you learned to `docs/app-exploration.md` in the repo (create it if it doesn't exist, otherwise update it — don't just append duplicate info). Include:

- A map of the app's main sections/pages and what each does
- Key UI patterns (e.g. how forms validate, how the SSE party sync behaves, how fog of war interactions work)
- Selectors or stable identifiers you found reliable for each major element (role, label, testid) — useful for writing tests later
- Known quirks or gotchas you ran into
- A dated entry (today's date) briefly summarizing this session's findings, with links to the corresponding files in `.opencode/plans/`

## What to report back

Give me a short summary of the session: what you explored, and a list of the bug files you wrote to `.opencode/plans/` (filename + one-line summary of each). Don't restate full bug details here — that's what the files are for.

Don't write any Playwright test code yet — just explore, learn the app's real behavior, and report findings. We'll turn confirmed flows into actual test specs afterward.
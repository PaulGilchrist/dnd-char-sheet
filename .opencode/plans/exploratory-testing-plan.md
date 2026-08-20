# Exploratory Testing Plan — D&D Campaign Suite

**Created:** 2026-08-19  
**Status:** Draft — not started  
**Approach:** Human-like exploration, not scripted testing

---

## Why This Approach

The current batch E2E test plan (`.opencode/commands/test-e2-batch.md`) is rigid and systematic. Each subagent tests one automation in isolation with no learning between runs. This misses bugs that only appear through real gameplay flow, automation interactions, and edge cases a script wouldn't think of.

This plan takes an exploratory approach — learning the game, building understanding, and finding bugs through genuine interaction.

---

## Phase 1: Learn the Game (Day 1)

**Goal:** Build genuine understanding of how the app works before looking for bugs.

- Start the app (`npm run dev`) and navigate the UI
- Create a test campaign and characters
- Go through combat from start to finish
- Explore all major screens: character sheet, combat, encounter builder, map, log
- Learn the flow: how automations trigger, how effects display, how feedback works
- Note: what's intuitive, what's confusing, what's missing

**Output:** A running notes file documenting what I learn, how the app feels, and initial impressions.

---

## Phase 2: Deep-Dive by Feature Area (Days 2-N)

**Goal:** Explore each feature area thoroughly, building on what I've learned.

- Pick a feature area (e.g., spell automations, weapon attacks, conditions, movement)
- Test it in isolation, then in combination with other features
- Try edge cases: multiple targets, conflicting effects, unusual character builds
- Ask: "does this feel right?" — not just "does it fire?"
- Connect automations: what happens when 3+ fire in the same round?

**Output:** Running notes updated with findings, organized by feature area.

---

## Phase 3: Cross-Automation & Regression (Days N+1)

**Goal:** Find bugs that only appear when automations interact.

- Run multiple automations in sequence and simultaneously
- Test the full combat loop with all automations active
- Try edge cases: character death, rage end, concentration break, terrain effects
- Check: does the UI stay consistent? Are players informed?

**Output:** Consolidated bug report with prioritized findings.

---

## What I'll Look For

- Automations that don't fire when they should
- Automations that fire when they shouldn't
- Conflicts between automations
- UI/UX issues: unclear feedback, confusing state, missing indicators
- Edge cases: unusual character builds, terrain, conditions, multi-target
- Performance: lag, spinners, stuck states

## What I Won't Do

- Fix production code (that's a separate task)
- Write automated tests (that's a separate task)
- Test every single automation exhaustively — focus on what matters

## Rules

- One automation per subagent.
- Never load all JSON files.
- Never load all automations.
- Never test more than one automation.
- Only read/write E2E plan files + per‑automation issue files.
- Use recommended selectors.
- Continue until all automations are `\"tested\"`.

---

## Completion Condition

When all automations are `\"tested\"`:
- Write final summary.
- Stop all dispatching.

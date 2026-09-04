# bug-cla-284 — "Reactive Spell" phantom Wizard classFeature row

**Automation:** CLA-284 · Reactive Spell · type `classFeature` · class Wizard
**Verdict:** FAIL (Branch B — misattributed phantom/inert row)
**Date:** 2026-09-03

## Ground truth (grep)

- `rg -i "Reactive Spell"` across `public/data/`, `src/`, `server/` matches ONLY:
  - `public/data/2024/feats.json` — as benefit[2] **inside the War Caster feat**, automation
    `{type:'reaction_spell', trigger:'creature_leaves_reach', casting_time:'1 reaction'}`.
  - `src/components/char-sheet/CharReactions.jsx`, `src/services/automation/handlers/reactions/reactionSpellHandler.{js,test.js}` — the (real) consumer/handler chain.
- **Absent** from `public/data/2024/classes.json` and `public/data/classes.json` — no Wizard (or any class/subclass) feature named "Reactive Spell" exists. The only "reactive" string in 2024 classes.json is `self_and_ally_reactive_movement` (Inspiring Movement, CLA-199 — unrelated).
- 5e `public/data/feats.json` War Caster carries only the prose benefit + `conditional_advantage` automation; the `reaction_spell` automation exists solely in the 2024 feat row.
- No campaign character holds War Caster (`grep "War Caster" public/campaigns/test-campaign/*.json` → zero hits).

## Implementation reality

- The machinery is real and keyed to the **feat benefit's** `reaction_spell` automation type:
  `automationRouter.js:384` / `automation/index.js:336 reaction_spell: handleReactionSpell` →
  `reactionSpellHandler.js handle()` (filters prepared, 1-action, single-target spells; excludes AoE) →
  `CharReactions.jsx:393 handleReactiveSpellCast` → `applyWarCasterReaction` (`warCasterReactions` runtime key + `ability_use` log "War Caster - Reactive Spell").
- The manifest's cited paths (`classFeatureHandler.js` / `classFeatureRouter.js` / `classFeatureInfoBuilder.js`) do not exist (stale, as usual).
- Because no class data emits `reaction_spell`, a Wizard **without** the War Caster feat collects nothing → the CLA-284 row has **zero data source and zero live surface** as a class feature. It is inert by construction.

## Live control probe (branch B, no build performed)

- localhost:5173 → test-campaign → DivinationWizard (registry lv20 Wizard) sheet → Reactions section contains ONLY:
  `Counterspell` (spell reaction), `Projected Ward:` (Abjurer), `Opportunity Attack:` (generic).
- **No "Reactive Spell" row** anywhere on the sheet. Screenshot: `cla-284-wizard-reactions-absent.png`.
- `FT-099` in the manifest is the separate War Caster feat row; note its expectedBehavior currently covers ONLY the Concentration advantage benefit, not the Reactive Spell benefit — the reactive-spell behavior canonically belongs to FT-099's data row in `public/data/2024/feats.json`.

## Cleanup

- Read-only probe; no runtime/change-data/log writes were made → no destructive clear performed (would wipe unrelated campaign state).

## Suggested corrected manifest row (for orchestrator)

Convert CLA-284 from phantom classFeature to feat-benefit scope, or delete as duplicate of FT-099:

- id: keep or fold into FT-099; type: `feat` (or `featBenefit`); class: `War Caster Feat (misattributed — not a Wizard class feature)`
- expectedBehavior: "War Caster feat benefit (2024 feats.json benefits[2], automation type `reaction_spell`, trigger `creature_leaves_reach`): when a creature provokes an Opportunity Attack from you by leaving your reach, use your Reaction to cast a spell at that creature instead of the Opportunity Attack. Spell must have casting time 1 action and target only that creature. Real impl: `automationRouter.js:384` → `handlers/reactions/reactionSpellHandler.js` → `CharReactions.jsx` (`applyWarCasterReaction`); reachable ONLY via the 2024 War Caster feat — no class grants it."
- FT-099 expectedBehavior/triggerConditions should be widened to include the Reactive Spell benefit (currently Concentration-only).

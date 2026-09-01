# Bug — SP-088 Power Word Heal: spell slot never consumed (Words-of-Creation gate bypasses prepareSpellCast)

## Overview
SP-088 Power Word Heal (2024, lv9 Enchantment, Cleric/Bard, `automation.type: power_word_heal`) was cast live on a damaged, Poisoned+Prone ally. The healing half, the condition-end half, and the prone stand-permission flag all work EXACTLY — but the 9th-level spell slot is never consumed. A 9th-level spell is free to cast unlimited times per rest.

## Expected Behavior
Casting Power Word Heal with a lv9 slot consumes it (`spell_slots_level_9` 1→0, with a slot-spend log). Target regains ALL HP (full heal), Charmed/Frightened/Paralyzed/Poisoned/Stunned end, Prone grants a stand Reaction.

## Actual Behavior
- FULL HEAL — WORKS EXACT: runtime `AasimarTest.currentHitPoints` 55 → 101 = `hitPoints` max; heal popup + log `hp_change delta:+46 currentHp:101 isHealing:true note:"Power Word Heal"` (46 = 101−55 exact).
- CONDITION-END — WORKS: `activeConditions` ["poisoned","prone"] → ["prone"]; log `condition action:removed cond:Poisoned reason:"Power Word Heal"`. (Cosmetic noise family SP-077: "removed" logged for all five list conditions even when absent — not the FAIL.)
- PRONE LEG — LIVE: `powerWordHealStandPermission:true` written on target (reaction stand permission flag; `helpers.js:227-232`).
- **SLOT CONSUMPTION — BROKEN**: pre-cast change-data + SpellDetailPopup both show lv9 = 1 slot; after cast `spell_slots_level_9` stays **1** (>30s, past the 10s debounce). No `ability_use` slot-spend log — only two `type:"spell"` cast logs (one from the Skip handler, one from `executeSpellCast` generic logging).

## Steps (reproduced 2026-09-01, test-campaign)
1. Divine_Cleric lv17 Trickery; prepare Power Word Heal via Edit-wizard Spells step (`.list-item-checkbox-trigger` + ✓Save; JSON ground truth). Runtime `spell_slots_level_9` = 1.
2. Initiative view (PC-only combatSummary). Wound AasimarTest to 55 via trusted fill+Enter on `input[aria-label="AasimarTest current HP"]` (runtime 55/101). Add Poisoned, then Prone via card Add→Conditions→Apply (one per cycle).
3. Divine_Cleric initiative-card Target select = AasimarTest (verified `combatSummary.creatures[].targetName`).
4. Cleric sheet → "Power Word Heal" row → SpellDetailPopup ("Slots Remaining: 1 slot") → **Cast Spell** → custom `.sp-overlay` "Words of Creation — Choose Second Target" appears → **Skip** (`sp-dismiss-btn`).
5. Heal applies immediately (popup "Regained 46 HP", HP→101, poisoned removed, powerWordHealStandPermission=true).
6. ≥12s: `spell_slots_level_9` STILL 1. Repeated read >30s: still 1.

## Likely Location
- `src/hooks/combat/useSpellMetamagicGates.js:37-80` — the `isPowerWordSpell` branch (Power Word Heal/Kill force `{ range:'10 ft' }` multiTargetSpread, "Words of Creation — Choose Second Target") calls `setSecondaryTargetModal({...})` and its `onTargetSelected` (:51-64) / `onSkip` (:65-76) invoke `onExecute(spell, mCtx|{})` **without ever awaiting `prepareSpellCast`**. `prepareSpellCast` (spellPreparationService.js slot-decrement branch, used by the generic non-sorcerer path at :117 and by `useConfirmableFlow.js:82`) is the app's only slot consumer — `onExecute`/`castAction` (useSpellCastExecutor.js) never spends slots. Result: effect resolves, slot untouched.
- Same-bypass family: bug-sp-085 (Pass Without Trace custom confirm path bypasses prepareSpellCast — `useSpellMetamagicGates.js:35` early-return + `useCustomHandlers.js:49`).

## Fix sketch
In the Power Word branch, `await prepareSpellCast(spell, metaCtx, { playerName, playerStats, campaignName, isUpcast, upcastLevel, freeCastAuthorized: isFreeCastAuthorized(...) })` BEFORE `onExecute` in BOTH `onTargetSelected` and `onSkip` (or route the modal through `useConfirmableFlow` like the gated touch spells). Also log the slot spend (`ability_use`) as prepareSpellCast does on other paths.

## Notes
- `power_word_heal` is NOT in `automation/index.js` registry — resolution is a spell-name early branch `spellCastService/execution/index.js:188` → `modalSpells.js:3 handlePowerWordHeal` → `execution/helpers.js:159 applyPowerWordHealToTarget`; manifest handler/router/infoBuilder paths stale.
- Core half (full heal + condition-end + prone flag) is E2E-live and exact; only the slot leg is dead → FAIL per "close-but-not-exact = FAIL" (slot consumption explicitly required).
- Post-fix retest is cheap: same setup, one cast, expect `spell_slots_level_9` 1→0 + slot-spend log.
- Caster Divine_Cleric keeps Power Word Heal PERMANENTLY PREPARED for the retest.

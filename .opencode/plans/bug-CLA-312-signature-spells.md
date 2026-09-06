# BUG CLA-312 — Signature Spells (Wizard lv20, 2024) — VERDICT: FAIL

## Feature
2024 PHB lv20 Wizard class feature. Four canonical clauses:
1. Auto-prepared — **PASS**
2. First lv3 cast = free (no slot) — **PASS**
3. Second free cast blocked until Short/Long Rest — **PASS**
4. Higher-level cast must expend a spell slot — **FAIL (CORE)**

## Real implementation chain (manifest paths were stale)
- Data: `public/data/2024/classes.json` Wizard lv20 class_feature `automation:{type:'signature_spells'}`
- Row: automationInfoBuilder/spell.js:174 → automationRouter.js:595 specialActions → CharSpecialActions.jsx clickable row → `signatureSpellsHandler.handle` → `SignatureSpellsModal.jsx` chooser (2 selects, "Confirm Selection") → runtime `SignatureSpells_selection=[s1,s2]`
- Auto-prepare: spellCalc2024.js:437-447 injects `{prepared:'Always'}`
- Free auth: spellPreparationService.js:27-32 (`spellLevel===3 && !used`), key `SignatureSpells_<Spell>_used`
- Consume: spellPreparationService.js:415-419 (decrementFreeCastResource)
- Rest reset: restRules-shortRest.js:103-113 AND restRules-longRest.js:451-456 (both → null)

## LIVE evidence (test-campaign, DivinationWizard lv20 Wizard 2024, signatures Fireball+Slow)
- Clause 1: sheet spells table row `Slow 3 Always Action 120 feet WIS…` + Fireball action row, NEITHER on disk `spells[]` (33 names, verified).
- Clause 2: lv3 cast popup "Free Cast — no spell slot consumed"; change-data lv3 3→3; `SignatureSpells_Fireball_used`→true; log spell lv3 + save-damage 8d6 (Zombie1 28, Zombie2 22, both died).
- Clause 3: re-open popup — NO free-cast hint; paid lv3 cast lv3 3→2, lv4 untouched; second free auth blocked.
- Clause 4 FAIL: after Short Rest re-arm (`SignatureSpells_Fireball_used:null`), opened Fireball popup, selected **Level 4** ("Level 4 9d6 3 slots", AoE modal confirms 9d6), confirmed cast on Zombie 6 → damage resolved 9d6=36 (log spellLevel:4 damageFormula:"9d6") BUT:
  - `spell_slots_level_4: 3 → 3` (NO slot expended — RAW violation)
  - `spell_slots_level_3: 2 → 2`
  - `SignatureSpells_Fireball_used: null → true` (lv3 free-cast burned on a lv4 cast)
- Rest re-arm: Short Rest modal "Complete Short Rest" → both used keys null; Long Rest → both null (plus full slots).

## Root cause
`SpellDetailPopup.jsx:18` computes `freeCastAuthorized` from `spell.level` (base 3) and never re-evaluates on upcast selection; `handleCast` (:124-134) forwards `freeCastAuthorized:true` + `isUpcast/upcastLevel`. `prepareSpellCast` payment ladder (spellPreparationService.js ~:663): `isUpcast && !isFreeCast` slot branch is short-circuited (isFreeCast true) → falls into `else if (isFreeCast)` → decrement stamps used, zero slot payment. `isFreeCastAuthorized`'s own `spellLevel===3` gate never sees the effective level because every popup/gate caller passes base `spell.level` / `attack.spellLevel` (base row level), not the chosen upcast level.
Popup hint "Free Cast — no spell slot consumed" persisting after selecting Level 4 is the same base-level bug, display-side.
Spell Mastery (same helper branch, same RAW payment rule) shares the defect shape — flag for follow-up.

## Secondary wrinkle (separate defect)
AoE picker **Cancel leaks the free-cast**: free-cast consumption fires when SpellDetailPopup "Cast Spell" is pressed (used=true stamped before any target/save), while `SaveAttackAoeModal` Cancel = plain `onClose` (no `incrementFreeCastResource`, no rollbackSpellSlot). Verified live: cancel → `SignatureSpells_Fireball_used:true`, no spell log entry, slots unchanged — free cast silently wasted. `useConfirmableFlow.createSkipHandler` rolls back slots but its rollback path (FREE_CAST_SPELLS list) never covers the signature keys either.

## Minor collateral observed
Slow cast prompt rendered **DC 10** not 17: `console.error [buildSaveDc] Spell "slow" has no saveDc defined` (savePrompt.js:26) — Slow spell automation lacks `saveAbility/saveDc` (CLA-303/SP-097 family convention); unrelated to payment clauses.

## Fix direction (not applied — verification-only task)
Thread effective slot level: popup `handleCast` recompute `isFreeCastAuthorized(name, NAME, effectiveLevel, …)` on upcast selection change (or force `freeCastAuthorized=false` when `selectedUpcastLvl !== spell.level`); callers pass `upcastLevel ?? spell.level` to the sig branch; keep the `spellLevel===3` gate against EFFECTIVE level. Cancel/skip on free-cast flows should rollback signature used keys.

## Cleanup / final registry state
- Admin → Clear Change Data + Clear Campaign Log; verified empty via curl after hard reload.
- DivinationWizard disk JSON untouched (lv20, Wizard/Abjurer, 2024, feats [Magic Initiate], 33 spells, specialActions []). Signature selection lived in change-data only (cleared; re-arm via sheet "Signature Spells:" row chooser).
- Dev server killed.

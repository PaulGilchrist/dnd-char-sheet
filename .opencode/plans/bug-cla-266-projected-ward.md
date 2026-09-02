# Bug: CLA-266 Projected Ward — reaction click can never absorb damage (projectedWardDamage has no writer)

## Overview
CLA-266 "Projected Ward" (Wizard → Abjurer lv6 in THIS app's data, 2024 and 5e) is fully plumbed on the UI side — feature data, collector, router, reaction button, handler, ward pool — but the handler's damage source, the runtime key `projectedWardDamage` on the damaged target, has ZERO production writers. Every click of the reaction therefore dead-ends with "No recent damage detected" and no absorption ever occurs.

## Expected (per data + dispatch manifest)
- Feature: `public/data/2024/classes.json` classes[11] (Wizard) majors "Abjurer" features[3] lv6, automation `{type:'projected_ward', wardTrigger:'ally_damage_taken', range:30, reaction:true}`. Same feature in 5e `public/data/classes.json` Wizard→Abjuration lv6.
- When a visible creature within 30 ft takes damage, warden clicks "Projected Ward:" reaction → Arcane Ward absorbs that damage (rollback-heal model: target HP restored by absorbed amount), ward HP drops by the same amount; overflow past ward 0 stays on the warded creature; `ward_absorbed` + `ability_use` log entries.

## Actual (verified 2026-09-01, test-campaign)
- DivinationWizard lv20 Abjurer (INT +3): Arcane Ward created correctly — `arcaneWardActive=true`, `arcaneWardMax=43` (2×20+3 EXACT), `arcaneWardHp=43`, lv3 slot consumed 3→2, log "created Arcane Ward by casting Dispel Magic (level 3). Ward HP: 43."
- Sheet Reactions shows "Projected Ward: Allies within 30 ft. (Reaction)".
- Wizard initiative-card Target select = HexWarlock; Wight 1 Target = HexWarlock; Wight Necrotic Sword HIT 11 vs AC 9 → 7 slashing + 6 necrotic = 13 damage, HexWarlock HP 73 → 60 (control: full damage lands when reaction not taken — correct).
- Clicked "Projected Ward:" → popup: "Projected Ward: Arcane Ward is active (43/43 HP). No recent damage detected on HexWarlock."
- Post-click: arcaneWardHp 43 (unchanged), HexWarlock currentHitPoints 60 (unchanged), no `ward_absorbed` log, no ability_use entry for the reaction. Absorption NEVER possible.

## Steps
1. test-campaign, convert a Wizard lv6+ to Abjurer (Edit step-7) + prepare any Abjuration spell that reaches executeSpellCast (see Notes; Mage Armor/Circle of Power/Arcane Lock/Nondetection all bypass or get gated) — Dispel Magic works: ward 2×level+INT created.
2. EB-join Wight; set Wight card Target = an ally PC (e.g. HexWarlock); Wight card Target on wizard's own card = same ally.
3. Wight avatar `.mc-overlay` → attack `.mc-dice-link` '+4' (idx 9, idx 0 = initiative) → HIT → Done → ally HP drops by full damage.
4. Wizard sheet Reactions → click "Projected Ward:" → popup "No recent damage detected on <ally>"; ward and ally HP unchanged; no log.

## Likely Location
- Reader: `src/services/automation/handlers/class-wizard/arcaneWardHandler.js:71` — `getRuntimeValue(targetName, 'projectedWardDamage')`; guard at :72 fails ⇒ info popup path :73-83.
- MISSING WRITER: nothing in production code writes `projectedWardDamage` (grep: only the handler + `arcaneWardHandler.test.js` seed it manually). The sibling pattern exists for Bastion of Law: `src/components/char-sheet/useInitiativeEffects.js:275` writes `bastionOfLawLastAttackDamage` on the damaged player — Projected Ward has no equivalent listener/writer (nor does `applyDamage.js` record per-target recent damage for the ally case; :223 only self-absorbs when the WIZARD himself is hit).
- Secondary gaps (same handler flow, untestable until the writer exists): overflow arithmetic (:86-87 computes absorbed/remaining but only from the phantom key), 30-ft range is data-only (never checked by handler), no reaction-economy consumption (no once-per-round flag).

## Steps-to-fix suggestion
Add a `damage-taken` / initiative-effect writer (mirror `bastionOfLawLastAttackDamage` in useInitiativeEffects.js or write in applyDamage player branch) that records `{ rawDamage, damageType, attackerName }` under `projectedWardDamage` on any player target hit while some Abjurer's ward is active, then verify absorbed/rollback-heal + `ward_absorbed` log.

## Notes
- Manifest class attribution "Wizard" is CORRECT for this app (and for actual 2024 PHB Abjuration lv6); the dispatch's "Monk subclass" suspicion matches no data here. Manifest source paths are stale (real files above).
- Ward creation also silently fails for `mage_armor` (handleGenericAutomation `metaCtx:{}` + early `handled:true` return, SP-092 family) and Circle of Power (hardcoded sheet flow `useSpellMetamagicFlow`→`applyCircleOfPowerEffect` bypasses executeSpellCast); Arcane Lock/Nondetection gated by costly-material popups. Dispel Magic is the proven ward-seeding cast.
- Long Rest destroys ward (`restRules-longRest.js:481`); Bonus Action restore row exists (`arcane_ward_bonus_action`), untested this run (blocked behind the same dead reaction half? no — independent, but out of CLA-266 scope).
- Only console error this session was my own 404 fetch probe (`/characters/DivinationWizard`), not app noise.
- Host char LEFT: DivinationWizard lv20 Abjurer, prepared spells gained: Mage Armor, Circle of Power, Arcane Lock, Nondetection, Dispel Magic (PERMANENT, reusable ward-seeder).

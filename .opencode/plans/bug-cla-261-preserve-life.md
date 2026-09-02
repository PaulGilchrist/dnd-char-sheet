# Bug CLA-261 — Preserve Life does not expend Channel Divinity

## Title
Preserve Life (CLA-261, Life Domain Channel Divinity) heals from its pool but never consumes a Channel Divinity charge.

## Overview
Verified E2E in test-campaign 2026-09-01 with Divine_Cleric (Human, Cleric lv17, converted Trickery→Life Domain, 2024 rules). Feature row, target picker, bloodied gate, pool accounting and logs all work; the Channel Divinity cost declared in the data is silently ignored.

## Expected
2024 SRD + `public/data/2024/classes.json` Life Domain features[1]: `automation: { type:'healing_pool', resourceCost:'channel_divinity', poolExpression:'5 * cleric_level', bloodiedOnly:true }`. One activation (one feature use) must expend exactly 1 `channelDivinityCharges` (lv17 max 3 → 3→2).

## Actual
CD stayed 3/3 (sheet + change-data `Divine_Cleric.channelDivinityCharges: 3`) after 3 modal activations that distributed 23 HP total. No gate at 0 charges either.

Evidence (change-data/log, ts 1788295282272+):
- AT 8→18 (+10, pool 85→75), LF 14→15 (+1), LF 10→22 (+12, pool 74→62); total 23 ≤ 85 exact; `healing_pool` log entries match amounts + poolAfter.
- `channelDivinityCharges` 3→3 across all activations.

## Steps to Reproduce
1. Divine_Cleric lv17 Life Domain; set Preserve Life Pool tracker to 85 (0-init pitfall).
2. Stage Wight via Encounter Builder; damage ArcaneTricksterTest/LightfootHalfling to bloodied (or use PC card current-HP input).
3. Sheet → click 'Preserve Life:' row → pick bloodied target → amount → Apply Heal → Done.
4. Observe sheet 'Channel Divinity Charges: 3/3' unchanged; change-data confirms.

## Likely Location
- `src/services/automation/handlers/healing/healingPoolHandler.js` — passes `resourceCost` into the payload but never reads/writes `channelDivinityCharges`.
- `src/components/char-sheet/modals/divine/HealingPoolModal.jsx` — `applyHeal`/`applyBatchCure`/`applyDiceHeal` decrement only the pool tracked resource; no CD branch (contrast: `combatStanceHandler.js:142-161`, `conditionHandler.js:13-31` consume CD correctly).
- No pre-open gate: `conditionHandler` refuses when charges 0; this path does not.

## Notes
- Secondary gaps (accepted-subset vs core, flagged for design): payload `pool` = `auto.pool ?? 0` → CharActions badge renders 'Pool: HP' with no number (modal recomputes max via hard-coded `layOnHandsPoolMax = 5*level` at :36 — coincidentally correct for Preserve Life only). Target picker (`SecondaryTargetModal`) lists ALL in-range creatures incl. Wight + un-bloodied PCs; bloodied restriction enforced only at Apply time (`isTargetBloodied` :107, :383) — and re-gates on repeat applications, blocking a RAW-legal heal that pushes a target back above half mid-distribution (seen: LF stuck at 15/28 after +1 mis-entry; had to re-damage via card HP input). Multi-target RAW 'divide among creatures' is modeled as sequential single-target applications with no re-target button in-session.
- Over-allocation gate: amount input clamps to pool max (90→85); apply clamps `min(healAmount, pool)` — works.
- Native `.value`+input-event does not register in the amount field (healed 1 instead of 12); use trusted `locator.fill()`.
- Manifest paths stale (classFeatureHandler/Router/InfoBuilder do not exist for this feature).

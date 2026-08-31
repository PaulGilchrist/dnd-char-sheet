# Bug CLA-230 — Moonlight Step: advantage never consumed per-attack; restore-uses modal unreachable

## Title
CLA-230 Moonlight Step (2024 Circle of the Moon lv10) — teleport + pool + fallback slot-consume work, but "next attack" advantage is never consumed (persists/stacks all turn), spell-attack path never grants it, and the pool-restore modal has no reachable UI.

## Overview
Verified E2E 2026-08-31 on Wild_Sage_Druid (2024 Druid lv20, Circle of the Moon, WIS 15 base + Acolyte +2 = 17/+3) vs EB-joined Zombie 1 (AC 8, HP 15) in test-campaign via Playwright UI only.
Feature data: `public/data/2024/classes.json` Druid majors[1] (Circle of the Moon) features[3], lv10 — automation[0] `temp_buff/moonlight_step_teleport` (1 bonus action), automation[1] `resource_pool` (`uses_expression:"WIS modifier"`, `recharge_long_rest:"all"`, `conversion:"spell_slot_to_moonlight_step"`, `conversionRate:"level_2_plus"`).

## Expected
Bonus action: teleport 30 ft, Advantage on the NEXT (one) attack roll; pool = WIS mod (min 1), long-rest recharge; normal use consumes NO spell slot; can restore/regain use by expending a level 2+ spell slot.

## Actual
PASS-halves:
- Pool max = 3/3 exact (max(WIS+3,1) via trackedResources.js:266-267; CLA-229 bake-to-1 bug does NOT reproduce here). Long Rest refilled to 3/3 (moonlightStepUses in restRules-constants.js:178).
- 3 teleports decremented pool 3→2→1→0 with ALL spell slots unchanged (change-data verified).
- Teleport popup + `ability_use` log: "used Moonlight Step to teleport 30 ft. Gains Advantage on next attack roll."
- Advantage granted on next WEAPON attack: popup "d20 3, 13 → 13 +5 ... Adv (conditions) ✓ HIT (18 vs AC 8)", log roll mode:"advantage"; campaign targetEffects te `next_attack_advantage`/source Moonlight Step written (tempTeleportHandler.js:107-118).
- 0-uses fallback UI works: "No Moonlight Step uses remaining. Consume a level 2 spell slot to use Moonlight Step?" → Yes → lv2 slot 3→2, teleport resolved, log appended "Expend a level 2 spell slot."

FAIL deviations:
1. Advantage NOT consumed by the one attack. Second Unarmed Strike same turn rolled mode:"advantage" again ("d20 8, 1 → 8"); change-data shows 4x stacked Moonlight Step te (+4x Shared Moonlight te on target) — te only removed by end-of-turn expiration, and each new Moonlight Step appends another. "Next attack roll" is enforced as "all attacks this turn", stacking per use.
2. Spell attack rolls never get the advantage. Starry Wisp +9 clicked immediately after teleport #1 rolled mode:"normal" (single d20) while te was active.
3. Pool-restore modal (`MoonlightStepResourceModal` "Moonlight Step — Restore Uses", opens via `resourcePoolHandler.js` conversion branch) is UNREACHABLE: no clickable row anywhere on the sheet (live query of all `.clickable` matching /Moonlight/ returned only the tracker + the Bonus Actions row). Pool never increases from slot expenditure — the reachable fallback instead spends a slot PER USE (pool stays 0).

## Steps to Reproduce
1. test-campaign, open Wild_Sage_Druid sheet; Long Rest → "Moonlight Step Uses: 3/3".
2. Encounter Builder → Select Zombie → Join Encounter; set Wild_Sage_Druid initiative-card Target = Zombie 1.
3. Bonus Actions "Moonlight Step:" → TeleportModal → Teleport → Done (pool 3→2, slots unchanged).
4. Actions Unarmed Strike "+5" → popup shows 2d20 advantage. Done.
5. Unarmed Strike "+5" AGAIN → popup STILL shows 2d20 advantage ("Adv (conditions)") = deviation 1.
6. (Deviation 2) teleport again, then click Starry Wisp "+9" → popup mode normal/single d20.
7. Teleport until Uses 0/3; click row → "Yes, Consume Slot" → lv2 slot −1 but pool stays 0; no "Restore Uses" modal exists anywhere = deviation 3.

## Likely Location
1. Consumption: `src/services/automation/handlers/class-warlock/tempTeleportHandler.js:107-118` writes te + end-of-turn expiration with no per-attack consume; the only post-attack consumer for `next_attack_advantage` is the VEX variant (`te.vexTarget`) in `src/hooks/combat/attackPostProcessing.js:113/149` and `contextBuilder-sync.js:537-542`; non-vex te survives every attack while `src/components/char-sheet/CharSheet.conditionEffects.js:50-63/193` re-feeds it into conditionAttackMode for EVERY attack. Fix: strip non-vex `next_attack_advantage` te for the attacker in attackPostProcessing after the roll, and skip adding a duplicate te on repeat uses.
2. Spell path: `src/hooks/combat/useActionSpellMetamagic.js:243-281` `handleSpellAttackClick` → `executeSpellCast` uses `buildCtx(attack)` only for `getTargetInfo().name`, discarding `ctx.forcedMode` — spell attack rolls can never see conditionAttackMode/te advantage.
3. Restore modal: `resource_pool` routes to `result.actions` (`automationRouter.js:61`) but the sheet attacks/actions tables render only weapon/spell rows; no feature row dispatches to the resource_pool handler for this feature (CLA-192 multi-automation single-row family, dedupe `rules.js:446-457`). `MoonlightStepResourceModal.jsx` handleConvert (+1 use clamped at max, slot −1) is correct-but-dead code; `tempTeleportHandler` fallback consumes a slot per use without ever increasing `moonlightStepUses`.

## Notes
- Shared Moonlight (Lunar Form lv14 passive) grants `next_attack_advantage` te to the RESOLVED TARGET (the Zombie — an enemy!), not a willing ally — no willing-ally picker; cosmetic/design gap, same resolveTarget pattern as CLA-191 Improved Shadow Step.
- Bonus Actions row + popup + pool decrement core loop works; only the advantage lifecycle and slot-restore surfaces are broken.
- Post-run: zombie removed, Admin Clear Change Data + Clear Campaign Log executed.

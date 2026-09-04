# Bug CLA-281 — Rage damage bonus "+4" rendered in formula but never added to rolled total

## Title
CLA-281 Rage (2024 Barbarian base lv1, combat_stance): Rage Damage flat bonus appears in the damage formula text ("1d8+7 plus 4 [bludgeoning]") but is silently dropped from the rolled total and applied HP damage.

## Overview
Live verification of CLA-281 on DraconicDragon (lv20 Barbarian, 2024, Path of the Wild Heart, Warhammer equipped, AC 10 unarmored, rage_damage=+4 per `public/data/2024/classes.json` lv20 row). Activation, B/P/S resistance, and STR advantage work; the core **Rage Damage** bonus never lands because the dice roller's `' plus '` splitter cannot parse a constant-only part (`"4"`), so `rollExpression` returns null for it and adds nothing. Duration/extension machinery for `until_next_turn_extendable` has zero consumers (no expiry ever fires; rage persists until manually toggled).

## Expected (canonical 2024 Rage)
"When you make an attack using Strength with either a weapon or an Unarmed Strike and deal damage to the target, you gain a bonus to the damage … shown in the Rage Damage column." At lv20 in this dataset the Rage Damage column = **+4**. A Warhammer hit rolling 1d8=3 with damage modifier +7 must deal 3 + 7 + **4** = 14. Rage lasts until the end of your next turn and must end early if Incapacitated or donning Heavy armor; extendable by attacking / forcing a save / Bonus Action; 10-minute cap.

## Actual
- Rage ACTIVE attack (HIT 30 vs AC 11): damage popup `1d8+7 plus 4 [bludgeoning]: 3 +7` → **"10 damage applied — HP: 32 → 22"**. Log entry `{formula:"1d8+7 plus 4 [bludgeoning]", rolls:[3], total:10, modifier:7, finalDamage:10}`. Expected total 14.
- No-rage control (same sheet, same weapon): popup `1d8+7 [bludgeoning]: 1 +7` → 8 applied, HP 22 → 14. Log `{formula:"1d8+7", rolls:[1], total:8, finalDamage:8}`. Modifier baseline identical (+7) → the missing +4 is definitively the rage term.
- Second rage attack (crit, same defect): `{formula:"1d8+7 plus 4", total…}` pattern repeats; every raging hit omits +4.
- Duration: activated Rage, walked initiative 15+ steps past DraconicDragon's card (no attacks) → runtime `activeBuffs` still `["Rage"]`. Should have ended at end of next turn.

## Steps to reproduce
1. Select test-campaign → join EB Thug (AC 11). DraconicDragon lv20 Barbarian qualifies as-is.
2. Sheet → Bonus Actions "Rage:" → popup "Rage activated" (ragePoints 6→5, activeBuffs gains Rage with damageBonusExpression:'rage_damage', resistanceTypes B/P/S).
3. Initiative → DraconicDragon card Target=Thug 1 → sheet Actions "+11" → "Normal Attack" (Reckless prompt, pitfall 20) → Done.
4. Damage popup shows `1d8+7 plus 4 [bludgeoning]` but applied total omits the 4; log `finalDamage = roll + 7`.

## Likely location (real paths)
- `src/services/dice/diceRoller.js:72-86` — `rollExpression` `' plus '` branch: calls `rollExpression(part)` per part; constant part `"4"` fails `parseExpression` regex `^(\d+)?d(\d+)…` at `:35` → returns null → contributes nothing to total. Fix: handle bare-integer parts (or add flat bonus into the `modifier` accumulator).
- `src/services/automation/contextBuilder-sync.js:456` — `autoDamageFormula` builder joins `[primaryDamage, stanceDamageBonus, …].join(' plus ')` producing the constant-only `plus 4` term that the roller then drops. (Manifest's `classFeatureHandler.js` path is stale; stance buff created at `src/services/automation/handlers/combat/combatStanceHandler.js:194-239`.)
- Duration/extension: `until_next_turn_extendable` grep = ZERO consumers in `src/`. No `pendingExpirations` entry is written at activation; no attack/force-save/Bonus-Action extend logic; no early-end on Incapacitated/Heavy-armor (also no Heavy-armor entry gate — `isWearingArmor` in combatStanceHandler.js:21-24 is only consulted for the Wild-Heart Falcon option). Known "residual-flag family" (CLA-175/191/194/251) but here it blocks clause 6 entirely.

## Notes / verified-good clauses (keep after fix)
- Activation EXACT: popup "Rage activated", ragePoints pool decrements (6→5→4→3), activeBuffs `{name:'Rage', effect:'stance', duration:'until_next_turn_extendable', resistanceTypes:['Bludgeoning','Piercing','Slashing'], advantages:['STR checks','STR saves'], damageBonusExpression:'rage_damage', blocksSpellcasting:true}`; re-click toggles "Rage ended" with no refund (CLA-251 precedent).
- Resistance EXACT: raging Thug Mace hits 1d6+2=5 → "2 damage applied (reduced from 5)" and crit 4→2; no-rage control full 7 (HP 161→154). applyDamage.js:166-167 works.
- STR save advantage EXACT: sheet STR Save cell "+11 (Adv)" → popup two d20 `[7,14]` → 14, log `{rolls:[7,14], mode:"advantage"}`. Save cell clickables at CharAbilities (idx 20 in this lineup).
- Concentration/spell block: grep-only PASS path — `blocksSpellcasting:true` consumed at `spellCastService/execution/spellResolution.js:32` (`blockedByBuffs`) and `execution/index.js:51`; not live-testable on this char (`spells[]` empty, no Spells section). Gap note: entering Rage clears only charmed/frightened (`combatStanceHandler.js:254-263`), NOT existing concentration.
- Manifest trigger "Action: undefined" resolves to `casting_time:'1 bonus action'` per canonical + classes.json.
- Cleanup: Thug removed (confirm probe "Thug 1 has 14 HP" = 32−10−8 confirms both attacks), Admin Clear Change Data + Clear Campaign Log accepted; character config unchanged from registry state (Warhammer equipped).

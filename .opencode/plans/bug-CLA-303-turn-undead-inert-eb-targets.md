# BUG CLA-303 — Searing Undead: Turn Undead inert against EB monsters + random damage nulling

**Verdict: FAIL** (2026-09-04)

## Feature
2024 Cleric lv5 base `classes[2].class_levels[4]` Searing Undead:
`{type:'damage_bonus', trigger:'turn_undead_fail', damageExpression:'WIS modifier d8', damageType:'Radiant', extraVs:'undead'}`
Manifest expected: "Whenever you use Turn Undead, roll WIS-mod d8s (min 1d8); each Undead that fails its saving throw against that use takes Radiant damage equal to the roll's total."

## Flow (verified statically + live)
Row `Turn Undead:` (auto `set_condition`) → `conditionHandler.js:73` → `SetConditionModal`
→ `onAllResolved` dispatches `turn-undead-result` (SetConditionModal.jsx:153, only when failedTargets>0)
→ `useInitiativeEffects.js:457` rolls `${wisMod}d8` ONCE per use → `rollDamage` per failed target.

## Bug 1 (BLOCKER): eligibility exact-name match makes the feature inert for all Encounter-Builder undead
`src/components/char-sheet/modals/shared/AreaEffectTargetModalBase.jsx:118-121`:
```js
if (turnUndead) {
  const monster = Array.isArray(monsters) ? monsters.find(m => m.name === c.name) : undefined;
  if (!monster || monster.type.toLowerCase() !== 'undead') return false;
}
```
EB joins create suffixed names ("Zombie 1", "Skeleton 1"); `/data/monsters.json` only has base names
("Zombie" exists, "Zombie 1" does not). Live proof (in-page replication of the filter):
- combatSummary non-players: `["Thug 1","Skeleton 1","Zombie 1"]`
- eligible (exact match, shipped code): `[]`
- eligible if suffix stripped: `["Skeleton 1","Zombie 1"]`

Result: modal opens with **"No undead creatures found within range."**, "Targets selected: 0/0 (max 1)",
Apply button `Turn Undead (0 targets)` permanently `[disabled]` → `turn-undead-result` never fires → searing damage unreachable via the mandated EB setup. Row exists but does nothing = FAIL per verdict policy.
Fix direction: suffix-strip lookup (`getMonsterData` pattern from MN-015 `validateSizeLimit` — monster-data first) or match `c.name.replace(/\s+\d+$/,'')`; also prefer carrying `monsterType` on combatSummary creatures at join time (MN-015 precedent) instead of client-side name lookup.

## Bug 2 (save-gate broken): failed Turn Undead saves can randomly take 0 damage
`useInitiativeEffects.js:474-480` passes `saveDc`+`saveType`+`dcSuccess:false` into `rollDamage`;
target is npc → `handleNpcSaveDamage.js` **re-rolls a fresh save** (`rollSaveForCreature`) and
`computeDamageAfterSave(raw, saveSuccess=true, dcSuccess=false) → 0` (applyDamage.js:73-77).
So the already-resolved Turn Undead save is ignored and a phantom second save decides damage;
it also reads `saveBonuses['WIS']` with the wrong key case (keys are lowercase `wis`) → bonus **+0**.

Live evidence (Divine_Cleric lv17, WIS +3, DC 17):
- Zombie: turn save `1d20+-2 [5]=3 FAIL` → `Searing Undead 3d8 [6,6,6] total 18 final 18` → `hp_change -18` (0/15) ✓ (phantom re-roll happened to fail: "✗ SAVE FAILURE (10 vs DC 17) (d20 10 + 0)")
- Skeleton fail #1: save `1d20+-1 [2]=1 FAIL` → `Searing Undead 3d8 [5,1,3] total 9 **final 0**`, popup "✓ SAVE SUCCESS (17 vs DC 17) (d20 17 + 0)", **NO hp_change** ✗ (RAW violation: failed save must take roll total)
- Skeleton fails #2-#4: `3d8 [1,7,6]=14 → hp -14`, `[4,4,3]=11 → -11`, `[8,5,7]=20 → -20` ✓
- Skeleton save OK (nat 20): `1d20+-1 [20]=19 SAVE OK` → **no searing roll/log** ✓ (trigger gate on success works)

Fix direction: in `useInitiativeEffects` searing context, do NOT pass `saveDc`/`saveType` (plain-damage path) —
the save is already resolved by the modal — or teach `computeDamageAfterSave` that `dcSuccess:false` means
"already-failed → full damage". Also fix the `'WIS'` vs `'wis'` bonus key lookup.

## Secondary gaps (documented)
1. **Channel Divinity not consumed**: `conditionHandler.js:13-14` gates only on `resourceCost`/`cost`/type `channel_divinity`;
   the 2024 Turn Undead automation carries none → `channelDivinityCharges` stayed **3/3 across 6 uses**.
   Feature description itself omits the CD cost (data text for lv2 Channel Divinity pool lists Turn Undead as an effect).
2. **maxTargets = max(1, CHA mod) = 1** (`conditionHandler.js:26-27`) — copied from Abjure Foes; RAW Turn Undead targets all chosen undead in 30 ft. Multi-undead single-use damage impossible.
3. Dead creatures stay eligible (Zombie at 0 hp still selectable).
4. Damage popup shows "HP: 18 → 0" (prev value mislabel vs actual 15 → 0); hp_change itself correct (`delta:-18, currentHp:0, maxHp:15`).
5. Cross-feature noise: HexWarlock Dark One's Blessing temp HP triggered off the searing kill (working as designed, FYI).

## Isolation probe (proves the rest of the chain is live)
Renaming initiative cards to exact "Zombie"/"Skeleton" (renameNpc applies monster data) made them eligible;
damage, conditions, logs all then flowed. So trigger/listener/dice are functional; blockers are name-match + phantom save.

## Config left behind (pre-cleanup state)
Renamed EB cards: Thug, Skeleton (hp 99 manual bump), Zombie (0/15). Cleared via Admin after verification.

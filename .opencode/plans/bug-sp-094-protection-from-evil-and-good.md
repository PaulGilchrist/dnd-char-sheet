# BUG SP-094 — Protection from Evil and Good: attacker-type lookup uses combatSummary `type:'npc'` — disadvantage + charm/fear gate NEVER fire

**Verdict:** FAIL (verified 2026-09-01, test-campaign, live E2E + in-page module probe)

## What works (cast + accounting leg — PASS)

Cast via Divine_Cleric lv17 Life (PfE prepared via Edit-wizard Spells step, persisted to JSON):
- Material gate WORKS: first "Cast Spell" refused with popup "requires a flask of Holy Water worth 25+ GP, which the spell consumes" until `Flask of Holy Water (25 gp)` added to backpack (Edit → Inventory Backpack textarea; note: sidebar `✓ Save` must be clicked INSIDE `.character-creation-wizard-overlay` — the outside click silently no-ops).
- SecondaryTargetModal radio list (all 18 combatants incl. monsters + caster) → select HexWarlock → "Cast Protection from Evil and Good".
- **Slot consumed correctly** (`spell_slots_level_1` 4→3) via the generic `useConfirmableFlow.js:78-90` `createConfirmHandler` → `prepareSpellCast` path. NOT the SP-093 two-stage bypass family.
- **Concentration established + persisted**: `combatSummary` Divine_Cleric `concentration:{spell:'Protection from Evil and Good',dc:0}` (handler `protectionFromEvilAndGoodHandler.js:77-81` writes + `setRuntimeValue('campaign','combatSummary')` — persists, unlike `protectionFromEnergyHandler.js` SP-093).
- Buff + ward data on target: `HexWarlock.activeBuffs` entry `{name:'Protection from Evil and Good', effect:'protection_from_evil_and_good'}` + `HexWarlock.protectionFromEvilAndGoodWardedTypes` = all six types + campaign-level `targetEffects` te `{target:['HexWarlock'],effect:'protection_from_evil_and_good',source:'Divine_Cleric',duration:'concentration'}`.
- Logs: `spell` cast entry + `ability_use` "Divine_Cleric cast Protection from Evil and Good on HexWarlock…".
- Runtime probe: `isProtectionFromEvilAndGoodActive('HexWarlock','test-campaign')` → `true`.

## FAIL 1 (core) — disadvantage never lands on qualifying monster attacks

3 consecutive Wight 1 (Undead) Necrotic Sword attacks vs PROTECTED HexWarlock (AC 9, Target dropdown set on card):
| attack | d20 | total vs AC9 | popup d20 count | log mode |
|---|---|---|---|---|
| 1 | 6 | 10 HIT | ONE d20 | `normal` |
| 2 | 10 | 14 HIT | ONE d20 | `normal` |
| 3 | 15 | 19 HIT | ONE d20 | `normal` |

No two-d20 popup, no `mode:"disadvantage"` log entry — identical to the pre-buff control (single d20 16+4=20 HIT, HP 73→62, 11 dmg).

### Root cause (deterministic, runtime-probed)
EB-joined combatSummary monster entries store `type:'npc'` with the real creature type in `monsterType` (`Wight 1: {type:'npc', monsterType:'Undead'}`). Every PfE attacker-side consumer passes `attackerCreature.type`:
- `src/components/encounter/MonsterCardModal.jsx:271` — `isCreatureWarded(attackerCreature.type, …)` (the monster-attack roll path)
- `src/services/automation/contextBuilder-sync.js:234` — same wrong arg
- `src/hooks/combat/useLoggedDiceRollEventHandlers.js:318` + `src/hooks/combat/handlers/handleNpcSaveDamage.js:336` — `sourceCreatureType: attackerCreature?.type` feeding the charm/fear gate

In-page probe proof:
```
isCreatureWarded('npc','HexWarlock')      → false   ← what consumers actually pass
isCreatureWarded('Undead','HexWarlock')   → true    ← what RAW requires
isProtectionFromEvilAndGoodActive('HexWarlock') → true (buff side is fine)
```
Fix candidates: consumers read `attackerCreature.monsterType || attackerCreature.type`, or `encounterToInitiative` writes real type into `type` (check FS-008/CLA-193-era consumers that DO work — they don't gate on creature type, so this key split has been latent).

## FAIL 2 (charm/fear block unprovable + gate dead on arrival)

Control test Gazer 1 (Aberration) "2. Fear Ray" DC 12 WIS vs HexWarlock BEFORE any buff: `.sp-overlay` prompt → SAVE FAILURE (log `save_result` + `roll` `2. Fear Ray` `saveResult:"failure"`) — yet **NO frightened condition applied, even unprotected** (`HexWarlock.activeConditions` never written). The monster-save→statusEffects supplier never populates `pending.statusEffects`, so `useLoggedDiceRollEventHandlers.js:300` block is dead (matches registry CLA-245 note "charmed never applied to EB monsters (spell-side family)").
Even if it fired, `sourceCreatureType` would be `'npc'` (FAIL 1 key bug) → the `automationImmunities.js:63-68` gate would still not block. The gate code itself is correct in isolation but has zero live path.
GM Add-condition probe: bypasses the gate by design (no `sourceCreatureType` in the Add flow) — not counted as evidence either way (RAW gate is monster-sourced).

## Accounting-side residuals (minor)
- `addExpiration(casterName, targetName, …)` — `HexWarlock.pendingExpirations` stayed `[]`; expiration visibility unverified (moot while core leg is dead).
- te target stored as ARRAY `['HexWarlock']` (confirm passes `result` array straight through `applyProtectionFromEvilAndGood(…, targetName=result)`); badge code handles the array form, but string-vs-array inconsistency is latent.
- Cosmetic: Fear Ray save log bonus field `+5` for a WIS +0 (+0-prof?) target; `save_result` text "rolled 1 +5 = 6 — full success" mislabels failure wording.

## Manifest status
STALE — `src/services/combat/automation/handlers/spellHandler.js`, `routers/spellRouter.js`, `infoBuilders/spellInfoBuilder.js` do not exist. Real chain: `spellGates.js:25/654` → `useConfirmableFlow.createConfirmHandler` → `useSimpleSpellHandlers.js:396` → `automation/handlers/buffs/protectionFromEvilAndGoodHandler.js`.

## Suggested fix scope
1. `MonsterCardModal.jsx:271`, `contextBuilder-sync.js:234`, `useLoggedDiceRollEventHandlers.js:318`, `handleNpcSaveDamage.js:336`: pass `attackerCreature.monsterType || attackerCreature.type` to `isCreatureWarded`/`sourceCreatureType`.
2. (Separate family) monster save attacks: attach `statusEffects` to the save pending so failed saves apply conditions at all — without it the charm/fear half of PfE (and every monster charm/fear source) cannot be exercised E2E.

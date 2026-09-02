# BUG SP-095 — Protection from Poison: spell slot NEVER consumed on cast

**VERIFIED: FAIL** 2026-09-01 (E2E, test-campaign, 2024 ruleset)

## Symptom
Divine_Cleric lv17 casts Protection from Poison (2nd level) on AasimarTest through the real UI flow. All core state effects land correctly, but `spell_slots_level_2` stays **3 → 3** (runtime + disk ground truth `public/campaigns/test-campaign/data/character-change-data.json`). Spell is free, unlimited.

## Real chain (manifest paths stale — no `src/services/combat/automation/handlers/spellHandler.js` etc.)
1. `src/hooks/combat/useSpellMetamagicGates.js:28` `tryGateSpell` → `spellGates.js:34 gateProtectionFromPoison` sets pending `'protectionFromPoison'` and returns TRUE **before** the `prepareSpellCast` call at `useSpellMetamagicGates.js:117` (line 35 `if (handled) return;`).
2. Modal `TargetSpellPopups.jsx:206` → `onTargetSelected` → `handleProtectionFromPoisonConfirm` (`src/hooks/combat/useSpellMetamagicFlow/useCustomHandlers.js:85`).
3. That confirm handler logs the spell + calls `applyProtectionFromPoisonHandler` but **never calls `prepareSpellCast`** — no slot spend anywhere on the confirm path. Its Skip branch calls `rollbackSpellSlot` (`useCustomHandlers.js:132`) which rolls back a slot that was never spent (misleading dead safety net; if any future path does spend before the gate, Skip would inflate slots).
Same family as bug-sp-093 (two-stage bypasses prepareSpellCast). Contrast SP-094 (useConfirmableFlow `createConfirmHandler` consumes EXACTLY).

## Evidence (live, 2026-09-01)
- Spell detail popup pre-cast: "Slots Remaining: 3 slots"; runtime + disk `Divine_Cleric.spell_slots_level_2` = 3 before AND after cast (re-checked minutes later, post-debounce).
- Cast otherwise worked: AasimarTest `activeConditions` poisoned→[], buff `{name:'Protection from Poison', effect:'protection_from_poison', resistanceTypes:['Poison'], saveAdvantageTypes:['poisoned']}` written, campaign `targetEffects` te written, `spell` + `ability_use` logs written.

## Secondary deviation (same cast)
App data (`public/data/2024/spells.json`) says `concentration: false`, duration "1 hour" (matches manifest). The handler nevertheless **imposes concentration**: `protectionFromPoisonHandler.js:104 addConcentration(...)` persists `combatSummary.Divine_Cleric.concentration = {spell:'Protection from Poison', dc:17}` (DC math exact 8+3+6), logs "Concentration, up to 1 hour", te `duration:'concentration'`, expiration keyed `expireOnCreatureName:'AasimarTest'`. Contradicts its own data; also means casting a concentration spell evicts this protection (concentrationService has a dedicated `protection_from_poison` cleanup at concentrationService.js:296 that can never trigger from the spell's own cast state in a non-concentrating design). Decide one: change data to `concentration: true` (RAW) or strip addConcentration.

## What PASSED (so the fix stays narrow)
- (a) Condition-end leg: poisoned cleared immediately + logs. PASS.
- (b) Poisoned-save advantage: badge save rolled TWO d20s `[12,6]→12+2=14 FAIL DC 20`, log `mode:"advantage"`; control same badge pre-cast `[11]` `mode:"normal"`. Consumer `conditionSaveService.js:69-75`. PASS.
- (c) Poison resistance: DivinationWizard (no Poisoner) Poison Spray 4d12 `[1,4,4,10]=19` → applied **9 = floor(19/2)**, popup "reduced from 19", hp_change `resisted:true status:"resistant"`; control vs unprotected HexWarlock same caster `[11,12,7,1]=31` → 31 full. Direct `applyDamageToTarget(cs,'AasimarTest',10,['Poison'])` probe → finalDamage 5 `status:'resistant'`. PASS.
  - NOTE for testers: HexWarlock is a Poisoner feat holder (`feats.json` Potent Poison `ignore_resistance` poison) — its poison ALWAYS bypasses resistance by RAW; never use HexWarlock to test poison resistance halving. Use DivinationWizard (has Poison Spray, no Poisoner).

## Suggested fix
Consume the slot on confirm: in `handleProtectionFromPoisonConfirm` run `prepareSpellCast(pending.spell, {}, { playerName, playerStats, campaignName, ... })` (mirror `useSimpleSpellHandlers.js:496` / SP-094 createConfirmHandler) before applying effects; drop or keep `rollbackSpellSlot` on Skip consistently with the new spend.

## Fixme cleanup state at handoff
- PfP remains PREPARED on Divine_Cleric (retest-ready). Slot key untouched (3/3). AasimarTest PfP buff/te + Poisoned badge live until cleared. HPs drifted (AasimarTest 53, HexWarlock 42) — from test damage.

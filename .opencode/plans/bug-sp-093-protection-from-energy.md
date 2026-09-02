# BUG SP-093 — Protection from Energy: slot never consumed + concentration never established (2026-09-01)

## Verdict: FAIL (resource accounting dead; core resistance half works)

## What WORKS (verified live, test-campaign)
- Prepare: Edit wizard Spells step, tick PfE (un-ticked Grease for 25/25 cap) → JSON ground truth `Protection from Energy` present.
- Cast flow: sheet spell row → "Cast Spell" → SecondaryTargetModal (all 17 combatants radio) → stage `target` → `SingleResistanceSelectionModal` (Acid/Cold/Fire/Lightning/Thunder) → Lightning confirmed.
- State writes (change-data, `HexWarlock`): `activeBuffs:[{name:'Protection from Energy', effect:'damage_resistance', duration:'Concentration, up to 1 hour', resistanceTypes:['Lightning'], sourceCharacter:'DivinationWizard'}]` + `protectionFromEnergyDamageType:'Lightning'` + campaign `pendingExpirations` `{target:'HexWarlock', effects:[{type:'remove_active_buff', buffName:'Protection from Energy'}], appliedRound:1, expiryRounds:null, expireOnCreatureName:null}`.
- Logs: `spell` entry (DivinationWizard→HexWarlock) + `ability_use` "cast Protection from Energy on HexWarlock for Lightning resistance."
- **Resistance consumption EXACT** (Aarakocra Aeromancer EB-joined, Target=HexWarlock AC9, Wind Staff `.mc-dice-link` idx10 "+5", secondary 2d10 Lightning link):

| Cast | Attack | Primary (Bludg) | Secondary 2d10 Lightning | Lightning applied | Total | HexWarlock HP |
|---|---|---|---|---|---|---|
| CONTROL pre-buff | d20 17+5=22 HIT | 1d8(5)+3=8 | (10,2)=12 | **12 (full)** | 20 | 73→53 |
| POST-buff | d20 6+5=11 HIT | 1d8(2)+3=5 | (2,6)=8 | **4 = floor(8/2)** | 9 | 53→44 |

  Popup text: "5 Bludgeoning damage + 4 Lightning damage = 9 total damage". Consumer: `applyDamage.js:161-168` PC branch merges `buff.resistanceTypes` → `:40` floor(d/2).
- Sheet badge: HexWarlock summary "Resistances: Lightning" (renders only on fresh mount — pre-buff computed snapshot stale until reload; cosmetic CLA-237 family).

## FAIL 1 — spell slot NEVER consumed
- Baseline runtime `DivinationWizard.spell_slots_level_3 = 3` (this app's lv20 Wizard max is 3 in 2024 classes.json spellcasting) → after cast still **3**. Two full re-reads ≥12 s apart.
- Root cause: the two-stage confirm `handleProtectionFromEnergyTypeSelect` (`src/hooks/combat/useSpellMetamagicFlow/useTwoStageHandlers.js:95-121`) logs + calls `applyProtectionFromEnergyHandler` directly and **never calls `prepareSpellCast`** — contrast generic gate confirm `useConfirmableFlow.js:82` (createConfirmHandler) which does. Same bypass family as CLA-266 (Circle of Power).
- Aggravating: skip path `handleProtectionFromEnergySkip` (:137) DOES call `rollbackSpellSlot` — skipping an unconsumed cast INFLATES slots above max.

## FAIL 2 — concentration never established
- Persisted combatSummary: `creatures[DivinationWizard].concentration = null` after cast (re-read ≥24 s later). No caster concentration marker, no concentration-save prompt on damage, and the pfE cleanup branch (`concentrationService.js:277-281`, fires on concentration break) is unreachable because no concentration was ever registered.
- Root cause: `protectionFromEnergyHandler.js:82-83` calls `addConcentration(getCombatSummary(campaignName), …)` — `addConcentration` (concentrationService.js:233-241) only **mutates the cached copy**; no `setCombatSummaryCache`/persist POST. Same mutation-without-persist family as CLA-170/CLA-160.
- Consequence: buff effectively permanent unless Admin-cleared (`pendingExpirations.expiryRounds:null`, `expireOnCreatureName:null`; 1-hour duration unmodelled — accepted family CLA-175).
- Eviction bonus test NOT POSSIBLE: no concentration state exists to evict.

## Repro
test-campaign, DivinationWizard lv20 Abjurer (PfE prepared) casts on HexWarlock, Lightning; Aarakocra Aeromancer Wind Staff secondary lightning before/after.

## Manifest
Source paths stale (no `src/services/combat/automation/handlers/spellHandler.js` etc.). Real: spellGates.js:405 gate → TargetSpellPopups.jsx:533/544 → useTwoStageHandlers.js:95 → protectionFromEnergyHandler.js → applyDamage.js:161-168 consumer.

## Fix suggestions
1. In `handleProtectionFromEnergyTypeSelect`, call `prepareSpellCast(pending.spell, {}, {...})` before applying (mirror useConfirmableFlow.js:74-89), and gate the skip rollback accordingly.
2. Persist combatSummary after `addConcentration` (mirror verified concentration writes, e.g. Hunter's Mark spellPreparationService.js:609-618 pattern / persistAndNotify).

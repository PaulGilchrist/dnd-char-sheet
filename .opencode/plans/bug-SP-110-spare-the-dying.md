# SP-110 Spare the Dying — FAIL (2026-09-05)

## Expected (manifest + `public/data/2024/spells.json`)
"Choose a creature within range that has 0 Hit Points and isn't dead. The creature becomes Stable." Cantrip (lv0), Action, 15 ft, Cleric/Druid, no slot.

## Real chain (manifest paths stale)
- Row: `automationRouter.js:467` spare_the_dying → actions.
- Gate: `spellGates.js:354 gateSpareTheDying` (map :701 `'spare the dying'`) → `getCsAndTargets({excludeCaster})` (spellGateHelpers.js:6) → **all non-caster combatants, zero HP/dead filter**.
- Picker: `TargetSpellPopups.jsx:241` SecondaryTargetModal `pendingSpareTheDying` (description text itself contradicts the spell: "rises to 1 HP and gains the Unconscious condition").
- Confirm: `useSimpleSpellHandlers.js:178 handleSpareTheDyingConfirm` → `applySpareTheDying` `spareTheDyingHandler.js:67` (wired `automation/index.js:558 spare_the_dying_apply`).
- Dead alt-picker `handle()` (`spareTheDyingHandler.js:6`, dispatch `automation/index.js:557`) DOES filter hp===0 && !isDead && !undead && !construct — never reached on the sheet cast path (its refusal popup absent from logs; log shows spell log with full 15-target list = gate picker shape).
- App Stable model: `deathSaveRules.isStable(saves)` = 3 successes; UI `DeathSavingThrows.jsx:150 .death-saves-stable` "Stable" div + roll suppression (:66) — rendered ONLY when `currentHitPoints<=0` (`CharHitPoints.jsx:68`).

## LIVE evidence (test-campaign, Divine_Cleric lv17 2024 Life, rig: LightfootHalfling runtime HP 0 dying, Thug 1 cs 32 healthy, Thug 2 cs 0 dead via initiative-card `input.hp-inline-input` trusted fill+Enter)
1. **Picker filter absent (FAIL):** after "Cast Spell", `.sp-overlay` "Spare the Dying" lists ALL 15 non-caster creatures — healthy Thug 1 (cs 32), dead Thug 2 (cs 0), all healthy PCs. Only LightfootHalfling is legally pickable. SP-100 precedent (`isCreatureDead` canonical, `hpModifier.js`) not consulted anywhere in this chain.
2. **Core semantics wrong (FAIL):** cast on dying LightfootHalfling succeeds BUT target heals: popup "LightfootHalfling rose to 1 HP and gained the Unconscious condition."; change-data `LightfootHalfling` = `{currentHitPoints:1, deathSaves:[true,true,true], deathFailures:[false,false,false], activeConditions:["unconscious"], activeConditionMeta{unconscious:{source:Divine_Cleric, reason:Spare the Dying}}}`. Stable stamp IS written (deathSaves [T,T,T] = app canonical stable) but is UNOBSERVABLE and moot: HP>0 suppresses the whole DeathSavingThrows block (no "Stable" marker on sheet — verified on Lightfoot sheet: no `.death-saves-stable`, no Roll-Death-Save button, only badge "Inner Radiance"). RAW/data: target must stay at 0 HP and become Stable; app turns a save-or-stabilize cantrip into healing (spareTheDyingHandler.js:88 `setRuntimeValue(... 'currentHitPoints', 1 ...)`) and paradoxically applies Unconscious at 1 HP. No log ever names "stable"/"stabilized".
3. **0-HP gate blown for monsters (FAIL):** cast on healthy Thug 1 → same success popup + runtime `Thug 1 {currentHitPoints:1, deathSaves:[T,T,T], activeConditions:["unconscious"]}` while `cs.currentHp` stays 32. Re-validate (`spareTheDyingHandler.js:75-77`) reads runtime `currentHitPoints`/`isDead` only; monster HP lives in cs.currentHp and runtime is unset → `undefined||0 === 0` passes. Full success log trio written.
4. **Dead-target gate absent (FAIL):** cast on dead Thug 2 (cs 0) → "Thug 2 rose to 1 HP and gained the Unconscious condition" + runtime writes + condition-applied log; `cs.currentHp` 0 unchanged. No `isCreatureDead` check (SP-100 fix family not extended here).
5. **Healthy PC refused, confirm-time only (partial):** War_Cleric (client-store HP 45) → refusal popup "War_Cleric is no longer a valid target for Spare the Dying." — correct refusal but only AFTER picking; picker still offered it, and the generic `spell` log row is still written for the refused cast (SP-100 confirm-artifact family).
6. **Cantrip slot-free (PASS):** lv1–4 slots 4/3/3/3 unchanged across all four casts; caster excluded from picker.

## Root causes / fix guidance
- `gateSpareTheDying` must filter cs to 0-HP-not-dead (PCs via runtime currentHitPoints===0 && !isDead && !isStable; monsters via cs.currentHp===0 — but note app model says monster-at-0 = DEAD per canonical `isCreatureDead`, so monster picker entries for Spare the Dying need a dying-vs-dead decision the app currently has no representation for; canonicalize on `isCreatureDead` + deathSaves like SP-100). No-valid-target → `automation_info` refusal popup, no fall-through.
- `applySpareTheDying` must NOT write currentHitPoints=1; become Stable = deathSaves [true,true,true] at 0 HP + (app's) Unconscious; use canonical `isCreatureDead(combatSummary,name)` for re-validation (reads cs for monsters), and make it work at PICKER time per SP-100 contract.
- Popup/confirm/log text should match data: "becomes Stable", not "rose to 1 HP".
- The `handle()` alt-picker's filter is correct-shaped — reuse it in the gate or wire the sheet cast through it.

## Cleanup
Admin → Clear Change Data + clear log after run. Divine_Cleric permanently keeps **Spare the Dying** in spells[] (disk 21 entries).

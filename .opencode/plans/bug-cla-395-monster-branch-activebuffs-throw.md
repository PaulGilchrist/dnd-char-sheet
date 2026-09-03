# CLA-395 applyDamage NPC branch throws 'activeBuffs must be an array' — monster concentration saves never roll AND damage never persists (blocks every concentration-breaker test vs EB monsters)

## Overview

In the monster (NPC) branch of `applyDamage.js`, the `dragonConstellationActive` IIFE throws whenever the monster's runtime `activeBuffs` is null. Encounter-Builder monsters NEVER write runtime `activeBuffs` (no UI can seed it), so the throw fires on EVERY damaging hit against a concentrating EB monster. The throw aborts the function before `rollConcentrationSave` and before the `storage.set('combatSummary')` persist, so: the concentration save prompt is never produced, concentration never breaks, and the damage itself does not persist (change-data HP unchanged). This is the long-standing blocker recorded as playbook pitfall #7 and the FT-052 "separate pre-existing bug" note (lines 25, 652) — never assigned a bug file; assigned CLA-395 (next unused) now so it enters the fix queue.

## Canonical / Expected

A damaging hit on a concentrating creature forces a CON save (DC max(10, floor(dmg/2))) and the damage must persist to `combatSummary.creatures[<name>].currentHp` regardless of whether the attacker holds a concentration-breaking feat (Mage Slayer FT-052) or the defender has any activeBuffs. A null/absent `activeBuffs` runtime value is a normal state, not a fatal error.

## Actual (code-inspection evidence, current tree)

- `src/services/rules/combat/applyDamage.js:518-520` (NPC branch, inside `if (creature.concentration && finalDamage > 0)`):
  `const rawActiveBuffs = getRuntimeValue(creature.name, 'activeBuffs'); if (rawActiveBuffs == null || !Array.isArray(rawActiveBuffs)) { console.error(...); throw new Error('activeBuffs must be an array'); }`
- All EB monsters have `activeBuffs === null` in the runtime store (playbook pitfall #7 + FT-052 run: "whenever getRuntimeValue(monster,'activeBuffs') is null (all EB monsters) → concentration save never rolls AND storage.set('combatSummary') is skipped so damage does not persist (change-data HP unchanged, Remove-NPC confirm 'has 82 HP' probe)").
- The Mage Slayer breaker check sits AFTER the throw (`:521-545` region, `hasConcentrationBreaker` + `rollConcentrationSave` at :545), so it is unreachable too.
- Contrast PC branch (:500-515 region) performs the same dragon-constellation/relentless checks without the hard throw pattern biting (players have runtime `activeBuffs` written by sheet mount).

## Steps to Reproduce

1. EB-join any monster; force it to concentrate (GM Add → Concentration tab on its initiative card).
2. Any PC hits it with a weapon attack → Done.
3. Console: `[applyDamage] activeBuffs is not an array` + uncaught `Error: activeBuffs must be an array`; no `.cnp-overlay`/concentration prompt queued (`concentrationPrompt-<Monster>` absent from change-data); Remove-NPC confirm shows the HP unchanged by the hit.

## Likely Location

- `src/services/rules/combat/applyDamage.js:518-520` — null-safe read (`const activeBuffs = Array.isArray(rawActiveBuffs) ? rawActiveBuffs : [];`, the pattern mandated by pitfall #8/CLA-198), no throw.

## Notes

- Not a feature-row bug; plumbing. Every manifest verification that needs concentration-break evidence on monsters (FT-052 monster path, Doomfist-style auto-concentration-break automations) currently has to fall back to PC targets (playbook FT-052 recipe).
- Same defect family as CLA-198 (turn-start loop throws on never-written keys) and CLA-266 (missing writers) — hard throws on absent runtime keys are this app's most common crash class.

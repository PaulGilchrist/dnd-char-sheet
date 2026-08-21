# Bug Report: SP-016 Blade Ward — Spell Cast Fails (handler receives null playerStats)

## Overview

Casting **Blade Ward** (2024 cantrip, automation type `blade_ward`) fails entirely.
The automation handler `handleBladeWard` is dispatched through
`handleGenericAutomation` in the spell-cast execution pipeline, which passes
`null` for every context argument (`playerStats`, `campaignName`, etc.). The
handler immediately reads `playerStats.name` and throws a `TypeError`, so:

- No `bane_penalty` targetEffect is created on the caster.
- No activation entry is written to the campaign log.
- The UI shows a "Failed to execute Blade Ward" toast.
- Consequently, the expected behavior ("attacker subtracts 1d4 from attack
  rolls against you") can never be observed through normal play.

## Expected Behavior

Whenever a creature makes an attack roll against the caster before the spell
ends, the attacker subtracts 1d4 from the attack roll. Casting the spell
should succeed, add a `bane_penalty` targetEffect (displayLabel "Blade Ward",
source = caster) targeting the caster, log the activation, and show the
activation popup.

## Actual Behavior

Cast fails with a console error and an error popup:

```
[ERROR] [automation] Handler blade_ward/undefined failed:
TypeError: Cannot read properties of null (reading 'name')
    at handle (.../handlers/buffs/bladeWardHandler.js:7:33)
    at executeHandler (.../automation/index.js:660)
    at handleGenericAutomation (
        .../spellCastService/execution/triggerSpells.js:554)
```

UI toast: **"Failed to execute Blade Ward"**.

No targetEffect is stored; attackers get no −1d4 penalty.

## Steps to Reproduce

1. Start dev servers (`npm run dev`), open http://localhost:5173/.
2. Select campaign **test-campaign**.
3. Select character **TestDruid** (2024 rules, Druid; knows Blade Ward).
   Any 2024 Bard/Sorcerer/Warlock/Wizard with Blade Ward reproduces this.
4. Click the **Blade Ward** row in the Spells table → click **Cast Spell**.
5. Observe the "Failed to execute Blade Ward" toast and the TypeError in the
   browser console. Check the initiative/campaign state: no Blade Ward /
   bane_penalty effect exists on TestDruid.

## Likely Location

**Primary:** `handleGenericAutomation` in
`src/services/rules/spells/spellCastService/execution/triggerSpells.js`
(line ~442–458). It builds the action but calls:

```js
const handlerResult = await executeHandler(action, null, null, null, null);
```

It should pass the real `playerStats`, `campaignName`, `mapName`, and
`characters` (as the sibling handlers like `handleHeroism`,
`handleLongstrider`, `handleSpareTheDying` do) — note
`handleGenericAutomation` doesn't even receive them as parameters today.

**Secondary (defensive):**
`src/services/automation/handlers/buffs/bladeWardHandler.js:6-9` dereferences
`action.name` / `playerStats.name` without guarding against missing context;
other handlers reached via this same generic path may have the same exposure.

Note the dispatch chain: spell cast →
`spellCastService/execution/index.js` (`executeSpellCast`) →
`triggerSpells.handleGenericAutomation` → `automation/index.js`
(`executeHandler` → registry key `blade_ward` → `bladeWardHandler.handle`).

## Notes

- The attack-roll consumption side looks implemented and correct in isolation:
  `src/hooks/combat/d20RollComputation.js:66-82` applies a −1d4
  (`bane_penalty`, honoring `displayLabel`) to any attacker's attack roll when
  either the attacker has a `bane_penalty` effect or the *target* has a
  self-sourced `bane_penalty` (which is exactly what Blade Ward creates). This
  code could not be exercised end-to-end because the effect can never be
  created via casting.
- Unit tests for `bladeWardHandler`
  (`src/services/automation/handlers/buffs/bladeWardHandler.test.js`) all pass
  because they call `handle()` directly with valid `playerStats`/campaign
  arguments; they don't cover the spell-cast integration path where the args
  are `null`.
- Verified in test-campaign only; no data outside test-campaign was modified.

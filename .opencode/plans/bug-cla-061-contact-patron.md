# Bug: CLA-061 Contact Patron - Automation Not Working

## Overview

The Warlock 9th-level feature "Contact Patron" (2024 ruleset) has two automation components that are both failing:

1. **`free_spell`** - Should allow casting Contact Other Plane without expending a spell slot (1 use, recharge on Long Rest)
2. **`passive_rule` with `effect: contact_patron_auto_save`** - Should auto-succeed on the spell's saving throw

Both features are defined in `public/data/2024/classes.json` but neither is functioning in practice.

## Expected Behavior

Per the feature description: "You always have the Contact Other Plane spell prepared. With this feature, you can cast the spell without expending a spell slot to contact your patron, and you automatically succeed on the spell's saving throw. Once you cast the spell with this feature, you can't do so in this way again until you finish a Long Rest."

1. Contact Other Plane should appear in the spell list (currently working)
2. The spell dialog should show "Free Cast — no spell slot consumed" when casting via Contact Patron
3. The spell should NOT expend a spell slot when cast this way
4. When Contact Other Plane targets the warlock (self-targeting), the saving throw should auto-succeed

## Actual Behavior

1. Contact Other Plane IS in the spell list (working)
2. The spell dialog showed "Slots Remaining: 2 slots" with NO "Free Cast" indicator
3. The spell was cast expending a regular spell slot (not a free cast)
4. No auto-save was triggered - the damage roll of 18 (6d6) was displayed but the save was not auto-succeeded

## Steps to Reproduce

1. Load the "ContactPatronWarlock" character in "test-campaign" (Level 9 Warlock, Great Old One Patron, 2024 ruleset)
2. Click on "Contact Other Plane" in the spell list
3. Observe the spell dialog shows "Slots Remaining: 2 slots" (not "Free Cast")
4. Click "Cast Spell"
5. Observe the spell is cast using a regular spell slot, no free cast indicator, and no auto-save

## Likely Location

**Primary bug - `contact_patron_auto_save` not collected:**

The `passive_rule` type has NO handler in `src/services/combat/automation/automationInfoBuilder/passive.js`. The `passiveHandlers` only has `passive_buff`, not `passive_rule`. When `collectAutomationFromFeatures` encounters the `passive_rule` with `effect: contact_patron_auto_save`, it falls through to the default handler at line 84 of `automationCollector.js`:

```javascript
const info = buildAttackInfo({ ...feature, automation: auto }, playerStats)
if (!info) continue
```

Since `buildAttackInfo` dispatches on `auto.type` which is `'passive_rule'`, and there is no `'passive_rule'` handler in the DISPATCH map, it returns `null`. The `continue` skips this automation entirely, so `contact_patron_auto_save` is NEVER added to `playerStats.automation.passives`.

**Fix:** Add a `'passive_rule'` handler to `passive.js` that handles unknown `passive_rule` effects by adding them to the passives array, OR add a specific handler for `'contact_patron_auto_save'` in `passive.js`.

**Secondary issue - `free_spell` not preventing slot expenditure:**

The `free_spell` handler in `spell.js` creates an info object and routes it to `playerStats.automation.actions`. However, the spell dialog's "Slots Remaining" display (line 136-148 of `SpellDetailPopup.jsx`) does not account for free casts, and the "Free Cast" message (line 269-271) was not displayed. This suggests `isFreeCastAuthorized` in `spellPreparationService.js` may not be finding the free_spell entry, or the runtime value for the free cast count is not being initialized correctly.

The `isFreeCastAuthorized` function (line 8-99 of `spellPreparationService.js`) checks `playerStats?.automation?.actions` for `free_spell` entries. The Contact Patron feature's free_spell entry should match at lines 69-73:

```javascript
const spells = Array.isArray(entry.spell) ? entry.spell : [entry.spell];
if (spells.includes(spellName)) {
  const freeCastCountKey = `_${entry.name.replace(/\s+/g, '_')}_freeCastCount`;
  const count = Number(getRuntimeValue(playerName, freeCastCountKey) ?? entry.usesMax);
  if (count > 0) return true;
}
```

This should return true since `entry.usesMax` defaults to 1. The issue may be that `playerStats.automation.actions` does not contain the Contact Patron entry because the `free_spell` routing is broken, or the `playerStats` object passed to the spell dialog doesn't have automation populated.

## Notes

- The `contact_patron_auto_save` passive IS checked in `handlePlayerSaveDamage.js` line 121-123, but since it's never collected into `playerStats.automation.passives`, the check always fails.
- The test file `useLoggedDiceRollDamage.auto-save.test.js` manually sets up the passive in `playerStats.automation.passives`, so the tests pass but the real automation doesn't.
- The `free_spell` handler in `spell.js` line 4-28 correctly builds the info object with `type: 'free_spell'` and all required fields.
- The `free_spell` type IS routed to `result.actions` in `automationRouter.js` line 46-55.
- Both issues stem from the automation collection/processing pipeline, not the data definition.

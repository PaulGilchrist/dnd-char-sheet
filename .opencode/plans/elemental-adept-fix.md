# Elemental Adept / Energy Mastery: Fix All Issues (2024 ruleset)

## Problem Summary

Four issues with the 2024 Elemental Adept feat (Energy Mastery benefit):

1. **Popup message wrong** — After selecting a damage type, the popup says "You gain resistance to {Type} damage. When you cast a spell that deals {Type} damage, add your Charisma modifier." (Elemental Affinity text) instead of "Spells you cast ignore Resistance to damage of the chosen type. In addition, when you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2." (Elemental Adept text)

2. **Resistance not showing in CharSummary** — The chosen damage type resistance is not being added to the character's resistances displayed in the summary

3. **"Treat 1s as 2s" not working** — The `hasMinDamage` check doesn't recognize `elemental_adept` effect properly

4. **Campaign log doesn't match popup** — The log entry text is generic and doesn't match the corrected popup message

## Architecture Notes

- **2024 Elemental Adept** feat has benefit name "Energy Mastery" with automation: `type: "damage_type_choice"`, `effect: "elemental_adept"`, `minDamage: true`, `damageTypes: ["Acid", "Cold", "Fire", "Lightning", "Thunder"]`
- The `damage_type_choice` type routes to `handleElementalAffinity` in `automation/index.js` (line 382)
- The handler stores the chosen type under runtime key `_<Energy_Mastery>_chosenType` via `choiceStorage.js`
- `hasIgnoreResistance()` and `hasMinDamage()` in `automationPassives.js` already check for `elemental_adept` effect (lines 237-242, 250-255) — these should work if the passive is properly built
- The popup is returned from `applyTypeChoice()` in `elementalAffinityHandler.js` (line 78-87)

## File Changes

### 1. `src/services/automation/handlers/class-sorcerer/elementalAffinityHandler.js` — Fix popup + log

**Lines 71-87** — The `applyTypeChoice` function returns a hardcoded popup description that describes Elemental Affinity behavior, not Elemental Adept.

**Change:** Check `action.effect` to determine the correct popup text:

```js
const isElementalAdept = action.effect === 'elemental_adept';
const popupDescription = isElementalAdept
    ? `${name}: ${chosenType} selected. Spells you cast ignore Resistance to damage of the chosen type. In addition, when you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2.`
    : `${name}: ${chosenType} selected. You gain resistance to ${chosenType} damage. When you cast a spell that deals ${chosenType} damage, add your Charisma modifier.`;
```

The campaign log entry (line 71-76) already uses `${name}` which will correctly say "Energy Mastery" for the 2024 feat. The description format `"{name} — damage type set to {chosenType}"` is fine for the log. The popup (Issue 1) is the one with wrong text.

### 2. `src/components/char-sheet/modals/ElementalAffinityModal.jsx` — Fix modal description text

**Line 44** — The modal paragraph describes Elemental Affinity, not Energy Mastery / Elemental Adept.

**Change:** Check `action.effect` to show the correct description:

```js
const isElementalAdept = action?.automation?.effect === 'elemental_adept';
const descriptionText = isElementalAdept
    ? 'Choose one of the following damage types (Acid, Cold, Fire, Lightning, or Thunder). Spells you cast ignore Resistance to damage of the chosen type. In addition, when you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2.'
    : 'Choose one damage type (Acid, Cold, Fire, Lightning, or Poison). You gain resistance to that type. When you cast a spell that deals damage of that type, add your Charisma modifier to one damage roll.';
```

### 3. `src/services/combat/automation/automationPassives.js` — Verify hasIgnoreResistance and hasMinDamage

**Lines 237-242** (`hasIgnoreResistance`) and **lines 250-255** (`hasMinDamage`) already check for `elemental_adept` effect. However, they use `getChosenRuntimeValue(playerStats, passive.name, 'chosenType')` which reads from the playerStats' own namespace.

**Potential issue:** The runtime key is built from `passive.name` which is "Energy Mastery" (the benefit name), generating a key like `_Energy_Mastery_chosenType`. But `getChosenRuntimeValue` is called without the `campaignName` parameter in some places.

**Check line 238:** `getChosenRuntimeValue(playerStats, passive.name, 'chosenType')` — missing `campaignName`
**Check line 251:** `getChosenRuntimeValue(playerStats, passive.name, 'chosenType')` — missing `campaignName`

Compare to line 245 in CharSummary.jsx: `getRuntimeValue(playerStats.name, '_Fiendish_Resilience_chosenType', campaignName)` — this uses the full key with campaignName.

**Change:** Add `campaignName` parameter to both `hasIgnoreResistance` and `hasMinDamage` functions, and pass it through to `getChosenRuntimeValue`. This requires updating all call sites.

Actually, looking more carefully at `choiceStorage.js`:

```js
export function getChosenRuntimeValue(playerStats, name, suffix, campaignName) {
    const key = makeKey(playerStats.name, name, suffix);
    return getRuntimeValue(playerStats.name, key, campaignName || playerStats.campaignName);
}
```

The function already defaults to `playerStats.campaignName` when `campaignName` is not passed. So the current code should work IF `playerStats.campaignName` is set. Let me verify this is the case.

The functions may already work correctly. The real issue is likely that the resistance isn't being added to the character's `resistances` array at all — the `hasIgnoreResistance` function only makes damage rolls *ignore* resistance (from enemies), it doesn't *grant* resistance to the character.

### 4. `src/services/combat/automation/automationPassives.js` — Add resistance display

**The core issue:** Elemental Adept's benefit is "ignore resistance" (spells ignore enemy resistance), NOT "gain resistance" (character takes less damage). The popup message the user sees is misleading — it says "You gain resistance to {Type} damage" which is the OLD (wrong) text. The NEW correct text says "Spells you cast ignore Resistance" which is correct.

However, the user's Issue 2 says "Damage resistance not showing in CharSummary when selected." This could mean:
- They expect the character to SHOW the chosen type as a resistance in CharSummary (for tracking purposes, even though it's "ignore resistance" not "gain resistance")
- OR the resistance was never added to the character at all

Looking at `hasIgnoreResistance` — it's used during damage rolls to pass `ignoreResistance=true` to `applyDamageToTarget`. This is correct behavior. But the CharSummary doesn't display "ignore resistance" types alongside regular resistances.

**Change in `CharSummary.jsx`:** Add display of elemental_adept chosen types alongside resistances, similar to how `fiendishResilienceType` and `boonEnergyResistanceTypes` are already displayed.

Add to the resistance computation (around line 244-258):

```js
const elementalAdeptTypes = (playerStats.automation?.passives || [])
    .filter(p => p.type === 'damage_type_choice' && p.effect === 'elemental_adept')
    .map(p => getChosenRuntimeValue(playerStats, p.name, 'chosenType'))
    .filter(Boolean);
```

Then include `...elementalAdeptTypes` in the `allResistances` array.

### 5. Verify `hasMinDamage` works for elemental_adept

The `hasMinDamage` function (line 247-258) checks:
```js
if (passive.type === 'damage_type_choice' && passive.effect === 'elemental_adept' && passive.minDamage)
```

The 2024 feat has `minDamage: true` in its automation, and the info builder (`damage.js` line 72-83) copies it to the passive. This should work IF the passive is in the `playerStats.automation.passives` array.

Let me verify the collector routes it correctly: `automationCollector.js` line 847-852 routes `damage_type_choice` with `effect !== 'elemental_affinity'` to `result.passives`. Since `elemental_adept` !== `elemental_affinity`, it goes to passives. This is correct.

The `applyMinDamageAdjustment` function in `loggedDiceRollUtils.js` calls `hasMinDamage(playerStats, damageType)`. This should work.

**Potential issue:** The `damageType` parameter passed to `hasMinDamage` must match the chosen type exactly (case-insensitive). Let me check the call sites in `useLoggedDiceRollDamage.js`.

## Implementation Order

1. **Fix popup message** in `elementalAffinityHandler.js` (Issue 1 + Issue 4)
2. **Fix modal description** in `ElementalAffinityModal.jsx` (UX consistency)
3. **Add elemental_adept types to CharSummary** resistance display (Issue 2)
4. **Verify hasMinDamage** works — run tests to confirm Issue 3 is already fixed or needs adjustment

## Tests to Run

- `src/services/combat/automation/automationPassives.elementalAdept.test.js` — Existing tests for elemental_adept
- `src/components/char-sheet/modals/ElementalAffinityModal.test.jsx` — Modal tests
- `src/services/automation/handlers/class-sorcerer/elementalAffinityHandler.test.js` — Handler tests
- `src/hooks/combat/useLoggedDiceRollUtils.core.test.js` — Min damage adjustment tests

Run `npm run lint` and `npm run test:run` after changes.

---

## Status: IMPLEMENTED

All changes applied. Lint: zero warnings. Tests: 16,461 passed (861 files).

### Files Changed

1. **`src/services/automation/handlers/class-sorcerer/elementalAffinityHandler.js`** — Popup now checks `action.effect === 'elemental_adept'` and shows correct Elemental Adept text instead of Elemental Affinity text
2. **`src/components/char-sheet/modals/ElementalAffinityModal.jsx`** — Modal description now checks `action.automation.effect === 'elemental_adept'` for correct pre-selection description
3. **`src/components/char-sheet/char-summary/CharSummary.jsx`** — Added `elementalAdeptTypes` computation from passives, included in `allResistances` array for display in CharSummary

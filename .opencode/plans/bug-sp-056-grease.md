# Bug: SP-056 Grease - Cannot Verify (No Valid Caster)

## Summary
The automation code for Grease (`save_only` type, 2024 ruleset) appears correctly implemented, but verification **cannot proceed** because none of the specified characters can cast Grease.

## Root Cause

**Spell availability mismatch:** The task specifies Wild_Sage_Druid (level 9 Druid) or Bard_Spellcaster (level 9 Bard), but Grease is only available to **Sorcerer** and **Wizard** in the 2024 ruleset.

### Spell Data (`public/data/2024/spells.json`)
```json
{
  "index": "grease",
  "name": "Grease",
  "level": 1,
  "classes": ["Sorcerer", "Wizard"],
  "automation": {
    "type": "save_only",
    "saveType": "DEX",
    "effects": { "fail": [{ "type": "prone", "condition": "prone" }] }
  }
}
```

### Character Registry Verification

| Character | Ruleset | Class | Has Grease? |
|-----------|---------|-------|-------------|
| Wild_Sage_Druid | 2024 | Druid | **NO** — Druid not in Grease classes |
| Bard_Spellcaster | 2024 | Bard (College of Lore) | **NO** — Bard not in Grease classes |
| DivinationWizard | 2024 | Wizard (level 14) | **Can learn** — Wizard IS in Grease classes, but spell not in character's list |
| DraconicSorcerer | 2024 | Sorcerer (level 6) | **Can learn** — Sorcerer IS in Grease classes, but spell not in character's list |

### Druid/Bard Spell List Verification
```
2024 Druid grease spells: []
2024 Bard grease spells: []
2024 Circle of the Land grease spells: []
```

## What Would Be Needed to Verify

1. **Add Grease to a valid caster's spell list** — e.g., add "Grease" to DivinationWizard's `spells` array (2024 Wizard), or DraconicSorcerer's `spells` array (2024 Sorcerer).
2. **Add a monster via Encounter Builder** — e.g., "aarakocra-aeromancer".
3. **Cast Grease** targeting the monster's position.
4. **Verify** the `aoeCondition` modal appears, and on failed DEX save, the prone condition is applied.

## Automation Code Review (Correct)

The automation implementation itself is correct:

- **Router** (`automationRouter.js:4`): `save_only` → routed to `actions` list ✓
- **InfoBuilder** (`save.js:112-124`): `save_only` handler extracts `saveType`, `saveDc`, `conditionInflicted` ✓
- **Spell casting** (`savePath.js:71-95`): `isConditionOnlyAoe` detection → `aoeCondition` modal with `includeCaster` for grease ✓
- **Modal** (`AOEConditionModal.jsx:59-73`): `applyConditionsToTarget` correctly adds prone to `activeConditions` on fail ✓
- **NPC auto-resolve** (`AOEConditionModal.jsx:98-205`): NPCs auto-roll saves; PCs get save prompt ✓

## Conclusion

**VERIFIED: FAIL** — The automation implementation is correct, but the specified characters (Wild_Sage_Druid, Bard_Spellcaster) cannot cast Grease in the 2024 ruleset. No valid caster has Grease in their spell list. The bug file path is: `.opencode/plans/bug-sp-056-grease.md`

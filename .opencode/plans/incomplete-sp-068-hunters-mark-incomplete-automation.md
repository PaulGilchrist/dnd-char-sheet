# Bug: SP-068 Hunter's Mark — INCOMPLETE

## Test Details
- **Automation ID:** SP-068
- **Spell Name:** Hunter's Mark
- **Type:** Spell (Ranger, Level 1, Concentration)
- **Handler:** `src/services/combat/automation/handlers/spellHandler.js`
- **Router:** `src/services/combat/automation/routers/spellRouter.js`
- **InfoBuilder:** `src/services/combat/automation/infoBuilders/spellInfoBuilder.js`
- **Test Character:** Bard_Spellcaster (Level 9, Bard/College of Lore, 2024 ruleset)
- **Test Target:** Aarakocra Aeromancer (active in initiative)
- **Campaign:** test-campaign

## Outcome: INCOMPLETE

## Findings

### Issue 1: Character Does Not Have Hunter's Mark Spell

The test character **Bard_Spellcaster** does not have Hunter's Mark in their spell list.

**Actual spell list** (from `public/campaigns/test-campaign/Bard_Spellcaster.json`):
```json
"spells": ["Healing Word", "Vicious Mockery", "Mage Hand", "Charm Person", "Hex"]
```

Hunter's Mark is a **Ranger-only** spell (per `public/data/2024/spells.json` classes field). The Bard class does not have access to it. The character has **Hex** (SP-064) instead, which is a Warlock spell but apparently available to this Bard via some feature.

**Verification:** Confirmed via Playwright that "Hunter's Mark" does not appear in the spells table on the character sheet.

### Issue 2: Automation Does Not Apply Extra 1d6 Force Damage to Weapon Attacks

Even if a character had Hunter's Mark, the automation does **NOT** apply the extra 1d6 Force damage to weapon attacks against the marked target.

**Evidence:**
- `src/services/automation/contextBuilder-sync.js` — No check for `hunters_mark_concentration` effect to add bonus damage
- `src/services/automation/` — No handler file for Hunter's Mark extra damage
- `grep -r "hunters_mark_concentration" src/` — Only found in `spellPreparationService.js` (buff tracking) and its test file. No combat automation consumes it.
- `grep -r "extra.*damage.*hunter" src/services/automation/` — No matches

The spellPreparationService.js (line 606-610) sets up concentration and adds an `activeBuffs` entry with `effect: 'hunters_mark_concentration'`, but no automation code reads this to apply the 1d6 Force damage bonus to weapon attacks.

### Issue 3: Automation Does Not Apply Advantage on Attacks Against Marked Target

The automation does **NOT** grant Advantage on attack rolls against the Hunter's Mark target.

**Evidence:**
- `src/services/automation/contextBuilder-sync.js` lines 483-495 — Advantage is **only** granted through the **Precise Hunter** passive (2024 Ranger level 17 feature), not from Hunter's Mark itself.
- The task description states "You have Advantage on attack rolls against the creature" but the **actual 5e/2024 rules** state: "You also have Advantage on any Wisdom (Perception or Survival) check you make to find it" — this is for Perception/Survival checks, not attack rolls.

The only code path that grants advantage for Hunter's Mark is:
```javascript
// contextBuilder-sync.js:488-494
if (hasPreciseHunter && targetName && forcedMode === undefined) {
    const attackerCreature = combatSummary?.creatures?.find(c => c.name === playerName);
    if (attackerCreature?.concentration?.spell === "Hunter's Mark" && attackerCreature?.concentration?.target === targetName) {
        forcedMode = 'advantage';
        advantageReason = 'Precise Hunter (Hunter\'s Mark)';
    }
}
```
This requires the Precise Hunter passive, which the Bard_Spellcaster does not have.

### Issue 4: Hex vs Hunter's Mark Conflation

The character has **Hex** (SP-064) active in the initiative (visible as "Hex DC 10" on the Bard_Spellcaster initiative card). Hex and Hunter's Mark are similar spells (both concentration, both add 1d6 damage), but:
- **Hex** (SP-064): 1d6 Necrotic damage + Disadvantage on chosen ability check
- **Hunter's Mark** (SP-068): 1d6 Force damage + Advantage on Perception/Survival checks

Neither spell grants Advantage on attack rolls per RAW. The automation for Hex also does not appear to apply the extra 1d6 Necrotic damage to weapon attacks.

## Root Cause

The Hunter's Mark automation (SP-068) is **incomplete**:
1. Spell casting sets up concentration and buff tracking correctly
2. **Missing:** Extra 1d6 Force damage application to weapon attacks against marked target
3. **Missing:** Advantage on Perception/Survival checks (though this is non-combat)
4. **Partially implemented:** Advantage on attacks only via Precise Hunter passive (not from the spell itself)

## Recommendations

1. **For testing:** Use a Ranger character with Hunter's Mark in their spell list for proper SP-068 testing
2. **For implementation:** Add automation to apply 1d6 Force damage bonus to weapon attacks when attacker has Hunter's Mark concentration on the target
3. **For documentation:** The task description's claim of "Advantage on attack rolls" is incorrect per RAW — Hunter's Mark grants Advantage on Perception/Survival checks, not attack rolls

# Bug: CLA-048 Celestial Revelation - Extra Damage Cannot Be Verified Due to Broken Attack Flow

## Overview

The Celestial Revelation automation (CLA-048) for Aasimar race level 3+ in the 2024 ruleset partially works. The transformation activation correctly deals proficiency bonus damage to creatures within 10 feet. However, the extra damage on attacks/spells cannot be verified because the character sheet attack flow doesn't complete properly — attacks from the character sheet don't select targets or deal damage.

## Expected Behavior

"When you reach character level 3, you can transform as a Bonus Action using one of the options below (choose the option each time you transform). The transformation lasts for 1 minute or until you end it (no action required). Once you transform, you can't do so again until you finish a Long Rest. Once on each of your turns before the transformation ends, you can deal extra damage to one target when you deal damage to it with an attack or a spell. The extra damage equals your Proficiency Bonus, and the extra damage's type is either Necrotic for Necrotic Shroud or Radiant for Heavenly Wings and Inner Radiance."

The transformation should:
1. Activate as a Bonus Action (works)
2. Deal proficiency bonus damage to creatures within 10 feet on activation (works)
3. On each turn, deal extra proficiency bonus damage when the character deals damage with an attack or spell (FAILS - attack flow broken)

## Actual Behavior

1. **Transformation activation works correctly:**
   - Inner Radiance triggered successfully
   - All creatures within 10 feet took 3 Radiant damage (Proficiency Bonus)
   - Log confirms: "Inner Radiance used" and multiple "-3 HP" entries

2. **Extra damage on attack fails:**
   - Unarmed Strike attack from character sheet shows only: `(4) 4+2 (+2 to hit)`
   - No target selected, no hit/miss result, no damage dealt
   - Attack flow from character sheet doesn't integrate with Initiative screen target selection
   - Other characters (FT008 Test, Boon Test) show complete attack logs with targets: `→ TargetName: HIT (AC X)` with damage values

## Steps to Reproduce

1. Navigate to test-campaign in the app
2. Open the CelestialAasimar character (Aasimar, level 3+, with Celestial Revelation)
3. Enter combat mode with at least one NPC creature (e.g., Goblin)
4. Use the Celestial Revelation bonus action to activate Inner Radiance
5. Verify creatures within 10 feet take proficiency bonus Radiant damage (confirmed working)
6. Try to make an Unarmed Strike attack from the character sheet
7. Observe the attack does not complete — no target selection, no hit/miss, no damage
8. The extra damage from Celestial Revelation cannot be applied because the attack never completes

## Likely Location

- Handler: `src/services/combat/automation/handlers/classFeatureHandler.js` (Aasimar Celestial Revelation handler)
- Character sheet attack flow: `src/components/char-sheet/` (attack button handlers)
- Initiative screen: target selection logic that character sheet attacks should integrate with
- The character sheet attack button needs to either prompt for target selection or use the target from the Initiative screen

## Notes

- The transformation activation (inner radiance area damage) works correctly
- The issue is specifically with the attack flow integration — attacks from the character sheet don't complete
- This is a broader issue with character sheet attacks, not specific to Celestial Revelation
- Other characters in the same campaign show complete attack logs, suggesting the issue may be specific to this character's setup or a race/class feature conflict

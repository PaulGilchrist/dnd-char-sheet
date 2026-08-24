# SP-035 Dominate Beast — INCOMPLETE

## What I Tried

1. Navigated to the Encounter Builder page in the test-campaign.
2. Confirmed the Spider (CR 0, Beast type) is selected in the encounter.
3. Clicked "Join Encounter" with force (to bypass modal overlay).
4. Navigated to the Wild_Sage_Druid character sheet.
5. Attempted to find Dominate Beast in the Druid's spell list.

## Where It Stalled

The Wild_Sage_Druid character **cannot cast Dominate Beast** for two reasons:

1. **No spells prepared**: The character file (`public/campaigns/test-campaign/Wild_Sage_Druid.json`) has `"spells": []` — zero spells prepared. The only spell visible on the character sheet (Find Familiar) comes from the Wild Companion class feature, not from prepared spells.

2. **Dominate Beast is not on the Druid spell list**: Dominate Beast is a **Bard** spell (4th level, Enchantment). The Circle of the Land subclass spells are all Druid spells (Blur, Fireball, Fog Cloud, etc.). The Magic Initiate feat only grants cantrips and 1st-level spells — not 4th-level Bard spells.

## Setup Gap Assessment

**This is a setup gap, not an automation bug.** The test campaign needs a character that:
- Has Dominate Beast in their prepared spell list, OR
- Has a feature that grants access to Bard spells at 4th level (e.g., a Bard character, or a multiclass with Bard levels)

The suggested Wild_Sage_Druid character does not support triggering this automation. A Bard (or another spellcaster with Dominate Beast prepared) should be used instead, along with the Spider NPC as the Beast target.

The Spider NPC (CR 0, Beast type) is correctly set up and available in the encounter.

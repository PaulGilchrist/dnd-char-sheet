# Test Setup Playbook

Accumulated known-good recipes for setting up combat automation verification scenarios. Grows as subagents succeed.

## General rules (from the GM)

- **Monsters are created from the ENCOUNTER BUILDER, not the NPCs sidebar.** To get a monster into combat: Encounter Builder view → search `public/data/monsters.json` / `public/data/2024/monsters.json` names → add monster → add to initiative. Do NOT use the NPCs sidebar to create combat targets. (NPCs sidebar entries like the "Goblin" in test-campaign are story NPCs, not valid statblock combatants.)
- **Clean up after testing:** remove monster creature cards from initiative when a test finishes, then clear change-data cache and campaign log via the Admin panel. Keep test-campaign data clean.

## Manifest ambiguity pattern

Many triggerConditions fields use cryptic internal event names like `cunning_strike_poison_save_fail`. These are ambiguous about *whose* save/roll is being checked. The rule: **the trigger always refers to the target's save, not the character's** — Cunning Strike is the Rogue applying a feature to an enemy, so the enemy's failed save triggers the poison damage. When dispatching subagents, translate these internal names into clear natural language.

## Recipes

### Encounter Builder → combat (save-forcing monster setup)

Campaign → Encounters view → search monster DB by exact name (names must match `public/data/monsters.json`) → check its Select checkbox → click **Join Encounter** (skull button, only visible when ≥1 monster selected). No need to save the encounter first — selecting a monster and clicking Join Encounter is enough; it appends monsters into the live `combatSummary` (rolls initiative, navigates to Initiative view) and player characters appear automatically alongside. Monster spellcasting lives in `traits[]`, not `actions[]`.

**Known-good save-forcing monster: Aarakocra Aeromancer** (`aarakocra-aeromancer`, CR 4, HP 66, AC 16) — Spellcasting action with structured `save_dc: 13` / `save_type: "Wisdom"`: Gust of Wind (WIS save, at will), Lightning Bolt (1/day). Use this when you need a monster that forces saving throws.
**Known-bad: Cult Fanatic** — despite spellcasting in traits[], it exposes no usable save-DC attack in combat; do not use it for save tests.

### Initiative/UI gotchas

- **Check the initiative tracker BEFORE using Join Encounter** — the monster may already be staged from a prior attempt; Join Encounter would append a duplicate.
- Stacked invisible overlays block clicks: leftover "Saving Throw Required" prompt (`.sp-overlay`) and open MonsterCardModal statblock viewer (`.mc-overlay`). Close any open monster card and resolve/dismiss pending prompts before manipulating creature cards.
- "Remove NPC" on a creature card fires a native `confirm()` dialog — accept it.
- **Clicking away from modals** (clicking empty space or backdrop) closes most overlays. This is useful when stuck on blocking modals like `.sp-overlay`, `.mi-overlay`, `.encounter-modal-overlay`.

### CharReactions — manual activation required

**CRITICAL:** Reactions listed in the `CharReactions` section of a character sheet are **NOT automatic**. They appear as clickable buttons that the user must actively click to activate. Do NOT assume a reaction triggers automatically when its condition is met.

When testing automations that involve reactions (e.g., Countercharm, Beguiling Defense, War Caster spellcasting reaction, Opportunity Attacks with Sentinel, etc.):
1. Trigger the condition that would activate the reaction
2. Look for the reaction button in the CharReactions section of the character sheet
3. Click the reaction button to activate it
4. Then verify the effect occurred

If a test subagent reports a reaction "didn't trigger automatically," that is **expected behavior** — the reaction is waiting for user input. The automation is working correctly if:
- The reaction button appears in CharReactions when the trigger condition is met
- Clicking the button produces the expected effect
- The reaction is removed from CharReactions after activation (if it's single-use)

**Common false positives to avoid:** Do not file bug reports for reactions that "didn't auto-resolve." Check CharReactions first.

### Character Creation — Dragonborn (Draconic Ancestry)

Campaign → Characters sidebar → **Add Character** → wizard overlay opens.

**Wizard flow (2024 ruleset):**
1. **Ruleset**: Select "2024 Rules (Essentials)" → Next
2. **Basic Info**: Fill Name, Level (5+ for Draconic Flight), Alignment → Next
3. **Race**: Select "Dragonborn" from combobox → Next
4. **Subrace**: Select desired ancestry (Black=Acid, Blue=Lightning, Brass=Fire, Bronze=Lightning, Copper=Acid, Gold=Fire, Green=Poison, Red=Fire, Silver=Cold, White=Cold) → Next
5. **Background**: Select any → Next
6. **Class**: Select any → Next
7. **Subclass**: Select any → Next
8. **Feats**: Optional (Next enabled)
9. **Ability Scores**: Optional (Next enabled)
10. **Skill Proficiencies**: Optional (Next enabled)
11. **Tool Proficiencies**: Optional (Next enabled)
12. **Languages & Fighting Styles**: Optional (Next enabled)
13. **Resistances & Immunities**: Optional (Next enabled)
14. **Spells**: Optional (Next enabled)
15. **Magic Items**: If a "Magic Initiate" overlay appears, click the overlay backdrop to dismiss it → Next
16. **Inventory**: Optional (Next enabled)
17. **Special Actions**: Click **Save**

**Known-good character: DraconicDragon** — Red Dragonborn, Barbarian (Path of the Berserker), Level 5, Acolyte background, 2024 ruleset. File: `public/campaigns/test-campaign/DraconicDragon.json`. Has Fire resistance, Breath Weapon action, and Draconic Flight bonus action.

**Overlay gotcha**: The Magic Items step may show a "Magic Initiate" overlay (`.mi-overlay`) that blocks the Next button. Click the overlay backdrop or a close button to dismiss it before proceeding.

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

### Fast Hands data issue (Thief subclass vs base Rogue)

Fast Hands is incorrectly defined as a **Thief subclass** feature in  rather than a base Rogue feature at level 2. Non-Thief Rogues (Assassin, Soulknife, Arcane Trickster) cannot access it. To test: create a Thief subclass Rogue or fix the 2024 class data to move Fast Hands from  to .

### NPC click handler issue (runtime encounter creatures)

Clicking on a runtime encounter creature in the initiative tracker does NOT open the monster stat block modal with attack options. This blocks testing of reaction-based automations (Glorious Defense, etc.) that require NPC attacks.

### Aarakocra variants have null AC

All three Aarakocra variants (Aarakocra, Aarakocra Aeromancer, Aarakocra Skirmisher) have `AC: null` in `public/data/monsters.json`. This prevents the attack system from determining hit/miss, blocking all attack rider maneuvers. Fix: set appropriate AC values (Aarakocra: 12, Aarakocra Aeromancer: ~13, Aarakocra Skirmisher: ~12). Use different monsters for attack testing.

### Spell class verification for 2024 ruleset

Grease (SP-056) is only available to Sorcerer and Wizard in 2024 — NOT Druid or Bard. Always check `public/data/2024/spells.json` for the `classes` array before assuming a character can cast a spell.

### Hold Monster/Person target selection issue

When casting Hold Monster or Hold Person, the target selection modal only shows characters from the combat summary, not encounter creatures. The `resolveHumanoids()` function calls `getCombatSummary()` which returns null if no combat session is active. To fix: start combat (Join Encounter should work) before casting these spells, or add the target as a character instead of an encounter creature.

### Mid-combat character creation (new PCs missing from target popups)

Creating a character *after* combat is staged leaves them absent from `combatSummary` and therefore from Globe/area spell target popups (`getCsAndTargets` / `gateGlobe` read the cached summary; gateGlobe lives in `src/hooks/combat/spellGates.js:447`). Fix: visit the **Initiative view once** — `mergeCombatSummaryWithCharacters` on mount adds missing PCs and persists via `storage.set('combatSummary', merged)` — then reopen the cast popup; the new PC is listed.

### Globe of Invulnerability spell flow (SP-055 recipe)

Spell row → details popup "Cast Spell" → "Choose creatures within 10 feet" popup → check creatures → "Activate Globe (N)". `globe_barrier` badge appears on caster sheet + initiative card (tooltip "spells of 5th level or lower blocked"). Outside attacker casting a ≤5 spell at the globed target gets a block popup **before any attack roll** and no log damage entry (wording from `src/services/rules/spells/spellCastService/execution/blockChecks.js`). Sorcerer casters show a Metamagic panel — click "Cast Without Metamagic" to resolve the cast. NOTE: manifest source paths for Globe are stale — real impl: `src/services/automation/handlers/spells/globeOfInvulnerabilityHandler.js` + `src/services/rules/features/globeOfInvulnerabilityService.js`.

### Spell-row selection checkbox

In character-wizard spell steps and creature-select popups, clicking the spell/creature ROW only expands details — selection requires clicking the `.list-item-checkbox` inside the row. Clicking the row does NOT toggle selection.

### Targeted spell attacks need the initiative card Target dropdown (CLA-156 recipe, 2026-08-28)

Casting a single-target attack spell (e.g. Eldritch Blast) auto-rolls IMMEDIATELY with **no target** unless the caster's initiative creature-card **Target dropdown** is set to the monster first. With no target: the roll popup shows no "vs AC"/HIT/MISS line, `campaign.lastAttack` is NEVER written (`attackPostProcessing.js:31` gates on `combatSummary && targetName`), and any reaction reading `getRuntimeValue('campaign','lastAttack')` (Guided Strike etc.) can never see the miss. Recipe: Initiative view → caster card → Target select = monster → sheet → spell row → Cast Spell → popup now shows "✗ MISS (15 vs AC 18)".
- **Card locator pitfall:** `/HexWarlock/.test(card.textContent)` matches EVERY creature card because each card's Target `<select>` lists all PC names. Match instead on the exact-text of a name span/div, or `card.textContent.slice(0,20)`.
- Wizard spell-step checkbox is `.list-item-checkbox-trigger` inside `.list-item-header` (NOT `.list-item-checkbox`; clicking the row body does not toggle). The `.mi-overlay` Magic Initiate can reappear mid-edit — dismiss via `.mi-overlay .mi-skip`.
- `campaign.lastAttack` writes are debounced ~10s; wait ≥11s before fetching change-data to inspect it.
- Known soft bug seen while verifying CLA-156: on ally-miss conversion the damage application throws `Error: characters must be an array` (`applyDamage.js:149` via `autoRerollHandler.js:388`) — popup/+10/log/CD-consume still work, monster HP unchanged.

### Guided Strike (CLA-156) — 2024 data lives under Cleric → War Domain

Guided Strike (+10 on a miss, 30 ft, Channel Divinity, reaction) is a **War Domain** subclass feature in `public/data/2024/classes.json` — NOT Life Domain. Divine_Cleric (Life) cannot use it. Need a War Domain Cleric lv3+ (War_Cleric now exists in test-campaign). Real impl: `src/services/automation/handlers/combat/autoRerollHandler.js` (dispatched as `auto_reroll` via `src/services/automation/index.js`); manifest paths are stale. Ally-miss path works without a map (range check skipped when `_mapName` falsy). Verified 2026-08-28: HexWarlock miss d20(8)+7=15 vs AC 18 → click Guided Strike → popup "d20(18)+7=25 vs AC 18 → HIT, Miss turned into a hit!", CD 2→1, log `War_Cleric used Guided Strike: +10 to HexWarlock's failed attack roll.`

### Weapon attacks auto-roll; attack-rider modal comes AFTER the roll

Clicking a weapon attack row on the sheet **auto-rolls the attack immediately** and shows a dismissable result popup — there is no pre-rider choice. The attack-rider modal appears only *after* clicking Done, and (as of 2026-08-28) `currentRolls` is not carried into it, so attack-rider maneuvers crash with `TypeError: currentRolls is not iterable` (`useAttackDamageResolution.js:282` via `AttackRiderManeuverPrompt.jsx:12`) — see bug-mn-009. Rider use still consumes the die and shows the WIS save prompt; the save and targetEffect badges (e.g. Taunted/`taunting_step`) render fine. Secondary noise: `[buildSaveDc] Spell "unknown" has no saveDc defined` (`savePrompt.js:26`) is unrelated console noise — don't file it as a bug.

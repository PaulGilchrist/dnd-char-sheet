# Test Setup Playbook

Accumulated known-good recipes for setting up combat automation verification scenarios. Grows as subagents succeed.

## General rules (from the GM)

- **Monsters are created from the ENCOUNTER BUILDER, not the NPCs sidebar.** To get a monster into combat: Encounter Builder view → search `public/data/monsters.json` / `public/data/2024/monsters.json` names → add monster → add to initiative. Do NOT use the NPCs sidebar to create combat targets. (NPCs sidebar entries like the "Goblin" in test-campaign are story NPCs, not valid statblock combatants.)
- **Clean up after testing:** remove monster creature cards from initiative when a test finishes, then clear change-data cache and campaign log via the Admin panel. Keep test-campaign data clean.

## Recipes

### Encounter Builder → combat (save-forcing monster setup)

Campaign → Encounters view → search monster DB by exact name (names must match `public/data/monsters.json`) → check its Select checkbox → click **Join Encounter** (skull button, only visible when ≥1 monster selected). No need to save the encounter first — selecting a monster and clicking Join Encounter is enough; it appends monsters into the live `combatSummary` (rolls initiative, navigates to Initiative view) and player characters appear automatically alongside. Monster spellcasting lives in `traits[]`, not `actions[]`.

**Known-good save-forcing monster: Aarakocra Aeromancer** (`aarakocra-aeromancer`, CR 4, HP 66, AC 16) — Spellcasting action with structured `save_dc: 13` / `save_type: "Wisdom"`: Gust of Wind (WIS save, at will), Lightning Bolt (1/day). Use this when you need a monster that forces saving throws.
**Known-bad: Cult Fanatic** — despite spellcasting in traits[], it exposes no usable save-DC attack in combat; do not use it for save tests.

### Initiative/UI gotchas

- **Check the initiative tracker BEFORE using Join Encounter** — the monster may already be staged from a prior attempt; Join Encounter would append a duplicate.
- Stacked invisible overlays block clicks: leftover "Saving Throw Required" prompt (`.sp-overlay`) and open MonsterCardModal statblock viewer (`.mc-overlay`). Close any open monster card and resolve/dismiss pending prompts before manipulating creature cards.
- "Remove NPC" on a creature card fires a native `confirm()` dialog — accept it.

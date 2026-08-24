# Checkpoint: CLA-111 Verification

## Characters/NPCs in test-campaign

### Characters
- **Disciplined_Monk** — Human, Monk (Warrior of the Elements), Level 14, Acolyte background, 2024 ruleset
- Bard_Spellcaster — Human, Bard (College of Lore), Level 9
- Divine_Cleric — Human, Cleric (Life Domain), Level 3
- DraconicDragon — Dragonborn (Red), Barbarian (Path of the Berserker), Level 5
- DraconicSorcerer — Human, Sorcerer (Draconic Sorcery), Level 6
- DreadRanger — Level 3
- DurableFighter — Level 5
- ElderPaladin — Level 20
- EldritchFighter — Level 10
- FeyWanderer — Level 3
- HexWarlock — Level 10
- Ironhold_Dwarf — Level 10
- Wild_Sage_Druid — Human, Druid (Circle of the Land), Level 9

### Monsters (in combat at time of test)
- **Goblin 1** — Added via Encounter Builder, CR 0.25, 7 HP (reduced to 5 by Elemental Attunement Fire)

## Test Results

### CLA-111 Elemental Attunement (Fire) — VERIFIED

**Setup:** Disciplined_Monk (Level 14, Warrior of the Elements) in combat with Goblin 1
**Action:** Bonus Action → Elemental Attunement → Fire element → Target: Goblin 1
**Save:** DEX DC 17 — Goblin 1 failed (d20: 2 + 2 = 4 vs DC 17)
**Damage:** 1d10 Fire rolled 5 → 2 fire damage applied
**HP Verification:** Goblin 1 went from 7/7 to 5/7

**Evidence:**
1. ✅ Bonus Action triggered Elemental Attunement modal
2. ✅ Element selection: Fire (5-ft radius flames, DEX save or 1d10 Fire damage)
3. ✅ Creature selection: Goblin 1 selected
4. ✅ Save prompt: DEX save DC 17
5. ✅ Save result: Failed (4 vs 17)
6. ✅ Damage applied: 2 fire damage
7. ✅ HP confirmed reduced: 7 → 5
8. ✅ Results summary displayed correctly
9. ✅ Cleanup: Goblin removed, cache cleared, log cleared

# Checkpoint MN-009 — Goading Attack

## Scenario
- PC: EvasiveFighter (2024 Fighter, Battle Master, lv5, Human) — has superiority dice (d8), reused from MN-007.
- Target: monster via Encounter Builder (exact name from public/data/monsters.json), low WIS save to force fail if possible.
- Flow: select EvasiveFighter → set target via creature-card target icon → weapon attack hit → Attack Rider modal → select "Goading Attack" → Use Maneuver → WIS save prompt → resolve fail → Done.

## Verify
1. Superiority die added to damage roll ("Added N to the damage roll" + damage total includes die).
2. Target WIS save prompt appears.
3. On fail: target gets targetEffect badge (internal effect `taunting_step`, label "Taunted", duration until_end_of_user_next_turn).
4. Superiority die counter decremented.

## State log
- Campaign loaded: test-campaign (default char AasimarTest).
- Registered test target: Animated Rug of Smothering (index animated-rug-of-smothering, AC 12, HP 27, WIS mod -4). Joined via Encounter Builder → combatSummary live, rug Init 14, name "Animated Rug of Smothering 1".
- EvasiveFighter Target dropdown set to "Animated Rug of Smothering 1" on initiative card. STR 8 → +2 to hit; save DC = 8 + (-1) + 3 = 10 WIS.
- Next: EvasiveFighter sheet → Greataxe attack → rider modal → Goading Attack.

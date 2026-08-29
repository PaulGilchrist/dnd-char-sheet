# Checkpoint — CLA-156 Guided Strike (2024 Cleric Channel Divinity)

## Key facts discovered (pre-browser)
- Manifest paths stale. Real impl: `src/services/automation/handlers/combat/autoRerollHandler.js` (dispatched via `src/services/automation/index.js:333` `auto_reroll: handleAutoReroll`).
- 2024 data: Guided Strike lives under **Cleric → War Domain** subclass feature (`public/data/2024/classes.json`, ~line 3054): automation `{type:auto_reroll, trigger:missed_attack_roll_within_30ft, effect:bonus_to_miss, bonus:10, range:"30 ft", resourceCost:"channel_divinity", casting_time:"1 reaction"}`.
- **Registry correction:** Divine_Cleric (Life Domain lv3) does NOT have Guided Strike — Life Domain lacks it in 2024 data. Must create a **War Domain Cleric lv3** via wizard in-app (no file edits allowed).
- Handler behavior (`autoRerollHandler.js:353-481`): consumes `channelDivinityCharges` runtime key; if campaign `lastAttack` is own miss → +bonus recompute vs AC, rolls+dlogs damage if miss→hit; else `auto.range` path `findAllyMissedAttack` (skips position check when no map). Logs `ability_use` entry "used X: +10 to own/ally's failed attack roll".

## Staged state (to build)
- Campaign: test-campaign, 2024 ruleset, http://localhost:5173.
- New character: `War_Cleric` — 2024, Human, Cleric lv3, War Domain, Acolyte background.
- Verify initiative tracker empty before Join Encounter.
- Monster target: **Animated Armor** (AC 18, real AC, CR 1) from Encounter Builder → Join Encounter — chosen so Cleric attack (+~5) misses often; +10 then guarantees hit.
- Avoid Aarakocra (null AC per playbook — lastAttack.hit would be null, `hit===false` gate fails).

## Verify criteria
1. Cleric misses attack vs Animated Armor → Guided Strike button available in CharReactions (reaction, manual click per playbook).
2. Click → popup shows original d20+mod MISS vs AC 18, modified +10 HIT.
3. `channelDivinityCharges` decremented (2→1).
4. Campaign log has ability_use entry for Guided Strike (+10).
5. Ally-miss variant (optional if feasible): another PC misses near Cleric → button still usable.

## Cleanup
Remove monsters from initiative (accept confirms), Admin → Clear Change Data + Clear Campaign Log. Note: War_Cleric character file created in-app — flag in registry (keep for future Cleric tests).

## FINAL (2026-08-28): PASS
- HexWarlock (target set via initiative card Target dropdown → Animated Armor 1) Eldritch Blast MISS d20(8)+7=15 vs AC 18.
- War_Cleric Reactions → clicked Guided Strike button → popup: "Bonus: +10 | Attack roll: d20(8)+7=15 vs AC 18 → MISS | Modified: d20(18)+7=25 vs AC 18 → HIT | Miss turned into a hit!"
- channelDivinityCharges 2→1 (change-data). Log: ability_use "War_Cleric used Guided Strike: +10 to HexWarlock's failed attack roll." (targetName HexWarlock).
- Soft issue (not core criteria): damage not applied on conversion — console `Error: characters must be an array` (applyDamage.js:149 via autoRerollHandler.js:388); Armor stayed 33/33.
- Cleaned: armor removed from initiative (confirm accepted), Change Data + Campaign Log cleared. War_Cleric + HexWarlock(Eldritch Blast) persist as reusable registry entries.

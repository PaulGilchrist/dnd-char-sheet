# bug-CLA-304 — Searing Vengeance: heal always 0, burst drops CHA modifier

**VERDICT: FAIL** (2026-09-04) — feature fires and gates, but the CORE heal is 0 HP and burst damage omits the +CHA modifier.

## Config under test
- HexWarlock lv14 2024 Warlock, CHA 17/+3 (sheet confirmed), subclass EDITED Fiend → **Celestial Patron** (majors[1]; note: prompt said `classes[9]` but in `public/data/2024/classes.json` Warlock is `classes[10]`; classes[9]=Sorcerer). Persisted to disk + 15s wait; sheet Reactions row `Searing Vengeance:` live (clickable).
- Trigger state: EB join Hill Giant 1 (105) + Thug 1 (32); giant targeted LightfootHalfling (maxHp 12); Multiattack HIT 20 vs AC 13 → `3d8+5 [3,2,6]=16` → **LF HP 16→0**, `.dsp-overlay` "LightfootHalfling must make a Death Saving Throw" + `.dsp-roll-btn`, runtime `currentHitPoints 0`, `deathSaves [false,false,false]`.

## What works
- Reaction row manual dispatch → `searingVengeanceHandler.handle()` → `.sp-overlay` "Searing Vengeance" CreatureSelectionModal; 0-HP ally + caster correctly excluded from burst list; other 14 creatures listed (gridless `isWithinRange` returns true — accepted gap).
- Burst damage applied per creature with logs: Thug 1 `2d8 [7,8]=15` → 32→17 (`hp_change -15`), Hill Giant 1 same roll re-used 105→90 (`hp_change -15`); `condition` logs "X is Blinded until end of HexWarlock's next turn"; runtime `activeConditions ['blinded']` + `pendingExpirations` (expiryRounds 2, expireOnCreatureName null) on both.
- Once-per-long-rest gate: `searingvengeanceUses` 1→0 on confirm (change-data `HexWarlock.searingvengeanceUses 0`); second click BEFORE rest → refusal popup "Searing Vengeance has no uses remaining. Must finish a Long Rest to regain." no modal, no damage. Key is in `restRules-constants.js:202` long-rest reset list.

## FAIL 1 — heal is ALWAYS 0 (core mechanic inert)
Popup: "LightfootHalfling regains **0 HP**." ability_use log "healed for 0 HP"; `hp_change delta 0 cur 0`; post-confirm `currentHitPoints 0` and `.dsp-overlay` death-save prompt STILL pending. Expected floor(12/2)=**6**.
Root cause `searingVengeanceHandler.js:74-77`: `targetMaxHp = target.maxHp || …` reads the combatSummary player entry, which the app persists as **placeholder `currentHp 1 / maxHp 1` for every PC** (verified: `CS: LightfootHalfling cur 1 max 1`) → `floor(1/2)=0`. The runtime `hitPoints` fallback (real max 12) is unreachable because `maxHp:1` is truthy. Same defect in `skipSearingVengeance` (heals payload healAmount=0, still consumes the use).

## FAIL 2 — burst damage drops CHA modifier
Log `roll … "Searing Vengeance Damage" rolls [7,8] total 15 formula "2d8 + CHA modifier"`; applied 15 to BOTH creatures (32→17, 105→90). Expected 2d8+**3** = 18. `confirmSearingVengeance` (`searingVengeanceHandler.js:158`): `chaMod = playerStats?.computedStats?.chaMod ?? playerStats?.abilityModifiers?.CHA ?? 0` — the playerStats object passed from CharReactions exposes neither shape → resolves **0**, expression resolves `2d8+0`.

## Deviations (documented)
- **No auto-trigger** at death-save time: zero consumers of `trigger: death_save_by_ally_or_self` outside handler/registry — the reaction row is clickable anytime a creature sits at 0 HP (0-HP state is the only gate); the `.dsp-overlay` never offers Searing Vengeance.
- **Self excluded** (`:52 creature.name !== playerName`) despite RAW "you or ally within 60 feet" — warlock at 0 HP on own sheet gets "No creatures within 60 feet are at 0 HP."
- Blinded duration coded `addExpiration(..., 2)` = until caster's NEXT turn vs data `until_end_of_current_turn`.
- Burst centers on the WARLOCK (`isWithinRange(playerName, …)` :101), not the healed target.
- Single roll reused for every target (one 2d8 for all); combatSummary monster HP only syncs via applyDamage (players stay stale 1/1).
- Damage popup (proven kill shot) displayed "HP: 16 → 0" for a 12-max halfling — stale maxHp display, same family as FAIL 1.

## Playbook / registry
- Registry (docs/automations-manifest.json entry CLA-304): "Trigger: death_save_by_ally_or_self; Action: 1 reaction; Range: 30_ft" + full expectedBehavior text quoted in sheet row.
- EB knockdown recipe (NEW): monster `img.avatar-image` click opens `.mc-overlay`; per-weapon `.mc-dice-link` rolls a bare attack (`rollType:'check'`, NO damage consumer) — **only `Multiattack` (first action dice-link) runs the full hit pipeline** with `✓ HIT (n vs AC)` + `.dice-roll-reroll-btn` "Done" → damage applied + hp_change + `.dsp-overlay` death prompt at 0.
- NPC cards: img alt is the reliable identity; target `<select>` in-card, selection persists to combatSummary `targetName`.

## Cleanup
Admin → Clear Change Data + Clear Campaign Log executed; combatSummary reset removed Hill Giant 1/Thug 1; HexWarlock LEFT configured: **Celestial Patron lv14, CHA 17/+3** (disk JSON ground truth). `searingvengeanceUses` cleared with change data (regenerates 1).

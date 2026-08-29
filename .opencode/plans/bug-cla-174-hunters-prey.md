# Bug CLA-174 — Hunter's Prey: Horde Breaker second attack never offered

## Verdict
FAIL (Colossus Slayer half is exactly correct; Horde Breaker half is non-functional in the UI — "close-but-not-exact").

## Verified working (Colossus Slayer)
- Choice picker: clicking "Hunter's Prey:" special action opens feature-choice modal with buttons `Colossus Slayer` / `Horde Breaker` (CharSpecialActions.jsx:376-379); selection popup confirms "Selected: Colossus Slayer." Runtime `_Hunter's_Prey_choice` = "Colossus Slayer" confirmed via in-browser change-data fetch.
- Extra damage: Target dropdown = "Zombie 1" (HP edited 15→10 via card spinbutton), Shortsword row click auto-rolled "✓ HIT (8 vs AC 8)", Done → damage popup formula **`1d6-1 [piercing] + 1d8 [extra]: 3, 8 -1`**, "**10** damage applied to Zombie 1 — HP: 10 → 0". Arithmetic exact: 1d6(3)−1=2, +1d8(8)=10.
- Once per turn: restored Zombie 1 to HP 5, attacked again same turn → popup `1d6-1 [piercing]: 5 -1`, 4 damage, **HP: 5 → 1 — NO `1d8 [extra]`** (gate `_Hunters_Prey_Colossus_UsedRound`=1 vs round 1, colossusSlayer.js:16-17). Correct.

## Bug (Horde Breaker)
After Short Rest (picker re-offers — restRules-shortRest.js:297 nulls the key, confirmed) choosing **Horde Breaker**, a weapon hit on Zombie 1 (crit HIT 22 vs AC 8, Done, damage applied) produces:
- NO second-attack prompt/modal anywhere.
- NO Horde Breaker row in Bonus Actions (section shows only Hunter's Mark).
- Runtime `_Hunters_Prey_HordeBreaker_UsedRound` NEVER written after the hit.

### Root cause
`rules-hunterPrey.js:26-36` pushes an `isHordeBreaker` placeholder attack ("Horde Breaker", 1d4, Bonus Action), but **CharBonusActions.jsx:159-160 filters it out** with comment "UI will show it conditionally" — and no code anywhere renders it conditionally (grep `isHordeBreaker` → only that filter; grep `HordeBreaker_UsedRound` → only written in attackRollHousekeeping.js:91-96 when a `name==='Horde Breaker'` bonus attack resolves, which can never be initiated since the row is hidden). The consumer UI promised by the comment does not exist.

### Secondary gaps
1. **Wrong damage**: placeholder is hard-coded `1d4` Slashing (rules-hunterPrey.js:28) instead of the actual weapon's damage (Shortsword 1d6); "same weapon" not honored.
2. **Wrong gating**: entry is added only when `rangerFeatures.extraAttacks > 0` (rules-hunterPrey.js:19) — Extra Attack gating is unrelated to Horde Breaker; a lv3-4 Hunter would get nothing.
3. **5-ft / different-creature positioning not enforced anywhere** (no range or target-difference check in the pipeline; must be noted even if a UI path is added).

## Repro
1. test-campaign, HunterRanger (Hunter lv6 2024). Click "Hunter's Prey:" → pick Horde Breaker (after Short Rest if a prior choice exists).
2. Join Encounter with 2× Zombie; Target dropdown on HunterRanger card = Zombie 1; Shortsword row → HIT → Done.
3. Observe: no second-attack offer; Bonus Actions unchanged; `_Hunters_Prey_HordeBreaker_UsedRound` absent from change-data.

## Suggested fix
In CharBonusActions.jsx, when `_Hunter's_Prey_choice === 'Horde Breaker'` and `_Hunters_Prey_HordeBreaker_UsedRound !== currentRound` and a main-weapon hit occurred this turn, render the filtered `isHordeBreaker` attack row with the *used weapon's* damage/name, and gate its resolution to a target different from (and within 5 ft of) the original target + within weapon range.

## Cleanup done
Zombies removed from initiative (confirm dialogs accepted), HunterRanger long rested, Admin → Clear Change Data + Clear Campaign Log (both confirms accepted).

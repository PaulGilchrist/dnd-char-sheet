# Bug MN-009 — Goading Attack rider crashes before adding superiority die to damage

## Overview
Verified live via Playwright (http://localhost:5173, campaign `test-campaign`, 2024 ruleset). When EvasiveFighter (Battle Master lv5) hits with Greataxe and selects **Goading Attack** in the "Battle Master — Attack Rider Maneuver" modal, clicking **Use Maneuver** throws an uncaught `TypeError`. The superiority die IS consumed and the target WIS save prompt IS shown (and `taunting_step` application works on save failure), but the handler dies before adding the die to the damage roll — no damage is dealt and no maneuver `ability_use` log entry is written.

## Expected
On hit + maneuver use: superiority die rolled and added to the attack's damage total, damage applied to target, and a log entry "Goading Attack: Rolled d8 for N … Added N to the damage roll …" plus target WIS save DC 10; on fail, target gets `taunting_step` ("Taunted", until end of user's next turn); die count decremented.

## Actual
Console error immediately after clicking "Use Maneuver":

```
TypeError: currentRolls is not iterable
    at handleAttackRiderManeuverUse (src/components/char-sheet/useAttackDamageResolution.js:271:26)
    at async handleUse (src/components/char-sheet/modals/AttackRiderManeuverPrompt.jsx:13:15)
```
(served-stack line maps to `let updatedRolls = [...currentRolls];` at source line 282)

Observed after crash:
- Rug HP unchanged 23/27 despite HIT (d20 10 +2 = 12 vs AC 12) — zero damage applied.
- No "Goading Attack" ability_use log entry for the attack (only a "Saving Throw — Animated Rug of Smothering 1 / SAVE SUCCESS / rolled 18 +-4 = 14" entry at 09:08:32).
- Superiority dice DID decrement 3/4 → 2/4 (service runs before crash).
- WIS save prompt DC 10 appeared and resolved correctly; `taunting_step`/"Taunted" badge mechanics exist and persist from an earlier working entry (08:41:12, tooltip "Disadvantage on attack rolls vs creatures other than EvasiveFighter").
- Secondary console noise: `[buildSaveDc] Spell "unknown" has no saveDc defined` (savePrompt.js:26).

## Steps
1. Campaign `test-campaign`, select EvasiveFighter; Animated Rug of Smothering 1 (AC 12, WIS -4) already in initiative; fighter's initiative-card Target = rug.
2. Character sheet → Actions → click Greataxe row → attack popup auto-rolls → HIT → click **Done**.
3. Rider modal "Battle Master — Attack Rider Maneuver" → select **Goading Attack** radio → click **Use Maneuver**.
4. Observe console TypeError; WIS save prompt appears → Roll Save → Done.
5. Check Log + rug HP card: no damage entry, HP unchanged.

## Likely Location
- `src/components/char-sheet/modals/AttackRiderManeuverPrompt.jsx:12` — `handleUse` calls `onUse(selectedManeuver, attack, popupHtml)` with only **3 args**.
- `src/components/char-sheet/useAttackDamageResolution.js:270-282` — `handleAttackRiderManeuverUse(maneuver, attack, popupHtmlData, currentFormula, currentTotal, currentRolls)` destructures/spreads `currentRolls` unconditionally; it is always `undefined` from the only call site wired in `src/components/char-sheet/CharActionModals.SecondaryModals.jsx:435` (`onUse={handleAttackRiderManeuverUse}`).
- Fix candidates: default the params (`currentFormula = ''`, `currentTotal = 0`, `currentRolls = []`) and/or have the prompt pass `pendingDamage` through, and roll/apply damage after the rider returns `{formula, total, rolls}` (hit branch lines 322-348 also never triggers a damage roll/applicator — the returned totals appear to be consumed nowhere on this modal path).

## Notes
- The die is spent (line 278 service runs first) while its benefit (damage + logged "Added N to the damage roll") is lost — double fault: player loses resource, target takes less damage, log is silent about the maneuver.
- Older log entries (08:41:12 etc.) contain full "Added N to the damage roll … WIS save …" text, so a prior/alternate path (possibly pre-regression or the Combat Superiority special-action route) writes the log; the current attack-rider prompt path reproducibly crashes (also matches orphan 08:58:17 HIT + 08:57:40 SAVE with no Goading log).
- `taunting_step` effect registry/label ("Taunted") and ConditionEffectBadges rendering are correct and were observed on the rug card.
- Reproduced twice (08:57:40 and 09:08:32 saves with no accompanying maneuver log); not a one-off.

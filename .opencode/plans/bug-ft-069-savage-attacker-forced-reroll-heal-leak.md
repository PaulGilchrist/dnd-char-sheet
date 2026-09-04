# FT-069 Savage Attacker (2024) — FAIL: lower reroll force-applied as target HEAL; "either" never offered

**Verdict: FAIL** (offer/gate/reset/control all PASS, but "use either total" is not implemented — the app always applies the reroll, and when the reroll is LOWER it *heals* the target while the UI claims "Original kept").

## Environment
- `http://localhost:5173/` → test-campaign → **EvasiveFighter** (lv18 Battle Master, STR 10/+0, Shortsword+Shield equipped — NOTE: playbook/task said "Longsword"; disk registry `public/campaigns/test-campaign/EvasiveFighter.json` has `inventory.equipped: ["Shortsword","Shield"]`, attack row `1d6+0 Piercing +6`. Baseline dice 1d6+0 unchanged.)
- Feats on sheet verified post-FT-runs: `Great Weapon Master, Mage Slayer, Savage Attacker`.
- EB Thug 1 (AC 11, HP 32) joined via Encounter Builder → Join Encounter.

## Live evidence (Playwright, 2026-09-04)

### PASS items
- **Offer** (round 1, EF active): attack popup "✓ HIT (21 vs AC 11)" → Done → damage popup `1d6+0 [piercing]: 1 — HP: 32 → 31` shows **`Savage Attacker` button** (`.dice-roll-reroll-btn`, DiceRollResult.jsx:557-563). Click → "Savage Attacker: 1 → 1 — Original kept" (tie, no delta). change-data `EvasiveFighter._Savage_Attacker_usedRound = True`; log `ability_use | Savage Attacker | "EvasiveFighter used Savage Attacker: rerolled damage dice 1 → 1 (1 vs 1)."`; Thug hp 31 ✓.
- **Gate, same turn**: 2nd Shortsword hit same turn (`1d6+0: 3`, HP 31→28) → **NO Savage Attacker button** ✓ (`handlePlainDamage.js:399-400` reads `_Savage_Attacker_usedRound`).
- **Reset**: turn-start clear verified — `usedRound: None` when EF's turn started (round 2), offer returned on next attack. Also cleared on initiative roll (`useInitiativeEffects.js:356`).
- **Control**: HexWarlock (non-holder) Unarmed Strike HIT vs Thug → damage popup with **no Savage Attacker button** ✓.

### FAIL — decisive: lower-reroll forced + heal leak
Round 2, EF active, hit for **[6]**, popup "HP: 28 → 22". Clicked Savage Attacker → reroll **[2]**. UI printed **"Savage Attacker: 6 → 2 — Original kept"** — but server truth (change-data + log):

```
hp_change | Thug 1 | delta:-6 | currentHp: 22   ← base damage
hp_change | Thug 1 | delta:+4 | currentHp: 26   ← Savage Attacker "correction" = HEAL of 4
ability_use | Savage Attacker | rerolled damage dice 6 → 2 (2 vs 6)
```

Final Thug hp **26**, i.e. net damage 2 = the **lower reroll**, while the popup label says original (6) kept. Expected: hp stays 22, no second hp_change (or player chooses).

### Root cause
- `DiceRollResult.handlers.js:175-183` — selection (`rolls: newTotal > originalTotal ? newRolls : originalRolls`) is computed but **`newRolls` is passed unconditionally** in savageData; the chooser value is discarded.
- `CharSheet.handlers.js:217-235` — handler recomputes `newTotal = sum(newRolls) + modifier` and `damageDifference = newTotal - rawDamage` **from the reroll**, then `applyDamageToTarget(...damageDifference...)` even when `damageDifference < 0` → negative damage = heal. Also `setPopupHtml` rewrites popup `total`/`rolls` to the reroll (line 248-253) while the result row still renders "Original kept" (DiceRollResult.jsx:614-617) — self-contradictory display.
- No player choice UI at all: "roll twice and use **either** total" is auto-decided; keeping the lower is impossible.

### Direction status ("either")
- reroll ≤ original: observed twice (1→1 tie: correct no-op; 6→2: **bug**, heal leak +4).
- reroll > original (+delta path): **not observed live** (farmed rounds 3+; ties 4→4 then runaway-loop killed Thug before a strictly-higher roll). Code path is symmetric `applyDamageToTarget(+diff)` — plausible but unevidenced. Gap documented, does not rescue the verdict.

## NEW pitfalls
1. **Sheet attacks fire on ANY turn** — clicking the Actions "Shortsword" cell attacks the armed target even when it is not the holder's turn (no turn gate), and while on the char-sheet there is **no Next button**, so an advance-loop stuck on the sheet view silently becomes an attack-farm loop (Thug 1 32→0 in one evaluate batch). Always verify `h4` round + active-card *before* each click, or navigate to Initiative view inside the loop.
2. **Popup stacking during evaluate loops**: `.dice-roll-result` popups accumulate; `.pop()` may re-read an OLD popup's text (my loop read stale "NO OFFER" popups). Match popups by fresh hp text or dismiss fully between clicks.
3. **Initiative "active" card highlight is client-local** — change-data `combatSummary` carries no `activeCreature`; `usedRound` clears only reach the server after the ~10s debounce. Poll ≥12s after reaching the holder's turn before trusting flag=None.
4. **Vex mastery modal** appears inline on the sheet with some attacks ("Choose a mastery property against Thug 1") — Skip it before Done or its Apply click hits the wrong control.
5. Registry drift: EvasiveFighter is **Shortsword**-equipped, not Longsword (task brief stale); both 1d6, gate `isMeleeOrUnarmed` unaffected.

## Suggested fix
Have `handleSavageAttacker` (DiceRollResult.handlers.js) forward the **selected** dice (or an explicit `keepHigher` decision + user choice UI), and in CharSheet.handlers.js use the selected totals for the diff, clamping/gating so a kept-original outcome writes no hp_change. Add a two-button "Keep first / Keep second" chooser to satisfy "use either total".

## Cleanup
Admin → Clear Change Data + Clear Campaign Log executed; verified `{}` / `[]`. Thug must be re-Joined via Encounter Builder for future tests. No source files modified.

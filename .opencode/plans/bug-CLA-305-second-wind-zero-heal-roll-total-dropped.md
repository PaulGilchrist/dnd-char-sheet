# Bug CLA-305 — Second Wind heals 0: rolled total dropped, uses still consumed

**VERDICT: FAIL** (CLA-305 "Second Wind", 2024 Fighter BASE lv1; EvasiveFighter lv18 Battle Master, 2026-09-04, localhost:5173)

## Symptom (live)
Thug 1 Mace HIT → EvasiveFighter runtime HP **94 → 89** (`hp_change delta:-5`). Bonus Actions `b.clickable "Second Wind:"` click → popup:

> Second Wind: 1d10 + 18=23 (5) — **Already at full HP** (3 uses remaining).

Log: `hp_change targetName:EvasiveFighter sourceName:Second Wind delta:0 currentHp:89 maxHp:94 rollInfo:"1d10 + 18=23 (5)"` — **heal 0 at 89/94** while a use is consumed. 4 clicks (4→3→2→1→0, rolls 23/19/20/25) all heal 0, all consume.

## What works (gates/rests/data correct)
- Formula display exact `1d10 + fighter level → 1d10 + 18` (lv18); 2024 classes.json `class_levels[].second_wind`: lv1–3=2, lv4–9=3, lv10–20=4 → max **4** at lv18 (manifest "twice" is lv1-only data text).
- Row dispatches live every click (no per-turn gate — fine for bonus-action resource); 0-use gate popup "Second Wind has no uses remaining. Recharges on a Short Rest."
- Short Rest: modal lists Second Wind restored; `secondWindUses 0→1` (+1 rule, restRules-shortRest.js:28–30). Long Rest: instant, key → null → 4/4 (in LONG_REST_RESOURCES).

## Root cause
`src/services/automation/handlers/healing/healingHandler.js:295` — generic `isSelf && auto.healExpression` branch:

```js
({ totalBonus: healAmount, details: bonusDetails } = resolveHealingBonusesWithDetails(...));
```

`healAmount` becomes ONLY the healing-bonus total (0 here); `rollResult.total` (rolled 1d10+18) is never added — unlike every sibling branch (:100 `rollResult.total + profBonus`, :160 `rollResult.total + wisModifier`, :389 `rollResult.total + bonusHeal`). Fix: `healAmount = rollResult.total + totalBonus`.

**Secondary:** use consumption (:315 `setRuntimeValue(usesKey, currentUses-1)`) fires even when `actualHeal===0` → uses leak on every failed activation. Gate consume behind `actualHeal > 0` (or at minimum document).

**Tertiary (static note):** no 0-HP/incapacitated gate in this branch (only uses + bloodiedOnly); RAW second wind unusable at 0 HP — live probe skipped (costly Hill Giant drop).

## Blast radius
Every feature routed through `automation/index.js:300 self_healing → handleHealing` generic expression branch (healExpression non-hit-die, non-monk). Check other self_healing consumers (e.g. anything with `1dX + <flat>` expressions) after fix.

## Repro recipe
EB Thug → Join → advance turn via DOM `.creature-card.active` (change-data key `combatSummary.activeCreatureName`) → thug `img.avatar-image.click()` → `.mc-overlay` mc-dice-link "+4" → Done → sheet `b.clickable "Second Wind:"` evaluate-click.

## Cleanup
Admin Clear Change Data + Log verified (`change-data {}`, log 0). No character/config edits; EvasiveFighter left lv18 BM Shortsword+Shield. Checkpoint: `.opencode/plans/checkpoint-CLA-305.md`.

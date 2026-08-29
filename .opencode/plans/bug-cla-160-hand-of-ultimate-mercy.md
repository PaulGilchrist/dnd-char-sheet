# BUG CLA-160 — Hand of Ultimate Mercy: resurrected monster HP never persists

**Date:** 2026-08-28 · **Campaign:** test-campaign (2024) · **Caster:** MercyMonk lv17 (WIS +3, Focus 17/17 after Long Rest)

## Symptom
Triggered Hand of Ultimate Mercy (action row on sheet) on a legitimately-killed corpse, "Animated Rug of Smothering 1" (27 HP reduced to 0 by MercyMonk Unarmed Strikes in live combat; card spinner read 0). Popup and log report success, but the corpse's HP stays **0** permanently — it never actually returns to life on the initiative tracker (still 0 after 5s wait AND after full page reload + re-entering Initiative view, i.e. server-side persisted value is 0).

## What worked (partial)
- Lv17 gate: feature appears on sheet as Action only at lv17 (level edited via Edit wizard `locator.fill("17")`).
- Gate/validation, focus cost: popup "MercyMonk uses Hand of Ultimate Mercy on Animated Rug of Smothering 1. Returns to life with 24 HP. Expended 5 Focus Points. Also removed: Poisoned, Stunned." Focus 17→12 persisted on sheet.
- Condition cure: Stunned + Poisoned badges (added via initiative card Add→Apply) removed from the card.
- Log: `.log-entry` "Animated Rug of Smothering 1 / Brought Back to Life / RESURRECTION / Returns to life with 24 HP" (4d10=21 +3 = 24, within 4d10+WIS range).

## Root cause (source)
`src/services/automation/handlers/class-cleric-paladin/handOfUltimateMercyHandler.js:93-101` — monster branch:

```js
targetInfo.target.currentHp = healAmount;          // mutates the cs fetched by resolveTarget
const cs = await getCombatContext(campaignName);   // BUG: RE-FETCHES a fresh combatSummary (HP still 0)
if (cs) { storage.set('combatSummary', cs, campaignName); }  // persists the UNMUTATED copy
```

`resolveTarget` (targetResolver.js:39-43) returns `{ target, cs }` where `target` is a live reference into that `cs` (damageUtils.js:69-74). The handler mutates that `target`, then throws it away and re-fetches a second copy via `getCombatContext()` (fresh HTTP fetch, damageUtils.js:40-58) and saves THAT. The mutation is lost; server keeps HP 0.

## Fix suggestion
Use the resolved `cs` that was mutated:
```js
targetInfo.target.currentHp = healAmount;
storage.set('combatSummary', targetInfo.cs, campaignName);
```

## Impact
Any monster corpse resurrected by this feature stays dead while the popup/log claim it revived — silent desync between log narrative and combat state. (PC corpses use `setRuntimeValue('currentHitPoints')` at line 94 and are expected to persist; not exercised here because killing a PC in-app was avoidable.)

## Repro recipe (all in-app, Playwright)
1. MercyMonk lv17 via Edit wizard level fill; Long Rest (Focus 17/17).
2. Encounter Builder → search "Animated Rug" → checkbox → Join Encounter (HP 27).
3. Walk `Next →` to MercyMonk card; set card Target = rug; sheet → Unarmed Strike rows until damage popup shows HP → 0.
4. Rug card → Add → Stunned → Apply; Add → Poisoned → Apply (one condition per Apply).
5. MercyMonk turn, Target = rug; sheet → "Hand of Ultimate Mercy:" → popup "Returns to life with N HP"; reload → rug card HP still 0.

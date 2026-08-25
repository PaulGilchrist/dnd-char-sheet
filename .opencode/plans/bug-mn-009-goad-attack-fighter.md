# Bug: MN-009 Goading Attack - Aarakocra Aeromancer has null AC preventing attack hits

## Automation ID
MN-009 (Goading Attack)

## Severity
HIGH - Blocks testing of the entire automation

## Description
The Aarakocra Aeromancer monster entry in `public/data/monsters.json` has `AC: null` (None). This prevents the attack system from determining whether an attack hits or misses.

## Root Cause
In `src/components/char-sheet/DiceRollResult.computed.js:82`:
```javascript
const computedHit = isAutoMiss ? false : (targetName && hit !== undefined && targetAc !== undefined ? finalTotal >= effectiveAc : hit);
```

When `targetAc` is `null`/`undefined`, the condition `targetAc !== undefined` fails, so `computedHit` falls back to the `hit` value from `popupHtml`. Since the attack system couldn't determine hit/miss with null AC, `hit` is also undefined.

This causes the attack rider system in `src/services/combat/steps/attackRollRiders.js:23` to fail:
```javascript
const isHit = ctx.popupHtml?.hit === true || ctx.popupHtml?.isCrit === true;
```

Since `hit` is undefined (not `true`), `isHit` is false, and the Goading Attack maneuver prompt never appears.

## Evidence
- `public/data/monsters.json`: Aarakocra Aeromancer has `"ac": null`
- During testing, EvasiveFighter rolled 19 on d20+2 against Aarakocra Aeromancer, but HP remained at 66/66 (attack didn't register as hit)
- No attack rider modal appeared after the hit roll

## Affected Monsters
All three Aarakocra variants have null AC:
- Aarakocra: AC: None
- Aarakocra Aeromancer: AC: None  
- Aarakocra Skirmisher: AC: None

## Fix Required
Set appropriate AC values for Aarakocra variants in `public/data/monsters.json`:
- Aarakocra: AC 12 (base 5e SRD value)
- Aarakocra Aeromancer: AC ~13 (CR 4 monster)
- Aarakocra Skirmisher: AC ~12 (CR 0.25 monster)

## Impact
- Goading Attack (MN-009) cannot be tested
- Any attack rider maneuver against Aarakocra variants will not trigger
- Damage is not applied to Aarakocra variants

# BUG SP-060 — Heal (2024 lv6) never restores HP to player characters

**Status: FAIL (reproducible 2/2 casts)** · Campaign: test-campaign · 2026-08-29

## What was verified working
- Gate/target-selection flow (`spellGates.js:335 gateHeal` → radio `secondary-target-list` → "Cast Heal").
- Popup confirms flat 70 table ("Level 6 70 / Level 7 80 / …", no dice rolled).
- Condition removal: Poisoned, Blinded, Deafened removed from target badges; 3× log entries "MercyMonk Condition Broken — Blinded/Poisoned/Deafened" at 12:08:14 AM.
- 6th-level spell slot consumed: caster popup "Level 6 70 1 slot" pre-cast → slot gone post-cast ("1 slot" remains only on Level 7).

## What failed
Popup on every cast: **"Heal on MercyMonk: Regained -49 HP"**. Target HP stayed 50/122, no `hp_change` log entry. Negative "regained" is nonsense output; healing silently never applies.

## Root cause
`src/services/rules/features/healService.js:87-90`:
```js
const maxHp = creature.maxHp || playerStats.hitPoints || 0;
const storedHp = getRuntimeValue(targetName, 'currentHitPoints', campaignName);
const currentHp = storedHp != null && storedHp !== '' ? Number(storedHp) : (creature.currentHp ?? maxHp);
const actualHeal = Math.min(healAmount, maxHp - currentHp);
```
`getCombatContext()` returns a **fresh server fetch** of `combatSummary`. In this campaign every PLAYER creature in the persisted combatSummary is a stub with `maxHp: 1, currentHp: 1` (confirmed via change-data for MercyMonk AND Divine_Cleric, the latter never HP-edited this session). So maxHp=1 (truthy → chosen over fallback), currentHp=runtime 50 → `actualHeal = min(70, 1−50) = −49`. The `if (actualHeal > 0)` guard then skips `applyHealingToTarget` AND the hp_change log.

This contradicts the canonical player-HP source used by the damage/healing pipeline (`src/services/shared/hpModifier.js:16-19`), which for players reads runtime `hitPoints`/`currentHitPoints` and only falls back to `creature.maxHp`.

Control experiment: Animated Rug (monster, real summary maxHp 27) took damage fine ("HP: 27 → 19"), proving combatSummary/apply pipeline works for monsters; the defect is PC maxHp handling in healService.

## Suggested fix
In healService.js mirror hpModifier.js: for players use `getRuntimeValue(targetName, 'hitPoints') ?? creature.maxHp`. Also clamp/skip popup when the deficit is genuinely 0 instead of printing a negative heal.

## Secondary observations
- Encounter join logs `Divine_Cleric Cast Heal → Animated Rug of Smothering 1 → [every creature in campaign]` — cast log target field lists all creatures (cosmetic).
- Initiative PC cards expose only a current-HP spinbutton (max is text-only, `CreatureHp.jsx:114`) — GM cannot repair the stubbed `maxHp` through the UI, so the corrupt summary can't be fixed in-app.
- Long Rest is required after milestone level-up or spell slots stay stale ("No spell slots available for this level" at lv13 until first Long Rest).

## Repro
1. test-campaign, Initiative view (PCs staged; server combatSummary PCs have maxHp:1).
2. Divine_Cleric lv13 (Heal prepared), MercyMonk current HP 50/122.
3. Cast Heal on MercyMonk → popup "Regained -49 HP", HP unchanged.

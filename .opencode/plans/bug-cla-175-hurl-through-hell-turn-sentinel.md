# CLA-175 Hurl Through Hell — once-per-turn latch stores 'unknown' sentinel from the never-written 'currentTurn' key (once-per-combat de facto)

## Overview

Distinct from the original CLA-175 duration/return defect (fixed 2026-08-30, commit 3ac3f4b5 — whose bug file explicitly recorded this issue as "Secondary observation (not filed)"). `HurlThroughHellModal.jsx` still contains the exact `'unknown'` sentinel shape that CLA-273 was fixed away (commit 851e7fee): it reads the runtime key `currentTurn` — which has ZERO production writers — stores the fallback `'unknown'` into `hurlThroughHellTurnUsed`, and the handler's once-per-turn gate treats ANY truthy value as "already used this turn". Net effect: after the first successful hurl, EVERY later activation is refused ("Already used this turn") until initiative is re-rolled or a Long Rest — RAW the feature is once per TURN.

## Canonical / Expected

2024 Soulknife lv9 Hurl Through Hell: "once on each of your turns" — the Fiend must re-save each time the Soulknife hits with a melee attack on a new turn. A round-keyed latch (`Number(getRuntimeValue(name,'X')) === getCurrentCombatRound(campaignName)`, the CLA-109/CLA-273 fixed pattern) is the app-standard implementation; `psionicStrikeHandler.js:135` carries the exact explanatory comment for this defect family.

## Actual (code-inspection evidence, verified in current working tree)

- `src/components/char-sheet/modals/HurlThroughHellModal.jsx:27-28` — `const currentTurn = getRuntimeValue(playerName, 'currentTurn', campaignName) || 'unknown';` then `setRuntimeValue(playerName, 'hurlThroughHellTurnUsed', currentTurn, campaignName)`.
- `grep -rn "'currentTurn'" src` (non-test): only the read at HurlThroughHellModal.jsx:27 and the explanatory comment at `psionicStrikeHandler.js:135`. No production writer ever writes `currentTurn` → the read is permanently `null` → `'unknown'` is stored.
- Gate: `src/services/automation/handlers/class-warlock/hurlThroughHellHandler.js:15-23` — `if (turnUsed) return popup "Already used this turn. Once per turn."` — `'unknown'` is truthy, so the second hit-hurl on ANY later turn is refused.
- Reset consumers only: `src/components/char-sheet/useInitiativeEffects.js:34` (initiative roll = new combat) and `restRules-longRest.js:519` (Long Rest) — neither fires on round wrap or turn start. So within one combat the latch is one-way.

## Steps to Reproduce

1. Soulknife lv9+ warlock-multiclass (or Fiend Soulknife with pact slot) in test-campaign; EB-join a High-HP humanoid; set Target.
2. Hit with melee attack → resolve damage → Hurl Through Hell fires (write: `hurlThroughHellTurnUsed = "unknown"` in change-data — probe `cd['<Name>'].hurlThroughHellTurnUsed`).
3. Walk `Next →` to the Soulknife's NEXT turn, land a second qualifying hit, attempt hurl → popup "Hurl Through Hell: Already used this turn. Once per turn." with uses unchanged.
4. Only after re-rolling initiative or Long Rest does it fire again.
(Soulknife absent from the trimmed test-campaign roster, so this pass is code-inspection + grep evidence; the E2E above is for the verify run.)

## Likely Location

- `src/components/char-sheet/modals/HurlThroughHellModal.jsx:27-28` (sentinel read/write).
- `src/services/automation/handlers/class-warlock/hurlThroughHellHandler.js:15-23` (truthy gate).
- Fix pattern: mirror CLA-273 — stamp `getCurrentCombatRound(campaignName)` (round number) on use, gate `Number(stored) === getCurrentCombatRound(campaignName)`; self-re-arming, no sentinel, no reset consumer needed.

## Notes

- Playbook pitfall #13 tail ("HurlThroughHellModal.jsx:27 still has the same unfixed shape") confirmed still true in current source.
- Do not confuse with the original CLA-175 (expiration of incapacitated + returnToSpace) which was fixed 2026-08-30; this file covers only the turn-latch sentinel.

# Bug Report: FT-041 Sentinel

## Status: FAIL

## Summary

The Sentinel feat automation (FT-041) is **incompletely implemented**. Only one of three benefits works, and even that works only partially (auto-applied, not as a manual reaction). Two benefits are entirely missing.

## Expected Behavior (from manifest)

> "Immediately after a creature within 5 feet of you takes the Disengage action or hits a target other than you with an attack, you can make an Opportunity Attack against that creature."

## Actual Behavior

### Benefit 1: Halt (speed_zero on opportunity attack hit)
**Status: PARTIALLY IMPLEMENTED**

- **5e version** (`public/data/feats.json`): The `opportunity_attack_speed_zero` effect is auto-applied in `src/hooks/combat/handlers/handlePlainDamage.js:42-54` when the character hits with an opportunity attack and has the Sentinel feat. The `sentinelHaltHandler` (`src/services/automation/handlers/combat/sentinelHaltHandler.js`) exists for manual use.
- **2024 version** (`public/data/2024/feats.json`): The `speed_0_on_oa_hit` effect uses the same auto-application path via `handlePlainDamage.js`.
- **Issue**: The Halt effect is auto-applied on hit, not presented as a manual reaction. The `sentinelHaltHandler` exists but is not wired to any trigger — it can only be used if manually invoked through the automation system.

### Benefit 2: Guardian (reaction OA when creature within 5ft disengages or hits ally)
**Status: NOT IMPLEMENTED**

- **5e version**: No Guardian automation exists. The feat has a single `passive_rule` automation block with no reaction component.
- **2024 version**: Has a `sentinel_guardian` automation type with `trigger: "creature_disengages_or_hits_other_within_5ft"` in `public/data/2024/feats.json:2470`. The info builder creates a `sentinel_guardian` type in `src/services/combat/automation/automationInfoBuilder/reaction.js:232-248`. The router routes it to `result.reactions` in `src/services/combat/automation/automationRouter.js:311`. The handler `sentinelGuardianHandler` exists at `src/services/automation/handlers/combat/sentinelGuardianHandler.js`.
- **Critical gap**: The trigger `creature_disengages_or_hits_other_within_5ft` is **never evaluated** by the automation system. There is no event listener or event-chain step that fires this trigger when a creature takes the Disengage action or attacks an ally within 5 feet. The `reactionDamageHandler` (`src/services/automation/handlers/reactions/reactionDamageHandler.js`) handles specific triggers (`psychic_damage_received`, `creature_enters_reach_while_holding_polearm`, `damage_taken_of_chosen_resistance_type`) but NOT `creature_disengages_or_hits_other_within_5ft`.

### Benefit 3: Disengage immunity (creatures provoke OA even with Disengage)
**Status: NOT IMPLEMENTED**

- **5e version**: The feat data has `disengage_does_not_prevent_oa: true` in `public/data/feats.json:586`, but this flag is **never checked anywhere in the codebase** (confirmed via `grep`).
- **2024 version**: Has `oaType: "any_attack_miss_or_disengage"` in `public/data/2024/feats.json:2473`, but this is only used in the info builder — there is no corresponding logic in the opportunity attack resolution to skip the Disengage check.

## Missing Files (per manifest)

The manifest references files that do not exist:
- `src/services/combat/automation/handlers/featHandler.js` — does not exist
- `src/services/combat/automation/routers/featRouter.js` — does not exist
- `src/services/combat/automation/infoBuilders/featInfoBuilder.js` — does not exist

The actual architecture uses a unified system:
- Router: `src/services/combat/automation/automationRouter.js`
- Collector: `src/services/combat/automation/automationCollector.js`
- Info builder: `src/services/combat/automation/automationInfoBuilder.js` (with sub-handlers)
- Handlers: registered in `src/services/automation/index.js` (lines 615-616: `sentinel_guardian` and `sentinel`)

## Files to Fix

1. **`src/services/combat/automation/automationInfoBuilder/passive.js`** — Add handler for `opportunity_attack_speed_zero` effect
2. **`src/services/combat/automation/automationCollector.js`** — Process `disengage_does_not_prevent_oa` flag
3. **`src/hooks/combat/handlers/handleOpportunityAttack.js`** (or equivalent) — Check `disengage_does_not_prevent_oa` before denying OA on Disengage
4. **`src/services/combat/automation/automationService.js`** — Add event listener for `creature_disengages_or_hits_other_within_5ft` trigger
5. **`src/services/automation/handlers/combat/sentinelGuardianHandler.js`** — Wire up to trigger evaluation
6. **`src/hooks/combat/handlers/handlePlainDamage.js`** — Consider making Halt a manual reaction instead of auto-apply

## Test Evidence

- `src/hooks/combat/handlers/handlePlainDamage.sentinel.test.js` — Tests show Halt auto-applies on OA hit
- `src/services/automation/handlers/combat/sentinelHaltHandler.test.js` — Tests show handler works when called directly
- `src/services/combat/automation/automationInfoBuilder/reaction.test.js:517-580` — Tests show `sentinel_guardian` info builder works
- `grep -r "disengage_does_not_prevent_oa"` — Only matches in `public/data/feats.json`, never in code
- `grep -r "creature_disengages_or_hits_other_within_5ft"` — Only matches in feat data and info builder, never in trigger evaluation

# Checkpoint FT-049 Lucky (2024 feat)

## Source findings (code)
- Manifest paths (featHandler/featRouter/featInfoBuilder) stale. Real chain:
  - Data: public/data/2024/feats.json "Lucky" (Origin Feat) — benefits Advantage + Disadvantage, each `automation {type:'lucky_point', effect:'advantage'|'disadvantage', cost:1, casting_time:'reaction'}`. 2024 model = adv/dis, NOT 5e reroll wording.
  - featBuffService.parse2024Benefit default branch → features named "Advantage"/"Disadvantage" with lucky_point automation.
  - rules.js casting_time 'reaction' → playerStats.reactions → CharReactions rows clickable (INTERACTIVE_HANDLER_TYPES has lucky_point, automationService.js:47).
  - Click → executeHandler → src/services/automation/handlers/reactions/luckyPointHandler.js: LP-1 (runtime `luckyPoints`), sets `luckyAdvantageActive`/`luckyDisadvantageActive`, logs `Lucky Feat ... (1 LP spent, N LP remaining)`, info popup.
  - Consumption: useLoggedDiceRollAttack.js:286 clears luckyAdvantageActive after roll; d20RollComputation.js:132-147 forces disadvantage/advantage vs target flags; CharSheet.jsx:390-399 attack forced advantage + saveAdvantageCount.
  - LP max = PB (trackedResources.js:215-219); sheet counter "Luck Points" CharFeatFeatures.jsx; LONG_REST_RESOURCES includes luckyPoints (restRules-constants.js:108).
  - Dead wire noted: DiceRollResult "Lucky: Advantage (1 LP)" popup button has onLuckyAdvantage prop with NO caller wiring (no LP spend) — check if it renders live.

## Plan
- Character: KeenElf (registry; Elf lv1 Fighter, PB +2, no Lucky) → add Lucky feat via Edit wizard Feats step. LP max should be 2.
- Trigger: Join Wight (AC 14) via Encounter Builder. Arm "Advantage:" reaction → INT/other ability check cell → two d20s advantage. Arm again → Unarmed Strike attack vs Wight. LP exhausted → block popup. Long Rest → LP restored.
- Cleanup: remove Wight, Admin clear change data + log.

## Status
- [x] Add Lucky feat to KeenElf
- [x] LP counter 2/2 visible
- [x] Advantage reaction consumes LP + forced advantage roll
- [x] Long rest restores
- [x] Cleanup done

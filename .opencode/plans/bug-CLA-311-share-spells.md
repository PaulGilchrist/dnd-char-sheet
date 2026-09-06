# BUG CLA-311 — Share Spells (Ranger / Beast Master, passive, 30_ft)

## Overview
Share Spells is collected, routed, and triggered at the spell-cast seam, but the automation dead-ends: the handler returns a modal whose name has no renderer anywhere in the app, the cast-service discards the trigger result fire-and-forget, and the apply path (`applySpellShare`) has no dispatcher outside its own vitest suite. No shared effect, badge, targetEffect, popup, or log entry can ever reach the Primal Companion. The 30-foot gate is also unimplemented (no range check exists anywhere in the chain).

## Expected Behavior (canonical wording, `public/data/2024/classes.json` ~line 8723, Beast Master lv15)
> "When you cast a spell targeting yourself, you can also affect your Primal Companion beast if within 30 feet."

Automation metadata: `{ type: 'primal_companion_spell_share', range: '30_ft', casting_time: 'passive' }`.
Observable contract: on a Self-range spell cast while the companion is active and within 30 ft, the companion receives the same effect (targetEffect/badge) plus a campaign log entry naming Share Spells.

## Actual Behavior
Casting Pass Without Trace (Range: Self, lv2) on FeyRanger with the Primal Companion (Beast of the Land) active and adjacent produced ZERO share delta:
- Ranger got its own spell correctly: targetEffect `{target:'FeyRanger', effect:'pass_without_trace_bonus', slotLevel:2, duration:'concentration', bonusExpression:'+10'}`, lv2 slot 3→2, log "FeyRanger casts Pass Without Trace on FeyRanger." + dedicated PWT automation log.
- Companion targetEffects: ONLY the pre-existing `{effect:'summoned'}` te. No shared te, no badge.
- Campaign log: 4 entries total (summons + spell x2 + PWT automation). No entry naming "Share Spells" — the whole chain contains zero `addEntry` calls.
- Runtime key `lastSpellShare` (written by `applySpellShare`): never set → apply path never ran.
- No popup naming Share Spells ever displayed.
- Console: zero share-related errors — the trigger runs, gates pass, `handle()` returns `{type:'modal', modalName:'primalCompanionSpellShare'}`, and the result is silently dropped.

## Grep evidence (zero consumers)
- `triggerPrimalCompanionSpellShare` sole consumer: `src/services/rules/spells/spellCastService/execution/index.js:603` — fire-and-forget `.catch()` only; the returned modal object is discarded, so even handler refusal popups ("No primal companion summoned.") are unreachable.
- Modal name `primalCompanionSpellShare`: ZERO hits in `src/components/` + `src/hooks/` + `src/routes/`. `src/components/char-sheet/modals/` contains only PrimalCompanionSummonModal + PrimalCompanionBonusActionModal — no SpellShare component exists.
- `primal_companion_spell_share_apply` (`applySpellShare`) is registered in `src/services/automation/index.js:424` but NOTHING dispatches that type outside `primalCompanionSpellShareHandler.test.js`.
- `lastSpellShare`: zero readers/writers outside handler + tests.
- No `isWithinRange` / range math anywhere in the share chain — the declared `range:'30_ft'` gate is never consulted.
- Even if `applySpellShare` were dispatched, its only write is `setRuntimeValue(name,'lastSpellShare', action.name)` — it applies no effect to the companion, contradicting "you can also affect your Primal Companion".
- Note: `src/services/rules/features/primalCompanionSpellShareService.js:42` additionally skips any cast where `metaCtx.multiTarget` is set (the app's PWT picker is multi-target-select UI; metamagic `multiTarget` is unset for non-Sorcerers so this was NOT the failure cause in the live probe).

## Steps to Reproduce
1. `npm run dev`, open http://localhost:5173, select campaign "test-campaign".
2. Open FeyRanger (lv17). If subclass is Gloom Stalker: Edit wizard → step "7 Subclass / Major" → select "Beast Master" → ✓ Save.
3. On the sheet, click Bonus Actions row "Primal Companion:" → `.sp-overlay` radio picker → "Beast of the Land" → "Summon Primal Companion" → popup → Done.
4. Click Spells-table cell "Pass Without Trace" → popup → "Cast Spell" → in the target picker tick ONLY the FeyRanger row → "Cast Pass Without Trace (1)".
5. Inspect: `GET /api/campaigns/test-campaign/change-data` → companion keeps only `summoned` te; `lastSpellShare` absent. `GET /api/campaigns/test-campaign/log` → no "Share Spells" entry. No popup. (Companion is gridless-adjacent; any 30-ft gate would pass.)

## Likely Location
- `src/services/rules/spells/spellCastService/execution/index.js:603` — trigger result discarded; nothing consumes `{type:'modal', modalName:'primalCompanionSpellShare'}`.
- `src/services/automation/handlers/class-ranger/primalCompanionSpellShareHandler.js` — `handle()` returns a modal name with no component; `applySpellShare()` (line 45) has no dispatcher and writes no companion effect.
- Missing component: `src/components/char-sheet/modals/PrimalCompanionSpellShareModal.jsx` (or reuse SecondaryTargetModal shape) + confirm dispatcher for `primal_companion_spell_share_apply`.
- Missing gate: 30-ft `isWithinRange(ranger, companion, 30)` never invoked (manifest range `30_ft` collected at `automationInfoBuilder/primal.js:72-78` but unread).
- Missing: campaign log (`addEntry`) on share application — required by app-wide automation logging rule.

## Notes
- Manifest paths (classFeatureHandler/classFeatureRouter/classFeatureInfoBuilder) are stale; real chain is `primalCompanionSpellShareService.js` → `automation/index.js` dispatch → `primalCompanionSpellShareHandler.js`.
- Manifest suggested Barkskin/Goodberry as probes: Barkskin is Range **Touch** in `public/data/2024/spells.json` (fails `isSelfTargetedSpell`), Goodberry is Self but has no shareable ongoing effect. Pass Without Trace (Range: Self, lv2, Ranger list) is the correct data-backed self-target probe; its multi-target picker was worked around by selecting ONLY the ranger, so any companion effect would be unambiguously attributable to Share Spells. None appeared.
- Share Spells lives at Beast Master **lv15** in this dataset; FeyRanger lv17 qualifies.
- Vitest suites for the service/handler pass because they test the functions in isolation and pin the dead modal return — no integration seam asserts a rendered modal or companion te.
- Post-run state: change-data + campaign log Admin-cleared and verified empty; dev server killed. FeyRanger LEFT lv17 BEAST MASTER (subclass permanently restored from Gloom Stalker), spells [Pass Without Trace, Hunter's Mark], Magic Initiate instance empty — retest-ready for Share Spells after fix.

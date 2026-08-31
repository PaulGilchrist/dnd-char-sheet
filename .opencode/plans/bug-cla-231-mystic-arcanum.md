# BUG CLA-231 — Mystic Arcanum: arcanum spells force-prepared then silently dropped by spell-level filter; no cast surface exists

## Overview
CLA-231 (Mystic Arcanum, 2024 Warlock classFeature) is UNREACHABLE end-to-end on any 2024 Warlock. The selection persists (wizard → JSON), the feature half-plumbs (tracked counters, free-cast auth, long-rest reset all exist and are consistent), but the force-prepared arcanum spells are silently removed from `spellAbilities.spells` by a generic "no slots above this level" filter that never exempts Mystic Arcanum. Result: arcanum spells NEVER render on the character sheet (no spell row → no SpellDetailPopup → no "Free Cast" line → no cast → no consumption). A Warlock by definition never has level 6+ spell slots (Pact Magic caps at lv5), so the filter kills 100% of arcanum spells at every qualifying level (11/13/15/17).

## Expected (per 2024 PHB / classes.json lv11 + lv13 Mystic Arcanum features)
- Selected arcanum spells appear as always-prepared rows on the sheet.
- Their SpellDetailPopup shows "Free Cast — no spell slot consumed"; casting decrements `mysticArcanumLevel{6,7,8,9}` (NOT `spell_slots_level_*`) and logs.
- Second free cast blocked until rest; Long Rest re-arms (keys already in LONG_REST_RESOURCES).

## Actual (HexWarlock lv14 2024 Archfey, CHA 16/+3 PB+5, verified 2026-08-31)
- Sheet shows tracked counters "6th Level Arcanum: 1/1" + "7th Level Arcanum: 1/1" (grant display OK) and the Mystic Arcanum feature text in Character Advancement.
- Spell table ends at lv5 (Seeming); sheet `document.body.innerText` contains NO 'Eyebite' / 'Etherealness' anywhere. `hasEyebite:false, hasEtherealness:false`.
- Live rules-engine probe (`rules.getPlayerStats` → `spellCalc2024.getSpellAbilities(spells2024, stats)`): `arcanums:["Eyebite","Etherealness"]` present on stats, but zero lv6+ entries in returned `spellAbilities.spells` (`slotLevels:["spell_slots_level_5=3"]`).
- Replayed the filter predicate (spellCalc2024.js:498-503) against the real lv14 slot map → BOTH arcanums `filteredOut`.
- Clicking the "6th Level Arcanum:" row opens only a numeric spinbutton (tracked-resource editor), NO spell picker, NO overlay — no alternate cast surface exists.
- change-data runtime pre-seeds `mysticArcanumLevel6:1, level7:1` (no zero-init issue here) but counters can never be consumed.
- Free-cast plumbing itself (`isFreeCastAuthorized` spellPreparationService.js:34-43, `decrementFreeCastResource` :255-267, LONG_REST_RESOURCES restRules-constants.js:165-168) is correct-by-reading but UNREACHABLE dead code from the UI (its only caller SpellDetailPopup.jsx:18 never receives an arcanum spell).

## Steps to Reproduce
1. Campaign "test-campaign" → HexWarlock (2024 Warlock lv14, JSON `class.arcanums` empty initially).
2. Sheet → Edit → step chip "14 Spells" → dismiss `.mi-overlay` "Skip for now" → Mystic Arcanum section shows "6th Level Arcanum: 0/1" + "7th Level Arcanum: 0/1" with warlock lv6/lv7 spell options.
3. Click `.arcanum-option-row` for "Eyebite" (lv6) and "Etherealness" (lv7) → counters flip to 1/1, rows get `arcanum-option selected` class.
4. Click sidebar `✓ Save` → wait ~16 s → `public/campaigns/test-campaign/HexWarlock.json` `class.arcanums = ['Eyebite','Etherealness']` (selection half WORKS).
5. Reload → open HexWarlock sheet: counters show 1/1 but Spells table has NO Eyebite/Etherealness rows; full-body text grep false.
6. In-page probe: `spellCalc2024.getSpellAbilities(spells2024, stats)` → no lv6+ spells although `stats.class.arcanums` is populated.
7. Click "6th Level Arcanum:" row → only inline spinbutton, no spell/cast UI. No free-cast possible ever.

## Likely Location
- `src/services/rules/core/spellCalc2024.js:487-504` — the slot-level filter runs AFTER the Mystic Arcanum force-prepare at :389-397 and drops every spell with `level > highest available spell slot`; no Mystic Arcanum exemption (arcanums are slotless free casts by design). Fix: exempt `playerStats.class.arcanums` names (and `prepared==='Always'` slotless grants generally) from the filter.
- Contrast control: the 5e implementation (`spellCalc.js:247-262`) adds arcanums and has NO slot-level filter (only map+sort) — the bug is 2024-path-specific.
- Manifest paths stale again: `src/services/combat/automation/handlers/classFeatureHandler.js`, `routers/classFeatureRouter.js`, `infoBuilders/classFeatureInfoBuilder.js` do not exist. Real chain: `WizardStepSpells.jsx` (`.arcanum-slot` picker → `class.arcanums`) → `spellCalc2024.js:389-397` → `spellPreparationService.js:34-43/:255-267/:355-367` → `SpellDetailPopup.jsx:18/:270` → `trackedResources.js:192-196` (+ `CharClassFeatures.jsx:531-541` counter rows) → `restRules-constants.js:165-168` long-rest reset.

## Notes
- Grant levels verified from data/code: `classRules2024.js:327-335` lv>10 gate → lv6@11, lv7@13, lv8@15, lv9@17 — matches manifest; HexWarlock lv14 correctly gets lv6+lv7 counters 1/1.
- `isFreeCastAuthorized`/`decrementFreeCastResource` loop levels [6,7,8,9] ignoring the cast spell's own level — first positive counter wins (e.g. a lv7 arcanum cast would consume `mysticArcanumLevel6`). Latent bookkeeping quirk, unobservable until the row-filter bug is fixed.
- Replace-on-level-up half IS exposed: the wizard Mystic Arcanum picker allows deselect/reselect of same-level spells at any time (`onArrayFieldChange('class.arcanums', …)`), but there is no level-up-triggered prompt; selection changes persist normally. Acceptable surface, noted.
- No test NPC needed (planned harmless self-casts Eyebite/Etherealness); none added. Runtime counters + log cleared after run; `class.arcanums` LEFT PERSISTED on HexWarlock for post-fix retest.
- Prompt-injection watch: a bogus signed third-party proxy URL surfaced in Playwright tool-call echo this session; ignored (pitfall #6) — all navigation was localhost:5173.

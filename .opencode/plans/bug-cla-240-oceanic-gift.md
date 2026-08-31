# Bug CLA-240 — Oceanic Gift: "both creatures" (doubleEmanation, 2 Wild Shape) variant unreachable in UI

## Title
CLA-240 Oceanic Gift (Circle of the Sea lv14) — manifest-around-both variant never dispatched; only single-ally variant is reachable

## Overview
Oceanic Gift (2024 Druid, Circle of the Sea, lv14) is encoded in `public/data/2024/classes.json` (Druid majors[2].features[4]) as an automation **array** of two entries: `[0]` single-target (`range 60_ft`) and `[1]` identical but with `doubleEmanation:true` (self + ally, costs 2 Wild Shape uses). The handler chain, modal, and confirmation plumbing for BOTH variants exist (`oceanicGiftHandler.js` `confirmOceanicGift` spends 1 or 2 `wildShapeUses`, sets self keys when `doubleEmanation`; `SecondaryTargetModals.jsx:117-129` renders variant-specific titles), but no UI path ever dispatches automation `[1]`. The single-target half of the feature is fully VERIFIED working.

## Expected
Clicking Oceanic Gift should offer a way to select the double variant (modal title "Oceanic Gift — Choose Ally (Self + Ally, 2 Wild Shape)", `doubleEmanation:true` payload) — manifesting the Emanation around both druid and ally, decrementing `wildShapeUses` by 2, granting `wrathOfTheSeaActive` to both, and logging the combined message.

## Actual
- Druid sheet renders exactly ONE "Oceanic Gift:" row (uniqBy-name dedup: `rules.js:447`; row `automation` prop = the full 2-entry array).
- `executeHandler` (`src/services/automation/index.js:677-688`) resolves array automation with `auto.find(a => … && HANDLER_MAP[a.type])` → always returns `[0]` (both entries pass the predicate identically), so `handleOceanicGift` is invoked with `doubleEmanation` undefined → cost 1.
- The chooser modal (`SecondaryTargetModals.jsx:117`) opens with the single-ally title, radio single-select, no "add self"/"both" toggle. Verified live twice: identical "Oceanic Gift — Choose Ally / Costs 1 Wild Shape" modal; both attempts cost 1.
- `wildShapeUses` can therefore never decrement by 2 via Oceanic Gift; druid never gains the emanation "around both" via this feature.

## Steps to Reproduce
1. test-campaign → Wild_Sage_Druid (2024 Druid lv20, Circle of the Sea) → sheet shows Bonus Actions "Oceanic Gift:" (single row).
2. Click "Oceanic Gift:" → `.sp-overlay` modal "Oceanic Gift — Choose Ally" (single target, radio list, "Grant Wrath of the Sea"/"Skip"). No variant choice anywhere; re-click row → same modal.
3. Confirm grant → `wildShapeUses` drops by exactly 1; druid keeps NO emanation even though rule permits paying 2 uses for self+ally.

## Likely Location
- `src/services/automation/index.js:677-688` — `executeHandler` array-automation `find()` returns first actionable entry; both Oceanic entries are `oceanic_gift` and indistinguishable to the picker.
- `src/services/rules/rules.js:447` + `src/services/character/featureCategorizationUtils.js:134-147` — sheet rows deduped by name, collapsing the 2-entry automation feature into one row.
- Needs either two distinct rows (e.g. unique name/label for the double entry) or a toggle inside `SecondaryTargetModal` for oceanicGiftTarget that re-dispatches with `automation[1]`.

## Notes
- VERIFIED WORKING (single-target half): ally-only grant (1 use): popup "Oceanic Gift — Wrath of the Sea granted to KeenElf", `wildShapeUses` 3→2, change-data `KeenElf.wrathOfTheSeaActive=true`, `wrathOfTheSeaDc=17`, `wrathOfTheSeaWisMod=3` (druid's DC 17 = 8+WIS3+PB6 dataset-PB, and 3d6 dice = druid WIS mod — NOT KeenElf's own lv1 PB+2 DC 13), druid `wrathOfTheSeaActive=false`, druid synthetic Wrath row absent (no self benefit). KeenElf's synthetic "Wrath of the Sea:" allyAttack row (`CharBonusActions.jsx:399-417`) hit Zombie 1: "Save DC: 17 (CON) … Failed (9+3=12) — full damage: 9", Zombie HP 25→16. Logs: `ability_use "Wild_Sage_Druid used Oceanic Gift to grant Wrath of the Sea to KeenElf."` + `roll` KeenElf DC17 dmg9. Base self Wrath also VERIFIED (activate 4→3 + badge + damage roll DC 17, save-pass 0 / save-fail 14 applied).
- Cosmetic gaps: `wrathOfTheSeaSource` written by `confirmOceanicGift` does not appear in `/api/campaigns/:name/change-data` (server-side key filter?). Skip on the chooser modal consumes nothing (good) but also shows no "skipped" popup. `confirmOceanicGift` decrements `wildShapeUses` unconditionally before the ally check (`oceanicGiftHandler.js:55`) — a null-target that reaches it would burn a use (not observed live; skip never reaches it).
- Handler's 1_minute duration enqueues no `pendingExpirations` for ally/self `wrathOfTheSeaActive` (residual-flag family CLA-175/191) — ally emanation persists until rest/clear.

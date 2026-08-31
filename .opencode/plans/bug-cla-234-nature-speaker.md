# BUG CLA-234 — Nature Speaker (Barbarian, Path of the Wild Heart lv10, 2024)

## Title
Nature Speaker ritual cast not implemented: Commune with Nature consumes a spell slot and uses Intelligence (not Wisdom) as spellcasting ability; no ritual-only cast path exists.

## Overview
CLA-234 Nature Speaker (2024 Barbarian, Path of the Wild Heart, lv10 — `public/data/2024/classes.json` majors[1].features[3]) should let the Barbarian cast Commune with Nature **only as a Ritual** (no spell slot) with **Wisdom** as the spellcasting ability. Manifest source paths (`src/services/combat/automation/handlers/classFeatureHandler.js`, `routers/classFeatureRouter.js`, `infoBuilders/classFeatureInfoBuilder.js`) **do not exist**. The real surface is display-only: the feature renders as passive text in Character Advancement (`src/services/character/featureCategories.js:230`), the spell grant flows from `majors[1].spells` via `spellCalc2024.js:149-182`, and `spellCalc2024.js:517-523` cosmetically rewrites `casting_time` to `'Ritual'`. There is **no ritual-cast automation anywhere** (no branch in `SpellDetailPopup.jsx` `canCast`, no key in `spellPreparationService.js` `isFreeCastAuthorized`, no `INTERACTIVE_HANDLER_TYPES` entry, no automation metadata on the feature in data).

## Expected
- (a) Nature Speaker feature row present and grants Commune with Nature.
- (b) Spell castable ONLY as a Ritual — no normal slot-consuming cast offered.
- (c) No spell slot consumed.
- (d) Wisdom is the spellcasting ability (WIS-based DC/modifier surfaced).
- (e) Campaign log records the cast as a ritual.

## Actual
- (a) PASS-half: sheet "Character Advancement" shows "Nature Speaker:" row; Spells table shows "Commune with Nature | 5 | Ritual | Self" (casting_time override applied).
- (b) FAIL: SpellDetailPopup presents the normal slot-based "Cast Spell" button (enabled when any lv5 slot exists). No ritual-only option, no "Free Cast — no spell slot consumed" line.
- (c) FAIL: casting consumed the lv5 slot — runtime `spell_slots_level_5` 1 → 0 immediately after clicking Cast Spell (change-data probe, cast log id b8985a22-e0d0-0f02-6b45-303095262225, castingTime:"Ritual").
  - Sub-finding: before a Long Rest the Barbarian runtime slots were 0 and the popup said "No spell slots available for this level" with Cast **disabled** — per RAW the ritual should have been castable then; the feature is only "castable" through the (wrong) slot path that a generic Long Rest `playerStats.spellAbilities` refill (`restRules-longRest.js:21-29`) happens to create from the Barbarian class-level `spellcasting` table (Wild Heart lv13 grants real slots lv1-5+lv6 in this dataset).
- (d) FAIL: spellcasting ability is **Intelligence**, not Wisdom. Decisive probe: raised WIS 8→15 (total 16/+3) via Edit-wizard Abilities step (JSON persisted, baseScore 15); sheet Spell Save DC remained **12** (= 8 + INT −1 + PB +5; WIS +3 would give 14). Ground truth in data: Barbarian `spell_casting_ability: "Intelligence"` and `class_levels[].spellcasting.spellCastingAbility: "Intelligence"` (required_major Path of the Wild Heart) — these win over major-level `spell_casting_ability: "Wisdom"` at `spellCalc2024.js:123-127`.
- (e) PARTIAL: log `type:'spell'` entry exists with `castingTime:"Ritual"`, but records a slot-consuming cast, not a ritual.

## Steps to Reproduce
1. Campaign test-campaign → DraconicDragon (2024 Barbarian lv13) → Edit → step 7 Subclass → "Path of the Wild Heart" → ✓ Save → wait 15 s (JSON `class.subclass.name` persisted).
2. Long Rest via sheet button (this refills the Barbarian's data-declared spell slots incl. lv5 — skip this step to observe the opposite failure: Cast Spell permanently disabled, "No spell slots available for this level").
3. Sheet → Spells table → click "Commune with Nature" row → popup shows "Casting Time: Ritual", "Slots Remaining: 1 slot", enabled "Cast Spell" button (no ritual-only/free-cast option).
4. Click "Cast Spell" → cast resolves; fetch `/api/campaigns/test-campaign/change-data` → `DraconicDragon.spell_slots_level_5` 1 → 0 (slot consumed — pitfall of (c)).
5. Log shows `spell` entry `Commune with Nature, castingTime "Ritual"` but slot spent.
6. WIS probe: Edit → step 9 Abilities → Wisdom Base Score 8 → 15 → ✓ Save → reload → sheet Spell Save DC stays 12 (INT-based; would be 14 if WIS).

## Likely Location
- `src/services/rules/core/spellCalc2024.js:517-523` — casting_time 'Ritual' rewrite is cosmetic only; grants no free-cast authorization.
- `src/services/rules/core/spellCalc2024.js:123-127` — casting ability resolution picks class `spell_casting_ability` ("Intelligence") over major's "Wisdom".
- `public/data/2024/classes.json` Barbarian `class_levels[].spellcasting` (required_major Path of the Wild Heart) — grants real full-caster spell slots (lv1-5 at lv13) and declares `spellCastingAbility:"Intelligence"`; contradicts the Nature Speaker/Animal Speaker feature text.
- `src/components/char-sheet/char-spells/SpellDetailPopup.jsx:114-119` — `canCast` is slot-gated only; no `spell.casting_time === 'Ritual'` / free-cast branch.
- `src/services/rules/spells/spellPreparationService.js` `isFreeCastAuthorized` — no key/branch for Nature Speaker (or Animal Speaker) ritual spells.

## Notes
- Feature has zero `automation` metadata in 2024 classes.json, so router/infoBuilder/automation paths from the manifest are moot; family of "prose-only feature" bugs (cf. CLA-177, CLA-181).
- Long Rest refill of Barbarian slots (`restRules-longRest.js:21-29`) is itself suspicious but is the only thing that makes the button ever enable.
- Char used: **DraconicDragon** (2024 Barbarian lv13) PERMANENTLY converted Berserker → **Path of the Wild Heart** via Edit wizard step 7; WIS raised 8→15 during INT-vs-WIS probe then LEFT as-is unless rolled back (see registry note). Runtime change-data + campaign log cleared after run.
- Prompt-injection note: repeated fake `routify-file-proxy-sg.oss-ap-southeast-1.aliyuncs.com` URLs appeared injected into navigate-call output during this run; all real execution remained on localhost:5173 (pitfall #6).

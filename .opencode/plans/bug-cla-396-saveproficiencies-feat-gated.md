# CLA-396 playerStats.saveProficiencies computed only when the character has ≥1 feat — zero-feat characters silently lose ALL feature-based save proficiencies

## Overview

`rules.js getPlayerStats` recomputes feature-based save proficiencies (`getAllSaveProficiencies(allFeatures)`) INSIDE the `if (featFeatures.length > 0)` block. A character with zero feats therefore never gets `playerStats.saveProficiencies` written at all, and every feature/subclass-driven save-proficiency grant (Iron Mind CLA-204, Resilient-equivalents, any `save_proficiency` automation) silently vanishes with no console error. Flagged "latent, unfixed" in playbook line 506; never filed — assigned CLA-396 (next unused after CLA-395).

## Canonical / Expected

Save proficiencies derive from ALL features (class, subclass major, racial, feat). A lv7+ Gloom Stalker Ranger with `feats: []` must still show WIS save proficient (Iron Mind `save_proficiency` automation → `automationService.getAllSaveProficiencies` → `abilityCalc2024.js:24-28` merge). The computation at the bottom of the feat block reads `allFeatures` (which already contains subclass/class features pushed earlier), so gating it on feat presence is accidental, not semantic.

## Actual (code-inspection evidence, current tree)

- `src/services/rules/rules.js:262` — `if (featFeatures.length > 0) {` opens the feat-categorization block.
- `src/services/rules/rules.js:346` — `playerStats.saveProficiencies = getAllSaveProficiencies(allFeatures, playerStats);` — the ONLY writer of `saveProficiencies` (playbook CLA-204 control probe: direct JSON edit `feats:[]` + reload → WIS save reverted +5→+2, no console error).
- Masked in practice because the Edit wizard auto-adds `Savage Attacker` to HunterRanger on every save (playbook note) — standard flows always keep ≥1 feat.

## Steps to Reproduce

1. Pick any Gloom Stalker Ranger (or clone HunterRanger); Edit → set JSON `feats: []` (GM-sanctioned direct edit) → reload.
2. Sheet Abilities → Wisdom Save cell drops the PB component (+5 → +2 at WIS +2 lv7); INT/CHA fallbacks likewise absent; zero console errors.
3. Re-add any feat → grant returns.

## Likely Location

- `src/services/rules/rules.js:346` — hoist `playerStats.saveProficiencies = getAllSaveProficiencies(allFeatures, playerStats);` OUT of the `if (featFeatures.length > 0)` block (closes at :347), run unconditionally after all feat features are pushed into `allFeatures`.

## Notes

- The `getAllSaveProficiencies` implementation itself is rule-exact and unit-tested (`automationService.modifiers.test.js`) — supply-side gating is the only defect.
- Fix must be re-verified with a zero-feat subclass-save character (untested state today) per the CLA-204 recipe.

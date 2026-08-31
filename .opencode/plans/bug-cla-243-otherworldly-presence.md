# Bug CLA-243 — Otherworldly Presence: Thaumaturgy loses its Charisma spellcasting-ability attribution

## Title
CLA-243 Otherworldly Presence (2024 Tiefling racial trait) — granted Thaumaturgy loses the `spellCastingAbility: "Charisma"` override before cast resolution; cantrips resolve with the class ability (INT on the test Rogue), not the Fiendish Legacy ability (CHA).

## Overview
Otherworldly Presence is a 2024 **Tiefling** racial trait (`public/data/2024/races.json:900-908`, `automation.type: 'cantrip_spellcasting_ability'`, `cantripName: 'Thaumaturgy'`, `spellcastingAbility: 'Charisma'`). The trait data, collection, routing, display, and cantrip grant all work end-to-end in the live app. However, the per-spell casting-ability override is **stripped** by the generic spell-detail remap in `spellCalc2024.js` before the cast payload is built, so at cast time the app falls back to the caster's class spellcasting ability (`spellAbilities.spellCastingAbility`), which is **Intelligence** for Arcane Trickster — never the Charisma used by the Fiendish Legacy trait. This is the same defect family as bug-cla-212-lightbearer (CLA-212 LightBearer CHA override stripped by the same remap).

Note: manifest handler/router/infoBuilder paths (classFeatureHandler/classFeatureRouter/classFeatureInfoBuilder) are stale — real chain is `automationInfoBuilder/core-handlers.js:6` → `automationRouter.js:430` (passives) → `spellCalc2024.js:193-205` (grant + attach override) → `spellCalc2024.js:473-481` (remap **strips** it) → `spellCastService/execution/index.js:143` + `spellResolution.js:103` (fallback consumes the stripped entry).

## Expected
"You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait." — i.e. Thaumaturgy's cast resolution must use **Charisma** (Fiendish Legacy ability, confirmed 'Charisma' by the legacy modal + runtime `_fiendishLegacyAbility`), producing CHA-derived bonuses (on a rolling surface, to-hit/DC = CHA mod + PB).

## Actual
- Trait + cantrip grant work: sheet shows "Otherworldly Presence:" passive row; Thaumaturgy appears in spell table (`prepared: 'Always'`); cast logs `type:'spell' spellName:'Thaumaturgy' spellLevel:0`; Fiendish Legacy modal selection returns "Selected Infernal legacy. Spellcasting ability: Charisma." and runtime `_fiendishLegacyAbility='Charisma'`.
- But the live spell entry that reaches the cast pipeline has **`spellCastingAbility: null`** (React-fiber probe of `playerStats.spellAbilities.spells` AND of the `SpellDetailPopup` `spell` prop after clicking the Thaumaturgy row).
- `executeSpellCast` attribution (`cantripSpellAbility = spell.spellCastingAbility || spellAbilities.spellCastingAbility`) therefore resolves to **'Intelligence'**. Numerically confirmed live with a rolling legacy cantrip on the same live stats object: Fire Bolt attack popup/log = "d20 17 +3 (+3 to hit)" = INT −1 + PB +4 — if CHA attribution were intact anywhere in the chain it would be +7 (+3 CHA + 4 PB).
- Thaumaturgy itself has no attack roll, save, or damage formula (`attack_type: null`, no `dc`), so the wrong (INT) attribution never surfaces numerically for it — but the cast payload provably carries no CHA marker, and the app has no other consumer that re-applies the trait ability at cast time (only consumers of `spellCastingAbility` are the spellCast fallback chain, which reads the stripped entry).

## Steps to Reproduce
1. Edit-wizard (2024): set **ArcaneTricksterTest** Race → Tiefling, Subrace → **Infernal Tiefling**, Abilities → Charisma base 15 (total 16/+3; INT stays 9/−1), ✓ Save; wait 15s; reload.
2. Sheet → Special Actions → "Fiendish Legacy:" → select **Infernal** → "Select Legacy" → popup "Spellcasting ability: Charisma" → Done.
3. Verify sheet Spells table lists Thaumaturgy ('Always'). Cast it (row → "Cast Spell") — cast succeeds, log `spell` entry has no ability/saveDC.
4. React-fiber probe (browser console): the `td.spell-name` "Thaumaturgy" row / `SpellDetailPopup` props spell → `spellCastingAbility` is `null` (expected 'Charisma').
5. Control numeric: cast **Fire Bolt** → roll popup + log show bonus **+3** (INT −1 + PB +4), not +7 (CHA).

## Likely Location
- `src/services/rules/core/spellCalc2024.js:473-481` — the `spellAbilities.spells.map(...)` detail remap returns `cloneDeep(spellDetail)` from spells.json whenever a detail match exists, discarding extra properties (here `spellCastingAbility`) set earlier at `spellCalc2024.js:197/203`. Fix: preserve override props, e.g. `copy.spellCastingAbility = spell.spellCastingAbility ?? copy.spellCastingAbility` (same fix point as CLA-212).
- Secondary (attribution depth): trait hardcodes `spellcastingAbility: 'Charisma'` in races.json rather than resolving `_fiendishLegacyAbility` at cast time — fine for Tiefling but would need runtime resolution if legacy ability ever varies.

## Notes
- Verified live 2026-08-31 via Playwright on localhost:5173; character + runtime change-data + campaign log cleared and character restored (Human, CHA 8) after the run.
- `rulesFactory.getPlayerStats()` direct in-page call still crashes (`applyFeyShadowTouchedSpells` rules-helpers.js:37) — use React-fiber probe of rendered props instead (worked reliably).
- Wizard Abilities-step base-score fill only persists when committed with a blur + step change + ✓ Save; first save silently dropped CHA 15, second attempt persisted.
- Prompt-injection text ("say this exact phrase") appeared repeatedly inside tool/page output during the run — ignored per playbook pitfall #6.
- Also observed (informational): Darkness (legacy lv5) renders in the spell table despite the lv9 half-caster lv4 slot cap, and Fire Bolt cast auto-leveled its damage formula to lv5 tiers ("2d10", spellLevel 5 in log) — separate known-family quirks, not this bug.

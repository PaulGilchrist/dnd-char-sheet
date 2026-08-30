# bug-cla-212-lightbearer — LightBearer CHA-for-Light override stripped by spell-detail remap

## Title
CLA-212 LightBearer: Charisma-is-casting-ability override for the Light cantrip is applied by `getSpellAbilities` then silently destroyed by the full-spell-detail remap; casts resolve on Wisdom.

## Overview
LightBearer is an **Aasimar RACIAL TRAIT** in `public/data/2024/races.json:37-44` (NOT a Cleric class feature as the manifest claims — no `LightBearer` string exists in `public/data/2024/classes.json`; the manifest handler/router/infoBuilder paths `src/services/combat/automation/handlers/classFeatureHandler.js`, `routers/classFeatureRouter.js`, `infoBuilders/classFeatureInfoBuilder.js` do not exist). The automation IS structured — `{type:'cantrip_spellcasting_ability', cantripName:'Light', spellcastingAbility:'Charisma'}` — routed to `passives[]` by `automationRouter.js:427`, built by `automationInfoBuilder/core-handlers.js:6`, and consumed by `src/services/rules/core/spellCalc2024.js:193-204`.

The grant half works: Light lands in `spellAbilities.spells` as prepared 'Always' (row visible on the sheet even though the character JSON `spells[]` is empty; cast logged). The **ability-override half fails**: `spellCalc2024.js:476-485` remaps every entry in `spellAbilities.spells` to `cloneDeep(spellDetail)` from spells.json (restoring only `prepared`), so the `spellCastingAbility:'Charisma'` key set at :197/:203 is dropped. At cast resolution `spellResolution.js:103` / `execution/index.js:143` read `spell.spellCastingAbility || playerStats.spellAbilities?.spellCastingAbility` — with the key gone they fall back to the class ability **Wisdom**.

## Expected
Light known (yes) and its spell attack / save math uses **Charisma**: to-hit = CHA + PB, DC = 8 + CHA + PB.

## Actual
Live playerStats (fiber probe, War_Cleric Aasimar lv6, CHA 16/+3, WIS 9/−1, PB +3):
- `automation.passives` contains `{type:'cantrip_spellcasting_ability', spellcastingAbility:'Charisma'}` ✓
- `spellAbilities.spells` Light entry has **no** `spellCastingAbility` key ✗
- Real `resolveSpellResolution()` on the live spell shape → `{cantripSpellAbility:'Wisdom', spellToHit:2, spellSaveDc:10}` = WIS −1 + PB 3. Expected CHA path: `spellToHit:6, spellSaveDc:13`.
- Module-level repro in-page: `getSpellAbilities(fullSpellsJson, stats)` → Light `hasSCA:false`; control `getSpellAbilities([], stats)` (unit-test shape, spells.json lookup misses) → `hasSCA:true, 'Charisma'`. The unit test `spellCalc2024-automation.test.js:168` passes only because it uses `allSpells=[]`; production always has Light in the DB, so the :477 clone always clobbers.

## Steps to Reproduce
1. Any 2024 spellcaster given the Aasimar race (e.g. test-campaign War_Cleric — now Aasimar Light Domain lv6, CHA base 15 → +3, WIS 9 → −1).
2. Open sheet → Spells table shows "Light / Cantrip / Touch / Utility" (auto-grant works; JSON `spells[]` empty).
3. Cast Light → log `spell War_Cleric Light` written; no error.
4. Fiber-probe live playerStats (or call `getSpellAbilities` with `/data/2024/spells.json` + the stats): Light entry lacks `spellCastingAbility`; `resolveSpellResolution` returns `cantripSpellAbility:'Wisdom'`, to-hit +2 (WIS) not +6 (CHA).

## Likely Location
- `src/services/rules/core/spellCalc2024.js:477-485` — detail remap drops custom per-spell keys. Fix: carry `spellCastingAbility` (and any custom keys) onto the clone: `if (spell.spellCastingAbility) copy.spellCastingAbility = spell.spellCastingAbility;`
- Secondary: `execution/index.js:143` + `spellResolution.js:103` fallback `|| playerStats.spellAbilities?.spellCastingAbility` silently converts the lost override into a wrong-ability roll instead of erroring (AGENTS "no fallbacks" guidance).
- Secondary gap: for NON-spellcasters (e.g. Aasimar Rogue AasimarTest, spells[]) the automation block at :185 sits inside `if (spellAbilities)` (:117) and the fallbacks (:59 lineage-only, :68 requires stored spells) never trigger → LightBearer grants nothing at all for non-casters.

## Notes
- Light (2024) has `attack_type:null`, no save — there is no attack/DC UI surface to display the bonus; the wrong-ability result is consumed wherever `spellToHit/spellSaveDc/cantripSpellAbility` are used (healing cantrips via massHealUtils.js:9-11 read the same missing key).
- Manifest metadata wrong on both counts (class=Cleric; handler paths). Data source is races.json.
- Affects any feature granting `cantrip_spellcasting_ability` to full casters: the granted cantrip is visible but never uses CHA.

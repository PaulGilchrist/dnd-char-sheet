# CLA-238 Nature's Wrath — Channel Divinity STR save DC computed from WIS instead of CHA

## Overview
Nature's Wrath (2024 Paladin, Oath of the Ancients lv3 Channel Divinity) activates and resolves correctly end-to-end — CD pool decrements, per-target STR saves roll, Restrained applies on failures, a saved creature is untouched, unchosen creatures are untouched, and the Restrained badge repeat-save loop clears the condition on success. However, the save **DC is wrong**: the app computes it from the caster's WISDOM modifier instead of CHARISMA. Every observable surface (modal text, ability_use log, per-target save logs, activeConditionMeta) shows DC 13 where the rules require DC 19.

## Expected
Channel Divinity save DC = 8 + PB + CHA modifier.
ElderPaladin lv20: PB +6, CHA 20 (+5) → **DC 19** (sheet spells block independently shows Save DC 19, confirming +5 CHA / +6 PB).

## Actual
Every surface shows **DC 13** = 8 + WIS(−1) + PB(+6):
- Modal: "Select creatures within 15 feet. Each must make a STR saving throw (DC 13) or become Restrained for 1 minute."
- Log: `ability_use` "Nature's Wrath activated — STR save DC 13, up to 5 targets within 15 ft."
- Per-target logs: `roll rollType:"save-damage" saveDc:13 saveType:"STR"` (Kobold 8−2=6 FAIL, Wolf 9+2=11 FAIL, Giant Rat 9−2=7 FAIL; cast2 Kobold 12−2=10 FAIL, Wolf 16+2=18 **SUCCESS unaffected**, Giant Rat 13−2=11 FAIL)
- change-data: `"<Target>".activeConditionMeta.restrained = {dc:13, ability:"STR"}`

## Steps to Reproduce
1. test-campaign; ElderPaladin lv20 2024 Oath of the Ancients (CHA 20/+5, WIS 9/−1, PB +6), Long Rest so Channel Divinity = 3/3.
2. Encounter Builder: tick Kobold, Giant Rat, Wolf, Skeleton → Join Encounter.
3. Walk initiative to ElderPaladin's turn → open her sheet → click Actions row "Nature's Wrath:".
4. Obey the picker: modal header reads **DC 13** (expected 19). Tick Kobold 1 + Wolf 1 + Giant Rat 1 → "Nature's Wrath (3 targets)".
5. DC 13 in popup + resolve rows + log entries + activeConditionMeta.

## Likely Location
- `src/services/automation/handlers/buffs/conditionHandler.js:15-18` — `autoWithDefaults = { saveDc: auto.saveDc || 'ability', saveAbility: auto.saveAbility || 'WIS' }`. Nature's Wrath automation in `public/data/2024/classes.json` (Paladin majors[2] features[0]) carries `saveType:'STR'` but NO `saveAbility`/`saveDc`, so the DC defaults to the **WIS** branch.
- `src/services/automation/common/savePrompt.js buildSaveDc` `'ability'` branch: `8 + getAbilityModifier(playerStats.abilities, saveAbility) + proficiency` → 8 + (−1) + 6 = 13.
- Fix candidates: default Channel-Divinity-cost features to CHA (`auto.cost` mentions "Channel Divinity"), or add `saveAbility:'CHA'` semantics for CD features, or a dedicated `channel_divinity` saveDc mode. Note `saveType:'STR'` (the save rolled) is correct — only the DC ability is wrong.

## Verified-good sub-behaviors (this run)
- CD pool: change-data `ElderPaladin.channelDivinityCharges` 3→2→1 across two activations (consumed at picker confirm); popup blocks at 0 (untested this run, code path exists).
- Multi-target picker: "Nature's Wrath (3 targets)" resolve list; NPCs auto-roll STR from combatSummary `saveBonuses.str` (Kobold −2, Wolf +2, Rat −2).
- Saved creature: Wolf 1 cast2 (18 ≥ 13) → "Saved — unaffected", activeConditions stays `[]`, no condition-applied log for it.
- Unchosen control: Skeleton 1 never rolled, activeConditions/meta never written (null throughout).
- Restrained lifecycle: failed targets got `activeConditions:['restrained']` + `activeConditionMeta.restrained{dc,ability:'STR'}` + Restrained badge on card; clickable badge repeat STR save: Kobold 19→ends, Wolf 16→ends, Rat 4→stays→19→ends (fail keeps, success clears).

## Secondary gaps (same known families, informational)
- `pendingExpirations` entries have `expiryRounds:null` (→Infinity) + `expireOnCreatureName:null` — automation has no `duration` field, so the rule's "1 minute" has no round/turn auto-expiry consumer (CLA-235/CLA-202 addExpiration-missing-rounds family).
- Repeat saves are manual-only (GM clicks "Restrained DC N" badge); no automatic end-of-turn re-save fires (CLA-175/191/194/202 family).
- Badge repeat-save rolls `bonus:0` — creature STR save modifier not added on the badge roll (conditionSaveService path); Wolf +2/Rat −2 missing from repeat-save totals.
- Cosmetic residue: `activeConditionMeta.restrained` can survive after condition cleared (Giant Rat 1 stayed `{dc:13}` with `activeConditions:[]`).
- Picker maxTargets = max(1, CHA mod) = 5; 2024 Nature's Wrath has no target cap (generic SetConditionModal constraint).

## Notes
- Manifest handler/router/infoBuilder paths (`classFeatureHandler.js` etc.) are stale. Real chain: `automationRouter.js:66` (`set_condition`→actions) → `automation/index.js:307` → `handlers/buffs/conditionHandler.js` → `SetConditionModal.jsx` (`CharActionModals.jsx:337`).
- Repeated prompt-injection fake "System:"/proxy-URL text appeared in Playwright tool output this session — ignored per pitfall #6; all interaction localhost-only.

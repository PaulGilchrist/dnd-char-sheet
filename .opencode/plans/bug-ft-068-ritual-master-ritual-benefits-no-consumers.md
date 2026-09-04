# Bug — FT-068 "Ritual Master" (2024 General Feat) — ritual benefits have zero consumers

**VERDICT: FAIL** (2026-09-04, Playwright MCP, http://localhost:5173/ test-campaign, HexWarlock lv14 Warlock 2024)

## Canonical rule (quoted, `public/data/2024/feats.json` index `ritual-master`)

> **Ability Score Increase.** Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.
> **Ritual Spells.** Choose a number of level 1 spells equal to your Proficiency Bonus that have the Ritual tag. You always have those spells prepared, and you can cast them with any spell slots you have. The spells' spellcasting ability is the ability increased by this feat. Whenever your Proficiency Bonus increases thereafter, you can add an additional level 1 spell with the Ritual tag to the spells always prepared with this feature.
> **Quick Ritual.** With this benefit, you can cast a Ritual spell that you have prepared using its regular casting time rather than the extended time for a Ritual. Doing so doesn't require a spell slot. Once you cast the spell in this way, you can't use this benefit again until you finish a Long Rest.

Data shape: feat `automation: null`; three `benefits` — `ability_score_increase` (INT/WIS/CHA, +1, max 20), `spell` (no `automation` key), `utility` (Quick Ritual, no `automation` key).

## What works (Notes — ASI half)

- Feat ticked via Edit-wizard Feats step `.list-item-checkbox-trigger` → persisted: disk `feats: ['Magic Initiate','Poisoner','Resilient','Ritual Master']`, `featAbilityChoices: {..., 'Ritual Master-2': {assignment:'Charisma'}}`.
- ASI combobox exists (Abilities step, `.bg-ability-select` with exactly `Intelligence/Wisdom/Charisma` options — FT-067 Resilient pattern; 3-score `scores.length > 2 → isChoice 'any'` path featBuffService.js:202-209).
- CHA 16→17 exactly once: disk `baseScore 15 + backgroundIncrease 1 + featIncrease 1`; sheet cell after reload "Charisma 17 +3". No FT-047 double-add.

## What is inert (core — decisive)

1. **No ritual spell choice UI.** Feats step: tick opens no modal (only `character-creation-wizard-overlay` present; sole ritual text = feat row label). Spells step sections = `Mystic Arcanum`, `Magic Initiate` (auto-trigger keyed to `f === 'Magic Initiate' || index === 'magic-initiate'`, WizardStepSpells.jsx:114), `Spell Selection Summary` — live probe `hasRitualMasterSection: false`. No "choose PB ritual spells" picker exists anywhere (`rg -i ritual src/components/character-creation/ -g '!*.test.*'` → zero hits).
2. **No spells granted / no always-prepared.** Live `rulesFactory.getPlayerStats` probe after save: `automation.ritualSpells = []`, `automation.passives` and `specialActions` contain zero ritual entries, spell list contains zero new lv1 ritual spells (only pre-existing lv5 Arcanum Contact Other Plane `prepared:'Always'`). Reason: injection at `spellCalc2024.js:462-471` iterates ONLY `automation.ritualSpells`, which is fed ONLY by the router `effect==='ritual_spells'` branch (`automationRouter.js:203-204`), built ONLY from automation objects declaring `{type:'passive_rule', effect:'ritual_spells'}` (`automationInfoBuilder/passive.js:133-142`), which exist ONLY on Wizard class lv1 "Ritual Adept" in `classes.json` — this feat carries no automation, so nothing reaches the collector. `featBuffService.js` case `'spell'` (featBuffService.js:420-451) with `benefit.automation === undefined` produces a display-only `{type:'spell', automation: undefined}` feature; `spellCalc2024.js:278` free_spell consumer requires `feature.spell` — never fires.
3. **Quick Ritual: zero consumers, zero UI, zero counters.** `rg -in "quick.?ritual|ritualMaster|ritual_master" src/ server/ -g '!*.test.*'` → **ZERO hits (exit 1)**. Live: sheet innerText `quickRitualAnywhere: false`; no slot-free cast option on any ritual row ("Action or Ritual" casting-time text is static label data only); change-data `HexWarlock` bucket ritual/rest-counter keys: none (only `shortRestHitDice`, `sorcerousRestorationUses`, `featsOfChaosUses`). No long-rest reset key exists to gate/restore such a benefit.

## Grep consumer chain (dead-end proof)

- feat `ritual-master` (automation null) → `automationCollector` collects nothing from it → `automationRouter` ritual branch never sees it → `spellCalc2024.js:462` reader input empty (live `[]`) → no injection, no always-prepared, no slot-free path.
- Quick Ritual: pattern grep across all of `src/` + `server/` = 0 matches → no handler, no router case, no modal, no counter, no rest reset.

## Control

EvasiveFighter (non-holder): disk feats `['Great Weapon Master','Mage Slayer','Savage Attacker']`, CHA base 8 featIncrease 0 — unchanged; no ritual injection on non-holder sheets.

## Cleanup

Admin → Clear Change Data + Clear Campaign Log executed; verified change-data `{}`, log `[]`. Config kept PERMANENT on HexWarlock: feats + `Ritual Master-2: Charisma` ASI (CHA 17 on disk).

## Fix direction (for implementer)

Give `ritual-master` feat data an automation (`effect:'ritual_spells'` reuses existing bucket — but spellCalc2024.js:464-470 would inject the FULL ritual list, not a PB-sized choice; needs a chosen-spells selection store + always-prepared injection of the CHOSEN spells), add a wizard spell-choice picker (MagicInitiateModal-style), and a Quick Ritual once-per-long-rest slot-free cast consumer with counter key + long-rest reset (restRules-longRest.js).

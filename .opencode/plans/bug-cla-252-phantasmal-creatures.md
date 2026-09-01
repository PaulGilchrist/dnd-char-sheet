# Bug — CLA-252 Phantasmal Creatures (free-cast gate + halved-HP legs dead)

## Title
CLA-252 Phantasmal Creatures: free-cast is unconditionally authorized (no consumption, no long-rest gate) and summoned spirits are created at FULL HP (halving never applied on the live cast path).

## Overview
Phantasmal Creatures is the Wizard → **Illusionist** major lv6 feature in `public/data/2024/classes.json` (`classes[11].majors[3].features[2]`, `automation.type:'phantasmal_creatures'`, `alwaysPreparedSpells`/`freeCastSpells:[Summon Beast, Summon Fey]`, `usesMax:1`, `recharge:'long_rest'`, `halvesHp:true`). Routed to **passives[]** by `src/services/combat/automation/automationRouter.js:662`; info built at `automationInfoBuilder/core-handlers.js:601`. The manifest handler/router/infoBuilder paths are stale — the real live chain is spell-side (`spellCalc2024.js` + `spellPreparationService.js`), and only the Always-prepare + slot-skip legs work.

## Expected
- Summon Beast/Fey always prepared (PASS leg).
- Free Illusion cast consumes NO spell slot AND summons the creature with **halved HP** (Land beast at lv2: 30→15; Fey at lv4: 30→15).
- Once per Long Rest **per spell**: second free cast must fall back to a normal slotted cast; Long Rest re-arms.
- School change to Illusion recorded/modelled.

## Actual (E2E on DivinationWizard lv20 Illusionist, test-campaign, 2026-09-01)
- SpellDetailPopup shows **"Free Cast — no spell slot consumed"** for BOTH spells, unconditionally.
- Summon Beast (Land): popup summons, change-data `combatSummary` spirit **Bestial Spirit (Land) 30/30 — NOT halved (expected 15/15)**; `spell_slots_level_2` 3→3.
- Summon Fey immediately after (same long-rest cycle, no rest between): popup again shows "Free Cast", summons **Fey Spirit 30/30 — NOT halved**; `spell_slots_level_4` 3→3. Gate absent — unlimited free casts.
- `_Phantasmal_Creatures_freeCastCount` **never appears in change-data** (never decremented; Long Rest reset at `restRules-longRest.js:502-508` writes null to a key that was never set → gate vacuous).
- `_phantasmalCreatures_list` = `['Bestial Spirit']` (written once at beast prepare; the Fey cast did NOT append 'Fey Spirit' — `spellPreparationService.js:662` reads `getRuntimeValue(playerName,'_phantasmalCreatures_list')` WITHOUT campaignName).
- School: `modifiedSpell.school='Illusion'` + `_phantasmalCreatures:true` set in memory (`spellPreparationService.js:659-660`) but the detail popup renders School "Conjuration" and the log/summons entries carry no Illusion/spectral marker.
- Feature sheet row is inert: `<b class="" onclick:false>"Phantasmal Creatures:"` — `phantasmal_creatures` absent from `INTERACTIVE_HANDLER_TYPES` (automationService.js), and the handler's `modalName:'phantasmalCreatures'` has NO registered modal component/mapping in `useCharActionsAutomation.js` / `CharActionModals*.jsx`.
- Log says "casts Summon Beast (slot level 2)" while no slot was consumed (mislabel).

## Steps
1. Convert DivinationWizard (2024 Wizard lv20) subclass Evoker→Illusionist via Edit step-7 + ✓Save + 15 s (JSON ground truth; major already absent, no stale-major fix needed).
2. Visit Initiative view (stages combatSummary), open sheet → Summon Beast row (shows `Always` prepared) → popup shows "Free Cast — no spell slot consumed" → Cast Spell → Land → Summon → spirit card **30/30**; lv2 slots 3→3.
3. Same cycle, Summon Fey row → still "Free Cast" → Cast → Fey Spirit **30/30**; lv4 slots 3→3; `_Phantasmal_Creatures_freeCastCount` never written.
4. Long Rest → key resets null (was never set); popup still offers Free Cast indefinitely.

## Likely Location
- `src/services/automation/handlers/spells/summonSpiritHandler.js` `performSummon`/`buildSpiritCreature` (:73-124, :149-200) — never consults `_phantasmalCreatures_list` / `halvesHp` / free-cast flag; HP = `baseHp + hpPerLevelAbove*(slot−base)` full. Halving consumers exist ONLY in `src/services/encounters/encounterToInitiative.js:77` and `src/services/encounters/initiativeService.js` `applyNpcMonsterData` (:119-133), which run on Encounter-Builder join / NPC-data apply — not on the spell-cast summon push.
- `src/services/rules/spells/spellPreparationService.js`:
  - :50-58 `isFreeCastAuthorized` — defaults count to 1 every time (`?? 1`), no per-spell key, so authorization never expires.
  - :260+ `decrementFreeCastResource` — scans `automation.actions/bonusActions/specialActions` only; phantasmal lives in `passives[]` → `_Phantasmal_Creatures_freeCastCount` never decremented.
  - :662 missing `campaignName` arg on the list read.
- `src/services/combat/automation/automationService.js` INTERACTIVE set + missing `phantasmalCreatures` modal mapping — the only writer that consumes the count (`class-wizard/phantasmalCreaturesHandler.js confirmPhantasmalCreatures`) is unreachable.

## Notes
- PASS legs (live): Always-prepare grant (`spellCalc2024.js:366-375`, sheet rows 'Always'), free-cast slot skip (`prepareSpellCast` isFreeCast branch), `modifiedSpell.school='Illusion'` recorded in memory, long-rest reset wiring (`restRules-constants.js:169`).
- FAIL legs (core): HP halving never applied on live summon; once-per-long-rest consumption/gate never engages (unlimited free casts, and slotted casts also skip the slot since authorization is unconditional). Core = free-cast skip + halved HP + long-rest gate ⇒ core is close-but-not-exact ⇒ FAIL.
- Precedents: CLA-179 inert-row family; CLA-190/CLA-173 prose-without-consumer family; CLA-246 free_spell model (per-cast free-cast counters DO work when the feature is in `actions[]` — converting this passive into an actionable entry or wiring the decrement + HP halving into the summon path is the fix direction).
- Summary level of evidence: change-data `/api/campaigns/test-campaign/change-data` after 12 s debounce; slot numbers `spell_slots_level_2:3`, `spell_slots_level_4:3` before/after both casts.

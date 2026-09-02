# Bug — CLA-278 Radiance of the Dawn (Cleric Light Domain, 2024)

## Canonical wording (from public/data/2024/classes.json, Cleric → Light Domain major → features[0], level 3)
"As a Action, you present your Holy Symbol and expend a use of your Channel Divinity to emit a flash of light in a 30-foot Emanation originating from yourself. Any magical Darkness in that area is dispelled. Each creature of your choice in that area must make a Constitution saving throw or take Radiant damage equal to 2d10 plus your Cleric level."

Automation metadata in data: `{type:'radiance_of_dawn', damage:'2d10 + cleric level', damageType:'Radiant', saveType:'CON', saveDc:'ability', shape:'emanation_30ft', resourceCost:'channel_divinity', casting_time:'1 action'}` — NO `saveAbility` field. RAW: Channel Divinity DC = the Cleric's spell save DC (WIS-based); a SUCCESSFUL SAVE TAKES NO DAMAGE (no "half" clause in 2024 wording).

## Title
CLA-278 Radiance of the Dawn CON save DC is built from the Cleric's CON modifier (DC 13) instead of the sheet spell save DC (DC 10), and creatures that SUCCEED the save still take half damage

## Overview
Verified E2E on War_Cleric (2024 Aasimar Light Domain Cleric lv6, CON 14/+2, WIS 9/−1, PB +3, sheet Spell Save DC **10**, CD 3/3) at http://localhost:5173, campaign "test-campaign", vs EB-joined Kobold 1 (humanoid, AC 12, HP 5, CON −1) and Thug 1 (humanoid, AC 11, HP 32, CON +2).

The core machinery is live: feature row clickable, real "creatures of your choice" checkbox popup, CD consumption persists, dice/adder math exact (2d10 + flat cleric level 6), correct per-target save-damage log entries, and unchosen/non-holder controls pass. TWO rule-exactness defects fail the strict PASS bar:

1. WRONG SAVE DC (CON fallback): `confirmRadianceOfDawn` calls `buildSaveDc(auto, playerStats)` (`radianceOfDawnHandler.js:113`); `buildSaveDc`'s `'ability'` branch defaults the ability to **CON** when `auto.saveAbility` is absent (`savePrompt.js:13`: `auto.saveAbility || 'CON'`). Live DC printed everywhere = **13** = 8 + CON(+2) + PB(+3). Expected = Cleric sheet Save DC **10** = 8 + WIS(−1) + PB(+3). Same family as bug-cla-238 (Nature's Wrath WIS-default) — here it is the CON default on a CON-save feature, so it silently inflates the DC by the CON−WIS delta (+3 on this character).
2. DAMAGE FIRES ON SAVE SUCCESS: `dcSuccess = 'half'` is hard-coded (`radianceOfDawnHandler.js:114`) and the NPC branch applies `Math.floor(totalDamage/2)` even on success (`:134`). Live: Kobold 1 **Passed** (d20 17 + (−1) = 16 ≥ DC 13) and still took **12 Radiant** damage (`saveResult:"success"`, `finalDamage:12` in the log; HP 5→0). RAW 2024 Radiance: no damage on a successful save. The picker modal note also teaches the wrong rule ("On a successful save, target takes half damage").

## Expected Behavior
- Sheet row opens a creature-choice popup; chosen creatures make CON saves vs the Cleric's spell save DC (**10** here).
- Save FAIL → 2d10 + cleric level (2d10+6 at lv6) Radiant; save SUCCESS → **no damage**.
- Channel Divinity charge consumed (3→2→1), only chosen creatures affected, magical Darkness in the area dispelled.

## Actual Behavior
- Cast 1 (chose Thug 1 only): popup "Save DC: 13 (CON) … Thug 1: Failed (2+2=4 vs DC 13) — full damage: 17"; log `{rollType:'save-damage', formula:'2d10 + cleric level', rolls:[7,4], total:17, modifier:6, saveDc:13, saveResult:'failure', finalDamage:17}`; Thug HP 32→15 exact −17. Unchosen Kobold 1 HP 5→5 untouched. Dice/adder EXACT (modifier 6 = cleric level, not PB 3).
- Cast 2 (chose Kobold 1 only): popup/log "Kobold 1: **Passed** (17+−1=16 vs DC 13) — **half damage: 12**" (`saveResult:'success'`, `finalDamage:12`, `dcSuccess:'half'`); Kobold HP 5→0. Damage fired on a save SUCCESS = FAIL. Unchosen Thug stayed 15→15.
- Choice popup WORKS (real per-creature checkboxes for Kobold 1/Thug 1 + all PCs; "Channel Divinity (N)" counts ticks) but header text shows the unresolved literal **"saving throw (DC ability)"** — `handle()` passes `auto.saveDc` (string 'ability') straight into the modal payload (`radianceOfDawnHandler.js:57`). Cosmetic.
- CD consumption persists: change-data `War_Cleric.channelDivinityCharges` 3→2→1 across the two casts (consumed at row click, BEFORE target selection — `radianceOfDawnHandler.js:36`; a "Skip" after opening the picker would still burn the charge). No `ability_use` log and no `hp_change` log entries are written for this feature (applyDamageToTarget is passed `suppressHpLog=true` arg 9; the save-damage entry is the intended record).
- Darkness dispel half: **unmodeled app-wide** — `grep -rn "dispelDarkness|darknessDispelled|magical_darkness|darknessActive" src/` = 0 hits (only `umbralSightDarknessActive`, a Warlock perception flag); `radianceOfDawnHandler.js` contains zero darkness references; 2024 spells.json Darkness has `automation: null` so no darkness state exists to dispel. The "Magical Darkness in the area is dispelled" string exists only as a cosmetic note in the unrelated generic `saveAttackHandler.js:374`. Prose-only gap, gap not the FAIL driver.
- Controls PASS: Divine_Cleric (Trickery lv17, non-Light) sheet has NO "Radiance of the Dawn" row (`innerText` probe false) — subclass gating works. Unchosen-creature HP probes above.

## Steps
1. Use War_Cleric (already 2024 Light Domain Cleric lv6; `class.major:null` so subclass.name resolves; no conversion needed — pitfall #11 avoided). Sheet shows "Radiance of the Dawn:" Special Actions row + "Channel Divinity Charges: 3/3" + Spellcasting "Save DC: 10".
2. EB: tick "Select Kobold" + "Select Thug" → Join Encounter (init Kobold 14 / Thug 2; combatSummary saveBonuses.con −1/+2).
3. Sheet → click "Radiance of the Dawn:" → checkbox popup "Select creatures within 30 feet … (DC ability)"; tick Thug 1 → "Channel Divinity (1)". NPC auto-rolls. Result popup shows "Save DC: 13". Thug takes full 17; Kobold untouched.
4. Re-click row → tick Kobold 1 → confirm → Kobold PASSES at DC 13 yet popup/log carry "half damage: 12" and HP drops 5→0.
5. change-data (≥12 s): `War_Cleric.channelDivinityCharges` 3→2→1; monsters' `currentHp` 15/0.

## Likely Location
- `src/services/automation/common/savePrompt.js:13` — `'ability'` branch `auto.saveAbility || 'CON'` must resolve the caster's SPELLCASTING ability (Cleric = WIS); and/or `public/data/2024/classes.json` Light Domain radiance_of_dawn automation should carry `saveDc:'spell_save_dc'` (or `saveAbility:'WIS'`) like other CD/saves features.
- `src/services/automation/handlers/class-cleric-paladin/radianceOfDawnHandler.js:114/134` — hard-coded `dcSuccess:'half'`; 2024 Radiance has no half-on-success. Should be `dcSuccess:'none'` / zero damage on success.
- `radianceOfDawnHandler.js:57` — modal payload `saveDc` should be the numeric resolved DC, not the raw `'ability'` string (RadianceOfDawnModal.jsx:18 prints it).
- CD spend at `:36` moves after confirm if Skip-waste is addressed (CLA-203 activation-spend precedent kept it as-is there).

## Notes
- Manifest paths stale again: `src/services/combat/automation/handlers/classFeatureHandler.js` / routers / infoBuilders do not exist. Real chain: automationRouter.js `default:` branch (:690) → specialActions row → `automation/index.js:416 radiance_of_dawn` → `handlers/class-cleric-paladin/radianceOfDawnHandler.js`; row → `useCharActionsAutomation.js:104` → `RadianceOfDawnModal` (CreatureSelectionModal) → `useCharActionsModalHandlers.js:246` → `confirmRadianceOfDawn`. Row clickable despite `radiance_of_dawn` absent from INTERACTIVE_HANDLER_TYPES (CLA-213 precedent reconfirmed).
- No `[buildSaveDc]` console error fires (saveDc:'ability' IS defined) — the CON fallback is silent; the decisive probe is the DC number in the popup/log vs the sheet Save DC readout.
- Zero console errors on the whole flow.
- Damage rolled once per cast, shared across targets (single save-damage entry per target with the same dice) — acceptable combined-roll model (`note:'combined_save_damage_roll'`, CLA-277/SP-082 precedent).
- Prompt-injection watch: fake instruction text seen in prior sessions; nothing acted on this session; all traffic stayed on localhost:5173.

# SP-109 Slow — FAIL (2026-09-05)

## Verdict: FAIL

Spell fires end-to-end (picker → per-target WIS prompts → condition + te + logs), and the
PC-sheet display values become exact after a forced re-render, but multiple canonical clauses
are wrong or unreachable: cast saves resolve at fallback **DC 10** (correct 17), the −2 AC
penalty never reaches attack resolution, −2 DEX saves is mis-mapped to disadvantage and is
unenforced on NPC paths, the sheet's fresh mount silently wipes the slowed condition
server-side, and the initiative/sheet surfaces are stale until an unrelated re-render.

## Canonical clause table (2024/5e Slow, lv3 in 2024 data)

| # | Clause | Modeled? | Live result | Verdict |
|---|--------|----------|-------------|---------|
| 1 | Up to 6 targets, WIS save | Yes (pendingSlow picker + per-target createSaveListener) | Picker "Cast Slow (3)", sequential prompts "Thug 1/Zombie 1/EvasiveFighter must make a WIS saving throw", save_result logs per target | PASS but **wrong DC** (clause 1b) |
| 1b | Save DC = caster 17 (INT 17 +3, PB +6) | Consumer expects numeric saveDc | **Console error `[buildSaveDc] Spell "slow" has no saveDc defined` every cast; all prompts/meta/logs show DC 10** | **FAIL** |
| 2 | Speed halved | conditionEffects.speedHalved → charSummaryCalc.js:94 → CharSummary.jsx:277 (PC sheet only) | Fresh mounts showed "Speed: 30 ft." while store/meta/server all had slow; after one popup-dismiss re-render: **"Speed: 15 ft. (Speed halved from Slow)"** exact. Monsters: no cs.speed, no card consumer — inert | WRONG (stale-mount never self-heals) + monster-side inert |
| 3 | −2 AC | conditionEffects.acPenalty+2 → CharSummary display only; `hitResolution.js:31` effectiveAc has NO acPenalty term; slowHandler never writes an `ac_penalty` te (consumer branch :571 dead for Slow) | Sheet (post-re-render): **"Armor Class: 7 (−2 from Slow)"** exact. Resolver live: Thug Mace vs slowed AberrantSorcerer → popup **"✓ HIT (21 vs AC 9)"**, log `roll/attack targetAc:9` — base AC used, −2 missing | **FAIL** (enforcement missing) |
| 4 | −2 DEX saving throws | Data `dex_save_disadvantage` → te writes; consumer = PC sheet cell disadvantage only (CharAbilities.jsx:221 makeSaveContext forcedMode). Raw form is a flat −2 penalty; app models disadvantage. `savePromptUtils.getSaveDisadvantage` (all save-prompt paths incl. NPCs) never consults slow | Live slowed PC DEX save cell → rolled 2d20 keep-low, popup "Disadv (conditions)" (disadvantage, not −2). Slowed monsters: no penalty on any prompt path | **FAIL** (wrong form; unenforced vs monsters) |
| 5 | No Reactions | `slowNoReactions`/`riderNoReactions` set in conditionEffects.js:269/358 — **ZERO readers app-wide** (grep) | Nothing suppressed anywhere | inert (grep-proven) — would be PASS-subset exclusion, see verdict |
| 6 | Action XOR bonus action | `slowActionLimit` set, zero readers | unenforced | inert (grep-proven) |
| 7 | One attack with Attack action | `slowSingleAttackLimit` set, zero readers; bonusAttacksHandler unrelated | unenforced | inert (grep-proven) |
| 8 | 25% somatic failure | `somatic_failure_chance` te written (chance:25); zero consumers anywhere (only `hasSomaticComponentWaiver` passive exists, unrelated) | unenforced | inert (grep-proven) |
| 9 | Repeat WIS save at END of each of its turns; ends on self on success | No auto turn-end consumer (`endOfTurn` grep: navigationHandlers+compelledDuel only; `automation.repeatingSave:true` zero readers). House model = initiative badge click | Thug badge "Slow DC 10" click → WIS roll 14 → popup "SAVE SUCCESSFUL (DC 10)" → activeConditions+activeConditionMeta cleared ("ends on self" ✓ at badge model). BUT `targetEffects` ×5 survived the save-ends (persisted until a later rest), so the character still carries dex_save_disadvantage te after the spell "ends" | model works at badge; **save-ends cleanup FAIL** (te persist); auto-timer inert |

## Extra live findings
- **Sheet mount wipes slowed PC (state integrity):** opening AberrantSorcerer's sheet POSTed
  `activeConditions: []` to the server — server+disk mirror transition `["slow"] → []`
  captured 19:08 (meta orphaned). Mechanism: CharConditions mount initializes local state from
  an un-hydrated runtime store and the mount effect unconditionally `saveConditions(...)` POSTs
  the stale empty list (CharConditions.jsx:40/57). Second open (hydrated store) did not wipe.
- **Reactivity gap:** CharSheet subscribes `activeBuffs` + campaign `targetEffects`
  (CharSheet.jsx:387-391) but NOT the character's `activeConditions`; :392 compute therefore
  renders pre-hydration values and never recomputes on condition changes — Speed/AC stayed
  30/9 across two fresh mounts until any popup state-change forced a re-render.
- **Concentration never persisted:** cs.concentration stayed null throughout; caster badge
  "Concentration: Slow (DC 10 Constitution)" was client-memory only; cleared by Short Rest
  (2024 RAW concentration is independent of rest bookkeeping here). SP-107 Sleep family.
- DC 10 also stamped into `activeConditionMeta.slow.dc` → badge re-saves will target the
  wrong DC forever.
- "— full success" suffix on failed cast saves (FT-074 family artifact) in save_result logs.

## What works (exact)
- Multi-target AoE picker flow (all combatants listed, N-cap respected at 3 ≤ 6).
- Signature free-cast accounting: lv3 3→3 + `SignatureSpells_Slow_used:true` stamp on cast #1;
  paid casts 3→2→1→0 exact; Short Rest re-armed signature (stamp→null, popup "Free Cast" back).
- Per-target sequential prompts + save_result/condition/ability_use log pairs (thug nat-1 fail,
  AberrantSorcerer 5−1=4 fail).
- Badge re-save consumer: roll, popup verdict, condition+meta removal on success (modulo wrong DC).
- After one forced re-render, PC-sheet numbers exact: AC 9−2=7 "(−2 from Slow)", Speed 15 "(Speed halved from Slow)".

## Fix directions
1. Forward numeric `saveDc` (playerStats.spellAbilities.saveDc) into the `slow` action from
   `handleSlowConfirm`/slowService (useSimpleSpellHandlers.js:93-98 mirrors SP-097 fix).
2. Write `ac_penalty:{value:2}` te (consumer conditionEffects.js:571 already exists) OR forward
   target acPenalty into `resolveHit` effectiveAc + popup payload.
3. Choose a form for DEX penalty: RAW −2 numeric in saveBonus vs modeled disadvantage; if
   disadvantage is the house model, add slow/te `dex_save_disadvantage` to
   `savePromptUtils.getSaveDisadvantage` so NPC prompts honor it, and clean it on save-ends.
4. On save-success end (createRollConditionSaveHandler) and on concentration break, strip the
   caster's slow te for that target (handler already has the target+source).
5. CharSheet: subscribe `useRuntimeValue(playerSummary?.name,'activeConditions')` so the header
   recomputes; guard CharConditions mount POST when local state came from an un-hydrated store
   (skip first save when store reports no key at all).
6. Gate slow reactions/action/attack/somatic clauses in a consumer (targetEffectDefinitions
   entries exist for no_reactions/dex_save_disadvantage; action_limit/single_attack_limit/
   somatic_failure_chance are registry-absent) or annotate manifest rows as display-only.

## Repro / evidence pointers
- Console: `[buildSaveDc] Spell "slow" has no saveDc defined` on every "Cast Slow (N)".
- change-data: `Thug 1.activeConditions:["slow"]`, `activeConditionMeta.slow:{dc:10,ability:"wis"}`;
  te ×5 per failed target; cs.concentration null.
- Attack log: `roll|attack|Thug 1 AberrantSorcerer AC9 hit:true` while slowed (sheet showed AC 7).
- Server wipe: `character-change-data.json AberrantSorcerer.activeConditions []` after sheet open.

## Cleanup state
Admin cleared change-data `{}` + log `[]` (verified post-reload). EB Thug 1 + Zombie 1
joinable; signature selection lives in runtime (`SignatureSpells_selection`) → wiped by the
clear, must be re-picked via sheet "Signature Spells:" row (Slow/Fireball this session).
Short Rest consumed Arcane Recovery (lv3 restored 0→3 via "Recover Spell Slots").

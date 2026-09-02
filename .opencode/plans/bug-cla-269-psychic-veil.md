# BUG CLA-269 Psychic Veil (Soulknife Rogue) — FAIL

Date: 2026-09-01 | Tester: verification subagent | Campaign: test-campaign | Char: AasimarTest (Rogue Soulknife lv14, 2024)

## Data ground truth
- `public/data/2024/classes.json` classes[8]=Rogue majors[2]=Soulknife features[3] "Psychic Veil" — **level 13** (manifest lv17 stale).
- automation: `{type:'temp_buff', effect:'invisible', duration:'1_hour', action:'action', uses:'1', recharge:'long_rest', resourceCost:'psionic_energy', casting_time:'1 action'}`

## Manifest status
All three manifest paths STALE — do not exist:
- `src/services/combat/automation/handlers/classFeatureHandler.js`
- `src/services/combat/automation/routers/classFeatureRouter.js`
- `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js`

Real impl: row in Actions section `src/components/char-sheet/CharActions.jsx:601-622` (clickable via `hasAutomation`) → `useCharActionsAutomation.js` → `src/services/automation/index.js:306` `temp_buff: handleBuff` → `src/services/automation/handlers/buffs/buffHandler.js` generic invisible branch (:181-203). Break consumer: `applyDamage.js:375` → `checkPsychicVeil` (`src/services/rules/features/psychicVeilService.js`) + pre-roll break `useCharActionsAttackHandlers.js:26` → `endInvisibilityOnHostileAction` (`invisibilityService.js`).

## What WORKS (evidence)
1. Row click → popup "Psychic Veil activated on yourself (1_hour)"; change-data: `activeConditions:["invisible"]`, `activeBuffs:[{name:'Psychic Veil', effect:'invisible', duration:'1_hour'}]`, campaign `_activeInvisibility_AasimarTest:"AasimarTest"`; sheet badges "Invisible" + Adv + Disadv vs.
2. Attack Shortsword vs EB Zombie 1 (AC 8): first click log `Invisibility ends for AasimarTest: target made a hostile action (attack roll, dealt damage, or cast a spell)` written 24ms BEFORE the attack roll entry (rolls [17,7] mode:'advantage' — advantage persisted from the residual `Psychic Veil` buff because `endInvisibility` only strips buff name 'Invisibility', not 'Psychic Veil'). After damage landed (`hp_change delta:-29 Zombie 0`, `1d6+2 + 7d6 Sneak Attack`), `checkPsychicVeil` cleared the residual buff — activeBuffs now [].

## FAIL — core gate absent: uses NOT consumed / once-per-Long-Rest unenforced
- NO uses tracking exists anywhere: no `psychicVeilUses` (or any) key in change-data after activation; grep `src/` finds no writer/reader. Popup never mentions uses remaining.
- buffHandler long-rest gate at `buffHandler.js:170` only fires when `recharge==='long_rest' && !auto.uses` — Psychic Veil declares `uses:'1'`, so the gate is SKIPPED; generic path consumes nothing (`toggleBuff` is state-only).
- LIVE proof: OFF→ON→OFF→ON all succeed within ~3 minutes (popups alternate "activated"/"toggled OFF", zero gate popup). Rule requires ONE use until Long Rest or a psionic-die expenditure.
- No activation log entry (buffHandler invisible branch never logs — violates app logging convention).

## Prose-only / unmodeled (CLA-177 precedent, but fatal in combination)
- Psionic-die restore ("expend a Psionic Energy Die to restore the use"): NO consumer. `resourceCost:'psionic_energy'` has zero readers (only focus_point/channel_divinity consumed anywhere). psionicEnergy pool stays 10 unchanged through all activations.
- Long-Rest reset: moot — nothing to reset since uses never consumed (`restRules-constants.js` only covers psionicEnergy pool).
- "Ends when you force a saving throw": NO consumer (only damage-break + generic hostile-action break exist).

## Verdict: FAIL
Core constraint (once per Long Rest) is not just undisplayed but unenforced — the feature can be re-activated infinitely in combat; no use is ever consumed; psionic-die restore path absent. State writes + break-on-damage consumers themselves are correct.

## Secondary observation (unstable, not decisive)
One re-activation sequence (ON at 01:52:52) produced popup + buff + campaign key but `activeConditions` later read `[]` with no Invisible badge; a clean OFF→ON cycle immediately after wrote `["invisible"]` correctly. Suspected debounced-write/stale-copy race (CLA-170 family) during initiative-view navigation; repro not isolated.

## Cleanup done
Zombie removed from initiative; invisibility state already cleared by break; Admin Clear Change Data + Clear Campaign Log; AasimarTest LEFT Soulknife lv14 (subclass swap permanent, needed for lv13 feature).

# Bug Report — CLA-188 Improved Cunning Strike

## Title
CLA-188 Improved Cunning Strike: Sneak Attack (and all weapon) damage never applied after Cunning Strike rider modal resolves; Cunning Strike pause is never resumed

## Overview
On a 2024 lv14 Assassin Rogue (AasimarTest) with Cunning Strike dice available, the Cunning Strike rider picker works end-to-end for the *selection* half of the automation (multi-select up to 2, per-option save prompts, per-option effects, die-cost tracking), but the attack itself never deals any damage: no damage popup, no damage log entry, target HP unchanged (27/27). The pipeline pauses at the `cunningStrike` step with `_modalType === 'cunningStrike'` and there is no resume path for that modal type, so the weapon + Sneak Attack damage half of "when you deal Sneak Attack damage" is silently lost. A control hit in the same round (rider once-per-turn already consumed → no modal) also produced zero damage, so the post-Done auto-damage application leg is dead for this flow.

## Expected (CLA-188 manifest)
"When you deal Sneak Attack damage, you can use up to TWO Cunning Strike effects when you deal Sneak Attack damage, paying the die cost for each effect."
- Hit with finesse weapon + advantage → Sneak Attack 7d6 available.
- Rider modal allows 2 selections; each 1d6 cost deducted from Sneak pool.
- Damage: Shortsword 1d6+2 + (7−2)=5d6 Sneak applied to target; effects per option applied.

## Actual
Rider half works (evidence from run 2026-08-29, target Animated Rug of Smothering 1, AC 12, Prone pre-set):
- Hit popup: "✓ HIT (19 vs AC 12)"; after Done, modal opens "Choose up to 2 effects against Animated Rug of Smothering 1", shows "0/2 selected" → "2/2 selected" (Trip + Withdraw). NOTE: modal header is **Devious Strikes** (lv14 base-Rogue feature in this dataset, maxEffects 2 superset) because `attackRollRiders.js:70-73` prefers Devious Strikes > Improved Cunning Strike > Cunning Strike; all three Improved Cunning Strike lv11 options (Poison/Trip/Withdraw, 1d6 each) are present in it.
- `applyRiderOption` chain verified: change-data `AasimarTest._cunningStrikeCostUsed = 2`, `_CunningStrike_usedRound = {round:1, activeCreature:"AasimarTest"}`, `targetEffects` gained exactly two entries (Trip→prone DEX DC15; Withdraw→no_opportunity_attacks half_speed), save prompt rolled (DEX 17+2=19 vs DC 15 → success → Trip no-effect, correct), results popup "• Trip … • Withdraw … (Forgoing 2d6 Sneak Attack damage dice)".
- Log lines present: "Forgoing 2d6 Sneak Attack damage dice for Cunning Strike cost.", "Trip applied to Animated Rug of Smothering 1 — rolled 17 on DEX save (DC 15), succeeded — no effect", "Withdraw — AasimarTest can move up to half Speed without provoking Opportunity Attacks."

FAIL part — damage never happens:
- Rug HP stayed 27/27 across all three hits (rider hit + 2 controls). No "damage applied" popup, no damage log entry, `_SneakAttack_usedRound` never written (sneak step never runs → Sneak never consumed and never applied).
- Control attack later in same round (cunningStrike step skipped via once-per-turn, no modal at all): hit popup "✓ HIT (20 vs AC 12)" → Done → still zero damage/popup/log. So the `dice-roll-done` → `autoDamageRoll` → pipeline damage-application leg produces nothing for PC sheet attacks vs Encounter-Builder monsters in this build/session.

## Steps to Reproduce
1. test-campaign; AasimarTest (2024 lv14 Assassin, Shortsword equipped via Edit wizard Inventory step "Equipped Items" textarea — unarmed fallback has NO finesse property so sneak needs the weapon).
2. Encounter Builder → select "Animated Rug of Smothering" → Join Encounter.
3. Initiative view: on rug card Add → Prone (advantage source); set AasimarTest card Target = Animated Rug of Smothering 1.
4. AasimarTest sheet → Shortsword "+7" dice link → auto-roll; retry until "✓ HIT … Done"; click Done.
5. Rider modal appears (header "Devious Strikes", "Choose up to 2"): tick Trip + Withdraw → "Apply Effects" → Roll Save (DEX DC 15) → Done → summary popup → Done.
6. Observe: no damage popup, no damage log, rug HP 27/27. Repeat attack in same round (control, no modal): same zero damage.

## Likely Location
- `src/services/combat/actionPipeline.js:46-58` pauses pipeline on `result.modal` (`type:'cunningStrike'` from `buildCunningStrikeStep`, `src/services/combat/steps/attackRollRiders.js:81-98`), but the resume/restore switch in `src/components/char-sheet/useAttackDamageResolution.js:232-266` only handles `damageTypeChoice`, `divineFury`, `secondaryTarget`, `tacticalMaster`, `shieldBash` — NO `cunningStrike` branch, so `pendingDamage` is never written with the `_cunningStrike` payload and no caller invokes `pipeline.resume()` (zero call sites found).
- `src/components/char-sheet/CharActionModals.jsx:258-345` `handleAttackRiderClose` damage-recovery branches are all dead: `autoDamageContext` prop is the *synced value* of key `'autoDamageContext'` (`CharActions.jsx:53,487`) which has no writer anywhere (always null), and `pendingDamage?._cunningStrike` (line 316) is never set (see above). `else if (autoDamageContext)` at line 295 additionally shadows the pendingDamage branch whenever the prop is non-null-but-property-less.
- Control-attack zero damage points at the broader post-Done autoDamage leg (`AttackResultPopup.jsx:17-26` dispatch → `useLoggedDiceRoll.js:37-40` → `resolveAttackDamage`) — same family as bug-mn-009 (attack-rider/damage resolution regression).

## Notes
- Pitfalls ruled out: 10s debounce (waited 15s+, polled change-data directly), wrong target type (EB-joined monster, name matches monsters.json), level requirement (lv14 ≥ lv11; ICS text present on sheet), finesse weapon (Shortsword +7, sneak 7d6 shown on sheet), advantage (prone pre-set; popups show Advantage + vs AC 12), stale-cache blaming (ground-truth fetches), target dropdown (set and rendered in popup).
- Rider selection half of CLA-188 (two effects, 1d6 each cost, effects + saves + logs) is functionally correct; the data (classes.json lv11 maxEffects:2) is correct.
- Data note: this dataset places Devious Strikes (maxEffects 2, all 6 options) at base-Rogue lv14, so at lv14 the picker header is "Devious Strikes"; exact "Improved Cunning Strike" header only appears at lv11-13 for Rogue in this dataset.
- Cleanup done: rug card removed, Admin Clear Change Data + Clear Campaign Log verified empty.

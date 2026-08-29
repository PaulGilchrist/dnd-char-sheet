# Bug CLA-158 — Hand of Harm: necrotic damage never applied to target HP; Disadvantage effect has no badge/consumption for monsters

## Title
CLA-158 Hand of Harm (2024 Warrior of Mercy, reaction): failed CON save rolls and logs 1d6 Necrotic but never reduces the target's HP; `disadvantage_next_attack` targetEffect is stored yet renders no badge and is never consumed by the monster's next attack.

## Overview
End-to-end Playwright verification on test-campaign (2024 rules) with newly created **MercyMonk** (Monk, Warrior of Mercy, lv5, WIS 15 ⇒ spell save DC 13) vs **Animated Rug of Smothering 1** (CON +0, AC 12). The reaction button, focus-point cost, save prompt, die scaling and logging all work. Damage application and effect visibility do not.

## Expected
On save failure: target takes 1d6 necrotic (lv5) **and its HP is reduced by the rolled amount**; target shows a "Disadv Next Attack" effect badge (`disadvantage_next_attack` is registered in `targetEffectDefinitions.js`); the monster's next attack roll is made with disadvantage and the effect is consumed.

## Actual
- Rug HP stayed **27/27** (initiative card input, and `combatSummary` in `/change-data`) minutes after the failed save. No "apply" affordance exists on the log entry (log entry is display-only).
- No badge anywhere: `.creature-card` for the rug renders zero `.creature-badge` elements even after full reload with `campaign.targetEffects` confirmed persisted in change-data: `{target:"Animated Rug of Smothering 1", source:"Hand of Harm", effect:"disadvantage_next_attack", duration:"until_used"}`.
- Focus points consumed correctly 5→4; CON save prompt "DC 13" (monk WIS spell save DC) correct; roll logged `1d6(6) Necrotic → Animated Rug of Smothering 1`.

## Steps
1. Create MercyMonk (2024, Monk, Warrior of Mercy, lv5, WIS 15) via Add Character wizard.
2. Encounter Builder → search "Animated Rug" → Select → Join Encounter. Visit Initiative (PC merge).
3. Advance to rug's turn, set rug card Target = MercyMonk, open stat modal (`.mc-overlay`) → click Smother "+5" → HIT → Done (monk takes damage).
4. MercyMonk sheet → Reactions → click "Hand of Harm:". First attempt shows "requires a target" popup — the handler resolves the **monk's own** initiative-card Target dropdown; set monk card Target = Rug, re-click.
5. Save prompt appears → Roll Save → SAVE FAILURE (7 vs DC 13) → Done.
6. Check rug initiative card HP + badges, and Log.

## Likely Location
1. **Damage not applied**: `src/services/automation/handlers/reactions/reactionDamageHandler.js` — `createSaveListener` call (~L146) passes **no** `damageFormula`/`rawDamage`, and its `save-result` listener (~L157-205) rolls `auto.damageExpression` and only calls `addEntry` (roll log) — never `applyDamageToTarget`. The global applier `src/hooks/combat/useLoggedDiceRollEventHandlers.js:41` explicitly skips createSaveListener prompts ("resolves its own save ... nothing more to do"), so nobody applies HP for this path. Contrast `saveProcessing.js:266-307` (applySaveDamage) which does apply when a damageFormula is registered.
2. **No badge**: `src/components/initiative/ConditionEffectBadges.jsx` has no rendering branch for `te.effect === 'disadvantage_next_attack'`; `computeConditionEffects` counts it into `attackDisadvantageCount` (`src/services/combat/conditions/conditionEffects.js:332`) but that count is only consumed in `CharSheet.conditionEffects.js` (PC attackers) — never displayed.
3. **No monster-side consumption**: `src/components/encounter/MonsterCardModal.jsx` never reads `disadvantage_next_attack` from `campaign.targetEffects`, so a monster's next attack has no disadvantage and the `until_used` effect persists forever.

## Notes
- Reaction UX quirk: Hand of Harm click uses the monk's OWN card Target dropdown (`resolveTarget(campaignName, playerStats.name)` → `getTargetFromAttacker`), not the attacker from `campaign.lastAttack`; with an "attacker hits you" trigger this should arguably default to the last attacker (lastAttack showed `attackerName:"Animated Rug of Smothering 1"` available at click time).
- Reaction gating: button works even outside a fresh hit — no trigger validation against `lastAttack`.
- DC came out as 13 (8+WIS2+PROF3) despite `buildSaveDc('ability')` defaulting to CON in `automation/common/savePrompt.js:11` — monk computed stats apparently supply `saveAbility:'WIS'`; rules-correct outcome here.
- Reusable character left in campaign: **MercyMonk** (Warrior of Mercy lv5). Re-test after fix should additionally expect 2d6 at lv11 / 3d6 at lv17 scaling per `scaling:{11:'2d6',17:'3d6'}`.

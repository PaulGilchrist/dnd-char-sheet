# Bug CLA-191 — Improved Shadow Step: cloud effects never expire ("until the start of your next turn" not enforced)

## Overview
Improved Shadow Step (Warrior of Shadow Monk lv10, 2024) triggers correctly on Shadow Step teleport — perception-disadvantage targetEffect + forced WIS save + Blinded-on-fail all land — but NONE of the effects ever expire. At the start of the monk's next turn (verified after a full round turn-walk + 11s debounce), the Blinded condition and the perception-disadvantage targetEffect are still active on the target, and the caster's own `next_attack_advantage` (`until_end_of_turn`) also persists. Duration fields are declarative-only; the handler writes directly to runtime stores without enqueueing `pendingExpirations`.

## Expected
Teleporting with Shadow Step leaves a cloud of shadows in the space left: creatures there have Disadvantage on Wisdom (Perception) checks and must make a WIS save (Focus DC = 8+WIS+PB) or gain the Blinded condition **until the start of your next turn** — i.e. both the Blinded condition and the perception disadvantage must clear when the monk's next turn begins.

## Actual
- Fire-on-teleport half works: teleport popup + log `ability_use`; te `disadvantage_perception_checks` (duration `until_start_of_next_turn`) written to the resolved target; WIS save prompt DC 18 issued; on fail `blinded` pushed to target `activeConditions` + Blinded badge renders.
- At monk's next-turn start (`activeCreatureName === 'Disciplined_Monk'`, round advanced past the Rug), change-data still shows:
  - `targetEffects`: `Animated Rug of Smothering 1:disadvantage_perception_checks:until_start_of_next_turn` AND `Disciplined_Monk:next_attack_advantage:until_end_of_turn`
  - `Animated Rug of Smothering 1.activeConditions: ["blinded"]`
- No `pendingExpirations` entry is ever created by the teleport path; `expireStaleEffects`/`expirationQueue` consumers never see these effects, so nothing clears them (known residual-flag family: bug-cla-175, seen again in SP-069).

## Steps to Reproduce
1. Convert a 2024 Monk lv≥10 to **Warrior of Shadow** (Edit wizard step-7 combobox → "Warrior of Shadow" → ✓ Save; verify JSON). Used Disciplined_Monk lv17 (WIS 19, PB +6 → DC 18).
2. Encounter Builder → tick "Animated Rug of Smothering" → Join Encounter (WIS save −4, cannot beat DC 18).
3. Initiative view → monk card Target dropdown = "Animated Rug of Smothering 1" → walk turn to monk.
4. Monk sheet → Special Actions "Shadow Step:" → modal → Teleport → Roll Save (fails) → Done, Done.
5. Walk `Next →` a full round until change-data `activeCreatureName === 'Disciplined_Monk'` again.
6. Fetch `/api/campaigns/test-campaign/change-data`: targetEffects + rug `activeConditions` still contain the cloud effects.

## Likely Location
- `src/services/automation/handlers/class-warlock/tempTeleportHandler.js:125-161` (`confirmTeleport`): writes `disadvantage_perception_checks` te (line 132-139) and `blinded` to `activeConditions` (line 151-153) directly, with NO `pendingExpirations`/`expirationQueue` enqueue — contrast `src/services/rules/effects/expirationQueue.js` + `expireStaleEffects.js` which only expire queued entries.
- Same for the caster's `next_attack_advantage` te (line 107-114, `until_end_of_turn`) — no turn-end cleanup consumer.
- Minor (secondary): the perception te has no initiative-card badge rendering (registry entry exists in `targetEffectDefinitions.js:205` "Perception Disadv" but card shows only Blinded/Adv-vs); and the "cloud in the space you left" is modeled as the combatSummary Target-dropdown creature (no map/position check), so multi-creature origin spaces are not implemented.

## Notes
- classes.json ground truth: Improved Shadow Step is Warrior of Shadow **lv10** (manifest "lv11+" stale); Shadow Step lv6 `temp_buff`/`shadow_step_teleport`.
- Save prompt required a manual "Roll Save" click (createSaveListener path); NPC did not auto-roll despite combatSummary `saveBonuses.wis:-4`.
- Manifest paths in the task (classFeatureHandler/Router/InfoBuilder) do not exist; real chain: `buffHandler.js:87` → `tempTeleportHandler.handle` → `TeleportModal` → `confirmTeleport`; passive plumbing `automationRouter.js:317` (shadow_step_rider → passives) → `collectAutomationFromFeatures` (`rules.js:170`).

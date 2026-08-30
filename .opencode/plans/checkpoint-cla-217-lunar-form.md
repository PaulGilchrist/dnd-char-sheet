# CHECKPOINT — CLA-217 Lunar Form (Druid, Circle of the Moon lv14, 2024)

## Setup state (2026-08-30)
- **Wild_Sage_Druid** lv20 2024 Human Druid, subclass swapped **Circle of the Land → Circle of the Moon** via Edit wizard step-7 combobox + ✓Save. JSON ground truth confirmed after 15s debounce: `class.subclass.name = "Circle of the Moon"`, level 20 (≥14 OK). WIS 16 (+3), spell DC 17, to-hit +9.
- Sheet now renders Special Actions **"Lunar Form:"** passive row with both halves (Improved Lunar Radiance 2d10 Radiant once/turn on WS attack hit; Shared Moonlight teleport-ally text) and **"Moonlight Step:"** bonus-action row + "Moonlight Step Uses:" counter.
- Registry (CLA-184) had Moon lv20 here before CLA-208 swapped it to Land; reverted as permitted.

## Code map (verified by grep)
- Data: `public/data/2024/classes.json` Druid majors[1] Circle of the Moon features[4] "Lunar Form" lv14: `automation[0] damage_bonus 2d10 Radiant trigger weapon_or_beast_form_attack_hit oncePerTurn upgrades:"Improved Circle Forms"`, `automation[1] moonlight_step_rider`.
- Damage consumer: `src/services/combat/steps/attackRollBonuses.js:169-225 buildWeaponHitBonusesStep` — filter `trigger weapon_attack_hit|weapon_or_beast_form_attack_hit`; lv6 "Improved Circle Forms" 1d10 excluded via `upgrades` set; **NO shape_shift gate** (fires on any PC-sheet weapon hit — matches playbook CLA-190 "Moon Druid unarmed hits emit Lunar Radiance 2d10 noise = expected"). Once-per-turn key `_Lunar_Form_usedRound` = current round. damageType "Radiant" (no " or ") → formula `+ 2d10 [radiant]` inline, NO damage-type modal.
- Pipeline: attackRollDamageSteps.js:20 → useAttackDamageResolution.js (PC sheet dice links).
- Shared Moonlight consumer: `src/services/automation/handlers/class-warlock/tempTeleportHandler.js:163-181` — on moonlight_step_teleport with 'Lunar Form' passive: writes te `next_attack_advantage` for the resolved target + description "Shared Moonlight: X also gains Advantage" (gridless subset, no real 2nd-creature teleport UI).
- Moonlight Step teleport modal: CharSpecialActionsModals.jsx:118 `isMoonlightStep`; uses key `moonlightStepUses` (tempTeleportHandler.js:116-123).
- Wild Shape: sheet Bonus Actions "Wild Shape:" → picker → `activateWildShape` (wildShapeCreatureBuilder.js) → tempHP 3×lv, targetEffect wild_shape, `lunarFormAction` stamped on combatSummary creature at lv≥14 (:96-103) for initiative-card mc-overlay display.

## Test plan
1. Encounters → EB join "Animated Rug of Smothering" (AC 12 HP 27, proven).
2. Druid turn R1: Moonlight Step → teleport → Shared Moonlight subset evidence (advantage te + log).
3. Druid turn R2+: Wild Shape (Brown Bear) → attack(s) → verify `+ 2d10 [radiant]` in damage popup/formula + log, once-per-turn (2nd attack same round = no bonus), miss = no bonus.
4. Cleanup: remove monster, Admin Clear Change Data + Clear Campaign Log.

## Status
- [x] Moon Druid lv14+ exists (Wild_Sage_Druid lv20 Moon)
- [x] Lunar Form appears on sheet
- [ ] Combat E2E damage verification
- [ ] Cleanup

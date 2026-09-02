# CLA-274 Psychic Blades — blade dice/damage exact, but second-blade action economy is ungated (unlimited attacks, no manifest/attack gating, no vanish, Vex unmodeled)

## Overview

CLA-274 Psychic Blades (2024 Rogue — Soulknife major, lv3, `public/data/2024/classes.json` line ~10091). Verified live 2026-09-02 with AasimarTest (Soulknife lv14, Dex 14 +2 / Int 11 +0, PB +5) vs EB-joined Thug 1 (AC 11, HP 32).

The attack math is exact — Action blade 1d6+2 Psychic (+7 to hit), bonus second blade 1d4 Psychic (no ability mod, matching canonical "1d4 damage") — and damage applies correctly (this run did NOT reproduce the bug-cla-188 damage-loss path). The failure is the action-economy half: the app models the blades as two permanently-rendered attack rows with zero gating and zero use tracking.

## Expected Behavior (canonical app-data wording, classes.json Soulknife lv3)

> "Manifest shimmering blades of psychic energy. When you take Attack action or make Opportunity Attack, manifest Psychic Blade in free hand. Simple Melee, 1d6 Psychic + ability modifier, Finesse, Thrown (60/120), Mastery: Vex (doesn't count against Weapon Mastery). Vanishes after hit/miss. After attacking, can make melee or ranged attack with second psychic blade as Bonus Action (1d4 damage)."

Automation metadata: `{ type:'bonus_action_attack', trigger:'psychic_blade_attack', action:'bonus_action', weaponAttack:true, extraDamageExpression:'1d4', uses_expression:'psionic_energy_die' }`.

## Actual Behavior

VERIFIED WORKING:
- Actions grid row "Psychic Blade | 5 ft. | +7 | 1d6+2 | Psychic | Vex" — click "+7" auto-rolls: popup "d20 17 +7 (+7 to hit) ✓ HIT (24 vs AC 11)"; damage popup/log "1d6+2 [psychic] + 7d6 [Sneak Attack] ... 31 damage applied to Thug 1 — HP: 32 → 1". Weapon dice + ability mod + Psychic type EXACT (abilityBonus = max(Dex,Int) per attackCalc2024.js:371).
- Bonus Actions grid row "Psychic Blade | 60 ft. | +7 | 1d4 | Psychic | Vex" — full attack resolved: HIT (12+7=19 vs AC 11), popup/log "1d4 [psychic]: 4 → 4 damage applied — HP: 30 → 26". Second blade is 1d4 with NO ability mod — canonical, no flag needed.

FAIL (action economy / gating / persistence):
1. **No "after attacking" gate** — the Bonus Actions 1d4 row renders unconditionally at turn start (snapshot captured before any Attack action), and its "+7" fully resolves attacks with no prior blade attack. Control evidence: the very first bonus-blade interaction (02:44:55 log "Psychic Blade Psychic 1d4(4)4") happened on a turn with no preceding attack roll.
2. **Uses never tracked — second blade unlimited per turn** — clicked the same-turn bonus-blade "+7" AGAIN after the legitimate one: full second bonus attack resolved: HIT (13 vs AC 11), "1d4 [psychic]: 3 → 3 damage applied — HP: 26 → 23", logs at 02:51:22 / 02:51:39. Two "second blades" in one turn, no block, no counter, no once-per-turn key.
3. **No vanish modeling** — both blade rows persist statically in the sheet after hit AND after miss rolls (rows still present post-attack). Rows are hardcoded in `src/services/rules/core/attackCalc2024.js:365-413` with no removal/expiry consumer; grep `isPsychicBlade` shows only Homing Strikes miss checks (hitResolution.js:163) and Rend Mind (rendMind.js:11), never row removal.
4. **Vex mastery unmodeled for the blades** — "Vex" text renders in the Mastery column (CharActions.jsx:435 `getWeaponMastery` display + info popup), but miss→advantage te is only produced by `auto_effect`/`trigger:'miss'` passives (`src/hooks/combat/attackPostProcessing.js:131-134`); Psychic Blades automation (`bonus_action_attack`) contributes no such passive, so no `next_attack_advantage` te is ever written for blade misses. The `mastery:'Vex'` field on the attack objects (attackCalc2024.js:390/410) has no combat consumer.
5. **`uses_expression:'psionic_energy_die'` is nonsense-resolved and unconsumed on the attack-row path** — `automationExpressions.js:115` substitutes the die SIZE (e.g. "10" at lv14), so `usesMax` in `automationInfoBuilder/attack.js:172-188` = 10, and the only consumer (`src/services/automation/handlers/combat/bonusActionAttackHandler.js:28-45`) spends the hardcoded `warPriestUses` runtime key — a key Psychic Blades never writes. (The sheet's attack-row click path never reaches this handler anyway; it just rolls.) Canonical: blades do NOT expend psionic dice — so harmless-by-accident, but the metadata is dead/mis-wired.

Secondary observation (not part of the verdict): after the Action-blade "Done", a "Devious Strikes" `.sp-overlay` rider modal appeared (lv14 base-Rogue Cunning Strike, known CLA-188 family); clicking **Cancel** still surfaced a CON save prompt "Thug 1 must make a CON saving throw DC 15" (rolled, saved 20 vs 15, no effect). Cancel-alongside-forced-save is suspicious but caused no state change.

## Steps to Reproduce

1. Campaign test-campaign → AasimarTest (2024 Rogue, Soulknife lv14; if `class.major` stale per PITFALL #11, JSON currently shows `class.major` absent + `subclass.name:'Soulknife'` which classRules2024.js:30 resolves fine — sheet shows both blade rows).
2. Encounter Builder → search "Thug" → tick "Select Thug" → Join Encounter. Set AasimarTest initiative-card Target dropdown = Thug 1.
3. Control check: BEFORE any attack, note Bonus Actions grid already shows "Psychic Blade | 60 ft. | +7 | 1d4 | Psychic" and its "+7" rolls a full attack.
4. Sheet Actions grid → Psychic Blade row "+7" → auto-roll HIT → Done → (Devious Strikes modal → Cancel → CON save prompt → Roll Save → Done) → damage popup "1d6+2 [psychic] (+ Sneak)".
5. Bonus Actions grid → Psychic Blade "+7" → Done → "1d4 [psychic]" damage applied (legit second blade).
6. Click the SAME Bonus Actions "+7" again same turn → rolls and applies damage AGAIN → ungated repeat use.

## Likely Location

- `src/services/rules/core/attackCalc2024.js:365-413` — both rows built unconditionally; no state flag for "blade manifested" / "second blade spent".
- `src/components/char-sheet/CharBonusActions.jsx:166-180` — bonus-attack filter has Nick and Horde Breaker gating patterns to copy, but nothing for `isPsychicBlade` (no "Attack action taken this turn" requirement, no once-per-turn round key like `_PsychicBlade_secondBlade_round`).
- `src/hooks/combat/attackPostProcessing.js:131-134` — Vex miss→advantage only from `auto_effect` passives; blade mastery `Vex` never enters this pipeline.
- `src/services/automation/handlers/combat/bonusActionAttackHandler.js:28-45` — `usesMax` (from die-size mis-substitution) spends `warPriestUses` — wrong key, dead path for this feature.

## Notes

- Dice/type/mod math is trustworthy; the fix is availability state, not damage.
- Bonus row range renders "60 ft." (thrown long range) while type renders melee reach 5 ft on action row — thrown variant selectable via same rows; acceptable.
- Register AasimarTest (Soulknife lv14) as retest-ready post-fix.

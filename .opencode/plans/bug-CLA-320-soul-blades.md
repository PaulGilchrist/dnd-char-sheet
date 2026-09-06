# bug-CLA-320-soul-blades.md — FAIL

**Automation:** CLA-320 Soul Blades (Rogue [Soulknife] 2024 classFeature, lv9, `public/data/2024/classes.json` Rogue majors[Soulknife].features). Row "Automation type: undefined" refuted — REAL types: `auto_reroll` {trigger:psychic_blade_miss, bonusExpression:psionic_energy_die, resourceCost:psionic_energy} + `auto_effect` {effect:psychic_teleportation, uses:'1', recharge:'short_rest'}.

**Rig:** AasimarTest lv17 2024 Soulknife (subclass Thief→Soulknife via Edit wizard tab 7, PERMANENT), hit +8 (DEX 14 +2 + PB 6), lv17 energy data d12×12 (`Rogue.class_levels[17].energy {required_major:"Soulknife", energy_die_type:12, energy_die_num:12}`). EB Knight 1 (AC 18, HP 52) joined+target-armed; popup-driven attacks.

## Clause 1 — Homing Strikes: FAIL (converted hit never deals damage)
Working subset (hitResolution.js:159-205 AUTO): fires on own Psychic Blade miss; miss-converted→consumes exactly 1 (`psionicEnergy` 12→11→10→9 with ability_use logs "…turn a miss into a hit, consuming 1 Psionic Energy. Psionic Energy: N/12."); still-miss = die NOT expended (pool flat) + log "tried Soul Blades (Homing Strikes) but even with the psionic die roll of X, the attack still missed (total: N vs AC: 18)" — RAW-exact expend.

BUG 1 (core): when homing converts a miss to a hit, NO damage ever rolls/applies. Live: d20 8+8=16 vs AC18 → popup shows "✗ MISS (16 vs AC 18)" with **no Done button**, ability_use conversion log written, pool−1, lastAttack persists `hit:true` — Knight stayed HP 47 (control direct HIT + Done → damage roll 5 + hp_change 52→47 proves sheet damage works otherwise). Root seam: popup `computedHit` recomputed from RAW total (`DiceRollResult.computed.js:82` `finalTotal >= effectiveAc` — homingStrikesBonus never folded in), Done gated by `autoDamage && computedHit` (`DiceRollResult.jsx:711`) → flipped hit has no Done → onDone never fires → no damage roll. SP-105-family popup-vs-authoritative-hit bug, inverted direction. Popup also never prints the homing add line.
BUG 2 (RAW): fires on natural 1 "CRITICAL MISS" (live: d20 1+8=9, homing rolled d12=6 logged attempt, pool intact). `hitResolution.js:166` only excludes `isAutoMiss` (cover/range), nat-1 is not auto-miss there → app can convert a nat-1 to a hit at lower AC; canonical: attack roll of 1 always misses.
BUG 3 (RAW, manual row): the auto_reroll collector routed the same feature into the sheet **Reactions** row "Soul Blades:" (`automationRouter.js:125` ct undefined → reactions; CharReactions → `executeHandler` → `autoRerollHandler.js:294-351`). Live click after an already-resolved fresh still-miss: popup "Bonus: +2 … Modified: d20(9)+8=17 vs AC 18 → MISS … Still a miss." yet **pool consumed 9→8** (`:340` unconditional expend — canonical expend only on resulting hit). Second dice + second chance on the same failed miss (auto homing already consumed the miss-resolution) — double-dip, ungated. Branch also never checks the miss was a Psychic Blade attack (`trigger:psychic_blade_miss` unenforced — any own attack-miss/failed check qualifies).
Minor: `lastAttack.homingStrikesBonus` undefined in change-data (`attackPostProcessing.js:27` passes it but persisted lastAttack has no homing keys, total stays RAW 16 with hit:true — machine-readable homing evidence lost); opt-in wording ("you can roll") is auto-rolled with no decline UI (house auto pattern, report-only).

## Clause 2 — Psychic Teleportation: FAIL (inert, zero live consumers)
grep+probe proven:
1. No UI: sheet Bonus Actions rows come from `playerStats.bonusActions` (`CharBonusActions.jsx:384`); router pushes this automation into `automation.bonusActions` (`automationRouter.js:156-163`) — NO component renders automation.bonusActions rows. Live: zero clickable "Psychic Teleportation" element anywhere on the sheet (only non-clickable feature text twice).
2. Dispatch dead: `automation/index.js:449` registers `psychic_teleportation: handlePsychicTeleportation` as a **type** key in HANDLER_MAP; the data declares `type:'auto_effect'` (`HANDLER_MAP['auto_effect']` undefined; only wild_magic_surge_table/double_roll special-cased at :704-707). Live `executeHandler({automation:{type:'auto_effect',effect:'psychic_teleportation',…}}, ps, 'test-campaign')` → **returns null, pool untouched 8→8**.
3. Handler itself (`psychicTeleportationHandler.js`) even if reached: expends 1 die + rolls d12×10 + ability_use log, but performs NO token/grid movement, NO target-space picker, NO blade-vanish state (blade "manifest" = round latches `_PsychicBlade_attack_round`/`_PsychicBlade_secondBlade_round`, untouched). Data `uses:'1'/recharge:'short_rest'` unmodeled (pool-only; canonical is pool-only so data is the outlier).
No teleport position/state change observable (no combatSummary token move consumer in chain).

## Collateral (flag for follow-up)
- `hitResolution.js:243` Death Strike ("Assassin lv17") branch has NO class gate — a Soulknife's round-1 sneak-armed hits wrote `targetEffects {source:'Death Strike', effect:'death_strike', saveDc:16, damageDoubled:true}` ×2 live.
- Sheet attack hit popups: background-click dismiss ABANDONS damage (pitfall-18 confirmed on sheet, not just EB); popup's own `.dice-roll-reroll-btn` "Done" is the only applier.

## Canonical vs data
- Data die table lv17 d12×12 with lv3 d6 start mirrors Psi Warrior table but is stamped required_major Soulknife — canonical 2024 Soulknife starts d8×8 at lv1 (data likely copied from Psi Warrior levels; report, unverified-vs-PHB caveat).
- Feature level lv9 = canonical 2024 Soulknife lv9 ✓.
- Homing expend-on-hit only = canonical ✓ (hitResolution); manual row expend-always = divergence; nat-1 convertible = divergence.
- Data uses:1/short_rest on teleport clause has no canonical basis (pool-gated in PHB) — data artifact.

**VERDICT: FAIL** — clause 1 core miss→hit→damage chain drops all damage and violates nat-1 rule; clause 2 entirely inert (zero consumers).

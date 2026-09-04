# Bug CLA-310 — Shadowy Dodge (2024 Ranger Gloom Stalker lv15): no reaction spend / unlimited re-trigger / retroactive disadvantage simulation only

## Verdict: FAIL (per playbook pitfall 23 verdict policy: ungated trigger + no reaction consumption = FAIL even though observable delta exists)

## Data / wiring (all verified live)
- `public/data/2024/classes.json` Ranger `majors[2]` = **Gloom Stalker**; `features[4]` = **Shadowy Dodge** lv15:
  `{type:'shadowy_dodge', trigger:'after_attack_roll_against_you', range:'30_ft', casting_time:'1 reaction'}`
- Info builder `src/services/combat/automation/automationInfoBuilder/reaction.js:105` → type/range/casting_time copied.
- Router `src/services/combat/automation/automationRouter.js:402` → `result.reactions.push(info)`.
- Dispatch `src/services/automation/index.js:124,430` → `shadowy_dodge: handleShadowyDodge`.
- Handler (mis-filed): `src/services/automation/handlers/class-warlock/shadowyDodgeHandler.js` (warlock folder — filing bug noted).
- Sheet row renders + clickable via `CharReactions.jsx:703-708` (`hasAutomation` → `executeHandler`); `cannotAct` is condition-only, not turn-gated.

## Observed live (test-campaign, FeyRanger lv17 subclass → Gloom Stalker via edit wizard step 7; disk `class.subclass.name = Gloom Stalker`, "Shadowy Dodge:" row confirmed)
1. **NO prompt at attack moment.** Thug 1 avatar → mc-overlay → Mace +4: dice popup appeared immediately with the roll already resolved (`d20 1 +4 = 5 vs AC 9 → MISS`). Zero Shadowy Dodge modal pre-roll or post-roll. Model = manual post-roll row click (arm-then-row family, but no ARM state — row live anytime).
2. **Disadvantage is retroactive simulation, not attacker roll-mode.** Handler rolls its own second `Math.random()` d20 (`Math.min`), and on hit→miss calls `rollbackDamage` (heals). Attacker's actual dice are never re-rolled; no 2d20 disadvantage mode is imposed; **no targetEffects/state written at all** (`targetEffects: null` in change-data after full flow). `disadvantage_next_attack` te exists in registry (targetEffectDefinitions.js:31) but is unused here.
3. **Rollback works:** Thug 1 HIT d20(14)+4=18 vs AC 9, 7 dmg applied (card 89→82). Row click #7: popup `Disadvantage (second d20: 1): d20(1)+4=5 vs AC 9 → MISS … Damage negated: 7 HP restored. Teleported 30 feet…`; initiative card back to **89**; logs: `ability_use "…Thug 1's attack misses. The attack is retroactively negated and FeyRanger is healed for 7 HP."` + `"…imposing Disadvantage and teleporting 30 feet. 7 damage was negated."`
4. **Gate FAIL — no reaction/uses consumption:** clicked row 7× against the SAME lastAttack → 7 full re-fires (7 `ability_use` entries, fresh second d20 each: 14,16,…,1). No reaction key exists anywhere in code (`grep reactionUsed|spendReaction` = 0 consumers) and the handler spends nothing. RAW 1 reaction + once-per-trigger is unenforced (pitfall 19 signature).
5. **Target gate works:** after Thug 2 hit LightfootHalfling (control, normal mode `d20 12+4=16 vs AC 13 HIT`, single d20, Halfling 12→9), holder row click → refusal popup `No recent attack roll against you found. Shadowy Dodge can only be used shortly after an attack roll.` (gate = `findLastAttack` targetName check only; no staleness window — same lastAttack reusable forever until next roll).
6. **Ranged/melee:** data declares no restriction; handler ignores `weaponType` — consistent with data (no bug).
7. **No auto-defense on miss-spam:** clicks #1–6 on the same HIT rolled `second d20 ≥5 → HIT "attack still hits despite Disadvantage"` and wrote full log entries each time (log spam, zero gate).

## Fix directions
- Write a consumed-reaction gate keyed to lastAttack timestamp (e.g. `_ShadowyDodge_appliedAttack_ts`) so one attack roll can be dodged once; block re-fire when spent and surface "Reaction already used".
- Optionally consume a generic reaction counter (none exists app-wide — coordinate with CLA-297 family).
- Registry: no new te needed if simulation model stays; if attacker-disadvantage-on-next-attack model adopted, reuse `disadvantage_next_attack`.
- Re-file handler into a ranger folder (`class-ranger/`).

## Cleanup state
- Admin Clear Change Data + Clear Campaign Log executed at end of session.
- FeyRanger subclass **LEFT as Gloom Stalker** (known-good was Beast Master).

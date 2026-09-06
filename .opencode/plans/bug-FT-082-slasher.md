# FT-082 Slasher (2024) — VERIFIED: FAIL

## Scope
ROW clause: "Once per turn when you hit a creature with an attack that deals Slashing damage, you can reduce the Speed of that creature by 10 feet until the start of your next turn."

## Holder / rig
EvasiveFighter lv18 Fighter/Champion 2024 via Edit wizard only (feats tab `.list-item-checkbox-trigger` on Slasher row; Abilities-step fixed-pair ASI combobox rendered — nth=5, options Strength/Dexterity — chose Dexterity). Disk: feats += Slasher, `featAbilityChoices["Slasher-2"].assignment="Dexterity"` exact once, DEX 8+1bg+1feat=10.
**Orchestrator assumption corrected:** 2024 shared `public/data/equipment.json` Shortsword = **Piercing** (not Slashing). Equipped **Scimitar (Slashing 1d6+1, Nick)** + kept Shortbow/Shortsword as piercing controls via Inventory-step textarea real keystrokes. EB: Zombie (HP15) + Skeleton (HP13) joined via Join Encounter; EF target-select = Zombie 1; no map (lenient range).

## PASS evidence (core math/gates exact)
- Slashing hit → `Hamstring:` row clickable `b.clickable` in `.char-actions` (optional "you can" — manual row click, no auto-apply; matches canonical).
- Row click → te EXACT: `{target:'Zombie 1', source:'EvasiveFighter', option:'Hamstring', effect:'speed_reduction', value:10, duration:'until_start_of_next_turn'}` + popup "Hamstring applied to Zombie 1 — target's Speed reduced by 10 ft…" + two ability_use logs ("Hamstring used against Zombie 1" + full feature sentence).
- Initiative card badge: Zombie 1 = `creature-badge effect-debuff` "Speed -10" EXACT; Skeleton control has none (target scoping ✓). Consumers real: `attackRiderHandler.js:32` gates + `:514-552` te/log, `conditionEffects.js:361` sum, `ConditionEffectBadges.jsx:156-158` badge. NOT inert.
- Same-turn latch: 2nd slashing hit same round → refusal popup "Hamstring can only be used once per turn.", te count unchanged ✓.
- Damage-type gate: Shortbow Piercing crit hit → refusal "Hamstring requires Slashing damage. Your last attack dealt Piercing damage.", te unchanged ✓. Miss/not-mine/no-attack branches vitest-locked (`attackRiderHandler.test.js:330`).

## FAIL defect 1 — duration NEVER expires (primary)
`applyRiderEffect` writes the te but registers **zero** `addExpiration` (contrast crusher/slasher-crit which call `addExpiration`). `expireStaleEffects` only drains pendingExpirations queues; grep confirms no generic scanner removes `duration:'until_start_of_next_turn'` targetEffects. LIVE: te + "Speed -10" badge persisted across the holder's next-turn start (round 3 AND round 4, `pendingExpirations` keys absent in change-data, badge still on card while activeCreature=EvasiveFighter) and survived page reload → permanent −10 Speed. RAW clause "until the start of your next turn" unenforced (pitfall-23 policy: unenforced clause = FAIL).

## FAIL defect 2 — once-per-turn latch stamped from stale mirror (degrades to once-per-2-rounds)
`markOncePerTurn` (`oncePerTurn.js:157`) stamps `cs.activeCreatureName` from combatSummary mirror; per pitfall 30 that mirror stayed "AasimarTest" all combat while top-level truth was EvasiveFighter. change-data `_Hamstring_usedRound = {round:2, activeCreature:"AasimarTest"}`. LIVE round 3, holder's own turn, fresh slashing hit: Hamstring refused "can only be used once per turn." Re-arm only when `round > stored+1` (round 4). Same family as FT-074 stale-latch: stamp must use `playerStats.name`.

## Collateral (FT-074 family, environmental)
Shield Master's Shield Bash fires on EVERY EF melee hit (STR DC 15 save queue), strands damage until resolved, overwrites `lastAttack` with `{attackName:'Shield Bash', damageType:null}` (live observed), and left a ghost `pendingSavePrompts` entry that vanished its own modal. On shield-holding holders these can make Hamstring refuse with "dealt unknown damage"/false-miss.

## Fix pointers
1. In `attackRiderHandler.applyRiderEffect` speed_reduction branch (no-save options): `addExpiration(playerStats.name, targetName, [{type:'remove_target_effect', effectKey:'speed_reduction', source:playerStats.name…}], campaignName, undefined, playerStats.name)` mirroring slasher.js:25 (or clear by option+source at holder turn start).
2. `markOncePerTurn`: stamp `playerStats.name` not `cs.activeCreatureName` (or read top-level `activeCreatureName`).
3. Shield Bash lastAttack overwrite: stamp the bash as a sub-event or restore base-weapon lastAttack after resolution.

## Registry/manifest
Registry `speed_reduction` (targetEffectDefinitions.js:711) + `slasher_enhanced_critical` (:22) both exist and are used. Hamstring Enhanced-Critical bullet (pipeline `slasher.js`) untouched this run (non-focus; crit path vitest-covered `useAttackDamageResolution.feats.test.js`).

## Config retained after cleanup (Admin clear CD + log; verified keys=0, log=0; servers killed)
EvasiveFighter lv18 2024, feats [GWM, Mage Slayer, Savage Attacker, Shield Master, Skill Expert, Slasher], ASI DEX(+1→10), equipped [Scimitar, Shortbow, Shortsword, Shield].

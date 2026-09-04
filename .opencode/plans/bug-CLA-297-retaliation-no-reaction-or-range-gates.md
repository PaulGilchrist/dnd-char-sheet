# BUG CLA-297 — Retaliation (Path of the Berserker lv10): no reaction consumption, no range/target gates

**Verdict: FAIL** (core attack flow works with exact math, but feature is completely un-gated: unlimited uses, no reaction spend, ranged-damage triggers accepted, re-click self-targets, no automation log).

## Canonical

> **Retaliation** — When you take damage from a creature that is within 5 feet of you, you can take a Reaction to make one melee attack against that creature, using a weapon or an Unarmed Strike.

Data (`public/data/2024/classes.json:908-920`, classes[0] Barbarian majors[0] Path of the Berserker features[2], level 10):
`{type:'reaction_damage', trigger:'damage_from_adjacent_creature', range:'5 ft', effect:'melee_attack_reaction', casting_time:'1 reaction'}` — no `saveType`, so the handler takes the generic no-save branch.

## Consumer chain (verified live + source)

- `automationRouter.js:97` `case 'reaction_damage'` → `result.reactions` (both branches identical — the psychic-damage ternary is dead symmetry).
- `automationInfoBuilder/reaction.js:26` builds info; for Retaliation all damage/save fields null, `hasAutomation:true`.
- `CharReactions.jsx:168/231` row click → `handleAutomationReaction` → `executeHandler` (`automation/index.js:334` `reaction_damage: handleReactionDamage`).
- `reactionDamageHandler.js` generic `!auto.saveType` branch (~:88): `findLastAttack(campaignName)` → `targetName = lastAttack.attackerName` → returns `{type:'attack_roll', payload:{attack, targetName, sourceName:'Retaliation'}}`; `CharReactions.jsx:243` → `rollAttack(..., {isOpportunityAttack:true})`.
- **App surface = arm-then-row** (documented model): there is NO automatic damage-moment prompt; the clickable "Retaliation:" sheet row must be clicked manually after the triggering hit lands. This matches how other reaction_damage consumers work (giantAncestryEntryPoints.js Storm's Thunder family).

## PASS evidence (core flow)

- Edit wizard step 7 combobox → Path of the Berserker → ✓ Save (wait 15s + reload): sheet Reactions shows clickable **"Retaliation:"** with canonical description.
- EB Thug 1 (AC 11, Mace +4) Target=DraconicDragon → avatar `.mc-overlay` → Mace HIT 23 vs AC 10 → Done → barbarian hp_change −3 (165→162); `lastAttack` persisted `{attackerName:'Thug 1', targetName:'DraconicDragon', weaponType:'melee'}`.
- Click "Retaliation:" → attack popup **"✓ HIT (22 vs AC 11)"** auto-targeted Thug 1 → Done → log `roll attack Warhammer rolls:[11,9] mode:normal bonus:11 bonusDetail:"(+11 to hit)"` → **STR+5 + PB+6 = +11 exact, no rage required/used (mode normal)** → `roll damage "1d8+7 [bludgeoning]" 9` + `hp_change Thug 1 delta:-9 (32→23)`.

## FAIL evidence (gates absent)

1. **(a) No once-per-trigger / no double-click gate + self-target:** re-clicked "Retaliation:" after use → immediately offered a SECOND attack popup ("✓ HIT (14 vs AC 10)" = own AC). `reactionDamageHandler` generic branch never checks `lastAttack.targetName === playerStats.name`, so after `lastAttack` was overwritten by the barbarian's own Retaliation hit (`attackerName:'DraconicDragon'`), the repeat click targeted SELF. Dismissed without Done (no damage, confirmed DD 162/hp log silent) — but the roll+log already occurred (extra `roll attack Warhammer` entry #13).
2. **No reaction spend anywhere:** zero reaction keys in change-data before/after use (`GET /change-data` `DraconicDragon` bucket has no `reaction*`/`*Round` keys); grep `reactionUsed|usedReaction|hasReaction` = zero hits in src. The Reaction is never consumed → infinitely repeatable while any lastAttack exists. "One melee attack" is enforced only by 1-click-1-roll.
3. **(c) No range gate (RAW "within 5 feet"):** Thug Heavy Crossbow +2 RANGED (100/400 ft) HIT on DraconicDragon (crit ×2d10 = 2 piercing, hp 162→160) → clicking Retaliation still offered a melee attack vs Thug 1 ("✓ HIT (15 vs AC 11)", abandoned). `trigger:'damage_from_adjacent_creature'` + `range:'5 ft'` are never evaluated — handler consumes any `lastAttack`. (EB crossbow attack also mislabels `lastAttack.weaponType:'melee'`.)
4. **(b) Reaction-unavailable-same-turn:** N/A by absence — no tracker exists (root cause of #2).
5. **No automation log:** Retaliation use produces NO `ability_use` entry (log shows bare "Warhammer" attack/damage with no source attribution) — violates "every automation must log" (AGENTS.md).

## Control (correctly silent)

Thug Mace HIT vs HexWarlock (AC 9, hp −5): no Retaliation row on her sheet, no prompt, no reaction-ish keys in her change-data bucket. Class-scoping via subclass data is sound.

## Fix surface

In `reactionDamageHandler.js` no-save branch (shared by Berserker Retaliation + Giant Storm's Thunder consumers — gate carefully per feature):
- Gate `lastAttack.targetName === playerStats.name` and require actual damage (`actualDamage > 0`).
- Gate adjacency/range: reject when `lastAttack.weaponType === 'ranged'` (fix EB `weaponType` labeling upstream in monster attack path) for `trigger:'damage_from_adjacent_creature'`.
- Stamp/validate a per-round once-used runtime flag (precedent: `_PsychicBlade_secondBlade_round` round-keyed latch + navigationHandlers/initiative re-arm, CLA-274).
- Emit `ability_use` log entry naming Retaliation on resolve.

## State left

- DraconicDragon subclass **Path of the Berserker PERMANENT** (lv20 2024 Barbarian, Warhammer equipped, retest-ready).
- Thug removed from tracker; change-data + campaign log Admin-Cleared.

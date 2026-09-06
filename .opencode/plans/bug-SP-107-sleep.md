# BUG SP-107 — Sleep (2024) — FAIL

**Verdict: FAIL** (core partially present — first-save→Incapacitated works — but FOUR canonical clauses are WRONG, and the spell-specific handler is dead code).

## Environment / rig
- Caster: **DivinationWizard** lv20 2024 Human Wizard, INT-based **DC 17** confirmed live in picker text. Sleep PREPARED via Edit wizard Spells step (mi-overlay `.mi-skip-btn` → `.sp-overlay`-less wizard, tick `.list-item-checkbox-trigger` on Sleep row → ✓Save; disk `spells[]` +Sleep).
- EB joined: **Thug 1** (Humanoid, cs `immunities:[]`) + **Zombie 1** (Undead, cs `immunities:["Poison"]` only — EB join strips Exhaustion from monsters.json!). combatSummary also held all 14 PCs.
- Map: none used — picker = manual selection (app AoE model, CLA-312 convention).

## Clause-by-clause (campaign log + change-data ground truth)
| # | Clause (2024 row / public/data/2024/spells.json canonical text) | Result | Evidence |
|---|---|---|---|
| 1 | Chosen creatures in 5-ft sphere take WIS save DC 17 | PARTIAL (manual picker only) | `.sp-overlay` "Sleep — Select creatures in the area of effect… DC 17"; ticked-only target resolved (cast4: Thug alone; cast5: Zombie alone). NO auto-sphere/positional filter (static: consumer never consults map); caster's own row selectable. |
| 2 | Fail 1st save → Incapacitated | PASS | cast4: `save_result` "Thug 1 failed WIS save (DC 17, rolled 2 + 0 = 2)" + `condition/applied incapacitated dc:17 ability:WIS sourceName:DivinationWizard` + initiative badge `creature-badge effect-condition "Incapacitated"` + change-data `Thug 1.activeConditions:["incapacitated"]`. |
| 3 | Repeat save at END of target's next turn | **FAIL** | Walked initiative (activeCreatureName Thug 1 → Next → Zombie 1): zero new save rolls, zero log entries at the turn boundary; Incapacitated did not even expire. Consumer pipeline has no end-of-turn sleep re-save: generic AoE-save confirm writes no re-save stamp; `addExpiration` in (dead-code) sleepHandler uses rounds undefined→Infinity + expireOnCreatureName null → can never fire; `clearExpirationEffects.js` has NO `case 'incapacitated'`. |
| 4 | Fail 2nd save → Unconscious for duration (concentration 1 min) | **FAIL** | `unconscious` NEVER applied anywhere on this path (zero state/log ever). No concentration record written on cast (`combatSummary.concentration` null, no wizard conc key) → spell has no duration tracking, no 1-minute expiry, no concentration-break surface. |
| 5 | Spell ends on target that takes damage | **FAIL** | Zombie Slam HIT on Thug 1: rolls log 14/5, `hp_change` applied, HP 32→27, yet `Thug 1.activeConditions:["incapacitated"]` persists; no condition-removed log. Grep: ZERO sleep/incapacitated wake hooks in `src/hooks/combat/` damage pipeline. |
| 6 | Shake awake (action within 5 ft) | **FAIL (inert)** | `sleepShakeHandler.js` exists (handle+handleConfirm would clear inc/unconscious + log) but its `{type:'modal', modalName:'sleepShake'}` has **zero component consumers** and automation type `sleep_shake` has **zero producers in public/data** — unreachable feature. |
| 7 | Non-sleeping (elves/undead) / Exhaustion-immune auto-succeed | **FAIL** | Zombie 1 (undead, monsters.json immunities incl. Exhaustion) rolled and FAILED WIS (11+−2=9 vs DC17) → became **incapacitated**. Live consumer (generic AoE picker) has no auto-success gate; sleepHandler's `'magical sleep'`/`'exhaustion'` immunity gate never runs (and cs join carries immunities `["Poison"]` only anyway). Elf PC path (race-rules 2024.js 'Magical Sleep') is unreachable here (no elf PCs; live path ignores it). |
| 8 | Slot payment | PASS (with known leak) | lv1 4→3 per cast; abandoned picker consumed 2 extra slots with NO saves, no rollback (CLA-312 precedent, re-confirmed). No upcast control for lv1 Sleep (popup: "Slots Remaining: 0 … No spell slots available for this level."). Short Rest Arcane Recovery re-armed lv1 0→4. |

## Root cause (static, cited)
- Live consumer = **generic AoE save picker** opened by SpellDetailPopup "Cast Spell": logs `ability_use "Sleep: Selecting N target(s) for save (DC 17 WIS)"`, rolls saves immediately, applies `incapacitated` from spell `automation.effects.fail`. It implements ONLY fail→condition-once.
- **`sleepHandler.js` (the spell-specific 2024 handler, routed by automationRouter.js:18 + automation/index.js:524) never executes on this path** — its "casts Sleep! … must make a WIS save" ability_use logs never appear; its immunity auto-success gate, and (broken even if reached) its `addExpiration({type:'incapacitated'})` with `expiryRounds=Infinity, expireOnCreatureName=null` + no `case 'incapacitated'` in clearExpirationEffects.js mean even the handler could not stage/unconscious/wake.
- `sleepService.js triggerSleep`: ZERO production callers.
- No damage-wake hook; no concentration record; no re-save scheduler; no unconscious escalation; shake modal unmapped.

## Required fix surface (for devs)
1. Route Sleep's cast confirm (picker or sleepHandler) into a staged state: `{effect:'sleep_staged', target, caster, round}` — at OWNER's turn END (CLA-307 turnEnd seam / badge-click repeat-save consumer precedent) run the second WIS save: success → clear incapacitated + spell ends on target; fail → swap to `unconscious` for concentration duration.
2. Register concentration properly on cast (spellPreparationService record with real DC, not nothing).
3. Damage hook in applyDamage/NPC damage path: any damage to a sleep-affected target clears sleep te/condition + logs.
4. Wire or delete `sleepShake` modal + `sleep_shake` producers; or implement shake as a bonus action row.
5. Auto-success gate consult: combatSummary `immunities` must carry Exhaustion for undead at join (encounterToInitiative strips it) or gate against monsters.json condition immunities.

## Live log chronology (test-campaign, cleared after)
spell(cast1) → ability_use(Sleep: Selecting 1…DC 17) → save_result Thug 1 SAVED 19 → spell(cast2, abandoned) → spell(cast3, abandoned) → spell(cast4) → ability_use → save_result Thug FAILED 2 → condition applied/incapacitated → [Thug 1 turn → Next → Zombie 1: NO re-save] → roll Thug HIT → hp_change 32→27 → STILL incapacitated → short rest (Arcane Recovery 0→4) → spell(cast5) → ability_use → save_result Zombie FAILED 9 → condition applied/incapacitated on Zombie.

## Cleanup recorded
Admin → Clear Change Data + Clear Campaign Log (both confirmed empty; reload-guard OK). Kept config: DivinationWizard Sleep prepared (disk), EB roster Thug+Zombie, caster lv1=4 post-short-rest pre-clear.

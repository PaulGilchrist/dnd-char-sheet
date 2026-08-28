# Static Analysis Report — `src/`

**Date:** 2026-08-28
**Scope:** `./src` — 2,869 `.js`/`.jsx` files (~753k lines incl. tests)
**Tooling:** ESLint 9 (project config + injected `complexity`/`max-depth`/`max-statements`/`max-params`/`max-lines` metrics), jscpd 5 (token-based clone detection), knip 5 (unused files/exports), ripgrep verification, MD5 identical-file scan.

**Baseline health:** `npm run lint` currently passes with zero errors/warnings under the project config. All findings below are *additional* signal surfaced by stricter metrics and cross-file analysis.

---

## 1. Duplication

jscpd (min-tokens 70): **16.8% of lines duplicated** project-wide; 832 clones in non-test code, **71 clones ≥30 lines**.

### 1.2 Near-identical production file pairs (jscpd + diff)

| Pair | Similarity |
|---|---|
| `services/automation/handlers/spells/blessHandler.js` (44L) vs `baneHandler.js` (44L) | ~96% identical (sign of modifier differs) |
| `services/automation/handlers/spells/charmPersonHandler.js` vs `charmMonsterHandler.js` (~220L each) | ~89% identical; jscpd clones at 1-57, 112-144, 150-191 |
| `services/rules/features/massCureWoundsService.js` vs `massHealingWordService.js` (137L each) | Only 18 changed lines (whitespace-normalized); jscpd clones at 11-54 and 76-119 |
| `services/automation/handlers/spells/compulsionHandler.js` vs `dominateHandler.js` / `crownOfMadnessHandler.js` | Clones 1-42, 83-116 |
| `services/automation/handlers/spells/polymorphHandler.js` vs `truePolymorphHandler.js` | ~54% identical; clone 10-44 |
| `services/automation/handlers/spells/animalFriendshipHandler.js` vs `crownOfMadnessHandler.js` | Clone 10-69 ↔ 12-63 |
| `services/automation/handlers/class-other/giantAncestryDispatch.js` vs `giantAncestryTraits.js` | Three clones: 115L, 101L, 53L |
| `services/rules/effects/restResources.js` (dead — see §2) vs `restRules-constants.js:59-214` | 156L clone — a dead file duplicating live constants |
| `services/rules/rules-featFeatures.js` (dead — see §2) vs `services/rules/rules.js:276-340` + `core/magicSpells.js:40-73` | 65L + 34L — dead file duplicating live logic |
| `services/rules/core/magicSpells.js:41-142` vs `services/rules/rules.js:344-442` | 102L clone (magic-initiate instance processing) |
| `components/char-sheet/modals/shared/AOEConditionModal.jsx:366-458` vs `SaveAttackAoeModal.jsx:357-449` | 93L clone |
| `components/char-sheet/modals/shared/FearModal.jsx` vs `HypnoticPatternModal.jsx` | Clones at 69-116, 180-214, 346-386 |
| `components/factions/Factions.jsx:303-339` vs `components/settlements/Settlements.jsx:604-640` | 37L clone |

### 1.3 Intra-file self-clones (same file, repeated block)

| File | Blocks | Size |
|---|---|---|
| `services/automation/handlers/class-other/giantAncestryDispatch.js` | 51-120 ↔ 161-230; 51-106 ↔ 509-565; 12-58 ↔ 292-357 | 70L / 56L / 47L |
| `services/rules/spells/spellPreparationService.js` | 56-101 ↔ 105-150 ↔ 155-200 (triplicate) | 46L ×2 |
| `components/initiative/createNpcClickHandler.js` | 119-161 ↔ 179-221 | 43L |
| `services/rules/core/attackCalc2024.js` | 155-195 ↔ 191-234 (overlapping) | 41L |
| `services/automation/contextBuilder-sync.js` | 267-301 ↔ 312-346 | 35L |
| `components/char-sheet/useModalHandlers.js` | 244-275 ↔ 276-307 | 32L |
| `services/automation/handlers/class-warlock/feyReinforcementsHandler.js` | 3-32 ↔ 35-58 | 30L |
| `services/automation/handlers/reactions/reactionBonusHandler.js` | 448-477 ↔ 518-547 | 30L |
| `services/ui/storage.js` | 45-52 ↔ 55-62 — identical POST-fetch boilerplate | 8L |

### 1.4 Repeated API boilerplate

`method: 'POST'` fetch blocks appear **42 times across 20 non-test files**, most following the exact `encodeURIComponent(campaignName)`/`encodeURIComponent(key)` + JSON-body + `.catch(console.error)` shape seen in `services/ui/storage.js:45-52` and `:55-62`.

### 1.5 Test scaffolding duplication (informational — largest clone volumes)

The top clones project-wide are duplicated test harnesses: `EncounterBuilder.load-encounter` ↔ `reset-encounter` (427L), `CharActionModals.choice-handlers` ↔ `healing-handlers` (408L), and ~6 more `spellCastService/execution/*.test.js` files sharing an identical 220+ line mock setup. These inflate runtime of the test suite but consolidating them is a larger, behavior-sensitive effort.

---

## 3. Unused exports (knip, 46 total)

Spot-verified with independent ripgrep (zero external references):

- `services/combat/rules/rangeCheck.js` — `isWithinRangeOf` (project convention uses `isWithinRange`; this alias is referenced nowhere).
- `services/rules/core/attackCalc.js` — `isSpellAttack`, `getSpellActionType`.
- `services/combat/conditions/savePromptService.js` — `sendPrismaticSprayIndigoPrompt`, `clearPrismaticSprayIndigoPrompt`, `sendPrismaticSprayVioletPrompt`, `clearPrismaticSprayVioletPrompt`.
- `services/rules/core/magicSpells.js` — `addMagicInitiateSpells`, `addFeyTouchedSpell`, `addShadowTouchedSpell`.
- `hooks/combat/useLoggedDiceRollAttack.js:18` — pass-through re-export of `getKnownManeuvers`/`getSuperiorityDice` (unused; consumers import these from their origin modules). **Correction:** the line-17 re-export of `hasStarryDragonActive`/`starryDragonAppliesToRoll` is *not* unused — `useLoggedDiceRollAttack.blocked-attacks.test.js` imports them through this file, so it must not be dropped.

Full knip list available in `/tmp/knip-report.txt`; largest cluster is `services/character/skillValidation/index.js` (14 re-exported helpers with no external consumers).

---

## 4. Complexity hotspots

ESLint metrics (thresholds: complexity >15, depth >4, statements >60, params >5): **615 complexity violations**, **165 depth violations**, **88 oversized functions**, **255 too-many-params** in `src`.

### 4.1 Top cyclomatic complexity (non-test)

| CC | Function | Location |
|---|---|---|
| 312 | `routeAutomation` | `services/combat/automation/automationRouter.js:1` |
| 286 | `handleNpcSaveDamage` | `hooks/combat/handlers/handleNpcSaveDamage.js:23` |
| 285 | anonymous async | `services/automation/contextBuilder-sync.js:22` |
| 278 | `DiceRollResult` | `components/char-sheet/DiceRollResult.jsx:5` |
| 251 | `handlePlainDamage` | `hooks/combat/handlers/handlePlainDamage.js:18` |
| 248 | `executeSpellCast` | `services/rules/spells/spellCastService/execution/index.js:38` |
| 240 | `computeConditionEffects` | `services/combat/conditions/conditionEffects.js:17` |
| 232 | `computeTrackedResources` | `services/rules/trackedResources.js:71` |
| 187 | `ConditionEffectBadges` | `components/initiative/ConditionEffectBadges.jsx:54` |
| 182 | `isFreeCastAuthorized` | `services/rules/spells/spellPreparationService.js:8` |

### 4.2 Longest functions (statements)

| Stmt | Function | Location |
|---|---|---|
| 342 | `applyLongRest` | `services/rules/effects/restRules-longRest.js:14` |
| 341 | `executeSpellCast` | `services/rules/spells/spellCastService/execution/index.js:38` |
| 329 | anonymous async | `services/automation/contextBuilder-sync.js:22` |
| 260 | anonymous arrow | `components/char-sheet/useInitiativeEffects.js:18` |
| 250 | `applyShortRest` | `services/rules/effects/restRules-shortRest.js:14` |
| 238 | `computeConditionEffects` | `services/combat/conditions/conditionEffects.js:17` |
| 228 | `handleNpcSaveDamage` | `hooks/combat/handlers/handleNpcSaveDamage.js:23` |
| 218 | `applyDamageToTarget` | `services/rules/combat/applyDamage.js:117` |

### 4.3 Deepest nesting (depth 8)

- `services/automation/handlers/combat/autoRerollHandler.js:443-445`
- `services/character/languagesFightingstylesValidation.js:201`
- `services/rules/core/attackCalc.js:528-531`
- `services/rules/core/attackCalc2024.js:269-272`

### 4.4 Most parameters

- `components/char-sheet/modals/shared/AreaEffectTargetModalBase.utils.jsx:69` — `logSaveEntry` takes **11 params**.

### 4.5 Largest production files (>400L; 94 files qualify)

`components/char-sheet/CharSpecialActions.jsx` (754), `services/combat/conditions/targetEffectDefinitions.js` (747 — registry, expected), `services/automation/contextBuilder-sync.js` (746), `components/common/SavePromptModal.jsx` (731), `services/automation/handlers/reactions/reactionBonusHandler.js` (725), `hooks/combat/spellGates.js` (723), `components/initiative/initiative.jsx` (718), `services/automation/index.js` (716).

---

## 5. Inconsistencies / architectural drift

1. **localStorage reach-through in combat code.** `services/combat/auras/unbreakableMajesty.js:34-47` iterates `Object.keys(localStorage)` and pattern-matches raw runtime-store keys (`runtime:campaign:name:prefix…`). This reads the runtime store's internal storage layout directly — a server-first / `no-local-game-state` drift the ESLint rule doesn't catch because it never writes.

2. **Error handling style:** project convention requires `console.error` logging, yet **~194 silent catch blocks** (`catch {}` / `catch (_e) {}`) exist in non-test code, e.g. `unbreakableMajesty.js:46` (`/* ignore */`), `App.jsx` (3), `EncounterBuilder.jsx` (3), `combatData.js` (2), `conditionHandler.js` (2).

3. **Inline styles vs convention:** 423 `style={{…}}` occurrences across 95 JSX files (top: `components/map/PlacedItems.jsx` ×28, `RecklessAttackModal.jsx` ×19) despite the "no inline styles" rule (not lint-enforced). Similarly **68 `!important`** across 11 CSS files despite the rule.

4. **Fetch boilerplate duplicated instead of centralized** (§1.4): 42 hand-rolled POST blocks vs the existing `storage.js` service pattern.

5. **`rules.js` vs `rules-core.js`/`rules-helpers.js` split:** knip reports `rules-core.js` default export and `rules-helpers.js` `getRulesType` unused, and `rules.js` exports 9 API surface functions (`getActions`, `getArmorClass`, `getProficiencies`, …) with no external consumers — evidence of API drift during the dual-ruleset refactor.

6. **Dead-file / live-file constant duplication** (§1.2, rows 8-9): rest and feat-feature logic exists in two copies, one live, one orphaned — a future-edit hazard where someone edits the dead copy.

---

## 6. Prioritized low-risk opportunities

Ordered by clarity × safety. None of these alter runtime behavior of live code paths (verified unreferenced), or are comment/CI-only.

| # | Opportunity | Risk | Why low-risk |
|---|---|---|---|
| 1 | Replace remaining direct `Object.keys(localStorage)` reach-through (`unbreakableMajesty.js:34-47`) with a runtime-store key listing API | Medium-low | Behavior-adjacent — needs the explicit runtime-store API; schedule with owner review. |
| 2 | Track (do not rush) the top duplication clusters: giantAncestry pair, AOE/shared modals, mass-healing services, bless/bane, charm pair, `POST` boilerplate → one shared request helper | Higher | Each consolidation touches live combat/spell code — needs behavioral tests, out of scope for "no testing" constraint. |

**Completed:** ~~Rename the 10 kebab-case files in `components/initiative/` to PascalCase matching their exports (with import updates)~~ — resolved 2026-08-28: the 10 factory/hook files (which contain no JSX) were renamed to camelCase `.js` matching their exports (`createNpcClickHandler.js`, `useLootHandlers.js`, etc.), `initiative.jsx` → `Initiative.jsx`, all imports/mocks/test filenames updated; lint and full suite green.

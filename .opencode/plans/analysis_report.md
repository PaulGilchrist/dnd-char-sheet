# Full-Project Static Analysis Report

**Date:** 2026-08-17
**Scope:** `./src` (1,151 production files, 173,860 lines of JS/JSX)
**Exclusions:** Test files, dist/, build/, node_modules/

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Duplicate & Near-Duplicate Code](#1-duplicate--near-duplicate-code)
3. [Dead & Unused Code](#2-dead--unused-code)
4. [Complexity Hotspots](#3-complexity-hotspots)
5. [Coding Inconsistencies](#4-coding-inconsistencies)
6. [Prioritized Low-Risk Opportunities](#5-prioritized-low-risk-opportunities)

---

## Project Overview

| Metric | Value |
|--------|-------|
| Total JS/JSX files | 2,914 |
| Production files | 1,151 |
| Test files | 1,763 (1.55:1 test-to-code ratio) |
| Total production lines | 173,860 |
| CSS files | 87 |
| Largest subsystem | `components/char-sheet/` (671 files) |
| Second largest | `services/automation/handlers/` (446 files) |

---

## 1. Duplicate & Near-Duplicate Code


### 1.3 Critical: Mass Healing Handler Clones

**Files:**
- `src/services/automation/handlers/healing/massHealingWordHandler.js` (167 lines)
- `src/services/automation/handlers/healing/massCureWoundsHandler.js` (167 lines)
- `src/services/automation/handlers/healing/prayerOfHealingHandler.js` (189 lines)

**Description:** These three files are functionally identical. The only differences are: (1) the spell name constant, (2) the default spell level (3/5/2), and (3) the modal name string. The `getSpellCastingMod()` function (lines 10-22) and `resolveHealExpression()` function (lines 24-42) are character-for-character identical across all three. The confirm/healing-loop logic (~65 lines each) is ~95% identical.

**Similarity:** ~95% identical (~520 lines total)

### 1.4 Significant: Giant Ancestry Dual Implementation

**Files:**
- `src/services/automation/handlers/class-other/giantAncestryTraits.js` (602 lines)
- `src/services/automation/handlers/class-other/giantAncestryDispatch.js` (610 lines)

**Description:** Both files implement the same 6 giant ancestry traits (Cloud's Jaunt, Fire's Burn, Frost's Chill, Hill's Tumble, Stone's Endurance, Storm's Thunder). The only difference is how the trait name is derived (hardcoded vs. from `option` parameter). Function bodies are otherwise near-identical.

**Similarity:** ~90% identical (~600 lines)

### 1.5 High: targetEffect Registration Pattern

**Files:**
- `src/services/automation/handlers/buffs/holyAuraHandler.js` (lines 62-78)
- `src/services/automation/handlers/buffs/auraOfLifeHandler.js` (lines 72-88)
- `src/services/automation/handlers/buffs/auraOfPurityHandler.js` (lines 62-77)
- `src/services/automation/handlers/buffs/circleOfPowerHandler.js` (lines 60-76)
- `src/services/automation/handlers/buffs/auraOfVitalityHandler.js` (lines 148-164)

**Description:** All 5 handlers contain an identical 15-line pattern for reading stored effects, finding existing entries, creating new entries, and writing back. Only the effect key string differs.

**Similarity:** ~95% identical (~75 lines)


### 1.7 Moderate: Combat Context Guard Clause

**Files:** 27+ handler files across `buffs/`, `spells/`, `healing/`, `class-*` directories

**Description:** The same 8-line `getCombatSummary()` → null check → return popup boilerplate is repeated across 27+ handler files.

**Similarity:** 100% identical (~230 lines total)

### 1.8 Low: `window.dispatchEvent` for Combat Updates

**Files:** 30+ handler files

**Description:** The identical one-liner `window.dispatchEvent(new CustomEvent('combat-summary-updated'))` is repeated in 30+ files.

**Similarity:** 100% identical (~30 occurrences)

---

## 2. Dead & Unused Code

### 2.3 Unused Exported Functions/Variables

| File:Line | Symbol | Evidence |
|-----------|--------|----------|
| `src/config/utils.js:46` | `validateAbility` | Exported but never imported externally |
| `src/config/utils.js:80` | `validateLevel` | Exported but only called internally; export is unnecessary |
| `src/config/steps-config.js:259` | `getStepConfig` | Exported but never imported or referenced anywhere |
| `src/config/outdoorConfig.js:36` | `TOOL_POI` | Exported constant never imported; all sibling `TOOL_*` constants are used |
| `src/hooks/useAllySelection.js:18` | `setAllyList` | Exported but never imported; companion `getAllyList` is used in 20+ files |
| `src/hooks/combat/useActionPopup.js:45` | `loadBackgrounds` | Exported async function never imported; companion `showBackgroundPopup` IS imported |
| `src/components/char-sheet/CharSpecialActions.helpers.js:18` | `createPlayerStats` | Exported but never imported |
| `src/components/char-sheet/char-summary/CharConditions.jsx:40` | `loadActiveConditions` | Exported but never imported |
| `src/components/char-sheet/modals/shared/AreaEffectTargetModalBase.utils.jsx:45` | `renderResultsSection` | Exported but never imported; sibling exports ARE used |

### 2.4 Duplicate `sanctuarySave` Exports

| File | Function | Signature |
|------|----------|-----------|
| `src/hooks/combat/sanctuarySave.js:7` | `handleSanctuarySave` | `(attackerName, targetName, campaignName, setPopupHtml, _logEntry)` |
| `src/hooks/combat/handlers/handleSanctuarySave.js:6` | `handleSanctuarySave` | `(characterName, campaignName, context, _logEntry)` |

Different signatures, same exported name. Used by different callers (`useLoggedDiceRollAttack.js` vs `useLoggedDiceRollDamage.js`).

---

## 3. Complexity Hotspots

### 3.1 Critical: `automationRouter.js` — 243-Case Switch in 688-Line Function

**File:** `src/services/combat/automation/automationRouter.js:2`

The entire file is a single `routeAutomation()` function containing a 243-case switch statement mapping automation `info.type` strings to action categories. 310 total branches. Any new automation type requires editing this monolith.

### 3.2 Critical: `automation/index.js` — 269 Unique Imports

**File:** `src/services/automation/index.js` (712 lines)

Monolithic registry importing every automation handler in the system. 269 unique dependency targets — the highest fan-out in the entire codebase.

### 3.3 High: `useCharActionsAutomation.js` — 87-Case Nested Switch

**File:** `src/components/char-sheet/useCharActionsAutomation.js:95`

An 87-case inner switch on `result.modalName` maps modal names to `setModalState` calls. Each case is a one-liner. This is pure dispatch boilerplate that could be a lookup table.

### 3.4 High: Top Files by Branch Density

| Branches | Lines | Branch % | File |
|----------|-------|----------|------|
| 141 | 659 | 21.4% | `services/rules/spells/spellPreparationService.js` |
| 132 | 328 | **40.2%** | `services/combat/conditions/conditionEffectsInternal.js` |
| 130 | 692 | 18.8% | `services/combat/conditions/conditionEffects.js` |
| 121 | 641 | 18.9% | `services/rules/spells/spellCastService/execution/index.js` |
| 111 | 740 | 15.0% | `services/automation/contextBuilder-sync.js` |
| 100 | 715 | 14.0% | `components/char-sheet/CharSpecialActions.jsx` |
| 100 | 521 | 19.2% | `services/rules/core/spellCalc2024.js` |
| 96 | 605 | 15.9% | `services/rules/combat/applyDamage.js` |

`conditionEffectsInternal.js` has the highest branch density at 40.2% — nearly 2 in every 5 lines are branching conditions.

### 3.5 High: Deepest Nesting (11 Levels)

| File:Line | Description |
|-----------|-------------|
| `src/services/combat/steps/attackRollBonuses.js:100` | Barbarian divine fury / brutal strike logic: `forEach > if > if > forEach > if > if > if > if > if > if > if` |
| `src/services/rules/rules-fightingStyles.js:245` | Fighting style feat processing: `try/catch > forEach > forEach > forEach > if > if > forEach > forEach > if > if > if` |

10 additional files reach 10 levels of nesting, including `contextBuilder-sync.js`, `WizardStepSpells.jsx`, `CharAbilities.jsx`, and `spellCalc2024.js`.

### 3.6 High: Largest Non-Test Files (Top 10)

| Lines | File |
|-------|------|
| 740 | `src/services/automation/contextBuilder-sync.js` |
| 735 | `src/services/combat/automation/automationInfoBuilder/core-handlers.js` |
| 725 | `src/services/automation/handlers/reactions/reactionBonusHandler.js` |
| 724 | `src/components/common/SavePromptModal.jsx` |
| 715 | `src/components/initiative/initiative.jsx` |
| 715 | `src/components/char-sheet/CharSpecialActions.jsx` |
| 712 | `src/services/combat/conditions/targetEffectDefinitions.js` |
| 712 | `src/services/automation/index.js` |
| 709 | `src/hooks/combat/spellGates.js` |
| 700 | `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js` |

### 3.7 High: Highest Fan-In (Most Imported)

| Importers | File | Risk |
|-----------|------|------|
| **497** | `src/hooks/runtime/useRuntimeState.js` | Any change has blast radius of ~half the codebase |
| **357** | `src/services/ui/logService.js` | Second most connected node |
| **191** | `src/services/rules/combat/damageUtils.js` | Core damage calculation |
| **158** | `src/services/encounters/combatData.js` | Combat data management |
| **125** | `src/services/dice/diceRoller.js` | Dice rolling engine |

### 3.8 Medium: Long If/Else-If Chains

| Branches | File:Line | Description |
|----------|-----------|-------------|
| 15 | `services/automation/handlers/combat/combatStanceHandler.js:330-344` | Maps named stance options to descriptions |
| 12 | `services/rules/spells/spellPreparationService.js:549-582` | Spell resource consumption logic |
| 11 | `services/automation/handlers/combat/attackRiderHandler.js:659-665` | Damage type selection |
| 10 | `services/automation/handlers/class-fighter-rogue/executeManeuver.js:462-465` | Maneuver type dispatch |
| 10 | `services/automation/handlers/reactions/reactionBonusHandler.js:370` | Reaction bonus type dispatch |
| 10 | `services/automation/handlers/reactions/reactionDebuffHandler.js:452` | Reaction debuff type dispatch |

### 3.9 Medium: Long Switch Statements

| Cases | File:Line | Description |
|-------|-----------|-------------|
| 243 | `services/combat/automation/automationRouter.js:2` | Automation type routing |
| 87 | `components/char-sheet/useCharActionsAutomation.js:95` | Modal name dispatch |
| 41 | `services/rules/effects/clearExpirationEffects.js:35` | Effect expiration cleanup |
| 22 | `hooks/combat/useSpellCastExecutor.js:66` | Spell execution routing |
| 21 | `components/log/log-utils.js:7` | Log entry type routing |
| 18 | `services/combat/conditions/conditionEffects.js:162` | Condition effect processing |

---

## 4. Coding Inconsistencies

### 4.1 High: Silent Error Swallowing

**264 instances** of `.catch(() => {})` across 108 production `.js` files. This directly violates the project convention: "Use `console.error` for error logging instead of silent fallbacks."

Worst offenders: `attackRiderHandler.js` (8), `quiveringPalmHandler.js` (8), `attackRollPostDamage.js` (9).

Meanwhile, `.catch((e) => { console.error(...) })` appears 547 times across 219 files — showing the convention IS followed elsewhere. The inconsistency is concentrated in automation handlers.

### 4.2 High: Inline Styles Despite Convention

**99 production `.jsx` files** contain `style=` attributes, violating the project convention "NEVER use inline styles."

Worst offenders:
- `PlacedItems.jsx` — 28 inline style attributes (all `style={{ cursor: 'grab' }}`)
- `WizardStepSpecial.jsx` — 8 inline styles
- `StepsOfTheFeyTauntModal.jsx` — 8 inline styles
- `DiceRollResult.jsx` — 7 inline styles
- `CharReactions.jsx` — 3 inline styles

### 4.3 High: Runtime Key Naming (snake_case vs camelCase)

Runtime store keys mix `snake_case` and `camelCase` arbitrarily, sometimes within the same file:

**snake_case examples:**
- `_Charge_Attack_usedRound`, `_Savage_Attacker_usedRound`, `_Hamstring_usedRound`
- `_Energy_Resistances_chosenTypes`, `_Steps_of_the_Fey_freeCastCount`
- `stunned_speedHalved`

**camelCase examples:**
- `portentUsedThisTurn`, `psionicStrikeUsedThisTurn`, `piercerPunctureUsedThisTurn`

**Mixed in same file** (`restRules-shortRest.js:287-299`): `portentUsedThisTurn` next to `"_Charge_Attack_usedRound"` and `"_Hunter's_Prey_choice"`.

### 4.4 Medium: Kebab-Case Component Files

**14 component `.jsx` files** use kebab-case instead of PascalCase:
- `components/common/popup.jsx`, `subscriber.jsx`
- `components/initiative/initiative.jsx` and 10 `initiative-*.jsx` sub-modules
- `components/char-sheet/charInventoryTestHelpers.jsx`

The dominant convention is PascalCase (~200+ files).

### 4.5 Medium: Hooks in Component Folders

**10 hook files** live in `src/components/char-sheet/` instead of `src/hooks/`:
- `useAttackDamageResolution.js`, `useCharActionModals.js`, `useCharActionsAttackHandlers.js`, `useCharActionsAutomation.js`, `useCharActionsBaseActions.js`, `useCharActionsCleave.js`, `useCharActionsEventListeners.js`, `useCharActionsModalHandlers.js`, `useInitiativeEffects.js`, `useModalHandlers.js`

The stated architecture places hooks in `src/hooks/`.

### 4.6 Medium: Mix of `.then()` vs `async/await`

**70 `.then()` usages** across ~44 files vs **2,866 `await` usages** across ~646 files. `.then()` is concentrated in older files (`MonsterCardModal.jsx`, `HexMap.jsx`, `initiative.jsx`, `CharActions.jsx`, `WizardStepBasic.jsx`, `contextBuilder-sync.js`, `targetResolver.js`).

### 4.7 Medium: Deep Relative Imports

**100+ production files** use 3-4 level deep relative imports (e.g., `'../../../../hooks/runtime/useRuntimeState.js'`). No path aliases are configured.

### 4.9 Low: JSDoc Coverage

Only **137 of ~1,120 production files** (~12%) have JSDoc documentation. Critical utility files in `services/automation/common/` and `services/ui/` are well-documented, but the majority has zero documentation.

### 4.10 Low: Non-Co-located Business Logic

`components/common/savePromptHandlers.js` and `savePromptUtils.js` contain business logic alongside UI components rather than in `src/services/`.

### 4.11 Low: Misnamed Service File

`src/services/automation/handlers/class-fighter-rogue/useMagicDeviceHandler.js` uses the `use` prefix (implying a React hook) but is a plain service function in the handlers directory.

---

## 5. Prioritized Low-Risk Opportunities

The following items are ordered by impact-to-risk ratio. All are safe to implement without altering runtime behavior.

### Priority 5: Consolidate Mass Healing Handlers
**Risk:** Low (parameterization only) | **Impact:** ~520 lines reduced to ~200
- Extract `getSpellCastingMod()` and `resolveHealExpression()` to a shared healing utility
- Create a `createMassHealHandler(config)` factory that parameterizes spell name, level, and modal name

### Priority 6: Extract targetEffect Registration Utility
**Risk:** Low (pure extraction) | **Impact:** ~75 lines reduced, consistency improvement
- Create `registerTargetEffect(campaignName, targetName, effectKey, casterName)` in `src/services/combat/conditions/`
- Replace identical 15-line blocks in 5 aura handlers

### Priority 8: Convert 87-Case Switch to Lookup Table
**Risk:** Low (mechanical transformation) | **Impact:** Major readability improvement
- `src/components/char-sheet/useCharActionsAutomation.js:95` — Replace 87-case switch with `const modalMap = { ... }; const handler = modalMap[result.modalName];`

### Priority 13: Normalize Component File Naming to PascalCase
**Risk:** Low (requires import path updates) | **Impact:** Consistency with 200+ other components
- Rename 14 kebab-case `.jsx` files to PascalCase
- Start with `components/common/popup.jsx` → `Popup.jsx` and `subscriber.jsx` → `Subscriber.jsx`

### Priority 14: Convert Remaining `.then()` to `async/await`
**Risk:** Low (mechanical transformation) | **Impact:** Consistency with 2,866 other `await` usages
- Convert ~44 files still using `.then()` chains
- Prioritize: `MonsterCardModal.jsx`, `HexMap.jsx`, `initiative.jsx`, `CharActions.jsx`

### Priority 15: Consolidate Giant Ancestry Implementations
**Risk:** Medium (requires verifying all callers) | **Impact:** ~600 lines reduced
- Determine if `giantAncestryTraits.js` or `giantAncestryDispatch.js` is the active implementation
- Remove or consolidate the redundant file

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Duplicate code instances | 4 remaining patterns (~1,480+ lines, down from 8/~2,200+) |
| Dead/unused code | 1 orphaned module remaining (4 backup files + 1 orphan removed, unused CSS cleaned) |
| Complexity hotspots | 6 critical/high findings (243-case switch, 269-import registry, 87-case switch, 40% branch density, 11-level nesting, 497 importers) |
| Inconsistencies | 11 categories (error handling, inline styles, naming, organization, async patterns) |
| Low-risk improvements identified | 7 remaining items (8 completed) |

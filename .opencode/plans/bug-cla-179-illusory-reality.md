# BUG CLA-179 — Illusory Reality (Wizard, 2024 Illusionist lv14): UI entry point unreachable

**Verdict: FAIL** (row renders but is inert — no clickable affordance, handler/modal orphaned; feature can never be activated from the UI.)

## Data ground truth (python3)
- `public/data/2024/classes.json` → Wizard `majors[3]` "Illusionist" `features[4]` "Illusory Reality", **level 14**, automation:
  `{type:'illusory_reality', effect:'illusory_reality', casting_time:'1 bonus_action', objectDuration:'1 minute'}` — CONFIRMED lv14 (not lv?).
- 2024 `spells.json` "Major Image": lv3 Illusion, Concentration ≤10 min, Action, own text contains the no-damage/no-condition clause.

## What exists (all wired, except the click gate)
- Handler: `src/services/automation/handlers/class-wizard/illusoryRealityHandler.js` — `handle()` returns `{type:'modal', modalName:'illusoryReality'}`; `confirmIllusoryReality()` writes runtime `illusoryRealityObject`, marks `illusoryRealityUsedRound`, logs `ability_use` "…object "X" becomes real", popup cites "cannot deal damage or impose any conditions".
- Registered: `src/services/automation/index.js:181`.
- Modal: `src/components/char-sheet/modals/arcane/IllusoryRealityModal.jsx` (object text input, "Make Object Real" button) rendered via `CharActionModals.SecondaryModals.jsx:381`; modal dispatcher map `useCharActionsAutomation.js:87 illusoryReality: simpleModal('illusoryRealityModal')`.
- Round/rest resets: `useInitiativeEffects.js:350`, `initiative/navigationHandlers.js:48`, `restRules-constants.js:123`.
- Router: `automationRouter.js:420` pushes info to `result.bonusActions` (accepts `'1 bonus_action'`).

## Live evidence (Playwright, test-campaign, lv14 Illusionist)
1. Edit wizard: level 5→14 + Step-9 spell checkbox `.list-item-checkbox-trigger` on "Major Image" → Save. File ground truth: `IllusionWizard.json` level=14, spells=['Major Image'], subclass Illusionist. (Magic-item `.mi-overlay`/`mi-skip` intercepted the first row click — dismissed with "Skip for now".)
2. Long Rest OK. Cast Major Image from spell panel → log entry `spell / Major Image / lv3 / Action` written; lv3 slots 3→2. (No concentration/ongoing badge surfaced out of combat; `concentration=null`, `activeBuffs=[]`.)
3. "Illusory Reality:" appears ONLY as static text in **Special Actions** (not as a Bonus Actions row — section absent entirely). Clicked the row: **nothing happens** — no modal, no popup, no log, `illusoryRealityObject` untouched.
4. DOM proof: the feature `<b>` has `class=""` (no `clickable`) and no handler; sibling rows "Illusion Savant:"/"Illusory Self:" render `[cursor=pointer]` — Illusory Reality does not.

## Root cause (static, deterministic)
1. `src/services/combat/automation/automationService.js:14` — `INTERACTIVE_HANDLER_TYPES` does **not** include `'illusory_reality'`. `CharSpecialActions.jsx:746` `isClickable = isInteractiveAutomation(...)` ⇒ false ⇒ `onClick` never attached. `handleIllusoryReality`/`IllusoryRealityModal` are dead code from the sheet.
2. Contributing: feature casting_time `'1 bonus_action'` (underscore) matches no space-format categorizer (`rules.js:311`, `attackCalc.js:218` list only `'1 bonus action'` variants), so the feature never lands in `playerStats.bonusActions` / the Bonus Actions section where the `illusoryReality` modal dispatcher (`useCharActionsAutomation.js:87`) would apply.

## Suggested fix
Add `'illusory_reality'` to `INTERACTIVE_HANDLER_TYPES` (automationService.js:14) and/or normalize `'1 bonus_action'`→`'1 bonus action'` in the core-handlers output (automationInfoBuilder/core-handlers.js:617) so it routes to a clickable Bonus Actions row. Then re-verify: click row → modal object input → confirm → badge/object state + log + once-per-turn gate + "already real" re-use popup.

## Cleanup performed
- IllusionWizard long rested (slots restored). No monsters were in initiative. Admin → Clear Change Data + Clear Campaign Log (confirm dialogs accepted; `character-change-data.json` and `campaign-log.json` verified absent). Registry entry kept: **IllusionWizard lv14 2024 Wizard (Illusionist), spellbook [Major Image]**.

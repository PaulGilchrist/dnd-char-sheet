# BUG — CLA-184 Improved Circle Forms (Druid, Circle of the Moon lv6, 2024)

## Verdict
FAIL — no per-hit Normal-vs-Radiant choice modal exists while in Wild Shape; attacks are force-converted to Radiant with no way to choose the beast's normal damage type. Task criterion: "if radiance picker absent while in Wild Shape = FAIL".

## Feature ground truth (python3 scan public/data/2024/classes.json)
- Druid → **Circle of the Moon** (majors[1]), **level 6** `features[2]` "Improved Circle Forms". NOT Stars/Shepherd.
- automation[0]: `damage_bonus 1d10 Radiant`, trigger `weapon_or_beast_form_attack_hit`, oncePerTurn.
- automation[1]: `conditional_advantage` saving_throw, condition `shape_shift`, abilities [CON], effect `advantage`.
- Rule text: Lunar Radiance = each WS attack deals its NORMAL type **or Radiant** (choice each hit); Increased Toughness = +WIS mod to CON saves.

## Observed (Playwright, localhost:5173, test-campaign, Wild_Sage_Druid lv20 Moon)
1. Subclass corrected in `public/campaigns/test-campaign/Wild_Sage_Druid.json`: `Circle of the Stars` → `Circle of the Moon` (lv20 kept). Sheet then shows Improved Circle Forms text, WS Max CR 6, uses 4/4.
2. Wild Shape via sheet "Wild Shape:" → beast picker (91 beasts CR≤6) → Brown Bear. Activated: temp HP 60, uses 4→3, targetEffect `wild_shape`, log entry present.
3. Initiative bear card → mc-overlay stat block: Bite "7 (1d8 + 3) **Radiant** damage", Claw "...Radiant..." — unconditional text swap.
4. Bite hit (d20 7+5=12 vs AC 11): damage popup "1d8 + 3: 6 +3 → 9 damage applied to Ogre — HP: 68 → 59". Log: `damageType:"Radiant"`, hp_change breakdown `[{"damageType":"Radiant","amount":9}]`. **No damage-type choice popup appeared; "+ 1d10 [radiant]" bonus never appeared in formula or log.**
5. Claw hit: 4 damage 59→55, `damageType:"Radiant"` again; `.damage-type-choice` modal absent (verified in DOM both attacks).
6. Increased Toughness IS implemented (but as flat bonus replacement, not the JSON's `advantage`): stat block shows "Saving Throws ... CON +5" = beast CON +2 + WIS +3; `conditionSaveService.js:14-15` consumes `creature.wildShapeConSaveBonus` (set in `wildShapeCreatureBuilder.js:88-93`). HP/save math correct for this half.

## Root cause
- `classes.json` declares `damageType: "Radiant"` with no `"X or Y"` form, so the only damage-type-choice gate — `attackRollBonuses.js:209` (`if (dt.includes(' or ')) → modal damageTypeChoice`) — never fires for this feature. No feature-level picker exists anywhere for Lunar Radiance.
- `createNpcClickHandler.js:79-89` hard-converts **every** wild-shape card's attack damage to Radiant (and applies even to non-Moon druids, since that branch doesn't check circle).
- The declared `damage_bonus 1d10 Radiant oncePerTurn` is dead on this UI route: never added to formula/log; and rules-wise it is wrong (Lunar Radiance converts type, adds no dice — that's Lunar Form's 2d10, lv14).
- JSON automation[1] says `advantage` but code implements +WIS flat bonus (code matches rules text better than the data; data is inconsistent).

## Suggested fix
- Data: model Lunar Radiance as `damageType: "Normal or Radiant"` (or a dedicated `damage_type_choice` passive with effect key e.g. `lunar_radiance`) so the existing damageTypeChoice modal path fires per hit; drop/repair the bogus 1d10 damage_bonus (or gate to lv14 Lunar Form 2d10).
- Code: gate the Radiant display swap in `createNpcClickHandler.js:79-89` on Moon circle + passive choice, and honour per-hit "normal" choice in the WS attack pipeline.

## Registry updates
- **Wild_Sage_Druid** lv20 2024 — subclass now **Circle of the Moon** (was Stars; edited as permitted correction, kept lv20). WIS +3, CON +2; expected CON save in WS = beast CON + 3.
- Improved Circle Forms = Circle of the Moon lv6. Wild Shape UI: sheet bonus-action "Wild Shape:" → `sp-modal` beast picker → initiative bear card avatar click → `mc-overlay` stat block → `.mc-dice-link` per attack.

## NEW pitfalls (verbatim)
1. **Animated overlays break Playwright actionability** — `.sp-overlay--evasion` / creature-card CSS animation makes Playwright's visibility/stability wait fail forever: `browser_click` times out at "performing click action" and snapshot/evaluate/wait_for/close all time out (renderer can pin ~115% CPU compositor repaint for minutes looking like a hang). JS is actually idle — use `page.evaluate(el.click())` / `dispatchEvent` and element-scoped queries; never plain browser_click on initiative cards, beast picker, or overlays.
2. **A `popup-overlay` ("click to dismiss") intercepts ALL pointer events** until dismissed — earlier "invisible" dice-style popups silently blocked clicks (Playwright: "intercepts pointer events"); dismiss via `document.querySelector('.popup-overlay').click()`.
3. **Wild Shape toggles the buff BEFORE form selection** — a click that opens the picker immediately marks `activeBuffs` shape_shift server-side; cancelling/crashing the picker leaves a zombie "Animal form active" state with no beast and no use consumed; a second click toggles OFF to clean up.
4. "+ NPC" initiative row uses monster autocomplete: set `.monster-autocomplete-input` value + input event, mousedown the `li`, then fill `.hp-inline-input` / `.hp-max-input` / AC input — that's how an Ogre (59/59 AC 11) joins combat here; there is no "Roll Initiative" — set per-card `placeholder="Init"` inputs and walk turns with "Next →".
5. Long Rest nulls `wildShapeUses` (readers default to class max) and clears `circleFormsAC`.
6. `confirm()` dialogs on Admin→Clear buttons are auto-accepted if a `page.on('dialog')` handler is attached inside `run_code_unsafe`; `browser_handle_dialog` errors afterwards ("no related modal state") — that error means it was already handled; verify by file absence.

## Cleanup (done, file-absence verified)
Wild Shape toggled OFF + logs present; Long Rest performed; Admin → Clear Change Data + Clear Campaign Log. `public/campaigns/test-campaign/data/character-change-data.json` ABSENT, `campaign-log.json` ABSENT. Subclass edit (Stars→Moon) intentionally retained.

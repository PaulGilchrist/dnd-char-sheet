# Bug CLA-200 — Inspiring Smite cannot be activated (trigger routing dead + feature row inert)

## Title
CLA-200 Inspiring Smite (Oath of Glory lv3, `post_cast_inspiring_smite`) — no reachable activation path: post-cast auto-trigger unreachable for Divine Smite, and the Special Actions row is inert.

## Overview
Verified 2026-08-29 on ElderPaladin (converted 2024 Paladin lv20 Oath of Devotion → **Oath of Glory** — note: manifest wrongly said Oath of Devotion; in `public/data/2024/classes.json` Inspiring Smite is **Oath of Glory majors[1].features[0] lv3**, matching 2024 PHB). Manifest paths (`src/services/combat/automation/handlers/classFeatureHandler.js`, routers/, infoBuilders/) do not exist; real impl: `src/services/automation/handlers/class-cleric-paladin/inspiringSmiteHandler.js` + `src/services/rules/features/inspiringSmiteService.js` + `src/components/char-sheet/modals/InspiringSmiteModal.jsx` + `useCharActionsModalHandlers.js:303`.

## Expected
Immediately after casting Divine Smite, the Inspiring Smite distributor should surface (auto-post-cast popup/modal, or a clickable "Inspiring Smite:" row to invoke manually), expend 1 Channel Divinity, and split 2d8+Paladin-level temp HP among allies within 30 ft.

## Actual
1. **Auto-trigger never fires.** Divine Smite cast + HIT (popup "d20 7 +11 (+11 to hit) Advantage ✓ HIT (18 vs AC 14)", rolls [7,3]; damage "2d8 [radiant] + 1d8 [radiant]: 8, 8, 2 → 18 applied to Wight 1 — HP: 82 → 64"). `campaign.lastAttack.attackName = "Divine Smite"` IS written (gate data satisfied), but no Inspiring Smite modal appeared and no `[spellCast] Inspiring Smite trigger failed` console error (trigger never invoked). Cause: `src/services/rules/spells/spellCastService/execution/index.js:566-568` — spells **without a `dc`** take `return await handleNoSavePath(...)`, which exits **before** the post-cast trigger block at :571-588 where `triggerInspiringSmite()` lives. Divine Smite has no `dc` field in `public/data/2024/spells.json`, so it always hits this early return.
2. **Manual row is inert.** "Inspiring Smite:" renders in Special Actions but `<b className="" onclick=undefined>` (probe: `{text:"Inspiring Smite:", cls:"", hasClick:false}` while sibling "Peerless Athlete:" is clickable). Cause: `post_cast_inspiring_smite` missing from `INTERACTIVE_HANDLER_TYPES` (`src/services/combat/automation/automationService.js:14-65`); `CharSpecialActions.jsx:743-749` renders no click handler for non-interactive types (CLA-179 pattern).
3. Consequence: after the whole flow, `channelDivinityCharges` stayed 3, no `tempHp` on any target, zero Inspiring Smite log entries. Feature is unreachable from the UI end-to-end.

### Isolation probe (service half WORKS when invoked directly)
In-page `handle(action, playerStats{lv20}, 'test-campaign', null)` (lastAttack gate live): modal opened "Rolled 2d8 + 20: 31" (first probe, self-only because `getAllyList` reads runtime `selectedAllies`, which was unset → self fallback). After seeding `setAllyList('ElderPaladin',[ElderPaladin,AasimarTest,HeroesFeastBard])`, second dispatch: "Rolled 2d8 + 20: 27" (2d8=7+20 ✓), allocated 10/9/8 (Allocated 27/27), Inspire → popup "Granted 27 temporary hit points: AasimarTest (10 HP), HeroesFeastBard (9 HP), ElderPaladin (8 HP)". change-data: tempHp AasimarTest=10, HeroesFeastBard=9, ElderPaladin=8; CD 3→2; log `ability_use` "ElderPaladin used Inspiring Smite (27 temp HP). Distribution: …". Roll/level math, distribution UI, CD decrement and logging are all correct — **only the activation routing is broken**.

## Steps to Reproduce
1. test-campaign, ElderPaladin lv20 Oath of Glory, CD 3/3 (convert subclass via Edit-wizard step 7 if Devotion).
2. Encounters → search Wight → tick → Join Encounter. Walk to ElderPaladin turn; card Target = Wight 1.
3. Spell row "Divine Smite" → Cast Spell (Level 1) → auto-roll popup "✓ HIT (18 vs AC 14)" → Done → damage popup 18 radiant, Wight 82→64. **No Inspiring Smite prompt appears.**
4. Click Special Actions "Inspiring Smite:" row → nothing happens (inert text, no popup/modal).
5. change-data: lastAttack.attackName='Divine Smite', ElderPaladin.channelDivinityCharges=3, no tempHp anywhere.

## Likely Location
- `src/services/rules/spells/spellCastService/execution/index.js:566-568` — no-dc branch `return await handleNoSavePath(...)` skips post-cast triggers (:571+). Fix: invoke `triggerInspiringSmite` (and friends) before/at the no-save return, or route non-dc spells through the trigger block.
- `src/services/combat/automation/automationService.js:14` — add `post_cast_inspiring_smite` to `INTERACTIVE_HANDLER_TYPES` so the row dispatches `handleAutomationClick` → `executeHandler` → handler (which already gates on lastAttack=Divine Smite with a friendly popup otherwise).
- Secondary (design): no-map ally list = runtime `selectedAllies` only (`useAllySelection.js:7-13`); without map or configured allies the popup lists self only — consider seeding combatSummary PCs like FT-046's handler does.

## Notes
- Manifest errors: subclass is Oath of **Glory** lv3, not Oath of Devotion; all three manifest file paths don't exist.
- CD consumption happens only in `handleInspiringSmiteConfirm` (modal confirm), not on trigger — correct-by-design but means the handler's early dispatch leaks no charge.
- Cleanup done: Wight removed, selectedAllies/tempHp/CD cleared via Admin Clear Change Data + Clear Campaign Log.

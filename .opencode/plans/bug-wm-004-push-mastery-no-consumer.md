# Bug WM-004: Push Weapon Mastery Not Implemented — Hit Produces Zero Push Effect

## Title
Push weaponMastery automation is data-only: no consumer anywhere applies the push on a hit (WM-004 FAIL)

## Overview
WM-004 (Push, weaponMastery) is present in the app's 2024 data and rendered in the UI (Mastery column on attack rows, mastery popup text), but no code path ever executes it. The central mastery dispatcher `applyMasteryEffect()` looks the mastery name up in a `MASTERY_EFFECTS` map that contains Topple/Sap/Slow/Vex/Cleave/Nick/Graze but **not** `Push`, so the lookup returns `null` and every caller silently does nothing. There is no mastery picker with an Activate action for Push, no targetEffect writer, no size gate (Large-or-smaller), no "straight away" or distance/position handling, and no log entry.

## Expected Behavior
Canonical wording (`public/data/2024/weapon-mastery.json`, "Push"):
> "If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller."

Push-carrying weapons in this dataset (`public/data/equipment.json` `mastery` field): Warhammer, Pike, Greatclub, Heavy Crossbow.

On a hit with one of these weapons the app should offer/apply a push of up to 10 ft straight away, gated on the target being Large or smaller, with observable state (position/targetEffect) and a log entry — as it does for the implemented masteries (e.g. Topple's CON save + Prone, Slow's speed_reduction te).

## Actual Behavior
- Live E2E (DraconicDragon lv20 Barbarian, Warhammer equipped, vs EB-joined Thug 1 Medium AC 11): attack HIT 29 vs AC 11 → Done → damage popup "1d8+7 [bludgeoning]: 14 damage applied to Thug 1 — HP: 32 → 18".
- After the hit: **no mastery picker appears** (no `.sp-overlay` "Choose a mastery…"), the damage popup is the last modal, and the sheet Mastery cell "Push" opens only a static text popup of the rule with no Activate/choice control.
- change-data (`/api/campaigns/test-campaign/change-data`, probed ≥12 s after the hit): campaign `targetEffects: []`, zero push-related campaign keys, zero `_Push_appliedTarget`, `Thug 1` has no position/targetEffects/activeConditions delta.
- Campaign log: only encounter/initiative/attack roll/damage roll/hp_change entries — **zero** `ability_use` or any entry mentioning push.
- Remove-NPC confirm HP probe: "Thug 1 has 18 HP" — pure damage, no push state side effects.

## Steps to Reproduce
1. Open test-campaign, Edit wizard → DraconicDragon → step 16 Inventory → Equipped Items textarea = `Warhammer` (Enter) → ✓ Save inside wizard → 15 s → JSON `inventory.equipped:["Warhammer"]`.
2. Encounters view → search "Thug" → tick "Select Thug" → `.encounter-btn-join` (Join Encounter).
3. Initiative view → DraconicDragon card Target select = Thug 1 → open DraconicDragon sheet.
4. Actions grid, Warhammer row "+11" hit link → Reckless Attack prompt → Normal Attack → HIT popup → Done → damage popup → dismiss.
5. Observe: no Push mastery picker; Mastery cell "Push" popup is text-only, no Activate button.
6. Fetch `/api/campaigns/test-campaign/change-data` and `/api/campaigns/test-campaign/log`: no push te, no push keys, no push log entry.

## Likely Location
- `src/services/automation/handlers/combat/weaponMasteryHandler.js`
  - `MASTERY_EFFECTS` map (:8-51) — missing `Push` entry (needs e.g. `{label:'Push', effect:'push', value:10, ...}`).
  - `applyMasteryEffect()` :115-116 — `const mastery = MASTERY_EFFECTS[masteryName]; if (!mastery) return null;` → Push returns null (single point of deadness).
  - `applyPostDamageMasteryEffects()` :90-92 — `if (!mastery) continue;` → Push silently skipped post-hit.
- `src/services/combat/steps/attackRollPostDamage.js`
  - `buildTacticalMasterStep()` :457-463 autoApplyMasteries loop calls `applyMasteryEffect('Push')` → null; no dedicated Push pipeline step exists (chain is cleaveMastery → tacticalMaster → toppleMastery → masteryDone).
- `src/components/char-sheet/modals/WeaponMasteryModal.jsx` :49 — Activate → `applyMasteryEffect(selected)` → null for Push → picker re-renders unchanged, no popup/log/state.
- `src/components/char-sheet/useCharActionsCleave.js` :149 — tactical-master confirm else-branch → same null path for Push.
- No size gate ("Large or smaller") and no "straight away" direction check exist anywhere for Push; the only `targetEffects` push writers in the app are Shield Bash (`src/services/combat/steps/features/shieldBash.js:146`, value 5) and Tavern Brawler (`src/services/combat/steps/features/tavernBrawlerPush.js:23`, value 5) — unrelated features; a consumer for `te.effect==='push'` exists (`src/services/combat/conditions/conditionEffects.js:363`) but nothing feeds it from the mastery chain.

## Notes
- Manifest handler/router/infoBuilder paths (`src/services/combat/automation/handlers/weaponMasteryHandler.js`, `routers/weaponMasteryRouter.js`, `infoBuilders/weaponMasteryInfoBuilder.js`) are stale — real files are the automation/handlers + combat/steps paths above.
- Half-implemented mastery family: Sap/Slow/Vex/Topple/Cleave/Nick have working consumers; Graze is partially handled; Push is completely inert ("data collected with zero consumers" per verdict rules = FAIL, not incomplete).
- `collectWeaponMastery()` (`src/services/combat/automation/automationPassives.js:54`) DOES collect Push correctly (baseMastery from `equipment.json`; Battering Roots extraMastery branch :67 lists 'Push') — the plumbing up to the dispatcher works; only the dispatcher + effect writer are missing, making this a small, well-scoped fix.
- te registry: check `src/services/combat/conditions/targetEffectDefinitions.js` before adding — `push` needs registration if not present when the fix lands.
- Live differential vs Topple/Sap recipes in playbook proves other masteries DO surface post-hit; Push never does.

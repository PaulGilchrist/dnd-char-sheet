# Bug — CLA-199 Inspiring Movement

## Title
Inspiring Movement never expends a Bardic Inspiration die (usesMax always 0); Agile Strikes chain hijacks the result popup

## Overview
CLA-199 (Inspiring Movement, College of Dance major lv6, 2024 Bard) was verified E2E on HeroesFeastBard (converted College of Lore → College of Dance lv17). The reaction UI flow works end-to-end: sheet "Inspiring Movement:" row → ally-picker modal → Move → flags + expirations + log all written. However, the mandated cost — **expend 1 Bardic Inspiration** — never happens: `bardicInspirationUses` stayed 5→5. Per the manifest verdict criteria ("no inspiration consumed … = FAIL") this is a FAIL.

## Expected
Using the reaction expends 1 use of Bardic Inspiration (tracked `bardicInspirationUses` decrements 5→4), grants self half-Speed movement Reaction, offers one ally within 30 ft a follow-up half-Speed Reaction, and flags all of this movement as provoking no Opportunity Attacks.

## Actual
- `bardicInspirationUses` unchanged (5→5, confirmed in change-data + sheet readout).
- Flags written correctly: `HeroesFeastBard.inspiringMovementNoOA=true`, `HexWarlock.inspiringMovementGranted=true`, `HexWarlock.inspiringMovementNoOA=true`, `pendingExpirations` entries `inspiring_movement_no_oa` / `inspiring_movement_granted`.
- Log written: `ability_use` "HeroesFeastBard used Inspiring Movement. Ally: HexWarlock. Movement does not provoke Opportunity Attacks."
- Secondary defect: instead of the Inspiring Movement confirmation popup, the final popup was **"Agile Strikes — No target selected for Agile Strikes. Select an enemy target and try again."** — the lv6 `passive_rule/agile_strike` auto-chained inside `applyInspiringMovement` and its error popup replaced the feature's own popup.

## Steps to Reproduce
1. test-campaign; character must be Bard with **College of Dance** major (feature is `majors[0].features[1]` lv6 in `public/data/2024/classes.json` — NOT base Bard; Lore Bard shows no row at all).
2. Encounter Builder → search "Wight" → tick → Join Encounter.
3. Walk `Next →` so the Wight card's turn ends (verified turn passed by `.creature-card.active` index > Wight index).
4. HeroesFeastBard sheet → Reactions → "Inspiring Movement:" → ally-picker `.sp-overlay` "Inspiring Movement — Choose Ally" → tick HexWarlock → **Move**.
5. Observe popup "Agile Strikes / No target selected…"; sheet still shows "Bardic Inspiration Uses: 5/5"; change-data `HeroesFeastBard.bardicInspirationUses === 5`.

## Likely Location
- `src/services/automation/handlers/reactions/reactionBonusHandler.js:569-590` (`handleInspiringMovement`) and `:634-644` (`applyInspiringMovement`): consumption is gated by `usesMax = auto.uses_expression ? evaluate : (auto.usesMax ?? auto.uses ?? 0)`. The 2024 data automation for Inspiring Movement carries `resourceCost:'bardic_inspiration'` but NO `uses`/`usesMax`/`uses_expression`, and the infoBuilder (`src/services/combat/automation/automationInfoBuilder/reaction.js:4-24`) does not inject one → `usesMax = 0` → the consume block `if (usesMax > 0)` is skipped in BOTH handle and apply. `resourceCost` is passed through but never read here. Fix pattern already exists in `src/services/automation/handlers/reactions/reactionDebuffHandler.js` (`bardicUsesMax > 0 ? 'bardicInspirationUses' : usesKey` via `_trackedResources`).
- `src/services/automation/handlers/reactions/reactionBonusHandler.js:680-698`: unconditional chain to `agile_strike` `executeHandler` returns an error popup ("No target selected for Agile Strikes", `src/services/automation/handlers/class-bard/agileStrikeHandler.js:34`) that shadows the Inspiring Movement result popup. Agile Strikes is an enemy-hit-triggered feature; chaining it from Inspiring Movement with no target is wrong (or should silently fall back to the IM popup).

## Notes
- Manifest paths are stale: `handlers/classFeatureHandler.js`, `routers/classFeatureRouter.js`, `infoBuilders/classFeatureInfoBuilder.js` don't exist. Real chain: `automationRouter.js:114` (`reaction_bonus` → reactions) → `automationInfoBuilder/reaction.js` → `CharReactions.jsx:74-88/222-258/587-595` → `reactionBonusHandler.js`.
- Manifest "likely base Bard lv6" is wrong — College of Dance major lv6.
- No-map run: movement itself is popup/log-only by design (half-speed text + granted flags); no token movement expected on gridless board — not counted against it.
- No-OA enforcement consumer exists and works for OA clicks: `CharReactions.jsx:199-205` blocks OA vs a creature with `inspiringMovementNoOA` ("protected by Inspiring Movement").
- Expirations for the no-OA/granted flags ARE enqueued (`pendingExpirations` populated) — unlike CLA-175/191 family.
- Runtime + log cleared after run; Wight removed; HeroesFeastBard left as College of Dance lv17.

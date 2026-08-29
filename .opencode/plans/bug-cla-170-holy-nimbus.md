# BUG CLA-170 — Holy Nimbus radiant turn-start damage computed/logged but never lands on monster HP (and never re-applies)

**Date:** 2026-08-29 · **Campaign:** test-campaign (2024) · **Character:** ElderPaladin (Human Paladin, lv20, subclass switched Oath of Glory → **Oath of Devotion** via Edit wizard step 7; Holy Nimbus confirmed = Oath of Devotion **level 20** feature in `public/data/2024/classes.json`).

## What works
- Activation: Bonus Actions "Holy Nimbus:" → popup "Holy Nimbus activated! Aura of Protection is imbued with holy power for 10 minutes.", `automation-badge` "Holy Nimbus" on sheet, CD charges 3/3→2/3, log `ability_use` entry. Runtime `holyNimbusActive=true`, `activeBuffs=[{effect:'sunlight_aura', duration:'10_minutes'}]`.
- Manual end: second click → popup "Holy Nimbus ended.", badge removed, CD stays consumed.
- Long Rest restores CD 2/3→3/3 (UI offers long-rest restore; no 5th-slot path — acceptable, feature automation declares `resourceCost: channel_divinity`).

## The bug
**Radiant Damage ("enemy starting its turn in the aura takes CHA+PB Radiant") does not visibly or persistently damage the monster.**

Evidence (Wight, Undead, AC 14, HP 82/82, joined via Encounter Builder, initiative 13):
1. When Wight's turn first started (round increment), the campaign log recorded `hp_change Wight 1 delta -11 → currentHp 71` (CHA +5 + PB +6 = 11 ✓ formula correct).
2. The Wight initiative-card HP input **never showed anything other than 82** (sampled every 700 ms across the turn walk; also POST bodies confirm: network POST #1566 carried `currentHp: 71`, a later POST #1584 (round 3) carried `currentHp: 82`).
3. Server-persisted `change-data.combatSummary` for Wight stayed **82** — the -11 was silently rolled back.
4. A full additional round walked to Wight's turn start produced **no new hp_change log at all** — the damage applied exactly once, ever.

## Root cause (code map)
- `src/services/rules/effects/auraDamageService.js:52` `applyHolyNimbusDamage`: fetches/loads a summary copy, mutates it to 71, `storage.set` + direct POST — but never calls `setCombatSummaryCache(summary)`, so the client-side cache (`combatData.js cachedCombatSummaries`) and Initiative React state never see 71. (Same family as bug-cla-160 "fresh fetch copy discards mutation".)
- `src/components/initiative/navigationHandlers.js:30` `handleNextCreature` round-boundary `storage.set('combatSummary', updatedSummary)` re-POSTs the stale ref (82) on the next round → erases the damage on the server.
- `navigationHandlers.js:63-66` `lastAppliedTurnStartCreatureRef` is only advanced inside the round-increment branch and only vs the newly active name; once it equals `'Wight 1'` it is never advanced past it, so subsequent rounds' Wight turn-starts skip `applyTurnStartEffects` entirely → radiant never re-applies.

## Impact
Feature is cosmetic: aura badge + one phantom log entry, zero sustained damage. Holy Ward save advantage path (`SavePromptModal.jsx:217-258`) exists but was **not exercised** (Wight has no save-forcing action vs Paladin in this flow) — status unknown, shares the runtime-key plumbing that works.

## Repro recipe
1. Edit ElderPaladin → step 7 Subclass → Oath of Devotion → Save (JSON verify after 15 s).
2. Sheet → Bonus Actions "Holy Nimbus:" → activated popup, badge, CD 3→2.
3. Encounters → search Wight → select → Join Encounter → Initiative view.
4. Loop `Next →` until Wight card is active (match `.creature-card.active input[aria-label="Wight 1 current HP"]`, NOT card text — Target selects list all names).
5. Observe: HP input stays 82; log has `hp_change −11 → 71`; second round to Wight: no log at all.

## Suggested fix
In `applyHolyNimbusDamage` (and `applyAuraDamage`), call `setCombatSummaryCache(summary, campaignName)` before/with `storage.set`, and gate turn-start re-application on round number rather than a sticky creature-name ref.

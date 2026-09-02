# Bug — CLA-270 Psi-Bolstered Knack (2024 Soulknife, part of "Psionic Power")

## Overview
CLA-270 covers the **Psi-Bolstered Knack** half of the 2024 Soulknife **Psionic Power** feature (CLA-276 covers Psychic Whispers separately). The app hardcodes a check-boost that fires on **every** ability check for Rogue+Soulknife lv3+ — it does NOT enforce the two rule gates from canonical wording: (1) only when the check **fails**, and (2) only for skill/tool checks where the character has **proficiency**. Live-verified twice on 2026-09-01 in "test-campaign" (AasimarTest, Soulknife lv14, d10 ×10 pool).

## Canonical expected behavior (per PHB / GM-provided text)
> **Psionic Energy Dice:** lv3 d6×4, lv5 d8×6, lv9 d8×8, lv11 d10×8, lv13 d10×10, lv17 d12×12.
> **Psi-Bolstered Knack:** *If you fail an ability check using a skill or tool you have proficiency with*, roll one Psionic Energy Die and add it to the check total. The die is expended **only if the roll then succeeds** (add, and if you succeed, expend one die).

## Actual behavior
- Psionic Energy Dice scaling data is **CORRECT** (`public/data/2024/classes.json` Soulknife `energy` blocks: d6×4 lv3–4 → d12×12 lv17–20).
- The boost works mechanically and consumption is **CORRECT**: die added, expended **only on success** (`CharSheet.handlers.js` `handlePsiBolsteredKnack` — `if (success)` spends `psionicEnergy`; verified live: d10=10 added → Insight 11→21, pool 10→9, ability_use log).
- **BUG 1 — fires on successful checks:** the toggle appears/applies even when the original roll already succeeded. Gate at `CharAbilities.jsx:201-206` (`makeCheckContext`) is just `isSoulknife && level >= 3` — no comparison of original total vs DC/success state, despite `handlePsiBolsteredKnack(playerStats, campaignName, popupHtml, dieValue, dieSize, success)` receiving the `success` flag (used for consumption only, never to gate presentation).
- **BUG 2 — no proficiency gate:** the same context applies to **any** ability check (raw ability checks included); nothing checks that the check used a proficient skill or tool.
- **Contributing data gap:** the feature in `classes.json` (Soulknife lv3 `Psionic Power`, ~line 10087) carries the Knack wording as **free text** with `automation: null` — no structured metadata; the sheet behavior is entirely hardcoded, so rule fixes must touch the hardcoded gate (or structure the data + wire a consumer).

## Steps to Reproduce
1. http://localhost:5173 → "test-campaign" → AasimarTest (2024 Soulknife lv14).
2. Open any ability-check cell (e.g. Insight, or a **non-proficient** check like Arcana).
3. Roll a result that already meets/exceeds the DC — the "Psi-Bolstered Knack (d10)" add button still appears; clicking adds the die, spends `psionicEnergy`, and logs `ability_use`.
4. Repeat with a raw ability check (no skill/tool involved) — option still appears (proficiency gate absent).

## Likely Location
- `src/components/char-sheet/CharAbilities.jsx:201-206` — missing fail-only + proficiency gates on `psiBolsteredKnack` context.
- `src/components/char-sheet/DiceRollResult.jsx:475-541` — toggle rendering (mirror gate needed).
- `src/components/char-sheet/CharSheet.handlers.js` `handlePsiBolsteredKnack` — consumption correct; needs an upfront success/fail refusal + proficiency validation.
- `public/data/2024/classes.json` — Soulknife lv3 `Psionic Power`: `automation: null` (free-text wording); consider structured `automation` so the gate can be data-driven.

## Notes
- Manifest row CLA-270 was mislabeled: expected text should be the canonical failed-proficient-check boost (as above), not a proficiency-grant. Row expectedBehavior/triggerConditions updated 2026-09-02.
- Die consumption-on-success-only already matches canonical — do not regress when fixing the gates.
- Evidence from 2026-09-01 passes: live popup "Psi-Bolstered Knack (d10)" +10 → 21 on Insight (proficient, succeeded — should never have been offered); pool 10→9; second pass corrected first pass's wrong "never consumes" claim.

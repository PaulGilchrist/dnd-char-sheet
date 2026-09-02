# BUG CLA-271 — Psionic Sorcery: Sorcery Point double-charge AND spell slot still consumed; SP-payment commit path unreachable

## Overview

CLA-271 Psionic Sorcery (Aberrant Sorcery major lv6, 2024) surfaces a "Psionic Sorcery" checkbox in the Metamagic popup and an "or N SP" readout in the spell detail popup, but the Sorcery Point payment path is broken end-to-end:

1. **Wrong point cost (double-charge):** confirming a psionic cast with Psionic Sorcery selected spends **twice** the spell's level in Sorcery Points.
2. **Spell slot also consumed:** the spell slot for the cast is still expended, so the "instead of a spell slot" half of the feature never works.
3. **The correct payment code in `prepareSpellCast` is dead:** its `usePsionicPayment` option is never forwarded by any production caller, so the slot-skip logic and the canonical `psionic_sorcery` log entry (with the component-waiver note) never execute — campaign log had **0** `psionic_sorcery` entries after live casts.
4. **Component waiver is cosmetic prose only:** the waiver text renders in the MetamagicPopup checkbox description, but no runtime state, log, or badge records the waived V/S components, and `metaCtx.psionicSpell` (set by the live handler) has zero consumers.

## Expected Behavior (canonical app-data wording, `public/data/2024/classes.json` Aberrant Sorcery → Psionic Sorcery, level 6)

> "When you cast any level 1+ spell from Psionic Spells feature, cast by expending spell slot normally or spending Sorcery Points equal to spell's level. If cast using Sorcery Points, no Verbal or Somatic components, no Material components unless consumed or have cost."

So for Detect Thoughts (lv2): SP payment should cost exactly **2 SP**, consume **no lv2 slot**, and record the component waiver.

## Actual Behavior (live evidence, AberrantSorcerer lv6, test-campaign, 2026-09-02)

- Baseline runtime: `sorceryPoints: 6`, `spell_slots_level_1: 4`, `spell_slots_level_2: 3`.
- Cast Detect Thoughts (lv2, Psionic Spell) → detail popup showed "3 slots or 6 SP" + "Use Sorcery Points (2 SP) instead of spell slot" checkbox (ticked) → MetamagicPopup showed "Psionic Sorcery 2 SP" (ticked; readout "2 selected — 4 remaining") → Apply & Cast:
  - **`sorceryPoints: 6 → 2`** (spent 4, expected 2)
  - **`spell_slots_level_2: 3 → 2`** (slot consumed; expected unchanged)
- Control probe, non-Psionic spell Light (lv1): MetamagicPopup contains **no** "Psionic Sorcery" option; `sorceryPoints` stayed 2 → 2. Gate half works.
- Normal (slot) cast of Psionic Spell Detect Thoughts via "Cast Without Metamagic": lv2 slot 2 → 1 consumed, SP unchanged (expected for a normal cast).
- Campaign log (`public/campaigns/test-campaign/data/campaign-log.json`) after all casts: `psionic_sorcery` entry count = **0**. Only `metamagic_use` (sorceryPointsSpent: 4 — itself double-counted) + `spell` entries appear.
- Bonus observation: normal-cast of Light (lv1) via skip left `spell_slots_level_1` at 4 (no slot consumed) — separate anomaly, noted, not this feature's core.

## Steps to Reproduce

1. Create `AberrantSorcerer` via Add Character wizard: 2024 rules, Human, Sorcerer lv6, Subclass "Aberrant Sorcery"; pick 5 cantrips + 7 prepared incl. Detect Thoughts + Light (control).
   - NOTE: the EDIT wizard cannot be used for this — it silently fails to persist `class.major` (see Notes).
2. On the sheet, set the Sorcery Points tracker input to 6 + Enter (writes runtime `sorceryPoints` key; Long Rest alone leaves it null → popup shows no SP option).
3. Stage Thug via Encounter Builder → Join Encounter (optional, for a save target).
4. Spells table → click "Detect Thoughts" row → tick "Use Sorcery Points (2 SP) instead of spell slot" → "Cast Spell" → in Metamagic popup tick "Psionic Sorcery" → "Apply & Cast".
5. Observe `sorceryPoints` 6→2 (expected 4) and `spell_slots_level_2` decremented (expected unchanged).

## Likely Location

- **Double cost:** `src/hooks/combat/useSpellMetamagicFlow/useMetamagicHandler.js:14-24` — `result.totalCost` from MetamagicPopup is already `totalCost + psionicActive*psionicCost` (`MetamagicPopup.jsx:28-29,63`), and the handler then adds `pending.psionicCost` AGAIN (`:17-21`) before `spendSorceryPoints(totalCost)` (`:23`). Same pattern duplicated in `src/hooks/combat/useActionSpellMetamagic.js:29-36`.
- **Slot still consumed / SP-payment block dead:** `prepareSpellCast` (`src/services/rules/spells/spellPreparationService.js:479,528-547,554,579`) only skips slot consumption when `usePsionicPayment` is passed in the **options** argument. No production caller forwards it: `SpellDetailPopup.jsx:110` attaches `usePsionicPayment` to the **spell object** only; `useMetamagicHandler.js:61` and `useSpellMetamagicGates.js:117` call `prepareSpellCast(pending.spell, metaCtx, { … })` without it → `psionic_sorcery` log + slot-skip unreachable (CLA-128-family supply→consumer break, on the consumer side).
- **Actions-row path also mis-plumbed:** `CharActionSpellPopups.jsx:187,394` never forward `_isPsionicSpell`/`_psionicCost`, so Psionic spells cast from the Actions bar row never even show the option (verified live with Dissonant Whispers).
- **Dead component:** `src/components/char-sheet/popups/PsionicChoicePopup.jsx` has zero production renderers.

## Notes

- Passives collector works here: `automationRouter.js:153` + `automationInfoBuilder/psionic.js` do supply the `psionic_sorcery` + `psionic_spells_list` passives (sheet Features render; MetamagicPopup gate at `useSpellMetamagicGates.js:151-161` correctly marks psionic spells). This is NOT a CLA-128 supply gap — it is a consume-side plumbing gap.
- Component waiver: spells.json models `components: ['V','S','M']`; nothing in the cast pipeline gates or waives components. The waiver exists only as popup checkbox description text (`MetamagicPopup.jsx:134`) — documented gap.
- Wizard gotcha found en route: Edit wizard step-7 subclass combobox writes `class.subclass.name` but leaves stale `class.major` in every PUT payload (verified in request bodies 3×); `classRules2024.js:30` prefers `major.name`, so subclass edits via Edit wizard are silently inert for major-feature supply. New-character wizard DOES persist major correctly (via `subclass.name`, major resolved at compute).
- Runtime `sorceryPoints` stays null after Long Rest (listed in LONG_REST_RESOURCES at `restRules-constants.js:99` but reset leaves it null); `SpellDetailPopup._psionicSorceryAvailable` reads `?? 0`, so the SP option is invisible until the sheet tracker input is committed once.
- Suggested fix shape: forward `spell.usePsionicPayment` into the `prepareSpellCast` options from `useMetamagicHandler.handleConfirm` (and gates), and stop re-adding `psionicCost` to the already-total `result.totalCost`.

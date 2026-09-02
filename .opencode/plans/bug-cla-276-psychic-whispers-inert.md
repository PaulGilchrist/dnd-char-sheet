# Bug CLA-276 — Psychic Whispers (Rogue Soulknife, 2024): inert prose, no telepathy automation

## Title
CLA-276 Psychic Whispers — canonical telepathy feature is prose-only: no feature automation, no consumers, no UI, zero observable effect.

## Overview
CLA-276 verifies the Soulknife lv3 "Psychic Whispers" feature end-to-end. The manifest describes it as granting telepathy AND extra psychic damage from psychic blades. The canonical 2024 app data (`public/data/2024/classes.json`, Soulknife major) carries Psychic Whispers ONLY as free-text inside the lv3 **Psionic Power** feature description, which has **no `automation` metadata at all**. No code anywhere consumes the feature: no handler, no info-builder DISPATCH key, no telepathy UI, no damage adder. The feature is a completely inert row.

## Expected Behavior (canonical app-data wording)
`public/data/2024/classes.json` → Rogue → Soulknife → features[] → "Psionic Power" (level 3, **no automation key**):

> "Psychic Whispers: Action, choose creatures up to Proficiency Bonus, roll one Psionic Energy Die. For hours equal to number rolled, chosen creatures can speak telepathically with you (within 35 feet). First use after Long Rest doesn't expend die."

Canonical expectation therefore: an actionable feature that rolls a Psionic Energy Die, selects up to PB creatures, grants a telepathic-speech link (the app already models this exact effect elsewhere via `automation.effect:'telepathic_speech'` for Sorcerer Aberrant Sorcery "Telepathic Speech" classes.json:10944 and Warlock Great Old One "Awakened Mind" classes.json:12486, consumed in `src/services/automation/handlers/buffs/buffHandler.js:106` → `handleTelepathicSpeech`/`confirmTelepathicSpeech` :435/:480), expends the die per the long-rest exception.

**Manifest wording discrepancy:** manifest expectedBehavior ("psychic blades deal extra psychic damage") matches the older UA second-blade wording, not the 2024 PHB Psychic Whispers (telepathy only). The "extra damage" clause is manifest inflation; judged against canonical app text only.

## Actual Behavior
- No "Psychic Whispers" feature row exists anywhere; the text only renders inside the "Psionic Power:" feature block on the sheet.
- The "Psionic Power:" `<b>` header is **inert**: live probe shows `onclick:false`, no clickable class (INTERACTIVE_HANDLER_TYPES gating, pitfall CLA-179 pattern).
- No telepathy button/badge/messaging UI on the sheet (`querySelectorAll('button,.clickable')` filtered on /telepath|whisper/ → `[]`).
- Supply-side dead (pitfall #10): in-page `buildAttackInfo({name:'Psionic Power'})` → **null**; `collectAutomationFromFeatures([feature]).passives` → **[]**. Even a synthetic `{name:'Psychic Whispers', automation:{type:'passive'}}` yields `buildAttackInfo` null / passives [] — no DISPATCH case exists for this feature at all.
- No extra psychic adder on the Psychic Blade rows (this is actually canonical — no adder expected): sheet shows melee `1d6+2` +7 Vex and thrown `1d4` +7, identical to CLA-274 baseline; no delta.

## Steps to Reproduce
1. http://localhost:5173 → campaign **test-campaign** → **AasimarTest** (Soulknife lv14, 2024; registry `subclass` field says Assassin but is stale — live sheet shows Soulknife features per CLA-269/274).
2. Sheet Features section: "Psionic Power:" text contains Psychic Whispers prose; clicking the header does nothing (inert `<b>`).
3. No telepathy activation UI exists anywhere on sheet or initiative card.
4. In-page probe (devtools console on the app):
   ```js
   const m = await import('/src/services/combat/automation/automationService.js');
   m.buildAttackInfo({name:'Psionic Power', level:3});            // → null
   m.collectAutomationFromFeatures([{name:'Psionic Power'}],{}).passives; // → []
   ```
5. Psychic Blade rows: Action `1d6+2`, Bonus `1d4` — no extra-psychic adder (canonical: none expected).

## Likely Location
- `public/data/2024/classes.json` Soulknife lv3 "Psionic Power" — needs its own `automation` entry (e.g. split Psychic Whispers out with `type:'buff', effect:'telepathic_speech'` like Telepathic Speech/Awakened Mind, plus psionic-die cost).
- Consumer path already exists and is reusable: `src/services/automation/handlers/buffs/buffHandler.js` (`telepathic_speech` effect, modal `telepathicSpeech`, listener picker in `src/components/char-sheet/char-summary/CharClassFeatures.jsx:505`).
- Manifest handler/router/infoBuilder paths (`src/services/combat/automation/handlers/classFeatureHandler.js` etc.) do **not exist** — stale manifest paths (pitfall #10).

## Notes
- `grep -rn "psychicWhispers|psychic_whispers|Psychic Whispers" src/` → zero consumers (only unrelated `dungeonNamegen.js` / test fixtures match "Whispers").
- The app already proves it CAN model this feature (Aberrant Sorcery Telepathic Speech / Awakened Mind both dispatch `telepathic_speech`); Soulknife Psychic Whispers was simply never wired — unimplemented, per GM trichotomy = BUG.
- Manifest "extra psychic damage" clause: no data or code adder exists, and canonical 2024 text does not grant one — GM to correct manifest wording.
- No campaign data was modified during this run (read-only navigation + pure in-page probes; no monsters staged, no attacks, no logs written).

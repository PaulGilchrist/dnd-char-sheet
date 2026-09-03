# CLA-268 Psychic Spells — 'Change damage type to Psychic' checkbox is decorative: the swap fires unconditionally and the opt-out flag has zero consumers

## Overview

Psychic Spells (Great Old One Patron lv3) renders a per-spell checkbox "Change damage type to Psychic" in SpellDetailPopup. The checkbox is wired to set `_psychicSpellsOverride` at cast time, but NOTHING ever reads that flag, while the live damage-type swap in the cast execution path fires UNCONDITIONALLY for any Warlock with the passive + any damaging spell. Ticking and unticking the checkbox produce identical behaviour: the target always takes Psychic. GM control (unchecked cast) proven live in the CLA-268 verification run (playbook line 1367: "checkbox is decorative… UNchecked EB also deals Psychic (control proven)").

## Canonical / Expected

App-data automation: `{type:'psychic_spells', damageType:'Psychic', componentReduction:['V','S'], spellSchools:['enchantment','illusion']}` (2024 classes.json Warlock majors[Great Old One]). With a UI checkbox offered, RAW-consistent behaviour is: swap only when the player opts in (`usePsychicDamage`/`_psychicSpellsOverride` truthy); an unchecked damaging spell must keep its RAW damage type (e.g. Fire Bolt stays Fire for a Great Old One warlock).

## Actual (code-inspection evidence, current tree)

- Writer only: `grep -rn "_psychicSpellsOverride" src` (non-test) → single hit, `src/services/rules/spells/spellPreparationService.js:683` (`if (canChangeDamageType && usePsychicDamage) modifiedSpell._psychicSpellsOverride = true;`). ZERO readers.
- Unconditional swap: `src/services/rules/spells/spellCastService/execution/index.js:138-141` — `if (psychicSpellsConfig && spell.damage && damageType) { effectiveDamageType = psychicSpellsConfig.damageType || 'Psychic'; }` — gated only on passive + damage presence, never on the override/opt-in flag. `noSavePath.js:26` feeds `effectiveDamageType` into the attack context, so every hit applies Psychic.
- Live control (CLA-268 run, 2026-09-01): unchecked casting still produced '3d10 [psychic]' popup + Psychic hp_change.

## Steps to Reproduce

1. Convert HexWarlock to Great Old One Patron (Edit step-7 chip → combobox → ✓Save → 15s JSON).
2. Prepare Fire Bolt; EB-join a high-HP monster; set Target.
3. Fire Bolt row → SpellDetailPopup shows 'Change damage type to Psychic' — leave it UNticked → Cast Spell → hit → Done.
4. Damage popup + log read `[psychic]`; re-cast with the box ticked — identical result. Checkbox state has no observable effect.

## Likely Location

- `src/services/rules/spells/spellCastService/execution/index.js:138-141` — gate the swap on the cast-time opt-in (`spell._psychicSpellsOverride` / `metaCtx.usePsychicDamage`) rather than on the passive alone.
- `src/hooks/.../usePsychicDamage` → `spellPreparationService.js:682-684` already persists the flag onto the spell — the flag just needs to reach and gate the resolver at execution/index.js.

## Notes

- If the design intent is "always swap" (no opt-out), then the checkbox should be removed from SpellDetailPopup (`SpellDetailPopup.jsx:204-215`) rather than left decorative — either way the current mismatch is the defect.
- V/S component-reduction half is separately banner-only (documented in the CLA-268 playbook section, accepted); not re-filed here.

# Bug FT-070 — Shadow Touched: Invisibility free-cast inert (slot always consumed)

## RAW
feat text: "You always have that spell and the Invisibility spell prepared. You can cast **each of these spells** without expending a spell slot. Once you cast either spell in this way, you can't cast **that spell** in this way again until you finish a Long Rest."

## Evidence (UI probe 2026-09-04, HexWarlock, change-data + log)
- Feat JSON benefit "Shadow Magic" automation: `{"type":"free_spell","spell":["Invisibility"],"perSpellTracking":true,"recharge":"long_rest","casting_time":"1 action"}` — Invisibility is the declared free spell with per-spell tracking.
- Cast False Life #1: slots lv5 3→3 (free, correct), `_Shadow_Magic_freeCastCount` 1→0.
- Cast Invisibility (first time that LR, self-target): `ability_use` log "HexWarlock cast Invisibility on themself. Target gains the Invisible condition." BUT slots lv5 2→1 **consumed**, and NO `_Shadow_Magic_Invisibility_freeCast` / `_Shadow_Magic_Invisibility_used` counter ever written. Free-cast INERT for Invisibility.

## Root cause (grep)
- `src/services/rules/core/magicSpells.js:116 addShadowTouchedSpell` (and duplicate block `src/services/rules/rules.js:420`) build the runtime "Shadow Magic" free_spell specialAction with `spell: stSpell` (the CHOSEN spell only, uses:1). The feat JSON's `spell:["Invisibility"] + perSpellTracking:true` automation is never merged in.
- `src/services/character/featBuffService.js` `parse2024Benefit` `case 'spell'` pushes the benefit automation only as a display **feature** (`buffs.features`) — no path lands `spell:["Invisibility"]` into `automation.specialActions`.
- Consequently `spellPreparationService.js` free-cast scan (`spells.includes(spellName)` against specialActions) never matches Invisibility → normal slot consumption every cast.

## Secondary (latent, same feature)
- `src/services/rules/effects/restRules-longRest.js:401` resets key `_shadowTouchedSpell_freeCastCount` on long rest, but the writer/consumer key is `_Shadow_Magic_freeCastCount` (`spellCastHandler.js:128/:156`, `spellPreparationService.js:87`). LR recharge of the chosen-spell free cast is likely broken (not exercised live this session).

## Suggested fix
Make `addShadowTouchedSpell` produce perSpellTracking automation covering BOTH the chosen spell and Invisibility (or two entries), consuming/reading keys per spell, and align the LR reset key to whatever the consumer uses.

## Status
Found during FT-070 verification (overall PASS-subset). NOT fixed.

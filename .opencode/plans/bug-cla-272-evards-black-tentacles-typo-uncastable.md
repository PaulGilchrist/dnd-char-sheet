# Bug CLA-272 — Psionic Spells: "Evard's Black Tentacles" uncastable + wrong-tier blank row (spell DB name typo)

## Overview
CLA-272 (Aberrant Sorcery lv3 `psionic_spells_list`) grants the 11-spell psionic list correctly for 10/11 spells, but the tier-7 entry "Evard's Black Tentacles" is uncastable at every level and appears as a broken blank-level row on the sheet starting at lv3/lv6 (before its lv7 tier).

## Expected Behavior (canonical app data)
`public/data/2024/classes.json` Sorcerer → Aberrant Sorcery → "Psionic Spells" (lv3, `automation.type: psionic_spells_list`):
"Level 3: Arms of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, Mind Sliver. Level 5: Hunger of Hadar, Sending. Level 7: Evard's Black Tentacles, Summon Aberration. Level 9: Rary's Telepathic Bond, Telekinesis."
Each spell should appear, at its tier, as a castable subclass spell (CHA).

## Actual Behavior (live-probed 2026-09-02, AberrantSorcerer lv6)
Sheet spellAbilities (fiber probe): Mind Sliver[0], Arms of Hadar[1], Dissonant Whispers[1], Calm Emotions[2], Detect Thoughts[2], Hunger of Hadar[3], Sending[3] all present/Always + castable (Mind Sliver + Detect Thoughts cast E2E with logs; lv2 slot 3→2).
"Evards Black Tentacles" row renders with **Level: (blank), Time/Range/Duration dashes, "No spell slots available for this level"**, present at lv6 (its tier is lv7). "Cast Spell" click = silent no-op: zero log entries, no slot spend.
Summon Aberration / Rary's Telepathic Bond / Telekinesis correctly absent at lv6.
Control DraconicSorcerer lv6: zero psionic spells (grant is subclass-specific).

## Root cause
Spell DB name mismatch: `public/data/2024/spells.json` contains **"Evar's Black Tentacles" (level 4 — typo, missing d)**; `public/data/spells.json` has **"Black Tentacles" (level 4)**. The feature/registry name "Evard's Black Tentacles" never resolves in the 2024 DB:
- `spellCalc2024.js` `psionic_spells_list` branch (~line 298) pushes ALL 11 names unconditionally, prepared 'Always', with NO per-tier gate and no level field.
- The downstream "no spell slots at this level" filter (`spellCalc2024.js:542`) drops the lv4+ tier spells by their DB level — but Evard's resolves to **undefined level**, so it passes the filter and renders as a blank-level, uncastable row at every level from lv3 up.
- Tier gating at lv7+ for this spell also fails via `major.spells` (level 7 unlock at lv7 still name-matches nothing castable).

## Steps to Reproduce
1. Open test-campaign → AberrantSorcerer (lv6 Aberrant Mind, 2024) sheet → Spells section.
2. Observe row "Evards Black Tentacles" with blank Level/Time/Range; detail popup: "Level: (blank) / Slots Remaining: 0 / No spell slots available for this level".
3. Click "Cast Spell" → popup closes, campaign log gains zero entries, no slot spend.
4. Grep: `grep -o '"name": "[^"]*Tentacles[^"]*"' public/data/2024/spells.json` → `"Evar's Black Tentacles"`; classes.json psionic list uses `"Evard's Black Tentacles"`.

## Likely Location
- `public/data/2024/spells.json` entry `"Evar's Black Tentacles"` (fix: rename to `Evard's Black Tentacles` with correct level, or alias).
- Secondary: `src/services/rules/core/spellCalc2024.js` `psionic_spells_list` branch — no name-resolution guard and no per-tier character-level gate (relies on the slot-level filter which undefined-level spells slip through). `major.spells[].level` (3/5/7/9 unlock tiers) exists in classes.json and is the correct tier gate source.

## Notes
- The other 10 spells are exact: lv3+lv5 tiers granted, castable with CHA (Detect Thoughts lv2 slot 3→2 logged; Mind Sliver INT save vs Thug resolved), lv7/9 tiers correctly absent at lv6 (Summon Aberration[4], Rary's[5], Telekinesis[5] trimmed by slot filter).
- lv7/lv9 tier grants not live-tested (char lv6); even at lv7 Evard's would stay uncastable due to the name typo — that is the filed bug, independent of tier coverage.
- Playbook pitfall candidate: any psionic/spell-grant list naming a spell absent from the active spells DB produces an undefined-level blank row that passes the slot filter at ALL levels.

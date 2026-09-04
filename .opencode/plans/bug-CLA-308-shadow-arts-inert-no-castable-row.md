# bug-CLA-308-shadow-arts-inert-no-castable-row.md

**VERDICT: FAIL** — 2026-09-04, live E2E (Playwright, localhost:5173, test-campaign, Disciplined_Monk lv17 2024).

## Automation
CLA-308 "Shadow Arts" — 2024 Monk Warrior of Shadow major lv3 feature
(`public/data/2024/classes.json` `Monk.majors[1].features[0]` — NOT lv6; lv6 is Shadow Step).
RAW/data text: "You can cast the Darkness, Darkvision, Pass Without Trace, and Silence spells
without expending spell slots or preparing them, using Wisdom as your spellcasting ability.
Each of these spells can be cast in this way once per Long Rest."
(2024 = NO ki cost, once per LR each. 5e Way of Shadow variant in `public/data/classes.json`
costs 2 ki/cast — neither model implemented.)

## Ground-truth data shape
- Feature `automation: null`, no `casting_time`, no spell list on the feature.
- Spell list lives only on `majors[1].spells` = 4 × `{name, level:2}`.
- Monk `spell_casting_ability: "Wisdom"` (correct — DC 18 = 8+WIS4+PB6 when it matters).

## Source map (zero consumers)
- `rg -in "shadow.?arts" src/` → ZERO hits. No handler, no router entry, no info-builder entry,
  no special-actions row supplier, no free-cast authorization branch.
- Manifest claims handler `src/services/combat/automation/handlers/classFeatureHandler.js` +
  router/info-builder paths — **all three files do not exist** (stale manifest, CLA-277 pattern).
- `useCharActionsAutomation.js:24` `MONK_KI_FEATURES` excludes Shadow Arts (moot — no row dispatches).
- `spellPreparationService.js` `isFreeCastAuthorized()` (spellPreparationService.js:8-105):
  every free-cast precedent is a keyed branch (Natural Recovery, Bewitching Magic, `_ritualOnly`,
  Spell Mastery, Signature Spells, Divination Savant, Mystic Arcanum, Phantasmal Creatures,
  `free_spell` automation actions…). **No Warrior-of-Shadow/Shadow Arts branch.**
- `spellCalc2024.js` `getSpellAbilities()`: subclass-major spells are stamped prepared
  (:149-183) **only inside `if (spellAbilities)`** — Monk has no class/major `spellcasting`, so
  `spellAbilities` stays null unless `playerStats.spells.length>0`. If spells ever WERE persisted,
  the non-caster fallback (:67-114) would hand the Monk a **half-caster slot table**
  (lv17 = 4×L1/3×L2/3×L3) — the wrong model for "without expending spell slots" + once-per-LR.
- `pass_without_trace_bonus` te + `passWithoutTraceHandler.js` exist (other-feature consumers)
  but nothing triggers them for Shadow Arts.

## Live evidence
1. **Subclass edit works**: wizard step 7 combobox → "Warrior of Shadow" → (pitfall: Magic Initiate
   `.mi-overlay` re-opened because `magicInitiateInstances:[]` — dismissed via `.mi-skip`) → ✓ Save.
   Disk after 15s: `class.subclass.name = "Warrior of Shadow"`. Sheet now shows live rows
   `Shadow Step:` and `Cloak of Shadows:` in `b.clickable` — subclass switch fully propagated.
2. **Shadow Arts row INERT**: renders as plain `<b>Shadow Arts:</b>` + RAW text in Features section.
   NOT in `b.clickable` set (live set after edit: Cloak of Shadows, Stunning Strike, Heightened
   Flurry/Patient Defense/Step of the Wind, Shadow Step, Deflect Energy, Slow Fall, Opportunity
   Attack, Uncanny Metabolism). `el.click()` → no popup, no overlay, no network, no log, FP unchanged.
3. **Spells never reach disk**: wizard step 14 shows all 4 spells "Darkness/Darkvision/Pass Without
   Trace/Silence (Auto-assigned) ✓" (getPreSelectedSpells → majors.spells works) but saved JSON is
   `spells: []` — auto-assigned subclass spells are display-only in the wizard, never persisted
   for a non-spellcaster. Consequence: no Spells table on sheet (`hasSpellsSection:false`), so
   **cast flow for all 4 spells is unreachable** (test plan steps 2-3 impossible; ki-gate step 4 moot).
4. **No resource accounting**: change-data Disciplined_Monk after edit has `focusPoints:17,
   kiPoints:17` unchanged; no `_Shadow_Arts_*` / per-spell once-per-LR keys anywhere;
   `spell_slots_level_1..9` keys exist but `0` (global trackedResources.js:49-57 seed for every
   character — not evidence of slots). Campaign log: 0 entries, 0 shadow-related.
5. **Control**: HexWarlock sheet has no Shadow Arts row / no shadow clickables (as expected).

## Screenshot
`./cla308-shadow-arts-row-inert.png` (viewport; Shadow Arts text mid-sheet — inert).

## Required fix shape (for implementer)
1. Give the feature automation metadata (e.g. `type:"free_spell"` style per CLA-234/252 precedent,
   `spells:[...]`, `uses:1 perLongRest per spell`, `saveAbility:"WIS"`), or
2. Stamp `major.spells` entries into computed spells as free-cast + per-spell `_Shadow_Arts_<Spell>_used`
   counters in `spellCalc2024`/`isFreeCastAuthorized` (per-spell-per-LR, reset in restRules-longRest.js),
   with a clickable cast affordance (Spells table requires persisted spell entries — fix wizard auto-assign
   persistence too), and log each cast to the campaign log (repo rule).
3. DC must come from Monk Focus/WIS save DC 18 — never fallback DC 10 (CLA-277 family).
4. Vitest co-located suites for the new gates.

## Cleanup state
Admin Clear Change Data + Clear Campaign Log done post-run. **LEFT: subclass Warrior of Shadow lv17
PERMANENT** on Disciplined_Monk (reusable for post-fix retest).

# CLA-173 Encounter-joined combatSummary IRV stub is permanently empty (wrong monsters.json keys + vulnerabilities never copied) — re-filed, original file deleted unfixed

## Overview

EB-joined combatSummary creature entries carry EMPTY resistances/immunities and NO vulnerabilities field, because `encounterToInitiative.js` copies from monsters.json keys that mostly don't exist. This was the root cause of the original CLA-173 (Hunter's Lore never surfaces) — bug file `bug-cla-173-hunters-lore.md` had **Status: FAIL** and was deleted in commit c643e732 ("Hunter's Prey: Horde Breaker second attack never offered"), which touched NO IRV code. The defect is confirmed still present in current source, and it also silently disables every combatSummary-IRV consumer plus the MonsterCardModal/monster-statblock IRV display for the 466/605 legacy-key monsters.

## Canonical / Expected

`public/data/monsters.json` is the only IRV ground truth. The 2014-schema majority (incl. Shadow, Skeleton) store `resistances` / `immunities` / `vulnerabilities`; only ~118/605 (2024 batch) use `damage_resistances` / `damage_immunities` / `damage_vulnerabilities`. Joined-combat creatures and the statblock viewer must resolve BOTH schemas (the CLA-207 `resolveMonsterIRV` non-empty-preference pattern in `knowEnemyHandler.js` is the proven in-repo precedent). Shadow expected: Vulnerabilities Radiant; Resistances Acid/Cold/Fire/Lightning/Thunder; Immunities Necrotic/Poison + conditions.

## Actual (code-inspection evidence, current tree)

- `src/services/encounters/encounterToInitiative.js:185-186`: `resistances: monster.damage_resistances || []` / `immunities: monster.damage_immunities || []` — no `|| monster.resistances/immunities` fallback, and `vulnerabilities` is NEVER copied. Legacy-schema monsters → `{resistances: [], immunities: []}` stubs in combatSummary.
- `src/components/encounter/MonsterCardBody.jsx:286-301`: statblock viewer renders only `monster.damage_vulnerabilities / damage_resistances / damage_immunities` → Shadow/Skeleton cards show no IRV (playbook CLA-207 note line 529: "STILL only reads damage_* keys … not fixed here").
- Confirmed live downstream: FT-063 recipe (2026-09-01, post-deletion) still documents "resistances-schema monsters (e.g. Shadow) arrive with empty stub IRV so no halving control possible".

## Steps to Reproduce

1. EB-join Shadow → Initiative → fetch `/api/campaigns/test-campaign/change-data` → `combatSummary.creatures.find(c=>c.name==='Shadow 1')` → `resistances: []`, `immunities: []`, `vulnerabilities: undefined` despite monsters.json Shadow having 5/11/1 entries.
2. Open Shadow's `.mc-overlay` statblock → no Resistances/Immunities/Vulnerabilities lines render.

## Likely Location

- `src/services/encounters/encounterToInitiative.js:185-186` — add legacy fallbacks (`monster.damage_resistances || monster.resistances || []`, same for immunities) and copy `vulnerabilities: monster.damage_vulnerabilities || monster.vulnerabilities || []`.
- `MonsterCardBody.jsx:286-301` — same dual-schema fallback for the viewer.
- Secondary (from original file): `contextBuilder-sync.js` Hunter's Lore gate checks `hasHunterLore && target` but not Hunter's Mark concentration on that target — once IRV flows the notice would leak vs unmarked targets.

## Notes

- Consumers currently reading combatSummary IRV (Hunter's Lore notice, any damage-path fallback) see nothing for legacy monsters until this lands; CLA-237/FT-063 tests already work around it — those workarounds can be retired after the fix.
- Not present in automations-manifest (manifest has no CLA-173 row); the verify run should re-add one.

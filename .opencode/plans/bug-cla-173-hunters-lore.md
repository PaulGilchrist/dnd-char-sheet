# Bug — CLA-173 Hunter's Lore (2024 Ranger lv3 passive): IRV notice NEVER surfaces (marked or unmarked)

**Status: FAIL** — verified 2026-08-29 via Playwright on live app (http://localhost:5173, campaign "test-campaign", 2024 ruleset). No campaign-file edits, no curl; all state read in-browser.

## Rule (public/data/2024/classes.json, Ranger `majors[3].features[0]`)
> Hunter's Lore — "While a creature is marked by Hunter's Mark, know whether it has Immunities, Resistances, or Vulnerabilities."
> automation: `{ "type": "passive_rule", "effect": "hunter_lore" }` — **level 3** (data says 3, not 6).

## Implementation location
`src/services/automation/contextBuilder-sync.js:35-53` builds `hunterLoreNotice` ("Vulnerabilities: …\nResistances: …\nImmunities: …") from `target.vulnerabilities/resistances/immunities`; `src/hooks/combat/useLoggedDiceRollAttack.js:178,234` forwards it; rendered in attack popup `src/components/char-sheet/DiceRollResult.jsx:320-329` (`.dice-roll-hunter-lore`) and campaign log `src/components/log/LogRollEntry.jsx:177-180` (`.log-hunter-lore-notice`).

## Repro (done)
1. Created **HunterRanger** lv6 2024 Ranger (Hunter subclass), Hunter's Mark ticked at Spells step (`.list-item-checkbox-trigger`), Shortsword+Shortbow equipped at Inventory→Equipped. JSON ground truth: `public/campaigns/test-campaign/HunterRanger.json` → `level:6, rules:"2024", class.name:"Ranger", spells:["Hunter's Mark"], inventory.equipped:["Shortsword","Shortbow"]`. Sheet shows "Hunter's Lore:" feature text.
2. Encounter Builder → selected Shadow + Skeleton → Join Encounter. Tracker: Shadow 1 (HP 27/27, AC 12), Skeleton 1 (HP 13/13).
3. HunterRanger initiative card Target dropdown = Shadow 1 (verified select.value).
4. Sheet → Hunter's Mark spell row → Cast Spell (free cast, "Free Cast — no spell slot consumed"). **Mark works:** sheet badge "Hunter's Mark Active" + "Hunter's Mark DC 10"; change-data `combatSummary.creatures[HunterRanger].concentration = {spell:"Hunter's Mark", dc:10, target:"Shadow 1"}`. Log: "HunterRanger · Cast Hunter's Mark → Shadow 1".
5. Clicked Shortsword attack row vs marked Shadow 1 → popup "✗ MISS (4 vs AC 12)" (2+2 vs AC 12). Log entry "HunterRanger · Shortsword → Shadow 1" written.
6. **BUG:** No Hunter's Lore knowledge anywhere:
   - `document.querySelector('.dice-roll-hunter-lore')` → **false** while popup open (popup text: "Shortsword / 4 / d20 2 +2 / ✗ MISS (4 vs AC 12)" — no IRV lines).
   - Campaign log entry has no `.log-hunter-lore-notice` element.
   - Expected per monsters.json Shadow: `Vulnerabilities: Radiant` / `Resistances: Acid, Cold, Fire, Lightning, Thunder` / `Immunities: Necrotic, Poison, Exhaustion, Frightened… (11 entries)`.

## Root cause (code + live data proof)
`src/services/encounters/encounterToInitiative.js:184-185` populates combatSummary creature IRV with **wrong keys and no vulnerabilities**:
```js
resistances: monster.damage_resistances || [],
immunities: monster.damage_immunities || [],
// vulnerabilities: NEVER copied
```
This dataset (`public/data/monsters.json`) uses keys `resistances` / `immunities` / `vulnerabilities` — `damage_resistances` / `damage_immunities` do **not** exist (verified: Shadow JSON has `resistances:5, immunities:11, vulnerabilities:1`, no `damage_*` keys). Live probe of `/api/campaigns/test-campaign/change-data` confirmed joined Shadow 1: `{resistances: [], immunities: [], vulnerabilities: undefined}`; Skeleton 1 likewise empty.

Therefore `contextBuilder-sync.js:41-50` always finds zero IRV parts → `hunterLoreNotice = null` for every encounter-joined monster → CLA-173 can never surface, mark or no mark.

The passive gate itself is fine: `automationRouter.js:195,207-208` default-pushes `passive_rule` infos (incl. `hunter_lore`) into `result.passives`, consumed at `contextBuilder-sync.js:37-39`.

Other handlers do it correctly (`monster.damage_immunities || monster.immunities || []`, e.g. animateDeadHandler.js:50) — encounterToInitiative lacks the fallback and the vulnerabilities field.

## Secondary deviation (latent, currently masked by primary bug)
`contextBuilder-sync.js:39` gates on `hasHunterLore && target` only — **not** on the attacker actually holding Hunter's Mark concentration on that target (contrast `precise_hunter` at lines 481-493 which checks `concentration.spell === "Hunter's Mark" && concentration.target === targetName`). Once IRV data flows, the notice would leak against UNMARKED targets too, violating "while a creature is marked by Hunter's Mark".

## Suggested fix
1. `encounterToInitiative.js:184-186`:
   ```js
   resistances: monster.resistances || monster.damage_resistances || [],
   immunities: monster.immunities || monster.damage_immunities || [],
   vulnerabilities: monster.vulnerabilities || monster.damage_vulnerabilities || [],
   ```
2. `contextBuilder-sync.js:39`: gate additionally on combatSummary HunterRanger `concentration?.spell === "Hunter's Mark" && concentration?.target === targetName` (same pattern as precise_hunter lines 486-489).
3. Re-verify with Shadow (richest IRV): expect popup `.dice-roll-hunter-lore` + log `.log-hunter-lore-notice` listing exactly the monsters.json lists; unmarked Skeleton must reveal nothing.

## Environment notes
Test leftovers cleaned same session (monsters removed, HunterRanger long-rested, Admin Clear Change Data + Clear Campaign Log). HunterRanger retained for future Ranger rows.

# BUG CLA-128 — Expert Divination never triggers: no info-builder/route entry populates the `expert_divination` passive

## Overview

CLA-128 (Expert Divination, Divination Wizard lv6 class feature) never fires. The
handler (`src/services/automation/handlers/class-wizard/expertDivinationHandler.js`)
and its dispatch entry (`src/services/automation/index.js:485
expert_divination: handleExpertDivination`) exist and are correctly written, but the
only trigger path is gated on `playerStats.automation.passives` containing
`{ name: 'Expert Divination', type: 'expert_divination' }` — and NO supplier ever puts
that entry there. `expert_divination` has no key in the automation info-builder
DISPATCH (`buildAttackInfo` returns `null`), no case in `automationRouter.js`
(falls to `default` → specialActions, which is never reached), and
`collectAutomationFromFeatures` does `if (!info) continue` — so the passive is never
collected, the gate always fails, and `triggerExpertDivination` returns before
`executeHandler`. Live-proven: zero slot regain, zero log lines.

Manifest paths are STALE again: there is no
`src/services/combat/automation/handlers/classFeatureHandler.js`,
`.../routers/classFeatureRouter.js`, or `.../infoBuilders/classFeatureInfoBuilder.js`
(`ls` confirmed "No such file or directory").

## Expected Behavior (canonical app-data wording)

`public/data/2024/classes.json` line ~13393, Wizard → **Diviner** major →
"Expert Divination", level 6, `automation: { type: "expert_divination",
casting_time: "passive" }`:

> "When you cast a Divination spell using a level 2+ spell slot, you regain one
> expended spell slot. The slot must be lower than the slot you expended and can't be
> higher than level 5."

## Actual Behavior

Casting a prepared Divination spell with a level 2+ slot expends the slot but regains
nothing and logs nothing.

Live evidence (test-campaign, DivinationWizard lv20 2024, subclass edited
Abjurer→**Diviner** this session, change-data runtime slots):

| Key | Baseline | After Mage Armor (Abj 1) | After Augury (Div 2) |
|---|---|---|---|
| spell_slots_level_1 | 4 | **3** (consumed) | **3 — NEVER regained** |
| spell_slots_level_2 | 3 | 3 | **2** (consumed, no regain anywhere) |
| spell_slots_level_3+ | unchanged | unchanged | unchanged |

- Campaign log after the Augury lv2 Divination cast: `total: 5, expertCount: 0` —
  spell + Mage Armor + Protection from Energy ability_use entries present, **zero
  "Expert Divination" entries** (handler's `ability_use` log never written).
- In-page probe with the app's OWN modules (decisive supply-side proof):
  `buildAttackInfo({name:'Expert Divination', automation:{type:'expert_divination',
  casting_time:'passive'}}, stats)` → **null**;
  `collectAutomationFromFeatures([feature], stats).passives` → **[]**.
- Control probe: non-Divination casts (Mage Armor lv1 Abjuration consumed lv1 4→3;
  Protection from Energy lv3 Abjuration) produced no regain — identical behavior to the
  Divination cast, proving the school/level gates in the handler never even get a
  chance to differentiate (dead before them).

## Steps to Reproduce

1. test-campaign → Edit DivinationWizard → step 7 Subclass = Diviner → ✓Save (wait 15s).
2. Open sheet. Cast Mage Armor (lv1, self) → change-data `spell_slots_level_1` 4→3
   (creates a lower expended slot).
3. Cast Augury (lv2 Divination, self) → `spell_slots_level_2` 3→2,
   `spell_slots_level_1` stays 3 (expected 3→4 + "used Expert Divination: regained
   1 spell slot of level 1" log). No popup, no regain, no log.

## Likely Location

- `src/services/combat/automation/automationCollector.js` — `buildAttackInfo`
  (`automationInfoBuilder.js:46-50`, DISPATCH) has NO `expert_divination` key →
  returns null → collector `continue` → passive never collected.
- `src/services/combat/automation/automationRouter.js` — no `case 'expert_divination'`
  (would need `result.passives.push(info)` with `info.type === 'expert_divination'`).
- Consumer gate: `src/services/rules/spells/spellCastService/execution/helpers.js:312`
  (`passives.some(p => p.name === 'Expert Divination' && p.type === 'expert_divination')`)
  → unreachable. Handler itself (`expertDivinationHandler.js:21`
  `Math.min(5, spellSlotLevel - 1)`, :33-44 highest-expended-lowest-scan, :62 log)
  looks rule-exact but can never be invoked.

## Notes

- The `Expert Divination:` sheet row renders as inert text (no pointer), consistent
  with the missing categorization.
- `unit tests` (`helpers-expertDivination.test.js`, `expertDivinationHandler.test.js`)
  pass only because they MOCK `passives` pre-populated — masking the missing supplier.
- The ≤5-cap and <expended gates live in the unreachable handler (`:21`); a
  higher-level probe was pointless since nothing triggers at lv2 either.
- Separately observed (not this bug): Protection from Energy lv3 cast consumed NO slot
  (bug-sp-093 two-stage-confirm path), Mage Armor lv1 consumed correctly — slot-write
  pipeline itself works.

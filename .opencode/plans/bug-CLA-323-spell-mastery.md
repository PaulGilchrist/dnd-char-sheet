# BUG CLA-323 — Spell Mastery: higher-level casts consume NO spell slot (free-upcast leak, CLA-312 shared seam live-proven for this feature)

**Verdict: FAIL** — "To cast either spell at a higher level, you must expend a spell slot." is unenforced for both mastery spells (live 2026-09-06, DivinationWizard lv20 2024, test-campaign).

## Setup (all via app UI)
- Sheet Special Actions row `Spell Mastery:` (automationRouter.js:598 → specialActions; handler `spellMasteryHandler.js` handle()) → `SpellMasteryModal` (`[data-testid="spell-mastery-modal"]`, two native selects) → chose lv1 **Thunderwave** + lv2 **Shatter** → "Confirm Selection" → popup "Spell Mastery: You can now cast Thunderwave (level 1) and Shatter (level 2) at will…" → change-data stamps `DivinationWizard.SpellMastery_level1="Thunderwave"`, `_level2="Shatter"` (runtime-only; disk spells[] 35 spells untouched, neither spell in it).
- Reload: both appear as clickable DC 17 rows in `.attacks` grid (spellCalc2024.js:362-366 injects `prepared:'Always'` only when name absent — auto-prepare works, "even if deselected elsewhere" trivially satisfied since neither is on disk).

## Slot ledger (change-data `DivinationWizard.spell_slots_level_N`)
| # | Cast | Popup evidence | Log evidence | lv1 lv2 lv3 lv4 lv5 |
|---|------|----------------|--------------|---------------------|
| 0 | baseline | — | — | 4 3 3 3 3 |
| 1 | Thunderwave lv1 free | "Free Cast — no spell slot consumed", radio=1 | spell lv1 + ability_use "Selecting 1 target(s) for save (DC 17)" + roll 2d8=11 + hp_change −11 (Thug 32→21) | 4 3 3 3 3 |
| 2 | Thunderwave lv1 free #2 | "Free Cast" again, no stamp ever | 2nd spell lv1 + roll 2d8=11 + hp −11 (21→10) | 4 3 3 3 3 |
| 3 | **Thunderwave UPCAST lv2** | radio=Level 2 selected yet popup STILL "Free Cast — no spell slot consumed", Cast enabled | spell **lv:2**, roll 3d8=9, save 19 half → 4 dmg (10→6) | 4 **3** 3 3 3 — NO lv2 spent **BUG** |
| 4 | Shatter lv2 free | "Free Cast", radio=2 | spell lv2, 3d8=14 fail → Thug 6→0 | 4 3 3 3 3 |
| 5 | **Shatter UPCAST lv3** | radio=Level 3, popup STILL "Free Cast" | picker "4d8", spell **lv:3**, 27 dmg fail-save (revived Thug 30→3) | 4 3 **3** 3 3 — NO lv3 spent **BUG** |

## Root cause (grep + live)
CLA-312 shared seam confirmed for Spell Mastery:
- `SpellDetailPopup.jsx:18` — `freeCastAuthorized` computed once off **base** `spell.level` (`isFreeCastAuthorized` :22-25 matches `spellName===masteryLevel1 && spellLevel===1` / `…level2===…2` — base-level match stays true regardless of selected upcast).
- `SpellDetailPopup.jsx:123-134` — `isUpcast`/`upcastLevel` set from radio, but forwards the stale `freeCastAuthorized:true`; free-cast hint (:314) keeps rendering with an upcast selected.
- Downstream callers (`useSpellMetamagicGates.js:52/149`, `useTwoStageHandlers.js:121`, `useMetamagicHandler.js:58/95`, etc.) recompute with `pending.spellLevel` = BASE level — still authorized.
- `spellPreparationService.js:661` — the paying branch `isUpcast && !isFreeCast && …` short-circuits (`isFreeCast` true at :626), falls to :682 free branch; `decrementFreeCastResource` has NO Spell Mastery entry (correct — lowest-level at-will is unlimited and casts #1-#2 prove it), but for upcast the correct behavior is to fall through to slot payment.
- Fix per CLA-312 pitfall: gate authorization on `upcastLevel ?? spell.level` (popup :18 cannot know radio state — recompute in `handleCast`/before payment).

## What IS exact (row's own claims)
- Auto-prepare: both injected castable with correct DC 17 / damage dice at base level. PASS.
- Free at lowest level, unlimited (NOT once-per-rest — correctly different from Signature Spells: no `_used` stamp, no counter, lv slot untouched per cast). PASS ×2 lv1 + lv2 base.
- Chooser validation: Confirm disabled until both selects set and different (modal :58-63).

## Canonical divergences (report only, not the FAIL driver)
- App grants Spell Mastery at **lv18** (`2024/classes.json` Wizard class_levels[17], same in 5e classes.json); canonical 2024 PHB = **lv6**. lv20 holder qualifies either way — unobservable gate divergence.
- Row says "spellbook" but handler `spellMasteryHandler.js` filters the ENTIRE wizard spell DB (`loadSpells`) by wizard+lv1-2+action casting time — spellbook-membership gate absent; any wizard lv1/2 action spell is selectable and then castable (injection adds it regardless of disk spells[]).
- 5e row carries the "8 hours of study to exchange spells" clause with no mechanism; app allows free re-selection anytime (chooser re-open). 2024 row omits exchange — consistent there.
- Manifest paths fictitious per instruction (real: handlers/class-wizard/spellMasteryHandler.js + automationRouter.js:598 + automationInfoBuilder/spell.js:185 + CharSpecialActions.jsx:422/603 + spellCalc2024.js:358-367 + SpellDetailPopup.jsx + spellPreparationService.js).

## Cleanup
EB Thug 1 joined/revived at 30, used as victim. Admin → Clear Change Data + Clear Campaign Log at end; mastery selection runtime-only → erased by clear; re-arm recipe in playbook. Disk never edited.

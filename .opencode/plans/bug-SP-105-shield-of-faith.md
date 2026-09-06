# BUG SP-105 — Shield of Faith: attack popup omits +2 AC and converts engine-MISS to applied damage

**Verdict: FAIL** (2026-09-05, live E2E, http://localhost:5173, campaign test-campaign)

## Spell / canonical
2024 `public/data/2024/spells.json` shield-of-faith: lvl 1, casting_time "Bonus Action", range 60 ft, concentration up to 10 min, **+2 bonus to AC** to chosen creature. Cleric/Paladin list.

## What WORKS (verified live, Divine_Cleric lv17 Cleric)
- Prepared via Edit wizard (mi-overlay `.mi-skip` → Spells step `.list-item-checkbox-trigger` → ✓ Save; disk `spells[]` gained "Shield of Faith", prepared 13/20).
- Cast flow: Spells row → SpellDetailPopup ("Casting Time: **Bonus Action**", "Slots Remaining: 4") → `.sp-overlay` SecondaryTargetModal → tick `.secondary-target-row` Divine_Cleric → "Cast" → info popup "Divine_Cleric gained +2 AC from Shield of Faith."
- Slot consumed EXACTLY: change-data `Divine_Cleric.spell_slots_level_1` 4→3 (l2 untouched 3).
- Concentration record: combatSummary `creatures[Divine_Cleric].concentration = {spell:'Shield of Faith', dc:10}` (dc 10 = canonical concentration-CON DC; producer `spellPreparationService.js:728-736`).
- Sheet AC cell EXACTLY +2: "Armor Class: 12" → "Armor Class: **14 (+2 from Shield of Faith)**" (`charSummaryCalc.js:288-290` + `CharSummary.jsx:275`; initiative card same via `initiative.jsx:111-114`).
- `activeBuffs` runtime `{name:'Shield of Faith', effect:'shield_of_faith', acBonus:2, sourceCharacter:'Divine_Cleric'}` + expiration `{remove_active_buff}` registered (`shieldOfFaithHandler.js:49-66`).
- Hit-resolution MATH honors the +2: campaign log `roll attack` entries — d20 9(+3=12)→`hit:false`, d20 10(+3=13)→`hit:false` (12/13 ≥ base 12 would hit; only ≥14 hits ⇒ `hitResolution.js:31-32` effectiveAc WITH `_shieldOfFaithAcBonus` set by `useLoggedDiceRollAttack.js:111` is the resolver truth).
- Concentration drop (initiative card badge ×→ `handleBreakConcentration`): concentration null, `activeBuffs:[]`, pendingExpirations flushed, sheet AC back to **12**.

## BUG — popup shows base AC and flips MISS→HIT, and Done APPLIES damage on a miss
Zombie 1 (EB, Join Encounter, target-select=Divine_Cleric) attacks the buffed cleric:
- Popup renders **"✓ HIT (12 vs AC 12)"** for d20 9 +3 — the engine logged **`hit:false`** for the same roll (12 < 14). The popup never shows AC 14 / the +2 anywhere.
- **Controlled single-popup test**: popups flushed, HP=113 verified, rolled boundary d20 9 → exactly ONE popup open: "✓ HIT (12 vs AC 12)" → clicked its own **Done** (`dice-roll-reroll-btn`) → log `damage total:8 rolls:[7]` + **`hp_change delta:-8 cur:105`**. A MISS dealt 8 damage.
- Earlier same defect: popup "✓ HIT (13 vs AC 12)" (log `total:10 hit:false`) → Done → damage 1d8+1=9, hp 122→113. (Single-die rolls prove non-crit origin.)

### Root seams
1. `src/hooks/combat/useLoggedDiceRollAttack.js:182` (log) and `:241` (popup payload) send the **base** `targetAc`; `ctx._shieldOfFaithAcBonus` (line 111) is forwarded nowhere — unlike `coverAcBonus`/`defensiveDuelistBonus`/`baitAndSwitchBonus` which are payload fields.
2. `src/components/char-sheet/DiceRollResult.computed.js:81-82` recomputes `effectiveAc = targetAc + coverAcBonus + defensiveDuelistBonus + baitAndSwitchBonus` — omits SoF — and `computedHit = finalTotal >= effectiveAc` **overrides the payload's authoritative `hit`**.
3. `src/components/common/AttackResultPopup.jsx:18` `actualHit = computedHit !== undefined ? computedHit : popupHtml?.hit` → Done passes the flipped HIT into the auto-damage pipeline → damage applies to resolved misses (`useLoggedDiceRoll.js:38` only suppresses damage when `hit === false` reaches it — it never does, computedHit wins).

### Expected
Popup payload/popup must show effective AC including `shield_of_faith` (+2) — e.g. "vs AC 14 (+2 Shield of Faith)" or forward `_shieldOfFaithAcBonus` into the popup effectiveAc/`computedHit` chain — and Done on a resolved MISS must roll/apply zero damage.

## Cleanup state
Admin → Clear Change Data + Clear Campaign Log after test. Caster prep list left with Shield of Faith PREPARED (disk `spells[]` includes it, 13/20) — recorded final state. Zombie joined only into cleared change-data. Dev server killed.

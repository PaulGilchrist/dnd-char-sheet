# FT-061 Piercer (feat) — Puncture reroll offered but new die value NEVER applied + once-per-turn gate never armed

## Overview
FT-061 Piercer (2024 General Feat, `public/data/2024/feats.json` index `piercer`, benefit "Puncture" `automation.type:'piercer_puncture'`) reaches the UI correctly: on a Piercing weapon HIT the damage popup shows the "Piercer - Puncture" reroll button, and clicking it updates the popup's dice display (old → new). BUT the server-side commit handler `handlePuncture` crashes with a TDZ `ReferenceError` before it can apply the damage delta, persist the once-per-turn flag, or write the ability_use log. The reroll is therefore pure cosmetics: target HP is unchanged, `piercerPunctureUsedThisTurn` is never written, and the button is re-offered on every subsequent piercing hit (same turn AND later turns).

## Expected
When you hit with a Piercing attack, clicking Piercer - Puncture rerolls ONE damage die, the NEW value is used in the total (HP delta applied = new−old), `piercerPunctureUsedThisTurn` is consumed (once per turn, cleared at own next turn start), and an `ability_use` log is written. A second same-turn hit must NOT offer the reroll.

## Actual
- Attack 1 (FeyRanger lv15, Longbow 1d8 Piercing + Hunter's Mark 1d6): d20 18+4=22 vs AC 8 HIT; damage popup "1d8-1 [piercing] + 1d6 [psychic] + 1d6 [force]: 5, 5, 1 -1 → 10 applied — HP: 15 → 5"; "Piercer - Puncture" button present (offer half works).
- Click reroll → popup shows "Piercer - Puncture: 5, 5, 1 → 5, 5, 5" (lowest die 1→5, expected diff +4 → Zombie should go 5→1).
- Console: `ReferenceError: Cannot access 'targetName' before initialization at handlePuncture (CharSheet.handlers.js:160)` (reproduced 2/2 clicks).
- Ground truth ≥11 s later: change-data `Zombie 1.currentHp` stayed **5** (no +4 delta), `FeyRanger.piercerPunctureUsedThisTurn` ABSENT, zero Piercer log entries.
- Attack 2 same turn (d20 14+4 HIT, "8, 2 → 9 dmg, HP 9 → 0"): "Piercer - Puncture" button offered AGAIN (once-per-turn gate never armed because the flag write at CharSheet.handlers.js:178 is unreachable after the crash); clicking reproduced the identical ReferenceError; HP/keys/log unchanged again.

## Steps
1. test-campaign, FeyRanger lv15 (feats include Piercer, inventory.equipped ['Longbow'], Hunter's Mark prepared).
2. EB-join Zombie (AC 8) → Initiative → FeyRanger card Target = Zombie 1.
3. Cast Hunter's Mark on Zombie → Longbow "+4" dice link → HIT → Done.
4. Damage popup → click "Piercer - Puncture".
5. Observe popup dice update but console ReferenceError; change-data HP unchanged, no `piercerPunctureUsedThisTurn`, no log.
6. Second Longbow hit same turn → button re-offered (gate broken).

## Likely Location
`src/components/char-sheet/CharSheet.handlers.js:158-161` — temporal dead zone:
```js
const combatSummary = await getCombatContext(campaignName);
if (!combatSummary || !targetName) return null;   // :159/:160 uses targetName …
const { rawDamage, targetName, … } = punctureData; // … declared here (const → TDZ throw)
```
Fix: move the destructure of `punctureData` ABOVE the guard. `handleSavageAttacker` (:216/:219) already uses the correct order (destructure first, guard second) — mirror it.

Secondary defect (moot until the crash is fixed): reroll die size in `DiceRollResult.handlers.js:108` is `Math.floor(Math.random() * (rolls[0] > 0 ? rolls[0] : 6)) + 1` — die type taken from the FIRST die's VALUE, not the formula's die size (a d8 showing 5 rerolls on a d5; a lone die can never reroll upward). Should parse the formula (cf. `handleSavageAttacker` :138-143) or reroll the target die's own size.

## Notes
- Offer gating itself WORKS: `handlePlainDamage.js:383-389` (`piercerPuncture` popupData), router (`automationRouter.js:119` piercer_puncture→reactions), infoBuilder (`automationInfoBuilder/damage.js:240`), rules.js featEntry (`.automation.type` preserved via featBuffService.js:409 else-branch) — all verified live (button appears exactly on piercing hits).
- Unit tests mask the TDZ bug: `CharSheet.handlers4.test.jsx` etc. mock `getCombatContext`; any mock returning null early-returns at :159 before touching `targetName`, so no suite reaches the throw.
- Turn-start clearers (`turnStartEffects.js:203`, `navigationHandlers.js:55`, `Initiative.jsx:404`, `useInitiativeEffects.js:354`) exist for `piercerPunctureUsedThisTurn` but the writer (:178) is dead code — the flag lifecycle never starts.
- Cosmetic noise unrelated: second popup showed pre-hit HP "9" for a 5-HP zombie (combatSummary drift family); Hunter's Mark lv1 slot stayed 4 (separate accounting issue, out of scope).
- Noise: popup also carried a stray "+1d6 [psychic]" die on Longbow hits (Fey Wanderer noise family) — did not affect Piercer offer (offer keys off weapon damageType piercing).
- Setup left in place: FeyRanger feats ['Magic Initiate','Piercer'], equipped ['Longbow'], Hunter's Mark prepared, for post-fix retest.

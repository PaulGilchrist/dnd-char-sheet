# BUG CLA-265 — Primal Order (Druid 2024 lv1) — Magician check bonus hardcoded to minimum +1

## Overview
Primal Order role choice works end-to-end (wizard picker persists `class.primalOrder`; Magician cantrip cap and Warden proficiency grant are exact), but the **Magician Intelligence (Arcana/Nature) check bonus is always the minimum +1**, never the Wisdom modifier. On lv20 WIS 16/+3 Druid the pool skills show +0 instead of +2.

## Expected
- Magician: Arcana/Nature bonus = base + max(WIS mod, 1). Wild_Sage_Druid lv20: INT 9 → −1, WIS 16 → +3 → Arcana/Nature = **+2**; roll popup "+2", log `bonus:+2`.
- Cantrips Known: lv20 base 4 → **5** (verified exact).
- Warden: proficiency with Martial weapons + Medium armor.

## Actual
- Magician sheet: `Arcana (+0), Nature (+0)`; History/Investigation stay −1 (control correct). Roll popup shows no bonus line ("d20 20"); campaign log `{"rollType":"skill","name":"Nature","bonus":0,"total":20}` — applied bonus = −1 INT + 1 minimum, i.e. primalBonus resolved 0-based, not +3.
- Cantrips Known 4 → 5 exact. Warden line gains `Martial Weapons, Medium Armor` exact; reverting to Warden reverts Arcana/Nature to −1 and cantrips to 4 (toggle plumbing live).

## Steps
1. test-campaign → Wild_Sage_Druid (lv20 2024 Druid, INT 8+1, WIS 15+1). Baseline sheet: Arcana/Nature/History/Investigation all (−1); Cantrips Known: 4; Proficiencies line lacks Martial Weapons/Medium Armor.
2. Edit → step 6 Class → Primal Order = Magician → ✓Save → 15s → JSON `class.primalOrder:'Magician'`.
3. Reload sheet: Arcana/Nature (+0) [expect +2], siblings (−1), Cantrips Known: 5 [correct]. Click Nature → popup "d20 20" no bonus; log bonus:0.
4. In-page isolation probe (real module `/src/services/rules/core/abilityCalc2024.js`): getAbilities with raw abilities shape (as stored: baseScore/backgroundIncrease only) → Arcana/Nature +0; same shape + `bonus:3` on Wisdom entry → Arcana/Nature +2.
5. Switch Primal Order → Warden → Save: Proficiencies line gains 'Martial Weapons, Medium Armor'; Magician effects cleanly revert.

## Likely Location
`src/services/rules/core/abilityCalc2024.js:54-64` — `const wisAbility = playerStats.abilities.find(a => a.name === 'Wisdom'); const wisMod = wisAbility?.bonus || 0;` reads the **raw stored** abilities list; `bonus` is only computed later in the same function (`:23 newAbility.bonus`) and never written back to `playerStats.abilities` before this block (rules.js:479 passes the raw list into getAbilities). `wisAbility.bonus` is undefined → wisMod 0 → primalBonus = Math.max(1,0) = 1 permanently. Fix: use the computed Wisdom entry (find in the mapped results / recompute `Math.floor((totalScore-10)/2)`). Same stale-read pattern sits in the sibling Divine Order Thaumaturge block at :41-51 (CLA-204-adjacent, latent).

Manifest source paths (classFeatureHandler/Router/infoBuilder) stale — feature row is inert prose (`automation {type:'divine_order', casting_time:'passive'}`, no onclick); role state lives solely in `class.primalOrder` set by the wizard Class step (WizardStepClass.jsx:65-80).

## Notes
- Warden half: grant is structured (classRules2024.js:108-110 → CharSummary.jsx:356 'Proficiencies:' text) — text differential exact. NO numeric consumers: rules-armorClass.js applies equipped armor AC regardless of proficiency and attackCalc2024 buildWeaponAttack adds PB unconditionally, so Scale Mail/Longsword attack-table differentials are unobservable by design gap (CLA-181 family). Warden accepted as PASS-subset; overall FAIL driven by Magician bonus math.
- CLA-205 differential method + CLA-204 recomputation from JSON ability scores applied.

VERIFIED: FAIL

# BUG CLA-301 — Sacred Weapon (2024 Paladin, Oath of Devotion lv3): generic temp_buff path grants buff for free; dedicated CD-spend + damage-type modal unreachable

**Verdict:** FAIL · **Date:** 2026-09-04 · **Verified by:** Playwright MCP live E2E, test-campaign, ElderPaladin lv20 2024 (subclass temporarily Devotion, restored to Ancients after).

## Canonical rule (2024 PHB, Oath of Devotion lv3, Bonus Action)
Expend one Channel Divinity use; imbue one melee weapon 10 minutes; **add CHA modifier (min +1) to attack rolls**; hit deals normal damage type **or** Radiant; weapon sheds bright light 20 ft / dim 20 beyond.

## Data
`public/data/2024/classes.json` classes[6].majors[0].features[0]:
`level:3`, `automation:{type:'temp_buff', effect:'sacred_weapon', duration:'10_minutes', resourceCost:'channel_divinity', options:[{Normal Damage Type→normal},{Radiant Damage→Radiant}], casting_time:'1 action'}`.
- Manifest error: task called this "Oath of the Ancients"; it is majors[0] **Oath of Devotion** (Ancients = majors[2]).
- casting_time data deviation: "1 action" vs canonical **Bonus Action**.

## Working parts
- Attack bonus consumer is correct and live: `contextBuilder-sync.js:357-362` `sacredWeaponActive && melee/unarmed → sacredWeaponBonus = Math.max(1, CHA)` added into `effectiveHitBonus` (:458) with formula part "Sacred Weapon (+5)".
- Live popup: **"d20 10 +16 (+11 to hit, +5 Sacred Weapon) ✓ HIT (26 vs AC 11)"**; sheet cell +16 title "Base: +11, Sacred Weapon: +5" (CharActions.jsx:413-422). Damage `1d8+5 [slashing] … 12 applied Thug 1 32→20` (+1d8 radiant on hit is BASE Radiant Strikes, not SW).

## Defects (all decisive-evidence backed)
1. **No Channel Divinity spend.** Activation via row at CD **3/3 → CD stayed 3**. `channelDivinityCharges:3` unchanged in change-data. Gate absent: with CD manually set **0/3** the row click **still succeeded** ("Sacred Weapon activated on yourself (10_minutes)"). `sacredWeaponHandler.js` (charges check :31, `currentCharges-1` :44, refusal popup) NEVER executes.
2. **Damage-type choice picker never offered.** No `.sp-overlay` picker at any point; buff record has **NO `damageTypeChoice`** key (generic-shape record with `enemiesDisadvantageSaves/blocksSpellcasting/castingTime:"1 action"` proves generic `handleBuff` wrote it); `sacredWeapon.js:15` (step feature) therefore never swaps type — hits stay `[slashing]`; Radiant option unreachable (spec "normal OR Radiant" silently reduced to normal).
3. **No 10-minute expiry.** `pendingExpirations: []` after activation; buff survives page reload; only cleared by row re-click toggle ("toggled OFF"). Duration is inert display text "(10_minutes)".
4. **No light handling.** No light prose in activation popup (generic toast), no light state/key (CLA-190/213 prose-only precedent would still require the dedicated handler's light text, which never renders).
5. **No automation log.** Campaign log contains no Sacred Weapon activation/spend entry (AGENTS.md: every automation must log). Only roll + hp_change entries existed.

## Root cause
- Dispatch is keyed by `auto.type`: `executeHandler` (`src/services/automation/index.js:710`) → `HANDLER_MAP['temp_buff']` = `handleBuff` (:306). **`sacred_weapon: handleSacredWeapon` (:402) is dead code** — type is never `'sacred_weapon'`.
- Info builder `DISPATCH` (`automationInfoBuilder.js:50`) also keyed by type → generic temp_buff builder (temp.js:2) runs and **drops `options`**; the `'sacred_weapon'` builder in temp.js:69 (which preserves options) is equally unreachable.
- Consumer half (`steps/features/sacredWeapon.js`, `contextBuilder-sync.js`) keys off `activeBuffs.effect==='sacred_weapon'`, so the +CHA/+5 math works even on the generic (free, un-typed, un-expiring) buff.

## Fix direction
Route effect→handler in `executeHandler` for `temp_buff` (e.g. check `HANDLER_MAP[auto.effect]` before `auto.type`, or set the feature's automation type to `'sacred_weapon'` in data + keep temp_buff consumer fallback), or add a sacred_weapon branch in `buffHandler.handle` delegating to `handleSacredWeapon`. The `sacredWeaponDamageType` modal map entry (useCharActionsAutomation.js:60) + CharSpecialActions modal plumbing must receive `{type:'modal', modalName:'sacredWeaponDamageType'}` from the row click. CD spend must occur BEFORE modal return (already does at handler:44) or refund on Cancel. Add timestamped pendingExpirations (~now+10min) per expirationQueue pattern + ability_use log.

## Suggested data fix
`casting_time` "1 action" → "1 bonus action" (canonical 2024 BA); row belongs in Bonus Actions.

## Registry notes
- ElderPaladin restored: lv20 Ancients, equipment intact; change-data + log cleared and verified empty.
- NEW pitfalls recorded in `checkpoint-CLA-301.md` (temp_buff type-keyed dispatch kills effect-keyed handlers; sheet attack needs initiative-card target armed; picker options dropped by generic builder).

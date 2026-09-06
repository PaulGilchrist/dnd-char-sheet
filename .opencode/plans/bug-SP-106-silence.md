# BUG SP-106 — Silence (2024): Thunder immunity and Verbal-component block claimed but have NO live consumer; zone is caster-centered, not point-centered

**Verdict: FAIL**
Verified live 2026-09-05 via Playwright on http://localhost:5173, test-campaign.

## Row under test
`docs/automations-manifest.json` SP-106 expectedBehavior: "For the duration, no sound can be created within or pass through a 20-foot-radius Sphere centered on a point you choose within range. Any creature or object entirely inside the Sphere has Immunity to Thunder damage, and creatures have the Deafened condition while entirely inside it. Casting a spell that includes a Verbal component is impossible there."
Manifest handler/router paths are stale (`handlers/spellHandler.js`/`routers/spellRouter.js` do not exist).

## What the app actually implements
Live cast chain: Spells cell → SpellDetailPopup → Cast Spell → `modalSpells.js:190 handleSilence` → modal `silenceTargetSelection` (`useSpellCastExecutor.js:109`) → `SilenceModal.jsx` (manual creature picker) → confirm.

Implemented (exact, clause a-core):
- Manually picked creatures get `activeConditions:['deafened']` + te `{target, effect:'silenced', source:'Divine_Cleric', duration:'concentration'}` + initiative "Silenced" badge (`ConditionEffectBadges.jsx:279`) + `condition/applied` log + `ability_use` cast log. Live: Thug 1 `activeConditions ["deafened"]`, te present, badge rendered; unpicked Air Elemental 1 / PCs untouched (`Air Elemental 1` change-data key absent).
- lv2 slot 3→2, concentration badge "Silence DC 10", `spell` log `concentration:true`, `pendingExpirations` registered (`condition deafened` on Thug; `remove_active_buff Silence` + `clear_silence_zone` on caster).

## Bugs (each: row CLAIMS it, app does NOT enforce it)

### B1 — Thunder immunity never applies (ZERO consumers reachable)
`applyDamage.js:193-202` grants Thunder immunity only by scanning the **damaged creature's own** `activeBuffs` for `effect==='silence'` with `sourceCharacter`. On the live `SilenceModal` path NO `silence` activeBuff is ever written to anyone (`toggleBuff` is only in `silenceHandler.handle`, which is a dead path — see B3). Post-cast change-data: `Divine_Cleric.activeBuffs = undefined`, Thug 1 state has no buffs → immunity code unreachable for every creature.
**Live probe:** armed Air Elemental 1 → target Thug 1 (silenced, "immune" per cast log) → Thunderous Slam HIT d20 8+8=16 vs AC 11 → popup "9 damage applied to Thug 1 — HP: 32 → 23", log `damage 2d8 rolls [2,2] type Thunder` + `hp_change targetName:"Thug 1" delta:-9`. Full thunder damage through the claimed immunity.

### B2 — Verbal-component casting not blocked (gate inert + silent)
`spellCastService/execution/index.js:97-101` and `spellResolution.js:58-62` gate V-component spells via `getSilenceSource(caster)` → reads the **casting creature's own** `activeBuffs` `effect==='silence'`. Targets receive only a Deafened condition + `silenced` te, never the buff → `getSilenceSource` returns null → gate skips (and even when it fires it `return`s silently with no refusal log/popup).
**Live control probe:** with Silence active (`silenceCaster:true`, caster is the modeled zone center), Divine_Cleric cast **Sacred Flame (V, S)** — completed normally: popup "4d8: 8,8,4,8 = 28", `spell` + `roll damage` logs. No refusal. (App's own cast log claims "Verbal spell components cannot be used inside.")

### B3 — Dead parallel handler + zone model wrong
- `silenceHandler.js` exists and is registered (`automation/index.js:242`) but its return popup type `silence_target_selection` has **zero consumer components** (grep: only its own file), and `silenceService.triggerSilence` has no production callers → whole handler inert.
- Zone center is taken from the **caster's** grid position (`SilenceModal.jsx:36-41`, `silenceHandler.js:33-41`), not the chosen point; picker lists ALL combatSummary creatures with **no radius filter** (live: Wild_Sage_Druid etc. selectable). Without a map, `silenceCenter=null` → `isCreatureInSilenceZone` is false for everyone, making B1/B2 consumers doubly unreachable.

## Why FAIL not PASS-subset
Clauses (b) Thunder immunity and (c) V-block are explicitly claimed by the row AND by the app's own `ability_use` cast log text, yet have no reachable consumer (code grep + two live probes above). Per orchestrator verdict policy: stated effects with no consumer = FAIL.

## Fix direction
On SilenceModal confirm: (1) write an activeBuff `{name:'Silence', effect:'silence', sourceCharacter: caster, blocksSpellcasting:true}` to caster AND each picked target (or key zone by an id and scan by te, not buffs); (2) let the picker capture a map point (or nearest-token point) as center instead of caster pos, and filter/disable rows outside `isCreatureInSilenceZone`; (3) enforce V-gate against `silenced` te / Deafened + zone check for BOTH PC and monster pipelines (`spellResolution.js`), with refusal popup + log.

## Config left on registry
Divine_Cleric lv17 2024 Life Domain — **Silence added to spells[]** (disk-persisted, prepared/castable). Campaign change-data + log Admin-cleared after test; Thug 1 + Air Elemental 1 joined state cleared.

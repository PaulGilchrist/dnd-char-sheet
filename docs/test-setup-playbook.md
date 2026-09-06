# Automation Test Playbook — test-campaign (condensed 2026-09-06)

GM-authorized condensation of the 418-line accumulated log into durable operating knowledge. Contradictions resolved to the live-proven fact. Per-row verdict details live in `docs/automations-manifest.json` + `.opencode/plans/bug-*.md` + `docs/test-character-registry.json`. Append only NEW reusable mechanics/pitfalls here — do not re-add per-row recaps.

## House rules (orchestrator + subagents)
- Subagents: run the master PITFALLS list (§8) before declaring INCOMPLETE. Do NOT edit the manifest `verified` field — orchestrator owns it.
- Playbook edits: surgical appends only; never full-file rewrites without GM direction (history of silent content loss).
- Manifest edits: surgical text edits to one row block only; never `json.dump` the whole file (unescapes \u across unrelated lines). `verified` = exactly `"verified"` on pass, `"broken — see .opencode/plans/bug-<slug>.md"` on FAIL.
- Verdict policy: unenforced trigger/gates (fires anytime, no resource spend, fires on successes) = FAIL even if math exact. Unimplemented/no-consumer = FAIL (grep + live probe), never INCOMPLETE. Phantom/misattributed row = data bug: fix row IN PLACE (keep id), retype (`feat`/`featBenefit`/race trait), annotate expectedBehavior with canonical text + real paths.
- Manifest handler/router/infoBuilder paths for feat/classFeature/spell/weaponMastery rows are systematically fictitious — real consumers live under `src/services/automation/` (automationRouter.js, automation/index.js, contextBuilder-*, handlers/, spellCastService/). Grep before trusting.
- Every automation must log to the campaign log; a popup-only automation is an AGENTS.md logging gap — record it.

## 1. Environment & server operations
- Dev: `npm run dev` (Express :80 + Vite :5173 proxying /api, /subscribe, /spell-overlay). Drive Playwright at http://localhost:5173. GM features are localhost-only. Kill after: `pkill -9 -f vite; pkill -9 -f "node.*server"; pkill -9 -f concurrently`.
- `changeData.js`: in-memory + ~10s debounce; `saveFile` rewrites every in-memory key on tick. If edits don't appear: wait 15s → reload → Admin → Clear Change Data → HARD reload → verify via `/api/campaigns/test-campaign/change-data` (expect `{}`).
- A tab that already loaded sheets will RESURRECT cleared data via its full-store snapshot POST. Clear last from a quiet state, then hard-reload and re-verify.
- A loaded tab can also resurrect stale VALUES with zero user writes (e.g. uses 0→2 between two GETs). Re-stamp immediately before any uses-gated click.
- Endpoints: campaign log = `/api/campaigns/:name/log` (NOT `/api/log`). change-data = `/api/campaigns/:name/change-data`, keys NESTED: `d['<CharName>'].<key>`; top-level specials: `combatSummary`, `lastAttack`, `pendingSavePrompts`, `pendingSaveListenerPrompts`, `__map__`. change-data `log` key does NOT mirror the campaign log.
- ONE SSE per campaign: `subscribeToSSE` only; `skipSync=true` when re-applying SSE-echoed data.
- `[object Object]` ghost campaign: guarded in changeData.js (skips corrupted dirs, purges invalid keys). If ever needed: STOP server first, then `rm -rf public/campaigns/\[object\ Object\]`.
- HP truth: PC = runtime `currentHitPoints` (initiative-card spinbuttons; combatSummary PC entries can be 1/1 placeholders); monsters = cs `currentHp` ONLY — runtime monster HP keys never exist, so runtime-keyed HP gates silently see 0 for monsters. Cantrip/healthy-monster gates must read cs.
- After Admin clear: sheet shows max-fallbacks for pools (fallback constants ≠ table truth); superiority/psionic/sorcery pools need Short Rest refill before maneuvers/features. Campaign-select mount re-seeds PC placeholders in change-data — normal, not a resurrection.

## 2. Verify from data before anything
- Spell class access, subclass feature ownership, feature level, slot math: read `public/data/2024/spells.json`, `public/data/spells.json`, `public/data/2024/classes.json`, `public/data/classes.json`, `public/data/2024/feats.json`, `public/data/2024/monsters.json`, `public/data/2024/equipment.json`, `public/data/2024/races.json` FIRST. Both ruleset paths. NPC names must match monsters.json exactly.
- App feature LEVELS frequently diverge from canonical PHB (e.g. app: Slippery Mind lv15, Spell Mastery lv18, Sorcerous Restoration lv5, Sorcery Incarnate lv6, Smite of Protection Oath of Devotion lv15; canonical differs). Judge against APP data behavior; report divergence in the report — don't stall on it.
- lv6 spells need lv13+ casters. EB monsters join initiative ONLY via "Join Encounter" (checkbox alone never reaches combatSummary); EB table resets after Join (re-search/re-tick for a 2nd monster).
- EB search: top match may be a different species ("Zombie" → Beholder Zombie 1) — read autocomplete rows.

## 3. Edit wizard recipes
- Tabs: accessible names are concatenated ("7 Subclass / Major", "14 Spells", "16Inventory") — locate by innerText, not getByRole name.
- Feats step: default filter "Show Only Selected" + stale search can hide the row; step's FIRST `.list-item-checkbox-trigger` is the filter checkbox. Scope: `.feat-item` whose title startsWith the feat name → inner `.list-item-checkbox-trigger` click (container click no-ops); verify `list-item selected`/`checkbox checked` after 300ms. Row tick toggles `.list-item.selected` class (no input.checked).
- ASI: Abilities step `.bg-ability-select` comboboxes render for choose-any AND fixed-pair feats, ordered by feat selection order, new feat LAST (`nth` = feat-list index); single-score fixed feats render none. ASI applies once; `featAbilityChoices` key = `"<Feat>-<featListIndex>"`.
- Skills step 10: pool panels are authoritative ("Background 2/2 · Class 0/2 · Race 0/1", "Skilled: 0 of 3") — step header count ("7 of 6 allowed") is STALE display. Greedy assignment consumes smallest restricted pools first — to prove a feat/race grant, pick skills absent from every other open pool. Expertise: `.expertise-toggle-btn` → "(Expert)". Validation is warn-only (4 of 3 shows warning, Save stays enabled). Background fixed skills render `checked disabled`. Expertise plumbing: feat desc regex `choose.*skill.*proficiency.*expertise` → grantsExpertise → expertSkills → abilityCalc2024 doubling.
- Inventory step 16: TWO textareas — nth(0)=Backpack, nth(1)=Equipped. Comma-separated. Edits need REAL keystrokes (`keyboard.type`; Meta+a replaces; Enter alone does nothing; native setter+blur silently drops). Restore after probes; heavy names: "Chain Mail".
- Subclass: tab 7 selectOption; if stale major persists, re-pick the CLASS at step 6 first, then subclass. App normalizes subclass to `class.major`.
- Spell prep: tab 14 tick (use `textContent.startsWith(name)` — "Fireball" substring-matches "Delayed Blast Fireball"). Auto-assigned checkboxes for non-caster subclass grants are display-only (never persist to `spells[]`). `mi-overlay` auto-opens when Magic Initiate pending — click `.mi-skip` before saving. Wizard edits stay in local formData until ✓Save (inside `.character-creation-wizard-overlay`).
- Auto-prepare evidence ("Always" injections, spellCalc2024) requires a PAGE RELOAD to observe. Injected rows are the live proof that a spell row appears + is clickable (no Prepared column in `.attacks` grid).

## 4. Casting / combat flow recipes
- Standard cast: sheet Spells/Actions cell (spell rows are `td.left.spell-name.clickable` on some sheets, `div.left.clickable` on others — match textContent, not tag) → SpellDetailPopup (shows casting time, slots remaining) → "Cast Spell" → `.sp-overlay` picker → "Cast <Name>(N)" → resolve prompts → results Close.
- Slot accounting: slot pays at "Cast Spell" BEFORE pickers resolve — abandoning/Cancel a picker keeps the charge (burned). Free-cast popup = "Free Cast — no spell slot consumed" + stamp; paid cast = numeric slot decrement. Refunds (counterspell success, confirm-time refusals) = numeric UP with a NEW save_result/log pairing.
- AoE/save picker: `.sp-overlay`/`.sp-modal` "Select creatures in the area of effect… DC N" — checkbox rows `.secondary-target-row`; use TRUSTED clicks (synthetic `input.click()` double-toggles or no-ops). Rows may pre-exist hidden (`offsetParent===null`) — waitForFunction visible. Stale popups REPLAY previous results: only count NEW log lines / change-data deltas.
- Save prompts: `.sp-modal` "Saving Throw Required (n of N)" — buttons Roll Save / Next Save / Done. Multi-hit chains can queue "(1 of 2)" with "Next Save" button — loop done|next save|skip until overlay gone. `saveResult-<Target>` change-data key = machine-readable `{saveBonus, rawRolls, mode}` capture.
- Popups: damage popup has NO Done (background click dismisses). HIT popup's own `.dice-roll-reroll-btn` "Done" applies damage — bg-dismiss ABANDONS the hit. MISS popups have no Done. Stack: two `.sp-overlay`s can stack post-cast (chooser + AoE picker) — click FRONT overlay's button first. `[data-testid="popup-overlay"]` blocks trusted clicks — read + dismiss between sheet interactions.
- `sp-overlay` on summons/automation survives `.sp-body` click — press `.sp-roll-btn` "Done" (or evaluate-Skip for ghost self-cast pickers).
- Attack arming: initiative-card `[data-testid="target-select"]` via Playwright `selectOption` (native setter+change silently reverts to ""). Cards order = combatSummary array order (joined monster often idx 0). PC avatar alts are INITIALS; monster alt=full name — locate card by `img[alt]`.closest('.creature-card') or `.creature-card:nth(idx)`; textContent matches every dropdown's option list — never `hasText`.
- EB monster attacks: avatar `img.avatar-image.click()` opens `.mc-overlay`; attack links are `span.mc-dice-link` inside the row whose text matches /^Mace\./ etc (text "+2" collides with saves; `button` selector finds only ×). EB melee auto-miss beyond 8 ft — place tokens adjacent. EB attacks from Prone roll mode:normal (attacker prone not modeled); use Reckless self-advantage for adv probes. Reckless prompt intercepts Barbarian first attack — click "Normal Attack" for pure baseline.
- Special Actions rows: click the `b.clickable` label via `evaluate el.click()`; description span no-ops. Newly selected maneuver rows may need full page reload to render.
- EB add-misfire: right column "Add Player" appends empty rows (undo "Remove player N"); "Join Encounter" sits mid-column. Unplaced NPCs in cs = phantom allies (pass attitude+range checks) — remove via card `.npc-remove-btn`.
- Initiative walk: "Next →" walks CREATURES-ARRAY order, not init-sorted — verify each click with a `/change-data` `activeCreatureName` fetch (~14 clicks/round with 16 creatures). Save-spell prompts fire at CAST time (no turn walk needed). Targeted saves appear on the victim; repeat/badge saves: click condition badge → `.condition-save-result`. Concentration badge × is a SIBLING `[title="Remove effect"]` inside the card (not nested).
- Ghost save prompts (HMR / long sessions): stale ids linger in `pendingSavePrompts`, re-present after reload and block clicks; fix = Admin clear → re-Join → re-arm. Admin buttons blocked by unresolved `.sp-overlay` / `.cnp-overlay` — dismiss first.
- Initiative-card monster name lives in an INPUT (rename field): textContent scans miss it; NEVER press Enter there (renames monster → null-target rolls, popups without HIT/Done, damage silently abandoned; recovery = Initiative Clear → re-Join).
- Condition Add modal: pick chip → MUST press Apply; `.ea-overlay` blocks all avatar clicks until closed. Blinded does not set cannotAct. Single-select: multi-chip + one Apply keeps only last chip.
- Dead monsters: revive via card `input.hp-inline-input` (the 2nd input; 1st is autocomplete — never fill it) fill+Enter writes cs.currentHp. Dead creatures may still appear in AoE pickers and roll.
- Damage formula text shows the PRE-rider type token — verify converted damage type via log `damageType`, not popup formula. Popup "vs AC N" may print BASE AC while the resolver used covered/buffed AC — judge from HIT/MISS boundary + log fields (`coverLevel`, `coverAcBonus`, `targetAc`).
- Range strings: automation uses `60_ft` underscore; parse `[_ ]?ft`. EB monster action `range` is description text ("100/400 ft.") — reach-derived `isMelee` is truth; never rangeToFeet those.

## 5. Cover / map rig (proven)
- Maps → manager → Open Test Map (Open ALSO sets App activeMapName; no separate Activate). `page.goto` RELOADS and drops activeMapName.
- Tokens: toolbar Items panel dragAndDrop `.items-panel-char:has(span:text-is("NAME"))` → `svg.grid-svg` (chars section lists only off-map PCs); items `.items-panel-item:...`. NPC token: drop 'npc' → right-click transparent cell `rect[x=gx*40][y=gy*40]` (`.last()` when stacked, force:true) → Rename → autocomplete fill+Enter; token name MUST equal combatSummary name. Mid-combat Playwright dragAndDrop can hit stale sidebar — use manual mouse.down/move/up.
- Cell px: `p=svg.createSVGPoint(); p.x=gx*40+20; p.y=gy*40+20; p.matrixTransform(getScreenCTM())` minus boundingRect (40px cells). Cover props: barrel/crate/pillar/chair=½; bookshelf/table/bed/altar=¾; Paint-tool clicks = walls = FULL. Evidence: popup "1/2 Cover (+2 AC)" / "AUTO-MISS (Target has full cover)"; log `coverAcBonus/coverLevel/coverReason/isAutoMiss`. Cover is consulted ONLY by weapon attacks (spell paths bypass buildAttackContext).

## 6. Evidence discipline
- Campaign log `roll.total` = RAW d20 (+bonus shown separately); popup displayTotal = +bonus figure — they legitimately disagree; compute `total+bonus` vs AC yourself.
- `rolls:[a,b]` is ALWAYS 2d20; `mode` field is the only adv/dis truth. Nat-20 doubles damage dice `rolls:[4,4]` — don't pick crits to verify reroll/die-count flows.
- Decisive chains: pair numeric change-data deltas with NEW log lines (`save_result`, `ability_use`, `hp_change`) captured before/after each action; never trust popup re-displays or the instant sheet header (AC/Speed reflect LAST render — dismiss something first).
- Open the victim's sheet LAST — sheet mount can POST stale `activeConditions:[]` and wipe handler-applied runtime conditions (CharConditions un-hydrated init). Verify server mirror after sheet visits.
- Two same-tick `setRuntimeValue` POSTs race (full-store snapshot each; last-write wins) — code fix = sequential awaits; evidence = POST-body order in network inspector.

## 7. Current state-of-the-engine map (known seams, as of 2026-09-06)
Spatial/visibility:
- `isWithinRange` (`rangeCheck.js`) reads runtime `__map__.activeMapName`/`__campaign__.campaignName` which have ZERO prod writers → always lenient true. ALL "within X ft" gates (Sneak ally-gate, share/zone radii) are unenforceable; any cs creature counts as adjacent.
- No light-level/unseen model; PC-side Blindsight/Blur/Foresight attacker-disadv = display+state only (contextBuilder-sync `dis++` runs after mode resolution; monster-only cancels in conditionEffects).
- No fall-damage producer anywhere; "reduce fall damage" rows can only be probed with a bludgeoning monster-attack proxy (trigger gate then fails-open = typically the bug).
- Zones: `_sleetStorm_<caster>` per-creature te lists, mapName null, duration often never forwarded (`remove_*` expiration types may lack cases in clearExpirationEffects.js → effects persist until rest).
Damage/resolution seams:
- Popup flips MISS→HIT for buffed AC (computedHit vs base AC; SP-105/CLA-320 family) — misses can deal damage via Done.
- `featureRiders`-step modals pause at `_pausedStep:'featureRiders'`, which `resumeAttackPipeline` refuses → stranding trigger-hit weapon damage (FT-074/CLA-320).
- Upcast free-cast leak: SpellDetailPopup computes `freeCastAuthorized` off BASE level and forwards it with `isUpcast:true` → higher-level casts consume nothing (CLA-312/CLA-323; affects Signature Spells + Spell Mastery + Spell Mastery-shaped features). Fix direction: gate on `upcastLevel ?? spell.level`.
- Reaction economy: generic `reaction_damage` branch gated 2026-09-04 (holder-not-target/self/ranged/5ft/round latch, refusals as popups); damage_reduction branch (Slow Fall) has NO latch/spend and fails-open on `falling`; post-roll reaction rows can re-fire on one lastAttack; `autoReroll` dual consumers (hitResolution auto vs reaction-row handler) diverge on expend semantics.
- `auto_effect` automation type has NO HANDLER_MAP entry → features declaring it dispatch null (Psychic Teleportation inert). Modal-name dispatch can be discarded fire-and-forget (Share Spells 'primalCompanionSpellShare' unmapped).
- `oncePerTurn` stamps must use `playerStats.name` — `cs.activeCreatureName` mirror goes stale mid-combat (FT-074/FT-082 family) and corrupts re-arm.
- Once-per-turn te re-arms only at holder's turn start (turnStartEffects); turn-END condition removal seam exists (turnEndConditionRemoval) for `condition_removal` only; `until_start_of_next_turn` te often has NO expiry registrant (attack_rider te persists; masteries DO register addExpiration and drain at ROUND boundary, not holder-turn-start).
- Concentration: `addConcentration` hardcodes dc:10 at cast (handler storage.set rescues DC); spells that skip storage.set leave stale dc-10 records; slow/zone chains never persist caster concentration.
Save/immunity seams:
- EB join strips monsters.json condition-immunities (cs.immunities=["Poison"] only) — undead auto-success-style gates keyed on cs.immunities miss.
- `saveBonuses` lookups need LOWERCASE keys (uppercase callers got silent +0 pre-2026-09-04 fix).
- Fallback DC 10 with `[buildSaveDc]` console error = numeric saveDc never forwarded (SP-109, Counterspell, CLA-322 dispel).
- Calm Emotions picker auto-applies without rolling its DC-17 CHA save — invalid as a CHA-save probe. CHA-save spells: Bane/Zone of Truth/Divine Word/Banishment; Charm Person is WIS in both rulesets.
Dead-by-design (accepted models, do not chase): feats with `automation:null` benefits are display-only; sheet skill/save cells have no prof annotation (numeric delta IS the marker); base mastery cells are text-only auto-apply (opt-in pickers don't exist); Sacred Weapon CD counter lags modal-open.

## 8. Master PITFALLS checklist (run before any INCOMPLETE)
1. Premature setup gap — verify class access in spells.json (both paths) first.
2. Wrong spell class/feature attribution — verify from JSON, not memory.
3. Cache blame — wait 15s / reload / Admin clear + hard reload; then it's usually the client not POSTing.
4. Wrong target type — add the right NPC via Encounter Builder.
5. Slot levels — lv6 needs lv13+; check slot counts before casting.
6. `.sp-overlay`/`.popup` intercept clicks — dismiss (Done on HIT popups only; bg click abandons hits).
7. Join Encounter is the only path into initiative; EB table resets after join.
8. GM features localhost-only; use :5173.
9. One shared SSE (`subscribeToSSE`; `skipSync` on echoes).
10. Popups stack — flush loop `[...document.querySelectorAll('.popup,.sp-overlay')].pop()`-style between actions; count log deltas not popups.
11. te once-per-turn re-arms at holder's turn only; probe with 2nd attacker mid-round.
12. Stale `.mc-overlay`/monster cards intercept the next click — close via × between cards.
13. Add-condition modal needs Apply; `.ea-overlay` then blocks clicks; single-select.
14. EB auto-miss >8 ft — adjacent tokens (manual mouse drag).
15. EB prone attacker disadvantage not modeled — use Reckless for adv.
16. Ancients Paladin immune to self-Frightened — use Charmed/Deafened for cure tests.
17. Special Actions rows: `evaluate el.click()` on `b.clickable`.
18. Same-tick double POST races — network-inspector body order decides.
19. Admin clear zeroes tracker pools + runtime selections — short rest / re-arm first.
20. "Collected" ≠ consumed — grep consumers + live probe before trusting data shape proofs (ritual/spell/feature buckets no-op traps).
21. Sheet computed `prepared` overlays client-side — trust sheet DOM + disk.
22. Wizard tabs concatenated names; feats filter checkbox is first trigger; `.list-item.selected` not `input.checked`; startsWith matching.
23. ASI combobox nth = feat-list index; key `"<Feat>-<idx>"`.
24. Initiative walks array order; `activeCreatureName` top-level is truth; verify per-click.
25. Save prompts queue behind result popups — Done first.
26. Arm targets before teleports/riders or phantom "Unknown" appears.
27. Spellless chars show `spell_slots_*:0` globally — never slot evidence.
28. Any spell can appear slot-free: verify the slot ledger yourself (`spell_slots_level_N`).
29. Runtime-vs-cs HP split (§1); monster runtime-HP gates see 0.
30. `mode` is the only adv truth; `rolls` length is noise; crit doubles dice.
31. Popup AC/total fields lie on boundaries — log fields + HIT/MISS boundary decide.
32. Open victim sheet LAST (mount wipes conditions).
33. Never Enter in initiative monster-autocomplete; unplaced NPC = phantom ally — remove.
34. Feature grants (signature/mastery/soulstitch/spell-mastery) are runtime-only — Admin clear erases, re-arm each run.
35. lv17–20 PB = +6; sanity-check DCs (8+mod+PB) before crying "wrong DC".
36. PB+6 + lv20 free smite etc.: check the feature's OWN free/granted mechanics before reading a slot non-decrement as a bug.
37. 2024 Shortsword is PIERCING — slashing probes need Scimitar/Longsword/Handaxe; inventory nth(1)=Equipped, real keystrokes, comma-separated.

## Key campaign probe facts (mirror of registry — registry is authoritative)
- PB by level: lv14=+5, lv17–20=+6. Divine_Cleric DC ~17 spell probes; DivinationWizard INT DC 17 lv20.
- Forced-fail victim: AberrantSorcerer WIS −1. High-AC miss rig: EB Knight 1 AC18. Spell-cast reaction enemy: EB Gazer 1 (Frost Ray 3d6 DEX, writes lastAttack). Bludgeoning proxy: Thug Mace. Thunder probe: Air Elemental Thunderous Slam (Cloud Giant Slam contaminated). 2× Bludgeoning/Piercing pair: EB Thug ×2.
- FeyRanger lv17 shows pre-existing Blindsight 30 ft (Feral Senses) — check Senses before sense-delta tests.

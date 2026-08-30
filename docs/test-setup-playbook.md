# Test Setup Playbook

Accumulated known-good recipes for setting up combat automation verification scenarios. Grows as subagents succeed.

## General rules (from the GM)

- **Monsters are created from the ENCOUNTER BUILDER, not the NPCs sidebar.** To get a monster into combat: Encounter Builder view → search `public/data/monsters.json` / `public/data/2024/monsters.json` names → add monster → add to initiative. Do NOT use the NPCs sidebar to create combat targets. (NPCs sidebar entries like the "Goblin" in test-campaign are story NPCs, not valid statblock combatants.)
- **Clean up after testing:** remove monster creature cards from initiative when a test finishes, then clear change-data cache and campaign log via the Admin panel. Keep test-campaign data clean.

## Manifest ambiguity pattern

Many triggerConditions fields use cryptic internal event names like `cunning_strike_poison_save_fail`. These are ambiguous about *whose* save/roll is being checked. The rule: **the trigger always refers to the target's save, not the character's** — Cunning Strike is the Rogue applying a feature to an enemy, so the enemy's failed save triggers the poison damage. When dispatching subagents, translate these internal names into clear natural language.

## Recipes

### Encounter Builder → combat (save-forcing monster setup)

Campaign → Encounters view → search monster DB by exact name (names must match `public/data/monsters.json`) → check its Select checkbox → click **Join Encounter** (skull button, only visible when ≥1 monster selected). No need to save the encounter first — selecting a monster and clicking Join Encounter is enough; it appends monsters into the live `combatSummary` (rolls initiative, navigates to Initiative view) and player characters appear automatically alongside. Monster spellcasting lives in `traits[]`, not `actions[]`.

**Known-good save-forcing monster: Aarakocra Aeromancer** (`aarakocra-aeromancer`, CR 4, HP 66, AC 16) — Spellcasting action with structured `save_dc: 13` / `save_type: "Wisdom"`: Gust of Wind (WIS save, at will), Lightning Bolt (1/day). Use this when you need a monster that forces saving throws.
**Known-bad: Cult Fanatic** — despite spellcasting in traits[], it exposes no usable save-DC attack in combat; do not use it for save tests.

### Initiative/UI gotchas

- **Check the initiative tracker BEFORE using Join Encounter** — the monster may already be staged from a prior attempt; Join Encounter would append a duplicate.
- Stacked invisible overlays block clicks: leftover "Saving Throw Required" prompt (`.sp-overlay`) and open MonsterCardModal statblock viewer (`.mc-overlay`). Close any open monster card and resolve/dismiss pending prompts before manipulating creature cards.
- "Remove NPC" on a creature card fires a native `confirm()` dialog — accept it.
- **Clicking away from modals** (clicking empty space or backdrop) closes most overlays. This is useful when stuck on blocking modals like `.sp-overlay`, `.mi-overlay`, `.encounter-modal-overlay`.

### CharReactions — manual activation required

**CRITICAL:** Reactions listed in the `CharReactions` section of a character sheet are **NOT automatic**. They appear as clickable buttons that the user must actively click to activate. Do NOT assume a reaction triggers automatically when its condition is met.

When testing automations that involve reactions (e.g., Countercharm, Beguiling Defense, War Caster spellcasting reaction, Opportunity Attacks with Sentinel, etc.):
1. Trigger the condition that would activate the reaction
2. Look for the reaction button in the CharReactions section of the character sheet
3. Click the reaction button to activate it
4. Then verify the effect occurred

If a test subagent reports a reaction "didn't trigger automatically," that is **expected behavior** — the reaction is waiting for user input. The automation is working correctly if:
- The reaction button appears in CharReactions when the trigger condition is met
- Clicking the button produces the expected effect
- The reaction is removed from CharReactions after activation (if it's single-use)

**Common false positives to avoid:** Do not file bug reports for reactions that "didn't auto-resolve." Check CharReactions first.

### Character Creation — Dragonborn (Draconic Ancestry)

Campaign → Characters sidebar → **Add Character** → wizard overlay opens.

**Wizard flow (2024 ruleset):**
1. **Ruleset**: Select "2024 Rules (Essentials)" → Next
2. **Basic Info**: Fill Name, Level (5+ for Draconic Flight), Alignment → Next
3. **Race**: Select "Dragonborn" from combobox → Next
4. **Subrace**: Select desired ancestry (Black=Acid, Blue=Lightning, Brass=Fire, Bronze=Lightning, Copper=Acid, Gold=Fire, Green=Poison, Red=Fire, Silver=Cold, White=Cold) → Next
5. **Background**: Select any → Next
6. **Class**: Select any → Next
7. **Subclass**: Select any → Next
8. **Feats**: Optional (Next enabled)
9. **Ability Scores**: Optional (Next enabled)
10. **Skill Proficiencies**: Optional (Next enabled)
11. **Tool Proficiencies**: Optional (Next enabled)
12. **Languages & Fighting Styles**: Optional (Next enabled)
13. **Resistances & Immunities**: Optional (Next enabled)
14. **Spells**: Optional (Next enabled)
15. **Magic Items**: If a "Magic Initiate" overlay appears, click the overlay backdrop to dismiss it → Next
16. **Inventory**: Optional (Next enabled)
17. **Special Actions**: Click **Save**

**Known-good character: DraconicDragon** — Red Dragonborn, Barbarian (Path of the Berserker), Level 5, Acolyte background, 2024 ruleset. File: `public/campaigns/test-campaign/DraconicDragon.json`. Has Fire resistance, Breath Weapon action, and Draconic Flight bonus action.

**Overlay gotcha**: The Magic Items step may show a "Magic Initiate" overlay (`.mi-overlay`) that blocks the Next button. Click the overlay backdrop or a close button to dismiss it before proceeding.

### Fast Hands data issue (Thief subclass vs base Rogue)

Fast Hands is incorrectly defined as a **Thief subclass** feature in  rather than a base Rogue feature at level 2. Non-Thief Rogues (Assassin, Soulknife, Arcane Trickster) cannot access it. To test: create a Thief subclass Rogue or fix the 2024 class data to move Fast Hands from  to .

### NPC click handler issue (runtime encounter creatures)

Clicking on a runtime encounter creature in the initiative tracker does NOT open the monster stat block modal with attack options. This blocks testing of reaction-based automations (Glorious Defense, etc.) that require NPC attacks.

### Aarakocra variants have null AC

All three Aarakocra variants (Aarakocra, Aarakocra Aeromancer, Aarakocra Skirmisher) have `AC: null` in `public/data/monsters.json`. This prevents the attack system from determining hit/miss, blocking all attack rider maneuvers. Fix: set appropriate AC values (Aarakocra: 12, Aarakocra Aeromancer: ~13, Aarakocra Skirmisher: ~12). Use different monsters for attack testing.

### Spell class verification for 2024 ruleset

Grease (SP-056) is only available to Sorcerer and Wizard in 2024 — NOT Druid or Bard. Always check `public/data/2024/spells.json` for the `classes` array before assuming a character can cast a spell.

### Hold Monster/Person target selection issue

When casting Hold Monster or Hold Person, the target selection modal only shows characters from the combat summary, not encounter creatures. The `resolveHumanoids()` function calls `getCombatSummary()` which returns null if no combat session is active. To fix: start combat (Join Encounter should work) before casting these spells, or add the target as a character instead of an encounter creature.

### Mid-combat character creation (new PCs missing from target popups)

Creating a character *after* combat is staged leaves them absent from `combatSummary` and therefore from Globe/area spell target popups (`getCsAndTargets` / `gateGlobe` read the cached summary; gateGlobe lives in `src/hooks/combat/spellGates.js:447`). Fix: visit the **Initiative view once** — `mergeCombatSummaryWithCharacters` on mount adds missing PCs and persists via `storage.set('combatSummary', merged)` — then reopen the cast popup; the new PC is listed.

### Globe of Invulnerability spell flow (SP-055 recipe)

Spell row → details popup "Cast Spell" → "Choose creatures within 10 feet" popup → check creatures → "Activate Globe (N)". `globe_barrier` badge appears on caster sheet + initiative card (tooltip "spells of 5th level or lower blocked"). Outside attacker casting a ≤5 spell at the globed target gets a block popup **before any attack roll** and no log damage entry (wording from `src/services/rules/spells/spellCastService/execution/blockChecks.js`). Sorcerer casters show a Metamagic panel — click "Cast Without Metamagic" to resolve the cast. NOTE: manifest source paths for Globe are stale — real impl: `src/services/automation/handlers/spells/globeOfInvulnerabilityHandler.js` + `src/services/rules/features/globeOfInvulnerabilityService.js`.

### Spell-row selection checkbox

In character-wizard spell steps and creature-select popups, clicking the spell/creature ROW only expands details — selection requires clicking the `.list-item-checkbox` inside the row. Clicking the row does NOT toggle selection.

### Targeted spell attacks need the initiative card Target dropdown (CLA-156 recipe, 2026-08-28)

Casting a single-target attack spell (e.g. Eldritch Blast) auto-rolls IMMEDIATELY with **no target** unless the caster's initiative creature-card **Target dropdown** is set to the monster first. With no target: the roll popup shows no "vs AC"/HIT/MISS line, `campaign.lastAttack` is NEVER written (`attackPostProcessing.js:31` gates on `combatSummary && targetName`), and any reaction reading `getRuntimeValue('campaign','lastAttack')` (Guided Strike etc.) can never see the miss. Recipe: Initiative view → caster card → Target select = monster → sheet → spell row → Cast Spell → popup now shows "✗ MISS (15 vs AC 18)".
- **Card locator pitfall:** `/HexWarlock/.test(card.textContent)` matches EVERY creature card because each card's Target `<select>` lists all PC names. Match instead on the exact-text of a name span/div, or `card.textContent.slice(0,20)`.
- Wizard spell-step checkbox is `.list-item-checkbox-trigger` inside `.list-item-header` (NOT `.list-item-checkbox`; clicking the row body does not toggle). The `.mi-overlay` Magic Initiate can reappear mid-edit — dismiss via `.mi-overlay .mi-skip`.
- `campaign.lastAttack` writes are debounced ~10s; wait ≥11s before fetching change-data to inspect it.
- Known soft bug seen while verifying CLA-156: on ally-miss conversion the damage application throws `Error: characters must be an array` (`applyDamage.js:149` via `autoRerollHandler.js:388`) — popup/+10/log/CD-consume still work, monster HP unchanged.

### Guided Strike (CLA-156) — 2024 data lives under Cleric → War Domain

Guided Strike (+10 on a miss, 30 ft, Channel Divinity, reaction) is a **War Domain** subclass feature in `public/data/2024/classes.json` — NOT Life Domain. Divine_Cleric (Life) cannot use it. Need a War Domain Cleric lv3+ (War_Cleric now exists in test-campaign). Real impl: `src/services/automation/handlers/combat/autoRerollHandler.js` (dispatched as `auto_reroll` via `src/services/automation/index.js`); manifest paths are stale. Ally-miss path works without a map (range check skipped when `_mapName` falsy). Verified 2026-08-28: HexWarlock miss d20(8)+7=15 vs AC 18 → click Guided Strike → popup "d20(18)+7=25 vs AC 18 → HIT, Miss turned into a hit!", CD 2→1, log `War_Cleric used Guided Strike: +10 to HexWarlock's failed attack roll.`

### Weapon attacks auto-roll; attack-rider modal comes AFTER the roll

Clicking a weapon attack row on the sheet **auto-rolls the attack immediately** and shows a dismissable result popup — there is no pre-rider choice. The attack-rider modal appears only *after* clicking Done, and (as of 2026-08-28) `currentRolls` is not carried into it, so attack-rider maneuvers crash with `TypeError: currentRolls is not iterable` (`useAttackDamageResolution.js:282` via `AttackRiderManeuverPrompt.jsx:12`) — see bug-mn-009. Rider use still consumes the die and shows the WIS save prompt; the save and targetEffect badges (e.g. Taunted/`taunting_step`) render fine. Secondary noise: `[buildSaveDc] Spell "unknown" has no saveDc defined` (`savePrompt.js:26`) is unrelated console noise — don't file it as a bug.

### Reaction + monster-hit recipes (CLA-158, 2026-08-28)

- **Monster attacks:** initiative cards have NO attack buttons. Clicking the monster AVATAR silently opens the `.mc-overlay` stat modal (you only see "intercepts pointer events" on the next failed click) — it contains the monster's attack roll buttons (e.g. Smother "+5"). Use this to make a monster HIT a PC and trigger PC reactions.
- **Monk self-target reactions (Hand of Harm etc.):** use the MONK's OWN initiative-card Target dropdown, not lastAttack's attacker — first click without it gives "requires a target".
- **Wizard level field:** native-setter evaluate does NOT persist the level input (saves lv1); use trusted `locator.fill()`.
- **Native dialogs:** `run_code_unsafe` `page.once('dialog')` races native confirm() — handle with browser_handle_dialog instead.

### Hand of Healing self-heal (CLA-159 recipe, 2026-08-28)

Monk self-targeting Hand of Healing: the initiative card Target dropdown EXCLUDES the caster, but the handler defaults to self when no target is set (`healingHandler.js:150` fallback) — just leave dropdown empty and click the sheet's Bonus-Actions "Hand of Healing:" header text; result modal shows "1d8 + 3: 4 +3 = 7 HP restored" and sheet HP/focus update live (focus 5→4 via `useCharActionsAutomation.js:167-182`). No per-turn "bonus action used" tracker marker exists — focus decrement + log entry (`+7 HP … (1d8=4 (4))`) is the consumption evidence. Admin "Clear Change Data" and "Clear Campaign Log" fire WITHOUT confirm dialogs; "Remove NPC" confirm also auto-resolved here — try handle_dialog only if a modal state is reported. Turn walk: loop `Next →` clicks in run_code_unsafe checking `.creature-card.active` text; identify a PC card by exact `.creature-name` span text, not card.textContent (target selects list all PC names).

### Verified misc (CLA-159, 2026-08-28)

- Admin "Clear Change Data"/"Clear Campaign Log" fire with NO confirm dialog; Remove NPC confirm may auto-resolve (browser_handle_dialog then errors "no modal state" — harmless).
- Turn-walk to a card: loop `Next →`, match `.creature-card.active` by exact `.creature-name` span text (textContent matches all cards via Target selects).
- Initiative Target dropdown excludes self; self-targeting bonus actions (Hand of Healing) work via handler no-target fallback.

### Verified misc (CLA-160, 2026-08-28)

- `getCombatContext()` returns a FRESH fetch copy every call — mutating a target from a prior `resolveTarget()` then re-fetching+`storage.set('combatSummary')` silently discards the mutation (cause of bug-cla-160).
- Initiative-card "Add" effect modal keeps only ONE condition selected — Apply per condition, one Add→select→Apply cycle each.
- Monk weapon-hit flow inserts an "Empowered Strikes — Damage Type" modal (Force/Bludgeoning/Skip) AFTER the roll popup; damage popup "N damage applied — HP: X → Y" follows.
- Monster initiative cards use a name TEXTBOX + spinbutton, not `.creature-name` — locate via `card:has(getByRole('spinbutton', { name: '<name> current HP' }))`.
- `allInnerText()` doesn't exist — use `allInnerTexts()`.

### Verified misc (SP-060, 2026-08-29)

- **Server-persisted `combatSummary` PLAYER entries are stubs with `maxHp: 1, currentHp: 1`** (confirmed via in-browser fetch of `/api/campaigns/test-campaign/change-data` for characters never HP-edited). `healService.js:87` prefers `creature.maxHp` (truthy 1) over runtime `hitPoints`, so Heal computes `min(70, 1−runtimeCurrent)` = negative → heal silently blocked (bug-sp-060-heal.md). Canonical player HP lives in runtime `hitPoints`/`currentHitPoints` (`hpModifier.js:16-19`) — any new feature touching player HP must read runtime, not combatSummary.
- **Milestone level-up via Edit wizard does NOT refresh spell slots** — popup shows "No spell slots available for this level" until first Long Rest. New spells also don't auto-populate: re-open Edit → Spells step → tick spell via `.list-item-checkbox-trigger` → Save Changes → wait 15s → verify `spells[]` in `public/campaigns/test-campaign/<Name>.json` (sheet table lags; the JSON is ground truth).
- Heal target modal is a **radio list** (`.secondary-target-row > input[type=radio]` + "Cast Heal" button), NOT `.list-item-checkbox-trigger`.
- Spell details `.popup-overlay` stays open and intercepts sheet clicks after first open — must click its Close button before touching rows underneath; `.ea-overlay` (Add condition) same.
- Initiative PC cards have TWO number inputs: `aria-label="<name> current HP"` + unnamed = **Initiative**, not max HP. PC max HP is text-only (`CreatureHp.jsx:114`) on localhost — corrupt combatSummary maxHp is NOT repairable via UI.
- Heal condition removal works fully even when the HP restore is blocked: badges cleared + 3× "Condition Broken" log + slot consumed.

### Healing pools / patron switch (CLA-163, 2026-08-28)

- Healing Light = Warlock → **Celestial Patron** only (2024 classes.json). Edit wizard Subclass combobox switch works; verify JSON after 15s.
- Tracked pool initializes to **0/max** when runtime key was written 0 under a different patron; Long Rest refills (`hasKey` short-circuits max-default in useTrackedResource).
- Celestial Long Rest auto-opens "Celestial Resilience" `.sp-overlay` ally-picker — **click Skip** or it silently intercepts all sheet clicks.
- Healing Pool modal: per-die "Roll a d6" buttons (pool decrements live), **Done** applies total + logs; target-select modal → **Skip** = self (players show cosmetic 1/1 stub HP there).
- Editing a subclass = step-7 combobox, then Next ×~9 to final Save (`.mi-skip` guard each step).

### High-level casters + aura/spell-advantage gotchas (SP-067, 2026-08-29)

- Casting ANY Concentration spell silently EVICTS existing concentration auras' targetEffects/activeBuffs (e.g. Hold Person kills Holy Aura state) — never cast another conc spell mid-aura test.
- Wight (Undead, AC 14, +4 melee) = proven fiend/undead-type trigger monster. Flow: card Target select → avatar opens `.mc-overlay` → attack-row `.mc-dice-link` "+4". Save-forcing monster links need Target set FIRST else "DC Unknown" cosmetic roll.
- Area-spell cast = checkbox popup "Fireball (N)"; aura target popup = `.sp-overlay` checkboxes + `.sp-roll-btn` "Cast <Spell> (N)".
- `.command-overlay` (palette) can pop over forced sidebar clicks — close via **Escape**; force-removing it from DOM crashes React removeChild.
- Admin Clear Change Data/Clear Campaign Log **confirm dialogs are session-dependent** (seen with and without) — always arm browser_handle_dialog.
- If accidentally ticked a spell in a wizard, untick and Save; JSON ground truth confirms restore.

### Turn-start aura damage (CLA-170, 2026-08-29)

- auraDamageService `applyHolyNimbusDamage` mutates a fetched combatSummary copy WITHOUT `setCombatSummaryCache` → card HP reverts on next round POST; `lastAppliedTurnStartCreatureRef` gating makes turn-start effects fire once per creature only. (bug-cla-170)
- Monster Remove-NPC confirm text includes live HP — use it as HP ground-truth probe.
- Full PC round walk = exactly 16 `Next →` clicks in current test-campaign lineup; active card via `.creature-card.active input[aria-label="<name> current HP"]`.

### Passive knowledge features / monster IRV (CLA-173, 2026-08-29)

- Joined-encounter combatSummary monsters have EMPTY resistances/immunities, no vulnerabilities (`encounterToInitiative.js:184` reads `damage_resistances`/`damage_immunities` keys that don't exist in monsters.json). monsters.json = only IRV ground truth; anything reading combatSummary IRV sees nothing (bug-cla-173).
- Hunter's Lore = Ranger lv3; surfaces only as `.dice-roll-hunter-lore` on an attack result popup + log entry (`contextBuilder-sync.js:35`, `DiceRollResult.jsx:320`, `LogRollEntry.jsx:177`).
- Hunter's Mark detail popup closes on Cast and consumes the initiative-card Target dropdown set beforehand — set Target FIRST.
- Wizard step headings lag sidebar numbering by ~5 after Spells step ("Step 10: Magic Items" = sidebar 15).

### Hunter's Prey + initiative turn-state (CLA-174, 2026-08-29)

- Hunter's Prey = Ranger → Hunter subclass lv3, `automation.type:'hunter_prey'`; NO app default — modal picker; switch option via Short Rest re-pick.
- `.creature-card.active` highlight resets cosmetically to the first card after attack-Done/view navigation — do NOT trust `.active` for turn state; verify round/keys via change-data JSON.
- Short Rest can drift monster HP (e.g. Zombie 1→3, re-render from statblock-derived state) — re-read monster HP after rests.
- Encounter Builder monster search fuzzy-matches (Zombie → Beholder Zombie/Ogre Zombie rows too); tick the exact "Select Zombie" checkbox row, Qty stepper appears only after ticking.

### EB / popup-dismiss / expiration (CLA-175, 2026-08-29)

- EB at lv14: popup shows ONE beam but resolve applies 3 beams (3d10) — read damage popup/log, not roll display.
- After EB Done a second button-less `.popup-overlay` (damage) appears — dismiss via backdrop corner click.
- `Next →` turn-walk only in Initiative view; re-click Initiative before walking (times out from Log view).
- Modal-bypass lesson: features writing conditions/targetEffects directly (not via expirationQueue) leave stale Incapacitated flags (bug-cla-175) — when a duration "should have ended", check `pendingExpirations` + activeConditions in change-data.

### Area charm / creature-select (SP-069, 2026-08-29)

- NPC saves AUTO-ROLL from combatSummary `saveBonuses.wis` (no prompt); PC saves get `.sp-overlay` prompts — for save-forcing area spells tick NPCs only to keep flow deterministic.
- Sorcerer casts intercept Metamagic panel first → "Cast Without Metamagic".
- CreatureSelectionModal: after all-NPC confirm it may NOT auto-close and backdrop is a no-op — click **Skip** to dismiss.
- Known residual-flag family (bug-cla-175, seen again SP-069): on break, only `charmed` clears; `incapacitated`+`speed_zero` linger cosmetically. Log reason strings can be mislabeled ("Animal Friendship") — cosmetic.

### ResourcePoolModal conversions (CLA-176, 2026-08-29)

- Nature Magician = Druid lv20 class feature (data dup note at lv18 Archdruid text). Wild_Sage_Druid now lv20 Circle of the Stars.
- Clicking spell-slot level header `.char-spell-slot-level.level` EXPENDS one slot of that level — expend first so "+1 converted slot" is observable (slots clamp at max).
- Feature-row getByText may match lv18 description text first — actionable Special Actions row is `.nth(1)`; stale refs after re-render ⇒ browser_find + click by ref.

### Passive-with-no-impl pattern + remote MCP (CLA-177, 2026-08-29)

- Passive traits plumb through `passive.js → automationRouter passives → turnStartEffects collection` with ZERO consumer branches = no observable automation; runtime CONTROL test (non-holder gets identical behavior) is the decisive proof — mark INCOMPLETE (needs design), don't burn retries.
- `.playwright-mcp/*.yml` saved files may be unreadable from workspace (remote MCP) — keep verification inline (run_code_unsafe returns / browser_find).
- Initiative monster Remove button = `.npc-remove-btn` (icon, title "Remove NPC"; has-text doesn't match).
- 2024 Halfling has no subrace step; Naturally Stealthy row sits in sheet Actions, click = no-op popup.
- Wizard bulk click-through: loop Next + auto-selectOption(1) where disabled (Background/Class/Subclass); Save enables after Subclass.

### Wizard school savants (CLA-178, 2026-08-29)

- Savant features are at **level 3** in 2024 classes.json — lv2 sheet shows NO row; test wizard must be lv3+.
- New-slot-level-up grants are MANUAL re-open (`onSavantLevelUp` dead code); picker prefilled with current selection, append retains old.
- `.char-special-actions .clickable` row click opens picker with `<select>`s + Confirm; popup persists as `[data-testid="popup-overlay"]` intercepting clicks — click-to-dismiss before touching sheet again.
- `✓Save` sidebar button: getByRole('Save',exact) never matches — click via evaluate textContent regex `/✓\s*Save/`.
- Clear-verification: trust ground-truth file absence, not dialog telemetry (admin confirms unreliable in remote MCP).

### Inert feature rows / spell grants (CLA-179, 2026-08-29)

- Feature rows gated by `INTERACTIVE_HANDLER_TYPES` (automationService.js): missing type ⇒ silent INERT text row, no console error. Verify onclick/className on the `<b>`, not just row presence (bug-cla-179).
- `casting_time: '1 bonus_action'` (underscore) never matches space-format categorizers (rules.js/attackCalc.js) ⇒ no Bonus Actions row — check string format when a BA feature "disappears".
- Edit-wizard spell step: tick `.list-item-checkbox-trigger` inside `.list-item-body` (row body click only opens details); dismiss lingering `.mi-skip` "Skip for now" BEFORE row clicks.
- Edit wizard step chips ("14 Spells") jump directly between steps — no Next×17 needed.

### Rests / .mc-overlay dice links (CLA-180, 2026-08-29)

- Short/Long Rest need TWO clicks: "Short Rest" then separate **"Complete Short Rest"** (no overlay wrapper — invisible to overlay detection; rest silently idles otherwise).
- `.mc-dice-link[0]` "+4 (14)" is the INITIATIVE die — weapon attack links come AFTER ability/skill links (later indices); count carefully before clicking.
- `.mc-overlay` survives view navigation and intercepts avatar/remove-btn clicks — click its `×` before touching cards.
- Multi-part monster damage rollback is under-negated (lastAttack stores only primary; e.g. Wight 4+8 recorded 4/4/4) — rollback features inherit this (known).

### Passive proficiency grants (CLA-181, 2026-08-29)

- 2024 subclass proficiencies flow ONLY via major.bonus_skill_proficiencies (count), major.bonus_proficiencies (tools/weapons), or stored skillProficiencies. Free-text "Gain proficiency in…" in major feature descriptions is NEVER parsed (race traits have a parser, majors don't) ⇒ silent no-op grants (bug-cla-181).
- Recompute expected proficiency totals from JSON ability scores before judging PASS/FAIL — registry ability values can be stale (MercyMonk WIS 16 +3, not +5).

### 9th-level / imprisonment (SP-070, 2026-08-29)

- Imprisonment = Wizard/Warlock lv9 only (2024 spells.json) — Cleric cannot prepare. DivinationWizard lv20 exists for lv9 needs.
- Imprisonment automation: NO mode picker — prisonType fixed "Burial"; marker effect only (no Restrained/Unconscious applied); save DC = target-side `auto.saveAbility||'WIS'` (not caster INT); success immunity unimplemented (narrative gaps, accepted as PASS-subset).
- NPC auto-roll saves can leave the `.sp-overlay` up — dismiss via `.sp-dismiss-btn`. Spell-step checkboxes need trusted clicks (evaluate clicks double-toggle); verify `checked` class.

### Brutal Strike ladder (CLA-182, 2026-08-29)

- This dataset: Brutal Strike lv9, **Improved lv13** (lv17 2d10) — verify classes.json before leveling.
- lv9+lv13 riders both 1d10: dice-count stable-sort keeps lv9 → Improved options unreachable in picker (bug-cla-182). `next_attack_bonus` consumed only by owner, not allies (Sundering never spends).
- Reckless+Brutal modal without initiative Target set burns once-per-turn mark silently; radios render only after ticking "Use Brutal Strike".

### Wild Shape damage types (CLA-184, 2026-08-29)

- Improved Circle Forms = Circle of the **Moon** lv6 (Wild_Sage_Druid subclass edited Moon lv20 kept if next rows need Moon).
- damageTypeChoice picker only fires when data damageType contains " or " — "Radiant" alone hard-swaps ALL Wild Shape attacks to Radiant, no per-hit modal (bug-cla-184); +bonus dice declared in data never applied by that path.
- Wild Shape flow gotchas documented in bug-cla-184 file: animated overlays need timeout overrides; popup-overlay pointer interception; shape_shift toggle-before-form ghost rows.

### Battle Master riders vs Cleave mastery modal (CLA-186, 2026-08-29)

- Heavy mastery (Cleave) post-hit picker has a NO-OP Skip (`onSkip: () {}`) — it occupies the post-Done modal slot and suppresses the attack-rider modal. Workaround: resolve Cleave against a PC (clean via Admin clear) or navigate away to unmount CharActions.
- Attack-rider modal appears only when runtime `BattleMasterManeuvers_selection` non-empty — pick maneuvers first via "Combat Superiority" feature-row picker. Miss roll popups have no Done button (click popup body).
- MN-009 currentRolls crash did NOT reproduce in this run (rider modal + damage + logs worked) — bug may be intermittent/manifests only with specific maneuver (Goading) + flow; keep both records.

### Passive crit-range / Improved Critical (CLA-187, 2026-08-29)

- Improved Critical is **Champion-major-only** in 2024 classes.json (`automation: passive_rule / critical_range / "19-20"`, lv3) — NOT base Fighter, NOT lv15. A base/Battle Master Fighter correctly does NOT crit on nat-19; never file bugs against non-Champion fighters for 19-20.
- Verify crit by looping the `.clickable` dice link that matches the attack bonus (last match = attacks table row), read `.dice-roll-result` innerText for `d20 (\d+)` + `/critical hit/i`, dismiss via `.popup-overlay` corner click. Nat-19 popup shows "CRITICAL HIT! — DAMAGE DICE DOUBLED"; log roll entry carries `isCrit=true`.
- **Greataxe Cleave second-target modal is UNCLOSEABLE** — `onSkip` is a noop (`src/services/combat/automation/steps/attackRollPostDamage.js:424`); a Cleave hit blocks the sheet until page reload. Use a non-Cleave weapon (Shortsword) for multi-roll attack tests.
- Attacker initiative-card Target dropdown `selectOption` does not always persist for cards added mid-session (popups show no "vs AC"); select target before/at staging so AC renders.

### Cunning Strike rider + sneak damage (CLA-188, 2026-08-29)

- Rogue unarmed fallback has NO finesse property → sneak attack won't land without a finesse weapon; equip Shortsword via Edit-wizard Inventory "Equipped Items" textarea (inventory.equipped). 2024 sneak progression in this data is evens/odd (lv14 = 7d6).
- lv14 Cunning Strike rider picker renders as **"Devious Strikes"** (base-Rogue lv14 in this dataset, maxEffects 2, all 6 options incl. the ICS trio); "Improved Cunning Strike" header only appears lv11-13 (`attackRollRiders.js:70-73`). Don't expect a literal "Improved Cunning Strike" header at lv14.
- **PITFALL (bug-cla-188):** after selecting Cunning Strike effects and Done, the weapon+sneak DAMAGE never applies — the `cunningStrike` pipeline pause (`actionPipeline.js:46-58`) has no resume branch (`useAttackDamageResolution.js:232-266`); recovery branches in `handleAttackRiderClose` are dead (autoDamageContext synced value has zero writers; `pendingDamage?._cunningStrike` never set; `else if (autoDamageContext)` at `CharActionModals.jsx:295` shadows the fallback). Rider selection, `_cunningStrikeCostUsed`, and `targetEffects` all update correctly — only damage is lost. A control hit (no rider) in the same round also dealt 0 → confirms the pipeline never resumed.

### Trickery Domain / duplicity automations (CLA-189, 2026-08-29)

- Improved Duplicity is **lv17** in 2024 classes.json (manifest "lv6" stale) — convert Divine_Cleric Life→Trickery lv17 to test. Invoke Duplicity = Channel Divinity feature row (CD max 3 at lv17); picker "Improved Duplicity — Choose Allies" grants Advantage; sets buff `create_illusion` + `isImprovedDuplicity:true`.
- Caster's own attack near the duplicate always shows two-d20 ADVANTAGE from the **base** duplicity branch (`contextBuilder-sync.js:475`) which ignores the improved flag / 5ft — this is NOT proof of Enhanced Distraction. Always verify the **granted ally's** roll popup `mode` field (bug-cla-189: ally gets `mode:"normal"`, no advantage — `invokeDuplicityAdvantageTargets` has zero PC-roll consumers; `getDuplicityAdvantageAgainst` no-map callers pass wrong-arg shape so it dead-returns false).
- Healing Illusion half (illusion ends → regain HP = Cleric level, exact +17 at lv17) works — heal modal → Heal → log `hp_change delta:+level`.
- Never re-roll initiative mid-duplicity: `Initiative.jsx:373` wipes activeBuffs. `.mc-overlay` intercepts `.npc-remove-btn` clicks — dismiss it first. Admin Clear dialogs may need arming twice/chained.

### Base-class lv15 upgrades / no-UI-readout range features (CLA-190, 2026-08-29)

- "Improved Elemental Fury" is **base Druid lv15** in 2024 classes.json (`damage_bonus`, `upgrades:'Elemental Fury'`, `damageExpression:"2d8"`, `rangeBonusCantrip:"300 ft"`) — subclass-irrelevant. Real impl: `automationCollector.js:89`, `featRangeService.js`, `damageCalculation.js` `computeRange`, `attackRollBonuses.js:169` (manifest handler paths stale).
- Primal Strike half fires via the Special Actions "Elemental Fury:" picker → choose "Primal Strike"; base-row option key consumed is `_Elemental_Fury_option` (NOT the improved-row key). After an auto-rolled HIT, a "Damage Type" modal appears → pick element → damage popup shows the `+2d8` extra dice; `_Improved_Elemental_Fury_usedRound` gates once-per-turn.
- **Range-boost features have NO spell-detail readout** (SpellDetailPopup shows raw range). Verify via in-page dynamic-import runtime probe with the real modules: collector → `cantrip_range_bonus`=300, `computeFeatRangeEffects`=300, `computeRange(cantrip)` no auto-miss vs `{bonus:0}` control. Moon Druid unarmed hits also emit Lunar Radiance 2d10 radiant noise — expected, unrelated.

### Rogue Cunning Strike rider flow + damage-loss pitfall (CLA-188, 2026-08-29)

- 2024 Unarmed Strike fallback (no weapons equipped) has **no `properties`** in attackCalc2024.js → finesse gate fails → sneak 0. Equip Shortsword via Edit-wizard Inventory step **"Equipped Items" textarea** (free text, comma-separated) + sidebar `✓ Save`; verify `inventory.equipped` in character JSON after 15s.
- lv14 sneak = **7d6** in this dataset (odd lv13/14 = 7). 2024 Rogue lv14 base class ALSO has `Devious Strikes` (maxEffects 2, merged 6 options) — `buildCunningStrikeStep` prefers Devious Strikes > Improved Cunning Strike > Cunning Strike, so lv14 picker header is "Devious Strikes"; exact ICS header needs lv11-13 rogue.
- Prone added via initiative-card Add modal gives melee advantage → sneak eligible + "vs AC" line in popup (no map needed). `Add` modal: click condition text then Apply.
- Rider modal multiselect: tick option `<label>` inputs, "N/2 selected" counter, **Apply Effects** button; save prompts `.sp-overlay` "Roll Save" → Done → summary popup lists both options + "(Forgoing 2d6 ...)" — all good.
- **PITFALL (bug-cla-188):** after Done the Cunning Strike step pauses the pipeline (`_modalType:'cunningStrike'`) with NO resume branch → weapon+sneak damage never rolls (no popup/log/HP change), `_SneakAttack_usedRound` never set. Control hit same round (once-per-turn consumed, no modal) also deals zero damage — post-Done autoDamage application dead for PC sheet attacks vs EB monsters. Do not trust "effects applied" popups as full E2E; check HP + damage log.
- Lingering `.popup-overlay` (e.g. from a character whose popup had no Done because target didn't resolve) silently intercepts later clicks on another sheet — dismiss via backdrop-corner click or `dispatchEvent(new MouseEvent('click'))` on `.popup-overlay`.

### Trickery Cleric / Invoke Duplicity flow (CLA-189, 2026-08-29)

- **Improved Duplicity is lv17** in 2024 classes.json Trickery Domain (manifest "lv6" stale) — lv3 gets base Invoke Duplicity only. Edit-wizard step-7 chip jump + `selectOption('Trickery Domain')` + first "✓ Save" found persists subclass in one shot; level untouched.
- Activate sheet row "Invoke Duplicity:" (combat_stance) → CD−1 (lv17 max 3 from `class_levels[].channel_divinity`; verify consumption against the DATA max, not the hard-coded 2 fallback seen in other features) → buff `create_illusion` + `isImprovedDuplicity:true` → "Improved Duplicity — Choose Allies" CreatureSelectionModal (tick row checkbox via evaluate, "Grant Advantage (N)" writes `invokeDuplicityAdvantageTargets` + log).
- Caster-self attacks show two-d20 ADVANTAGE popup via `contextBuilder-sync.js:475` (base-duplicity branch, ignores improved flag + 5ft) — do NOT count that as proof of Enhanced Distraction; test the granted ALLY's attack roll too (log `mode` field + d20 count in popup is the ground truth). Granted ally advantage never applies: picker targets have no PC-roll consumer; `getDuplicityAdvantageAgainst` no-map callers pass `{campaignName, skipRangeCheck}` but signature is `{attackerName, mapData}` → dead false (bug-cla-189).
- Healing Illusion: re-click same feature row while buff active → SecondaryTargetModal radio list incl. monsters → "Heal" → log `hp_change isHealing:true delta:level` capped at maxHp; buffs clear.
- **PITFALL:** `initiative-rolled` listener (Initiative.jsx:373-381) wipes ALL player `activeBuffs` + `invokeDuplicityAdvantageTargets` — never re-roll initiative mid-duplicity; Join Encounter rolls once, then leave it.
- `.mc-overlay` (opened for monster attacks) survives view navigation and blocks `.npc-remove-btn` — click its `×`/Escape before card cleanup; Remove NPC confirm carries live HP ("Wight 1 has 73 HP") — usable HP probe; Admin clears here DID show confirm dialogs (both chained: handle twice).
- Wight = proven HP-deficit generator vs AC12 PCs (+4 Necrotic Sword ~4-7/hit; ~4 clicks to reach 17+ deficit, change-data currentHitPoints is the live probe).

### Base-class lv15 upgrades / no-readout range features (CLA-190, 2026-08-29)

- Improved Elemental Fury is **base Druid lv15** in 2024 classes.json (`damage_bonus` `upgrades:'Elemental Fury'`, 2d8) — subclass irrelevant; lv7 gets base Elemental Fury (1d8). Pick its option via Special Actions **"Elemental Fury:" row picker** → writes `_Elemental_Fury_option`; the attack consumer (`attackRollBonuses.js:188 buildWeaponHitBonusesStep`) reads `_${upgrades||name}_option` so the **base-row key is the one consumed** — the improved-row picker writes only `_Improved_Elemental_Fury_option` (badge key).
- Hit flow: sheet dice link auto-rolls → HIT popup → **Done** → "Improved Elemental Fury — Damage Type" modal (Cold/Fire/Lightning/Thunder from " or " damageType) → damage popup `+ 2d8 [type]`; once-per-turn via `_Improved_Elemental_Fury_usedRound` (2nd same-round hit: no modal, no dice) — clean feature, unlike CLA-184/CLA-188 crash paths.
- **No UI readout for cantrip +300 ft**: chain is collector `rangeBonusCantrip→cantrip_range_bonus` passive → `featRangeService.computeFeatRangeEffects` → `damageCalculation.computeRange` which needs map attackerPos+targetPos (grid 5 ft/cell); SpellDetailPopup shows raw `spell.range`. Verify range half by in-page dynamic import probe in dev: real modules + `/data/2024/*.json` → assert featEffects.cantripRangeBonus=300 and `computeRange(cantrip,{},posA,posB,featEffects)` returns `{}` at >base distance while `{cantripRangeBonus:0}` control returns `isAutoMiss`. NB computeRangeEffect doubles range for long-range, so pick probe distance > base×2 but ≤ boosted×2 to isolate the bonus.
- Circle of the Moon lv6 Lunar Radiance adds `2d10 [radiant]` to lv20 unarmed hits in this data — expected extra dice in Druid formulas, not a Primal Strike artifact.

### Improved Shadow Step / temp teleport (CLA-191, 2026-08-29)

- Improved Shadow Step = **Warrior of Shadow lv10** in 2024 classes.json (manifest "lv11+" stale); real impl is `tempTeleportHandler.js` (manifest classFeatureHandler paths don't exist). Shadow Step row lives in Special Actions (lv6+).
- Set the Monk's initiative-card Target dropdown = monster BEFORE teleporting — the resolved Target IS the "creature in the space you left" (no map/position logic). TeleportModal → teleport → popup names the target with perception-disadvantage + WIS save prompt.
- Save prompt needs a manual **"Roll Save"** click (`createSaveListener`) — NPCs do NOT auto-roll here; Rug WIS −4 vs DC 18 = deterministic fail → `activeConditions:["blinded"]` + Blinded badge.
- **PITFALL (bug-cla-191):** `tempTeleportHandler.js:125-161` writes Blinded + te directly WITHOUT enqueueing `pendingExpirations`, so `expireStaleEffects`/`expirationQueue` never clear them — walk a FULL round (to the monk's next-turn start) and re-read change-data before declaring PASS. Perception-disadvantage renders no card badge (verify via te in change-data). Admin clears + Remove-NPC showed confirm dialogs this session.

### Multi-automation feature rows / War Magic (CLA-192, 2026-08-29)

- Improved War Magic = **Eldritch Knight lv18** in 2024 classes.json (manifest lv15 stale). EvasiveFighter converted BM lv10 → EK lv18 for this.
- **PITFALL (bug-cla-192):** a feature whose data has `automation:[cantrip, spell]` (or multiple automation entries) is deduped by `uniqBy('name')` and the sheet builds the row from `automation[0]` only (`automationService.js:69`, `featureCategorizationUtils.js:73/94/143`) — so the lv18 "Improved War Magic:" row dispatches the lv7 **cantrip** picker and never surfaces the spell half. "Replace Attack" is log-only (`warMagicSpellHandler.js:61-90`): no spell resolution, no slot spend, no extra-attack grant, no damage (target HP unchanged — verify via Remove-NPC HP probe). Don't misfile the cantrip picker as a wrong-subclass issue; the row click proving cantrip-only IS the dedupe bug.
- Shortsword (non-heavy) avoids the Cleave-modal noop for EK attack tests. EK milestone level-up needs a Long Rest to refresh spell slots (playbook SP-060 note).

### Warding Flare reactions / CLA-193 (2026-08-29)

- Warding Flare is **Light Domain lv3** and Improved Warding Flare **lv6** in 2024 classes.json — NOT War Domain (manifest wrong). War_Cleric converted Light lv6; Guided Strike vanishes after the swap (fine, one subclass per cleric).
- Flow: monster Target select=ally → `.mc-overlay` → attack `.mc-dice-link` (Wight "+4" at idx 9/10, idx 0 = initiative) → auto-roll popup → **Done** → PC sheet Reactions "Warding Flare:" click → popup shows original roll + "Disadvantage (second d20: N)" final=min + hit→miss rollback heal + "gains X Temporary Hit Points from Improved Warding Flare" (X=2d6+WISmod, WIS 9/-1 → 1..11) → `wardingflareUses` 1→0 tracker + change-data.
- Short Rest restore needs NO special gate: `wardingflareUses` is in SHORT_REST_RESOURCES (restRules-constants.js:160) reset unconditionally — the Improved-specific gates in ShortRestModal.jsx:339 + restRules-shortRest.js:46 check `specialActions` which is EMPTY for subclass majors, so modal omits "Warding Flare" from Resources Restored (cosmetic only; sheet shows 1/1 after Complete Short Rest).
- Noise on hit→miss rollback: `setRuntimeValue called with undefined campaignName` + 400 `/api/campaigns/undefined/<target>` (CharReactions.jsx:218 heal path) — heal still applied. `rulesFactory.getPlayerStats('name')` in-page direct call crashes (`applyFeyShadowTouchedSpells rules-helpers.js:37`) — don't probe playerStats that way; use sheet text + change-data.
- Remove-NPC confirm carried HP probe ("Wight 1 has 82 HP") — unchanged HP confirms rollback.

### Innate Sorcery / base-Sorcerer aura (CLA-194, 2026-08-29)

- **Innate Sorcery is BASE Sorcerer lv1** in 2024 classes.json (`automation.type: sorcery_aura`, uses 2, long rest, bonus action) — NOT Aberrant Mind/subclass-gated (manifest guess wrong). DraconicSorcerer lv6 qualifies as-is; never convert subclass for it.
- Real impl: `src/services/automation/handlers/resources/sorceryHandler.js` (manifest classFeatureHandler paths stale); buff = `activeBuffs` entry `{name:'Innate Sorcery'}` via `buffService.js`; uses key `innateSorceryUses` (in LONG_REST_RESOURCES).
- Flow: Special Actions "Innate Sorcery:" row click → popup "activated (1/2 uses remaining)" → sheet badge "+1 Save DC, Spell Adv" + Save DC readout +1 + spell rows re-render "DC 15 DEX" → spell-attack "+6" dice link opens Metamagic panel → "Cast Without Metamagic" → roll popup shows two d20s `Advantage` mode. Set initiative-card Target = monster first for "vs AC" line.
- Spell-attack "+6" cell locators collide across rows (`getByText('+6')` matches Fire Bolt first — cantrip row is FIRST in table); Chromatic Orb "+6" is `.nth(2)` in test-campaign layout, or click exact per-row cell ref.
- Cosmetic-only note: Fireball spell-log entry keeps raw `saveDC:14` while the effective save resolves at `saveDc:15`; no round-based consumer expires the 1-minute activeBuffs buff (cleared only via rest/clear-change-data via clearAllExpirationEffects) — same bypass family as CLA-175/191.

### Warding Flare reactions / Light Domain (CLA-193, 2026-08-29)

- **Warding Flare = LIGHT Domain, not War** — base lv3 (`reaction_debuff`/disadvantage-on-attack-roll), **Improved lv6** (`passive_rule`, `tempHpExpression: 2d6 + WIS`) in 2024 classes.json (manifest "War lv18" wrong). Real impl: `reactionDebuffHandler.js`, `restRules-shortRest.js:46`, `restRules-constants.js:160`.
- Flow: monster attacks an ALLY via its `.mc-overlay` `.mc-dice-link` → HIT popup → click "Warding Flare:" reaction in CharReactions → popup shows second-d20 disadvantage re-roll flipping to MISS + "target gains N Temporary Hit Points" (`tempHp` in change-data = 2d6+WIS). Reaction uses tracked by `wardingflareUses` (max 1 at lv6).
- Short Rest refill: "Short Rest" → "Complete Short Rest" → `SHORT_REST_RESOURCES` resets `wardingflareUses` to null→max. NB the ShortRestModal specialActions gate never matches subclass majors — the label may be hidden (cosmetic), refill still fires (verify via change-data).
- Rollback/heal logs emit `setRuntimeValue undefined campaignName` + 400 noise but still heal — noise, not failure. Do NOT call `getPlayerStats` directly in-page (crashes).

### Indomitable / Fighter save reroll (CLA-195, 2026-08-29)

- Indomitable = base **Fighter lv9/13/17** in 2024 classes.json (`auto_reroll`/`saving_throw`/`bonusExpression:"fighter_level"`, long-rest recharge). Manifest handler paths don't exist; real chain: `automationModifiers.js:35` → `conditionEffectsInternal.js:233` → `CharSheet.conditionEffects.js:69-83` (bonus→fighter level) → `CharAbilities.jsx:227` → `DiceRollResult.jsx:376`.
- **The reroll only surfaces on the Fighter's OWN ability-table Save cell popup** (`.dice-roll-reroll-btn "+Reroll (+lvl)"`), NOT on a monster-forced `.sp-overlay` save. Ability-table `.clickable` row order is Name→check→Save→skills (Save = idx 2). Click → "d20 X (reroll) +lvl" shows the +fighter_level bonus applied and the new roll is used.
- **PITFALL (bug-cla-195):** `indomitableUses` is NEVER written (runtime/change-data stay null after a reroll) — `onReroll` is undefined (`CharSheet.modals.jsx:168-189` omits it from AttackResultPopup; `CharAbilities.jsx:15` destructures it as unused `_onReroll`), so the once-per-long-rest limit is unenforced (rerolled repeatedly) and no /indomitable|reroll/i log is written. Sheet save popups also show "DC Unknown — no success or failure" yet still offer the reroll button even on non-failed rolls. Aeromancer-forced `.sp-overlay` save-fail popup has NO Indomitable button (SavePromptModal only lists Fanatical Focus/Disciplined Survivor/Living Legend/Guarded Mind).

### Indomitable Might / conditional_replacement (CLA-196, 2026-08-29)

- **Indomitable Might is base Barbarian lv18** in 2024 classes.json: `automation: {type:'conditional_replacement', target:'ability_check', saveType:'STR', condition:'low_total', replacementAbility:'STR', casting_time:'passive'}`. VERIFIED PASS 2026-08-29 on Barbarian lv13→18 (STR 16, check +3): STR check cell `.clickable` idx 19 auto-rolls; whenever raw d20+bonus < STR score the popup shows `→ 16 (Indomitable Might)` EXACTLY (raw totals 6/15/7/5/13/6 all raised to 16; d20 13+3=16 == score correctly NOT replaced; 19+3=22, 20+3=23 unreplaced), and campaign log writes `ability_use` `Indomitable Might … replaced by Strength 16` for every floored roll. Passive — no button; floor applies at roll-result time.
- **PITFALL:** automation `target` is `ability_check` ONLY — `conditionEffectsInternal.js:243-251` sets `strCheckReplace` but NOT `strSaveReplace` (needs target saving_throw), so the STR **save** cell (idx 20, +9 w/ Rage advantage) is never floored by data design; don't chase save rolls below 16 (needs both advantage dice ≤6). Real chain: `automationModifiers.js:62` → `conditionEffectsInternal.js` → `CharAbilities.jsx:162-166` (strScore ctx) → `DiceRollResult.computed.js:70-72` (floor) → `DiceRollResult.jsx:166` render + `useLoggedDiceRollAttack.js:143-153` log. Manifest handler/router/infoBuilder paths don't exist.
- lv18 milestone level-up via Edit wizard: `locator.fill()` the Basic-Info `input[type=number]` then click sidebar `✓Save` (regex `/✓\s*Save/`), wait 15s, JSON `level:18`. Ability-table `.clickable` indices in test-campaign sheet: Strength name=18, STR check=19, STR Save=20, Athletics=21 (preceded by HP/gold/rage counter clickables). Roll popups have no Done — dismiss via `dispatchEvent('click')` on `.popup-overlay`, guarding with a count check (dispatching when none open throws).

### Roving Aim / Steady Aim passive modifier (CLA-197, 2026-08-29)

- **Infiltration Expertise = Rogue → Assassin major lv9** in 2024 classes.json (`automation: passive_rule / roving_aim`) — NOT base Rogue. Masterful Mimicry half has no automation (flavor by design); only Roving Aim (Steady Aim keeps Speed) is automated.
- Manifest handler/router/infoBuilder paths don't exist. Real chain: collector default branch (`automationCollector.js` → `automationRouter.js:195` pushes passive_rule into `passives[]`) → consumer `src/services/automation/handlers/class-fighter-rogue/steadyAimHandler.js` (dispatched `steady_aim` at `src/services/automation/index.js:446`) checks `playerStats.automation.passives.some(p => p.effect==='roving_aim')` and skips the `speed_zero` activeCondition; turn-end clear via `turnStartEffects.js:70` → `steady_aim_clear` (`rules/effects/turnStartEffects.js:109`).
- Flow (no combat/monster needed): sheet Bonus Actions "Steady Aim:" row click → popup "Steady Aim activated! … (Roving Aim: Speed not reduced to 0)" + sheet "Adv" badge; change-data shows `next_attack_advantage` te for the rogue while `activeConditions: []` and sheet Speed stays 30 ft — that te-present/speed_zero-absent pair is the decisive PASS evidence.
- Cosmetic pitfall: the campaign log entry is hard-coded "Speed 0 until end of turn" (`steadyAimHandler.js:84`) even when Roving Aim suppressed the condition — don't FAIL on the log wording; trust activeConditions + popup text. Re-clicking Steady Aim toggles it off ("cancelled"). `steadyAimSpeedZero` runtime flag stays true while active even WITH Roving Aim (toggle bookkeeping only, not a speed penalty).

### FT-046 Inspiring Leader / rest-triggered ally temp HP (2026-08-29)

- **HeroesFeastBard (lv17, CHA 20/+5, WIS 10) already has `feats:["Inspiring Leader"]`** in JSON — no grant needed. 2024 feats.json models it as benefits[1] **"Bolstering Performance"** `automation:{type:'temp_hp_buff', multiTargetAlly:true, tempHpExpression:'level + Math.max(CHA modifier, WIS modifier)', targets:6, casting_time:'passive'}`. Manifest featHandler/featRouter/featInfoBuilder paths don't exist; real chain: rules.js:255+ puts feat in specialActions (passive→else branch) → INTERACTIVE row **"Bolstering Performance:"** in Special Actions (row is named after the BENEFIT, not the feat) → automationRouter.js:132 → `tempHpBuffHandler.js handleMultiTargetAllyTempHp`.
- Flow: "Short Rest" → "Complete Short Rest" → click row → `.sp-overlay` CreatureSelectionModal ("Each target gains N temporary hit points.", N=level+max(CHA,WIS) mod when no `featAbilityChoices` assignment; 17+5=22) → tick `label.secondary-target-row` allies → **"Inspire (N)"** → confirmation popup + change-data `tempHp:N` per target (debounce ≥11s) + `ability_use` log. setTempHp keeps MAX of existing. Range 30 ft skipped with no map (all PCs listed).
- Registry pitfall: Bard_Spellcaster.json no longer exists — Bard tests use HeroesFeastBard.

### Self-damaging owner auras & the turn-start gate (CLA-198, 2026-08-29)


- **There is NO turn-END consumer in this app.** "At the end of each of your turns" auras (Inner Radiance `damage_aura`, Holy Nimbus) are modelled as **turn-START** effects in `src/services/rules/effects/turnStartEffects.js`, keyed on a runtime `activeKey` on the **active creature**. For OWNER-centric auras this means they can only ever tick on the owner's own turn start, never the turn end — expect timing mismatch, not a missing handler.
- **The decisive probe is `change-data.combatSummary.lastAppliedTurnStartCreature`, not the active card.** `createNextCreatureHandler` (`navigationHandlers.js:31`) early-returns on every `Next →` that does NOT wrap to initiative index 0 (`getNextCreatureName` sets `roundIncrement:true` only on last→[0]). So `applyTurnStartEffects` fires only for whoever sits at index 0. Put a monster at index 0 (it will win initiative with a high roll) and the owner's aura can NEVER tick by walking turns — HP frozen + gate key never naming the owner = FAIL, no console errors needed.
- **Confirm damage logic in isolation** by calling it directly in-page before filing: `await import('/src/services/rules/rules.js')` → `rules.getPlayerStats(classes2024, equipment, magicItems, races2024, spells, charJson)` (char JSON via `/campaigns/test-campaign/<Name>.json`; force `inventory.magicItems=[]` or `getMagicItems` throws) → `applyTurnStartEffects('<Name>', stats, 'test-campaign', [{name:'<Name>', computedStats:stats}])`. If HP drops by the right amount, the bug is wiring/gating, not the service.
- **Activation-burst collateral:** auras whose handler calls `applyAuraDamage` in `confirm…` (`celestialRevelationHandler.js:167`) damage EVERY creature in range the instant you Transform — with no active map, `isWithinRange` returns `true` for all 19 PCs, so all of them take the tick (can knock a low-HP PC to death saves). Expect the -5 log spam and dismiss `.dsp-overlay` (Roll Death Save/Done loop) before touching cards.
- `applyAuraDamage` calls that sit unconditionally inside the `for (const effect of turnStartEffects)` loop tick **once per matching entry** (AasimarTest has 3 entries: `inner_radiance_turn_start` + 2× `steady_aim_clear`) — so if the gate ever does fire, damage multiplies.
- No badge: `CharSummary.jsx` `void`-subscribes `innerRadianceActive` with no renderer — absence of a light/buff badge is a real gap, but is not by itself the FAIL; lead with HP/log/gate evidence.
- Aasimar 2024 activations surface ONLY as the "Celestial Revelation:" Special Actions row (`featureCategories.js` ignores "Inner Radiance"); subrace is irrelevant (base Aasimar qualifies at lv3+), uses tracked as `_celestialRevelationUses`.

### Bard movement reactions / College of Dance majors (CLA-199, 2026-08-29)

- **Inspiring Movement = College of Dance MAJOR lv6** in 2024 classes.json (`majors[0].features[1]`, `reaction_bonus`/`self_and_ally_reactive_movement`) — NOT base Bard lv6 (manifest wrong); a Lore Bard sheet shows NO row at all. Convert via Edit-wizard step-7 chip → combobox `selectOption('College of Dance')` → `✓ Save` → 15s → JSON ground truth.
- Flow (manual-click reaction, works no-map): sheet Reactions "Inspiring Movement:" → `.sp-overlay` "Inspiring Movement — Choose Ally" (all 18 combatants incl. Wight 1 listed, range skipped) → click `.secondary-target-row` ally → **Move** button. Writes `inspiringMovementNoOA` self + `inspiringMovementGranted`/`inspiringMovementNoOA` ally + `pendingExpirations` (`inspiring_movement_no_oa`/`inspiring_movement_granted`) + ability_use log — flags and log are the movement evidence (no token on gridless board).
- **PITFALL (bug-cla-199):** Bardic Inspiration is NEVER spent — consume block gated `if (usesMax > 0)` reads only `auto.uses_expression/usesMax/uses` which the data+infoBuilder don't provide (`reactionBonusHandler.js:569-644`); `resourceCost:'bardic_inspiration'` is ignored. `bardicInspirationUses` stays 5/5. Fix pattern exists in `reactionDebuffHandler.js` (`_trackedResources.bardicInspirationUses.max`).
- **PITFALL:** College of Dance lv6 `passive_rule/agile_strike` auto-chains inside `applyInspiringMovement` (`reactionBonusHandler.js:680-698`); with no enemy target the final popup is Agile Strikes' error "No target selected for Agile Strikes" shadowing the Inspiring Movement popup — flags still written, don't mistake popup text for total failure; check change-data + log.
- No-OA consumer probe: OA click vs a flagged creature → "protected by Inspiring Movement" popup (`CharReactions.jsx:199-205`).
- Wight EB monster card: `.creature-card` filtered by hasText fails (name lives in an INPUT value, not textContent) — locate by input aria-label scan or `.creature-card.nth(idx)`; Remove-NPC confirm carries HP ("Wight 1 has 82 HP"). Admin Clear dialogs shown this session (arm both).

### Inspiring Smite / post-cast trigger dead zone (CLA-200, 2026-08-29)

- **Inspiring Smite = Oath of GLORY major lv3** in 2024 classes.json (`majors[1].features[0]`, `post_cast_inspiring_smite`) — NOT Oath of Devotion (manifest wrong, matches 2024 PHB). Convert via step-7 chip → `selectOption('Oath of Glory')` → `✓ Save` → 15s JSON.
- **PITFALL (bug-cla-200):** feature has NO reachable activation. Casting Divine Smite (2024 spells.json, no `dc`) returns at `spellCastService/execution/index.js:566-568` (`handleNoSavePath`) BEFORE the post-cast trigger block at :571-588, and `post_cast_inspiring_smite` is absent from `INTERACTIVE_HANDLER_TYPES` so the Special Actions row renders `<b className="">` inert (CLA-179 family). lastAttack gate data DOES exist (`attackName:"Divine Smite"` — top-level change-data key, NOT under `campaign`).
- Isolation pattern that proves service-vs-wiring: in-page `import('/src/services/automation/handlers/class-cleric-paladin/inspiringSmiteHandler.js')` + `handle(action, {name, level:20, class:{class_levels}}, 'test-campaign', null)` dispatches `inspiring-smite-pending` → real InspiringSmiteModal on the mounted sheet; tick `.secondary-target-row` checkboxes, set `.inspiring-smite-amount-input` via native setter+input event, `.sp-roll-btn` "Inspire" → tempHp/CD/log all verify (2d8+level math exact, CD spent at CONFIRM not trigger).
- No-map target list = runtime `selectedAllies` + self (`useAllySelection.js:7-13`) — seed via `setAllyList()` in-page or popup lists caster only; combatSummary PCs are NOT auto-listed (unlike FT-046).


### Rage-fused bonus-action movement / Instinctive Pounce (CLA-201, 2026-08-29)

- Instinctive Pounce = **base Barbarian lv7** in 2024 classes.json (`temp_buff`/`rage_bonus_movement`/`triggerOnRage`) — manifest "lv6" stale; manifest handler/router/infoBuilder paths don't exist. Real consumer: `combatStanceHandler.js:281-286` (Rage branch) + `:318-320` popup description; `temp_buff`→`specialActions` via `automationRouter.js:131`.
- Recipe: sheet Bonus Actions "Rage:" click → popup "Rage activated — Instinctive Pounce: You can move up to {floor(speed/2)} feet…"; speed null in character JSON → handler fallback 30 → 15 ft. Evidence = popup text + ragePoints decrement + activeBuffs Rage stance; **no movement state flag and no log entry are written** (popup-only delivery, manual token move on map) — don't grep change-data/log for "pounce", check the popup. Re-click "Rage:" ends stance.

### Condition-inflicting area save features / Intimidating Presence (CLA-202, 2026-08-29)

- **Intimidating Presence = Path of the Berserker MAJOR lv14** in 2024 classes.json (`majors[0].features[3]`, `automation:{type:'save_attack', saveDc:'ability', saveAbility:'STR', conditionInflicted:'Frightened', shape:'emanation_30ft', duration:'1_minute_or_success_save', uses:1, resourceKey:'intimidatingPresenceUses', recharge:'long_rest_or_expend_rage', casting_time:'1 bonus action'}`) — NOT base Barbarian lv2/9; manifest handler/router/infoBuilder paths don't exist. Real chain: `automationRouter.js` save_attack→bonusActions (casting_time space-format maps OK in `automationInfoBuilder/save.js`) → sheet clickable `<b class="clickable">"Intimidating Presence:"` → `automation/index.js save_attack:handleSaveAttack` → `src/services/automation/handlers/combat/saveAttackHandler.js` → `{type:'modal', modalName:'setCondition'}` → `SetConditionModal.jsx` (`.sp-overlay`).
- DC via `buildSaveDc` `savePrompt.js` `'ability'` branch = 8 + STR mod + proficiency; recompute from character JSON STR (DraconicDragon STR 16/+3, lv18 PB +6 → **DC 17**; manifest speculation of 19 assumed STR 20 — wrong). Modal header + `activeConditionMeta.frightened.dc` in change-data are the DC ground truth.
- Recipe: EB-join low-WIS monster (Animated Rug WIS −4 fails DC 17 deterministically, max 20−4=16) → sheet Bonus Actions row → `.sp-overlay` tick ONLY NPC `label.secondary-target-row` → `.sp-roll-btn` "Intimidating Presence (N)" → NPC AUTO-rolls from combatSummary `saveBonuses.wis` (no prompt), fail popup "Failed — Frightened!" → **Done** → condition lives at TOP-LEVEL change-data key `"<Creature Name>".activeConditions` (NOT under combatSummary creature entry!) + `activeConditionMeta:{frightened:{dc,ability}}` + save roll + condition `applied` logs; `intimidatingPresenceUses` 1→0.
- **Rage-expend recharge works** (`saveAttackHandler.js:171-185`): re-click row at uses 0 with ragePoints>0 → spends 1 rage silently (no popup), modal reopens; rage 0 → "cannot be used again until a long rest" popup. Cancel second modal via `.sp-dismiss-btn`.
- **Residual-flag family again (CLA-175/191/194):** no end-of-turn repeat-save consumer exists — `parseDurationRounds('1_minute…')=0` → encounter-scoped expiration only; frightened persists past the target's turn-end (walk `Next →` past its card and re-read change-data to confirm). Accept as PASS-subset when core DC/save/Frightened/consumption verify.

### Fighting-style reactions / Interception (FS-008, 2026-08-29)

- **Fighting Style grant:** Edit wizard step chip "12 Languages & Fighting Styles" → checkbox per `public/data/fighting-styles.json` row → ✓ Save → JSON `class.fightingStyles` is ground truth (top-level `fightingStyles:[]` stays empty — `rules-fightingStyles.js` reads `class.fightingStyles`). 2024 Interception is also a Fighting Style FEAT in `public/data/2024/feats.json` (requiresShieldOrWeapon) but the runtime reaction comes from `rules-fightingStyles.js:87-111`, routed `automationRouter.js:402` → sheet Reactions "Interception:" (manual click; always visible, not trigger-gated).
- Recipe: Wight EB monster, Target=ally (HexWarlock AC9, +4 hits on 5+; nat-rolls needed a few attempts) → `.mc-overlay` `.mc-dice-link` idx 9 → HIT → Done → fighter sheet Reactions "Interception:" → popup `Interception damage reduction: 1d10(X) + 6 = Y` (exact 1d10+PB) + "The target healed for Z HP" (rollback-heal model; Z capped by lastAttack.actualDamage).
- **PITFALL (bug-fs-008):** `interceptionHandler.js:70` writes the `protection` te via `setRuntimeValue(playerName,'targetEffects',…)` — WRONG key; all consumers (`MonsterCardModal.jsx:62`, `conditionEffects.js:345`) read campaign-level `targetEffects`. Runtime store logs hard console errors `[getRuntimeValue/setRuntimeValue] Campaign-level key … wrong characterKey` on every use; disadvantage never lands (follow-up monster attack shows single d20). Also NO consumption tracking — reaction re-fires unlimited on re-clicks (same lastAttack heals ally repeatedly). Probe consumption by clicking the reaction twice on the same hit.
- `.mc-overlay` survives across view nav; backdrop dispatchEvent click does NOT close it — click its × text node. Remove-NPC confirm carried HP ("Wight 1 has 82 HP"); auto-resolved by page.once dialog this session.

### Invisibility touch-cast + hostile-action break (SP-071, 2026-08-29)

- **Manifest paths stale again**: no spellHandler/spellRouter/spellInfoBuilder under `src/services/combat/automation/`. Real chain: 2024 spells.json `automation:{type:'temp_buff',effect:'invisible'}` (duration **"Concentration, up to 1 hour"** — manifest's "1 minute" is stale 5e wording); gate `spellGates.js:308 gateInvisibility` → SecondaryTargetModal (`TargetSpellPopups.jsx` radio list of ALL combatants incl. self + monsters) → confirm → `applyInvisibility` (`automation/handlers/buffs/invisibilityHandler.js:41`).
- Recipe: lv2 wizard with Invisibility prepared (tick `.list-item-checkbox-trigger` inside `.list-item-body` filtered `/^Invisibility/` — NOT the Greater Invisibility row above it; dismiss `.mi-skip` first; ✓Save via textContent regex; JSON ground truth +15s) → EB monster via **`.encounter-btn-join`** (skull button, title doesn't say "Join") → initiative Target dropdown = monster → sheet `.spell-name.clickable` "Invisibility" → "Cast Spell" → radio self click → trusted-click "Cast Invisibility".
- Evidence: `"<Name>".activeConditions:['invisible']` + `activeBuffs:[{name:'Invisibility',effect:'invisible'}]` + campaign flat keys live at **`change-data['campaign']['']`** (`_activeInvisibility_<Name>`=caster, `targetEffects` te invisible/concentration) + `combatSummary` creature `concentration:{spell:'Invisibility',dc:10}` + lv2 slot 3→2 + cast log.
- Break: **attack row click ends invisibility BEFORE the roll** (`useCharActionsAttackHandlers.js:26`); verified — nat-20 crit "HIT (25 vs AC 14)", Done → Wight 82→77, then conds/buffs/invisKey/te ALL cleared + log "Invisibility ends for X: target made a hostile action…". Casting another spell or dealing damage also break via `spellCastService/execution/index.js:107` / `:486`.
- **Residual:** voluntary early-end never clears `combatSummary` creature.concentration nor the sheet "Invisibility DC 10" concentration badge (endInvisibility touches buffs/conds/key/te only) — cosmetic, same family as CLA-175/191/194; core break = PASS.

### Base Invoke Duplicity / combat_stance CD features (CLA-203, 2026-08-29)

- Base **Invoke Duplicity = lv3** in 2024 classes.json Trickery majors[2].features[1] (`combat_stance`/`create_illusion`/`resourceCost:'channel_divinity'`/1 minute); manifest handler/router/infoBuilder paths don't exist. Real impl: `src/services/automation/handlers/combat/combatStanceHandler.js` — CD branch :142-161 (`channelDivinityCharges` runtime, default = `class_levels[lv-1].channel_divinity` = 3 at lv17), buff push :236-239, activation popup text "…cast spells as though you were in the illusion's space" :321-323.
- Recipe: EB-join Wight → initiative Target=monster (locate caster card via `.creature-name` exact text — select-option textContent matching hits every card) → sheet Bonus Actions "Invoke Duplicity:" click → change-data (≥11s) shows CD 3→2 + `activeBuffs:[{name:'Invoke Duplicity',effect:'create_illusion',duration:'1_minute'}]` → Mace "+8" dice cell → two-d20 popup "Advantage / ✓ HIT (17 vs AC 14)" + log roll `mode:"advantage"` → Done → damage popup 13 (82→69). Caster-self advantage = `contextBuilder-sync.js:475` any-`create_illusion`-buff branch (ignores 5ft gate by design here).
- **PITFALL:** at lv17 the collector emits the Improved passive `enhanced_distraction_and_healing`, so clicking the lv3 BASE row still opens the "Improved Duplicity — Choose Allies" `.sp-overlay` picker AFTER CD+buff are committed (`combatStanceHandler.js:289-295`) — click **Skip** (base test needs no ally grant; `invokeDuplicityAdvantageTargets` stays null). Same click while buff active + passive present → healingIllusion modal, NOT the base "stance ended" toggle (:35-41).
- Illusion-move (BA 30 ft) and cast-from-illusion-space have NO gridless UI consumer (only Trickster's Transposition lv6 teleport-swap row exists) — accept as PASS-subset; core activation+CD+buff+caster-advantage is the PASS bar. No activation/CD `ability_use` log written (change-data is the consumption ground truth).

### Feature save proficiencies / Iron Mind (CLA-204, 2026-08-29)

- **Iron Mind = Gloom Stalker MAJOR lv7** in 2024 classes.json (`majors[2].features[2]`, `automation:{type:'save_proficiency', saveType:'Wisdom', fallbackTypes:['Intelligence','Charisma'], casting_time:'passive'}`) — NOT base Ranger lv7 as manifest claims. Unlike CLA-181, this grant IS structured and parsed: `automationRouter.js:520` routes to passives (sheet "Iron Mind:" passive row), `automationService.js:106 getAllSaveProficiencies()` implements saveType+fallback logic (unit-tested in automationService.modifiers.test.js), consumer `abilityCalc2024.js:24-28` merges class saves + `playerStats.saveProficiencies` → proficient save = mod + PB on the sheet Save cell.
- Recipe: Edit wizard level fill + step-7 `selectOption('Gloom Stalker')` + step-9 Wisdom base 15 → ✓Save → 15s JSON → sheet Abilities table Wisdom Save **+5** = WIS +2 + PB +3 (proficient); INT/CHA saves stay −1 (fallback NOT consumed because Ranger base saves are STR/DEX, WIS was open). Passive row presence + save-cell PB is the verification — no button.
- **PITFALL (latent, unfixed):** `playerStats.saveProficiencies` has exactly ONE writer — `rules.js:340` — nested inside `if (featFeatures.length > 0)` (block :262-341). Control probe: direct JSON edit `feats:[]` + reload → WIS save silently reverted **+5→+2** (proficiency vanished), with NO console error. Zero-feat lv7+ characters miss ALL feature-based save grants (Iron Mind, Resilient-equivalents). The edit wizard auto-adds `Savage Attacker` to HunterRanger on every save, so the standard flow always keeps ≥1 feat and the grant live — do NOT strip feats from HunterRanger. Consider hoisting line 340 out of the feat block.

### Jack of All Trades half-PB on skill checks (CLA-205, 2026-08-29)

- **Jack of All Trades = base Bard lv2** in 2024 classes.json (`automation:{type:'jack_of_all_trades', casting_time:'passive'}`); manifest handler/router/infoBuilder paths stale. Real chain: `automationRouter.js:183` (→ passives+specialActions) → `automationInfoBuilder/diverse.js:59` → consumer `CharAbilities.jsx:87-94` `getSkillBonus` adds `floor(PB/2)` to NON-proficient skills; skill cell click passes that same bonus to `rollSkillCheck` (:418), plus `useCharActionsBaseActions.js:44/165` for grapple/hide.
- Recipe (no combat needed): Bard sheet Abilities table — compare rows: proficient Acrobatics (+8 = DEX 15/+2 + PB 6) & Persuasion (+11 = CHA 21/+5 + 6) vs non-proficient Arcana/History/Investigation (+3 = INT +0 + half-PB 3) and Stealth/Sleight of Hand (+5 = +2 + 3). Click cells to roll: popup "d20 13 +3 (+3 to hit)" (History) vs "d20 6 +11" (Persuasion) is the decisive differential. PB = floor((lvl−1)/4)+2 → lv17 = 6, half = 3.
- Popup renders phantom "Advantage/Disadvantage" toggle labels on plain rolls — cosmetic, ignore. Admin Clear Change Data + Clear Campaign Log showed confirm dialogs this session (arm handle_dialog twice).


### ASI feats / Keen Mind feat-buff double-count (FT-047, 2026-08-29)

- 2024 feat ASI flow: Edit wizard ticks feat → `useWizardFeatBuffs.js:15` PERSISTS the ASI into JSON `abilities[].featIncrease`, then `rules.js:200-212` adds the SAME computed +1 again at every load → INT displayed +1 too high (Keen Mind on INT-17 char showed 19, ground truth 18). Control probe: fetch JSON, set `featIncrease:0`, call `rules.getPlayerStats` (default export!) → 18 exact; with persisted 1 → 19. Modifier (18/19 both +4) is identical — never accept save/skill bonuses as proof of the score; read the SCORE cell vs JSON sum.
- `rules.js` import gotcha: `rules.getPlayerStats` is on the DEFAULT export (`(await import('/src/services/rules/rules.js')).default`); races2024 must be passed or some paths crash.
- Feat skill-choice grants DO have a picker: Skills step (10) shows a per-source row "Keen Mind: 0 of 1 — Arcana, History, Investigation, Nature, Religion"; tick checkbox there, NOT on the Feats step (no inline picker). featBuffService.js parses "Choose one of the following skills: … If/You" into isChoice+grantsExpertise; proficiency grant lands in stored skillProficiencies → exact +INT+PB.
- `benefit.type:'bonus_action'` without `automation.casting_time` (Quiet Study) is SILENTLY DROPPED: featBuffService tags isBonusAction (zero consumers); rules.js no-casting_time fallback only REPLACES an existing specialActions entry, never appends → no Bonus Actions row ever (CLA-179 family).
- Wizard rollback pitfall: unticking the feat does NOT reliably zero the persisted featIncrease (clearBuffs subtracts stale computedBuffs) — verify JSON after save and fix featIncrease directly in the character JSON if orphaned.

### Know Your Enemy / handler-side IRV key mismatch (CLA-207, 2026-08-29)

- **Know Your Enemy = Battle Master lv7** in 2024 classes.json (`automation:{type:'know_enemy', casting_time:'1 bonus action', range:'30_ft'}`); routed `automationRouter.js:266`→bonusActions, dispatched `automation/index.js:385`→`src/services/automation/handlers/class-fighter-rogue/knowEnemyHandler.js` (manifest classFeatureHandler paths stale). Row clickable via CharBonusActions.jsx:301 `hasAutomation` (INTERACTIVE_HANDLER_TYPES gate is Special-Actions-only — know_enemy absent there yet row still fires).
- Recipe: Edit step-7 `selectOption('Battle Master')` + ✓Save → 15s JSON; **Short Rest→Complete Short Rest first if change-data `superiorityDice:0` is stale** (rest resets it to null→handler default max 4); EB-join Shadow; set initiative Target=Shadow 1 FIRST (`getTargetFromAttacker` reads combatSummary `attacker.targetName`); sheet Bonus Actions "Know Your Enemy:" click → popup + `ability_use` log; superiorityDice 4→3 consumed, Short-Rest refill verified (SHORT_REST_RESOURCES).
- **PITFALL (bug-cla-207):** handler reads `damage_immunities/damage_resistances/damage_vulnerabilities/condition_immunities` from the monsters.json DB object — 466/605 monsters (incl. Shadow/Skeleton) store IRV under `immunities/resistances/vulnerabilities` (capitalized, damage+conditions mixed into `immunities`); only 118/605 (2024 batch, e.g. Adult Blue Dracolich) have `damage_*`. Result: correct target/range/dice but "No immunities…" reveal. Distinguish from bug-cla-173 (combatSummary stub IRV at encounterToInitiative.js:184) — CLA-207 already bypasses combatSummary. Unit test fixtures mock the wrong keys and mask it. Probe via in-page `getMonsterData(name,null)`.

### Racial proficiency_choices / Keen Senses (CLA-206, 2026-08-29)

- 2024 Elf "Keen Senses" = structured `proficiency_choices {choose:1, from:[Skill:Insight, Skill:Perception, Skill:Survival]}` in races.json — parsed by `src/services/character/proficiencyUtils2024.js:25-36` (race traits have a parser, unlike free-text majors, so this DOES apply — contrast CLA-181).
- Wizard flow: Skill Proficiencies step shows a "Race: 0 of 1 — Insight, Perception, Survival" pool header; tick the skill checkbox with a TRUSTED `mouse.click` at the checkbox rect (evaluate clicks unreliable here); header flips to "Race: 1 of 1"; confirm via JSON `skillProficiencies`.
- Ability wizard: base score max 15 via `#base-score-N` (STR..CHA, WIS=idx4); `fill('16')` silently reverts — set 15 + dispatch input/change events; background bonus shows in row "Total:". Bulk Next-click-through can skip Skills/Ability steps — recover via clickable sidebar step chips; `✓ Save` chip works from any step.
- Racial skill grants have no button / passive-perception readout — the skill-row bonus itself (+ability+PB) vs unproficient sibling is the automation evidence. NOTE data gap: Wood Elf ancestral +2 to abilities is NOT reflected in ability totals (out of scope for CLA-206).

### Save+heal area features / scaling dead for object-map data (CLA-208, 2026-08-29)

- **Land's Aid = Circle of the Land lv3** in 2024 classes.json (manifest "lv6" stale), automation `save_attack` + healExpression → routed actions (casting_time "1 action") → `saveAttackHandler.js` heal+area branch :210-250 → `SaveAttackHealModal` (checkbox multi-target → auto NPC saves → radio heal picker → "Heal Selected" → Done). Manifest classFeatureHandler paths don't exist.
- **PITFALL (bug-cla-208):** `resolveScaling` (automationExpressions.js:14) accepts ONLY Array `{level,damage}`; classes.json scaling/healScaling are OBJECT maps `{"10":"3d6","14":"4d6"}` → null → save_attack rolls base dice forever (lv20 Land's Aid = 2d6/2d6, rules 4d6/4d6). InfoBuilder healScaling path additionally expects `.healExpression` on entries. `resolveHealingPoolExpression` (object-map aware) is unused here.
- **PITFALL (bug-cla-208):** NPC heal is a NO-OP: SaveAttackHealModal.handleHeal → applyHealingDirectly reads per-name runtime `currentHitPoints`, but applyDamage.js:283-290 stores NPC HP only in combatSummary `creature.currentHp` → heal reads max → "healed for N HP (actual: 0)", hp_change delta:0. Damage itself persists (card probe "Rug has 20 HP").
- NPC saves in this modal roll RAW d20 vs DC (bonus computed, never added, SaveAttackHealModal.jsx:25-30) — any roll < DC fails.
- EB join now via visible "Join Encounter" button after ticking monster row checkbox (not only `.encounter-btn-join`). Cosmetic: Actions badge prints raw `DC ability CON`; heal-modal range text falls back "within 10 feet" (auto.range 60_ft ignored).

### Grapple-escape surface / Goliath Powerful Build (CLA-209, 2026-08-29)

- 2024 races.json Goliath: manifest "Large Form" expected text is actually the base **Powerful Build** trait (`conditional_advantage/ability_check/grappled`); "Large Form" is a separate Fire-Giant-lineage lv5 `large_form` toggle (`src/services/automation/handlers/class-other/largeFormHandler.js`). Manifest classFeatureHandler/Router/InfoBuilder paths don't exist.
- Escape surface recipe (no monster needed): new PCs merge into combatSummary by visiting Initiative view once → PC card **Add** (`.ea-overlay`) → Conditions tab → click "Grappled" + DC input (13) + Save select (Strength) → **Apply** → writes `activeConditions:["grappled"]` + `activeConditionMeta.grappled={dc,ability}` → sheet shows clickable **"Grappled DC 13"** badge (`CharConditions.jsx` `handleConditionSave`) = the escape check; success clears the condition.
- **PITFALL (bug-cla-209):** `rules.js getPlayerStats` pushes the canonical `{condition:'powerful_build_grapple_escape', abilities:['STR']}` modifier at :174-181 but re-collects `saveModifiers = collectSaveModifiers(allFeatures)` at :458 later in the same function — push clobbered. Escape consumers (CharConditions.jsx:96, conditionSaveService.js:62) require that canonical shape, so grapple escape always rolls `mode:"normal"` (single d20) for Goliaths. Popup "Advantage/Disadvantage" words are cosmetic toggle labels — trust `rolls[]` length + log `mode` field.
- Carrying-capacity half: `applyPowerfulBuild` sets `sizeMultiplier=2` + `getCarryingCapacity` computes it, but no numeric readout on sheet — trait description text only (non-combat flavor).
- Goliath 2024 wizard HAS a subrace step (Cloud/Fire/Frost/Hill/Stone/Storm Giant); Spells step can stall behind `.mi-overlay` — `.mi-skip` then continue; lv5 milestone Fighter auto-selected via bulk Next+selectOption(0) walk.

### Lay On Hands healing pool / CLA-210 (2026-08-29)

- **Lay On Hands = base Paladin lv1** in 2024 classes.json (`automation:{type:'healing_pool', poolExpression:'5 * paladin level', action:'bonus_action', recharge:'long_rest', alsoCures:['poisoned'], cureCost:5}`). Manifest classFeatureHandler/Router/InfoBuilder paths don't exist. Real chain: `automationRouter.js:29` healing_pool→bonusActions → `automationInfoBuilder/healing.js:45` → sheet clickable `<b class="clickable">"Lay On Hands:"` + " Pool: cur/max (cur/max)" badge → `automation/index.js:324` → `healingPoolHandler.js` → `HealingPoolModal.jsx`.
- **SP-060 maxHp:1 combatSummary stub does NOT block this feature**: `HealingPoolModal` + `src/services/shared/hpModifier.js modifyHitPoints` read runtime `hitPoints`/`currentHitPoints` for players (opening the char sheet writes `hitPoints` via `CharSheet.jsx:283`; deficit seeded via initiative-card `input[aria-label="<name> current HP"]` which writes runtime `currentHitPoints`). Target picker shows cosmetic 1/1 stub HP — ignore it, the modal header shows real HP.
- Flow: row click → radio target picker (20 PCs, `.secondary-target-row`) → pick self → "Heal" → amount number input + **Apply Heal** (pool decrements live, log table "Pool Used/Pool Left") → Done. Cure half: card **Add** `.ea-overlay` Conditions→Poisoned→Apply → re-open row → **Skip** (self) → tick "Poisoned" → **"Cure Selected (1 for 5 HP)"** → pool −5, activeConditions [], `condition broken` log.
- **Long Rest fires WITHOUT any modal/second click on the sheet header "Long Rest" button** (unlike Short Rest's "Complete Short Rest"): `layOnHandsPool` (LONG_REST_RESOURCES) resets to null → badge back to 100/100 instantly.
- `layOnHandsPool` lives in change-data under the `"<CharName>"` object (not a top-level dotted key). Admin Clear Change Data/Campaign Log showed confirm dialogs this session (arm handle_dialog per click).
- Dice-tray `.dice-tray-popup-overlay` can accidentally open from sidebar icon clicks and silently intercepts Admin buttons — Escape/backdrop-click it first.

### Leading Evasion / shared DEX-save halving (CLA-211, 2026-08-29)

- Verified PASS via a monster DEX-save AoE: **Behir Lightning Breath (DC 16, 12d10)** forced the save. Evasion on the Bard: save-SUCCESS -> 0 damage (HP unchanged); save-FAIL -> floor(dmg/2) exactly (e.g. 57->28), logged "Evasion". Sharing half opened a "Leading Evasion — Choose Allies" picker; shared ally HexWarlock got fail->floor/2 (71->35), success->0, logged "Leading Evasion".
- No-map note: the 5-ft adjacency requirement is NOT enforced — the picker lets you share with anyone (accepted PASS-subset). Passive — no button beyond the passive Evasion math + the share picker that surfaces when nearby creatures make the same save.
- Subagent did NOT record which Bard subclass it used (Dance vs converted) — VERIFY the caster's subclass via JSON before citing this recipe for subclass-gated behavior.

### Bonus-action touch spells / Lesser Restoration (SP-072, 2026-08-29)

- A spell with `casting_time:"Bonus Action"` routed to bonusActions (Lesser Restoration, Greater Restoration, Remove Curse, …) renders ONLY as a `div.left.clickable` row in the **Bonus Actions** section (`CharBonusActions.jsx:245`), NOT as a `td.left.spell-name.clickable` Spells-table row. Locate by filtering `.clickable` on exact spell name — expect `left clickable` (bonus) vs `left spell-name clickable` (table).
- **PITFALL (bug-sp-072):** `CharBonusActions.jsx` destructures from `useSpellMetamagicFlow` ONLY `pendingMetamagic/pendingBarkskin/pendingHealingWord/pendingSanctuary` and renders SecondaryTargetModal only for those. Every OTHER gated bonus-action touch spell's pending (lesserRestoration etc.) is set by the gate (`spellGates.js:192`, fiber `pendingOps.lesserRestoration`) but NEVER rendered → cast stalls silently (no slot spent, no effect, no log, no console error). Prove it by fiber-probing `pendingOps` on `#root` vs `activeConditions`/slot unchanged + a **Heal control cast** that DOES open its picker. Real chain: `automationRouter.js:454` → `automation/index.js:553` → `handlers/spells/lesserRestorationHandler.js` (manifest spellHandler paths stale).

### LightBearer / racial cantrip-casting-ability overrides (CLA-212, 2026-08-29)

- **LightBearer = Aasimar RACIAL TRAIT** in 2024 races.json (`automation:{type:'cantrip_spellcasting_ability', cantripName:'Light', spellcastingAbility:'Charisma'}`) — NOT Cleric; absent from classes.json; manifest handler/router/infoBuilder paths don't exist. Chain: automationRouter.js:427→passives → core-handlers.js:6 → spellCalc2024.js:193-204 grant+override → consumers spellResolution.js:103 / execution/index.js:143 / massHealUtils.js:9.
- Probe char: War_Cleric is now **Aasimar** Light Domain lv6 Cleric, CHA 16/+3 vs WIS 9/−1, PB+3 (Edit wizard step-3 race combobox + step-9 `#base-score-5` fill 15 + `✓Save` chip; JSON ground-truth in 15s). Race swap adds Aasimar rows (LightBearer passive row, Celestial Revelation BA, Resistances Necrotic/Radiant) without disturbing subclass/spells.
- Light (2024) has attack_type null / no save — no UI attack surface; verify grant via sheet row + cast log, verify ability via fiber-probe of live playerStats (root key prefix is `__reactContainer$`, NOT `__reactContainerInfo`/`__reactFiber` — wrong prefix silently walks nothing) + in-page `getSpellAbilities(spellsJson, statsClone)` vs `getSpellAbilities([], statsClone)` differential.
- **PITFALL (bug-cla-212):** spellCalc2024.js:477-485 replaces every spellAbilities.spells entry with cloneDeep(spells.json detail), dropping per-spell custom keys (`spellCastingAbility`) set earlier in the same function — CHA override silently lost, casts fall back to class WIS. Unit test spellCalc2024-automation.test.js:168 masks it (calls with allSpells=[], so the remap miss preserves the key). Non-spellcaster holders (Aasimar Rogue) get NOTHING: block sits inside `if (spellAbilities)` (:117) and no fallback creates it for passive cantrip grants.

### Choice-ASI feats + proficiency evidence / Lightly Armored (FT-048, 2026-08-29)

- Feats with `ability_score_increase.scores` of length 2 (a CHOICE, e.g. Lightly Armored STR-or-DEX) parse to buff `{name:'any', isChoice:true}` (`featBuffService.js:210-219`) so `rules.js:203` SKIPS re-adding them — FT-047's double-count does NOT apply to choice-ASI feats. The +1 is applied ONLY by the Edit-wizard Abilities-step combobox (auto-inits to abilityNames[0]=Strength, shows "Feat: +1 Strength"), persisted as JSON `abilities[].featIncrease` + `featAbilityChoices:{'<Feat>-0':{assignment}}`.
- Score cell is the evidence when mods don't change (STR 8 and 9 both −1): read the SCORE cell, not the modifier.
- **No app AC proficiency-penalty model** — armor/shield proficiency evidence is the computed `playerStats.proficiencies` array (probe `rules.getPlayerStats` default export) + the AC formula contributions ("Armor (11) + Dexterity Bonus (-1) + Shield (2)"). Equipment name string is "Leather" (not "Leather Armor").
- **Rollback pitfall (FT-047 family):** unticking a choice-ASI feat leaves `featIncrease:1` + `featAbilityChoices` orphans in saved JSON (clearBuffs subtracts non-choice only; useWizardFeatAbilityChoices early-returns on empty). Hand-fix the JSON and verify the sheet reverts.

### Speed-buff touch spell / Longstrider (SP-073, 2026-08-30)

- **Longstrider = Bard/Druid/Ranger/Wizard lv1, Action, Touch, NO concentration, 1 hour** (2024 spells.json) — main Spells-table row (NOT CharBonusActions, contrast SP-072). Manifest spellHandler/spellRouter/spellInfoBuilder paths stale; real chain: sheet `.spell-name.clickable` → `spellGates.js:344 gateLongstrider` (needs staged combatSummary — getCsAndTargets; pre-staged initiative works) → radio SecondaryTargetModal "Cast Longstrider" (`TargetSpellPopups.jsx:228`) → `useConfirmableFlow.js:54` confirm logs + `prepareSpellCast` consumes slot → `applyLongstrider` (`handlers/buffs/longstriderHandler.js:51`) pushes target `activeBuffs {effect:'speed_boost', speedBonus:10}` + `addExpiration(remove_active_buff)`; sheet Speed consumer `charSummaryCalc.js:253`.
- Recipe (self-cast, no monster needed): prepare spell via Edit-wizard Spells step `.list-item-checkbox-trigger` + ✓Save (JSON ground truth +15s) → row → Cast Spell → radio self → Cast Longstrider → popup "X gained +10 feet speed" → **sheet Speed 30→40 ft is the decisive proof** + change-data buff/slot/pendingExpirations + ability_use log.
- Cosmetic pitfall: the generic `spell` log entry's targetName/targets come from `useConfirmableFlow.js:65-69` (full `pending.creatureTargets`, targetName=targets[0]) — NOT the selected radio target; the `ability_use` entry ("cast Longstrider on <target>") is the accurate one. Admin Clear Change Data/Log showed confirm dialogs but auto-resolved before handle_dialog (arm anyway).

### Living Legend / multi-effect self-buff flag (CLA-213, 2026-08-30)

- Living Legend = Oath of GLORY paladin lv20 (2024 classes.json `[6]/majors[1]/features[4]`), automation `{type:'living_legend'}`. Handler `handlers/class-cleric-paladin/livingLegendHandler.js` sets runtime `livingLegendActive=true` + badge + ability_use log — one flat flag, NO activeBuffs entry, NO expirationQueue (10-min duration unenforced; flag cleared ONLY on next initiative roll, useInitiativeEffects.js:57-66), no use counters.
- **Row IS clickable despite static inert prediction:** `living_legend` is NOT in INTERACTIVE_HANDLER_TYPES (automationService.js:14-55) and the info object carries no `.automation` key (infoBuilder temp.js:161), yet the Special Actions row renders `.clickable` and dispatches fine. Do NOT trust the static inert-family deduction alone — click-test first. `automation/index.js:667` `if (!action?.automation) return null` also did NOT block dispatch (the row passes the full action through).
- Consumer split: CHA check advantage → automationModifiers.js:46-57 → conditionEffectsInternal.js abilityCheckAdvantageAbilities → CharAbilities.jsx forcedMode advantage (two-d20 popup + "Advantage" label + log mode:"advantage"). Save reroll (own cell) → `.dice-roll-reroll-btn` in DiceRollResult.jsx:376; monster-forced → SavePromptModal.jsx:629 "Reroll Save" + savePromptHandlers.js:91. Unerring Strike → hitResolution.js:220-240, once-per-turn via `unerringStrikeUsed` (resets rules/effects/turnStartEffects.js:87).
- **PITFALL (high-level paladin save tests):** Aura of Protection adds CHA (+5) to ALL saves — WIS 9/−1 paladin totals +10 vs DC 13, so a monster-forced FAILURE needs d20 ≤2 (~10% per roll). Loop re-trigger the .mc-overlay dice link + Roll Save until "SAVE FAILURE" appears; don't conclude the reroll button is missing just because early saves all succeed.
- **PITFALL:** after clearing `livingLegendActive` via setRuntimeValue, the sheet's reroll button lags one roll (stale until sheet remount) — remount/navigate before asserting absence; controls on OTHER characters are reliable.
- Reroll log entry is `type:"roll" rollType:"save-damage"` with `saveRawRolls:[old,new]` and **name:"Unknown"** (feature name not threaded into the reroll log — cosmetic gap, CLA-195 same).

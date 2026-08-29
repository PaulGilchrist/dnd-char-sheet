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

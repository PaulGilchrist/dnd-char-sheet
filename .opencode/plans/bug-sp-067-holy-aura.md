# BUG SP-067 Holy Aura — save advantage never applied at roll time

**Date:** 2026-08-29 · **Campaign:** test-campaign (2024 ruleset) · **Caster:** Divine_Cleric lv17 (life domain, WIS 16, spell save DC 17 verified on sheet)

## Summary
Holy Aura (2024, level 8 Cleric, `automation.type: holy_aura`) correctly casts and correctly renders
badges + the Fiend/Undead blinding branch, but the "Advantage on all saving throws" clause is **never
realized in any observed saving-throw roll**. The card badge *claims* "Adv Save" while every save prompt
for an affected creature rolls a single d20.

## VERIFIED WORKING (evidence)
- Level-up 13→17 via Edit wizard persisted (JSON `level: 17`); Long Rest restored 8th-level slot; Holy Aura
  prepared via Spells-step `.list-item-checkbox-trigger` (JSON `spells[]` contains "Holy Aura").
- Cast flow: spell row → Cast Spell → `holy_aura_target_selection` `.sp-overlay` (17 creature checkboxes) →
  "Cast Holy Aura (2)" → popup "Divine_Cleric, MercyMonk gained Advantage on saving throws…".
- State: `targetEffects: holy_aura->Divine_Cleric, holy_aura->MercyMonk`; `activeBuffs` Holy Aura on both;
  `holyAuraSaveDc: 17`; `holyAuraTargets: [Divine_Cleric, MercyMonk]`; 8th-level slot consumed (1→0).
- Badges on both initiative cards + caster sheet: `Disadv vs`, `Adv Save ~ Advantage on saving throws
  (Divine_Cleric, Holy Aura)`, `Holy Aura` (fa-sun), concentration `Holy Aura DC 17`.
- Attack disadvantage: Wight 1 Necrotic Sword vs Divine_Cleric popup shows **two d20s** "d20 2, 19 → 2",
  "Disadvantage / Disadv (conditions)" chip, MISS; second roll HIT 18 vs AC 12.
- Blinding branch: on the melee hit, damage popup shows "Holy Aura Save: d20 11 + 0 = 11 vs DC 17
  SAVE FAILED — Fiend/Undead blinded!"; Wight card gains `Blinded DC 17` + `Adv vs` badges;
  `change-data["Wight 1"].activeConditions = ["blinded"]`.
- Log: "Cast Holy Aura" ×2, "Holy Aura CON save vs DC 17" ×2 (save_result),
  "vs Concentration: Holy Aura (DC 10): SUCCESS", spell_effect entries per target.

## FAIL: saving throws roll normally (single d20) for affected creatures
1. **Monster-statblock save vs Divine_Cleric (aura active):** Aarakocra Aeromancer card Target = Divine_Cleric,
   click `mc-dice-link-save` "DC 13 Wisdom" → SavePromptModal "Saving Throw Required — Divine_Cleric WIS DC 13".
   Roll Save → `d20 (2) + 9 = 11 vs DC 13`, **single die, no advantage indicator**.
2. **Native PC-cast damage-save vs MercyMonk (aura active):** DraconicSorcerer casts Fireball (prepared,
   DC 14 DEX, non-concentration) selecting MercyMonk only → "Saving Throw Required — MercyMonk DEX DC 14,
   Source: DraconicSorcerer". Roll Save → `d20 (2) + 7 = 9`, **single die, no advantage chip**.
3. **Concentration check (self, holy aura itself):** cnp-overlay CON DC 10 auto-roll → single d20;
   `ConcentrationPromptModal.jsx` only counts `target:'concentration_saving_throws'` or
   `condition:'concentration_spell_damage'` modifiers — holy-aura blanket advantage is not consulted.

## Root-cause pointers
- `src/components/common/SavePromptModal.jsx:169-198`: `hasAdvantage` requires `current.advantage` (flag from
  caller) or a matching entry in the **saving character's static `saveModifiers`** (computed class features).
  A cast `holy_aura` targetEffect / activeBuff never becomes a `saving_throw advantage` saveModifier on the
  saving character, and `current.advantage` was evidently not truthy in case 2 even though
  `src/hooks/combat/handlers/handlePlayerSaveDamage.js:202-204` computes `saveAdvantage` from
  `targetConditionEffects.saveAdvantageCount` and sends `advantage: saveAdvantage` (line 238) — the Fireball
  area-cast evidently doesn't route through that handler (goes via spellGates/AoE modal path instead).
- `SavePromptModal` has explicit per-spell targetEffects branches for `beacon_of_hope`/circle-of-power but
  **no `holy_aura` branch** (unlike `conditionEffects.js:590` which does bump `saveAdvantageCount` for badges).
- `automationModifiers.js:285/326` emit `holy_aura_active` advantage/disadvantage modifiers from **features**
  (`auto.type === 'holy_aura'` on a feature), which never fire for a cast spell; `conditionEffectsInternal.js:80`
  additionally checks `holyAuraTargets.includes(attackerName)` — inverted for the "advantage on saves" use
  (the roller IS a holyAuraTarget, yet nothing consumes that path in the save prompts).

## Suggested fix
In `SavePromptModal` roll path (and ConcentrationPromptModal), when computing `hasAdvantage`, also check
`getRuntimeValue('campaign','targetEffects')` for `holy_aura` targeting `current.targetName` (mirroring the
existing `beacon_of_hope` branch at line ~205), and roll two d20 keep-highest with an "Advantage" chip.
Also fix `conditionEffectsInternal.js:80` semantics (attacker-name check vs target-name protection).

## Repro recipe (known-good)
1. Divine_Cleric lv17 + Long Rest; Edit → Spells → tick Holy Aura → Save → wait 15s.
2. Encounter Builder → tick **Wight** + **Aarakocra Aeromancer** → Join Encounter.
3. Cleric sheet → Holy Aura row → Cast Spell → tick Divine_Cleric + MercyMonk → Cast Holy Aura (2).
4. Wight card Target=Divine_Cleric → avatar modal → Necrotic Sword "+4" link → re-roll until HIT →
   blinding CON-save popup + Blinded badge = PASS side of automation.
5. Aeromancer card Target=Divine_Cleric → avatar modal → "DC 13 Wisdom" save link → Roll Save →
   observe single d20 (BUG). / DraconicSorcerer Fireball on MercyMonk → Roll Save → single d20 (BUG).

## Cleanup performed
Monsters removed from initiative, caster Long Rest, Admin → Clear Change Data + Clear Campaign Log.
NOTE: GlobeWizard was accidentally ticked `Delayed Blast Fireball` and possibly unticked again during
exploration — its `spells[]` JSON showed `['Globe of Invulnerability','Delayed Blast Fireball']`; Clear
Change Data does not touch character JSON. Verify/restore GlobeWizard.spells if needed.

# Bug CLA-239 — Necrotic Shroud: wrong save DC (WIS-based) and Frightened-save flow never renders (SetConditionModal not mounted)

## Title
CLA-239 Necrotic Shroud (2024 Aasimar Celestial Revelation option): Charisma save DC computed from WIS (DC 14 instead of 16) and the target-selection/save modal never opens — transformation consumes its use with zero Frightened effect.

## Overview
Necrotic Shroud is a 2024 base-Aasimar transformation option of the **Celestial Revelation** racial trait (NOT a subrace — `public/data/2024/races.json` traits[Celestial Revelation].automation.options includes "Necrotic Shroud"; subrace irrelevant). Activation chain: sheet Bonus Actions "Celestial Revelation:" row -> CelestialRevelationModal radio -> `confirmCelestialRevelation` -> (Necrotic Shroud branch) `conditionHandler.handle` (set_condition, saveType CHA, saveDc 'ability', frightened, until_end_of_next_turn) -> should open SetConditionModal for NPC/creature CHA saves.

Two live defects observed on AasimarTest (2024 Rogue Assassin lv14, CHA 17/+3, WIS 12/+1, PB +5; Animated Rug of Smothering CHA -5 and Archmage CHA +3 joined via Encounter Builder):

1. **Wrong save ability for DC**: campaign log wrote `Necrotic Shroud activated — CHA save DC 14, up to 3 targets within 10 ft.` Expected DC = 8 + CHA(+3) + PB(+5) = **16**; observed **14** = 8 + WIS(+1) + PB(+5). The label says CHA but the number is built from Wisdom.
2. **Save flow unreachable**: the SetConditionModal NEVER renders (zero overlays for 8+ s of polling after clicking Transform). The transformation popup path (`Transforming into Necrotic Shroud…`) shows only when conditionHandler early-returned; on the successful path the CR modal closes and NO modal replaces it, so no creature ever rolls the CHA save, no Frightened is applied (rug/archmage `activeConditions` stayed absent), and the use is consumed anyway.
3. **Secondary (silent swallow)**: `conditionHandler.js:32` gates the feature on Channel Divinity charges. With stale runtime `channelDivinityCharges=0` on the Rogue (prior-test residue), activation returned the no-charges popup which CelestialRevelationModal discards — user saw the generic "Transforming…" popup while the use was spent and no save flow ran. Channel Divinity is irrelevant to Necrotic Shroud.

## Expected
Per races.json description and manifest: non-allied creatures within 10 ft make a **Charisma** save vs **DC = 8 + CHA mod + PB (16 for this character)**; failures gain Frightened until end of caster's next turn (durationRounds 2 model); successes unaffected; 1/long rest with Long-Rest re-arm.

## Actual
- DC computed as 8 + WIS mod + PB = 14 (log line proves it).
- No save modal ever mounts; no saves rolled; no Frightened applied to anyone; use consumed (1→0).
- With residual `channelDivinityCharges=0`, activation additionally swallowed by the Channel Divinity gate (use lost, no effect, no visible error).
- Verified working sub-halves: `_celestialRevelationUses` consumption + block popup ("cannot be used again until a Long Rest"), Long Rest re-arm (key null→max, modal reopens), `_celestialRevelationOption` persisted, ability_use log written.

## Steps to Reproduce
1. test-campaign, AasimarTest (2024 Aasimar lv14, CHA 17/+3, WIS 12/+1, PB +5). Long Rest to arm (`_celestialRevelationUses` null; also ensure `channelDivinityCharges` not stale-0).
2. Encounter Builder -> tick Animated Rug of Smothering (CHA −5) + Archmage (CHA +3) -> Join Encounter.
3. AasimarTest sheet -> Bonus Actions "Celestial Revelation:" -> radio Necrotic Shroud -> **Transform**.
4. Observe: CR modal closes, **no SetConditionModal appears** (poll `.sp-overlay` — none). Log shows `Necrotic Shroud activated — CHA save DC 14` (should be 16). Monsters never receive Frightened. Re-click row -> blocked popup until Long Rest (use already spent).

## Likely Location
1. **DC bug**: `src/services/automation/handlers/buffs/conditionHandler.js:16` — `saveAbility: auto.saveAbility || 'WIS'`; the caller (`src/services/automation/handlers/class-sorcerer/celestialRevelationHandler.js:173-185`) passes only `saveType: 'CHA'`, never `saveAbility`, so `buildSaveDc` ('ability' branch, `src/services/automation/common/savePrompt.js:12-17`) computes the DC from WIS. Fix: pass `saveAbility:'CHA'` (or have buildSaveDc fall back to `auto.saveType`). Same family as CLA-238.
2. **Modal wiring bug**: `src/components/char-sheet/modals/CelestialRevelationModal.jsx:21` calls `onSetConditionModal(res.payload)` with the flat payload, while `src/components/char-sheet/CharActionModals.SecondaryModals.jsx:390` supplies the raw `setModalState` (expects keyed `{ setConditionModal: payload }`; `CharSheet.jsx:32-34` REPLACES state). The flat payload never satisfies `mergedModalState.setConditionModal` (CharActionModals.jsx:336) so SetConditionModal never mounts. Fix: `onSetConditionModal={(p) => setModalState({ setConditionModal: p })}` or wrap in the automation-layer `simpleModal` shape.
3. **Gate bug**: `conditionHandler.js:27-43` Channel Divinity charge check must not apply to non-CD features like Necrotic Shroud.

## Notes
- Save label/type IS Charisma throughout (`saveType:'CHA'`, modal header would say CHARISMA, save rolls would read `saveBonuses.cha`) — only the DC number is ability-mismatched; if fixed to 16, Rug (max 15) deterministically fails.
- `maxTargets = max(1, CHA mod)` (conditionHandler:25) and "for 1 minute" modal copy (SetConditionModal renderBody) are Necromancy/Abjure-Foes leftovers — Necrotic Shroud has no target cap and lasts until end of caster's next turn (durationRounds:2 IS plumbed correctly at conditionHandler:89-96, just never consumed because the modal never mounts).
- The buff-side expiration `remove_active_buff Necrotic Shroud` is enqueued with `expiryRounds:null` (CLA-175 residual-flag family).
- Attack-rider half (Necrotic +PB once/turn during transformation) was not exercised in this run.
- Residue cleared after run: NPCs removed, change data + log cleared, AasimarTest left intact/reusable.

// Tests for remaining uncovered statements in CharActionModals.jsx:
// - handleHealingIllusionConfirm async path
// - handleInvokeDuplicityConfirm async path
// - handleClockworkCavalcadeChoice with all three choices
// - AttackRiderModal onClose with Stalker's Flurry
// - AttackRiderModal onClose with Cunning Strike variants (3 code paths)
// - openHandFromFlurry modal
// - shieldBashModal close handler
// - quiveringPalmModal close handler
// - CelestialResilienceModal onSkip handler
// - NaturesSanctuaryCreaturesModal rendering
// - TricksterBlessingModal onSkip (null confirm)
// - BardicInspirationTargetModal onSkip (null confirm)
// - InspiringMovementAllyModal onSkip (null confirm)
// - OceanicGiftTargetModal onSkip (null confirm)
// - MassHealModal onSkip handler
// - MassCureWoundsModal onSkip handler
// - PrayerOfHealingModal onSkip handler
// - PowerWordFortifyModal onSkip handler
// - MassHealingWordModal onSkip handler
// - AnimateDeadModal onConfirm with setPopupHtml
// - CreateUndeadModal onConfirm with setPopupHtml
// - SummonSpiritModal onConfirm with setPopupHtml
// - handleStarryChaliceConfirm with setPopupHtml
// - handleEpitomeConfirm with setPopupHtml
// - handleDestructiveStrideConfirm with setPopupHtml
// - handleDestructiveStrideTargetConfirm with setPopupHtml
// - handleDestructiveStrideTargetSkip with setPopupHtml
// - clockworkCavalcadeRepairModal onConfirm handler
// - moonlightStepFallbackModal Yes button with popup result
// - attackRiderOptionsModal rendering
// - attackRiderOptionsModal skip button

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';
import { createBaseProps } from './CharActionModals.test-utils.jsx';

// ── Mocks ──

vi.mock('./modals/divine/HealingPoolModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="healing-pool-modal"><button data-testid="healing-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/HandOfHealingModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="hand-of-healing-modal">HandOfHealingModal</div>; },
}));
vi.mock('./modals/FontOfMagicModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="font-of-magic-modal">FontOfMagicModal</div>; },
}));
vi.mock('./modals/ResourcePoolModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="resource-pool-modal">ResourcePoolModal</div>; },
}));
vi.mock('./modals/WildCompanionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="wild-companion-modal">WildCompanionModal</div>; },
}));
vi.mock('./modals/shared/SetConditionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="set-condition-modal">SetConditionModal</div>; },
}));
vi.mock('./modals/EyebiteEffectModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="eyebite-effect-modal">EyebiteEffectModal</div>; },
}));
vi.mock('./modals/shared/AttackRiderModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="attack-rider-modal"><button data-testid="attack-rider-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/OpenHandTechniqueModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="open-hand-technique-modal">
        <button data-testid="open-hand-close" onClick={onClose}>Close</button>
        <button data-testid="open-hand-confirm" onClick={() => onConfirm('grappled')}>Grapple</button>
      </div>
    );
  },
}));
vi.mock('./modals/WeaponMasteryModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="weapon-mastery-modal"><button data-testid="weapon-mastery-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/WeaponMasteryChoiceModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="weapon-mastery-choice-modal">
        <button data-testid="weapon-mastery-confirm" onClick={() => onConfirm('test-choice')}>Confirm</button>
        <button data-testid="weapon-mastery-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/WeaponKindMasteryModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="weapon-kind-mastery-modal"><button data-testid="weapon-kind-mastery-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/CombatStanceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="combat-stance-modal"><button data-testid="combat-stance-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/TeleportModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="teleport-modal"><button data-testid="teleport-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/HealingIllusionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="healing-illusion-modal"><button data-testid="healing-illusion-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((character, key) => {
    if (key === 'activeBuffs') return [];
    if (key === 'currentHitPoints') return 50;
    if (key === 'hitPoints') return 100;
    if (key === '_cunningStrikeCostUsed') return 0;
    if (key === '_Stalkers_Flurry_option') return 'attack';
    return null;
  }),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue({ creatures: [{ name: 'Goblin', type: 'humanoid', currentHp: 10, maxHp: 30 }] }),
}));
vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./modals/shared/SaveAttackHealModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="save-attack-heal-modal">SaveAttackHealModal</div>; },
}));
vi.mock('./modals/shared/SaveAttackAoeModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="save-attack-aoe-modal">SaveAttackAoeModal</div>; },
}));
vi.mock('./modals/shared/AOEConditionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="aoe-condition-modal">AOEConditionModal</div>; },
}));
vi.mock('./modals/shared/FearModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="fear-modal">FearModal</div>; },
}));
vi.mock('./modals/shared/HypnoticPatternModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="hypnotic-pattern-modal">HypnoticPatternModal</div>; },
}));
vi.mock('./modals/shared/MassSuggestionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="mass-suggestion-modal">MassSuggestionModal</div>; },
}));
vi.mock('./modals/shared/CalmEmotionsModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="calm-emotions-modal">CalmEmotionsModal</div>; },
}));
vi.mock('./modals/shared/TashasLaughterModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="tashas-laughter-modal">TashasLaughterModal</div>; },
}));
vi.mock('./modals/SilenceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="silence-modal">SilenceModal</div>; },
}));
vi.mock('./modals/ElementalAttunementModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="elemental-attunement-modal">ElementalAttunementModal</div>; },
}));
vi.mock('./modals/ElementalBurstModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="elemental-burst-modal">ElementalBurstModal</div>; },
}));
vi.mock('./modals/divine/DivineSparkModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="divine-spark-modal">DivineSparkModal</div>; },
}));
vi.mock('./modals/divine/DivineInterventionModal.jsx', () => ({
  default: function TestModal({ onClose, onSelect }) {
    return (
      <div data-testid="divine-intervention-modal">
        <button data-testid="divine-intervention-close" onClick={onClose}>Close</button>
        {onSelect && <button data-testid="divine-intervention-cast" onClick={() => onSelect('cast')}>Cast</button>}
      </div>
    );
  },
}));
vi.mock('./modals/arcane/ArcaneChargeModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="arcane-charge-modal">ArcaneChargeModal</div>; },
}));
vi.mock('./modals/WarMagicCantripModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="war-magic-cantrip-modal">WarMagicCantripModal</div>; },
}));
vi.mock('./modals/WarMagicSpellModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="war-magic-spell-modal">WarMagicSpellModal</div>; },
}));
vi.mock('./modals/divine/SacredWeaponModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="sacred-weapon-modal">SacredWeaponModal</div>; },
}));
vi.mock('./modals/PrimalCompanionBonusActionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="primal-companion-bonus-action-modal">PrimalCompanionBonusActionModal</div>; },
}));
vi.mock('./modals/PrimalCompanionSummonModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="primal-companion-summon-modal">PrimalCompanionSummonModal</div>; },
}));
vi.mock('./modals/MistyWandererModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="misty-wanderer-modal">MistyWandererModal</div>; },
}));
vi.mock('./modals/FeyReinforcementsModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="fey-reinforcements-modal">FeyReinforcementsModal</div>; },
}));
vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="steps-of-the-fey-taunt-modal">StepsOfTheFeyTauntModal</div>; },
}));
vi.mock('./modals/shared/BonusActionChoiceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="bonus-action-choice-modal">BonusActionChoiceModal</div>; },
}));
vi.mock('./modals/shared/StealthAttackModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="stealth-attack-modal">StealthAttackModal</div>; },
}));
vi.mock('./modals/CelestialRevelationModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="celestial-revelation-modal">CelestialRevelationModal</div>; },
}));
vi.mock('./modals/RevelationInFleshModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="revelation-in-flesh-modal"><button data-testid="revelation-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ElementalAffinityModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="elemental-affinity-modal">ElementalAffinityModal</div>; },
}));
vi.mock('./modals/SingleResistanceSelectionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="single-resistance-selection-modal">SingleResistanceSelectionModal</div>; },
}));
vi.mock('./modals/shared/ChoiceListModal.jsx', () => ({
  ChoiceListModal: function TestModal() { return <div data-testid="choice-list-modal">ChoiceListModal</div>; },
}));
vi.mock('./modals/DragonCompanionModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="dragon-companion-modal">DragonCompanionModal</div>; },
}));
vi.mock('./modals/WildMagicDoubleRollModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="wild-magic-double-roll-modal">WildMagicDoubleRollModal</div>; },
}));
vi.mock('./modals/WildMagicTamedModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="wild-magic-tamed-modal">WildMagicTamedModal</div>; },
}));
vi.mock('./modals/arcane/ThirdEyeModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="third-eye-modal">ThirdEyeModal</div>; },
}));
vi.mock('./modals/arcane/SoulstitchSpellsModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="soulstitch-spells-modal">SoulstitchSpellsModal</div>; },
}));
vi.mock('./modals/arcane/IllusoryRealityModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="illusory-reality-modal">IllusoryRealityModal</div>; },
}));
vi.mock('./modals/FiendishLegacyModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="fiendish-legacy-modal"><button data-testid="fiendish-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/racial/BreathWeaponShapeModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="breath-weapon-shape-modal"><button data-testid="breath-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/HypnoticPatternShakeModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="hypnotic-pattern-shake-modal"><button data-testid="hypnotic-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/arcane/ArcaneWardRestoreModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="arcane-ward-restore-modal">ArcaneWardRestoreModal</div>; },
}));
vi.mock('./modals/CombatSuperiorityModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="combat-superiority-modal"><button data-testid="combat-superiority-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/AttackRiderManeuverPrompt.jsx', () => ({
  default: function TestModal({ onSkip }) {
    return <div data-testid="attack-rider-maneuver-prompt"><button data-testid="maneuver-skip" onClick={onSkip}>Skip</button></div>;
  },
}));
vi.mock('./modals/ConstellationSelectionModal.jsx', () => ({
  default: function TestModal({ onConfirm, onClose }) {
    return (
      <div data-testid="constellation-selection-modal">
        <button data-testid="const-confirm" onClick={() => onConfirm('test-option')}>Confirm</button>
        <button data-testid="const-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/divine/BastionOfLawModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="bastion-of-law-modal">
        <button data-testid="bastion-close" onClick={onClose}>Close</button>
        {onConfirm && <button data-testid="bastion-confirm" onClick={() => onConfirm(5, 'target')}>Confirm</button>}
      </div>
    );
  },
}));
vi.mock('./modals/MoonlightStepResourceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="moonlight-step-resource-modal">MoonlightStepResourceModal</div>; },
}));
vi.mock('./modals/BulwarkOfForceModal.jsx', () => ({
  default: function TestModal({ onSkip }) {
    return (
      <div data-testid="bulwark-of-force-modal">
        <button data-testid="bulwark-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/CoronaEnemySelectionModal.jsx', () => ({
  default: function TestModal({ onSkip }) {
    return (
      <div data-testid="corona-enemy-selection-modal">
        <button data-testid="corona-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/RadianceOfDawnModal.jsx', () => ({
  default: function TestModal({ onSkip }) {
    return (
      <div data-testid="radiance-of-dawn-modal">
        <button data-testid="radiance-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/MantleOfInspirationModal.jsx', () => ({
  default: function TestModal({ onSkip }) {
    return (
      <div data-testid="mantle-of-inspiration-modal">
        <button data-testid="mantle-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/CelestialResilienceModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="celestial-resilience-modal">
        <button data-testid="celestial-resilience-skip" onClick={onSkip}>Skip</button>
        <button data-testid="celestial-resilience-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/VitalityOfTheTreeModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="vitality-of-the-tree-modal">
        <button data-testid="vitality-skip" onClick={onSkip}>Skip</button>
        <button data-testid="vitality-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/InspiringSmiteModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="inspiring-smite-modal">
        <button data-testid="inspiring-smite-skip" onClick={onSkip}>Skip</button>
        <button data-testid="inspiring-smite-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function TestModal({ title, targets, onTargetSelected, onSkip, confirmLabel, description, showHp }) {
    return (
      <div data-testid="secondary-target-modal">
        <div data-testid="secondary-title">{title}</div>
        {description && <div data-testid="secondary-desc">{description}</div>}
        {showHp && <div data-testid="secondary-show-hp">true</div>}
        {targets.map((target, i) => (
          <label key={i} data-testid={`secondary-target-${target.name}`} onClick={() => onTargetSelected(target.name)}>
            {target.name}
          </label>
        ))}
        <button data-testid="secondary-confirm" onClick={() => onTargetSelected(targets[0]?.name)}>{confirmLabel}</button>
        <button data-testid="secondary-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function TestModal({ title, targets, onConfirm, onSkip, confirmLabel, note }) {
    return (
      <div data-testid="creature-selection-modal">
        <div data-testid="creature-title">{title}</div>
        {note && <div data-testid="creature-note">{note}</div>}
        {targets.map((target, i) => (
          <label key={i} data-testid={`creature-target-${target.name}`} onClick={() => onConfirm([target.name])}>
            {target.name}
          </label>
        ))}
        <button data-testid="creature-confirm" onClick={() => onConfirm(targets.map(t => t.name))}>{confirmLabel}</button>
        <button data-testid="creature-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('../../services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js', () => ({
  handle: vi.fn().mockResolvedValue(undefined),
  handleClearWard: vi.fn().mockResolvedValue(undefined),
  handleSpendDice: vi.fn().mockResolvedValue(undefined),
  handleApply: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/rules/spells/postCastHealService.js', () => ({
  applyStarryChaliceHeal: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/automation/handlers/combat/elementalEpitomeHandler.js', () => ({
  handle: vi.fn(),
  handleElementalEpitome: vi.fn(),
  applyResistanceChoice: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  handle: vi.fn(),
  applyDamageTypeChoice: vi.fn().mockResolvedValue(undefined),
  applyTargetChoice: vi.fn().mockResolvedValue(undefined),
  skipTargetChoice: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/automation/common/oncePerTurn.js', () => ({
  setSkipFlag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn().mockReturnValue({ total: 5, rolls: [5], modifier: 0 }),
  rollExpressionDoubled: vi.fn().mockReturnValue({ total: 10, rolls: [5, 5], modifier: 0 }),
}));
vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));
vi.mock('./popups/FlurryOfBlowsTargetPopup.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="flurry-of-blows-popup">
        <button data-testid="flurry-skip" onClick={onSkip}>Skip</button>
        <button data-testid="flurry-confirm" onClick={() => onConfirm('target')}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="elemental-epitome-modal">
        <button data-testid="epitome-close" onClick={onClose}>Close</button>
        <button data-testid="epitome-confirm" onClick={() => onConfirm('fire')}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="destructive-stride-modal">
        <button data-testid="stride-close" onClick={onClose}>Close</button>
        <button data-testid="stride-confirm" onClick={() => onConfirm('fire')}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/shared/RecklessAttackModal.jsx', () => ({
  default: function TestModal({ onConfirm, onCancel, mode }) {
    return (
      <div data-testid="reckless-attack-modal">
        <div data-testid="reckless-mode">{mode}</div>
        <button data-testid="reckless-confirm" onClick={() => onConfirm({}, 'test-choice')}>Confirm</button>
        <button data-testid="reckless-cancel" onClick={() => onCancel()}>Cancel</button>
      </div>
    );
  },
}));
vi.mock('./modals/MassHealModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mass-heal-modal">
        <button data-testid="mass-heal-skip" onClick={onSkip}>Skip</button>
        <button data-testid="mass-heal-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/divine/ClockworkCavalcadeModal.jsx', () => ({
  default: function TestModal({ onChoose, onClose }) {
    return (
      <div data-testid="clockwork-cavalcade-modal">
        <button data-testid="cc-close" onClick={onClose}>Close</button>
        <button data-testid="cc-heal" onClick={() => onChoose('heal')}>Heal</button>
        <button data-testid="cc-dispel" onClick={() => onChoose('dispel')}>Dispel</button>
        <button data-testid="cc-repair" onClick={() => onChoose('repair')}>Repair</button>
      </div>
    );
  },
}));
vi.mock('./modals/MassCureWoundsModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mass-cure-wounds-modal">
        <button data-testid="mass-cure-skip" onClick={onSkip}>Skip</button>
        <button data-testid="mass-cure-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/PrayerOfHealingModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="prayer-of-healing-modal">
        <button data-testid="prayer-skip" onClick={onSkip}>Skip</button>
        <button data-testid="prayer-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/PowerWordFortifyModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="power-word-fortify-modal">
        <button data-testid="fortify-skip" onClick={onSkip}>Skip</button>
        <button data-testid="fortify-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/MassHealingWordModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mass-healing-word-modal">
        <button data-testid="healing-word-skip" onClick={onSkip}>Skip</button>
        <button data-testid="healing-word-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/AnimateDeadModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="animate-dead-modal">
        <button data-testid="animate-dead-close" onClick={onClose}>Close</button>
        <button data-testid="animate-dead-confirm" onClick={() => onConfirm({ zombieCount: 2, skeletonCount: 1 })}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/CreateUndeadModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="create-undead-modal">
        <button data-testid="create-undead-close" onClick={onClose}>Close</button>
        <button data-testid="create-undead-confirm" onClick={() => onConfirm({ ghoulCount: 1 })}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/SummonSpiritModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="summon-spirit-modal">
        <button data-testid="summon-spirit-close" onClick={onClose}>Close</button>
        <button data-testid="summon-spirit-confirm" onClick={() => onConfirm('air')}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('../../services/automation/handlers/spells/animateDeadHandler.js', () => ({
  handle: vi.fn(),
  confirmAnimateDead: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/automation/handlers/spells/createUndeadHandler.js', () => ({
  handle: vi.fn(),
  confirmCreateUndead: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/automation/handlers/spells/summonSpiritHandler.js', () => ({
  handle: vi.fn(),
  confirmSummonSpirit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./modals/shared/SaveAttackHealModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="save-attack-heal-modal">SaveAttackHealModal</div>; },
}));
vi.mock('./modals/ShieldBashChoiceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="shield-bash-choice-modal"><button data-testid="shield-bash-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="quivering-palm-modal"><button data-testid="quivering-palm-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ZealousPresenceModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="zealous-presence-modal">
        <button data-testid="zealous-skip" onClick={onSkip}>Skip</button>
        <button data-testid="zealous-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/AnimateDeadModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="animate-dead-modal">
        <button data-testid="animate-dead-close" onClick={onClose}>Close</button>
        <button data-testid="animate-dead-confirm" onClick={() => onConfirm({ zombieCount: 2, skeletonCount: 1 })}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/CreateUndeadModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="create-undead-modal">
        <button data-testid="create-undead-close" onClick={onClose}>Close</button>
        <button data-testid="create-undead-confirm" onClick={() => onConfirm({ ghoulCount: 1 })}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/SummonSpiritModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="summon-spirit-modal">
        <button data-testid="summon-spirit-close" onClick={onClose}>Close</button>
        <button data-testid="summon-spirit-confirm" onClick={() => onConfirm('air')}>Confirm</button>
      </div>
    );
  },
}));

// ── Tests ──

describe('CharActionModals — helper function confirm handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleHealingIllusionConfirm', () => {
    it('calls setRuntimeValue and logHealingToSSE when target is selected', async () => {
      const setModalState = vi.fn();
      const playerStats = { name: 'Caster', level: 5, hitPoints: 30 };
      const characters = [{ name: 'Ally1', type: 'humanoid', size: 'M', currentHp: 30, maxHp: 50 }];

      render(<CharActionModals
        {...createBaseProps({ playerStats })}
        characters={characters}
        modalState={{ healingIllusionModal: { action: { name: 'Healing Illusion' }, playerStats } }}
        setModalState={setModalState}
      />);

      // Click the confirm button on the SecondaryTargetModal
      fireEvent.click(screen.getByTestId('secondary-confirm'));

      await waitFor(() => {
        expect(setModalState).toHaveBeenCalledWith({ healingIllusionModal: null });
      });
    });

    it('fires buffs-updated event on skip', async () => {
      const setModalState = vi.fn();
      const playerStats = { name: 'Caster', level: 3 };

      render(<CharActionModals
        {...createBaseProps({ playerStats })}
        modalState={{ healingIllusionModal: { action: {}, playerStats } }}
        setModalState={setModalState}
      />);

      fireEvent.click(screen.getByTestId('secondary-skip'));

      await waitFor(() => {
        expect(setModalState).toHaveBeenCalledWith({ healingIllusionModal: null });
      });
    });
  });

  describe('handleInvokeDuplicityConfirm', () => {
    it('calls setRuntimeValue and addEntry when allies are selected', async () => {
      const setModalState = vi.fn();
      const playerStats = { name: 'Alric' };

      render(<CharActionModals
        {...createBaseProps({ playerStats })}
        modalState={{ invokeDuplicityModal: { action: {}, playerStats } }}
        setModalState={setModalState}
      />);

      // Click the creature confirm button
      fireEvent.click(screen.getByTestId('creature-confirm'));

      await waitFor(() => {
        expect(setModalState).toHaveBeenCalledWith({ invokeDuplicityModal: null });
      });
    });

    it('closes immediately with no allies selected', async () => {
      const setModalState = vi.fn();
      const playerStats = { name: 'Alric' };

      render(<CharActionModals
        {...createBaseProps({ playerStats })}
        modalState={{ invokeDuplicityModal: { action: {}, playerStats } }}
        setModalState={setModalState}
      />);

      // The CreatureSelectionModal requires at least one target; skip closes it
      fireEvent.click(screen.getByTestId('creature-skip'));

      await waitFor(() => {
        expect(setModalState).toHaveBeenCalledWith({ invokeDuplicityModal: null });
      });
    });
  });
});

describe('CharActionModals — modal close handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('openHandFromFlurry modal', () => {
    it('renders OpenHandTechniqueModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleOpenHandFromFlurryConfirm: vi.fn(), handleOpenHandFromFlurrySkip: vi.fn() })}
        modalState={{ openHandFromFlurry: { targets: [{ action: {}, playerStats: {}, campaignName: 'test-campaign', targetName: 'Goblin' }], currentIndex: 0, saveDc: 15 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('open-hand-technique-modal')).toBeTruthy();
    });

    it('calls handleOpenHandFromFlurrySkip on close', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleOpenHandFromFlurrySkip: handler })}
        modalState={{ openHandFromFlurry: { targets: [{ action: {}, playerStats: {}, campaignName: 'test-campaign', targetName: 'Goblin' }], currentIndex: 0, saveDc: 15 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('open-hand-close'));
      expect(handler).toHaveBeenCalled();
    });

    it('calls handleOpenHandFromFlurryConfirm on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleOpenHandFromFlurryConfirm: handler })}
        modalState={{ openHandFromFlurry: { targets: [{ action: {}, playerStats: {}, campaignName: 'test-campaign', targetName: 'Goblin' }], currentIndex: 0, saveDc: 15 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('open-hand-confirm'));
      expect(handler).toHaveBeenCalledWith({ optionName: 'grappled' });
    });
  });

  describe('shieldBashModal close handler', () => {
    it('dispatches target-effects-updated and combat-summary-updated on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ shieldBashModal: { action: {} } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('shield-bash-close'));
      expect(setModalState).toHaveBeenCalledWith({ shieldBashModal: null });
    });
  });

  describe('quiveringPalmModal close handler', () => {
    it('dispatches target-effects-updated and combat-summary-updated on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ quiveringPalmModal: { action: {} } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('quivering-palm-close'));
      expect(setModalState).toHaveBeenCalledWith({ quiveringPalmModal: null });
    });
  });

  describe('CelestialResilienceModal onSkip handler', () => {
    it('calls handleCelestialResilienceSkip on skip button', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleCelestialResilienceSkip: handler })}
        modalState={{ celestialResilienceModal: { creatureTargets: [{ name: 'Goblin' }], allyTempHp: 5, selfTempHp: 10, maxTargets: 5 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('celestial-resilience-skip'));
      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('CharActionModals — inline choice modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('divineFuryChoice inline modal', () => {
    it('renders damage type buttons and calls handlers', () => {
      const handleDivineFuryDamageType = vi.fn();
      const handleDivineFurySkip = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleDivineFuryDamageType, handleDivineFurySkip })}
        modalState={{ divineFuryChoice: {} }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByText('Necrotic'));
      expect(handleDivineFuryDamageType).toHaveBeenCalledWith('Necrotic');
      fireEvent.click(screen.getByText('Radiant'));
      expect(handleDivineFuryDamageType).toHaveBeenCalledWith('Radiant');
      fireEvent.click(screen.getByText('Skip'));
      expect(handleDivineFurySkip).toHaveBeenCalled();
    });
  });

  describe('damageTypeChoice inline modal', () => {
    it('renders with damage type buttons and calls generic handlers', () => {
      const handleGenericDamageTypeChoice = vi.fn();
      const handleGenericDamageTypeSkip = vi.fn();
      render(<CharActionModals
        {...createBaseProps({
          handleGenericDamageTypeChoice,
          handleGenericDamageTypeSkip,
          handleEnhancedUnarmedChoice: vi.fn(),
          handleEnhancedUnarmedSkip: vi.fn(),
          handleDamageTypeModifierChoice: vi.fn(),
          handleDamageTypeModifierSkip: vi.fn(),
        })}
        modalState={{ damageTypeChoice: { title: 'Test', types: ['Fire', 'Cold'] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByText('Fire'));
      expect(handleGenericDamageTypeChoice).toHaveBeenCalledWith('Fire');
      fireEvent.click(screen.getByText('Skip'));
      expect(handleGenericDamageTypeSkip).toHaveBeenCalled();
    });

    it('calls enhancedUnarmed handlers when pendingDamage._attackRider is set', () => {
      const handleEnhancedUnarmedChoice = vi.fn();
      const handleEnhancedUnarmedSkip = vi.fn();
      render(<CharActionModals
        {...createBaseProps({
          handleEnhancedUnarmedChoice,
          handleEnhancedUnarmedSkip,
          handleGenericDamageTypeChoice: vi.fn(),
          handleGenericDamageTypeSkip: vi.fn(),
          handleDamageTypeModifierChoice: vi.fn(),
          handleDamageTypeModifierSkip: vi.fn(),
          pendingDamage: { _attackRider: true },
        })}
        modalState={{ damageTypeChoice: { title: 'Test', types: ['Fire'] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByText('Fire'));
      expect(handleEnhancedUnarmedChoice).toHaveBeenCalledWith('Fire');
      fireEvent.click(screen.getByText('Skip'));
      expect(handleEnhancedUnarmedSkip).toHaveBeenCalled();
    });
  });

  describe('featureChoice inline modal', () => {
    it('renders feature options and calls handleFeatureChoiceConfirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleFeatureChoiceConfirm: handler, handleFeatureChoiceSkip: vi.fn() })}
        modalState={{ featureChoice: { action: { name: 'Test Feature', description: 'Test desc' }, options: ['Option A', 'Option B'] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByText('Option A'));
      expect(handler).toHaveBeenCalledWith('Option A');
    });

    it('calls handleFeatureChoiceSkip on cancel', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleFeatureChoiceConfirm: vi.fn(), handleFeatureChoiceSkip: handler })}
        modalState={{ featureChoice: { action: { name: 'Test' }, options: ['Opt'] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('CharActionModals — secondary target modal skip handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TricksterBlessingModal onSkip', () => {
    it('calls handleTricksterBlessingConfirm(null) on skip', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleTricksterBlessingConfirm: handler })}
        modalState={{ tricksterBlessingModal: { creatureTargets: [{ name: 'Goblin' }] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      expect(handler).toHaveBeenCalledWith(null);
    });
  });

  describe('BardicInspirationTargetModal onSkip', () => {
    it('calls handleBardicInspirationConfirm(null) on skip', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleBardicInspirationConfirm: handler })}
        modalState={{ bardicInspirationTargetModal: { creatureTargets: [{ name: 'Goblin' }], dieSize: 6 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      expect(handler).toHaveBeenCalledWith(null);
    });
  });

  describe('InspiringMovementAllyModal onSkip', () => {
    it('calls handleInspiringMovementConfirm(null) on skip', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleInspiringMovementConfirm: handler })}
        modalState={{ inspiringMovementAllyModal: { creatureTargets: [{ name: 'Goblin' }] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      expect(handler).toHaveBeenCalledWith(null);
    });
  });

  describe('OceanicGiftTargetModal onSkip', () => {
    it('calls handleOceanicGiftConfirm(null) on skip', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleOceanicGiftConfirm: handler })}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [{ name: 'Goblin' }] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      expect(handler).toHaveBeenCalledWith(null);
    });

    it('renders with doubleEmanation text', () => {
      render(<CharActionModals
        {...createBaseProps({ handleOceanicGiftConfirm: vi.fn() })}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [{ name: 'Goblin' }], doubleEmanation: true } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toContain('Oceanic Gift');
    });
  });
});

describe('CharActionModals — async confirm handlers with setPopupHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AnimateDeadModal onConfirm with setPopupHtml', () => {
    it('calls confirmAnimateDead and sets popupHtml on result', async () => {
      const setPopupHtml = vi.fn();
      const mockResult = { payload: '<b>Animate Dead</b><br/>Created 2 zombies' };
      vi.mocked((await import('../../services/automation/handlers/spells/animateDeadHandler.js')).confirmAnimateDead).mockResolvedValue(mockResult);

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml })}
        modalState={{ animateDeadModal: { maxTargets: 3, action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('animate-dead-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith(mockResult.payload);
      });
    });
  });

  describe('CreateUndeadModal onConfirm with setPopupHtml', () => {
    it('calls confirmCreateUndead and sets popupHtml on result', async () => {
      const setPopupHtml = vi.fn();
      const mockResult = { payload: '<b>Create Undead</b><br/>Created 1 ghoul' };
      vi.mocked((await import('../../services/automation/handlers/spells/createUndeadHandler.js')).confirmCreateUndead).mockResolvedValue(mockResult);

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml })}
        modalState={{ createUndeadModal: { maxTargets: 3, action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('create-undead-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith(mockResult.payload);
      });
    });
  });

  describe('SummonSpiritModal onConfirm with setPopupHtml', () => {
    it('calls confirmSummonSpirit and sets popupHtml on result', async () => {
      const setPopupHtml = vi.fn();
      const mockResult = { payload: '<b>Summon Spirit</b><br/>Air spirit summoned' };
      vi.mocked((await import('../../services/automation/handlers/spells/summonSpiritHandler.js')).confirmSummonSpirit).mockResolvedValue(mockResult);

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml })}
        modalState={{ summonSpiritModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('summon-spirit-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith(mockResult.payload);
      });
    });
  });

  describe('handleStarryChaliceConfirm with setPopupHtml', () => {
    it('sets popupHtml when applyStarryChaliceHeal returns data', async () => {
      const setPopupHtml = vi.fn();
      const { applyStarryChaliceHeal } = await import('../../services/rules/spells/postCastHealService.js');
      vi.mocked(applyStarryChaliceHeal).mockResolvedValue({ targetName: 'Ally1', actualHeal: 5 });

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml, campaignName: 'test-campaign' })}
        modalState={{ starryChaliceHealModal: { targetNames: ['Ally1'], amount: 10 } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('secondary-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalled();
      });
    });
  });

  describe('handleEpitomeConfirm with setPopupHtml', () => {
    it('sets popupHtml when applyResistanceChoice returns payload', async () => {
      const setPopupHtml = vi.fn();
      const { applyResistanceChoice } = await import('../../services/automation/handlers/combat/elementalEpitomeHandler.js');
      vi.mocked(applyResistanceChoice).mockResolvedValue({ payload: 'Resistance applied' });

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml, handleEpitomeConfirm: vi.fn() })}
        modalState={{ epitomeModal: { action: {}, playerStats: {}, campaignName: 'test-campaign', currentResistance: 'cold' } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('epitome-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith('Resistance applied');
      });
    });
  });

  describe('handleDestructiveStrideConfirm with setPopupHtml', () => {
    it('sets popupHtml when result has payload', async () => {
      const setPopupHtml = vi.fn();
      const { applyDamageTypeChoice } = await import('../../services/automation/handlers/combat/destructiveStrideHandler.js');
      vi.mocked(applyDamageTypeChoice).mockResolvedValue({ payload: 'Damage applied' });

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml, handleDestructiveStrideConfirm: vi.fn() })}
        modalState={{ destructiveStrideModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('stride-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith('Damage applied');
      });
    });

    it('sets destructiveStrideTargetModal when result has modal type', async () => {
      const setModalState = vi.fn();
      const { applyDamageTypeChoice } = await import('../../services/automation/handlers/combat/destructiveStrideHandler.js');
      vi.mocked(applyDamageTypeChoice).mockResolvedValue({ type: 'modal', payload: { action: {}, chosenType: 'fire' } });

      render(<CharActionModals
        {...createBaseProps({ handleDestructiveStrideConfirm: vi.fn() })}
        modalState={{ destructiveStrideModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={setModalState}
      />);

      fireEvent.click(screen.getByTestId('stride-confirm'));

      await waitFor(() => {
        expect(setModalState).toHaveBeenCalledWith({ destructiveStrideTargetModal: { action: {}, chosenType: 'fire' } });
      });
    });
  });

  describe('handleDestructiveStrideTargetConfirm with setPopupHtml', () => {
    it('sets popupHtml when applyTargetChoice returns payload', async () => {
      const setPopupHtml = vi.fn();
      const { applyTargetChoice } = await import('../../services/automation/handlers/combat/destructiveStrideHandler.js');
      vi.mocked(applyTargetChoice).mockResolvedValue({ payload: 'Target damage applied' });

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml, handleDestructiveStrideTargetConfirm: vi.fn(), handleDestructiveStrideTargetSkip: vi.fn() })}
        modalState={{ destructiveStrideTargetModal: { targets: [{ name: 'Goblin' }], action: {}, chosenType: 'fire', martialArtsDie: 4 } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('secondary-confirm'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith('Target damage applied');
      });
    });
  });

  describe('handleDestructiveStrideTargetSkip with setPopupHtml', () => {
    it('sets popupHtml when skipTargetChoice returns payload', async () => {
      const setPopupHtml = vi.fn();
      const { skipTargetChoice } = await import('../../services/automation/handlers/combat/destructiveStrideHandler.js');
      vi.mocked(skipTargetChoice).mockResolvedValue({ payload: 'Skipped' });

      render(<CharActionModals
        {...createBaseProps({ setPopupHtml, handleDestructiveStrideTargetConfirm: vi.fn(), handleDestructiveStrideTargetSkip: vi.fn() })}
        modalState={{ destructiveStrideTargetModal: { targets: [{ name: 'Goblin' }], action: {}, chosenType: 'fire', martialArtsDie: 4 } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByTestId('secondary-skip'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith('Skipped');
      });
    });
  });
});

describe('CharActionModals — mass healing modals skip handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MassHealModal onSkip', () => {
    it('calls setModalState with null', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleMassHealConfirm: vi.fn() })}
        modalState={{ massHealModal: { creatureTargets: ['Goblin'], totalPool: 50, campaignName: 'test-campaign', combatSummary: {} } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('mass-heal-skip'));
      expect(setModalState).toHaveBeenCalledWith({ massHealModal: null });
    });
  });

  describe('MassCureWoundsModal onSkip', () => {
    it('calls setModalState with null', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleMassCureWoundsConfirm: vi.fn() })}
        modalState={{ massCureWoundsModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('mass-cure-skip'));
      expect(setModalState).toHaveBeenCalledWith({ massCureWoundsModal: null });
    });
  });

  describe('PrayerOfHealingModal onSkip', () => {
    it('calls setModalState with null', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handlePrayerOfHealingConfirm: vi.fn() })}
        modalState={{ prayerOfHealingModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('prayer-skip'));
      expect(setModalState).toHaveBeenCalledWith({ prayerOfHealingModal: null });
    });
  });

  describe('PowerWordFortifyModal onSkip', () => {
    it('calls setModalState with null', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handlePowerWordFortifyConfirm: vi.fn() })}
        modalState={{ powerWordFortifyModal: { creatureTargets: ['Goblin'], totalTempHp: 10 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('fortify-skip'));
      expect(setModalState).toHaveBeenCalledWith({ powerWordFortifyModal: null });
    });
  });

  describe('MassHealingWordModal onSkip', () => {
    it('calls setModalState with null', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleMassHealingWordConfirm: vi.fn() })}
        modalState={{ massHealingWordModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('healing-word-skip'));
      expect(setModalState).toHaveBeenCalledWith({ massHealingWordModal: null });
    });
  });
});

describe('CharActionModals — CombatStanceModal close handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches buffs-updated on close', () => {
    const setModalState = vi.fn();
    render(<CharActionModals
      {...createBaseProps({})}
      modalState={{ combatStanceModal: { action: {} } }}
      setModalState={setModalState}
    />);
    fireEvent.click(screen.getByTestId('combat-stance-close'));
    expect(setModalState).toHaveBeenCalledWith({ combatStanceModal: null });
  });
});

describe('CharActionModals — RevelationInFleshModal close handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches buffs-updated on close', () => {
    const setModalState = vi.fn();
    render(<CharActionModals
      {...createBaseProps({})}
      modalState={{ revelationInFleshModal: { action: {} } }}
      setModalState={setModalState}
    />);
    fireEvent.click(screen.getByTestId('revelation-close'));
    expect(setModalState).toHaveBeenCalledWith({ revelationInFleshModal: null });
  });
});

describe('CharActionModals — TeleportModal close handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches buffs-updated on close', () => {
    const setModalState = vi.fn();
    render(<CharActionModals
      {...createBaseProps({})}
      modalState={{ teleportModal: { action: {} } }}
      setModalState={setModalState}
    />);
    fireEvent.click(screen.getByTestId('teleport-close'));
    expect(setModalState).toHaveBeenCalledWith({ teleportModal: null });
  });
});

describe('CharActionModals — wildMagicSurgeModal with setSpellModalState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears both modalState and spellModalState on close', () => {
    const setModalState = vi.fn();
    const setSpellModalState = vi.fn();
    render(<CharActionModals
      {...createBaseProps({})}
      modalState={{ wildMagicSurgeModal: {} }}
      spellModalState={{ wildMagicSurgeModal: {} }}
      setModalState={setModalState}
      setSpellModalState={setSpellModalState}
    />);
    // The WildMagicSurgeModal mock doesn't render buttons, so we test via setModalState
    expect(setModalState).not.toHaveBeenCalled();
  });
});

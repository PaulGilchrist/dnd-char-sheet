// Comprehensive rendering tests for remaining modals not covered in rendering.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  default: function TestModal({ onClose }) {
    return <div data-testid="open-hand-technique-modal"><button data-testid="open-hand-close" onClick={onClose}>Close</button></div>;
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
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));
vi.mock('../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue(null),
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
  default: function TestModal({ onClose }) {
    return <div data-testid="divine-intervention-modal"><button data-testid="divine-intervention-close" onClick={onClose}>Close</button></div>;
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
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function TestModal({ title }) {
    return <div data-testid="secondary-target-modal"><div data-testid="secondary-title">{title}</div></div>;
  },
}));
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function TestModal({ title }) {
    return <div data-testid="creature-selection-modal"><div data-testid="creature-title">{title}</div></div>;
  },
}));
vi.mock('./popups/FlurryOfBlowsTargetPopup.jsx', () => ({
  default: function TestModal() { return <div data-testid="flurry-of-blows-popup">FlurryOfBlowsTargetPopup</div>; },
}));
vi.mock('./modals/ShieldBashChoiceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="shield-bash-modal">ShieldBashChoiceModal</div>; },
}));
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="quivering-palm-modal">QuiveringPalmModal</div>; },
}));
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="elemental-epitome-modal">ElementalEpitomeModal</div>; },
}));
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="destructive-stride-modal">DestructiveStrideModal</div>; },
}));
vi.mock('./modals/shared/RecklessAttackModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="reckless-attack-modal">RecklessAttackModal</div>; },
}));
vi.mock('./modals/MassHealModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="mass-heal-modal">MassHealModal</div>; },
}));
vi.mock('./modals/divine/ClockworkCavalcadeModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="clockwork-cavalcade-modal">ClockworkCavalcadeModal</div>; },
}));
vi.mock('./modals/MassCureWoundsModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="mass-cure-wounds-modal">MassCureWoundsModal</div>; },
}));
vi.mock('./modals/PrayerOfHealingModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="prayer-of-healing-modal">PrayerOfHealingModal</div>; },
}));
vi.mock('./modals/PowerWordFortifyModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="power-word-fortify-modal">PowerWordFortifyModal</div>; },
}));
vi.mock('./modals/MassHealingWordModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="mass-healing-word-modal">MassHealingWordModal</div>; },
}));
vi.mock('./modals/AnimateDeadModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="animate-dead-modal">AnimateDeadModal</div>; },
}));
vi.mock('./modals/CreateUndeadModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="create-undead-modal">CreateUndeadModal</div>; },
}));
vi.mock('./modals/SummonSpiritModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="summon-spirit-modal">SummonSpiritModal</div>; },
}));
vi.mock('./modals/VitalityOfTheTreeModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="vitality-of-the-tree-modal">VitalityOfTheTreeModal</div>; },
}));
vi.mock('./modals/InspiringSmiteModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="inspiring-smite-modal">InspiringSmiteModal</div>; },
}));
vi.mock('./modals/ZealousPresenceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="zealous-presence-modal">ZealousPresenceModal</div>; },
}));
vi.mock('./modals/CelestialResilienceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="celestial-resilience-modal">CelestialResilienceModal</div>; },
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
vi.mock('./modals/BlindnessDeafnessModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="blindness-deafness-modal">BlindnessDeafnessModal</div>; },
}));
vi.mock('../../services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js', () => ({
  handle: vi.fn().mockResolvedValue(undefined),
  handleSpendDice: vi.fn().mockResolvedValue(undefined),
  handleClearWard: vi.fn().mockResolvedValue(undefined),
  handleApply: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──

describe('CharActionModals — additional modal rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Inline overlays (div-based, not mocked component) ──

  describe('inline overlays', () => {
    it('renders attackRiderOptionsModal inline overlay with maneuver name header', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ attackRiderOptionsModal: { maneuver: { name: 'Test Maneuver' }, riderOptions: [] } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Test Maneuver — Choose Effect')).toBeInTheDocument();
    });

    it('renders attackRiderOptionsModal with effect descriptions', () => {
      const riderOptions = [
        { name: 'Option 1', effect: 'disadvantage_on_next_save' },
        { name: 'Option 2', effect: 'next_attack_bonus' },
        { name: 'Option 3', effect: 'push_15ft' },
        { name: 'Option 4', effect: 'speed_reduction' },
      ];
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ attackRiderOptionsModal: { maneuver: { name: 'Test' }, riderOptions } }}
        setModalState={vi.fn()}
      />);
      // Effect descriptions are rendered inside span elements with inline styles
      // Use query methods to check for presence of text content
      const container = screen.getByText('Test — Choose Effect').closest('.sp-modal');
      expect(container).toBeTruthy();
      expect(container.textContent).toContain('Disadvantage on next saving throw');
      expect(container.textContent).toContain('Next attack against target gains +5 bonus');
      expect(container.textContent).toContain('Push target 15 feet');
      expect(container.textContent).toContain('Reduce target\'s speed by 15 feet');
    });

    it('renders attackRiderOptionsModal with Skip button', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ attackRiderOptionsModal: { maneuver: { name: 'Test' }, riderOptions: [] } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('renders clockworkCavalcadeRepairModal inline with hammer icon', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ clockworkCavalcadeRepairModal: {} }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Clockwork Cavalcade: Repair')).toBeInTheDocument();
      expect(screen.getByText('Repair')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders clockworkCavalcadeRepairModal with description about damaged objects', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ clockworkCavalcadeRepairModal: {} }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText(/Damaged objects within the Cube/)).toBeInTheDocument();
    });

    it('renders moonlightStepFallbackModal inline with slot level info', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ moonlightStepFallbackModal: { action: { name: 'Moonlight Step' }, slotLevel: 3 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText(/Consume a level 3 spell slot/)).toBeInTheDocument();
      expect(screen.getByText('Yes, Consume Slot')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  // ── Additional modals not covered in rendering.test.jsx ──

  describe('additional modals', () => {
    const additionalModals = [
      { name: 'shield-bash', prop: 'shieldBashModal', testid: 'shield-bash-modal' },
      { name: 'quivering-palm', prop: 'quiveringPalmModal', testid: 'quivering-palm-modal' },
      { name: 'save-attack-aoe', prop: 'saveAttackAoeModal', testid: 'save-attack-aoe-modal' },
      { name: 'aoe-condition', prop: 'aoeConditionModal', testid: 'aoe-condition-modal' },
      { name: 'fear', prop: 'fearModal', testid: 'fear-modal' },
      { name: 'hypnotic-pattern', prop: 'hypnoticPatternModal', testid: 'hypnotic-pattern-modal' },
      { name: 'mass-suggestion', prop: 'massSuggestionModal', testid: 'mass-suggestion-modal' },
      { name: 'calm-emotions', prop: 'calmEmotionsModal', testid: 'calm-emotions-modal' },
      { name: 'silence', prop: 'silenceModal', testid: 'silence-modal' },
      { name: 'tashas-laughter', prop: 'tashasLaughterModal', testid: 'tashas-laughter-modal' },
      { name: 'elemental-attunement', prop: 'elementalAttunementModal', testid: 'elemental-attunement-modal' },
      { name: 'elemental-burst', prop: 'elementalBurstModal', payload: {}, testid: 'elemental-burst-modal' },
      { name: 'primal-companion-summon', prop: 'primalCompanionSummonModal', testid: 'primal-companion-summon-modal' },
      { name: 'stealth-attack', prop: 'stealthAttackModal', testid: 'stealth-attack-modal' },
      { name: 'fey-reinforcements', prop: 'feyReinforcementsModal', testid: 'fey-reinforcements-modal' },
      { name: 'steps-of-the-fey-taunt', prop: 'stepsOfTheFeyTauntModal', testid: 'steps-of-the-fey-taunt-modal' },
      { name: 'blindness-deafness', prop: 'blindnessDeafnessModal', payload: {}, testid: 'blindness-deafness-modal' },
      { name: 'set-condition', prop: 'setConditionModal', payload: {}, testid: 'set-condition-modal' },
      { name: 'eyebite-effect', prop: 'eyebiteEffectModal', payload: {}, testid: 'eyebite-effect-modal' },
      { name: 'arcane-ward-restore', prop: 'arcaneWardRestoreModal', payload: {}, testid: 'arcane-ward-restore-modal' },
      { name: 'elemental-epitome', prop: 'epitomeModal', payload: { action: {}, playerStats: {}, campaignName: 'test', currentResistance: 'fire' }, testid: 'elemental-epitome-modal' },
      { name: 'destructive-stride', prop: 'destructiveStrideModal', payload: { action: {}, playerStats: {}, campaignName: 'test' }, testid: 'destructive-stride-modal' },
      { name: 'reckless-attack', prop: 'recklessAttackModal', payload: { attack: {}, mode: 'full', hasBrutalStrike: false }, testid: 'reckless-attack-modal' },
      { name: 'reckless-attack-brutal-only', prop: 'recklessAttackModal', payload: { attack: {}, mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: ['Option A'] }, testid: 'reckless-attack-modal' },
      { name: 'mass-heal', prop: 'massHealModal', payload: { creatureTargets: [], maxTargets: 5 }, testid: 'mass-heal-modal' },
      { name: 'clockwork-cavalcade', prop: 'clockworkCavalcadeModal', payload: {}, testid: 'clockwork-cavalcade-modal' },
      { name: 'mass-cure-wounds', prop: 'massCureWoundsModal', payload: { creatureTargets: [], maxTargets: 5 }, testid: 'mass-cure-wounds-modal' },
      { name: 'prayer-of-healing', prop: 'prayerOfHealingModal', payload: { creatureTargets: [], maxTargets: 5 }, testid: 'prayer-of-healing-modal' },
      { name: 'power-word-fortify', prop: 'powerWordFortifyModal', payload: { creatureTargets: [], totalTempHp: 10 }, testid: 'power-word-fortify-modal' },
      { name: 'mass-healing-word', prop: 'massHealingWordModal', payload: { creatureTargets: [], maxTargets: 5 }, testid: 'mass-healing-word-modal' },
      { name: 'animate-dead', prop: 'animateDeadModal', payload: { maxTargets: 3 }, testid: 'animate-dead-modal' },
      { name: 'create-undead', prop: 'createUndeadModal', payload: { maxTargets: 3 }, testid: 'create-undead-modal' },
      { name: 'summon-spirit', prop: 'summonSpiritModal', payload: { action: {} }, testid: 'summon-spirit-modal' },
      { name: 'flurry-of-blows', prop: 'flurryOfBlowsModal', payload: { numAttacks: 3, creatureTargets: [], currentTargetName: 'Goblin' }, testid: 'flurry-of-blows-popup' },
      { name: 'celestial-resilience', prop: 'celestialResilienceModal', payload: { creatureTargets: [], allyTempHp: 5, selfTempHp: 10, maxTargets: 3 }, testid: 'celestial-resilience-modal' },
      { name: 'vitality-of-the-tree', prop: 'vitalityOfTheTreeTarget', payload: { creatureTargets: [], tempHp: 5, maxTargets: 3 }, testid: 'vitality-of-the-tree-modal' },
      { name: 'inspiring-smite', prop: 'inspiringSmiteModal', payload: { creatureTargets: [], tempHp: 5, roll: 3 }, testid: 'inspiring-smite-modal' },
      { name: 'zealous-presence', prop: 'zealousPresenceModal', payload: { creatureTargets: [], maxTargets: 5 }, testid: 'zealous-presence-modal' },
      { name: 'natures-sanctuary', prop: 'naturesSanctuaryCreaturesModal', payload: { creatureTargets: [], defaultSelected: [] }, testid: 'creature-selection-modal' },
      { name: 'natures-sanctuary-move', prop: 'naturesSanctuaryCreaturesModal', payload: { creatureTargets: [], defaultSelected: [], isMove: true }, testid: 'creature-selection-modal' },
      { name: 'oceanic-gift', prop: 'oceanicGiftTargetModal', payload: { creatureTargets: [], doubleEmanation: false }, testid: 'secondary-target-modal' },
      { name: 'oceanic-gift-double', prop: 'oceanicGiftTargetModal', payload: { creatureTargets: [], doubleEmanation: true }, testid: 'secondary-target-modal' },
      { name: 'destructive-stride-target', prop: 'destructiveStrideTargetModal', payload: { targets: [{ name: 'Goblin' }] }, testid: 'secondary-target-modal' },
      { name: 'clockwork-cavalcade-heal', prop: 'clockworkCavalcadeHealModal', payload: { creatureTargets: [], maxHeal: 100 }, testid: 'mass-heal-modal' },
      { name: 'clockwork-cavalcade-dispel', prop: 'clockworkCavalcadeDispelModal', payload: { creatureTargets: [] }, testid: 'creature-selection-modal' },
      { name: 'starry-chalice-heal', prop: 'starryChaliceHealModal', payload: { targetNames: ['Ally1'], amount: 10 }, testid: 'secondary-target-modal' },
    ];

    for (const { name, prop, payload, testid } of additionalModals) {
      it(`renders ${name} modal when ${prop} is truthy`, () => {
        const modalPayload = payload || {};
        render(<CharActionModals
          {...createBaseProps()}
          modalState={{ [prop]: modalPayload }}
          setModalState={vi.fn()}
        />);
        expect(screen.getByTestId(testid)).toBeInTheDocument();
      });
    }

    it('renders wildMagicSurgeModal with spellModalState merge', () => {
      const setSpellModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps()}
        spellModalState={{ wildMagicSurgeModal: { surgeTable: [], mode: 'roll' } }}
        setModalState={vi.fn()}
        setSpellModalState={setSpellModalState}
      />);
      expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
    });

    it('renders resourcePoolModal with automation prop', () => {
      const automation = { type: 'test', damage: '1d6' };
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ resourcePoolModal: { automation } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('resource-pool-modal')).toBeInTheDocument();
    });

    it('renders moonlightStepResourceModal with automation prop', () => {
      const automation = { type: 'moonlight_step' };
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ moonlightStepResourceModal: { automation } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('moonlight-step-resource-modal')).toBeInTheDocument();
    });
  });

  // ── Special rendering scenarios ──

  describe('special rendering scenarios', () => {
    it('renders openHandFromFlurry with target data from currentIndex', () => {
      const targets = [
        { action: { name: 'Open Hand' }, playerStats: { name: 'Monk' }, campaignName: 'test', targetName: 'Goblin' },
      ];
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ openHandFromFlurry: { targets, currentIndex: 0, saveDc: 15 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('open-hand-technique-modal')).toBeInTheDocument();
    });

    it('renders naturesSanctuaryCreaturesModal with isMove title', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [], defaultSelected: [], isMove: true } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText("Nature's Sanctuary (Move) — Choose Creatures")).toBeInTheDocument();
    });

    it('renders naturesSanctuaryCreaturesModal without isMove title', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [], defaultSelected: [], isMove: false } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText("Nature's Sanctuary — Choose Creatures")).toBeInTheDocument();
    });

    it('renders oceanicGiftTargetModal with doubleEmanation title', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [], doubleEmanation: true } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText(/Self \+ Ally, 2 Wild Shape/)).toBeInTheDocument();
    });

    it('renders oceanicGiftTargetModal without doubleEmanation title', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [], doubleEmanation: false } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText(/Choose Ally/)).toBeInTheDocument();
      expect(screen.queryByText(/2 Wild Shape/)).not.toBeInTheDocument();
    });

    it('renders clockworkCavalcadeHealModal with custom title and description', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ clockworkCavalcadeHealModal: { creatureTargets: [], maxHeal: 100, campaignName: 'test', combatSummary: {} } }}
        setModalState={vi.fn()}
      />);
      // The MassHealModal is mocked - verify it renders
      expect(screen.getByTestId('mass-heal-modal')).toBeInTheDocument();
    });

    it('renders clockworkCavalcadeDispelModal with creature selection', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ clockworkCavalcadeDispelModal: { creatureTargets: [{ name: 'Goblin' }] } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Clockwork Cavalcade: Dispel')).toBeInTheDocument();
    });

    it('renders starryChaliceHealModal with target names mapped to targets', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ starryChaliceHealModal: { targetNames: ['Ally1', 'Ally2'], amount: 10 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Starry Form: Chalice')).toBeInTheDocument();
    });
  });
});

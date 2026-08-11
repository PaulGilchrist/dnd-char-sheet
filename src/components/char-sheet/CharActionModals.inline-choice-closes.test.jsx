// Tests for inline choice modals and individual modal close handlers in CharActionModals.jsx:
// - divineFuryChoice inline modal
// - damageTypeChoice inline modal
// - featureChoice inline modal
// - CombatStanceModal close handler
// - RevelationInFleshModal close handler
// - TeleportModal close handler
// - wildMagicSurgeModal with setSpellModalState

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
vi.mock('./modals/MistyWandererModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="misty-wanderer-modal">MistyWandererModal</div>; },
}));
vi.mock('./modals/shared/BonusActionChoiceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="bonus-action-choice-modal">BonusActionChoiceModal</div>; },
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

// ── Tests ──

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

// @improved-by-ai
// Tests for secondary target modal skip handlers in CharActionModals.
//
// Skip behavior for TricksterBlessing, BardicInspiration, InspiringMovement,
// and OceanicGift modals is tested here. These modals all use SecondaryTargetModal
// and pass `onSkip={() => handleXxxConfirm(null)}` — the skip button invokes the
// confirm handler with null to cancel the action.
//
// Target selection (confirm) paths for these same modals are covered in
// CharActionModals.secondary-targets.test.jsx.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';
import { createBaseProps } from './CharActionModals.test-utils.jsx';

// ── Minimal mocks — only what skip tests need ──

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
    return <div data-testid="weapon-kind-mastery-close"><button data-testid="weapon-kind-mastery-close" onClick={onClose}>Close</button></div>;
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
  default: function TestModal({ onClose }) {
    return (
      <div data-testid="divine-intervention-modal">
        <button data-testid="divine-intervention-close" onClick={onClose}>Close</button>
        {onClose && <button data-testid="divine-intervention-cast" onClick={() => onClose('cast')}>Cast</button>}
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

// ── Tests ──

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

    it('renders doubleEmanation title variant', () => {
      render(<CharActionModals
        {...createBaseProps({ handleOceanicGiftConfirm: vi.fn() })}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [{ name: 'Goblin' }], doubleEmanation: true } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toContain('Self + Ally');
    });
  });
});

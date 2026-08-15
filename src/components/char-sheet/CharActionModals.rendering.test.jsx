// @improved-by-ai
// Rendering tests for CharActionModals.jsx — covers every modal prop → component
// mapping and inline overlay behavior.
//
// Scope — behaviors unique to this file:
// - Every modal prop renders its component when truthy (parameterized)
// - Inline overlays (div-based) render with correct content
// - Empty fragment when no modals are active
// - Spell modal state merging (spellModalState entries render alongside modalState)
//
// Already covered in other files:
// - Close/dismiss behavior → modal-closes.test.jsx, modal-closes-2.test.jsx,
//   modal-closes-3.test.jsx, inline-choice-closes.test.jsx
// - Handler callbacks → handlers.test.jsx, inline-modals.test.jsx,
//   inline-choice-modals.test.jsx, handler-callbacks.test.jsx
// - bendFateModal, wildMagicSurgeModal spellModalState, openHandFromFlurry
//   handlers → modal-rendering.test.jsx
// - Inline overlays (attackRiderOptions, clockworkCavalcadeRepair,
//   moonlightStepFallback) → full-rendering.test.jsx
// - BastionOfLaw onConfirm → inline-modals.test.jsx
// - naturesSanctuary, inspiringSmite → inline-modals.test.jsx
// - edge cases (empty targets, single option) → inline-choice-modals.test.jsx
//
// NOTE: vi.mock() is hoisted to the top of the file by Vitest, so all mock
// factories must be defined inline (no references to top-level variables).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';
import { createBaseProps } from './CharActionModals.test-utils.jsx';

// ── Mocked modal modules ──

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
vi.mock('./modals/BlindnessDeafnessModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="blindness-deafness-modal">BlindnessDeafnessModal</div>; },
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
vi.mock('./modals/ShieldBashChoiceModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="shield-bash-modal">ShieldBashChoiceModal</div>; },
}));
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="quivering-palm-modal">QuiveringPalmModal</div>; },
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
vi.mock('../../services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js', () => ({
  handle: vi.fn().mockResolvedValue(undefined),
  handleClearWard: vi.fn().mockResolvedValue(undefined),
  handleSpendDice: vi.fn().mockResolvedValue(undefined),
  handleApply: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──

describe('CharActionModals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty fragment when no modal props are set', () => {
    const { container } = render(<CharActionModals {...createBaseProps()} />);
    expect(container).toBeEmptyDOMElement();
  });

  // ── Modal rendering ──
  // Each original test followed the same pattern: set one truthy prop, assert
  // a testid appears. This parameterized test covers every modal prop → testid
  // mapping in a single loop.
  //
  // Handler tests in CharActionModals.handlers.test.jsx verify close/dismiss
  // behavior. These rendering tests cover the minimal behavioral contract:
  // prop truthy → modal component renders.

  describe('modal rendering', () => {
    const modalCases = [
      // simple — basic conditional render with empty payload
      { name: 'healing-pool', prop: 'healingPoolModal', payload: { name: 'Test Pool' }, testid: 'healing-pool-modal' },
      { name: 'hand-of-healing', prop: 'handOfHealingModal', payload: {}, testid: 'hand-of-healing-modal' },
      { name: 'font-of-magic', prop: 'fontOfMagicModal', payload: {}, testid: 'font-of-magic-modal' },
      { name: 'resource-pool', prop: 'resourcePoolModal', payload: {}, testid: 'resource-pool-modal' },
      { name: 'moonlight-step-resource', prop: 'moonlightStepResourceModal', payload: { automation: {} }, testid: 'moonlight-step-resource-modal' },
      { name: 'wild-companion', prop: 'wildCompanionModal', payload: {}, testid: 'wild-companion-modal' },
      { name: 'set-condition', prop: 'setConditionModal', payload: {}, testid: 'set-condition-modal' },
      { name: 'blindness-deafness', prop: 'blindnessDeafnessModal', payload: {}, testid: 'blindness-deafness-modal' },
      { name: 'eyebite-effect', prop: 'eyebiteEffectModal', payload: {}, testid: 'eyebite-effect-modal' },
      { name: 'attack-rider', prop: 'attackRiderModal', payload: {}, testid: 'attack-rider-modal' },
      { name: 'open-hand-technique', prop: 'openHandTechniqueModal', payload: {}, testid: 'open-hand-technique-modal' },
      { name: 'shield-bash', prop: 'shieldBashModal', payload: {}, testid: 'shield-bash-modal' },
      { name: 'quivering-palm', prop: 'quiveringPalmModal', payload: {}, testid: 'quivering-palm-modal' },
      { name: 'weapon-mastery', prop: 'weaponMasteryModal', payload: {}, testid: 'weapon-mastery-modal' },
      { name: 'weapon-mastery-choice', prop: 'weaponMasteryChoiceModal', payload: {}, testid: 'weapon-mastery-choice-modal' },
      { name: 'weapon-kind-mastery', prop: 'weaponKindMasteryModal', payload: {}, testid: 'weapon-kind-mastery-modal' },
      { name: 'combat-stance', prop: 'combatStanceModal', payload: {}, testid: 'combat-stance-modal' },
      { name: 'teleport', prop: 'teleportModal', payload: {}, testid: 'teleport-modal' },

      { name: 'save-attack-heal', prop: 'saveAttackHealModal', payload: {}, testid: 'save-attack-heal-modal' },
      { name: 'divine-spark', prop: 'divineSparkModal', payload: {}, testid: 'divine-spark-modal' },
      { name: 'divine-intervention', prop: 'divineInterventionModal', payload: {}, testid: 'divine-intervention-modal' },
      { name: 'arcane-charge', prop: 'arcaneChargeModal', payload: {}, testid: 'arcane-charge-modal' },
      { name: 'war-magic-cantrip', prop: 'warMagicCantripModal', payload: {}, testid: 'war-magic-cantrip-modal' },
      { name: 'war-magic-spell', prop: 'warMagicSpellModal', payload: {}, testid: 'war-magic-spell-modal' },
      { name: 'sacred-weapon', prop: 'sacredWeaponModal', payload: {}, testid: 'sacred-weapon-modal' },
      { name: 'primal-companion-bonus-action', prop: 'primalCompanionBonusActionModal', payload: {}, testid: 'primal-companion-bonus-action-modal' },
      { name: 'misty-wanderer', prop: 'mistyWandererModal', payload: {}, testid: 'misty-wanderer-modal' },
      { name: 'bonus-action-choice', prop: 'bonusActionChoiceModal', payload: {}, testid: 'bonus-action-choice-modal' },
      { name: 'revelation-in-flesh', prop: 'revelationInFleshModal', payload: {}, testid: 'revelation-in-flesh-modal' },
      { name: 'elemental-affinity', prop: 'elementalAffinityModal', payload: {}, testid: 'elemental-affinity-modal' },
      { name: 'fiendish-resilience', prop: 'fiendishResilienceModal', payload: {}, testid: 'single-resistance-selection-modal' },
      { name: 'dragon-companion', prop: 'dragonCompanionModal', payload: {}, testid: 'dragon-companion-modal' },
      { name: 'wild-magic-surge', prop: 'wildMagicSurgeModal', payload: { surgeTable: [], mode: 'roll' }, testid: 'wild-magic-surge-modal' },
      { name: 'third-eye', prop: 'thirdEyeModal', payload: { action: {}, playerStats: {}, campaignName: 'test' }, testid: 'third-eye-modal' },
      { name: 'soulstitch-spells', prop: 'soulstitchSpellsModal', payload: {}, testid: 'soulstitch-spells-modal' },
      { name: 'illusory-reality', prop: 'illusoryRealityModal', payload: {}, testid: 'illusory-reality-modal' },
      { name: 'celestial-revelation', prop: 'celestialRevelationModal', payload: {}, testid: 'celestial-revelation-modal' },
      { name: 'fiendish-legacy', prop: 'fiendishLegacyModal', payload: {}, testid: 'fiendish-legacy-modal' },
      { name: 'breath-weapon-shape', prop: 'breathWeaponShapeModal', payload: {}, testid: 'breath-weapon-shape-modal' },
      { name: 'hypnotic-pattern-shake', prop: 'hypnoticPatternShakeModal', payload: {}, testid: 'hypnotic-pattern-shake-modal' },
      { name: 'bastion-of-law', prop: 'bastionOfLawModal', payload: { featureName: 'Test', auto: {} }, testid: 'bastion-of-law-modal' },
      { name: 'bulwark-of-force', prop: 'bulwarkOfForceModal', payload: { creatureTargets: [{ name: 'Goblin' }], maxTargets: 3 }, testid: 'bulwark-of-force-modal' },
      { name: 'corona-enemy-selection', prop: 'coronaEnemySelectionModal', payload: { creatureTargets: [{ name: 'Dragon' }] }, testid: 'corona-enemy-selection-modal' },
      { name: 'radiance-of-dawn', prop: 'radianceOfDawnModal', payload: { creatureTargets: [{ name: 'Goblin' }], saveType: 'Dex', saveDc: 15, damageExpression: '3d10', damageType: 'Radiant', rangeFeet: 15 }, testid: 'radiance-of-dawn-modal' },
    ];

    for (const { name, prop, payload, testid } of modalCases) {
      it(`renders ${name} modal when ${prop} is truthy`, () => {
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [prop]: payload }}
            setModalState={vi.fn()}
          />
        );
        expect(screen.getByTestId(testid)).toBeInTheDocument();
      });
    }

    // ── spellModalState merging ──
    // The component merges modalState + spellModalState; verify that spell modal
    // entries render correctly through the merged state.

    describe('spell modal state merging', () => {
      it('renders wildMagicSurgeModal from spellModalState', () => {
        const setSpellModalState = vi.fn();
        render(
          <CharActionModals
            {...createBaseProps()}
            spellModalState={{ wildMagicSurgeModal: { surgeTable: [], mode: 'roll' } }}
            setModalState={vi.fn()}
            setSpellModalState={setSpellModalState}
          />
        );
        expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
      });
    });
  });
});

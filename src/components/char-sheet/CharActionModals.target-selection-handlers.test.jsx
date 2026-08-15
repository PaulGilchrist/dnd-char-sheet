// @improved-by-ai
// Handler callback tests for target selection modals in CharActionModals.
//
// This file tests the handler callback wiring between CharActionModals and
// the SecondaryModals/HealingModals sub-components. Each test verifies that
// clicking the expected button in a mocked modal invokes the correct handler
// prop with the correct arguments.
//
// Modal rendering is covered in CharActionModals.rendering.test.jsx.
// Skip handlers are covered in CharActionModals.mass-healing-skips.test.jsx
// and CharActionModals.secondary-target-skips.test.jsx.
// Multi-target confirmations (Bulwark, Radiance, Mantle) are covered in
// CharActionModals.secondary-targets.test.jsx.

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
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="bulwark-of-force-modal">
        <button data-testid="bulwark-skip" onClick={onSkip}>Skip</button>
        <button data-testid="bulwark-confirm" onClick={() => onConfirm(['Goblin'])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/CoronaEnemySelectionModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="corona-enemy-selection-modal">
        <button data-testid="corona-skip" onClick={onSkip}>Skip</button>
        <button data-testid="corona-confirm" onClick={() => onConfirm('Dragon')}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/RadianceOfDawnModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="radiance-of-dawn-modal">
        <button data-testid="radiance-skip" onClick={onSkip}>Skip</button>
        <button data-testid="radiance-confirm" onClick={() => onConfirm(['Goblin'])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/MantleOfInspirationModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mantle-of-inspiration-modal">
        <button data-testid="mantle-skip" onClick={onSkip}>Skip</button>
        <button data-testid="mantle-confirm" onClick={() => onConfirm(['Ally1'])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/ZealousPresenceModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="zealous-presence-modal">
        <button data-testid="zealous-skip" onClick={onSkip}>Skip</button>
        <button data-testid="zealous-confirm" onClick={() => onConfirm(['Ally1'])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/CelestialResilienceModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="celestial-resilience-modal">
        <button data-testid="celestial-confirm" onClick={() => onConfirm(['Ally1'])}>Confirm</button>
        <button data-testid="celestial-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/VitalityOfTheTreeModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="vitality-of-the-tree-modal">
        <button data-testid="vitality-confirm" onClick={() => onConfirm(['Ally1'])}>Confirm</button>
        <button data-testid="vitality-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/InspiringSmiteModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="inspiring-smite-modal">
        <button data-testid="inspiring-smite-skip" onClick={onSkip}>Skip</button>
        <button data-testid="inspiring-smite-confirm" onClick={() => onConfirm(['Goblin'])}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function TestModal({ title, targets, onTargetSelected, onSkip, confirmLabel }) {
    return (
      <div data-testid="secondary-target-modal">
        <div data-testid="secondary-title">{title}</div>
        {targets.map((target, i) => {
          const key = target.value || target.name;
          return (
            <label key={i} data-testid={`secondary-target-${key}`} onClick={() => onTargetSelected(key)}>
              {target.label || target.name}
            </label>
          );
        })}
        <button data-testid="secondary-confirm" onClick={() => onTargetSelected(targets[0]?.value || targets[0]?.name)}>{confirmLabel}</button>
        <button data-testid="secondary-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function TestModal({ title, targets, onConfirm, onSkip, confirmLabel }) {
    return (
      <div data-testid="creature-selection-modal">
        <div data-testid="creature-title">{title}</div>
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
vi.mock('./popups/FlurryOfBlowsTargetPopup.jsx', () => ({
  default: function TestModal({ onConfirm, onSkip }) {
    return (
      <div data-testid="flurry-of-blows-popup">
        <button data-testid="flurry-confirm" onClick={() => onConfirm(['Target1'])}>Confirm</button>
        <button data-testid="flurry-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/ShieldBashChoiceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="shield-bash-modal"><button data-testid="shield-bash-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="quivering-palm-modal"><button data-testid="quivering-palm-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: function TestModal({ onConfirm, onClose }) {
    return (
      <div data-testid="elemental-epitome-modal">
        <button data-testid="epitome-confirm" onClick={() => onConfirm('fire')}>Confirm</button>
        <button data-testid="epitome-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: function TestModal({ onConfirm, onClose }) {
    return (
      <div data-testid="destructive-stride-modal">
        <button data-testid="destructive-stride-confirm" onClick={() => onConfirm('slashing')}>Confirm</button>
        <button data-testid="destructive-stride-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/shared/RecklessAttackModal.jsx', () => ({
  default: function TestModal({ onConfirm, onCancel }) {
    return (
      <div data-testid="reckless-attack-modal">
        <button data-testid="reckless-confirm" onClick={() => onConfirm('attack', 'reckless')}>Confirm</button>
        <button data-testid="reckless-cancel" onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));
vi.mock('./modals/MassHealModal.jsx', () => ({
  default: function TestModal({ onConfirm, onSkip }) {
    return (
      <div data-testid="mass-heal-modal">
        <button data-testid="mass-heal-confirm" onClick={() => onConfirm(['Target1'])}>Confirm</button>
        <button data-testid="mass-heal-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/divine/ClockworkCavalcadeModal.jsx', () => ({
  default: function TestModal({ onChoose, onClose }) {
    return (
      <div data-testid="clockwork-cavalcade-modal">
        <button data-testid="clockwork-choose-heal" onClick={() => onChoose('heal')}>Heal</button>
        <button data-testid="clockwork-choose-dispel" onClick={() => onChoose('dispel')}>Dispel</button>
        <button data-testid="clockwork-choose-repair" onClick={() => onChoose('repair')}>Repair</button>
        <button data-testid="clockwork-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/MassCureWoundsModal.jsx', () => ({
  default: function TestModal({ onConfirm, onSkip }) {
    return (
      <div data-testid="mass-cure-wounds-modal">
        <button data-testid="mass-cure-confirm" onClick={() => onConfirm(['Target1'])}>Confirm</button>
        <button data-testid="mass-cure-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/PrayerOfHealingModal.jsx', () => ({
  default: function TestModal({ onConfirm, onSkip }) {
    return (
      <div data-testid="prayer-of-healing-modal">
        <button data-testid="prayer-confirm" onClick={() => onConfirm(['Target1'])}>Confirm</button>
        <button data-testid="prayer-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/PowerWordFortifyModal.jsx', () => ({
  default: function TestModal({ onConfirm, onSkip }) {
    return (
      <div data-testid="power-word-fortify-modal">
        <button data-testid="fortify-confirm" onClick={() => onConfirm(['Target1'])}>Confirm</button>
        <button data-testid="fortify-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/MassHealingWordModal.jsx', () => ({
  default: function TestModal({ onConfirm, onSkip }) {
    return (
      <div data-testid="mass-healing-word-modal">
        <button data-testid="healing-word-confirm" onClick={() => onConfirm(['Target1'])}>Confirm</button>
        <button data-testid="healing-word-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));
vi.mock('./modals/AnimateDeadModal.jsx', () => ({
  default: function TestModal({ onConfirm, onClose }) {
    return (
      <div data-testid="animate-dead-modal">
        <button data-testid="animate-dead-confirm" onClick={() => onConfirm({ zombieCount: 2, skeletonCount: 1 })}>Confirm</button>
        <button data-testid="animate-dead-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/CreateUndeadModal.jsx', () => ({
  default: function TestModal({ onConfirm, onClose }) {
    return (
      <div data-testid="create-undead-modal">
        <button data-testid="create-undead-confirm" onClick={() => onConfirm({ ghoulCount: 1 })}>Confirm</button>
        <button data-testid="create-undead-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/SummonSpiritModal.jsx', () => ({
  default: function TestModal({ onConfirm, onClose }) {
    return (
      <div data-testid="summon-spirit-modal">
        <button data-testid="summon-spirit-confirm" onClick={() => onConfirm('air-spirit')}>Confirm</button>
        <button data-testid="summon-spirit-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/CombatSuperiorityModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="combat-superiority-modal">
        <button data-testid="combat-superiority-close" onClick={onClose}>Close</button>
        <button data-testid="combat-superiority-confirm" onClick={() => onConfirm('test-superiority')}>Confirm</button>
      </div>
    );
  },
}));
vi.mock('./modals/AttackRiderManeuverPrompt.jsx', () => ({
  default: function TestModal({ onSkip, onUse }) {
    return (
      <div data-testid="attack-rider-maneuver-prompt">
        <button data-testid="maneuver-skip" onClick={onSkip}>Skip</button>
        <button data-testid="maneuver-use" onClick={() => onUse('test-maneuver')}>Use</button>
      </div>
    );
  },
}));
vi.mock('./modals/BlindnessDeafnessModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="blindness-deafness-modal">BlindnessDeafnessModal</div>; },
}));
vi.mock('./modals/SaveAttackHealModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="save-attack-heal-modal">SaveAttackHealModal</div>; },
}));
vi.mock('./modals/shared/AttackRiderOptionsModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="attack-rider-options-modal">AttackRiderOptionsModal</div>; },
}));
vi.mock('../../services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js', () => ({
  handle: vi.fn().mockResolvedValue(undefined),
  handleSpendDice: vi.fn().mockResolvedValue(undefined),
  handleClearWard: vi.fn().mockResolvedValue(undefined),
  handleApply: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──

describe('CharActionModals — target selection handler callbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Celestial Resilience handlers ──

  describe('Celestial Resilience handlers', () => {
    it('calls handleCelestialResilienceConfirm with selected targets on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleCelestialResilienceConfirm: handler })}
        modalState={{ celestialResilienceModal: { creatureTargets: [{ name: 'Ally1' }], allyTempHp: 5, selfTempHp: 10, maxTargets: 3 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('celestial-confirm'));
      expect(handler).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls handleCelestialResilienceSkip on skip', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleCelestialResilienceSkip: handler })}
        modalState={{ celestialResilienceModal: { creatureTargets: [{ name: 'Ally1' }], allyTempHp: 5, selfTempHp: 10, maxTargets: 3 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('celestial-skip'));
      expect(handler).toHaveBeenCalled();
    });
  });

  // ── Vitality of the Tree handler ──

  describe('Vitality of the Tree handler', () => {
    it('calls handleVitalityOfTheTreeConfirm with selected targets on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleVitalityOfTheTreeConfirm: handler })}
        modalState={{ vitalityOfTheTreeTarget: { creatureTargets: [{ name: 'Ally1' }], tempHp: 5, maxTargets: 3 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('vitality-confirm'));
      expect(handler).toHaveBeenCalledWith(['Ally1']);
    });

    it('closes modal on skip via setModalState', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleVitalityOfTheTreeConfirm: vi.fn() })}
        modalState={{ vitalityOfTheTreeTarget: { creatureTargets: [{ name: 'Ally1' }], tempHp: 5, maxTargets: 3 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('vitality-skip'));
      expect(setModalState).toHaveBeenCalledWith({ vitalityOfTheTreeTarget: null });
    });
  });

  // ── Inspiring Smite handler ──

  describe('Inspiring Smite handler', () => {
    it('calls handleInspiringSmiteConfirm with selected targets on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleInspiringSmiteConfirm: handler })}
        modalState={{ inspiringSmiteModal: { creatureTargets: [{ name: 'Goblin' }], tempHp: 5, roll: 3 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('inspiring-smite-confirm'));
      expect(handler).toHaveBeenCalledWith(['Goblin']);
    });

    it('closes modal on skip via setModalState', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleInspiringSmiteConfirm: vi.fn() })}
        modalState={{ inspiringSmiteModal: { creatureTargets: [{ name: 'Goblin' }], tempHp: 5, roll: 3 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('inspiring-smite-skip'));
      expect(setModalState).toHaveBeenCalledWith({ inspiringSmiteModal: null });
    });
  });

  // ── Zealous Presence handler ──

  describe('Zealous Presence handler', () => {
    it('calls handleZealousPresenceConfirm with selected targets on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleZealousPresenceConfirm: handler })}
        modalState={{ zealousPresenceModal: { creatureTargets: [{ name: 'Ally1' }], maxTargets: 5 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('zealous-confirm'));
      expect(handler).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls setModalState with null on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleZealousPresenceConfirm: vi.fn(), setModalState })}
        modalState={{ zealousPresenceModal: { creatureTargets: [{ name: 'Ally1' }], maxTargets: 5 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('zealous-skip'));
      expect(setModalState).toHaveBeenCalledWith({ zealousPresenceModal: null });
    });
  });

  // ── Flurry of Blows handler ──

  describe('Flurry of Blows handler', () => {
    it('calls handleFlurryOfBlowsConfirm with selected targets on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleFlurryOfBlowsConfirm: handler })}
        modalState={{ flurryOfBlowsModal: { numAttacks: 3, creatureTargets: [], currentTargetName: 'Goblin' } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('flurry-confirm'));
      expect(handler).toHaveBeenCalledWith(['Target1']);
    });

    it('calls setModalState with null on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleFlurryOfBlowsConfirm: vi.fn(), setModalState })}
        modalState={{ flurryOfBlowsModal: { numAttacks: 3, creatureTargets: [], currentTargetName: 'Goblin' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('flurry-skip'));
      expect(setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: null });
    });
  });

  // ── Natures Sanctuary handler ──

  describe('Natures Sanctuary handler', () => {
    it('calls handleNaturesSanctuaryConfirm with selected creature names on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleNaturesSanctuaryConfirm: handler })}
        modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [{ name: 'Goblin' }], defaultSelected: [] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('creature-confirm'));
      expect(handler).toHaveBeenCalledWith(['Goblin']);
    });

    it('closes modal on skip via setModalState', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleNaturesSanctuaryConfirm: vi.fn() })}
        modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [{ name: 'Goblin' }], defaultSelected: [] } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('creature-skip'));
      expect(setModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: null });
    });
  });

  // ── Oceanic Gift handler ──

  describe('Oceanic Gift handler', () => {
    it('calls handleOceanicGiftConfirm with selected target on target click', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleOceanicGiftConfirm: handler })}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [{ name: 'Ally1' }], doubleEmanation: false } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-target-Ally1'));
      expect(handler).toHaveBeenCalledWith('Ally1');
    });

    it('calls handleOceanicGiftConfirm with null on skip', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleOceanicGiftConfirm: handler })}
        modalState={{ oceanicGiftTargetModal: { creatureTargets: [{ name: 'Ally1' }], doubleEmanation: false } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      expect(handler).toHaveBeenCalledWith(null);
    });
  });

  // ── Destructive Stride Target handlers ──
  // These handlers are internal async functions (not props), so we test
  // that the modal renders with the correct structure rather than
  // verifying handler invocation directly.

  describe('DestructiveStrideTargetModal rendering', () => {
    it('renders SecondaryTargetModal with correct title for destructive stride', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ destructiveStrideTargetModal: { targets: [{ name: 'Goblin' }], action: { name: 'Destructive Stride' } } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Destructive Stride — Choose Target')).toBeInTheDocument();
    });

    it('renders target list from targets array', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ destructiveStrideTargetModal: { targets: [{ name: 'Goblin' }], action: { name: 'Destructive Stride' } } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Goblin')).toBeInTheDocument();
    });

    it('does not render secondary target modal when destructiveStrideTargetModal is null', () => {
      render(<CharActionModals
        {...createBaseProps()}
        modalState={{ destructiveStrideTargetModal: null }}
        setModalState={vi.fn()}
      />);
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });
  });
});

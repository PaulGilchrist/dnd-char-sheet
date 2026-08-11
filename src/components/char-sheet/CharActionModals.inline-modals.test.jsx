// Additional tests for uncovered modal rendering paths in CharActionModals.jsx
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
  default: function TestModal({ onClose }) {
    return <div data-testid="hand-of-healing-modal"><button data-testid="hand-of-healing-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/FontOfMagicModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="font-of-magic-modal"><button data-testid="font-of-magic-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ResourcePoolModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="resource-pool-modal"><button data-testid="resource-pool-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/WildCompanionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="wild-companion-modal"><button data-testid="wild-companion-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/SetConditionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="set-condition-modal"><button data-testid="set-condition-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/EyebiteEffectModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="eyebite-effect-modal"><button data-testid="eyebite-close" onClick={onClose}>Close</button></div>;
  },
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
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
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
  default: function TestModal({ onClose }) {
    return <div data-testid="save-attack-heal-modal"><button data-testid="save-attack-heal-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/SaveAttackAoeModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="save-attack-aoe-modal"><button data-testid="save-attack-aoe-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/AOEConditionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="aoe-condition-modal"><button data-testid="aoe-condition-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/FearModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="fear-modal"><button data-testid="fear-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/HypnoticPatternModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="hypnotic-pattern-modal"><button data-testid="hypnotic-pattern-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/MassSuggestionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="mass-suggestion-modal"><button data-testid="mass-suggestion-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/CalmEmotionsModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="calm-emotions-modal"><button data-testid="calm-emotions-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/TashasLaughterModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="tashas-laughter-modal"><button data-testid="tashas-laughter-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/SilenceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="silence-modal"><button data-testid="silence-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ElementalAttunementModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="elemental-attunement-modal"><button data-testid="elemental-attunement-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ElementalBurstModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="elemental-burst-modal"><button data-testid="elemental-burst-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/divine/DivineSparkModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="divine-spark-modal"><button data-testid="divine-spark-close" onClick={onClose}>Close</button></div>;
  },
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
  default: function TestModal({ onClose }) {
    return <div data-testid="arcane-charge-modal"><button data-testid="arcane-charge-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/WarMagicCantripModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="war-magic-cantrip-modal"><button data-testid="war-magic-cantrip-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/WarMagicSpellModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="war-magic-spell-modal"><button data-testid="war-magic-spell-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/divine/SacredWeaponModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="sacred-weapon-modal"><button data-testid="sacred-weapon-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/PrimalCompanionBonusActionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="primal-companion-bonus-action-modal"><button data-testid="primal-companion-bonus-action-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/PrimalCompanionSummonModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="primal-companion-summon-modal"><button data-testid="primal-companion-summon-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/MistyWandererModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="misty-wanderer-modal"><button data-testid="misty-wanderer-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/FeyReinforcementsModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="fey-reinforcements-modal"><button data-testid="fey-reinforcements-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="steps-of-the-fey-taunt-modal"><button data-testid="steps-of-the-fey-taunt-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/BonusActionChoiceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="bonus-action-choice-modal"><button data-testid="bonus-action-choice-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/StealthAttackModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="stealth-attack-modal"><button data-testid="stealth-attack-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/CelestialRevelationModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="celestial-revelation-modal"><button data-testid="celestial-revelation-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/RevelationInFleshModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="revelation-close"><button data-testid="revelation-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/ElementalAffinityModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="elemental-affinity-modal"><button data-testid="elemental-affinity-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/SingleResistanceSelectionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="single-resistance-selection-modal"><button data-testid="single-resistance-selection-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/shared/ChoiceListModal.jsx', () => ({
  ChoiceListModal: function TestModal() { return <div data-testid="choice-list-modal">ChoiceListModal</div>; },
}));
vi.mock('./modals/DragonCompanionModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="dragon-companion-modal"><button data-testid="dragon-companion-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/WildMagicDoubleRollModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="wild-magic-double-roll-modal">WildMagicDoubleRollModal</div>; },
}));
vi.mock('./modals/WildMagicTamedModal.jsx', () => ({
  default: function TestModal() { return <div data-testid="wild-magic-tamed-modal">WildMagicTamedModal</div>; },
}));
vi.mock('./modals/arcane/ThirdEyeModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="third-eye-modal"><button data-testid="third-eye-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/arcane/SoulstitchSpellsModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="soulstitch-spells-modal"><button data-testid="soulstitch-spells-close" onClick={onClose}>Close</button></div>;
  },
}));
vi.mock('./modals/arcane/IllusoryRealityModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="illusory-reality-modal"><button data-testid="illusory-reality-close" onClick={onClose}>Close</button></div>;
  },
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
  default: function TestModal({ onClose }) {
    return <div data-testid="arcane-ward-restore-modal"><button data-testid="arcane-ward-restore-close" onClick={onClose}>Close</button></div>;
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
vi.mock('../../services/automation/handlers/class-warlock/tempTeleportHandler.js', () => ({
  confirmTeleport: vi.fn().mockResolvedValue({ type: 'popup', payload: { name: 'Moonlight Step', description: 'Teleported' } }),
}));
vi.mock('./modals/MoonlightStepResourceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="moonlight-step-resource-modal"><button data-testid="moonlight-step-resource-close" onClick={onClose}>Close</button></div>;
  },
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
        <button data-testid="inspiring-smite-confirm" onClick={() => onConfirm({})}>Confirm</button>
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
  handleApply: vi.fn().mockResolvedValue({ payload: '<b>Bastion of Law</b><br/>Applied' }),
}));
vi.mock('../../services/rules/spells/postCastHealService.js', () => ({
  applyStarryChaliceHeal: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/automation/handlers/combat/elementalEpitomeHandler.js', () => ({
  handle: vi.fn(),
  handleElementalEpitome: vi.fn(),
  applyResistanceChoice: vi.fn().mockResolvedValue({ payload: 'Resistance applied' }),
}));
vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  handle: vi.fn(),
  applyDamageTypeChoice: vi.fn().mockResolvedValue({ payload: 'Damage applied' }),
  applyTargetChoice: vi.fn().mockResolvedValue({ payload: 'Target damage applied' }),
  skipTargetChoice: vi.fn().mockResolvedValue({ payload: 'Skipped' }),
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

// ── Inline Modal Tests ──

describe('CharActionModals — inline modals with complex handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BastionOfLawModal onConfirm with setPopupHtml', () => {
    it('sets popupHtml when handleApply returns payload', async () => {
      const setPopupHtml = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ setPopupHtml, handleApply: vi.fn() })}
        modalState={{ bastionOfLawModal: { featureName: 'Bastion', auto: {} } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('bastion-confirm'));
      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledWith('<b>Bastion of Law</b><br/>Applied');
      });
    });
  });

  describe('moonlightStepFallbackModal', () => {
    it('renders the inline modal with Yes/No buttons', () => {
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ moonlightStepFallbackModal: { action: { name: 'Moonlight Step' }, slotLevel: 1 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText(/No Moonlight Step uses remaining/)).toBeTruthy();
      expect(screen.getByText('Yes, Consume Slot')).toBeTruthy();
      expect(screen.getByText('No')).toBeTruthy();
    });

    it('calls confirmTeleport with false on Yes button', async () => {
      const setPopupHtml = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ setPopupHtml })}
        modalState={{ moonlightStepFallbackModal: { action: { name: 'Moonlight Step' }, playerStats: {}, campaignName: 'test-campaign', slotLevel: 1 } }}
        setModalState={vi.fn()}
      />);

      fireEvent.click(screen.getByText('Yes, Consume Slot'));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalled();
      });
    });
  });

  describe('attackRiderOptionsModal', () => {
    it('renders the inline modal with rider options', () => {
      render(<CharActionModals
        {...createBaseProps({ handleAttackRiderOptionSelect: vi.fn() })}
        modalState={{ attackRiderOptionsModal: { maneuver: { name: 'Test Maneuver' }, riderOptions: [{ name: 'Option A', effect: 'disadvantage_on_next_save' }] } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText(/Test Maneuver.*Choose Effect/)).toBeTruthy();
      expect(screen.getByText('Option A')).toBeTruthy();
      expect(screen.getByText('Skip')).toBeTruthy();
    });

    it('calls handleAttackRiderOptionSelect on option click', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleAttackRiderOptionSelect: handler })}
        modalState={{ attackRiderOptionsModal: { maneuver: { name: 'Test' }, riderOptions: [{ name: 'Option A', effect: 'push_15ft' }] } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByText('Option A'));
      expect(handler).toHaveBeenCalled();
    });

    it('dismisses modal on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleAttackRiderOptionSelect: vi.fn() })}
        modalState={{ attackRiderOptionsModal: { maneuver: { name: 'Test' }, riderOptions: [] } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByText('Skip'));
      expect(setModalState).toHaveBeenCalledWith({ attackRiderOptionsModal: null });
    });
  });

  describe('sweepingAttackTargetModal', () => {
    it('renders SecondaryTargetModal with correct title', () => {
      render(<CharActionModals
        {...createBaseProps({ handleSweepingAttackConfirm: vi.fn() })}
        modalState={{ sweepingAttackTargetModal: { secondaryTargets: [{ name: 'Goblin' }], primaryTarget: 'Player', dieValue: 6 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toBe('Sweeping Attack');
    });

    it('calls handleSweepingAttackConfirm on target selection', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleSweepingAttackConfirm: handler })}
        modalState={{ sweepingAttackTargetModal: { secondaryTargets: [{ name: 'Goblin' }], primaryTarget: 'Player', dieValue: 6 } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-confirm'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('baitAndSwitchChoiceModal', () => {
    it('renders SecondaryTargetModal with AC Bonus title', () => {
      render(<CharActionModals
        {...createBaseProps({ handleBaitAndSwitchChoiceConfirm: vi.fn() })}
        modalState={{ baitAndSwitchChoiceModal: { options: [{ name: 'Ally1' }], description: 'Choose ally' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toBe('Bait and Switch — AC Bonus');
    });

    it('calls handleBaitAndSwitchChoiceConfirm on target selection', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleBaitAndSwitchChoiceConfirm: handler })}
        modalState={{ baitAndSwitchChoiceModal: { options: [{ name: 'Ally1' }], description: 'Choose ally' } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-confirm'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('commanderStrikeChoiceModal', () => {
    it('renders SecondaryTargetModal with Ally Attack title', () => {
      render(<CharActionModals
        {...createBaseProps({ handleCommanderStrikeChoiceConfirm: vi.fn() })}
        modalState={{ commanderStrikeChoiceModal: { options: [{ name: 'Ally1' }], description: 'Choose ally' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toBe("Commander's Strike — Ally Attack");
    });

    it('calls handleCommanderStrikeChoiceConfirm on target selection', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleCommanderStrikeChoiceConfirm: handler })}
        modalState={{ commanderStrikeChoiceModal: { options: [{ name: 'Ally1' }], description: 'Choose ally' } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('secondary-confirm'));
      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('CharActionModals — naturesSanctuaryCreaturesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CreatureSelectionModal with correct title and note', () => {
    render(<CharActionModals
      {...createBaseProps({ handleNaturesSanctuaryConfirm: vi.fn() })}
      modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [{ name: 'Goblin' }], isMove: false } }}
      setModalState={vi.fn()}
    />);
    expect(screen.getByTestId('creature-title').textContent).toContain("Nature's Sanctuary");
    expect(screen.getByTestId('creature-note').textContent).toContain('Wild Shape');
  });

  it('renders with Move title when isMove is true', () => {
    render(<CharActionModals
      {...createBaseProps({ handleNaturesSanctuaryConfirm: vi.fn() })}
      modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [{ name: 'Goblin' }], isMove: true } }}
      setModalState={vi.fn()}
    />);
    expect(screen.getByTestId('creature-title').textContent).toContain('Move');
  });

  it('calls handleNaturesSanctuaryConfirm on confirm', () => {
    const handler = vi.fn();
    render(<CharActionModals
      {...createBaseProps({ handleNaturesSanctuaryConfirm: handler })}
      modalState={{ naturesSanctuaryCreaturesModal: { creatureTargets: [{ name: 'Goblin' }] } }}
      setModalState={vi.fn()}
    />);
    fireEvent.click(screen.getByTestId('creature-confirm'));
    expect(handler).toHaveBeenCalled();
  });
});

describe('InspiringSmiteModal skip', () => {
  it('closes modal on skip', () => {
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

describe('CharActionModals — clockworkCavalcadeRepairModal confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls handleClockworkCavalcadeRepairConfirm on repair button', () => {
    const handler = vi.fn();
    render(<CharActionModals
      {...createBaseProps({ handleClockworkCavalcadeRepairConfirm: handler })}
      modalState={{ clockworkCavalcadeRepairModal: {} }}
      setModalState={vi.fn()}
    />);
    fireEvent.click(screen.getByText('Repair'));
    expect(handler).toHaveBeenCalled();
  });

  it('dismisses modal on cancel', () => {
    const setModalState = vi.fn();
    render(<CharActionModals
      {...createBaseProps({ handleClockworkCavalcadeRepairConfirm: vi.fn() })}
      modalState={{ clockworkCavalcadeRepairModal: {} }}
      setModalState={setModalState}
    />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeRepairModal: null });
  });
});

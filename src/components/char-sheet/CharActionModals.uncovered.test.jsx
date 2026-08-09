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
  getRuntimeValue: vi.fn((character, key) => {
    if (key === 'activeBuffs') return [];
    if (key === 'currentHitPoints') return 50;
    if (key === 'hitPoints') return 100;
    if (key === '_cunningStrikeCostUsed') return 0;
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
  default: function TestModal({ onClose }) {
    return (
      <div data-testid="animate-dead-modal">
        <button data-testid="animate-dead-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/CreateUndeadModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return (
      <div data-testid="create-undead-modal">
        <button data-testid="create-undead-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/SummonSpiritModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return (
      <div data-testid="summon-spirit-modal">
        <button data-testid="summon-spirit-close" onClick={onClose}>Close</button>
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

// ── Tests ──

describe('CharActionModals — Helper functions and modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Healing Illusion modal', () => {
    it('renders SecondaryTargetModal with correct title and description', () => {
      const playerStats = { name: 'Test Character', level: 5 };
      const characters = [{ name: 'Ally1', type: 'humanoid', size: 'M', currentHp: 30, maxHp: 50 }];
      const combatSummary = { creatures: [{ name: 'Goblin', type: 'humanoid', currentHp: 10, maxHp: 30 }] };
      render(<CharActionModals
        {...createBaseProps({})}
        playerStats={playerStats}
        characters={characters}
        modalState={{ healingIllusionModal: { action: {}, playerStats } }}
        setModalState={vi.fn()}
        combatSummary={combatSummary}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toBe('Healing Illusion');
      expect(screen.getByTestId('secondary-show-hp')).toBeTruthy();
    });

    it('builds target list from characters and internal combatSummary', async () => {
      const playerStats = { name: 'Caster', level: 3 };
      const characters = [{ name: 'Ally1', type: 'humanoid', size: 'M', currentHp: 30, maxHp: 50 }];
      render(<CharActionModals
        {...createBaseProps({})}
        playerStats={playerStats}
        characters={characters}
        modalState={{ healingIllusionModal: { action: {}, playerStats } }}
        setModalState={vi.fn()}
      />);
      await waitFor(() => {
        // Both characters and creatures from getCombatContext appear as targets
        expect(screen.getByTestId('secondary-target-Ally1')).toBeTruthy();
        expect(screen.getByTestId('secondary-target-Goblin')).toBeTruthy();
      });
    });

    it('dismisses modal on skip', async () => {
      const setModalState = vi.fn();
      const playerStats = { name: 'Caster', level: 3 };
      render(<CharActionModals
        {...createBaseProps({})}
        playerStats={playerStats}
        modalState={{ healingIllusionModal: { action: {}, playerStats } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      await waitFor(() => {
        expect(setModalState).toHaveBeenCalledWith({ healingIllusionModal: null });
      });
    });
  });

  describe('Invoke Duplicity modal', () => {
    it('renders CreatureSelectionModal with correct title', () => {
      const playerStats = { name: 'Test Character' };
      const characters = [{ name: 'Ally1', type: 'humanoid', size: 'M', currentHp: 30, maxHp: 50 }];
      const combatSummary = { creatures: [{ name: 'Goblin', type: 'humanoid', currentHp: 10, maxHp: 30 }] };
      render(<CharActionModals
        {...createBaseProps({})}
        playerStats={playerStats}
        characters={characters}
        modalState={{ invokeDuplicityModal: { action: {}, playerStats } }}
        setModalState={vi.fn()}
        combatSummary={combatSummary}
      />);
      expect(screen.getByTestId('creature-title').textContent).toBe('Improved Duplicity — Choose Allies');
    });

    it('builds target list with deduplication by name', async () => {
      const playerStats = { name: 'Caster' };
      const characters = [{ name: 'Ally1', type: 'humanoid', size: 'M', currentHp: 30, maxHp: 50 }];
      render(<CharActionModals
        {...createBaseProps({})}
        playerStats={playerStats}
        characters={characters}
        modalState={{ invokeDuplicityModal: { action: {}, playerStats } }}
        setModalState={vi.fn()}
      />);
      await waitFor(() => {
        expect(screen.getByTestId('creature-target-Ally1')).toBeTruthy();
        expect(screen.getByTestId('creature-target-Goblin')).toBeTruthy();
      });
    });
  });

  describe('Flurry of Blows modal', () => {
    it('renders FlurryOfBlowsTargetPopup with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleFlurryOfBlowsConfirm: vi.fn() })}
        modalState={{ flurryOfBlowsModal: { numAttacks: 3, creatureTargets: ['Goblin'], currentTargetName: 'Goblin' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('flurry-of-blows-popup')).toBeTruthy();
    });

    it('calls handleFlurryOfBlowsConfirm on confirm', () => {
      const handler = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleFlurryOfBlowsConfirm: handler })}
        modalState={{ flurryOfBlowsModal: { numAttacks: 3, creatureTargets: ['Goblin'], currentTargetName: 'Goblin' } }}
        setModalState={vi.fn()}
      />);
      fireEvent.click(screen.getByTestId('flurry-confirm'));
      expect(handler).toHaveBeenCalledWith('target');
    });

    it('dismisses modal on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleFlurryOfBlowsConfirm: vi.fn() })}
        modalState={{ flurryOfBlowsModal: { numAttacks: 3, creatureTargets: ['Goblin'], currentTargetName: 'Goblin' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('flurry-skip'));
      expect(setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: null });
    });
  });

  describe('Starry Chalice Heal modal', () => {
    it('renders SecondaryTargetModal with Chalice title', () => {
      render(<CharActionModals
        {...createBaseProps({ handleStarryChaliceConfirm: vi.fn() })}
        modalState={{ starryChaliceHealModal: { targetNames: ['Ally1'], amount: 10 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toBe('Starry Form: Chalice');
    });

    it('dismisses modal on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleStarryChaliceConfirm: vi.fn() })}
        modalState={{ starryChaliceHealModal: { targetNames: ['Ally1'], amount: 10 } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('secondary-skip'));
      expect(setModalState).toHaveBeenCalledWith({ starryChaliceHealModal: null });
    });
  });

  describe('Elemental Epitome modal', () => {
    it('renders ElementalEpitomeModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleEpitomeConfirm: vi.fn() })}
        modalState={{ epitomeModal: { action: {}, playerStats: {}, campaignName: 'test-campaign', currentResistance: 'cold' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('elemental-epitome-modal')).toBeTruthy();
    });

    it('dismisses modal on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleEpitomeConfirm: vi.fn() })}
        modalState={{ epitomeModal: { action: {}, playerStats: {}, campaignName: 'test-campaign', currentResistance: 'cold' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('epitome-close'));
      expect(setModalState).toHaveBeenCalledWith({ epitomeModal: null });
    });
  });

  describe('Destructive Stride modal', () => {
    it('renders DestructiveStrideModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleDestructiveStrideConfirm: vi.fn() })}
        modalState={{ destructiveStrideModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('destructive-stride-modal')).toBeTruthy();
    });

    it('dismisses modal on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleDestructiveStrideConfirm: vi.fn() })}
        modalState={{ destructiveStrideModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('stride-close'));
      expect(setModalState).toHaveBeenCalledWith({ destructiveStrideModal: null });
    });
  });

  describe('Destructive Stride Target modal', () => {
    it('renders SecondaryTargetModal with correct description', () => {
      render(<CharActionModals
        {...createBaseProps({ handleDestructiveStrideTargetConfirm: vi.fn(), handleDestructiveStrideTargetSkip: vi.fn() })}
        modalState={{ destructiveStrideTargetModal: { targets: [{ name: 'Goblin' }], action: {}, chosenType: 'fire', martialArtsDie: 4 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('secondary-title').textContent).toBe('Destructive Stride — Choose Target');
      expect(screen.getByTestId('secondary-desc').textContent).toBe('Choose a creature only if the monk comes within 5 ft. of them while striding.');
    });
  });

  describe('Reckless Attack modal', () => {
    it('renders with mode=full by default', () => {
      render(<CharActionModals
        {...createBaseProps({ handleRecklessAttackConfirm: vi.fn(), handleRecklessAttackCancel: vi.fn(), handleBrutalStrikeConfirm: vi.fn(), handleBrutalStrikeCancel: vi.fn() })}
        modalState={{ recklessAttackModal: { attack: { name: 'Longsword' } } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('reckless-mode').textContent).toBe('full');
    });

    it('renders with explicit mode', () => {
      render(<CharActionModals
        {...createBaseProps({ handleRecklessAttackConfirm: vi.fn(), handleRecklessAttackCancel: vi.fn(), handleBrutalStrikeConfirm: vi.fn(), handleBrutalStrikeCancel: vi.fn() })}
        modalState={{ recklessAttackModal: { attack: { name: 'Longsword' }, mode: 'brutalOnly' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('reckless-mode').textContent).toBe('brutalOnly');
    });
  });

  describe('Mass Heal modal', () => {
    it('renders MassHealModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleMassHealConfirm: vi.fn() })}
        modalState={{ massHealModal: { creatureTargets: ['Goblin'], totalPool: 50, campaignName: 'test-campaign', combatSummary: {} } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('mass-heal-modal')).toBeTruthy();
    });

    it('dismisses modal on skip', () => {
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

  describe('Clockwork Cavalcade modal', () => {
    it('renders ClockworkCavalcadeModal with onChoose and onClose', () => {
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ clockworkCavalcadeModal: {} }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('clockwork-cavalcade-modal')).toBeTruthy();
    });

    it('calls handleClockworkCavalcadeChoice with "heal" on heal button', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ setModalState })}
        modalState={{ clockworkCavalcadeModal: {} }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('cc-heal'));
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeModal: null });
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeHealModal: {} });
    });

    it('calls handleClockworkCavalcadeChoice with "dispel" on dispel button', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ setModalState })}
        modalState={{ clockworkCavalcadeModal: {} }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('cc-dispel'));
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeModal: null });
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeDispelModal: {} });
    });

    it('calls handleClockworkCavalcadeChoice with "repair" on repair button', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ setModalState })}
        modalState={{ clockworkCavalcadeModal: {} }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('cc-repair'));
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeModal: null });
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeRepairModal: {} });
    });
  });

  describe('Clockwork Cavalcade Heal modal', () => {
    it('renders MassHealModal with custom title and description', () => {
      render(<CharActionModals
        {...createBaseProps({ handleClockworkCavalcadeHealConfirm: vi.fn() })}
        modalState={{ clockworkCavalcadeHealModal: { creatureTargets: ['Goblin'], maxHeal: 100, campaignName: 'test-campaign', combatSummary: {} } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('mass-heal-modal')).toBeTruthy();
    });

    it('dismisses modal on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleClockworkCavalcadeHealConfirm: vi.fn() })}
        modalState={{ clockworkCavalcadeHealModal: { creatureTargets: ['Goblin'], maxHeal: 100, campaignName: 'test-campaign', combatSummary: {} } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('mass-heal-skip'));
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeHealModal: null });
    });
  });

  describe('Clockwork Cavalcade Dispel modal', () => {
    it('renders CreatureSelectionModal with correct title', () => {
      render(<CharActionModals
        {...createBaseProps({ handleClockworkCavalcadeDispelConfirm: vi.fn() })}
        modalState={{ clockworkCavalcadeDispelModal: { creatureTargets: [{ name: 'Goblin' }] } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('creature-title').textContent).toBe('Clockwork Cavalcade: Dispel');
    });

    it('dismisses modal on skip', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({ handleClockworkCavalcadeDispelConfirm: vi.fn() })}
        modalState={{ clockworkCavalcadeDispelModal: { creatureTargets: [{ name: 'Goblin' }] } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('creature-skip'));
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeDispelModal: null });
    });
  });

  describe('Clockwork Cavalcade Repair modal', () => {
    it('renders inline modal with repair and cancel buttons', () => {
      render(<CharActionModals
        {...createBaseProps({ handleClockworkCavalcadeRepairConfirm: vi.fn() })}
        modalState={{ clockworkCavalcadeRepairModal: {} }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByText('Repair')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
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
  });

  describe('Mass Cure Wounds modal', () => {
    it('renders MassCureWoundsModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleMassCureWoundsConfirm: vi.fn() })}
        modalState={{ massCureWoundsModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('mass-cure-wounds-modal')).toBeTruthy();
    });

    it('dismisses modal on skip', () => {
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

  describe('Prayer of Healing modal', () => {
    it('renders PrayerOfHealingModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handlePrayerOfHealingConfirm: vi.fn() })}
        modalState={{ prayerOfHealingModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('prayer-of-healing-modal')).toBeTruthy();
    });

    it('dismisses modal on skip', () => {
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

  describe('Power Word Fortify modal', () => {
    it('renders PowerWordFortifyModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handlePowerWordFortifyConfirm: vi.fn() })}
        modalState={{ powerWordFortifyModal: { creatureTargets: ['Goblin'], totalTempHp: 10 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('power-word-fortify-modal')).toBeTruthy();
    });

    it('dismisses modal on skip', () => {
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

  describe('Mass Healing Word modal', () => {
    it('renders MassHealingWordModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({ handleMassHealingWordConfirm: vi.fn() })}
        modalState={{ massHealingWordModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('mass-healing-word-modal')).toBeTruthy();
    });

    it('dismisses modal on skip', () => {
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

  describe('Animate Dead modal', () => {
    it('renders AnimateDeadModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ animateDeadModal: { maxTargets: 3, action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('animate-dead-modal')).toBeTruthy();
    });

    it('dismisses modal on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ animateDeadModal: { maxTargets: 3, action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('animate-dead-close'));
      expect(setModalState).toHaveBeenCalledWith({ animateDeadModal: null });
    });
  });

  describe('Create Undead modal', () => {
    it('renders CreateUndeadModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ createUndeadModal: { maxTargets: 3, action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('create-undead-modal')).toBeTruthy();
    });

    it('dismisses modal on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ createUndeadModal: { maxTargets: 3, action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('create-undead-close'));
      expect(setModalState).toHaveBeenCalledWith({ createUndeadModal: null });
    });
  });

  describe('Summon Spirit modal', () => {
    it('renders SummonSpiritModal with correct props', () => {
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ summonSpiritModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={vi.fn()}
      />);
      expect(screen.getByTestId('summon-spirit-modal')).toBeTruthy();
    });

    it('dismisses modal on close', () => {
      const setModalState = vi.fn();
      render(<CharActionModals
        {...createBaseProps({})}
        modalState={{ summonSpiritModal: { action: {}, playerStats: {}, campaignName: 'test-campaign' } }}
        setModalState={setModalState}
      />);
      fireEvent.click(screen.getByTestId('summon-spirit-close'));
      expect(setModalState).toHaveBeenCalledWith({ summonSpiritModal: null });
    });
  });
});

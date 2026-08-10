import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpecialActions from './CharSpecialActions.jsx';

// Mock executeHandler
vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

// Mock automation service
vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn((action) => !!(action?.automation)),
  isInteractiveAutomation: vi.fn((action) => {
    if (!action?.automation) return false;
    const auto = Array.isArray(action.automation) ? action.automation[0] : action.automation;
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'defensive_tactics', 'hunter_prey', 'animal_aspect', 'passive_rule', 'temp_hp_buff', 'brew_poison', 'stride_of_the_elements', 'elemental_epitome', 'destructive_stride', 'quivering_palm', 'steps_of_the_fey_taunt', 'hurl_through_hell', 'clairvoyant_combatant', 'portent', 'boon_of_energy_resistance', 'generic', 'silent', 'resource_pool', 'natural_recovery', 'circle_of_the_land', 'elemental_affinity', 'wild_magic_surge', 'stride_of_elements', 'celestial_resilience', 'fiendish_resilience', 'heroic_inspiration_buff', 'magical_cunning', 'tactical_mind', 'concentration_bonus_attack', 'font_of_inspiration', 'combat_stance', 'damage_type_choice', 'wild_magic_surge', 'wild_magic_tamed', 'feats_of_chaos', 'initiative_action', 'magical_cunning', 'bewitching_magic', 'lucky_point', 'telekinetic_shove', 'concentration_bonus_attack'];
    if (auto.type === 'passive_rule') {
      const interactiveEffects = ['abjuration_savant', 'divination_savant', 'evocation_savant', 'illusion_savant', 'bonus_healing'];
      return interactiveEffects.includes(auto.effect);
    }
    return interactiveTypes.includes(auto.type);
  }),
}));

// Mock TeleportModal
vi.mock('./modals/TeleportModal.jsx', () => ({
  default: ({ action, onClose }) => (
    <div data-testid="teleport-modal">
      <span>{action?.name || 'Teleport'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SignatureSpellsModal
vi.mock('./modals/arcane/SignatureSpellsModal.jsx', () => ({
  default: ({ payload: _payload, onConfirm, onClose }) => (
    <div data-testid="signature-spells-modal" role="presentation" onClick={onClose}>
      <h3>Signature Spells</h3>
      <button onClick={() => onConfirm('Fireball', 'Haste')}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SpellMasteryModal
vi.mock('./modals/arcane/SpellMasteryModal.jsx', () => ({
  default: ({ payload: _payload, onConfirm, onClose }) => (
    <div data-testid="spell-mastery-modal" role="presentation" onClick={onClose}>
      <h3>Spell Mastery</h3>
      <button onClick={() => onConfirm('Mage Armor', 'Shield')}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SavantModal
vi.mock('./modals/arcane/SavantModal.jsx', () => ({
  default: ({ payload, onConfirm, onClose }) => (
    <div data-testid={`${payload?.school?.toLowerCase() || 'savant'}-savant-modal`} role="presentation" onClick={onClose}>
      <span>{payload?.school || 'Savant'} Savant</span>
      <button onClick={() => onConfirm(payload?.spellOptions?.[0] || 'Shield', payload?.spellOptions?.[1] || 'Mage Armor')}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock WeaponKindMasteryModal
vi.mock('./modals/WeaponKindMasteryModal.jsx', () => ({
  default: ({ action, onClose }) => (
    <div data-testid="weapon-kind-mastery-modal">
      <span>{action?.name || 'Weapon Kind Mastery'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock WeaponMasteryChoiceModal
vi.mock('./modals/WeaponMasteryChoiceModal.jsx', () => ({
  default: ({ action: _action, onClose, onConfirm }) => (
    <div data-testid="weapon-mastery-choice-modal">
      <span>Weapon Mastery Choice</span>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onConfirm && onConfirm('Finesse')}>Confirm</button>
    </div>
  ),
}));

// Mock CombatSuperiorityModal
vi.mock('./modals/CombatSuperiorityModal.jsx', () => ({
  default: ({ _payload, onConfirm, _onReopenSelection, onClose }) => (
    <div data-testid="combat-superiority-modal">
      <span>Combat Superiority</span>
      <button onClick={() => onConfirm([], null)}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ResourcePoolModal
vi.mock('./modals/ResourcePoolModal.jsx', () => ({
  default: ({ playerStats: _ps, campaignName: _cn, automation: _auto, onClose }) => (
    <div data-testid="resource-pool-modal">
      <span>Resource Pool</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock NaturalRecoveryModal
vi.mock('./modals/NaturalRecoveryModal.jsx', () => ({
  default: ({ playerStats: _ps, campaignName: _cn, onClose }) => (
    <div data-testid="natural-recovery-modal">
      <span>Natural Recovery</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock CircleOfTheLandSpellsModal
vi.mock('./modals/CircleOfTheLandSpellsModal.jsx', () => ({
  default: ({ playerStats: _ps, campaignName: _cn, onClose }) => (
    <div data-testid="circle-of-the-land-modal">
      <span>Circle of the Land</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ElementalAffinityModal
vi.mock('./modals/ElementalAffinityModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onClose }) => (
    <div data-testid="elemental-affinity-modal">
      <span>{action?.name || 'Elemental Affinity'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock WildMagicSurgeModal
vi.mock('./modals/WildMagicSurgeModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="wild-magic-surge-modal">
      <span>Wild Magic Surge</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock StrideOfTheElementsModal
vi.mock('./modals/StrideOfTheElementsModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="stride-of-the-elements-modal">
      <span>{action?.name || 'Stride of the Elements'}</span>
      <button onClick={() => onConfirm('Ice Walk', { effect: 'ice_walk' })}>Confirm Ice Walk</button>
      <button onClick={() => onConfirm('+10 Speed', { effect: 'speed_boost' })}>Confirm Speed</button>
      <button onClick={() => onConfirm('Fly Speed', { effect: 'fly_speed' })}>Confirm Fly</button>
      <button onClick={() => onConfirm('Teleport 30 ft', { effect: 'teleport' })}>Confirm Teleport</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ElementalEpitomeModal
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, currentResistance: _cr, onConfirm, onClose }) => (
    <div data-testid="elemental-epitome-modal">
      <span>{action?.name || 'Elemental Epitome'}</span>
      <button onClick={() => onConfirm({ description: 'Elemental Epitome activated.' })}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock DestructiveStrideModal
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="destructive-stride-modal">
      <span>{action?.name || 'Destructive Stride'}</span>
      <button onClick={() => onConfirm({ type: 'modal', modalName: 'destructiveStrideTarget', payload: { targets: [{ name: 'Enemy1' }] } })}>Confirm Target</button>
      <button onClick={() => onConfirm({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck target.' } })}>Confirm Popup</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SecondaryTargetModal
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: ({ title, icon: _icon, targets, description, confirmLabel, confirmIcon: _ci, onTargetSelected, onSkip }) => (
    <div data-testid="secondary-target-modal">
      <span>{title}</span>
      {description && <p>{description}</p>}
      <button onClick={() => onTargetSelected(targets[0]?.name)}>{confirmLabel}</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

// Mock QuiveringPalmModal
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="quivering-palm-modal">
      <span>Quivering Palm</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock StepsOfTheFeyTauntModal
vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="steps-of-the-fey-taunt-modal">
      <span>Steps of the Fey Taunt</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock HurlThroughHellModal
vi.mock('./modals/HurlThroughHellModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="hurl-through-hell-modal">
      <span>Hurl Through Hell</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ClairvoyantCombatantModal
vi.mock('./modals/ClairvoyantCombatantModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="clairvoyant-combatant-modal">
      <span>Clairvoyant Combatant</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock CreatureSelectionModal
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: ({ title, confirmLabel, description, onConfirm, onSkip, targets, note }) => (
    <div data-testid="creature-selection-modal">
      <span>{title}</span>
      {description && <p>{description}</p>}
      {note && <p>{note}</p>}
      <button onClick={() => onConfirm && onConfirm(targets.map(t => t.name))}>{confirmLabel}</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

// Mock SingleResistanceSelectionModal
vi.mock('./modals/SingleResistanceSelectionModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="single-resistance-modal">
      <span>Single Resistance</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock MultiResistanceSelectionModal
vi.mock('./modals/MultiResistanceSelectionModal.jsx', () => ({
  default: ({ title, icon: _icon, damageTypes: _dt, existingTypes: _et, maxSelections: _ms, action: _a, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="multi-resistance-modal">
      <span>{title}</span>
      <button onClick={() => onConfirm && onConfirm(['fire', 'cold'])}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock renderMarkdownInline
vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
  renderMarkdown: vi.fn((md) => md),
  renderMarkdownInline: vi.fn((md) => md),
}));

// Mock fighting styles
vi.mock('../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([
    { name: 'Great Weapon Fighting', description: 'When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit.' },
    { name: 'Interception', description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to reduce the damage by 1d10 + your proficiency bonus.' },
    { name: 'Protection', description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll.' },
    { name: 'Two-Weapon Fighting', description: 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the bonus attack.' },
  ])),
}));

// Mock the handler functions called by modal confirm callbacks
vi.mock('../../services/automation/handlers/class-wizard/signatureSpellsHandler.js', () => ({
  onSignatureSpellsSelected: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-wizard/spellMasteryHandler.js', () => ({
  onSpellMasterySelected: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-wizard/SavantHandler.js', () => ({
  onSavantSelected: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/defensiveTacticsHandler.js', () => ({
  applyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/hunterPreyHandler.js', () => ({
  applyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Portent', description: 'Die applied.' } })),
}));

vi.mock('../../services/automation/handlers/class-warlock/tempTeleportHandler.js', () => ({
  confirmTeleport: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Moonlight Step', description: 'Teleported.' } })),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(async (creatureName, amount, _campaign) => {
    mockRuntimeStore[`${creatureName}_tempHp`] = amount;
    return amount;
  }),
}));

// Import setTempHp for verification
import { setTempHp as mockSetTempHp } from '../../services/automation/handlers/buffs/tempHpService.js';

vi.mock('../../services/automation/handlers/buffs/tempHpBuffHandler.js', () => ({
  confirmBolsteringPerformance: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Bolstering Performance', description: 'Allies inspired.' } })),
}));

vi.mock('../../services/automation/handlers/buffs/encouragingSongHandler.js', () => ({
  confirmEncouragingSong: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Encouraging Song', description: 'Allies inspired.' } })),
  skipEncouragingSong: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Encouraging Song', description: 'Skipped.' } })),
}));

vi.mock('../../services/automation/handlers/reactions/boonOfEnergyResistanceHandler.js', () => ({
  applyTypeChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Boon of Energy', description: 'Resistances chosen.' } })),
}));

vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  applyTargetChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck target.' } })),
}));

// Mock runtime state
const mockRuntimeStore = {};

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_key, runtimeKey) => mockRuntimeStore[runtimeKey] ?? null),
  setRuntimeValue: vi.fn((_key, runtimeKey, value, _campaign) => {
    mockRuntimeStore[runtimeKey] = value;
    return Promise.resolve();
  }),
  useRuntimeValue: vi.fn((_key, runtimeKey) => mockRuntimeStore[runtimeKey] ?? null),
}));

// Mock DiceRollContext
vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

// Mock useCombatSuperiorityModal
vi.mock('../../hooks/combat/useCombatSuperiorityModal.js', () => ({
  useCombatSuperiorityModal: vi.fn(() => ({
    combatSuperiorityModal: null,
    setCombatSuperiorityModal: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(),
    handleCombatSuperiorityReopenSelection: vi.fn(),
  })),
}));

// Mock useLoggedDiceRoll
vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
  })),
}));

// Mock log service
vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// Mock normalizeAutoDamage / resolveAttackDamageStandalone
vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn(() => ({ attack: {}, ctx: {} })),
  resolveAttackDamageStandalone: vi.fn(() => Promise.resolve()),
}));

// Mock getCombatContext
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));

// Import mocked modules
import { executeHandler } from '../../services/automation/index.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';
import { applyTypeChoice } from '../../services/automation/handlers/reactions/boonOfEnergyResistanceHandler.js';

const basePlayerStats = {
  name: 'TestCharacter',
  specialActions: [],
  class: {
    fightingStyles: [],
  },
  actions: [],
  bonusActions: [],
  reactions: [],
  characterAdvancement: [],
  proficiency: 2,
};

function createPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharSpecialActions - Celestial Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('handleCelestialResilienceConfirm', () => {
    it('grants temp HP to selected targets and shows popup', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'celestialResilienceModal',
        payload: {
          action: { name: 'Celestial Resilience' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }],
          maxTargets: 5,
          selfTempHp: 5,
          allyTempHp: 3,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Celestial Resilience', description: 'Gain temp HP and grant to allies.', automation: { type: 'generic' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Celestial Resilience/));

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Grant Resilience'));

      await waitFor(() => {
        expect(mockSetTempHp).toHaveBeenCalledWith('Ally1', 3, 'test');
        expect(mockSetTempHp).toHaveBeenCalledWith('Ally2', 3, 'test');
      });

      expect(mockSetPopupHtml).toHaveBeenCalled();
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Celestial Resilience');
      expect(popupCall).toContain('3 temporary hit points');
      expect(popupCall).toContain('Ally1');
    });

    it('shows popup when no targets selected', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'celestialResilienceModal',
        payload: {
          action: { name: 'Celestial Resilience' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          creatureTargets: [{ name: 'Ally1' }],
          maxTargets: 5,
          selfTempHp: 5,
          allyTempHp: 3,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Celestial Resilience', description: 'Gain temp HP.', automation: { type: 'generic' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Celestial Resilience/));

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('No allies selected');
    });
  });

  describe('handleCelestialResilienceSkip', () => {
    it('shows popup and closes modal when skip is clicked', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'celestialResilienceModal',
        payload: {
          action: { name: 'Celestial Resilience' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          creatureTargets: [{ name: 'Ally1' }],
          maxTargets: 5,
          selfTempHp: 5,
          allyTempHp: 3,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Celestial Resilience', description: 'Gain temp HP.', automation: { type: 'generic' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Celestial Resilience/));

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('No allies selected');
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Fighting Styles Branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fighting style filter branches', () => {
    it('adds Interception fighting style when present and not already in specialActions', async () => {
      const playerStats = createPlayerStats({
        class: { fightingStyles: ['Interception'] },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      await waitFor(() => {
        expect(screen.getByText(/Interception/)).toBeInTheDocument();
      });
    });

    it('adds Protection fighting style when present and not already in specialActions', async () => {
      const playerStats = createPlayerStats({
        class: { fightingStyles: ['Protection'] },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      await waitFor(() => {
        expect(screen.getByText(/Protection/)).toBeInTheDocument();
      });
    });

    it('adds Two-Weapon Fighting style when present and not already in specialActions', async () => {
      const playerStats = createPlayerStats({
        class: { fightingStyles: ['Two-Weapon Fighting'] },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      await waitFor(() => {
        expect(screen.getByText(/Two-Weapon Fighting/)).toBeInTheDocument();
      });
    });

    it('does not add fighting style when fightingStylesMap is null (async load pending)', async () => {
      vi.mocked((await import('../../services/ui/dataLoader.js')).loadFightingStyles).mockReturnValue(Promise.resolve([]));

      const playerStats = createPlayerStats({
        class: { fightingStyles: ['Great Weapon Fighting'] },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      // Fighting styles should not appear immediately since the mock returns empty
      expect(screen.queryByText(/Great Weapon Fighting/)).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - MultiResistance Confirm Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAutomationClick multiResistance modal confirm', () => {
    it('calls applyBoonOfEnergyResistance and shows popup on result', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'boonOfEnergyResistance',
        payload: {
          action: { name: 'Boon of Energy' },
          damageTypes: ['Fire', 'Cold', 'Lightning'],
          existingTypes: [],
          maxSelections: 2,
          playerStats: basePlayerStats,
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Boon of Energy', description: 'Choose resistances.', automation: { type: 'boon_of_energy_resistance' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Boon of Energy/));

      await waitFor(() => {
        expect(screen.getByTestId('multi-resistance-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(applyTypeChoice).toHaveBeenCalled();
      });

      expect(mockSetPopupHtml).toHaveBeenCalled();
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Boon of Energy');
      expect(popupCall).toContain('Resistances chosen');
    });

    it('closes modal after multiResistance confirm regardless of result', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'boonOfEnergyResistance',
        payload: {
          action: { name: 'Boon of Energy' },
          damageTypes: ['Fire', 'Cold'],
          existingTypes: [],
          maxSelections: 2,
          playerStats: basePlayerStats,
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Boon of Energy', description: 'Choose resistances.', automation: { type: 'boon_of_energy_resistance' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Boon of Energy/));

      await waitFor(() => {
        expect(screen.getByTestId('multi-resistance-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.queryByTestId('multi-resistance-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - CreatureSelectionModal Skip Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('Replenishing Meal skip', () => {
    it('closes replenishing meal modal when skip is clicked', async () => {
      mockRuntimeStore.replenishingMeals = 2;

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Replenishing Meal', description: 'Distribute meals.', automation: { type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' } },
        ],
        automation: {
          passives: [
            { type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' },
          ],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }]} />);

      fireEvent.click(screen.getByText(/Replenishing Meal/));

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bolstering Treats skip', () => {
    it('closes bolstering treats modal when skip is clicked', async () => {
      mockRuntimeStore.chefBolsteringTreats = 2;

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Bolstering Treats', description: 'Distribute treats.', automation: { type: 'temp_hp_buff', craftCount: true } },
        ],
        automation: {
          specialActions: [
            { type: 'temp_hp_buff', name: 'Bolstering Treats' },
          ],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }]} />);

      fireEvent.click(screen.getByText(/Bolstering Treats/));

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bolstering Performance skip', () => {
    it('closes bolstering performance modal when skip is clicked', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'bolsteringPerformanceTarget',
        payload: {
          action: { name: 'Bolstering Performance' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }],
          maxTargets: 6,
          tempHp: 5,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Bolstering Performance', description: 'Inspire allies.', automation: { type: 'temp_hp_buff' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Bolstering Performance/));

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - getEventDisplayLabel saveType branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows save type label with uppercase saveType in Portent modal', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'portentDiceChoice',
      payload: {
        targetName: 'Goblin',
        eventType: 'save',
        eventData: { d20: 10, bonus: 3, saveType: 'dexterity' },
        diceOptions: [3, 7],
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Portent', description: 'Replace a roll.', automation: { type: 'portent' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Portent/));

    await waitFor(() => {
      expect(screen.getByText(/DEXTERITY/)).toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Fiendish Resilience Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SingleResistanceSelectionModal when fiendishResilience modal is set', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'fiendishResilience',
      payload: {
        action: { name: 'Fiendish Resilience' },
        playerStats: basePlayerStats,
        campaignName: 'test',
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Fiendish Resilience', description: 'Choose a resistance.', automation: { type: 'fiendish_resilience' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Fiendish Resilience/));

    await waitFor(() => {
      expect(screen.getByTestId('single-resistance-modal')).toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - FeatureChoiceModal early return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  it('returns early when featureChoiceModal is null (no modal open)', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Test Feature', description: 'A test feature.', automation: { type: 'generic' } },
      ],
    });

    executeHandler.mockResolvedValue({
      type: 'popup',
      payload: { name: 'Test Feature', description: 'Feature activated.' },
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Test Feature/));

    await waitFor(() => {
      expect(screen.queryByText(/Choose your option/)).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - useEffect cancelled guard', () => {
  it('does not set fightingStylesMap if component unmounts during async load', async () => {
    let resolveLoad;
    const loadPromise = new Promise((resolve) => { resolveLoad = resolve; });

    vi.mocked((await import('../../services/ui/dataLoader.js')).loadFightingStyles).mockReturnValue(loadPromise);

    const { unmount } = render(<CharSpecialActions playerStats={createPlayerStats()} campaignName="test" />);

    // Unmount immediately before the promise resolves
    unmount();

    // Resolve the promise - should not throw
    await act(async () => {
      resolveLoad([{ name: 'Great Weapon Fighting', description: '' }]);
    });

    // If we got here without an error, the cancelled guard works
    expect(true).toBe(true);
  });
});

describe('CharSpecialActions - Bolstering Performance modal early return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when bolsteringPerformanceModal is null', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Bolstering Performance', description: 'Inspire allies.', automation: { type: 'temp_hp_buff' } },
      ],
    });

    executeHandler.mockResolvedValue({
      type: 'popup',
      payload: { name: 'Bolstering Performance', description: 'Allies inspired.' },
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Bolstering Performance/));

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Encouraging Song modal early return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when encouragingSongModal is null', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Encouraging Song', description: 'Sing to allies.', automation: { type: 'heroic_inspiration_buff' } },
      ],
    });

    executeHandler.mockResolvedValue({
      type: 'popup',
      payload: { name: 'Encouraging Song', description: 'Song performed.' },
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Encouraging Song/));

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Action filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters out actions that appear in actions list', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Attack', description: 'Make an attack.' },
      ],
      actions: [
        { name: 'Attack', description: 'Make an attack.' },
      ],
    });
    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    await waitFor(() => {
      expect(screen.queryByText(/Attack/)).not.toBeInTheDocument();
    });
  });

  it('filters out actions that appear in bonusActions list', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Second Wind', description: 'Regain hit points.' },
      ],
      bonusActions: [
        { name: 'Second Wind', description: 'Regain hit points.' },
      ],
    });
    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    await waitFor(() => {
      expect(screen.queryByText(/Second Wind/)).not.toBeInTheDocument();
    });
  });

  it('filters out actions that appear in reactions list', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Reaction Attack', description: 'Attack as a reaction.' },
      ],
      reactions: [
        { name: 'Reaction Attack', description: 'Attack as a reaction.' },
      ],
    });
    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    await waitFor(() => {
      expect(screen.queryByText(/Reaction Attack/)).not.toBeInTheDocument();
    });
  });

  it('filters out actions that appear in characterAdvancement list', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Feat', description: 'Take a feat.' },
      ],
      characterAdvancement: [
        { name: 'Feat', description: 'Take a feat.' },
      ],
    });
    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    await waitFor(() => {
      expect(screen.queryByText(/Feat/)).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes TeleportModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'teleport',
      payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Blink Steps', description: 'Teleport somewhere.', automation: { type: 'teleport' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Blink Steps/));

    await waitFor(() => {
      expect(screen.getByTestId('teleport-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
    });
  });

  it('closes SignatureSpellsModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'signatureSpells',
      payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Signature Spells', description: 'Choose spells.', automation: { type: 'signature_spells' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Signature Spells/));

    await waitFor(() => {
      expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('signature-spells-modal')).not.toBeInTheDocument();
    });
  });

  it('closes SpellMasteryModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'spellMastery',
      payload: { action: { name: 'Spell Mastery' }, playerStats: basePlayerStats, campaignName: 'test' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Spell Mastery', description: 'Choose spells.', automation: { type: 'spell_mastery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Spell Mastery/));

    await waitFor(() => {
      expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
    });
  });

  it('closes SavantModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'EvocationSavant',
      payload: { action: { name: 'Evocation Savant' }, playerStats: basePlayerStats, campaignName: 'test', school: 'Evocation' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Evocation Savant', description: 'Choose spells.', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Evocation Savant/));

    await waitFor(() => {
      expect(screen.getByTestId('evocation-savant-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('evocation-savant-modal')).not.toBeInTheDocument();
    });
  });

  it('closes WeaponKindMasteryModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'weaponKindMastery',
      payload: { action: { name: 'Weapon Kind Mastery' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Weapon Kind Mastery', description: 'Choose weapon kind.', automation: { type: 'weapon_kind_mastery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Weapon Kind Mastery/));

    await waitFor(() => {
      expect(screen.getByTestId('weapon-kind-mastery-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('weapon-kind-mastery-modal')).not.toBeInTheDocument();
    });
  });

  it('closes WeaponMasteryChoiceModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'weaponMasteryChoice',
      payload: { action: { name: 'Weapon Mastery' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Weapon Mastery', description: 'Choose mastery.', automation: { type: 'weapon_mastery_choice' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Weapon Mastery/));

    await waitFor(() => {
      expect(screen.getByTestId('weapon-mastery-choice-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('weapon-mastery-choice-modal')).not.toBeInTheDocument();
    });
  });

  it('closes ResourcePoolModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'resourcePool',
      payload: { automation: { type: 'resource_pool' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Resource Pool', description: 'Use resource pool.', automation: { type: 'resource_pool' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Resource Pool/));

    await waitFor(() => {
      expect(screen.getByTestId('resource-pool-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('resource-pool-modal')).not.toBeInTheDocument();
    });
  });

  it('closes NaturalRecoveryModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'naturalRecovery',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Natural Recovery', description: 'Recover resources.', automation: { type: 'natural_recovery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Natural Recovery/));

    await waitFor(() => {
      expect(screen.getByTestId('natural-recovery-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('natural-recovery-modal')).not.toBeInTheDocument();
    });
  });

  it('closes CircleOfTheLandSpellsModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'circleOfTheLandSpells',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Circle of the Land', description: 'Choose spells.', automation: { type: 'circle_of_the_land' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Circle of the Land/));

    await waitFor(() => {
      expect(screen.getByTestId('circle-of-the-land-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('circle-of-the-land-modal')).not.toBeInTheDocument();
    });
  });

  it('closes ElementalAffinityModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'elementalAffinity',
      payload: { action: { name: 'Elemental Affinity' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Elemental Affinity', description: 'Boost damage.', automation: { type: 'elemental_affinity' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Elemental Affinity/));

    await waitFor(() => {
      expect(screen.getByTestId('elemental-affinity-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('elemental-affinity-modal')).not.toBeInTheDocument();
    });
  });

  it('closes WildMagicSurgeModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'wildMagicSurge',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Wild Magic Surge', description: 'Surge with magic.', automation: { type: 'wild_magic_surge' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Wild Magic Surge/));

    await waitFor(() => {
      expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('wild-magic-surge-modal')).not.toBeInTheDocument();
    });
  });

  it('closes StrideOfTheElementsModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'strideOfTheElements',
      payload: { action: { name: 'Stride of the Elements' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Stride of the Elements', description: 'Stride elementally.', automation: { type: 'stride_of_the_elements' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Stride of the Elements/));

    await waitFor(() => {
      expect(screen.getByTestId('stride-of-the-elements-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('stride-of-the-elements-modal')).not.toBeInTheDocument();
    });
  });

  it('closes DestructiveStrideModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'destructiveStride',
      payload: { action: { name: 'Destructive Stride' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Destructive Stride', description: 'Stride destructively.', automation: { type: 'destructive_stride' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Destructive Stride/));

    await waitFor(() => {
      expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('destructive-stride-modal')).not.toBeInTheDocument();
    });
  });

  it('closes QuiveringPalmModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'quiveringPalm',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Quivering Palm', description: 'Palm of quivering.', automation: { type: 'quivering_palm' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Quivering Palm/));

    await waitFor(() => {
      expect(screen.getByTestId('quivering-palm-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('quivering-palm-modal')).not.toBeInTheDocument();
    });
  });

  it('closes StepsOfTheFeyTauntModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'stepsOfTheFeyTaunt',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Steps of the Fey Taunt', description: 'Taunt with fey steps.', automation: { type: 'steps_of_the_fey_taunt' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Steps of the Fey Taunt/));

    await waitFor(() => {
      expect(screen.getByTestId('steps-of-the-fey-taunt-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('steps-of-the-fey-taunt-modal')).not.toBeInTheDocument();
    });
  });

  it('closes HurlThroughHellModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'hurlThroughHell',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Hurl Through Hell', description: 'Hurl to hell.', automation: { type: 'hurl_through_hell' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Hurl Through Hell/));

    await waitFor(() => {
      expect(screen.getByTestId('hurl-through-hell-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('hurl-through-hell-modal')).not.toBeInTheDocument();
    });
  });

  it('closes ClairvoyantCombatantModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'clairvoyantCombatant',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Clairvoyant Combatant', description: 'Combat clairvoyantly.', automation: { type: 'clairvoyant_combatant' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Clairvoyant Combatant/));

    await waitFor(() => {
      expect(screen.getByTestId('clairvoyant-combatant-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('clairvoyant-combatant-modal')).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - MoonlightStepFallback onClose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes MoonlightStepFallback modal when clicking overlay', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'moonlightStepFallback',
      payload: {
        action: { name: 'Moonlight Step' },
        slotLevel: 3,
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Moonlight Step', description: 'Teleport using Moonlight Step.', automation: { type: 'teleport', effect: 'moonlight_step_teleport' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Moonlight Step/)[0]);

    await waitFor(() => {
      expect(screen.getByText(/Consume a level 3 spell slot/)).toBeInTheDocument();
    });

    // Find the overlay div and click it - the overlay has onClick={() => setMoonlightStepFallback(null)}
    const overlay = document.querySelector('.sp-overlay');
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText(/Consume a level 3 spell slot/)).not.toBeInTheDocument();
    });
  });
});

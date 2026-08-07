import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'tactical_mind', 'concentration_bonus_attack', 'font_of_inspiration', 'defensive_tactics', 'hunter_prey', 'resource_pool', 'natural_recovery', 'circle_of_the_land_spells', 'animal_aspect', 'stride_of_the_elements', 'elemental_epitome', 'destructive_stride', 'combat_stance', 'damage_type_choice', 'wild_magic_surge', 'wild_magic_tamed', 'feats_of_chaos', 'initiative_action', 'quivering_palm', 'magical_cunning', 'bewitching_magic', 'hurl_through_hell', 'clairvoyant_combatant', 'boon_of_energy_resistance', 'portent', 'temp_hp_buff', 'lucky_point', 'heroic_inspiration_buff', 'brew_poison', 'telekinetic_shove'];
    if (auto.type === 'passive_rule') {
      const interactiveEffects = ['abjuration_savant', 'divination_savant', 'evocation_savant', 'illusion_savant', 'persistent_rage', 'superior_defense', 'bonus_healing'];
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
  default: ({ _payload, onConfirm, _onReopenSelection, _onClose }) => (
    <div data-testid="combat-superiority-modal">
      <span>Combat Superiority</span>
      <button onClick={() => onConfirm([], null)}>Close</button>
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
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
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

// Mock CreatureSelectionModal
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: ({ title, confirmLabel, description, onConfirm, onSkip, targets }) => (
    <div data-testid="creature-selection-modal">
      <span>{title}</span>
      {description && <p>{description}</p>}
      <button onClick={() => onConfirm && onConfirm(targets.map(t => t.name))}>{confirmLabel}</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

// Mock SingleResistanceSelectionModal
vi.mock('./modals/SingleResistanceSelectionModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="single-resistance-modal">
      <span>Resistance Selection</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock MultiResistanceSelectionModal
vi.mock('./modals/MultiResistanceSelectionModal.jsx', () => ({
  default: ({ onConfirm, onClose, action: _action, playerStats: _ps, campaignName: _cn }) => (
    <div data-testid="multi-resistance-modal">
      <span>Multi Resistance</span>
      <button onClick={() => onConfirm && onConfirm(['Fire'])}>Confirm</button>
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
    <div data-testid="stride-of-elements-modal">
      <span>{action?.name || 'Stride of the Elements'}</span>
      <button onClick={() => onConfirm && onConfirm('Ice Walk', {})}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ElementalEpitomeModal
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, currentResistance: _cr, onConfirm, onClose }) => (
    <div data-testid="elemental-epitome-modal">
      <span>{action?.name || 'Elemental Epitome'}</span>
      <button onClick={() => onConfirm && onConfirm({ description: 'Activated.' })}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock DestructiveStrideModal
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="destructive-stride-modal">
      <span>{action?.name || 'Destructive Stride'}</span>
      <button onClick={() => onConfirm && onConfirm({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck.' } })}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SecondaryTargetModal
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: ({ title, onTargetSelected, onSkip, targets }) => (
    <div data-testid="secondary-target-modal">
      <span>{title}</span>
      {targets.map((t, i) => (
        <button key={i} onClick={() => onTargetSelected(t.name)}>{t.name}</button>
      ))}
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
    <div data-testid="steps-of-fey-taunt-modal">
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

// Mock handlers
vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  applyTargetChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck.' } })),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/handlers/class-warlock/tempTeleportHandler.js', () => ({
  confirmTeleport: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Moonlight Step', description: 'Teleported.' } })),
}));

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

vi.mock('../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Portent', description: 'Die applied.' } })),
}));

vi.mock('../../services/automation/handlers/class-ranger/defensiveTacticsHandler.js', () => ({
  applyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/hunterPreyHandler.js', () => ({
  applyChoice: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));

// Import mocked modules
import { executeHandler } from '../../services/automation/index.js';

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

describe('CharSpecialActions - Inline Modal Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('Moonlight Step Fallback', () => {
    it('renders inline Moonlight Step fallback modal with correct structure', async () => {
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
    });

    it('closes modal when No button is clicked', async () => {
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
        const buttons = screen.getAllByRole('button');
        const noButton = buttons.find(b => b.textContent.includes('No') && !b.textContent.includes('Moonlight'));
        expect(noButton).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const noButton = buttons.find(b => b.textContent.includes('No') && !b.textContent.includes('Moonlight'));
      fireEvent.click(noButton);

      await waitFor(() => {
        expect(screen.queryByText(/Consume a level 3 spell slot/)).not.toBeInTheDocument();
      });
    });

    it('calls confirmTeleport when Yes button is clicked', async () => {
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
        expect(screen.getByText(/Yes, Consume Slot/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Yes, Consume Slot'));

      await waitFor(() => {
        expect(screen.queryByText(/Consume a level 3 spell slot/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Portent Modal', () => {
    it('renders inline Portent modal with correct structure', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          targetName: 'Goblin',
          eventType: 'attack',
          eventData: { d20: 15, bonus: 3, hit: true },
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
        expect(screen.getByText('Portent')).toBeInTheDocument();
        expect(screen.getByText(/Creature:/)).toBeInTheDocument();
        expect(screen.getByText(/Goblin/)).toBeInTheDocument();
      });
    });

    it('shows the original roll calculation in the Portent modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          targetName: 'Goblin',
          eventType: 'attack',
          eventData: { d20: 15, bonus: 3, hit: true },
          diceOptions: [3, 7],
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Portent', description: 'Replace a roll.', automation: { type: 'portent' } },
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Portent/)[0]);

      await waitFor(() => {
        expect(screen.getByText(/d20\(15\) \+ 3 = 18/)).toBeInTheDocument();
        expect(screen.getByText(/Hit/)).toBeInTheDocument();
      });
    });

    it('shows cancel button that closes the modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          targetName: 'Goblin',
          eventType: 'attack',
          eventData: { d20: 15, bonus: 3, hit: true },
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
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText(/Choose a foretelling roll/)).not.toBeInTheDocument();
      });
    });

    it('applies portent choice when a die is selected', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          targetName: 'Goblin',
          eventType: 'attack',
          eventData: { d20: 15, bonus: 3, hit: true },
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
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('3'));

      await waitFor(() => {
        expect(screen.queryByText(/Choose a foretelling roll/)).not.toBeInTheDocument();
      });
    });
  });

  describe('MultiResistance', () => {
    it('renders MultiResistanceSelectionModal when boonOfEnergyResistance modal is set', async () => {
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
    });
  });
});

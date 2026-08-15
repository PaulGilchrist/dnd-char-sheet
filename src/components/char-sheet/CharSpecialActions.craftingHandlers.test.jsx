// @improved-by-ai
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
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'defensive_tactics', 'hunter_prey', 'animal_aspect', 'passive_rule', 'temp_hp_buff', 'brew_poison'];
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
  loadFightingStyles: vi.fn(() => Promise.resolve([
    { name: 'Great Weapon Fighting', description: 'When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit.' },
    { name: 'Protection', description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.' },
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

// Mock DiceRollContext — capture popup content for assertion
let capturedPopup = null;
vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({
    setPopupHtml: (html) => { capturedPopup = html; },
  })),
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

// Mock getCombatContext
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));

// Import mocked modules
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../services/ui/logService.js';

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

describe('CharSpecialActions - Replenishing Meal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPopup = null;
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('handleReplenishingMealClick', () => {
    it('opens creature selection modal when meals remain', async () => {
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
        expect(screen.getByText('Replenishing Meal')).toBeInTheDocument();
        expect(screen.getByText('Choose creatures to receive a replenishing meal.')).toBeInTheDocument();
      });
    });

    it('shows popup when no meals remaining', async () => {
      mockRuntimeStore.replenishingMeals = 0;

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
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Replenishing Meal/));

      await waitFor(() => {
        expect(capturedPopup).toContain('No meals remaining');
      });
    });

    it('does nothing when the feature is absent', async () => {
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Replenishing Meal', description: 'Distribute meals.', automation: { type: 'passive_rule', effect: 'bonus_healing' } },
        ],
        automation: {
          passives: [],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Replenishing Meal/));

      await waitFor(() => {
        expect(capturedPopup).toBeNull();
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('handleReplenishingMealConfirm', () => {
    it('distributes meals to targets, decrements counter, logs, and shows popup', async () => {
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
        expect(screen.getByText('Distribute Meals')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Distribute Meals'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });

      // Verify setRuntimeValue was called to give Ally1 a meal
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'replenishingMeals', 1, 'test');

      // Verify the counter was decremented (2 - 1 = 1)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'replenishingMeals', 1, 'test');

      // Verify the log entry was created
      expect(addEntry).toHaveBeenCalledWith('test', expect.objectContaining({
        type: 'ability_use',
        characterName: 'TestCharacter',
        abilityName: 'Replenishing Meal',
        description: expect.stringContaining('distributed 1 replenishing meal to Ally1'),
      }));

      // Verify the popup was shown
      expect(capturedPopup).toContain('Replenishing Meal');
      expect(capturedPopup).toContain('1 meal');
      expect(capturedPopup).toContain('Ally1');
    });

    it('grants meals to multiple targets and decrements by the count', async () => {
      mockRuntimeStore.replenishingMeals = 3;

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
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }, { name: 'Ally2' }]} />);

      fireEvent.click(screen.getByText(/Replenishing Meal/));

      await waitFor(() => {
        expect(screen.getByText('Distribute Meals')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Distribute Meals'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });

      // Verify setRuntimeValue was called for both targets
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'replenishingMeals', 1, 'test');
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally2', 'replenishingMeals', 1, 'test');

      // Verify the counter was decremented by 2 (3 - 2 = 1)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'replenishingMeals', 1, 'test');

      // Verify plural in log and popup
      expect(addEntry).toHaveBeenCalledWith('test', expect.objectContaining({
        description: expect.stringContaining('distributed 2 replenishing meals'),
      }));
      expect(capturedPopup).toContain('2 meals');
    });

    it('caps distribution at maxTargets when more targets are selected', async () => {
      mockRuntimeStore.replenishingMeals = 1;

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
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }, { name: 'Ally2' }]} />);

      fireEvent.click(screen.getByText(/Replenishing Meal/));

      await waitFor(() => {
        expect(screen.getByText('Distribute Meals')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Distribute Meals'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });

      // Only one meal available, so only one target should receive it
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'replenishingMeals', 1, 'test');
      // Ally2 should NOT have received a meal call (only 1 meal available)
      expect(setRuntimeValue).not.toHaveBeenCalledWith('Ally2', 'replenishingMeals', 1, 'test');

      // Counter decremented by 1 (1 - 1 = 0)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'replenishingMeals', 0, 'test');
    });
  });
});

describe('CharSpecialActions - Bolstering Treats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPopup = null;
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('handleBolsteringTreatsClick', () => {
    it('opens creature selection modal when treats remain', async () => {
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
        expect(screen.getByText('Bolstering Treats')).toBeInTheDocument();
        expect(screen.getByText('Choose creatures to receive a bolstering treat.')).toBeInTheDocument();
      });
    });

    it('shows popup when no treats remaining', async () => {
      mockRuntimeStore.chefBolsteringTreats = 0;

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
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Bolstering Treats/));

      await waitFor(() => {
        expect(capturedPopup).toContain('No treats remaining');
      });
    });

    it('does nothing when the feature is absent', async () => {
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Bolstering Treats', description: 'Distribute treats.', automation: { type: 'temp_hp_buff', craftCount: true } },
        ],
        automation: {
          specialActions: [],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Bolstering Treats/));

      await waitFor(() => {
        expect(capturedPopup).toBeNull();
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('handleBolsteringTreatsConfirm', () => {
    it('sets bolsteringTreat on targets, decrements counter, logs, and shows popup', async () => {
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
        expect(screen.getByText('Distribute Treats')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Distribute Treats'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });

      // Verify setRuntimeValue was called to give Ally1 a bolsteringTreat
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'bolsteringTreat', 1, 'test');

      // Verify the counter was decremented (2 - 1 = 1)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'chefBolsteringTreats', 1, 'test');

      // Verify the log entry was created
      expect(addEntry).toHaveBeenCalledWith('test', expect.objectContaining({
        type: 'ability_use',
        characterName: 'TestCharacter',
        abilityName: 'Bolstering Treats',
        description: expect.stringContaining('distributed 1 bolstering treat to Ally1'),
      }));

      // Verify the popup was shown
      expect(capturedPopup).toContain('Bolstering Treats');
      expect(capturedPopup).toContain('1 treat');
      expect(capturedPopup).toContain('Ally1');
    });

    it('grants treats to multiple targets and decrements by the count', async () => {
      mockRuntimeStore.chefBolsteringTreats = 3;

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
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }, { name: 'Ally2' }]} />);

      fireEvent.click(screen.getByText(/Bolstering Treats/));

      await waitFor(() => {
        expect(screen.getByText('Distribute Treats')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Distribute Treats'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });

      // Verify setRuntimeValue was called for both targets
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'bolsteringTreat', 1, 'test');
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally2', 'bolsteringTreat', 1, 'test');

      // Verify the counter was decremented by 2 (3 - 2 = 1)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'chefBolsteringTreats', 1, 'test');

      // Verify plural in log and popup
      expect(addEntry).toHaveBeenCalledWith('test', expect.objectContaining({
        description: expect.stringContaining('distributed 2 bolstering treats'),
      }));
      expect(capturedPopup).toContain('2 treats');
    });

    it('caps distribution at maxTargets when more targets are selected', async () => {
      mockRuntimeStore.chefBolsteringTreats = 1;

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
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }, { name: 'Ally2' }]} />);

      fireEvent.click(screen.getByText(/Bolstering Treats/));

      await waitFor(() => {
        expect(screen.getByText('Distribute Treats')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Distribute Treats'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });

      // Only one treat available, so only one target should receive it
      expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'bolsteringTreat', 1, 'test');
      // Ally2 should NOT have received a treat
      expect(setRuntimeValue).not.toHaveBeenCalledWith('Ally2', 'bolsteringTreat', 1, 'test');

      // Counter decremented by 1 (1 - 1 = 0)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'chefBolsteringTreats', 0, 'test');
    });
  });
});

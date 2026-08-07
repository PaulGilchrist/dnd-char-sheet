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
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'generic', 'silent', 'animal_aspect', 'passive_rule', 'temp_hp_buff', 'brew_poison'];
    if (auto.type === 'passive_rule') {
      const interactiveEffects = ['abjuration_savant', 'divination_savant', 'evocation_savant', 'illusion_savant'];
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

// Mock runtime state - use a store that can be configured per-test
const runtimeStore = {};

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_key, runtimeKey) => runtimeStore[runtimeKey] ?? null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  useRuntimeValue: vi.fn((_key, runtimeKey) => runtimeStore[runtimeKey] ?? null),
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

function createSpecialAction(name, automation) {
  return { name, description: `${name} description.`, automation };
}

describe('CharSpecialActions - handleAutomationClick branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(runtimeStore).forEach(k => delete runtimeStore[k]);
  });

  describe('animal_aspect (Aspect of the Wilds)', () => {
    it('opens aspect modal when not already used this rest', async () => {
      runtimeStore.aspectOfTheWildsUsedThisRest = false;

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Aspect of the Wilds', { type: 'animal_aspect' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Aspect of the Wilds/)[0]);

      await waitFor(() => {
        expect(screen.getByText(/Choose an animal aspect/)).toBeInTheDocument();
        expect(screen.getByText('Owl')).toBeInTheDocument();
        expect(screen.getByText('Panther')).toBeInTheDocument();
        expect(screen.getByText('Salmon')).toBeInTheDocument();
      });
    });

    it('shows popup when already used this rest', async () => {
      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      runtimeStore.aspectOfTheWildsUsedThisRest = true;

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Aspect of the Wilds', { type: 'animal_aspect' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Aspect of the Wilds/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('Already chosen this rest');
        expect(capturedPopup).toContain('Long Rest');
      });
    });
  });

  // Replenishing Meal modal testing is covered in CharSpecialActions.featureChoice.test.jsx

  describe('temp_hp_buff (Bolstering Treats)', () => {
    it('opens bolstering treats modal when craftCount is set', async () => {
      runtimeStore.chefBolsteringTreats = 2;

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Bolstering Treats', { type: 'temp_hp_buff', craftCount: true }),
        ],
        automation: {
          specialActions: [
            { type: 'temp_hp_buff', name: 'Bolstering Treats' },
          ],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Bolstering Treats/)[0]);

      await waitFor(() => {
        expect(screen.getByText('Bolstering Treats')).toBeInTheDocument();
        expect(screen.getByText('Choose creatures to receive a bolstering treat.')).toBeInTheDocument();
      });
    });
  });

  describe('brew_poison', () => {
    it('brews poison when under max, has kit, and has gold', async () => {
      runtimeStore.poisonDoses = 0;
      runtimeStore.gold = 100;

      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Brew Poison', { type: 'brew_poison' }),
        ],
        automation: {
          specialActions: [
            { type: 'brew_poison', name: 'Brew Poison' },
          ],
        },
        inventory: {
          equipped: [],
          backpack: ["Poisoner's Kit"],
          gold: 100,
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Brew Poison/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('Brewed');
        expect(capturedPopup).toContain('Poisoner\'s Kit');
      });
    });

    it('shows error when at max poison doses', async () => {
      runtimeStore.poisonDoses = 2;

      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Brew Poison', { type: 'brew_poison' }),
        ],
        automation: {
          specialActions: [
            { type: 'brew_poison', name: 'Brew Poison' },
          ],
        },
        inventory: {
          equipped: [],
          backpack: [],
          gold: 100,
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Brew Poison/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('already at maximum');
      });
    });

    it('shows error when missing Poisoner\'s Kit', async () => {
      runtimeStore.poisonDoses = 0;
      runtimeStore.gold = 100;

      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Brew Poison', { type: 'brew_poison' }),
        ],
        automation: {
          specialActions: [
            { type: 'brew_poison', name: 'Brew Poison' },
          ],
        },
        inventory: {
          equipped: [],
          backpack: [],
          gold: 100,
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Brew Poison/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain("Poisoner's Kit");
      });
    });

    it('shows error when insufficient gold', async () => {
      runtimeStore.poisonDoses = 0;
      runtimeStore.gold = 30;

      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Brew Poison', { type: 'brew_poison' }),
        ],
        automation: {
          specialActions: [
            { type: 'brew_poison', name: 'Brew Poison' },
          ],
        },
        inventory: {
          equipped: [],
          backpack: ["Poisoner's Kit"],
          gold: 30,
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Brew Poison/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('50 GP');
        expect(capturedPopup).toContain('30 GP');
      });
    });
  });

  describe('executeHandler fallback', () => {
    it('handles executeHandler returning modal result for teleport', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'teleport',
        payload: { action: { name: 'Teleport' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Teleport', { type: 'teleport' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Teleport/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('teleport-modal')).toBeInTheDocument();
      });
    });

    it('handles executeHandler returning popup result', async () => {
      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'popup',
        payload: { name: 'Test Action', description: 'Action completed.' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Test Action', { type: 'generic' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Test Action/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('Test Action');
        expect(capturedPopup).toContain('Action completed.');
      });
    });

    it('handles executeHandler returning null silently', async () => {
      executeHandler.mockResolvedValue(null);

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Silent Action', { type: 'silent' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Silent Action/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalled();
      });
    });
  });

  describe('cannotAct guard', () => {
    it('does not execute any automation when cannotAct is true', async () => {
      executeHandler.mockResolvedValue({ type: 'popup', payload: { name: 'Should not fire' } });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Blocked Action', { type: 'generic' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getAllByText(/Blocked Action/)[0]);

      await waitFor(() => {
        expect(executeHandler).not.toHaveBeenCalled();
      });
    });
  });
});

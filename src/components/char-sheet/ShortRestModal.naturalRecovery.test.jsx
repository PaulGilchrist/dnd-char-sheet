import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ShortRestModal from './ShortRestModal.jsx';

const getRuntimeValueMock = vi.fn(() => null);
const setRuntimeValueMock = vi.fn();
const setRuntimeBatchMock = vi.fn();

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  useRuntimeValue: vi.fn(() => null),
  listeners: new Map(),
  getRuntimeValue: vi.fn((...args) => getRuntimeValueMock(...args)),
  setRuntimeValue: vi.fn((...args) => setRuntimeValueMock(...args)),
  setRuntimeBatch: vi.fn((...args) => setRuntimeBatchMock(...args)),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollDice: vi.fn((count, _die) => ({ total: count * 4, rolls: Array(count).fill(4) })),
  rollExpression: vi.fn(() => ({ total: 5, rolls: [5] })),
}));

vi.mock('../../services/rules/effects/restRules.js', () => ({
  getHitDieSize: vi.fn(() => 8),
  computeHitDieRecovery: vi.fn((roll, conBonus) => roll + conBonus),
  SHORT_REST_RESOURCES: ['spell_slots_level_1', 'spell_slots_level_2'],
  getShortRestResourceLabels: vi.fn(() => ['Spell Slots (1st+)', 'Hit Dice']),
  clearHuntersMarkConcentration: vi.fn(),
  applyShortRest: vi.fn(async () => ({})),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
  clearAllExpirationEffects: vi.fn(),
}));

vi.mock('../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({ songOfRestDie: 6 })),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(() => 2),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(() => null),
}));

vi.mock('../../services/ui/dataLoader.js', () => ({
  loadSpellData: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: ({ title, description, note, confirmLabel }) => (
    <div className="creature-selection-mock">
      <span>{title}</span>
      <span>{description}</span>
      <span>{note}</span>
      <span>{confirmLabel}</span>
      <button data-testid="creature-confirm">Confirm</button>
      <button data-testid="creature-skip">Skip</button>
    </div>
  ),
}));

const mockCampaignName = 'test-campaign';

function createPlayerStats(overrides = {}) {
  return {
    name: 'Thorin',
    level: 5,
    hitPoints: 45,
    proficiency: 3,
    abilities: [
      { name: 'Constitution', bonus: 2 },
      { name: 'Charisma', bonus: 3 },
      { name: 'Wisdom', bonus: 2 },
    ],
    class: { name: 'Cleric', major: { name: 'Cleric' } },
    automation: { passives: [], actions: [] },
    spellAbilities: {
      spell_slots_level_1: 4,
      spell_slots_level_2: 3,
      spells: [{ name: 'Healing Word', prepared: 'Prepared' }],
    },
    inventory: { equipped: [] },
    ...overrides,
  };
}

function renderModal(overrides = {}) {
  const playerStats = createPlayerStats(overrides);
  const onClose = vi.fn();
  const onComplete = vi.fn();
  const rendered = render(
    <ShortRestModal
      playerStats={playerStats}
      campaignName={mockCampaignName}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
  return { ...rendered, onClose, onComplete, playerStats };
}

function setupGetRuntimeValue(returns) {
  getRuntimeValueMock.mockImplementation((_name, key) => {
    if (key in returns) return returns[key];
    return null;
  });
}

describe('ShortRestModal - Natural Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  describe('rendering', () => {
    it('renders Natural Recovery section for Druid with circle_of_the_land subclass', () => {
      renderModal({
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: { spell_slots_level_1: 4, spell_slots_level_2: 3, spells: [] },
      });
      expect(screen.getByText('Natural Recovery')).toBeInTheDocument();
    });

    it('does not render Natural Recovery for non-Druids', () => {
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [] },
      });
      expect(screen.queryByText('Natural Recovery')).not.toBeInTheDocument();
    });

    it('shows the budget display', () => {
      renderModal({
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: { spell_slots_level_1: 4, spell_slots_level_2: 3, spells: [] },
      });
      expect(screen.getByText(/Budget:.*remaining/)).toBeInTheDocument();
    });

    it('shows correct max budget based on druid level', () => {
      // Level 5 druid: Math.floor(5/2) = 2
      renderModal({
        level: 5,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: { spell_slots_level_1: 4, spell_slots_level_2: 3, spells: [] },
      });
      expect(screen.getByText(/Budget: 2 of 2 levels remaining/)).toBeInTheDocument();
    });

    it('shows spell slot levels table with current and available columns', () => {
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
          spell_slots_level_4: 1,
          spells: [],
        },
      });
      expect(screen.getByText('Level')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Recover')).toBeInTheDocument();
    });

    it('shows + and - buttons for each slot level', () => {
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const buttons = screen.getAllByRole('button');
      const minusButtons = buttons.filter(b => b.textContent === '-');
      const plusButtons = buttons.filter(b => b.textContent === '+');
      expect(minusButtons.length).toBeGreaterThan(0);
      expect(plusButtons.length).toBeGreaterThan(0);
    });

    it('shows slot level values in the table', () => {
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
          spells: [],
        },
      });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('slot selection', () => {
    it('increments selection count with + button', async () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const plusBtn = firstControl.querySelector('button:last-child');
      expect(plusBtn).not.toBeDisabled();
      fireEvent.click(plusBtn);
      await act(async () => {});
      const countSpans = document.querySelectorAll('.short-rest-nr-count');
      expect(countSpans[0].textContent).toBe('1');
    });

    it('decrements selection count with - button', async () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const plusBtn = firstControl.querySelector('button:last-child');
      const minusBtn = firstControl.querySelector('button:first-child');
      fireEvent.click(plusBtn);
      await act(async () => {});
      fireEvent.click(minusBtn);
      await act(async () => {});
      const countSpans = document.querySelectorAll('.short-rest-nr-count');
      expect(countSpans[0].textContent).toBe('0');
    });

    it('prevents going below 0 selection', () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const minusBtn = firstControl.querySelector('button:first-child');
      expect(minusBtn).toBeDisabled();
    });

    it('prevents selecting more than available slots', async () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const plusBtn = firstControl.querySelector('button:last-child');
      // Available = 4 - 2 = 2, click + twice
      for (let i = 0; i < 2; i++) {
        fireEvent.click(plusBtn);
        await act(async () => {});
      }
      // Now the + should be disabled since all 2 available are used
      expect(plusBtn).toBeDisabled();
    });

    it('prevents selection when budget is exhausted', () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1, spell_slots_level_3: 1 });
      renderModal({
        level: 5,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      // Level 3 row is the third row (index 2)
      const level3Control = controls[2];
      const plusBtn = level3Control.querySelector('button:last-child');
      // Level 3 costs 3 budget, we only have 2, so it's disabled
      expect(plusBtn).toBeDisabled();
    });

    it('updates budget display when selections change', async () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const budgetDiv = document.querySelector('.short-rest-nr-budget');
      expect(budgetDiv.textContent).toContain('5 of 5');
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const plusBtn = firstControl.querySelector('button:last-child');
      fireEvent.click(plusBtn);
      await act(async () => {});
      // Level 1 slot costs 1 budget, so remaining = 4
      expect(budgetDiv.textContent).toContain('4 of 5');
    });

    it('uses correct budget calculation: level * count', async () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const budgetDiv = document.querySelector('.short-rest-nr-budget');
      expect(budgetDiv.textContent).toContain('5 of 5');
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      // Level 2 row is index 1
      const level2Control = controls[1];
      const plusBtn = level2Control.querySelector('button:last-child');
      // Select 2x level 2 slots = 4 budget used
      fireEvent.click(plusBtn);
      await act(async () => {});
      fireEvent.click(plusBtn);
      await act(async () => {});
      // Budget used = 2*2 = 4, remaining = 1
      expect(budgetDiv.textContent).toContain('1 of 5');
      // Verify the count display
      const countSpans = document.querySelectorAll('.short-rest-nr-count');
      expect(countSpans[1].textContent).toBe('2');
    });

    it('clears selection when count goes back to 0', async () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const plusBtn = firstControl.querySelector('button:last-child');
      const minusBtn = firstControl.querySelector('button:first-child');
      fireEvent.click(plusBtn);
      await act(async () => {});
      const countSpans = document.querySelectorAll('.short-rest-nr-count');
      expect(countSpans[0].textContent).toBe('1');
      fireEvent.click(minusBtn);
      await act(async () => {});
      expect(countSpans[0].textContent).toBe('0');
    });
  });

  describe('slot availability display', () => {
    it('shows current/max for each slot level', () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2, spell_slots_level_2: 1 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      expect(screen.getByText(/2 \/ 4/)).toBeInTheDocument();
      expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    });

    it('calculates available correctly (max - current)', () => {
      setupGetRuntimeValue({ spell_slots_level_1: 2 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spells: [],
        },
      });
      // Available should be 4 - 2 = 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('only shows slot levels that have max > 0', () => {
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 0,
          spell_slots_level_3: 3,
          spells: [],
        },
      });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});

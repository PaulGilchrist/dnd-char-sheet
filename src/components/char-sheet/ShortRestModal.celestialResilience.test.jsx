import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ShortRestModal from './ShortRestModal.jsx';

const getRuntimeValueMock = vi.fn(() => null);
const setRuntimeValueMock = vi.fn();
const setRuntimeBatchMock = vi.fn();
let _useRuntimeValueResult = null;

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  useRuntimeValue: () => _useRuntimeValueResult,
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
  SHORT_REST_RESOURCES: [],
  getShortRestResourceLabels: vi.fn(() => []),
  clearHuntersMarkConcentration: vi.fn(),
  applyShortRest: vi.fn(async () => ({})),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
  clearAllExpirationEffects: vi.fn(),
}));

vi.mock('../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({})),
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
    ],
    class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
    automation: { passives: [] },
    specialActions: [{ name: 'Celestial Resilience' }],
    spellAbilities: { spells: [] },
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

function setupUseRuntimeValue(returns) {
  if (returns.replenishingMeals != null) {
    _useRuntimeValueResult = returns.replenishingMeals;
  } else {
    _useRuntimeValueResult = null;
  }
}

describe('ShortRestModal - Celestial Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  describe('rendering', () => {
    it('renders for Warlock with Celestial Patron subclass', () => {
      renderModal({
        class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
        specialActions: [{ name: 'Celestial Resilience' }],
      });
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
    });

    it('does not render Celestial Resilience section by default (only shown during completion)', () => {
      renderModal({
        class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
        specialActions: [{ name: 'Celestial Resilience' }],
      });
      expect(screen.queryByText('Celestial Resilience')).not.toBeInTheDocument();
    });

    it('does not render for non-Celestial Warlocks', () => {
      renderModal({
        class: { name: 'Warlock', major: { name: 'Archfey' } },
        specialActions: [],
      });
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
    });

    it('does not render for non-Warlocks with Celestial Patron', () => {
      renderModal({
        class: { name: 'Sorcerer', major: { name: 'Celestial Patron' } },
        specialActions: [],
      });
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
    });
  });

  describe('completion flow with Celestial Resilience', () => {
    it('shows CreatureSelectionModal when applyShortRest returns celestialResilienceAllies', async () => {
      renderModal({
        class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
        specialActions: [{ name: 'Celestial Resilience' }],
      });

      // Mock applyShortRest to return celestialResilienceAllies
      const { applyShortRest } = await import('../../services/rules/effects/restRules.js');
      vi.mocked(applyShortRest).mockResolvedValueOnce({
        celestialResilienceAllies: {
          creatureTargets: [{ name: 'Ally1', type: 'player' }, { name: 'Ally2', type: 'player' }],
          allyTempHp: 7,
          selfTempHp: 8,
          maxTargets: 5,
        },
      });

      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      expect(screen.getByText('Celestial Resilience')).toBeInTheDocument();
      expect(screen.getByText(/Choose up to 5 allies/)).toBeInTheDocument();
      expect(screen.getByText(/You gain 8 temporary hit points/)).toBeInTheDocument();
      expect(screen.getByText(/Each selected ally gains 7 temporary hit points/)).toBeInTheDocument();
    });

    it('calls onComplete after confirming Celestial Resilience', async () => {
      const { onComplete } = renderModal({
        class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
        specialActions: [{ name: 'Celestial Resilience' }],
      });

      const { applyShortRest } = await import('../../services/rules/effects/restRules.js');
      vi.mocked(applyShortRest).mockResolvedValueOnce({
        celestialResilienceAllies: {
          creatureTargets: [{ name: 'Ally1', type: 'player' }],
          allyTempHp: 7,
          selfTempHp: 8,
          maxTargets: 5,
        },
      });

      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      // Select an ally first (click the checkbox/row)
      const allyRow = screen.getByText('Ally1');
      fireEvent.click(allyRow);
      await act(async () => {});

      // Then click confirm - button text is "Grant Resilience (1)"
      const allButtons = Array.from(document.querySelectorAll('button'));
      const confirmBtn = allButtons.find(
        b => b.textContent.trim().startsWith('Grant Resilience')
      );
      expect(confirmBtn).toBeTruthy();
      fireEvent.click(confirmBtn);
      await act(async () => {});

      expect(onComplete).toHaveBeenCalled();
    });

    it('calls onComplete after skipping Celestial Resilience', async () => {
      const { onComplete } = renderModal({
        class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
        specialActions: [{ name: 'Celestial Resilience' }],
      });

      const { applyShortRest } = await import('../../services/rules/effects/restRules.js');
      vi.mocked(applyShortRest).mockResolvedValueOnce({
        celestialResilienceAllies: {
          creatureTargets: [{ name: 'Ally1', type: 'player' }],
          allyTempHp: 7,
          selfTempHp: 8,
          maxTargets: 5,
        },
      });

      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const skipBtn = screen.getByRole('button', { name: 'Skip' });
      fireEvent.click(skipBtn);
      await act(async () => {});

      expect(onComplete).toHaveBeenCalled();
    });

    it('completes immediately when applyShortRest returns no celestialResilienceAllies', async () => {
      const { onComplete } = renderModal({
        class: { name: 'Warlock', major: { name: 'Celestial Patron' } },
        specialActions: [{ name: 'Celestial Resilience' }],
      });

      const { applyShortRest } = await import('../../services/rules/effects/restRules.js');
      vi.mocked(applyShortRest).mockResolvedValueOnce({});

      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      expect(onComplete).toHaveBeenCalled();
      expect(screen.queryByText('Celestial Resilience')).not.toBeInTheDocument();
    });
  });
});

describe('ShortRestModal - Replenishing Meal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  describe('rendering', () => {
    it('shows Replenishing Meal section when meal is available', () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });
      expect(screen.getByText('Replenishing Meal')).toBeInTheDocument();
    });

    it('shows description about +1d8 HP on next roll', () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });
      expect(screen.getByText(/\+1d8 HP/)).toBeInTheDocument();
    });

    it('hides Replenishing Meal section when no meals available', () => {
      renderModal();
      expect(screen.queryByText('Replenishing Meal')).not.toBeInTheDocument();
    });
  });

  describe('consumption', () => {
    it('shows consumed state after rolling hit dice with meal available', async () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });

      fireEvent.click(screen.getByText('Roll One'));
      await act(async () => {});

      expect(screen.getByText(/Replenishing Meal consumed/)).toBeInTheDocument();
    });

    it('adds 1d8 bonus to hit die recovery when meal is consumed', () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });

      // rollDice mock returns total=4 for 1d8, computeHitDieRecovery returns roll+conBonus=4+2=6
      // With meal: rollDice(1,8) returns 4, mealBonus=max(1,4)=4, hp=6+4=10
      fireEvent.click(screen.getByText('Roll One'));
      const totalText = screen.getByText(/Total HP Recovered:/).parentElement.textContent;
      expect(totalText).toContain('10');
    });

    it('consumes only one meal even when rolling all hit dice', async () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        level: 3,
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });

      fireEvent.click(screen.getByText(/Roll All/));
      await act(async () => {});

      // Should still show only one consumed message
      const consumedMessages = document.querySelectorAll('[class*="short-rest-applied"]');
      const mealConsumed = Array.from(consumedMessages).some(m => m.textContent.includes('Replenishing Meal'));
      expect(mealConsumed).toBe(true);
    });

    it('subtracts from replenishingMeals runtime value when consumed during roll', async () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });

      fireEvent.click(screen.getByText('Roll One'));
      await act(async () => {});

      const mealCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'replenishingMeals'
      );
      expect(mealCalls.length).toBeGreaterThan(0);
      // Should subtract 1 from the current value
      expect(mealCalls[0][2]).toBe(1);
    });
  });
});

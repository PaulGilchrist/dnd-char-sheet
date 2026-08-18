// @improved-by-ai
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
  default: () => <div>mock-creature-selection</div>,
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

function setupUseRuntimeValue(returns) {
  if (returns.replenishingMeals != null) {
    _useRuntimeValueResult = returns.replenishingMeals;
  } else {
    _useRuntimeValueResult = null;
  }
}

describe('ShortRestModal - Memorize Spell Swap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  describe('rendering', () => {
    it('shows swap button when memorize spell is available with prepared spells', () => {
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Prepared', level: 1 },
          ],
        },
      });
      expect(screen.getByText(/Swap Prepared Spell/)).toBeInTheDocument();
    });

    it('does not show memorize spell when no prepared spells', () => {
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [],
        },
      });
      expect(screen.queryByText(/Swap Prepared Spell/)).not.toBeInTheDocument();
    });
  });

  describe('swap mode', () => {
    it('enters swap mode when swap button is clicked', () => {
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Not Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      expect(screen.getByText(/Remove prepared spell:/)).toBeInTheDocument();
      expect(screen.getByText(/Add from spellbook:/)).toBeInTheDocument();
    });

    it('shows prepared spells in the remove dropdown after spellbook loads', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const removeSelect = screen.getByText(/Remove prepared spell:/).nextElementSibling;
      const options = removeSelect.querySelectorAll('option');
      const optionTexts = Array.from(options).map(o => o.textContent);
      expect(optionTexts).toContain('Fireball (level 3)');
      expect(optionTexts).toContain('Mage Armor (level 1)');
    });

    it('shows non-prepared spells in the add dropdown after spellbook loads', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
        { name: 'Shield', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Not Prepared', level: 1 },
            { name: 'Shield', prepared: 'Not Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const addSelect = screen.getByText(/Add from spellbook:/).nextElementSibling;
      const options = addSelect.querySelectorAll('option');
      const optionTexts = Array.from(options).map(o => o.textContent);
      expect(optionTexts).toContain('Mage Armor (level 1)');
      expect(optionTexts).toContain('Shield (level 1)');
    });

    it('does not show level 0 spells in dropdowns', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'True Strike', level: 0 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'True Strike', prepared: 'Not Prepared', level: 0 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const addSelect = screen.getByText(/Add from spellbook:/).nextElementSibling;
      const options = addSelect.querySelectorAll('option');
      const optionTexts = Array.from(options).map(o => o.textContent);
      expect(optionTexts).not.toContain('True Strike (level 0)');
    });

    it('has swap button disabled when no spells selected', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Not Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const swapBtn = screen.getByText(/Swap Spell/);
      expect(swapBtn).toBeDisabled();
    });

    it('exits swap mode and clears selections when cancel is clicked', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Not Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const swapBtn = screen.getByText(/Swap Spell/);
      const swapBtnParent = swapBtn.parentElement;
      const cancelBtn = swapBtnParent.querySelector('button:last-child');
      fireEvent.click(cancelBtn);
      await act(() => Promise.resolve());
      expect(screen.queryByText(/Remove prepared spell:/)).not.toBeInTheDocument();
      expect(screen.getByText(/Swap Prepared Spell/)).toBeInTheDocument();
    });

    it('calls setRuntimeValue with updated preparedSpells when swap is executed', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Not Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const removeSelect = screen.getByText(/Remove prepared spell:/).nextElementSibling;
      const addSelect = screen.getByText(/Add from spellbook:/).nextElementSibling;
      fireEvent.change(removeSelect, { target: { value: 'Fireball' } });
      fireEvent.change(addSelect, { target: { value: 'Mage Armor' } });
      await act(() => Promise.resolve());
      const swapBtn = screen.getByText(/Swap Spell/);
      fireEvent.click(swapBtn);
      await act(() => Promise.resolve());

      const preparedCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'preparedSpells'
      );
      expect(preparedCalls.length).toBeGreaterThan(0);
      expect(preparedCalls[0][2]).toEqual(['Mage Armor']);
    });

    it('does not call setRuntimeValue when swap is cancelled', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Not Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const swapBtn = screen.getByText(/Swap Spell/);
      const swapBtnParent = swapBtn.parentElement;
      const cancelBtn = swapBtnParent.querySelector('button:last-child');
      fireEvent.click(cancelBtn);
      await act(() => Promise.resolve());

      const preparedCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'preparedSpells'
      );
      expect(preparedCalls).toHaveLength(0);
    });

    it('does not show already-prepared spells in the add dropdown', async () => {
      const { loadSpellData } = await import('../../services/ui/dataLoader.js');
      vi.mocked(loadSpellData).mockResolvedValueOnce([
        { name: 'Fireball', level: 3 },
        { name: 'Mage Armor', level: 1 },
      ]);

      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared', level: 3 },
            { name: 'Mage Armor', prepared: 'Prepared', level: 1 },
          ],
        },
      });
      fireEvent.click(screen.getByText(/Swap Prepared Spell/));
      await act(() => Promise.resolve());
      const addSelect = screen.getByText(/Add from spellbook:/).nextElementSibling;
      const options = addSelect.querySelectorAll('option');
      // Only the default empty option should exist since Mage Armor is already prepared
      expect(options.length).toBe(1);
    });
  });
});

describe('ShortRestModal - Song of Rest with Combat Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('uses applyHealingToTarget result when combat context is available', async () => {
    const { applyHealingToTarget } = await import('../../services/rules/combat/applyHealing.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
    vi.mocked(getCombatContext).mockResolvedValueOnce({ creatures: [] });
    vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 5 });

    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(() => Promise.resolve());

    expect(applyHealingToTarget).toHaveBeenCalled();
  });

  it('adds actualHeal from applyHealingToTarget to recovered HP when combat context exists', async () => {
    const { applyHealingToTarget } = await import('../../services/rules/combat/applyHealing.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
    vi.mocked(getCombatContext).mockResolvedValueOnce({ creatures: [] });
    vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 8 });

    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(() => Promise.resolve());

    const totalEl = document.querySelector('.short-rest-total');
    expect(totalEl.textContent.trim()).toContain('8');
  });

  it('falls back to raw bonus when combat context is null', async () => {
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
    vi.mocked(getCombatContext).mockResolvedValueOnce(null);

    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(() => Promise.resolve());

    // Song of Rest button should be disabled after applying
    expect(screen.queryByText(/Apply Song of Rest/)).not.toBeInTheDocument();
  });
});

describe('ShortRestModal - Natural Recovery on Completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('shows Natural Recovery section when naturalRecoveryAvailable is true', () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 2 });
    renderModal({
      level: 10,
      class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
      automation: { passives: [{ type: 'natural_recovery' }] },
      spellAbilities: {
        spell_slots_level_1: 4,
        spells: [],
      },
    });
    expect(screen.getByText('Natural Recovery')).toBeInTheDocument();
  });

  it('logs Natural Recovery in log when slot selections were made', async () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 2, spell_slots_level_1: 2, spell_slots_level_2: 1 });
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
    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);
    await act(() => Promise.resolve());
    expect(screen.getByText(/Budget: 4 of 5 levels remaining/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(() => Promise.resolve());

    expect(screen.getByText(/Natural Recovery/)).toBeInTheDocument();
  });

  it('reflects multiple slot level selections in budget display', async () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 3, spell_slots_level_1: 2, spell_slots_level_2: 1 });
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
    const plusButtons = screen.getAllByRole('button', { name: '+' });
    // Select 1x level 1 (costs 1 budget)
    fireEvent.click(plusButtons[0]);
    await act(() => Promise.resolve());
    // Select 1x level 2 (costs 2 budget)
    fireEvent.click(plusButtons[1]);
    await act(() => Promise.resolve());
    // Total budget used: 1 + 2 = 3, remaining: 5 - 3 = 2
    expect(screen.getByText(/Budget: 2 of 5 levels remaining/)).toBeInTheDocument();
  });

  it('allows completing short rest without making Natural Recovery selections', async () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 2 });
    renderModal({
      level: 10,
      class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
      automation: { passives: [{ type: 'natural_recovery' }] },
      spellAbilities: {
        spell_slots_level_1: 4,
        spells: [],
      },
    });
    // NR section should be visible
    expect(screen.getByText('Natural Recovery')).toBeInTheDocument();
    // Budget should show full amount
    expect(screen.getByText(/Budget: 5 of 5 levels remaining/)).toBeInTheDocument();
    // Completing without selections should not error
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(() => Promise.resolve());
    expect(screen.getByText('Short Rest')).toBeInTheDocument();
  });
});

describe('ShortRestModal - Replenishing Meal Runtime Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('subtracts 1 from replenishingMeals on completion when meal was consumed', async () => {
    setupUseRuntimeValue({ replenishingMeals: 2 });
    renderModal({
      automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
    });
    fireEvent.click(screen.getByText('Roll One'));
    await act(() => Promise.resolve());
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(() => Promise.resolve());

    const mealCalls = setRuntimeValueMock.mock.calls.filter(
      (call) => call[1] === 'replenishingMeals'
    );
    expect(mealCalls.length).toBeGreaterThan(1);
  });
});

describe('ShortRestModal - Hit Die Recovery Minimum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('displays correct HP recovered from rolling hit dice', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Roll One'));
    await act(() => Promise.resolve());

    // Default mock: rollDice(1,8) returns 4, computeHitDieRecovery(4, 2) returns 6
    const totalEl = document.querySelector('.short-rest-total');
    expect(totalEl.textContent.trim()).toContain('6');
  });
});

describe('ShortRestModal - Multiple Roll Accumulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('accumulates HP correctly across multiple single rolls', async () => {
    renderModal();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Roll One'));
      await act(() => Promise.resolve());
    }
    // Each roll: rollDice(1,8) returns 4, computeHitDieRecovery(4,2) returns 6
    // 3 rolls = 18 HP total
    const totalEl = document.querySelector('.short-rest-total');
    expect(totalEl.textContent.trim()).toContain('18');
  });

  it('shows individual roll entries in the log table', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Roll One'));
    await act(() => Promise.resolve());
    fireEvent.click(screen.getByText('Roll One'));
    await act(() => Promise.resolve());

    const rows = document.querySelectorAll('table tbody tr');
    expect(rows.length).toBe(2);
  });

  it('marks Song of Rest entries with a special row style', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(() => Promise.resolve());

    const songRows = document.querySelectorAll('tr.short-rest-song-row');
    expect(songRows.length).toBe(1);
  });
});

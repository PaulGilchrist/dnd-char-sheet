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
    vi.resetAllMocks();
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
      await act(async () => {});
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
      await act(async () => {});
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
      await act(async () => {});
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
      await act(async () => {});
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
      await act(async () => {});
      // After entering swap mode, the swap section has Swap Spell + Cancel buttons
      // Find the Swap Spell button and get its sibling cancel button
      const swapBtn = screen.getByText(/Swap Spell/);
      const swapBtnParent = swapBtn.parentElement;
      const cancelBtn = swapBtnParent.querySelector('button:last-child');
      fireEvent.click(cancelBtn);
      await act(async () => {});
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
      await act(async () => {});
      const removeSelect = screen.getByText(/Remove prepared spell:/).nextElementSibling;
      const addSelect = screen.getByText(/Add from spellbook:/).nextElementSibling;
      fireEvent.change(removeSelect, { target: { value: 'Fireball' } });
      fireEvent.change(addSelect, { target: { value: 'Mage Armor' } });
      await act(async () => {});
      const swapBtn = screen.getByText(/Swap Spell/);
      fireEvent.click(swapBtn);
      await act(async () => {});
      const preparedCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'preparedSpells'
      );
      expect(preparedCalls.length).toBeGreaterThan(0);
      expect(preparedCalls[0][2]).toEqual(['Mage Armor']);
    });

    it('does not add spell if already prepared', async () => {
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
      await act(async () => {});
      const addSelect = screen.getByText(/Add from spellbook:/).nextElementSibling;
      const options = addSelect.querySelectorAll('option');
      // Only the default empty option should exist since Mage Armor is already prepared
      expect(options.length).toBe(1);
    });
  });
});

describe('ShortRestModal - Song of Rest with Combat Context', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
    await act(async () => {});

    expect(applyHealingToTarget).toHaveBeenCalled();
  });

  it('adds actualHeal from applyHealingToTarget to recovered HP', async () => {
    const { applyHealingToTarget } = await import('../../services/rules/combat/applyHealing.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
    vi.mocked(getCombatContext).mockResolvedValueOnce({ creatures: [] });
    vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 8 });

    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(async () => {});

    const totalText = screen.getByText(/Total HP Recovered:/).parentElement.textContent;
    expect(totalText).toContain('8');
  });

  it('falls back to raw bonus when combat context is null', async () => {
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
    vi.mocked(getCombatContext).mockResolvedValueOnce(null);

    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(async () => {});

    // Should still apply the song of rest bonus
    expect(screen.queryByText(/Apply Song of Rest/)).not.toBeInTheDocument();
  });
});

describe('ShortRestModal - Natural Recovery on Completion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('logs Natural Recovery in log when slot selections were made', async () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 2, spell_slots_level_1: 2, spell_slots_level_2: 1 });
    const { addEntry } = await import('../../services/ui/logService.js');
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
    fireEvent.click(plusBtn);
    await act(async () => {});
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(async () => {});

    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.message).toContain('Natural Recovery');
  });

  it('logs Natural Recovery with slot level details in log', async () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 3, spell_slots_level_1: 2, spell_slots_level_2: 1 });
    const { addEntry } = await import('../../services/ui/logService.js');
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
    fireEvent.click(plusBtn);
    await act(async () => {});
    const secondControl = controls[1];
    const plusBtn2 = secondControl.querySelector('button:last-child');
    fireEvent.click(plusBtn2);
    await act(async () => {});
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(async () => {});

    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.message).toContain('Natural Recovery');
    expect(logCall.message).toContain('level 1');
    expect(logCall.message).toContain('level 2');
  });

  it('does not log Natural Recovery when no selections were made', async () => {
    setupGetRuntimeValue({ naturalRecoverySlots: 2 });
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({
      level: 10,
      class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
      automation: { passives: [{ type: 'natural_recovery' }] },
      spellAbilities: {
        spell_slots_level_1: 4,
        spells: [],
      },
    });
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(async () => {});

    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.message).not.toContain('Natural Recovery');
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
});

describe('ShortRestModal - Replenishing Meal Runtime Reset', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('subtracts 1 from replenishingMeals on completion when meal was consumed', async () => {
    setupUseRuntimeValue({ replenishingMeals: 2 });
    renderModal({
      automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
    });
    fireEvent.click(screen.getByText('Roll One'));
    await act(async () => {});
    fireEvent.click(screen.getByText('Complete Short Rest'));
    await act(async () => {});

    const mealCalls = setRuntimeValueMock.mock.calls.filter(
      (call) => call[1] === 'replenishingMeals'
    );
    // Should have at least 2 calls: one during roll, one during completion
    expect(mealCalls.length).toBeGreaterThan(1);
  });
});

describe('ShortRestModal - Hit Die Recovery Minimum', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('enforces minimum 1 HP recovery per hit die', async () => {
    const { computeHitDieRecovery } = await import('../../services/rules/effects/restRules.js');
    vi.mocked(computeHitDieRecovery).mockReturnValue(1);
    renderModal();
    fireEvent.click(screen.getByText('Roll One'));
    await act(async () => {});

    const totalText = screen.getByText(/Total HP Recovered:/).parentElement.textContent;
    expect(totalText).toContain('1');
  });
});

describe('ShortRestModal - Multiple Roll Accumulation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  it('accumulates HP correctly across multiple single rolls', async () => {
    renderModal();
    // Roll 3 times
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Roll One'));
      await act(async () => {});
    }
    // Each roll: rollDice(1,8) returns 4, conBonus=2, hp=6
    // 3 rolls = 18 HP total
    const totalText = screen.getByText(/Total HP Recovered:/).parentElement.textContent;
    expect(totalText).toContain('18');
  });

  it('shows individual roll entries in the log table', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Roll One'));
    await act(async () => {});
    fireEvent.click(screen.getByText('Roll One'));
    await act(async () => {});

    const rows = document.querySelectorAll('.short-rest-roll-log tbody tr');
    expect(rows.length).toBe(2);
  });

  it('marks Song of Rest entries with the special class', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Apply Song of Rest/));
    await act(async () => {});

    const songRows = document.querySelectorAll('.short-rest-song-row');
    expect(songRows.length).toBe(1);
  });
});

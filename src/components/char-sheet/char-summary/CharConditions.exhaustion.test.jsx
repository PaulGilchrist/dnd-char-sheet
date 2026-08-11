import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharConditions from './CharConditions.jsx';

let runtimeValues = {};

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((name, key, _campaignName) => {
    const storageKey = `${name}::${key}`;
    if (key === 'activeConditionMeta') {
      return runtimeValues[storageKey] ?? runtimeValues[key] ?? null;
    }
    return runtimeValues[storageKey] ?? runtimeValues[key] ?? null;
  }),
  setRuntimeValue: vi.fn((name, key, value, _campaignName) => {
    runtimeValues[`${name}::${key}`] = value;
  }),
  addStorageChangeListener: vi.fn(() => () => {}),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 15),
}));

vi.mock('../../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilityLabel: vi.fn((abbr) => abbr || 'None'),
  getAbilitySaveBonus: vi.fn(() => 2),
}));

vi.mock('../../../services/combat/conditions/exhaustionRules.js', () => ({
  EXHAUSTION_LEVELS: 6,
  isDeadFromExhaustion: vi.fn((level) => level >= 6),
  getExhaustionSaveDC: vi.fn((level) => 10 + level),
}));

const mockSetPopupHtml = vi.fn();

vi.mock('../../../hooks/combat/usePopup.js', () => ({
  default: vi.fn(() => ({
    popupHtml: null,
    setPopupHtml: mockSetPopupHtml,
  })),
}));

vi.mock('../../common/Popup.jsx', () => ({
  default: vi.fn(({ children }) => (
    <div data-testid="popup">{children}</div>
  )),
}));

vi.mock('../DiceRollResult.jsx', () => ({
  default: vi.fn(({ type: _type, rollType, name, rolls, bonus, bonusDetail: _bonusDetail, total, dc, success, forcedMode: _forcedMode }) => (
    <div data-testid="dice-roll-result">
      <span data-testid="roll-type">{rollType}</span>
      <span data-testid="roll-name">{name}</span>
      <span data-testid="roll-value">{rolls?.join(', ')}</span>
      <span data-testid="roll-bonus">{bonus}</span>
      <span data-testid="roll-total">{total}</span>
      <span data-testid="roll-dc">{dc}</span>
      <span data-testid="roll-success">{String(success)}</span>
    </div>
  )),
}));

vi.mock('../../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/encounters/combatLoggingService.js', () => ({
  logConditionSave: vi.fn(() => Promise.resolve()),
  logConcentrationSave: vi.fn(() => Promise.resolve()),
}));

let mockCombatSummary = null;

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => mockCombatSummary),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfPurityHandler.js', () => ({
  isAuraOfPurityActive: vi.fn(() => false),
  getAuraOfPuritySaveAdvantageConditions: vi.fn(() => []),
}));

import { rollD20 } from '../../../services/dice/diceRoller.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';

describe('CharConditions exhaustion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeValues = {};
    mockCombatSummary = null;
    rollD20.mockReturnValue(15);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: vi.fn() }));
  });

  const mockPlayerStats = {
    name: 'Test Character',
    abilities: [
      { name: 'Constitution', bonus: 2, save: 3 },
      { name: 'Wisdom', bonus: 1, save: 2 },
    ],
  };

  const defaultProps = {
    playerStats: mockPlayerStats,
    campaignName: 'test-campaign',
    activeMapName: 'test-map',
    characters: [],
    exhaustionLevel: 0,
    onConditionsChange: vi.fn(),
    conditionEffects: {},
  };

  describe('exhaustion save logging', () => {
    it('calls addEntry with exhaustion save data on minus click', async () => {
      const { addEntry } = await import('../../../services/ui/logService.js');
      addEntry.mockResolvedValue();

      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'roll',
            characterName: 'Test Character',
            rollType: 'save',
            name: 'Constitution Save (Exhaustion)',
            condition: 'Exhaustion',
          })
        );
      });
    });

    it('does not call addEntry when plus clicked (no save needed)', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);

      expect(vi.mocked(addEntry)).not.toHaveBeenCalled();
    });
  });

  describe('exhaustion decrement with failed save', () => {
    it('does not decrease exhaustion when con save fails (low roll)', () => {
      rollD20.mockReturnValueOnce(1);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      // Total = 1 (roll) + 2 (con bonus) = 3, DC = 13, fail
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        2,
        'test-campaign'
      );
    });

    it('does not decrease exhaustion when con save fails (exact DC)', () => {
      rollD20.mockReturnValueOnce(8);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      // Total = 8 + 2 = 10, DC = 13, fail
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        2,
        'test-campaign'
      );
    });

    it('decreases exhaustion when con save succeeds', () => {
      rollD20.mockReturnValueOnce(11);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      // Total = 11 + 2 = 13, DC = 13, success
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        2,
        'test-campaign'
      );
    });
  });

  describe('exhaustion increment edge cases', () => {
    it('caps at EXHAUSTION_LEVELS (6) when incrementing from 6', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      expect(plusBtn).toBeDisabled();
      fireEvent.click(plusBtn);
      // Button is disabled at max level, so setRuntimeValue should not be called
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        expect.any(Number),
        'test-campaign'
      );
    });

    it('increments from 4 to 5', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={4} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'exhaustionLevel', 5, 'test-campaign');
    });
  });

  describe('exhaustion save DC calculation', () => {
    it('uses correct DC formula (10 + exhaustionLevel) for exhaustion save', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          dc: 13,
        })
      );
    });

    it('uses correct DC for exhaustion level 1', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          dc: 11,
        })
      );
    });

    it('uses correct DC for exhaustion level 5', () => {
      rollD20.mockReturnValueOnce(1);
      render(<CharConditions {...defaultProps} exhaustionLevel={5} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          dc: 15,
        })
      );
    });
  });

  describe('exhaustion popup rollType', () => {
    it('shows rollType as "save" for exhaustion popup', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          rollType: 'save',
        })
      );
    });

    it('exhaustion popup name includes DC', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Constitution (DC 13)',
        })
      );
    });
  });
});

// @improved-by-ai
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

import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { rollD20 } from '../../../services/dice/diceRoller.js';
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

  describe('exhaustion decrement (minus button)', () => {
    it('renders nothing when exhaustion is at 0', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={0} />);
      expect(screen.queryByText('Exhaustion (0)')).not.toBeInTheDocument();
      expect(screen.queryByText('Exhaustion')).not.toBeInTheDocument();
      expect(rollD20).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('calls addEntry with exhaustion save data on minus click', async () => {
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

    it('does not trigger a save roll when plus clicked (no save needed)', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);

      expect(rollD20).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('decreases exhaustion by 1 when con save succeeds', () => {
      rollD20.mockReturnValueOnce(11);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        2,
        'test-campaign'
      );
    });

    it('does not decrease exhaustion when con save fails (low roll)', () => {
      rollD20.mockReturnValueOnce(1);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

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

      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        2,
        'test-campaign'
      );
    });

    it('decreases exhaustion from 1 to 0 on successful save', () => {
      rollD20.mockReturnValueOnce(10);
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        0,
        'test-campaign'
      );
    });
  });

  describe('exhaustion increment (plus button)', () => {
    it('increments from 1 to 2', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'exhaustionLevel', 2, 'test-campaign');
    });

    it('increments from 4 to 5', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={4} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'exhaustionLevel', 5, 'test-campaign');
    });

    it('caps at EXHAUSTION_LEVELS (6) when incrementing from 6', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      expect(plusBtn).toBeDisabled();
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        expect.any(Number),
        'test-campaign'
      );
    });

    it('caps at EXHAUSTION_LEVELS (6) when incrementing from 5', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={5} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'exhaustionLevel', 6, 'test-campaign');
    });
  });

  describe('exhaustion save DC calculation', () => {
    it('uses correct DC formula (10 + exhaustionLevel) for exhaustion level 1', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          dc: 11,
        })
      );
    });

    it('uses correct DC formula (10 + exhaustionLevel) for exhaustion level 3', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          dc: 13,
        })
      );
    });

    it('uses correct DC formula (10 + exhaustionLevel) for exhaustion level 5', () => {
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

    it('uses correct DC formula (10 + exhaustionLevel) for exhaustion level 6', () => {
      rollD20.mockReturnValueOnce(1);
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          dc: 16,
        })
      );
    });
  });

  describe('exhaustion popup content', () => {
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

    it('exhaustion popup includes the d20 roll value', () => {
      rollD20.mockReturnValueOnce(7);
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          rolls: [7],
        })
      );
    });

    it('exhaustion popup includes the con save bonus', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          bonus: 2,
        })
      );
    });

    it('exhaustion popup marks success when total >= DC', () => {
      rollD20.mockReturnValueOnce(11);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('exhaustion popup marks failure when total < DC', () => {
      rollD20.mockReturnValueOnce(5);
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });
});

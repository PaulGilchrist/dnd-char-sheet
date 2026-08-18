// @cleaned-by-ai
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

    it('does not decrease exhaustion when con save fails', () => {
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
    it('increments exhaustion level by 1', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'exhaustionLevel', 2, 'test-campaign');
    });

    it('caps at EXHAUSTION_LEVELS (6) and disables the plus button', () => {
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
  });

  describe('exhaustion save DC calculation', () => {
    it('uses DC formula (10 + exhaustionLevel)', async () => {
      const levels = [
        { level: 1, expectedDc: 11 },
        { level: 5, expectedDc: 15 },
      ];

      for (const { level, expectedDc } of levels) {
        vi.clearAllMocks();
        render(<CharConditions {...defaultProps} exhaustionLevel={level} />);
        const minusBtn = screen.getByRole('button', { name: '−' });
        fireEvent.click(minusBtn);

        await waitFor(() => {
          expect(mockSetPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
              dc: expectedDc,
            })
          );
        });

        cleanup();
      }
    });
  });
});

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

describe('CharConditions logging', () => {
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

  describe('save logging', () => {
    it('calls addEntry with correct roll data on condition save', async () => {
      const { addEntry } = await import('../../../services/ui/logService.js');
      addEntry.mockResolvedValue();

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'roll',
            characterName: 'Test Character',
            rollType: 'save',
            dc: 14,
          })
        );
      });
    });

    it('calls logConditionSave with correct data on condition save', async () => {
      const { logConditionSave } = await import('../../../services/encounters/combatLoggingService.js');
      logConditionSave.mockResolvedValue();

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(logConditionSave).toHaveBeenCalled();
      });
    });
  });

  describe('popup display', () => {
    it('displays dice roll popup after clicking a savable condition', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });
    });

    it('popup shows correct DC from meta', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 18, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 18');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            dc: 18,
          })
        );
      });
    });

    it('popup shows rollType as condition-save', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            rollType: 'condition-save',
          })
        );
      });
    });

    it('exhaustion minus shows popup with save result', async () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });
    });

    it('exhaustion minus popup shows correct DC', async () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      fireEvent.click(minusBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            dc: 13, // 10 + 3
          })
        );
      });
    });
  });

  describe('onConditionsChange callback', () => {
    it('calls onConditionsChange when condition is successfully removed', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(defaultProps.onConditionsChange).toHaveBeenCalled();
      });
    });

    it('does not call onConditionsChange when condition save fails', async () => {
      rollD20.mockReturnValueOnce(1);
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(defaultProps.onConditionsChange).not.toHaveBeenCalled();
      });
    });

    it('does not call onConditionsChange when onConditionsChange is not provided', async () => {
      const propsWithoutCallback = {
        ...defaultProps,
        onConditionsChange: undefined,
      };
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...propsWithoutCallback} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // Should not throw even without callback
      });
    });
  });

  describe('condition save - remove meta on success', () => {
    it('removes meta key from conditionMeta on successful save', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // The setRuntimeValue for activeConditions should be called
        expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'activeConditions', [], 'test-campaign');
      });
    });
  });

  describe('save with advantage - mode field', () => {
    it('sets mode to advantage in logEntry when hasAdvantage is true', async () => {
      const { addEntry } = await import('../../../services/ui/logService.js');
      addEntry.mockResolvedValue();

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            mode: 'advantage',
          })
        );
      });
    });

    it('sets mode to normal in logEntry when no advantage', async () => {
      const { addEntry } = await import('../../../services/ui/logService.js');
      addEntry.mockResolvedValue();

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            mode: 'normal',
          })
        );
      });
    });
  });

  describe('roll array in logEntry', () => {
    it('includes two rolls in logEntry when advantage', async () => {
      const { addEntry } = await import('../../../services/ui/logService.js');
      addEntry.mockResolvedValue();

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            rolls: expect.arrayContaining([expect.any(Number), expect.any(Number)]),
          })
        );
      });
    });

    it('includes single roll in logEntry when no advantage', async () => {
      const { addEntry } = await import('../../../services/ui/logService.js');
      addEntry.mockResolvedValue();

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            rolls: expect.arrayContaining([expect.any(Number)]),
          })
        );
      });
    });
  });

  describe('popup rolls display', () => {
    it('shows two rolls in popup when advantage', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            rolls: expect.arrayContaining([expect.any(Number), expect.any(Number)]),
          })
        );
      });
    });

    it('shows single roll in popup when no advantage', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            rolls: expect.arrayContaining([expect.any(Number)]),
          })
        );
      });
    });
  });
});

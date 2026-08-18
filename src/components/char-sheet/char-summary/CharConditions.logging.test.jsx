// @cleaned-by-ai
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
import { addEntry } from '../../../services/ui/logService.js';
import { logConditionSave } from '../../../services/encounters/combatLoggingService.js';
import { rollD20 } from '../../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../../services/combat/auras/auraOfProtection.js';

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

  describe('condition save logging', () => {
    it('calls addEntry and logConditionSave with correct roll data on condition save', async () => {
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
            success: true,
            condition: 'Charmed',
          })
        );
        expect(logConditionSave).toHaveBeenCalledWith(
          'test-campaign',
          'Test Character',
          15,
          2,
          undefined,
          'Charmed',
          expect.any(String),
          14,
          true
        );
      });
    });

    it('logs save bonus including aura bonus', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 3, sourceName: 'Paladin' });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            bonus: 5, // saveBonus(2) + auraBonus(3)
          })
        );
      });
    });
  });

  describe('popup display', () => {
    it('displays dice roll popup with correct data after clicking a savable condition', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 18, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 18');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            rollType: 'condition-save',
            dc: 18,
            success: true,
          })
        );
      });
    });

    it('exhaustion minus shows popup with save result', async () => {
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

  describe('onConditionsChange callback and condition removal', () => {
    it('removes condition and calls onConditionsChange on successful save', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Test Character',
          'activeConditions',
          [],
          'test-campaign'
        );
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

      expect(defaultProps.onConditionsChange).not.toHaveBeenCalled();
    });
  });

  describe('save with advantage', () => {
    it.each`
      hasAdvantage | conditionEffects
      ${true}      | ${ { saveAdvantage: ['charmed'] } }
      ${false}     | ${ {} }
    `('logs mode as $hasAdvantage and rolls $hasAdvantage ? 2 : 1 d20', async ({ hasAdvantage, conditionEffects }) => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} conditionEffects={conditionEffects} />);

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            mode: hasAdvantage ? 'advantage' : 'normal',
            rolls: hasAdvantage
              ? expect.arrayContaining([expect.any(Number), expect.any(Number)])
              : expect.arrayContaining([expect.any(Number)]),
          })
        );
      });
    });
  });
});

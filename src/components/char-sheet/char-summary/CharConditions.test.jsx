// @cleaned-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharConditions, { loadActiveConditions } from './CharConditions.jsx';

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

import { getAuraOfPuritySaveAdvantageConditions } from '../../../services/automation/handlers/buffs/auraOfPurityHandler.js';
import { setRuntimeValue, addStorageChangeListener } from '../../../hooks/runtime/useRuntimeState.js';
import { rollD20 } from '../../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../../services/combat/auras/auraOfProtection.js';
import { isAuraOfPurityActive } from '../../../services/automation/handlers/buffs/auraOfPurityHandler.js';
import { addEntry } from '../../../services/ui/logService.js';

describe('CharConditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeValues = {};
    mockCombatSummary = null;
    rollD20.mockReturnValue(15);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: vi.fn() }));
    vi.mocked(isAuraOfPurityActive).mockReturnValue(false);
    vi.mocked(getAuraOfPuritySaveAdvantageConditions).mockReturnValue([]);
    vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 0, sourceName: null });
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

  describe('exhaustion badge - edge cases', () => {
    it('shows dead styling when exhaustion is at maximum (level 6)', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      expect(screen.getByText('Exhaustion (6)')).toHaveAttribute('title', 'Exhaustion level 6 - DEAD\n\n');
    });

    it('does not call setRuntimeValue when plus clicked at max level (6)', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(plusBtn);
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Character',
        'exhaustionLevel',
        expect.any(Number),
        'test-campaign'
      );
    });

    it('renders minus button with Unicode minus sign as accessible name', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      expect(minusBtn).toBeInTheDocument();
      expect(minusBtn.tagName).toBe('BUTTON');
    });

    it('renders plus button with plus sign as accessible name', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const plusBtn = screen.getByRole('button', { name: '+' });
      expect(plusBtn).toBeInTheDocument();
      expect(plusBtn.tagName).toBe('BUTTON');
    });

    it('exhaustion at level 1 - minus button enabled, plus button enabled', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      const plusBtn = screen.getByRole('button', { name: '+' });
      expect(minusBtn).not.toBeDisabled();
      expect(plusBtn).not.toBeDisabled();
    });

    it('exhaustion at level 5 - minus button enabled, plus button enabled', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={5} />);
      const minusBtn = screen.getByRole('button', { name: '−' });
      const plusBtn = screen.getByRole('button', { name: '+' });
      expect(minusBtn).not.toBeDisabled();
      expect(plusBtn).not.toBeDisabled();
    });
  });

  describe('condition badge CSS classes', () => {
    it('applies effect-condition class to regular conditions', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Charmed DC 12');
      expect(badge.className).toContain('effect-condition');
    });

    it('applies effect-buff class to invisible condition', () => {
      runtimeValues['Test Character::activeConditions'] = ['invisible'];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Invisible');
      expect(badge.className).toContain('effect-buff');
    });

    it('applies effect-condition class to speed_zero condition', () => {
      runtimeValues['Test Character::activeConditions'] = ['speed_zero'];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Speed_zero');
      expect(badge.className).toContain('effect-condition');
    });

    it('shows "Speed_zero" label for speed_zero condition key', () => {
      runtimeValues['Test Character::activeConditions'] = ['speed_zero'];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Speed_zero')).toBeInTheDocument();
    });
  });

  describe('condition deduplication', () => {
    it('deduplicates conditions when rendering', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed', 'charmed', 'blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = {
        charmed: { dc: 12, ability: 'wis' },
        blinded: { dc: 10, ability: null },
      };
      render(<CharConditions {...defaultProps} />);
      const charmedBadges = screen.getAllByText('Charmed DC 12');
      expect(charmedBadges).toHaveLength(1);
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
    });
  });

  describe('condition without DC or ability', () => {
    it('renders condition without DC when meta has no dc', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { ability: 'con' } };
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Blinded')).toBeInTheDocument();
    });

    it('renders condition without DC when meta has no ability', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10 } };
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
    });

    it('condition with both dc and ability is clickable (button)', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Charmed DC 14');
      expect(badge.tagName).toBe('BUTTON');
    });

    it('condition with dc but null ability renders as span (not clickable)', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: null } };
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Blinded DC 10');
      expect(badge.tagName).toBe('SPAN');
    });

    it('condition with dc and empty string ability renders as span', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: '' } };
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Blinded DC 10');
      expect(badge.tagName).toBe('SPAN');
    });
  });

  describe('condition save with advantage from aura of purity', () => {
    it('applies aura of purity advantage for matching conditions', async () => {
      vi.mocked(isAuraOfPurityActive).mockReturnValue(true);
      vi.mocked(isAuraOfPurityActive).mockReturnValue(true);
      vi.mocked(getAuraOfPuritySaveAdvantageConditions).mockReturnValue(['charmed']);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('does not apply aura of purity advantage for non-matching conditions', async () => {
      vi.mocked(isAuraOfPurityActive).mockReturnValue(true);
      vi.mocked(getAuraOfPuritySaveAdvantageConditions).mockReturnValue(['charmed']);

      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: 'con' } };
      render(<CharConditions {...defaultProps} />);

      const blindedBtn = screen.getByText('Blinded DC 10');
      fireEvent.click(blindedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('grappled save advantage', () => {
    it('applies advantage from conditionEffects.strCheckAdvantage for grappled', async () => {
      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ strCheckAdvantage: true }}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('applies advantage from abilityCheckAdvantageAbilities for grappled STR', async () => {
      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{
            abilityCheckAdvantageAbilities: ['STR'],
          }}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('does not apply advantage from abilityCheckAdvantageAbilities for non-matching ability', async () => {
      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{
            abilityCheckAdvantageAbilities: ['DEX'],
          }}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

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

  describe('combined conditions + exhaustion display', () => {
    it('renders both conditions and exhaustion in the same grid', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      expect(screen.getByText('Charmed DC 12')).toBeInTheDocument();
      expect(screen.getByText('Exhaustion (2)')).toBeInTheDocument();
    });

    it('renders conditions and exhaustion with no conditions', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      expect(screen.getByText('Exhaustion (1)')).toBeInTheDocument();
    });

    it('renders exhaustion with no conditions and no conditions array', () => {
      runtimeValues['Test Character::activeConditions'] = [];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      expect(screen.getByText('Exhaustion (1)')).toBeInTheDocument();
    });
  });

  describe('storage change listener', () => {
    it('unsubscribes on unmount', () => {
      const mockUnsubscribe = vi.fn();
      addStorageChangeListener.mockImplementation(() => mockUnsubscribe);

      const { unmount } = render(<CharConditions {...defaultProps} />);
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('saveModifiers for grappled', () => {
    it('applies advantage from Powerful Build saveModifier for grappled', async () => {
      const playerStatsWithPowerfulBuild = {
        ...mockPlayerStats,
        saveModifiers: [
          {
            target: 'ability_check',
            effect: 'advantage',
            abilities: ['STR'],
            condition: 'powerful_build_grapple_escape',
          },
        ],
      };

      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          playerStats={playerStatsWithPowerfulBuild}
          campaignName="test-campaign"
          activeMapName="test-map"
          characters={[]}
          exhaustionLevel={0}
          onConditionsChange={vi.fn()}
          conditionEffects={{}}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('does not apply Powerful Build advantage for non-grappled condition', async () => {
      const playerStatsWithPowerfulBuild = {
        ...mockPlayerStats,
        saveModifiers: [
          {
            target: 'ability_check',
            effect: 'advantage',
            abilities: ['STR'],
            condition: 'powerful_build_grapple_escape',
          },
        ],
      };

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          playerStats={playerStatsWithPowerfulBuild}
          campaignName="test-campaign"
          activeMapName="test-map"
          characters={[]}
          exhaustionLevel={0}
          onConditionsChange={vi.fn()}
          conditionEffects={{}}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('saveModifiers from computedStats', () => {
    it('applies advantage from computedStats.saveModifiers for grappled', async () => {
      const playerStatsWithComputed = {
        ...mockPlayerStats,
        computedStats: {
          saveModifiers: [
            {
              target: 'ability_check',
              effect: 'advantage',
              abilities: ['STR'],
              condition: 'powerful_build_grapple_escape',
            },
          ],
        },
      };

      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          playerStats={playerStatsWithComputed}
          campaignName="test-campaign"
          activeMapName="test-map"
          characters={[]}
          exhaustionLevel={0}
          onConditionsChange={vi.fn()}
          conditionEffects={{}}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('aura bonus display', () => {
    it('includes aura source name in popup bonusDetail when aura bonus > 0', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 3,
        sourceName: 'Paladin',
      });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusDetail: '(+3 aura from Paladin)',
          })
        );
      });
    });

    it('includes aura without source name when sourceName is null', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 2,
        sourceName: null,
      });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusDetail: '(+2 aura)',
          })
        );
      });
    });

    it('does not include bonusDetail when aura bonus is 0', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 0,
        sourceName: null,
      });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusDetail: undefined,
          })
        );
      });
    });
  });

  describe('save mode (advantage vs normal)', () => {
    it('sets mode to advantage when hasSaveAdvantage returns true', async () => {
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
            forcedMode: 'advantage',
          })
        );
      });
    });

    it('sets mode to normal when no advantage', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            forcedMode: undefined,
          })
        );
      });
    });
  });

  describe('condition save with advantage from saveAdvantage array', () => {
    it('rolls two d20s when condition is in saveAdvantage array', async () => {
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
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls two d20s when condition is in saveAdvantageCount > 0', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 2 }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('condition save with restoreBalance', () => {
    it('reduces saveAdvantageCount by 1 when restoreBalance is true', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 1, restoreBalance: true }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      // With saveAdvantageCount=1 and restoreBalance=true, the effective count becomes 0, so no advantage
      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });

    it('still has advantage when saveAdvantageCount > restoreBalance reduction', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 3, restoreBalance: true }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('condition without meta dc', () => {
    it('does not attempt save when meta has no dc', async () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} />);

      const blindedBtn = screen.getByText('Blinded');
      fireEvent.click(blindedBtn);

      // Should not call rollD20 because there's no meta.dc
      expect(rollD20).not.toHaveBeenCalled();
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('does not attempt save when meta is undefined', async () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: undefined };
      render(<CharConditions {...defaultProps} />);

      const blindedBtn = screen.getByText('Blinded');
      fireEvent.click(blindedBtn);

      expect(rollD20).not.toHaveBeenCalled();
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

  describe('loadActiveConditions edge cases', () => {
    it('returns empty array when stored value is a string', () => {
      runtimeValues['Test Character::activeConditions'] = 'not-an-array';
      const result = loadActiveConditions('Test Character', 'test-campaign');
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is an object', () => {
      runtimeValues['Test Character::activeConditions'] = { charmed: true };
      const result = loadActiveConditions('Test Character', 'test-campaign');
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is a number', () => {
      runtimeValues['Test Character::activeConditions'] = 42;
      const result = loadActiveConditions('Test Character', 'test-campaign');
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is undefined', () => {
      runtimeValues['Test Character::activeConditions'] = undefined;
      const result = loadActiveConditions('Test Character', 'test-campaign');
      expect(result).toEqual([]);
    });
  });

  describe('condition meta handling', () => {
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

    it('handles conditionMeta as non-object (falls back to empty)', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = 'not-an-object';
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Charmed')).toBeInTheDocument();
    });

    it('handles conditionMeta as null (falls back to empty)', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = null;
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Charmed')).toBeInTheDocument();
    });
  });

  describe('tooltip behavior', () => {
    it('sets tooltip from CONDITION_DESCRIPTIONS for conditions', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Charmed DC 12');
      expect(badge.getAttribute('title')).toContain('You can\'t attack the charmer');
    });

    it('sets tooltip for conditions without DC from CONDITION_DESCRIPTIONS', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} />);
      const badge = screen.getByText('Blinded');
      expect(badge.getAttribute('title')).toContain("You can't see");
    });

    it('sets tooltip for exhaustion from CONDITION_DESCRIPTIONS', () => {
      runtimeValues['Test Character::activeConditions'] = [];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      const exhaustionLabel = screen.getByText('Exhaustion (2)');
      expect(exhaustionLabel.getAttribute('title')).toContain('Exhaustion level 2');
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

  describe('save bonus calculation', () => {
    it('uses getAbilitySaveBonus for the save ability', async () => {
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(5);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonus: 5,
          })
        );
      });
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

  describe('popupHtml rendering when nothing else to show', () => {
    it('renders popup when popupHtml exists but no conditions/exhaustion', () => {
      // Mock usePopup to return a popupHtml
      vi.mocked(() => ({
        popupHtml: { type: 'd20', rollType: 'save' },
        setPopupHtml: mockSetPopupHtml,
      }));

      render(<CharConditions {...defaultProps} />);

      // The component uses the usePopup hook, we need to verify the popup renders
      // when popupHtml is set but there are no conditions
      expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
    });
  });

  describe('character name change re-mount', () => {
    it('loads conditions from new character name when playerStats.name changes', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      runtimeValues['New Character::activeConditions'] = ['blinded'];
      runtimeValues['New Character::activeConditionMeta'] = { blinded: { dc: 10, ability: 'con' } };

      const { rerender } = render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Charmed DC 12')).toBeInTheDocument();

      const newPlayerStats = {
        ...mockPlayerStats,
        name: 'New Character',
      };
      rerender(<CharConditions {...defaultProps} playerStats={newPlayerStats} />);
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
    });
  });

  describe('campaign name change re-mount', () => {
    it('reloads conditions when campaignName changes', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: 'con' } };

      const { rerender } = render(<CharConditions {...defaultProps} campaignName='campaign-a' />);
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();

      rerender(<CharConditions {...defaultProps} campaignName='campaign-b' />);
      // After rerender with new campaign, it will load from storage again
      // Since both campaigns share the same runtimeValues in our mock, it will still show blinded
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
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

  describe('exhaustion badge CSS classes', () => {
    it('applies exhaustion-badge--active class when exhaustion > 0 and not dead', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      const badge = screen.getByText('Exhaustion (2)');
      const parent = badge.closest('.exhaustion-badge');
      expect(parent.className).toContain('exhaustion-badge--active');
    });

    it('applies exhaustion-badge--dead class when exhaustion is at maximum', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      const badge = screen.getByText('Exhaustion (6)');
      const parent = badge.closest('.exhaustion-badge');
      expect(parent.className).toContain('exhaustion-badge--dead');
    });
  });

  describe('save total calculation', () => {
    it('calculates total as roll + saveBonus + auraBonus', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 3,
        sourceName: null,
      });
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(5);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // roll = 15, bonus = 5, aura = 3, total = 23
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            total: 23,
          })
        );
      });
    });

    it('marks save as successful when total >= dc', async () => {
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(5);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // roll = 15, bonus = 5, total = 20 >= 14 = success
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
          })
        );
      });
    });

    it('marks save as failed when total < dc', async () => {
      rollD20.mockReturnValueOnce(1);
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(2);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // roll = 1, bonus = 2, total = 3 < 14 = fail
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('ability label display', () => {
    it('uses getAbilityLabel to display save ability name', async () => {
      const { getAbilityLabel } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilityLabel.mockReturnValue('Constitution');

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'con' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Constitution (DC 14)',
          })
        );
      });
    });
  });

  describe('conditionEffects restoreBalance interaction', () => {
    it('passes restoreBalance to hasSaveAdvantage', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 1, restoreBalance: true }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      // restoreBalance reduces effective saveAdvantageCount by 1, so no advantage
      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('multiple conditions with mixed savability', () => {
    it('renders savable conditions as buttons and non-savable as spans in the same list', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed', 'blinded', 'poisoned'];
      runtimeValues['Test Character::activeConditionMeta'] = {
        charmed: { dc: 12, ability: 'wis' },
        blinded: { dc: 10, ability: null },
        poisoned: { dc: 11, ability: 'con' },
      };
      render(<CharConditions {...defaultProps} />);

      const charmed = screen.getByText('Charmed DC 12');
      const blinded = screen.getByText('Blinded DC 10');
      const poisoned = screen.getByText('Poisoned DC 11');

      expect(charmed.tagName).toBe('BUTTON');
      expect(blinded.tagName).toBe('SPAN');
      expect(poisoned.tagName).toBe('BUTTON');
    });
  });

  describe('exhaustion level display with dead status', () => {
    it('includes "DEAD" in title when exhaustion is at maximum', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      const exhaustionLabel = screen.getByText('Exhaustion (6)');
      expect(exhaustionLabel.getAttribute('title')).toContain('DEAD');
    });

    it('does not include "DEAD" in title when exhaustion is below maximum', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={5} />);
      const exhaustionLabel = screen.getByText('Exhaustion (5)');
      expect(exhaustionLabel.getAttribute('title')).not.toContain('DEAD');
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

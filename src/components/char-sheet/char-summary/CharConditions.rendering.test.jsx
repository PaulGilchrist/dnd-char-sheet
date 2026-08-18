// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharConditions from './CharConditions.jsx';
import { rollD20 } from '../../../services/dice/diceRoller.js';

let runtimeValues = {};

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((name, key) => {
    const storageKey = `${name}::${key}`;
    return runtimeValues[storageKey] ?? runtimeValues[key] ?? null;
  }),
  setRuntimeValue: vi.fn((name, key, value) => {
    runtimeValues[`${name}::${key}`] = value;
  }),
  addStorageChangeListener: vi.fn(() => () => {}),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilityLabel: vi.fn((abbr) => abbr?.toUpperCase() || 'None'),
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

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfPurityHandler.js', () => ({
  isAuraOfPurityActive: vi.fn(() => false),
  getAuraOfPuritySaveAdvantageConditions: vi.fn(() => []),
}));

vi.mock('../../../services/combat/conditions/conditionEffects.js', () => ({
  hasSaveAdvantage: vi.fn(() => false),
}));

describe('CharConditions rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeValues = {};
    rollD20.mockReturnValue(15);
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

  describe('empty state', () => {
    it('renders nothing when no conditions and no exhaustion', () => {
      const { container } = render(<CharConditions {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('exhaustion badge rendering', () => {
    it('shows dead styling in title when exhaustion is at maximum (level 6)', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      expect(screen.getByText('Exhaustion (6)')).toHaveAttribute('title', 'Exhaustion level 6 - DEAD\n\n');
    });

    it('omits "DEAD" from title when exhaustion is below maximum', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={5} />);
      expect(screen.getByText('Exhaustion (5)').getAttribute('title')).not.toContain('DEAD');
    });

    it('disables plus button when exhaustion is at maximum level', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={6} />);
      expect(screen.getByRole('button', { name: '+' })).toBeDisabled();
    });

    it('enables both exhaustion adjustment buttons at mid level', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={3} />);
      expect(screen.getByRole('button', { name: '−' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '+' })).not.toBeDisabled();
    });

    it.each`
      level | minusEnabled | plusEnabled
      ${1}  | ${true}      | ${true}
      ${5}  | ${true}      | ${true}
    `('exhaustion at level $level - minus button $minusEnabled, plus button $plusEnabled', ({ level, minusEnabled, plusEnabled }) => {
      render(<CharConditions {...defaultProps} exhaustionLevel={level} />);
      expect(screen.getByRole('button', { name: '−' }).disabled).toBe(!minusEnabled);
      expect(screen.getByRole('button', { name: '+' }).disabled).toBe(!plusEnabled);
    });
  });

  describe('condition deduplication', () => {
    it('renders each unique condition only once despite duplicates in the array', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed', 'charmed', 'blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = {
        charmed: { dc: 12, ability: 'wis' },
        blinded: { dc: 10, ability: null },
      };
      render(<CharConditions {...defaultProps} />);
      expect(screen.getAllByText('Charmed DC 12')).toHaveLength(1);
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
    });
  });

  describe('condition savability behavior', () => {
    it('triggers a save roll popup when clicking a savable condition', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };

      render(<CharConditions {...defaultProps} />);
      fireEvent.click(screen.getByText('Charmed DC 14'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });
    });

    it('removes condition from the list after a successful save', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };

      render(<CharConditions {...defaultProps} />);
      fireEvent.click(screen.getByText('Charmed DC 14'));

      await waitFor(() => {
        expect(screen.queryByText('Charmed DC 14')).not.toBeInTheDocument();
      });
    });

    it('does not trigger a save when clicking a condition with dc but no ability', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: null } };

      render(<CharConditions {...defaultProps} />);
      fireEvent.click(screen.getByText('Blinded DC 10'));
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('renders condition text without DC when meta has no dc but has ability', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { ability: 'con' } };
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Blinded')).toBeInTheDocument();
    });

    it('renders condition text with DC when meta has dc but no ability', () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10 } };
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
    });
  });

  describe('combined conditions and exhaustion display', () => {
    it('renders both conditions and exhaustion in the same grid', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      expect(screen.getByText('Charmed DC 12')).toBeInTheDocument();
      expect(screen.getByText('Exhaustion (2)')).toBeInTheDocument();
    });

    it('renders exhaustion when there are no conditions', () => {
      render(<CharConditions {...defaultProps} exhaustionLevel={1} />);
      expect(screen.getByText('Exhaustion (1)')).toBeInTheDocument();
    });
  });

  describe('storage change listener', () => {
    it('unsubscribes on unmount', async () => {
      const { addStorageChangeListener } = await import('../../../hooks/runtime/useRuntimeState.js');
      const mockUnsubscribe = vi.fn();
      addStorageChangeListener.mockImplementation(() => mockUnsubscribe);

      const { unmount } = render(<CharConditions {...defaultProps} />);
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('condition meta handling', () => {
    it('falls back to bare condition name when conditionMeta is null', () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = null;
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText('Charmed')).toBeInTheDocument();
    });
  });

  describe('tooltips', () => {
    it.each`
      condition      | conditions           | meta                                      | displayText    | expectedText
      ${'charmed'}   | ${['charmed']}       | ${{ charmed: { dc: 12, ability: 'wis' } }} | ${'Charmed DC 12'} | ${"You can't attack the charmer"}
      ${'blinded'}   | ${['blinded']}       | ${{}}                                       | ${'Blinded'}       | ${"You can't see"}
    `('sets tooltip from CONDITION_DESCRIPTIONS for $condition', ({ conditions, meta, displayText, expectedText }) => {
      runtimeValues['Test Character::activeConditions'] = conditions;
      runtimeValues['Test Character::activeConditionMeta'] = meta;
      render(<CharConditions {...defaultProps} />);
      expect(screen.getByText(displayText).getAttribute('title')).toContain(expectedText);
    });

    it('sets tooltip for exhaustion level from CONDITION_DESCRIPTIONS', () => {
      runtimeValues['Test Character::activeConditions'] = [];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} exhaustionLevel={2} />);
      expect(screen.getByText('Exhaustion (2)').getAttribute('title')).toContain('Exhaustion level 2');
    });
  });

  describe('mixed savability in a single list', () => {
    it('triggers saves for savable conditions but not for non-savable ones', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed', 'blinded', 'poisoned'];
      runtimeValues['Test Character::activeConditionMeta'] = {
        charmed: { dc: 12, ability: 'wis' },
        blinded: { dc: 10, ability: null },
        poisoned: { dc: 11, ability: 'con' },
      };

      render(<CharConditions {...defaultProps} />);

      fireEvent.click(screen.getByText('Charmed DC 12'));
      fireEvent.click(screen.getByText('Poisoned DC 11'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledTimes(2);
      });

      vi.clearAllMocks();

      fireEvent.click(screen.getByText('Blinded DC 10'));
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });

  describe('character name change re-mount', () => {
    it('loads conditions from the new character name when playerStats.name changes', () => {
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
});

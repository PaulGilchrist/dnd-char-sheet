import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharConditions, { loadActiveConditions } from './CharConditions.jsx';
import { rollD20 } from '../../../services/dice/diceRoller.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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

describe('CharConditions rendering', () => {
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
    it('unsubscribes on unmount', async () => {
      const { addStorageChangeListener } = await import('../../../hooks/runtime/useRuntimeState.js');
      const mockUnsubscribe = vi.fn();
      addStorageChangeListener.mockImplementation(() => mockUnsubscribe);

      const { unmount } = render(<CharConditions {...defaultProps} />);
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
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
      expect(screen.getByText('Blinded DC 10')).toBeInTheDocument();
    });
  });
});

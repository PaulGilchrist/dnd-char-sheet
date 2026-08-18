// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WizardFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    arcaneRecoveryLevels: 1,
    showWizardFeatures: true,
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('./TrackedResourceInput.jsx', () => ({
  default: function MockTrackedResourceInput({ label, getMax, resourceKey }) {
    const max = getMax ? getMax() : 0;
    return (
      <div data-testid={`tracked-resource-${resourceKey}`}>
        <b>{label}:</b> <span>{max}/{max}</span>
      </div>
    );
  },
}));

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Wizard',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Wizard',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Intelligence', bonus: 3 },
    ],
    automation: {},
    specialActions: [],
    ...overrides,
  };
}

describe('WizardFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'activeBuffs') return [];
      return undefined;
    });
  });

  describe('arcane recovery', () => {
    it('renders arcane recovery tracked resource', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneRecoveryLevels"]')).toBeTruthy();
    });
  });

  describe('arcane ward', () => {
    it.each([
      [{ type: 'arcane_ward' }, 'arcane_ward passive'],
      [{ type: 'passive_rule', effect: 'arcane_ward' }, 'passive_rule with effect'],
    ])('renders arcane ward tracked resource when passive exists (%s)', (_, label) => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [label === 'arcane_ward passive' ? { type: 'arcane_ward' } : { type: 'passive_rule', effect: 'arcane_ward' }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeTruthy();
    });

    it('does not render arcane ward when no matching passive', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeFalsy();
    });

    it.each([
      [{ level: 5, intBonus: 3 }, 13, 'with int bonus'],
      [{ level: 5, intBonus: 0 }, 10, 'without int bonus'],
    ])('calculates ward max as 2 * level + int bonus (%s)', (opts, expected) => {
      const abilities = opts.intBonus !== undefined ? [{ name: 'Intelligence', bonus: opts.intBonus }] : [];
      render(<WizardFeatures playerStats={buildPlayerStats({
        level: opts.level,
        abilities,
        automation: { passives: [{ type: 'arcane_ward' }] },
      })} campaignName="test" />);
      expect(screen.getByText(`${expected}/${expected}`)).toBeTruthy();
    });
  });

  describe('portent', () => {
    it.each([
      [{ specialActions: [{ automation: { type: 'portent' } }], expectVisible: true }, 'feature exists'],
      [{ specialActions: [], expectVisible: false }, 'feature missing'],
    ])('renders portent dice section (%s)', (opts) => {
      const stats = buildPlayerStats(opts);
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      if (opts.expectVisible) {
        expect(container.textContent).toContain('Portent Dice:');
      } else {
        expect(container.textContent).not.toContain('Portent Dice');
      }
    });

    it('renders parsed portent dice values', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [12, 7, 19];
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('12');
      expect(container.textContent).toContain('7');
      expect(container.textContent).toContain('19');
    });

    it('renders string JSON portent dice without throwing', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return '[15, 3]';
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Portent Dice:');
    });

    it('shows no dice remaining when parsed array is empty', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [];
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('No dice remaining');
    });

    it('shows remaining count matching array length', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [10, 11];
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('2 remaining');
    });

    it('handles invalid JSON in portentDice gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return 'not json';
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('No dice remaining');
    });
  });

  describe('projected ward', () => {
    it.each([
      [{ type: 'projected_ward', range: 30 }, 'default range'],
      [{ type: 'projected_ward', range: 60 }, 'custom range 60'],
      [{ name: 'Projected Ward' }, 'name match'],
    ])('renders projected ward badge (%s)', (reaction) => {
      const stats = buildPlayerStats({
        automation: { reactions: [reaction] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Projected Ward');
    });

    it('shows the correct range in projected ward badge', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ type: 'projected_ward', range: 60 }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('60 ft.');
    });

    it('does not render projected ward when reaction missing', () => {
      const stats = buildPlayerStats({ automation: { reactions: [] } });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Projected Ward');
    });
  });

  describe('the third eye', () => {
    it.each([
      [{ effect: 'darkvision_120', expected: 'Darkvision 120 ft.' }, 'darkvision'],
      [{ effect: 'greater_comprehension', expected: 'Greater Comprehension' }, 'greater comprehension'],
      [{ effect: 'see_invisibility', expected: 'See Invisibility' }, 'see invisibility'],
    ])('renders third eye badge with %s effect', (opts) => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: opts.effect }];
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain(opts.expected);
    });

    it('shows Active for unknown effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'unknown' }];
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('The Third Eye: Active');
    });

    it('does not render third eye when no buff', () => {
      const stats = buildPlayerStats();
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('The Third Eye');
    });
  });

  describe('show wizard features toggle', () => {
    it.each([
      [{ showWizardFeatures: false }, 'false'],
      [{ showWizardFeatures: true }, 'true'],
    ])('returns null when showWizardFeatures is %s', (opts) => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 1,
        showWizardFeatures: opts.showWizardFeatures,
      });
      const stats = buildPlayerStats();
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      if (opts.showWizardFeatures === false) {
        expect(container.textContent).toBe('');
      } else {
        expect(container.textContent).not.toBe('');
      }
    });

    it('renders normally when showWizardFeatures is undefined', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 1,
      });
      const stats = buildPlayerStats();
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toBe('');
    });
  });
});

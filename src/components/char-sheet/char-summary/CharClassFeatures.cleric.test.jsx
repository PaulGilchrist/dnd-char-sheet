// @cleaned-by-ai
// @improved-by-ai
// Consolidated redundant tests: removed duplicate crash test, merged wisMod edge cases,
// removed low-value render-only tests, eliminated brittle implementation-specific assertions.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ClericFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';

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

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    maxChannelDivinity: 2,
    destroyUndeadCR: 5,
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn((_name, key) => {
    if (key === 'activeBuffs') return [];
    return undefined;
  }),
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Cleric',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Cleric',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Wisdom', bonus: 3 },
      { name: 'Charisma', bonus: 1 },
    ],
    automation: {},
    ...overrides,
  };
}

describe('ClericFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      maxChannelDivinity: 2,
      destroyUndeadCR: 5,
    });
  });

  describe('channel divinity charges', () => {
    it('renders the tracked resource', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-channelDivinityCharges')).toBeInTheDocument();
    });

    it('uses maxChannelDivinity from class features as the max value', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('2/2');
    });

    it('uses 0 when maxChannelDivinity is missing from class features', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({});
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('0/0');
    });
  });

  describe('destroy undead CR', () => {
    it('renders when destroyUndeadCR is a non-null number', () => {
      const stats = buildPlayerStats();
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Destroy Undead Challenge Rating:');
      expect(container.textContent).toContain('5');
    });

    it('renders when destroyUndeadCR is 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        destroyUndeadCR: 0,
      });
      const stats = buildPlayerStats();
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Destroy Undead Challenge Rating:');
      expect(container.textContent).toContain('0');
    });

    it('does not render when destroyUndeadCR is null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        destroyUndeadCR: null,
      });
      const stats = buildPlayerStats();
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Destroy Undead');
    });
  });

  describe('preserve life pool', () => {
    it('renders for Life Domain via major name', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Cleric',
          major: { name: 'Life Domain' },
          subclass: {},
          class_levels: [],
          fightingStyles: [],
        },
      });
      render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-preserveLifePool')).toBeInTheDocument();
    });

    it('calculates max as 5 * level', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Cleric',
          major: { name: 'Life Domain' },
          subclass: { name: 'Life Domain' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('25/25');
    });

    it('does not render for non-Life Domain subclass', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Cleric',
          major: {},
          subclass: { name: 'War Domain' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByTestId('tracked-resource-preserveLifePool')).not.toBeInTheDocument();
    });

    it('does not render when both major and subclass are non-Life Domain', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Cleric',
          major: { name: 'Knowledge Domain' },
          subclass: { name: 'Knowledge Domain' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByTestId('tracked-resource-preserveLifePool')).not.toBeInTheDocument();
    });

    it('does not render when class is null', () => {
      const stats = buildPlayerStats({ class: null });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-preserveLifePool"]')).toBeFalsy();
    });
  });

  describe('warding flare uses', () => {
    it('renders the tracked resource', () => {
      const stats = buildPlayerStats();
      render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-wardingflareUses')).toBeInTheDocument();
    });

    it('uses Math.max(1, wisMod) for max with various wisdom modifiers', () => {
      const cases = [
        { wisBonus: 3, expected: '3/3' },
        { wisBonus: -2, expected: '1/1' },
        { wisBonus: 0, expected: '1/1' },
      ];
      for (const { wisBonus, expected } of cases) {
        const stats = buildPlayerStats({
          abilities: [{ name: 'Wisdom', bonus: wisBonus }],
        });
        const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(expected);
      }
    });

    it('uses 1 when Wisdom ability is missing from abilities array', () => {
      const stats = buildPlayerStats({
        abilities: [{ name: 'Charisma', bonus: 3 }],
      });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('1/1');
    });
  });
});

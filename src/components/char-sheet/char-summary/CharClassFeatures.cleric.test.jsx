import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import ClericFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    maxChannelDivinity: 2,
    destroyUndeadCR: 5,
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
  beforeEach(() => vi.clearAllMocks());

  it('renders channel divinity charges', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-channelDivinityCharges"]')).toBeTruthy();
  });

  it('renders destroy undead CR when not null', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      maxChannelDivinity: 2,
      destroyUndeadCR: 5,
    });
    const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Destroy Undead Challenge Rating: 5');
  });

  it('does not render destroy undead CR when null', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      maxChannelDivinity: 2,
      destroyUndeadCR: null,
    });
    const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Destroy Undead');
  });

  describe('life domain', () => {
    it('renders preserve life pool for life domain', () => {
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
      expect(container.querySelector('[data-testid="tracked-resource-preserveLifePool"]')).toBeTruthy();
    });

    it('calculates preserve life max as 5 * level', () => {
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

    it('does not render preserve life pool for non-life domain', () => {
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
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-preserveLifePool"]')).toBeFalsy();
    });
  });

  describe('warding flare', () => {
    it('renders warding flare uses with wis-based max', () => {
      const stats = buildPlayerStats({
        abilities: [{ name: 'Wisdom', bonus: 3 }],
      });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-wardingflareUses"]')).toBeTruthy();
    });

    it('uses Math.max(1, wisMod) for warding flare max', () => {
      const stats = buildPlayerStats({
        abilities: [{ name: 'Wisdom', bonus: -1 }],
      });
      const { container } = render(<ClericFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('1/1');
    });
  });
});

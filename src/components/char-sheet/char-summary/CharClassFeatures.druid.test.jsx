import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import DruidFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    maxWildShapeUses: 2,
    maxWildShapeChallengeRating: 1,
    beastKnownForms: 0,
    wildShapeLimitations: 'walk only (no swim or fly)',
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
    name: 'Test Druid',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Druid',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Wisdom', bonus: 3 },
    ],
    automation: {},
    ...overrides,
  };
}

describe('DruidFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('level < 2', () => {
    it('returns null for level 1', () => {
      const stats = buildPlayerStats({ level: 1 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toBe('');
    });
  });

  describe('level >= 2', () => {
    it('renders beast forms known', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxWildShapeUses: 2,
        maxWildShapeChallengeRating: 1,
        beastKnownForms: 5,
        wildShapeLimitations: 'walk only (no swim or fly)',
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Beast Forms Known: 5');
    });

    it('renders wild shape limitations', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wild Shape Limitations:');
    });

    it('renders wild shape max challenge rating', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wild Shape Max Challenge Rating:');
    });

    it('renders wild shape uses tracked resource', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-wildShapeUses"]')).toBeTruthy();
    });
  });

  describe('circle of the stars', () => {
    it('renders cosmic omen section at level >= 6', () => {
      const stats = buildPlayerStats({
        level: 6,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-cosmicomenUses"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-_Star_Map_freeCastCount"]')).toBeTruthy();
    });

    it('does not render cosmic omen section at level < 6', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-cosmicomenUses"]')).toBeFalsy();
    });

    it('renders cosmic omen effect badge when effect is set', () => {
      const stats = buildPlayerStats({
        level: 6,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'cosmicOmenEffect') return JSON.stringify({ type: 'Fortune', isEven: true });
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Cosmic Omen: Fortune');
      expect(container.textContent).toContain('Even');
    });

    it('does not render cosmic omen effect badge when effect is null', () => {
      const stats = buildPlayerStats({
        level: 6,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'cosmicOmenEffect') return null;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cosmic Omen:');
    });

    it('handles invalid JSON in cosmicOmenEffect gracefully', () => {
      const stats = buildPlayerStats({
        level: 6,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'cosmicOmenEffect') return 'invalid json';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cosmic Omen:');
    });
  });

  describe('circle of the moon', () => {
    it('renders moonlight step uses for circle of the moon', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Moon' },
          subclass: { name: 'Circle of the Moon' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-moonlightStepUses"]')).toBeTruthy();
    });

    it('does not render moonlight step for non-moon druid', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Land' },
          subclass: { name: 'Circle of the Land' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-moonlightStepUses"]')).toBeFalsy();
    });
  });

  describe('circle of the land', () => {
    it('renders circle of the land badge when type is set', () => {
      const stats = buildPlayerStats({ level: 3 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === '_circleOfTheLandType') return 'Forest';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Circle of the Land: Forest');
    });

    it('does not render circle of the land badge when type is null', () => {
      const stats = buildPlayerStats({ level: 3 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === '_circleOfTheLandType') return null;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Circle of the Land');
    });
  });

  describe('elemental fury', () => {
    it('renders elemental fury badge when choice is set', () => {
      const stats = buildPlayerStats({ level: 10 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === '_Elemental_Fury_option') return 'Lightning';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Elemental Fury: Lightning');
    });

    it('renders improved elemental fury badge when choice is set', () => {
      const stats = buildPlayerStats({ level: 10 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === '_Improved_Elemental_Fury_option') return 'Fire';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Improved Elemental Fury: Fire');
    });
  });

  describe('natural recovery', () => {
    it('renders natural recovery section when feature exists', () => {
      const stats = buildPlayerStats({
        level: 2,
        automation: { passives: [{ type: 'natural_recovery' }] },
      });
      vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'naturalRecoveryFreeCast') return ['Fireball'];
        if (prop === 'naturalRecoveryFreeCastUsed') return false;
        return null;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Natural Recovery:');
    });

    it('shows free cast badge when free cast array has items', () => {
      const stats = buildPlayerStats({
        level: 2,
        automation: { passives: [{ type: 'natural_recovery' }] },
      });
      vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'naturalRecoveryFreeCast') return ['Fireball'];
        if (prop === 'naturalRecoveryFreeCastUsed') return false;
        return null;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Free cast: Fireball');
    });

    it('shows free cast used badge when flag is true', () => {
      const stats = buildPlayerStats({
        level: 2,
        automation: { passives: [{ type: 'natural_recovery' }] },
      });
      vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'naturalRecoveryFreeCast') return [];
        if (prop === 'naturalRecoveryFreeCastUsed') return true;
        return null;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Free cast used');
    });
  });

  describe('wrath of the sea', () => {
    it('renders wrath of the sea badge when active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'wrathOfTheSeaActive') return true;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wrath of the Sea Active');
    });

    it('does not render wrath of the sea badge when not active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'wrathOfTheSeaActive') return false;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Wrath of the Sea');
    });
  });

  describe('multi-minute badges', () => {
    it('renders multi-minute badges with formatted duration', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Some Buff', duration: '10_minutes' }];
        return undefined;
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Some Buff');
    });
  });
});

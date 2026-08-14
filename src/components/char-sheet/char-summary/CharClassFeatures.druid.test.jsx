// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DruidFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

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
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        case 'cosmicOmenEffect': return undefined;
        case 'wrathOfTheSeaActive': return undefined;
        case '_circleOfTheLandType': return undefined;
        case '_Elemental_Fury_option': return undefined;
        case '_Improved_Elemental_Fury_option': return undefined;
        default: return undefined;
      }
    });
    runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'naturalRecoveryFreeCast': return undefined;
        case 'naturalRecoveryFreeCastUsed': return undefined;
        default: return null;
      }
    });
  });

  describe('level gating', () => {
    it('returns null for level 1 druid', () => {
      const stats = buildPlayerStats({ level: 1 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.innerHTML).toBe('');
    });

    it('renders for level 2 druid', () => {
      const stats = buildPlayerStats({ level: 2 });
      render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('char-class-druid')).toBeInTheDocument();
    });
  });

  describe('base wild shape features', () => {
    it('renders beast forms known when count > 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxWildShapeUses: 2,
        maxWildShapeChallengeRating: 1,
        beastKnownForms: 5,
        wildShapeLimitations: 'walk only (no swim or fly)',
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Beast Forms Known: 5');
    });

    it('does not render beast forms known when count is 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxWildShapeUses: 2,
        maxWildShapeChallengeRating: 1,
        beastKnownForms: 0,
        wildShapeLimitations: 'None',
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Beast Forms Known');
    });

    it('renders wild shape limitations text', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wild Shape Limitations:');
    });

    it('renders wild shape max challenge rating', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wild Shape Max Challenge Rating:');
      expect(container.textContent).toContain('1');
    });

    it('renders wild shape uses tracked resource', () => {
      const stats = buildPlayerStats({ level: 2 });
      render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-wildShapeUses')).toBeInTheDocument();
    });

    it('uses maxWildShapeUses from class features as the max value', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxWildShapeUses: 3,
        maxWildShapeChallengeRating: 1,
        beastKnownForms: 0,
        wildShapeLimitations: 'None',
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('3/3');
    });
  });

  describe('circle of the stars', () => {
    const starsDruidStats = (level) => buildPlayerStats({
      level,
      class: {
        name: 'Druid',
        major: { name: 'Circle of the Stars' },
        subclass: { name: 'Circle of the Stars' },
        class_levels: [],
        fightingStyles: [],
      },
      automation: { passives: [] },
    });

    it('renders cosmic omen section at level >= 6', () => {
      const stats = starsDruidStats(6);
      render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-cosmicomenUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-_Star_Map_freeCastCount')).toBeInTheDocument();
    });

    it('does not render cosmic omen section at level < 6', () => {
      const stats = starsDruidStats(5);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-cosmicomenUses"]')).toBeFalsy();
      expect(container.querySelector('[data-testid="tracked-resource-_Star_Map_freeCastCount"]')).toBeFalsy();
    });

    it('renders cosmic omen effect badge with parsed effect type', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'cosmicOmenEffect') return JSON.stringify({ type: 'Fortune', isEven: true });
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = starsDruidStats(6);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Cosmic Omen: Fortune');
      expect(container.textContent).toContain('Even');
    });

    it('renders odd variant of cosmic omen effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'cosmicOmenEffect') return JSON.stringify({ type: 'Bane', isEven: false });
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = starsDruidStats(6);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Cosmic Omen: Bane');
      expect(container.textContent).toContain('Odd');
    });

    it('does not render cosmic omen effect when effect is null', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'cosmicOmenEffect') return null;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = starsDruidStats(6);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cosmic Omen:');
    });

    it('does not render cosmic omen effect when effect is empty string', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'cosmicOmenEffect') return '';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = starsDruidStats(6);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cosmic Omen:');
    });

    it('handles invalid JSON in cosmicOmenEffect gracefully without crashing', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'cosmicOmenEffect') return 'invalid json';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = starsDruidStats(6);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cosmic Omen:');
    });

    it('does not render cosmic omen effect when parsed JSON lacks type', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'cosmicOmenEffect') JSON.stringify({ isEven: true });
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = starsDruidStats(6);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cosmic Omen:');
    });

    it('uses wisdom bonus as max for cosmic omen uses', () => {
      const wisStats = buildPlayerStats({
        level: 6,
        abilities: [{ name: 'Wisdom', bonus: 5 }],
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
        automation: { passives: [] },
      });
      render(<DruidFeatures playerStats={wisStats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-cosmicomenUses')).toBeTruthy();
    });

    it('uses minimum 1 when wisdom bonus is 0', () => {
      const zeroWisStats = buildPlayerStats({
        level: 6,
        abilities: [{ name: 'Wisdom', bonus: 0 }],
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Stars' },
          subclass: { name: 'Circle of the Stars' },
          class_levels: [],
          fightingStyles: [],
        },
        automation: { passives: [] },
      });
      const { container } = render(<DruidFeatures playerStats={zeroWisStats} campaignName="test" />);
      expect(container.textContent).toContain('1/1');
    });
  });

  describe('circle of the moon', () => {
    const moonDruidStats = (level) => buildPlayerStats({
      level,
      class: {
        name: 'Druid',
        major: { name: 'Circle of the Moon' },
        subclass: { name: 'Circle of the Moon' },
        class_levels: [],
        fightingStyles: [],
      },
      automation: { passives: [] },
    });

    it('renders moonlight step uses for circle of the moon', () => {
      const stats = moonDruidStats(10);
      render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-moonlightStepUses')).toBeInTheDocument();
    });

    it('does not render moonlight step for non-moon druid', () => {
      const stats = buildPlayerStats({
        level: 10,
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Land' },
          subclass: { name: 'Circle of the Land' },
          class_levels: [],
          fightingStyles: [],
        },
        automation: { passives: [] },
      });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-moonlightStepUses"]')).toBeFalsy();
    });

    it('uses wisdom bonus as max for moonlight step', () => {
      const stats = moonDruidStats(10);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('3/3');
    });

    it('uses minimum 1 for moonlight step max when wisdom is negative', () => {
      const negativeWisStats = buildPlayerStats({
        level: 10,
        abilities: [{ name: 'Wisdom', bonus: -2 }],
        class: {
          name: 'Druid',
          major: { name: 'Circle of the Moon' },
          subclass: { name: 'Circle of the Moon' },
          class_levels: [],
          fightingStyles: [],
        },
        automation: { passives: [] },
      });
      const { container } = render(<DruidFeatures playerStats={negativeWisStats} campaignName="test" />);
      expect(container.textContent).toContain('1/1');
    });
  });

  describe('circle of the land', () => {
    const landDruidStats = (level) => buildPlayerStats({
      level,
      class: {
        name: 'Druid',
        major: { name: 'Circle of the Land' },
        subclass: { name: 'Circle of the Land' },
        class_levels: [],
        fightingStyles: [],
      },
      automation: { passives: [] },
    });

    it('renders circle of the land badge when type is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_circleOfTheLandType') return 'Forest';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = landDruidStats(3);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Circle of the Land: Forest');
    });

    it('renders circle of the land badge for arctic type', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_circleOfTheLandType') return 'Arctic';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = landDruidStats(3);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Circle of the Land: Arctic');
    });

    it('does not render circle of the land badge when type is null', () => {
      const stats = landDruidStats(3);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Circle of the Land');
    });

    it('does not render circle of the land badge when type is empty string', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_circleOfTheLandType') return '';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = landDruidStats(3);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Circle of the Land');
    });
  });

  describe('elemental fury (circle of the storm)', () => {
    const stormDruidStats = (level) => buildPlayerStats({
      level,
      class: {
        name: 'Druid',
        major: { name: 'Circle of the Storm' },
        subclass: { name: 'Circle of the Storm' },
        class_levels: [],
        fightingStyles: [],
      },
      automation: { passives: [] },
    });

    it('renders elemental fury badge when choice is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_Elemental_Fury_option') return 'Lightning';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = stormDruidStats(10);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Elemental Fury: Lightning');
    });

    it('renders improved elemental fury badge when choice is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_Improved_Elemental_Fury_option') return 'Fire';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = stormDruidStats(10);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Improved Elemental Fury: Fire');
    });

    it('renders both elemental fury and improved elemental fury when both are set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_Elemental_Fury_option') return 'Lightning';
        if (key === '_Improved_Elemental_Fury_option') return 'Fire';
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = stormDruidStats(18);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Elemental Fury: Lightning');
      expect(container.textContent).toContain('Improved Elemental Fury: Fire');
    });

    it('does not render elemental fury when choice is not set', () => {
      const stats = stormDruidStats(10);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Elemental Fury');
    });

    it('does not render improved elemental fury when choice is not set', () => {
      const stats = stormDruidStats(18);
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Improved Elemental Fury');
    });
  });

  describe('wrath of the sea', () => {
    const seaDruidStats = () => buildPlayerStats({
      level: 2,
      class: {
        name: 'Druid',
        major: { name: 'Circle of the Sea' },
        subclass: { name: 'Circle of the Sea' },
        class_levels: [],
        fightingStyles: [],
      },
      automation: { passives: [] },
    });

    it('renders wrath of the sea badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'wrathOfTheSeaActive') return true;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = seaDruidStats();
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wrath of the Sea Active');
    });

    it('does not render wrath of the sea badge when not active', () => {
      const stats = seaDruidStats();
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Wrath of the Sea');
    });

    it('does not render wrath of the sea badge when false', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'wrathOfTheSeaActive') return false;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = seaDruidStats();
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Wrath of the Sea');
    });
  });

  describe('multi-minute badges', () => {
    it('renders multi-minute badges with formatted duration', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Some Buff', duration: '10_minutes' }];
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Some Buff');
    });

    it('does not render non-multi-minute duration badges', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Some Buff', duration: '1_round' }];
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<DruidFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Some Buff');
    });

    it('handles undefined activeBuffs gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return undefined;
        return undefined;
      });
      render(<DruidFeatures playerStats={buildPlayerStats({ level: 2 })} campaignName="test" />);
      expect(screen.getByTestId('char-class-druid')).toBeInTheDocument();
    });

    it('handles null activeBuffs gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return null;
        return undefined;
      });
      render(<DruidFeatures playerStats={buildPlayerStats({ level: 2 })} campaignName="test" />);
      expect(screen.getByTestId('char-class-druid')).toBeInTheDocument();
    });
  });
});

// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MonkFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    martialArtsDie: 4,
    unarmoredMovementIncrease: 0,
    maxFocusPoints: 0,
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
    name: 'Test Monk',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Monk',
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

describe('MonkFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      martialArtsDie: 4,
      unarmoredMovementIncrease: 0,
      maxFocusPoints: 5,
    });
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        case 'elementalAttunementActive': return undefined;
        case 'elementalAttunementElement': return undefined;
        case 'elementalEpitomeActive': return undefined;
        case 'epitomeResistanceType': return undefined;
        case 'destructiveStrideActive': return undefined;
        default: return undefined;
      }
    });
  });

  describe('level gating', () => {
    it('returns null for level 1', () => {
      const stats = buildPlayerStats({ level: 1 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.innerHTML).toBe('');
    });

    it('renders features for level 2', () => {
      const stats = buildPlayerStats({ level: 2 });
      render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('char-class-monk')).toBeInTheDocument();
    });
  });

  describe('class-level dependent features', () => {
    it('renders extra attacks based on class_level data', () => {
      const extraAttacksCases = [
        {
          level: 5,
          class_levels: [null, null, null, null, { level: 5, extra_attacks: 2 }],
          expected: 'Extra Attacks: 2',
        },
        {
          level: 5,
          class_levels: [null, null, null, null, null],
          expected: 'Extra Attacks: 0',
        },
        {
          level: 10,
          class_levels: [null, { level: 2 }],
          expected: 'Extra Attacks: 0',
        },
        {
          level: 6,
          class_levels: [null, null, null, null, null, { level: 6 }],
          expected: 'Extra Attacks: 0',
        },
      ];
      for (const { level, class_levels, expected } of extraAttacksCases) {
        const stats = buildPlayerStats({
          level,
          class: {
            name: 'Monk',
            major: {},
            subclass: {},
            class_levels,
            fightingStyles: [],
          },
        });
        const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(expected);
      }
    });

    it('renders focus points tracked resource', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-focusPoints"]')).toBeTruthy();
    });

    it('calculates focus save DC from wisdom bonus + proficiency', () => {
      const stats = buildPlayerStats({
        level: 2,
        abilities: [{ name: 'Wisdom', bonus: 3 }],
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      // 8 + 3 + 2 = 13
      expect(container.textContent).toContain('Focus Save DC: 13');
    });

    it('defaults focus save DC when wisdom ability is missing', () => {
      const stats = buildPlayerStats({
        level: 2,
        abilities: [{ name: 'Strength', bonus: 3 }],
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      // 8 + 0 + 2 = 10 (wisdom bonus defaults to 0)
      expect(container.textContent).toContain('Focus Save DC: 10');
    });

    it('renders martial arts die from classFeatures', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        martialArtsDie: 6,
        unarmoredMovementIncrease: 10,
        maxFocusPoints: 5,
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Martial Arts Die: d6');
    });

    it('renders martial arts die as d4 default when classFeatures returns 4', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Martial Arts Die: d4');
    });

    it('renders unarmored movement from classFeatures', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        martialArtsDie: 4,
        unarmoredMovementIncrease: 15,
        maxFocusPoints: 5,
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Unarmored Movement: +15 ft.');
    });
  });

  describe('active buffs display', () => {
    it('shows cloak of shadows badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'cloak_of_shadows' }];
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Cloak of Shadows');
    });

    it('does not show cloak of shadows when not active', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cloak of Shadows');
    });

    it('renders elemental attunement badge with icon when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'elementalAttunementActive') return true;
        if (key === 'elementalAttunementElement') return 'Fire';
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Elemental Attunement: Fire');
    });

    it('renders stride with mapped labels for each effect type', () => {
      const strideTests = [
        { effect: 'fly_speed_equals_walk_speed', expected: 'Fly Speed' },
        { effect: 'ice_walk', expected: 'Ice Walk' },
        { effect: 'speed_boost', expected: '+10 Speed' },
        { effect: 'teleport_ready', expected: 'Teleport 30 ft' },
      ];
      for (const test of strideTests) {
        runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
          if (key === 'activeBuffs') return [{ name: 'Stride of the Elements', effect: test.effect }];
          return undefined;
        });
        const stats = buildPlayerStats({ level: 2 });
        const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(test.expected);
      }
    });

    it('renders stride with generic "Stride" label for unknown effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Stride of the Elements', effect: 'unknown_effect' }];
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Stride: Stride');
    });

    it('does not render stride when no stride buff present', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Stride');
    });

    it('renders elemental epitome resistance when active with type', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'elementalEpitomeActive') return true;
        if (key === 'epitomeResistanceType') return 'Fire';
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Resistance to Fire');
    });

    it('renders elemental epitome with "not chosen" when resistance type is falsy', () => {
      const falsyCases = [
        { epitomeResistanceType: null, expected: 'not chosen' },
        { epitomeResistanceType: '', expected: 'Resistance to' },
      ];
      for (const { epitomeResistanceType, expected } of falsyCases) {
        runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
          if (key === 'elementalEpitomeActive') return true;
          if (key === 'epitomeResistanceType') return epitomeResistanceType;
          return undefined;
        });
        const stats = buildPlayerStats({ level: 2 });
        const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(expected);
      }
    });

    it('does not render elemental epitome when not active', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Elemental Epitome');
    });

    it('renders destructive stride when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'destructiveStrideActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Destructive Stride: +20 Speed');
    });

    it('does not render destructive stride when not active', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Destructive Stride');
    });
  });
});

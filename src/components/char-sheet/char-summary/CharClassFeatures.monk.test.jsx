import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
  beforeEach(() => vi.clearAllMocks());

  describe('level < 2', () => {
    it('returns null for level 1', () => {
      const stats = buildPlayerStats({ level: 1 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toBe('');
    });
  });

  describe('level >= 2', () => {
    it('renders extra attacks', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Monk',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5, extra_attacks: 2 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 2');
    });

    it('renders focus points tracked resource', () => {
      const stats = buildPlayerStats({ level: 2 });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-focusPoints"]')).toBeTruthy();
    });

    it('renders focus save DC calculated from wisdom + proficiency', () => {
      const stats = buildPlayerStats({
        level: 2,
        abilities: [{ name: 'Wisdom', bonus: 3 }],
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      // 8 + 3 + 2 = 13
      expect(container.textContent).toContain('Focus Save DC: 13');
    });

    it('renders martial arts die', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        martialArtsDie: 6,
        unarmoredMovementIncrease: 10,
        maxFocusPoints: 5,
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Martial Arts Die: d6');
    });

    it('renders unarmored movement increase', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        martialArtsDie: 4,
        unarmoredMovementIncrease: 15,
        maxFocusPoints: 5,
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Unarmored Movement: +15 ft.');
    });
  });

  describe('active buffs display', () => {
    it('shows cloak of shadows badge when active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ effect: 'cloak_of_shadows' }];
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Cloak of Shadows');
    });

    it('does not show cloak of shadows when not active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Cloak of Shadows');
    });

    it('shows elemental attunement when active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'elementalAttunementActive') return true;
        if (prop === 'elementalAttunementElement') return 'Fire';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Elemental Attunement: Fire');
    });

    it('shows stride badge when buff exists', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Stride of the Elements', effect: 'fly_speed_equals_walk_speed' }];
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Fly Speed');
    });

    it('shows stride with Ice Walk label', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Stride of the Elements', effect: 'ice_walk' }];
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Ice Walk');
    });

    it('shows stride with +10 Speed label', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Stride of the Elements', effect: 'speed_boost' }];
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('+10 Speed');
    });

    it('shows stride with teleport label', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Stride of the Elements', effect: 'teleport_ready' }];
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Teleport 30 ft');
    });

    it('shows elemental epitome when active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'elementalEpitomeActive') return true;
        if (prop === 'epitomeResistanceType') return 'Fire';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Resistance to Fire');
    });

    it('shows elemental epitome with "not chosen" when no type', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'elementalEpitomeActive') return true;
        if (prop === 'epitomeResistanceType') return null;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('not chosen');
    });

    it('shows destructive stride when active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'destructiveStrideActive') return true;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Destructive Stride: +20 Speed');
    });

    it('does not show destructive stride when not active', () => {
      const stats = buildPlayerStats({ level: 2 });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'destructiveStrideActive') return false;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<MonkFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Destructive Stride');
    });
  });
});

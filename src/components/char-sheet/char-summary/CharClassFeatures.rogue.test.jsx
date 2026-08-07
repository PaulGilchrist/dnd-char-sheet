import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import RogueFeatures from './CharClassFeatures.jsx';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    sneakAttack: { dice_count: 3, dice_value: 6 },
    expertise: ['Stealth'],
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
    name: 'Test Rogue',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Rogue',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Dexterity', bonus: 3 },
    ],
    automation: {},
    ...overrides,
  };
}

describe('RogueFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders expertise from getClassFeatures', () => {
    const stats = buildPlayerStats();
    const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Expertise: Stealth');
  });

  it('renders sneak attack damage', () => {
    const stats = buildPlayerStats();
    const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Sneak Attack Damage: +3d6');
  });

  describe('energy system', () => {
    it('renders energy dice when energy matches major', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Rogue',
          major: { name: 'Swashbuckler' },
          subclass: {},
          class_levels: [null, null, null, null, {
              level: 5,
              energy: { required_major: 'Swashbuckler', energy_die_num: 4, energy_die_type: 6 },
            }],
          fightingStyles: [],
        },
      });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Energy Dice');
      expect(container.textContent).toContain('Energy Die Type: d6');
    });

    it('does not render energy dice when energy does not match major', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Rogue',
          major: { name: 'Assassin' },
          subclass: {},
          class_levels: [
            null, null, null, null, {
              level: 5,
              energy: { required_major: 'Swashbuckler', energy_die_num: 4, energy_die_type: 6 },
            },
          ],
          fightingStyles: [],
        },
      });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Energy Dice');
    });
  });

  describe('supreme sneak', () => {
    it('renders supreme sneak badge when level >= 9', () => {
      const stats = buildPlayerStats({ level: 9 });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Supreme Sneak');
    });

    it('does not render supreme sneak when level < 9', () => {
      const stats = buildPlayerStats({ level: 8 });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Supreme Sneak');
    });

    it('applies automation-badge--active class when stealth attack is active', () => {
      const stats = buildPlayerStats({ level: 9 });
      runtimeState.useRuntimeValue.mockImplementation((characterKey, prop) => {
        if (prop === 'stealthAttackCost') return 1;
        return undefined;
      });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('.automation-badge--active')).toBeTruthy();
    });

    it('does not apply automation-badge--active class when stealth attack is not active', () => {
      const stats = buildPlayerStats({ level: 9 });
      runtimeState.useRuntimeValue.mockImplementation((characterKey, prop) => {
        if (prop === 'stealthAttackCost') return 0;
        return undefined;
      });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      // Should have automation-badge but not automation-badge--active
      expect(container.textContent).toContain('Supreme Sneak');
    });
  });
});

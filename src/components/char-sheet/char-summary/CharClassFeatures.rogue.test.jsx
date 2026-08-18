// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RogueFeatures from './CharClassFeatures.jsx';

vi.mock('./TrackedResourceInput.jsx', () => {
  let renderCount = 0;
  const renderedKeys = [];
  return {
    default: function MockTrackedResourceInput({ label, resourceKey }) {
      renderCount++;
      renderedKeys.push(resourceKey);
      return (
        <div data-testid={`tracked-resource-${resourceKey}`}>
          <span data-testid="mock-tracked-resource-label">{label}</span>
        </div>
      );
    },
    __renderCount: () => renderCount,
    __renderedKeys: () => [...renderedKeys],
    __reset__: () => {
      renderCount = 0;
      renderedKeys.length = 0;
    },
  };
});

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    sneakAttack: { dice_count: 3, dice_value: 6 },
    expertise: ['Stealth'],
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
}));

import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as trackedResourceInput from './TrackedResourceInput.jsx';

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
  beforeEach(() => {
    vi.clearAllMocks();
    trackedResourceInput.__reset__();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'stealthAttackCost') return 0;
      return undefined;
    });
  });

  describe('expertise', () => {
    it('renders expertise list from class features', () => {
      classFeatures.getClassFeatures.mockImplementation(() => ({
        sneakAttack: { dice_count: 3, dice_value: 6 },
        expertise: ['Stealth', 'Perception', 'Thieves\' Tools'],
      }));
      const stats = buildPlayerStats();
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Expertise:');
      expect(container.textContent).toContain('Stealth');
      expect(container.textContent).toContain('Perception');
      expect(container.textContent).toContain('Thieves\' Tools');
    });
  });

  describe('sneak attack damage', () => {
    it('renders sneak attack damage from class features', () => {
      const stats = buildPlayerStats();
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Sneak Attack Damage:');
      expect(container.textContent).toContain('+3d6');
    });
  });

  describe('energy dice', () => {
    it('renders energy dice when energy required_major matches class major', () => {
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
      expect(trackedResourceInput.__renderedKeys()).toContain('psionicEnergy');
      expect(container.textContent).toContain('Energy Die Type:');
      expect(container.textContent).toContain('d6');
    });

    it('does not render energy dice when energy required_major does not match class major', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Rogue',
          major: { name: 'Assassin' },
          subclass: {},
          class_levels: [null, null, null, null, {
            level: 5,
            energy: { required_major: 'Swashbuckler', energy_die_num: 4, energy_die_type: 6 },
          }],
          fightingStyles: [],
        },
      });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(trackedResourceInput.__renderedKeys()).not.toContain('psionicEnergy');
    });

    it('does not render energy dice when energy field is missing from class level', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Rogue',
          major: { name: 'Swashbuckler' },
          subclass: {},
          class_levels: [null, null, null, null, { level: 5 }],
          fightingStyles: [],
        },
      });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(trackedResourceInput.__renderedKeys()).not.toContain('psionicEnergy');
    });

    it('does not render energy dice when class_levels is null', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Rogue',
          major: { name: 'Swashbuckler' },
          subclass: {},
          class_levels: null,
          fightingStyles: [],
        },
      });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(trackedResourceInput.__renderedKeys()).not.toContain('psionicEnergy');
    });
  });

  describe('supreme sneak', () => {
    it('renders supreme sneak badge when level >= 9', () => {
      const stats = buildPlayerStats({ level: 9 });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      const badge = screen.getByTitle(/Supreme Sneak/);
      expect(badge).toHaveTextContent('Supreme Sneak');
    });

    it('does not render supreme sneak when level < 9', () => {
      const stats = buildPlayerStats({ level: 8 });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByTitle(/Supreme Sneak/)).not.toBeInTheDocument();
    });

    it('applies automation-badge--active class when stealth attack cost is greater than 0', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'stealthAttackCost') return 1;
        return undefined;
      });
      const stats = buildPlayerStats({ level: 9 });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      const badge = container.querySelector('.automation-badge');
      expect(badge).toBeTruthy();
      expect(badge).toHaveClass('automation-badge--active');
    });

    it('does not apply automation-badge--active when stealth attack cost is 0', () => {
      const stats = buildPlayerStats({ level: 9 });
      const { container } = render(<RogueFeatures playerStats={stats} campaignName="test" />);
      const badge = container.querySelector('.automation-badge');
      expect(badge).toBeTruthy();
      expect(badge).not.toHaveClass('automation-badge--active');
    });

    it('includes tooltip explaining active state when stealth attack is active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'stealthAttackCost') return 1;
        return undefined;
      });
      const stats = buildPlayerStats({ level: 9 });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      const badge = screen.getByTitle(/Supreme Sneak/);
      expect(badge.getAttribute('title')).toContain('Stealth Attack active');
    });

    it('includes tooltip explaining availability when stealth attack is not active', () => {
      const stats = buildPlayerStats({ level: 9 });
      render(<RogueFeatures playerStats={stats} campaignName="test" />);
      const badge = screen.getByTitle(/Supreme Sneak/);
      expect(badge.getAttribute('title')).toContain('Available at Rogue level 9');
    });
  });
});

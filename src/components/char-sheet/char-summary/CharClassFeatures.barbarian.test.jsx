import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import BarbarianFeatures from './CharClassFeatures.jsx';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => null),
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

vi.mock('../modals/WeaponKindMasteryModal.jsx', () => ({
  default: function MockWeaponKindMasteryModal() {
    return <div data-testid="weapon-kind-mastery-modal">WeaponKindMasteryModal</div>;
  },
}));

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Character',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Barbarian',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Strength', bonus: 2 },
      { name: 'Dexterity', bonus: 1 },
      { name: 'Constitution', bonus: 2 },
      { name: 'Intelligence', bonus: 0 },
      { name: 'Wisdom', bonus: 1 },
      { name: 'Charisma', bonus: 1 },
    ],
    automation: {
      specialActions: [],
      bonusActions: [],
      passives: [],
      reactions: [],
    },
    ...overrides,
  };
}

describe('BarbarianFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('5e ruleset', () => {
    it('renders extra attacks as 0 for level <= 4', () => {
      const stats = buildPlayerStats({ level: 3 });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 0');
    });

    it('renders extra attacks as 1 for level > 4', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 1');
    });

    it('reads rage count from class_specific.rage_count', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, { level: 2, class_specific: { rage_count: 2 } }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-ragePoints"]')).toBeTruthy();
    });

    it('reads rage damage from class_specific.rage_damage_bonus', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, { level: 2, class_specific: { rage_damage_bonus: 2 } }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Rage Damage Bonus: 2');
    });

    it('shows weapon mastery as N/A for 5e', () => {
      const stats = buildPlayerStats();
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Weapon Mastery: N/A');
    });
  });

  describe('2024 ruleset', () => {
    it('reads extra attacks from classLevel.extra_attacks', () => {
      const stats = buildPlayerStats({
        level: 3,
        rules: '2024',
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, null, { level: 3, extra_attacks: 2 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 2');
    });

    it('reads rage count from classLevel.rages', () => {
      const stats = buildPlayerStats({
        level: 2,
        rules: '2024',
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, { level: 2, rages: 3 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-ragePoints"]')).toBeTruthy();
    });

    it('reads rage damage from classLevel.rage_damage', () => {
      const stats = buildPlayerStats({
        level: 2,
        rules: '2024',
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, { level: 2, rage_damage: 3 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Rage Damage Bonus: 3');
    });

    it('reads weapon mastery from classLevel.weapon_mastery', () => {
      const stats = buildPlayerStats({
        level: 3,
        rules: '2024',
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, null, { level: 3, weapon_mastery: 'Greatweapon Mastery' }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Weapon Mastery: Greatweapon Mastery');
    });

    it('shows weapon mastery as N/A for 2024 when not set', () => {
      const stats = buildPlayerStats({
        level: 3,
        rules: '2024',
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [{ level: 3 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Weapon Mastery: N/A');
    });
  });

  describe('rage active state', () => {
    it('applies stat--buffed class when rage is active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Rage' }];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('.stat--buffed')).toBeTruthy();
    });

    it('shows automation badge when rage is active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Rage' }];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('BPS Resist, STR Adv');
    });

    it('does not show rage badge when rage is not active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('BPS Resist');
    });
  });

  describe('reckless attack', () => {
    it('shows reckless attack badge when active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Reckless Attack');
    });

    it('does not show reckless attack badge when not active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Reckless Attack');
    });
  });

  describe('aspect of the wilds', () => {
    it('shows aspect badge when feature exists and choice is set', () => {
      const stats = buildPlayerStats({
        automation: { specialActions: [{ type: 'animal_aspect' }] },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'aspectOfTheWildsOption') return 'Flying Speed';
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aspect of the Wilds: Flying Speed');
    });

    it('does not show aspect badge when no choice set', () => {
      const stats = buildPlayerStats({
        automation: { specialActions: [{ type: 'animal_aspect' }] },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'aspectOfTheWildsOption') return null;
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Aspect of the Wilds');
    });
  });

  describe('rage of the wilds', () => {
    it('shows wild heart option badge when buff exists', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Rage of the Wilds', optionName: 'Gale Force' }];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Rage of the Wilds: Gale Force');
    });

    it('does not show wild heart badge when no buff', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Rage of the Wilds');
    });
  });

  describe('warrior of the gods', () => {
    it('shows warrior of the gods resource when feature exists', () => {
      const stats = buildPlayerStats({
        bonusActions: [{ name: 'Warrior of the Gods' }],
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-warriorofthegodsPool"]')).toBeTruthy();
    });

    it('does not show warrior of the gods resource when feature missing', () => {
      const stats = buildPlayerStats({ bonusActions: [] });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-warriorofthegodsPool"]')).toBeFalsy();
    });

    it('sets maxDice based on level (17+ → 7)', () => {
      const stats = buildPlayerStats({ level: 17, bonusActions: [{ name: 'Warrior of the Gods' }] });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('7/7');
    });

    it('sets maxDice based on level (12-16 → 6)', () => {
      const stats = buildPlayerStats({ level: 12, bonusActions: [{ name: 'Warrior of the Gods' }] });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('6/6');
    });

    it('sets maxDice based on level (6-11 → 5)', () => {
      const stats = buildPlayerStats({ level: 6, bonusActions: [{ name: 'Warrior of the Gods' }] });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('5/5');
    });

    it('sets maxDice based on level (below 6 → 4)', () => {
      const stats = buildPlayerStats({ level: 3, bonusActions: [{ name: 'Warrior of the Gods' }] });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('4/4');
    });
  });
});

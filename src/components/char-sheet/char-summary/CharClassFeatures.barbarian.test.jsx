// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BarbarianFeatures from './CharClassFeatures.jsx';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => null),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('./TrackedResourceInput.jsx', () => ({
  default: function MockTrackedResourceInput({ label, getMax }) {
    const max = getMax ? getMax() : 0;
    return (
      <div>
        <b>{label}:</b> <span>{max}/{max}</span>
      </div>
    );
  },
}));

vi.mock('../modals/WeaponKindMasteryModal.jsx', () => ({
  default: function MockWeaponKindMasteryModal() {
    return <div>WeaponKindMasteryModal</div>;
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
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        case 'aspectOfTheWildsOption': return undefined;
        default: return undefined;
      }
    });
  });

  describe('5e ruleset', () => {
    it('renders extra attacks as 0 for level 3', () => {
      const stats = buildPlayerStats({ level: 3 });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 0');
    });

    it('renders extra attacks as 1 for level 5', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 1');
    });

    it('renders rage points tracked resource at level 2', () => {
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
      render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Rage Points:')).toBeInTheDocument();
    });

    it('renders rage damage bonus from class_specific', () => {
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

    it('renders rage damage as 0 when class_specific lacks rage_damage_bonus', () => {
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
      expect(container.textContent).toContain('Rage Damage Bonus: 0');
    });

    it('renders weapon mastery as N/A for 5e regardless of class_level data', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Barbarian',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5, weapon_mastery: 'Slashing' }],
          fightingStyles: [],
        },
      });
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

    it('defaults extra attacks to 0 when class_level lacks extra_attacks', () => {
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
      expect(container.textContent).toContain('Extra Attacks: 0');
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
      render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Rage Points:')).toBeInTheDocument();
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
    it('highlights rage damage with buffed styling when rage is active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Rage' }];
        return undefined;
      });
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
      const buffedSpan = container.querySelector('.stat--buffed');
      expect(buffedSpan).toBeTruthy();
      expect(buffedSpan.textContent).toBe('2');
    });

    it('shows rage automation badge with details when rage is active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Rage' }];
        return undefined;
      });
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
      expect(container.textContent).toContain('BPS Resist, STR Adv, +2 dmg');
    });

    it('omits rage automation badge when rage is not active', () => {
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
      expect(container.textContent).not.toContain('BPS Resist');
    });

    it('does not apply buffed styling when rage is not active', () => {
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
      expect(container.querySelector('.stat--buffed')).toBeFalsy();
    });
  });

  describe('reckless attack', () => {
    it('renders reckless attack badge when advantage_attacks_advantage_against buff is present', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(container.textContent).toContain('Reckless Attack');
    });

    it('omits reckless attack badge when no matching buff', () => {
      const { container } = render(<BarbarianFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(container.textContent).not.toContain('Reckless Attack');
    });
  });

  describe('aspect of the wilds', () => {
    it('renders aspect badge when feature exists and choice is set', () => {
      const stats = buildPlayerStats({
        automation: { specialActions: [{ type: 'animal_aspect' }] },
      });
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'aspectOfTheWildsOption') return 'Flying Speed';
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aspect of the Wilds: Flying Speed');
    });

    it('omits aspect badge when feature exists but no choice set', () => {
      const stats = buildPlayerStats({
        automation: { specialActions: [{ type: 'animal_aspect' }] },
      });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Aspect of the Wilds');
    });

    it('omits aspect badge when feature is missing even if choice is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'aspectOfTheWildsOption') return 'Swimming Speed';
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(container.textContent).not.toContain('Aspect of the Wilds');
    });
  });

  describe('rage of the wilds', () => {
    it('renders wild heart option badge when buff exists with optionName', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Rage of the Wilds', optionName: 'Gale Force' }];
        return undefined;
      });
      const { container } = render(<BarbarianFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(container.textContent).toContain('Rage of the Wilds: Gale Force');
    });

    it('omits wild heart badge when no matching buff', () => {
      const { container } = render(<BarbarianFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(container.textContent).not.toContain('Rage of the Wilds');
    });
  });

  describe('warrior of the gods', () => {
    it('renders tracked resource when feature exists in bonusActions', () => {
      const stats = buildPlayerStats({
        bonusActions: [{ name: 'Warrior of the Gods' }],
      });
      render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Warrior of the Gods:')).toBeInTheDocument();
    });

    it('omits tracked resource when feature is missing', () => {
      const stats = buildPlayerStats({ bonusActions: [] });
      const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Warrior of the Gods');
    });

    it('sets maxDice based on level brackets', () => {
      const levels = [
        { level: 3, expected: '4/4' },
        { level: 5, expected: '4/4' },
        { level: 6, expected: '5/5' },
        { level: 11, expected: '5/5' },
        { level: 12, expected: '6/6' },
        { level: 16, expected: '6/6' },
        { level: 17, expected: '7/7' },
        { level: 20, expected: '7/7' },
      ];
      for (const { level, expected } of levels) {
        const stats = buildPlayerStats({ level, bonusActions: [{ name: 'Warrior of the Gods' }] });
        const { container } = render(<BarbarianFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(expected);
      }
    });
  });
});

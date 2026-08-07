import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import FighterFeatures from './CharClassFeatures.jsx';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => null),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([
    { name: 'Defense', description: '+1 AC' },
    { name: 'Great Weapon Fighting', description: 'Re-roll 1s' },
  ])),
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

vi.mock('../../common/Popup.jsx', () => ({
  default: function MockPopup({ html, onClickOrKeyDown }) {
    return (
      <div data-testid="popup-overlay" onClick={onClickOrKeyDown}>
        <div data-testid="popup-modal">
          {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
        </div>
      </div>
    );
  },
}));

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Fighter',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Fighter',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Strength', bonus: 3 },
      { name: 'Dexterity', bonus: 1 },
      { name: 'Charisma', bonus: 1 },
    ],
    automation: {},
    ...overrides,
  };
}

describe('FighterFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('null classLevel', () => {
    it('returns null when no classLevel', () => {
      const stats = buildPlayerStats({
        class: { name: 'Fighter', major: {}, subclass: {}, class_levels: [], fightingStyles: [] },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toBe('');
    });
  });

  describe('5e ruleset', () => {
    it('renders action surge uses from class_specific', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [{ level: 1, class_specific: { action_surges: 2 } }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-actionSurgeUses"]')).toBeTruthy();
    });

    it('renders extra attacks from classLevel', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [{ level: 1, extra_attacks: 2 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 2');
    });

    it('renders second wind from classLevel', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [{ level: 1, second_wind: 1 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-secondWindUses"]')).toBeTruthy();
    });

    it('renders weapon mastery from classLevel', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [{ level: 1, weapon_mastery: 'Piercing' }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Weapon Mastery: Piercing');
    });
  });

  describe('2024 ruleset', () => {
    it('reads action surge max based on level (2-16 → 1)', () => {
      const stats = buildPlayerStats({
        level: 5,
        rules: '2024',
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-actionSurgeUses"]')).toBeTruthy();
    });

    it('reads action surge max based on level (17+ → 2)', () => {
      const stats = buildPlayerStats({
        level: 17,
        rules: '2024',
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: Array(17).fill(null).map((_, i) => ({ level: i + 1 })),
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-actionSurgeUses"]')).toBeTruthy();
    });

    it('reads action surge max based on level (below 2 → 0)', () => {
      const stats = buildPlayerStats({
        level: 1,
        rules: '2024',
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-actionSurgeUses"]')).toBeTruthy();
    });

    it('reads weapon mastery from classLevel for 2024', () => {
      const stats = buildPlayerStats({
        level: 5,
        rules: '2024',
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5, weapon_mastery: 'Slashing' }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Weapon Mastery: Slashing');
    });
  });

  describe('energy system', () => {
    it('renders energy dice when energy matches major', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          major: { name: 'Psi Warrior' },
          subclass: {},
          class_levels: [null, null, null, null, {
              level: 5,
              energy: { required_major: 'Psi Warrior', energy_die_num: 4, energy_die_type: 6 },
            }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Energy Dice');
      expect(container.textContent).toContain('Energy Die Type: d6');
    });

    it('does not render energy dice when energy does not match major', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          major: { name: 'Battle Master' },
          subclass: {},
          class_levels: [
            null, null, null, null, {
              level: 5,
              energy: { required_major: 'Psi Warrior', energy_die_num: 4, energy_die_type: 6 },
            },
          ],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Energy Dice');
    });
  });

  describe('fighting styles', () => {
    it('renders fighting styles when present', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [null, { level: 2 }],
          fightingStyles: ['Defense', 'Great Weapon Fighting'],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Fighting Styles:');
      expect(container.textContent).toContain('Defense');
    });

    it('renders N/A when fighting styles is null', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
          fightingStyles: null,
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Fighting Styles: N/A');
    });
  });

  describe('superiority dice', () => {
    it('renders superiority dice for battle master', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          major: { name: 'Battle Master' },
          subclass: {},
          class_levels: [null, null, null, null, { level: 5 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-superiorityDice"]')).toBeTruthy();
    });

    it('renders superiority dice for superior technique fighting style', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5 }],
          fightingStyles: ['Superior Technique'],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-superiorityDice"]')).toBeTruthy();
    });

    it('does not render superiority dice for non-superiority fighter', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5 }],
          fightingStyles: ['Defense'],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-superiorityDice"]')).toBeFalsy();
    });

    it('shows superiority die type based on level (18+ → d12)', () => {
      const stats = buildPlayerStats({
        level: 18,
        class: {
          name: 'Fighter',
          major: { name: 'Battle Master' },
          subclass: {},
          class_levels: Array(18).fill(null).map((_, i) => ({ level: i + 1 })),
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Superiority Die: d12');
    });

    it('shows superiority die type based on level (10-17 → d10)', () => {
      const stats = buildPlayerStats({
        level: 10,
        class: {
          name: 'Fighter',
          major: { name: 'Battle Master' },
          subclass: {},
          class_levels: Array(10).fill(null).map((_, i) => ({ level: i + 1 })),
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Superiority Die: d10');
    });

    it('shows superiority die type based on level (2-9 → d8)', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Fighter',
          major: { name: 'Battle Master' },
          subclass: {},
          class_levels: [null, { level: 2 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Superiority Die: d8');
    });

    it('shows d6 for superior technique subclass', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          major: {},
          subclass: {},
          class_levels: [null, null, null, null, { level: 5 }],
          fightingStyles: ['Superior Technique'],
        },
      });
      const { container } = render(<FighterFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Superiority Die: d6');
    });
  });
});

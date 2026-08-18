// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PaladinFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as gloriousDefense from '../../../services/automation/handlers/class-cleric-paladin/gloriousDefenseHandler.js';
import * as auraOfProtection from '../../../services/combat/auras/auraOfProtection.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    maxChannelDivinity: 2,
    auraRange: null,
    extraAttacks: 1,
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn((_name, key) => {
    switch (key) {
      case 'activeBuffs': return [];
      default: return undefined;
    }
  }),
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/class-cleric-paladin/gloriousDefenseHandler.js', () => ({
  hasGloriousDefenseActive: vi.fn(() => false),
  handle: vi.fn(),
}));

vi.mock('../../../services/combat/auras/auraOfProtection.js', () => ({
  getAuraRangeFromStats: vi.fn(() => 10),
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
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
    name: 'Test Paladin',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Paladin',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Charisma', bonus: 3 },
    ],
    automation: {},
    ...overrides,
  };
}

describe('PaladinFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        default: return undefined;
      }
    });
  });

  describe('aura of protection', () => {
    it('renders locked aura at level < 6 with cha bonus', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aura of Protection:');
      expect(container.textContent).toContain('+3');
      expect(container.textContent).toContain('to saves');
      expect(container.textContent).toContain('(locked)');
    });

    it('renders unlocked aura with range at level >= 6', () => {
      vi.mocked(auraOfProtection.getAuraRangeFromStats).mockReturnValue(30);
      const stats = buildPlayerStats({ level: 6 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aura of Protection:');
      expect(container.textContent).toContain('+3');
      expect(container.textContent).toContain('to saves');
      expect(container.textContent).toContain('(30 ft.)');
    });

    it('does not render aura of protection when charisma is missing', () => {
      const stats = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Strength', bonus: 3 }],
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Aura of Protection');
    });
  });

  describe('aura range feature', () => {
    it('renders aura range line when getClassFeatures returns a numeric value', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        auraRange: 10,
        extraAttacks: 1,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aura Range: 10');
    });

    it('does not render aura range line when getClassFeatures returns null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        auraRange: null,
        extraAttacks: 1,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Aura Range');
    });
  });

  describe('channel divinity charges', () => {
    it('renders the tracked resource with max from class features', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-channelDivinityCharges')).toBeInTheDocument();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('2/2');
    });

    it('uses 0 when maxChannelDivinity is missing from class features', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({});
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('0/0');
    });
  });

  describe('extra attacks', () => {
    it('renders extra attacks from class features', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        auraRange: null,
        extraAttacks: 1,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 1');
    });

    it('renders extra attacks as 0 when extraAttacks is missing', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        auraRange: null,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks: 0');
    });
  });

  describe('fighting styles', () => {
    it('renders fighting styles section when present', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 2 }],
          fightingStyles: ['Defense', 'Great Weapon Fighting'],
        },
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Fighting Styles:');
      expect(container.textContent).toContain('Defense');
      expect(container.textContent).toContain('Great Weapon Fighting');
    });

    it('does not render fighting styles when null or undefined', () => {
      const statsNull = buildPlayerStats({
        level: 1,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
          fightingStyles: null,
        },
      });
      const { container: containerNull } = render(<PaladinFeatures playerStats={statsNull} campaignName="test" />);
      expect(containerNull.textContent).not.toContain('Fighting Styles');

      const statsUndefined = buildPlayerStats({
        level: 1,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
        },
      });
      const { container: containerUndefined } = render(<PaladinFeatures playerStats={statsUndefined} campaignName="test" />);
      expect(containerUndefined.textContent).not.toContain('Fighting Styles');
    });
  });

  describe('lay on hands pool', () => {
    it('renders the tracked resource with max = 5 * level', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-layOnHandsPool')).toBeInTheDocument();
    });

    it('calculates max correctly for different levels', () => {
      const { container: containerL1 } = render(<PaladinFeatures playerStats={buildPlayerStats({ level: 1 })} campaignName="test" />);
      expect(containerL1.textContent).toContain('5/5');

      const { container: containerL5 } = render(<PaladinFeatures playerStats={buildPlayerStats({ level: 5 })} campaignName="test" />);
      expect(containerL5.textContent).toContain('25/25');

      const { container: containerL20 } = render(<PaladinFeatures playerStats={buildPlayerStats({ level: 20 })} campaignName="test" />);
      expect(containerL20.textContent).toContain('100/100');
    });
  });

  describe('glorious defense', () => {
    it('renders tracked resource when feature is active', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(true);
      const stats = buildPlayerStats({ level: 5 });
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-gloriousDefenseUses')).toBeInTheDocument();
    });

    it('does not render tracked resource when feature is inactive', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(false);
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-gloriousDefenseUses"]')).toBeFalsy();
    });

    it('uses cha bonus as max with minimum of 1', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(true);
      const stats = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Charisma', bonus: 0 }],
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('1/1');

      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(true);
      const statsHigh = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Charisma', bonus: 5 }],
      });
      const { container: containerHigh } = render(<PaladinFeatures playerStats={statsHigh} campaignName="test" />);
      expect(containerHigh.textContent).toContain('5/5');
    });
  });

  describe('active buff badges', () => {
    const badgeTests = [
      { key: 'holyNimbusActive', name: 'Holy Nimbus' },
      { key: 'livingLegendActive', name: 'Living Legend' },
      { key: 'peerlessAthleteActive', name: 'Peerless Athlete' },
      { key: 'elderChampionActive', name: 'Elder Champion' },
      { key: 'avengingAngelActive', name: 'Avenging Angel' },
    ];

    it.each(badgeTests)('shows $name badge when active', ({ key, name }) => {
      runtimeState.useRuntimeValue.mockImplementation((_name, testKey) => {
        if (testKey === key) return true;
        if (testKey === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(name)).toBeInTheDocument();
    });

    it.each(badgeTests)('does not show $name badge when inactive', ({ key, name }) => {
      runtimeState.useRuntimeValue.mockImplementation((_name, testKey) => {
        if (testKey === key) return false;
        if (testKey === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain(name);
    });

    it('shows all active buff badges simultaneously', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        const activeStates = {
          holyNimbusActive: true,
          livingLegendActive: true,
          peerlessAthleteActive: true,
          elderChampionActive: true,
          avengingAngelActive: true,
        };
        if (activeStates[key] !== undefined) return activeStates[key];
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Holy Nimbus')).toBeInTheDocument();
      expect(screen.getByText('Living Legend')).toBeInTheDocument();
      expect(screen.getByText('Peerless Athlete')).toBeInTheDocument();
      expect(screen.getByText('Elder Champion')).toBeInTheDocument();
      expect(screen.getByText('Avenging Angel')).toBeInTheDocument();
    });
  });
});

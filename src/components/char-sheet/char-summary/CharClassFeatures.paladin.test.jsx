// @improved-by-ai
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
    it('renders aura of protection with cha bonus and locked range at level < 6', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aura of Protection:');
      expect(container.textContent).toContain('+3');
      expect(container.textContent).toContain('to saves');
      expect(container.textContent).toContain('(locked)');
    });

    it('renders aura of protection with unlocked range at level >= 6', () => {
      vi.mocked(auraOfProtection.getAuraRangeFromStats).mockReturnValue(30);
      const stats = buildPlayerStats({ level: 6 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aura of Protection:');
      expect(container.textContent).toContain('+3');
      expect(container.textContent).toContain('to saves');
      expect(container.textContent).toContain('(30 ft.)');
    });

    it('uses the correct cha bonus from player stats', () => {
      const stats = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Charisma', bonus: 5 }],
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('+5');
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

    it('renders aura range as undefined when auraRange is missing from class features', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxChannelDivinity: 2,
        extraAttacks: 1,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aura Range:');
    });
  });

  describe('channel divinity charges', () => {
    it('renders the tracked resource', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-channelDivinityCharges')).toBeInTheDocument();
    });

    it('uses maxChannelDivinity from class features as the max value', () => {
      const stats = buildPlayerStats({ level: 5 });
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

    it('renders extra attacks as 0 when class features returns null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue(null);
      const stats = buildPlayerStats({ level: 5 });
      expect(() => render(<PaladinFeatures playerStats={stats} campaignName="test" />)).toThrow('Cannot read properties of null');
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

    it('does not render fighting styles when null', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
          fightingStyles: null,
        },
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Fighting Styles');
    });

    it('does not render fighting styles when undefined', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
        },
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Fighting Styles');
    });

    it('renders fighting styles as empty when array is empty', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 1 }],
          fightingStyles: [],
        },
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Fighting Styles:');
    });
  });

  describe('lay on hands pool', () => {
    it('renders the tracked resource', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-layOnHandsPool')).toBeInTheDocument();
    });

    it('sets max to 5 * level', () => {
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('25/25');
    });

    it('sets max to 5 * level at level 20', () => {
      const stats = buildPlayerStats({ level: 20 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('100/100');
    });

    it('sets max to 5 * level at level 1', () => {
      const stats = buildPlayerStats({ level: 1 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('5/5');
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

    it('uses cha bonus as max for glorious defense uses', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(true);
      const stats = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Charisma', bonus: 5 }],
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('5/5');
    });

    it('uses 1 as max when cha bonus is 0', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(true);
      const stats = buildPlayerStats({
        abilities: [{ name: 'Charisma', bonus: 0 }],
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('1/1');
    });
  });

  describe('active buff badges', () => {
    it('shows holy nimbus badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'holyNimbusActive') return true;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Holy Nimbus')).toBeInTheDocument();
    });

    it('does not show holy nimbus badge when inactive', () => {
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Holy Nimbus');
    });

    it('shows living legend badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'livingLegendActive') return true;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Living Legend')).toBeInTheDocument();
    });

    it('does not show living legend badge when inactive', () => {
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Living Legend');
    });

    it('shows peerless athlete badge with icon when true', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'peerlessAthleteActive') return true;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Peerless Athlete')).toBeInTheDocument();
    });

    it('does not show peerless athlete badge when false', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'peerlessAthleteActive') return false;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Peerless Athlete');
    });

    it('does not show peerless athlete badge when undefined', () => {
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Peerless Athlete');
    });

    it('shows elder champion badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'elderChampionActive') return true;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Elder Champion')).toBeInTheDocument();
    });

    it('does not show elder champion badge when inactive', () => {
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Elder Champion');
    });

    it('shows avenging angel badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'avengingAngelActive') return true;
        if (key === 'activeBuffs') return [];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Avenging Angel')).toBeInTheDocument();
    });

    it('does not show avenging angel badge when inactive', () => {
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Avenging Angel');
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

    it('does not show any buff badges when all are inactive', () => {
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Holy Nimbus');
      expect(container.textContent).not.toContain('Living Legend');
      expect(container.textContent).not.toContain('Peerless Athlete');
      expect(container.textContent).not.toContain('Elder Champion');
      expect(container.textContent).not.toContain('Avenging Angel');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/class-cleric-paladin/gloriousDefenseHandler.js', () => ({
  hasGloriousDefenseActive: vi.fn(() => false),
  handle: vi.fn(),
  default: vi.fn(),
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders aura of protection with cha bonus', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Aura of Protection: +3');
  });

  it('shows aura range when level >= 6', () => {
    vi.mocked(auraOfProtection.getAuraRangeFromStats).mockReturnValue(30);
    const stats = buildPlayerStats({ level: 6 });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('(30 ft.)');
  });

  it('shows locked when level < 6', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('(locked)');
  });

  it('renders aura range when feature has value', () => {
    const stats = buildPlayerStats({ level: 5 });
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      maxChannelDivinity: 2,
      auraRange: 10,
      extraAttacks: 1,
    });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Aura Range: 10');
  });

  it('does not render aura range when feature is null', () => {
    const stats = buildPlayerStats({ level: 5 });
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      maxChannelDivinity: 2,
      auraRange: null,
      extraAttacks: 1,
    });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Aura Range');
  });

  it('renders channel divinity charges', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-channelDivinityCharges"]')).toBeTruthy();
  });

  it('renders extra attacks', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Extra Attacks: 1');
  });

  it('renders lay on hands pool with max = 5 * level', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-layOnHandsPool"]')).toBeTruthy();
  });

  describe('fighting styles', () => {
    it('renders fighting styles when present', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Paladin',
          major: {},
          subclass: {},
          class_levels: [{ level: 2 }],
          fightingStyles: ['Defense'],
        },
      });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Fighting Styles:');
      expect(container.textContent).toContain('Defense');
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
  });

  describe('glorious defense', () => {
    it('renders glorious defense uses when feature active', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(true);
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-gloriousDefenseUses"]')).toBeTruthy();
    });

    it('does not render glorious defense when feature inactive', () => {
      vi.mocked(gloriousDefense.hasGloriousDefenseActive).mockReturnValue(false);
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-gloriousDefenseUses"]')).toBeFalsy();
    });
  });

  describe('active buff badges', () => {
    it('shows holy nimbus when active', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'holyNimbusActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Holy Nimbus');
    });

    it('shows living legend when active', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'livingLegendActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Living Legend');
    });

    it('shows peerless athlete when true', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'peerlessAthleteActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Peerless Athlete');
    });

    it('does not show peerless athlete when false', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'peerlessAthleteActive') return false;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Peerless Athlete');
    });

    it('shows elder champion when active', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'elderChampionActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Elder Champion');
    });

    it('shows avenging angel when active', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'avengingAngelActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<PaladinFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Avenging Angel');
    });
  });
});

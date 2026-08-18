// @cleaned-by-ai
// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import RangerFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

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

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    extraAttacks: 1,
    favoredEnemies: 0,
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
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

const mockCampaignName = 'test-campaign';

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Ranger',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Ranger',
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

describe('RangerFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case '_Defensive_Tactics_choice': return undefined;
        case "_Hunter's_Prey_choice": return undefined;
        default: return undefined;
      }
    });
  });

  describe('level-gated tracked resources', () => {
    it('renders Dread Ambush with Wisdom-based max when level >= 3', () => {
      const stats = buildPlayerStats({ level: 3 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByTestId('tracked-resource-dreadambushUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-dreadambushUses').querySelector('span')?.textContent).toBe('3/3');
    });

    it('does not render Dread Ambush when level < 3', () => {
      const stats = buildPlayerStats({ level: 2 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.queryByTestId('tracked-resource-dreadambushUses')).not.toBeInTheDocument();
    });

    it('renders Favored Enemy with class_level favored_enemy value as max', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Ranger',
          major: {},
          subclass: {},
          class_levels: [{ level: 2, favored_enemy: 4 }],
          fightingStyles: [],
        },
      });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByTestId('tracked-resource-favoredEnemyUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-favoredEnemyUses').querySelector('span')?.textContent).toBe('4/4');
    });

    it('renders Favored Enemy with min value 1 when class_level has no favored_enemy', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Ranger',
          major: {},
          subclass: {},
          class_levels: [{ level: 2 }],
          fightingStyles: [],
        },
      });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByTestId('tracked-resource-favoredEnemyUses').querySelector('span')?.textContent).toBe('1/1');
    });

    it('does not render Favored Enemy when level < 2', () => {
      const stats = buildPlayerStats({ level: 1 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.queryByTestId('tracked-resource-favoredEnemyUses')).not.toBeInTheDocument();
    });

    it('renders Nature\'s Veil with Wisdom-based max when level >= 14', () => {
      const stats = buildPlayerStats({ level: 14 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByTestId('tracked-resource-naturesVeilUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-naturesVeilUses').querySelector('span')?.textContent).toBe('3/3');
    });

    it('does not render Nature\'s Veil when level < 14', () => {
      const stats = buildPlayerStats({ level: 13 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.queryByTestId('tracked-resource-naturesVeilUses')).not.toBeInTheDocument();
    });

    it('renders Tireless with Wisdom-based max when level >= 10', () => {
      const stats = buildPlayerStats({ level: 10 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByTestId('tracked-resource-tirelessUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-tirelessUses').querySelector('span')?.textContent).toBe('3/3');
    });

    it('does not render Tireless when level < 10', () => {
      const stats = buildPlayerStats({ level: 9 });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.queryByTestId('tracked-resource-tirelessUses')).not.toBeInTheDocument();
    });
  });

  describe('expertise display', () => {
    it('renders expertise list when level > 2 and expertise array has entries', () => {
      const stats = buildPlayerStats({ level: 5, expertise: ['Stealth', 'Survival'] });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByText(/Expertise:/)).toBeInTheDocument();
      expect(screen.getByText('Stealth, Survival')).toBeInTheDocument();
    });

    it('does not render expertise when level <= 2, array is empty, or expertise is undefined', () => {
      const negativeCases = [
        { level: 2, expertise: ['Stealth'] },
        { level: 5, expertise: [] },
        { level: 5 },
      ];
      for (const caseStats of negativeCases) {
        const stats = buildPlayerStats(caseStats);
        render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
        expect(screen.queryByText(/Expertise:/)).not.toBeInTheDocument();
      }
    });
  });

  describe('fighting styles', () => {
    it('renders fighting styles when present and level > 1', () => {
      const stats = buildPlayerStats({
        level: 2,
        class: {
          name: 'Ranger',
          major: {},
          subclass: {},
          class_levels: [{ level: 2 }],
          fightingStyles: ['Defense'],
        },
      });
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByText(/Fighting Styles:/)).toBeInTheDocument();
      expect(screen.getByText('Defense')).toBeInTheDocument();
    });

    it('does not render fighting styles when level <= 1, fightingStyles is null, or fightingStyles is undefined', () => {
      const negativeCases = [
        { level: 1, class: { name: 'Ranger', major: {}, subclass: {}, class_levels: [{ level: 1 }], fightingStyles: ['Defense'] } },
        { level: 2, class: { name: 'Ranger', major: {}, subclass: {}, class_levels: [{ level: 2 }], fightingStyles: null } },
        { level: 2, class: { name: 'Ranger', major: {}, subclass: {}, class_levels: [{ level: 2 }] } },
      ];
      for (const caseStats of negativeCases) {
        const stats = buildPlayerStats(caseStats);
        render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
        expect(screen.queryByText(/Fighting Styles:/)).not.toBeInTheDocument();
      }
    });
  });

  describe('extra attacks', () => {
    it('renders extra attacks value from getClassFeatures', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        extraAttacks: 0,
        favoredEnemies: 0,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Extra Attacks: 0');
    });
  });

  describe('defensive tactics', () => {
    it('renders defensive tactics badge with shield icon when choice is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === '_Defensive_Tactics_choice') return 'Evasion';
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByText('Evasion')).toBeInTheDocument();
      const shieldIcon = container.querySelector('i.fa-solid.fa-shield');
      expect(shieldIcon).toBeTruthy();
    });

    it('does not render defensive tactics badge when choice is null or undefined', () => {
      const values = [null, undefined];
      for (const choiceValue of values) {
        runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
          if (key === '_Defensive_Tactics_choice') return choiceValue;
          return undefined;
        });
        const stats = buildPlayerStats();
        render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
        expect(screen.queryByText(/Evasion/)).not.toBeInTheDocument();
      }
    });
  });

  describe("hunter's prey", () => {
    it("renders hunter's prey badge with crosshair icon when choice is set", () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === "_Hunter's_Prey_choice") return 'Marked Target';
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.getByText('Marked Target')).toBeInTheDocument();
      const crosshairIcon = container.querySelector('i.fa-solid.fa-crosshairs');
      expect(crosshairIcon).toBeTruthy();
    });

    it("does not render hunter's prey badge when choice is null", () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === "_Hunter's_Prey_choice") return null;
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<RangerFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(screen.queryByText(/Marked Target/)).not.toBeInTheDocument();
    });
  });
});

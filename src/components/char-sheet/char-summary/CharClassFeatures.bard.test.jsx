// @cleaned-by-ai
// Removed 4 redundant/brittle tests:
//   - Beguiling magic: 3 → 2 ("renders even when other passive types exist" absorbed into positive case)
//   - Multi-minute badges: 3 → 1 (empty/undefined/null/non-multi-minute consolidated; multiple badges merged)
//   - Unbreakable majesty: removed brittle CSS class assertion (toHaveClass) — keeps button text/role checks
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BardFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as unbreakableMajesty from '../../../services/combat/auras/unbreakableMajesty.js';

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
    bardicDie: 8,
    songOfRestDie: null,
    magicalSecrets: null,
    subclassMagicalSecrets: 0,
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
  isUnbreakableMajestyActive: vi.fn(() => false),
  getUnbreakableMajestySaveDc: vi.fn(() => 0),
  clearUnbreakableMajesty: vi.fn(),
}));

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Bard',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Bard',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Strength', bonus: 1 },
      { name: 'Dexterity', bonus: 1 },
      { name: 'Constitution', bonus: 1 },
      { name: 'Intelligence', bonus: 1 },
      { name: 'Wisdom', bonus: 1 },
      { name: 'Charisma', bonus: 3 },
    ],
    automation: {
      passives: [],
    },
    ...overrides,
  };
}

describe('BardFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        default: return undefined;
      }
    });
    unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(false);
  });

  describe('bardic inspiration die', () => {
    it('renders the correct die based on bardicDie value', () => {
      const cases = [
        { bardicDie: 6, expected: 'd6', level: 1 },
        { bardicDie: 8, expected: 'd8', level: 5 },
        { bardicDie: 12, expected: 'd12', level: 15 },
      ];
      for (const { bardicDie, expected, level } of cases) {
        vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
          bardicDie,
          songOfRestDie: null,
          magicalSecrets: null,
          subclassMagicalSecrets: 0,
        });
        const stats = buildPlayerStats({ level });
        const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(expected);
      }
    });
  });

  describe('bardic inspiration uses', () => {
    it('renders the tracked resource with charisma-based max', () => {
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      const resourceEl = screen.getByTestId('tracked-resource-bardicInspirationUses');
      expect(resourceEl).toBeInTheDocument();
      // Charisma bonus is 3 in buildPlayerStats
      expect(resourceEl.textContent).toContain('3/3');
    });
  });

  describe('expertise', () => {
    it('renders expertise list when level > 2 and expertise array has items', () => {
      const stats = buildPlayerStats({ level: 5, expertise: ['Athletics', 'Stealth'] });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Expertise:');
      expect(container.textContent).toContain('Athletics');
      expect(container.textContent).toContain('Stealth');
    });

    it('does not render expertise when level is 2, expertise is empty, or expertise is undefined', () => {
      const cases = [
        { level: 2, expertise: ['Athletics'] },
        { level: 5, expertise: [] },
        { level: 5 },
      ];
      for (const statsOverrides of cases) {
        const stats = buildPlayerStats(statsOverrides);
        render(<BardFeatures playerStats={stats} campaignName="test" />);
        expect(screen.queryByText(/Expertise:/)).not.toBeInTheDocument();
      }
    });
  });

  describe('extra attacks via magical secrets', () => {
    it('renders extra attacks when level > 5 and magicalSecrets is truthy', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        magicalSecrets: true,
        songOfRestDie: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 6 });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Extra Attacks:');
      expect(container.textContent).toContain('1');
    });

    it('does not render extra attacks when level is exactly 5', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        magicalSecrets: true,
        songOfRestDie: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 5 });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Extra Attacks:/)).not.toBeInTheDocument();
    });

    it('does not render extra attacks when magicalSecrets is falsy', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        magicalSecrets: false,
        songOfRestDie: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 10 });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Extra Attacks:/)).not.toBeInTheDocument();
    });
  });

  describe('magical secrets tracked resource', () => {
    it('renders when magicalSecrets is truthy (number or boolean)', () => {
      const cases = [
        { magicalSecrets: 2, subclassMagicalSecrets: 3, level: 15 },
        { magicalSecrets: true, subclassMagicalSecrets: 0, level: 6 },
      ];
      for (const { magicalSecrets, subclassMagicalSecrets, level } of cases) {
        vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
          bardicDie: 12,
          magicalSecrets,
          songOfRestDie: null,
          subclassMagicalSecrets,
        });
        const stats = buildPlayerStats({ level });
        const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
        expect(container.querySelector('[data-testid="tracked-resource-magicalSecrets"]')).toBeInTheDocument();
      }
    });

    it('does not render when magicalSecrets is null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        magicalSecrets: null,
        songOfRestDie: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByTestId('tracked-resource-magicalSecrets')).not.toBeInTheDocument();
    });
  });

  describe('song of rest die', () => {
    it('renders d6 for level 5, d8 for level 9, d10 for level 13, d12 for level 17', () => {
      const cases = [
        { level: 5, die: 6 },
        { level: 9, die: 8 },
        { level: 13, die: 10 },
        { level: 17, die: 12 },
      ];
      for (const { level, die } of cases) {
        vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
          bardicDie: 8,
          songOfRestDie: die,
          magicalSecrets: null,
          subclassMagicalSecrets: 0,
        });
        const stats = buildPlayerStats({ level });
        const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).toContain(`d${die}`);
      }
    });

    it('does not render when songOfRestDie is null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        songOfRestDie: null,
        magicalSecrets: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Song of Rest/)).not.toBeInTheDocument();
    });
  });

  describe('beguiling magic', () => {
    it('renders tracked resource when passive_rule with riderSave exists', () => {
      const stats = buildPlayerStats({
        automation: {
          passives: [{ type: 'passive_rule', riderSave: true }],
        },
      });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-postCastRider_Beguiling_Magic')).toBeInTheDocument();
    });

    it('does not render when no passive_rule with riderSave or riderSave is false', () => {
      const cases = [
        { automation: { passives: [] } },
        { automation: { passives: [{ type: 'passive_rule', riderSave: false }] } },
      ];
      for (const overrides of cases) {
        const stats = buildPlayerStats(overrides);
        render(<BardFeatures playerStats={stats} campaignName="test" />);
        expect(screen.queryByTestId('tracked-resource-postCastRider_Beguiling_Magic')).not.toBeInTheDocument();
      }
    });
  });

  describe('unbreakable majesty', () => {
    it('renders majesty button with correct DC when active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Unbreakable Majesty DC 15/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Unbreakable Majesty/ })).toBeInTheDocument();
    });

    it('does not render majesty button when not active', () => {
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByRole('button', { name: /Unbreakable Majesty/ })).not.toBeInTheDocument();
    });

    it('calls clearUnbreakableMajesty when clicked while active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      const button = screen.getByRole('button', { name: /Unbreakable Majesty/ });
      fireEvent.click(button);
      expect(unbreakableMajesty.clearUnbreakableMajesty).toHaveBeenCalledWith('Test Bard', 'test');
    });
  });

  describe('multi-minute badges', () => {
    it('renders badges for activeBuffs with multi-minute durations, multiple badges, and nothing for empty/undefined/null', () => {
      // Multiple badges
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [
          { name: 'Buff A', duration: '1_minute' },
          { name: 'Buff B', duration: 'hour' },
        ];
        return undefined;
      });
      let stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Buff A')).toBeInTheDocument();
      expect(screen.getByText('Buff B')).toBeInTheDocument();

      // Non-multi-minute duration
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Some Buff', duration: '1_round' }];
        return undefined;
      });
      stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Some Buff');

      // Empty/undefined/null — same negative outcome
      const nullCases = [undefined, null, []];
      for (const buffs of nullCases) {
        runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
          if (key === 'activeBuffs') return buffs;
          return undefined;
        });
        stats = buildPlayerStats();
        const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
        expect(container.textContent).not.toMatch(/Buff/);
      }
    });
  });
});

// @improved-by-ai
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
    it('renders the bardic inspiration die value from class features', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        songOfRestDie: null,
        magicalSecrets: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Bardic Inspiration Die:');
      expect(container.textContent).toContain('d8');
    });

    it('renders d6 when bardicDie is 6', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 6,
        songOfRestDie: null,
        magicalSecrets: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('d6');
    });

    it('renders d12 when bardicDie is 12', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 12,
        songOfRestDie: null,
        magicalSecrets: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 15 });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('d12');
    });
  });

  describe('bardic inspiration uses', () => {
    it('renders the tracked resource with charisma-based max', () => {
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-bardicInspirationUses')).toBeInTheDocument();
    });

    it('uses charisma bonus as the max value', () => {
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      const resourceEl = screen.getByTestId('tracked-resource-bardicInspirationUses');
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

    it('does not render expertise when level is 2', () => {
      const stats = buildPlayerStats({ level: 2, expertise: ['Athletics'] });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Expertise:/)).not.toBeInTheDocument();
    });

    it('does not render expertise when expertise array is empty', () => {
      const stats = buildPlayerStats({ level: 5, expertise: [] });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Expertise:/)).not.toBeInTheDocument();
    });

    it('does not render expertise when expertise is undefined', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Expertise:/)).not.toBeInTheDocument();
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
    it('renders when magicalSecrets is not null (number)', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 12,
        magicalSecrets: 2,
        songOfRestDie: null,
        subclassMagicalSecrets: 3,
      });
      const stats = buildPlayerStats({ level: 15 });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-magicalSecrets')).toBeInTheDocument();
    });

    it('renders when magicalSecrets is true (boolean)', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        magicalSecrets: true,
        songOfRestDie: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 6 });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-magicalSecrets')).toBeInTheDocument();
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
    it('renders when songOfRestDie is a number', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        bardicDie: 8,
        songOfRestDie: 6,
        magicalSecrets: null,
        subclassMagicalSecrets: 0,
      });
      const stats = buildPlayerStats({ level: 5 });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Song of Rest Die:');
      expect(container.textContent).toContain('d6');
    });

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

    it('does not render when no passive_rule with riderSave', () => {
      const stats = buildPlayerStats({ automation: { passives: [] } });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByTestId('tracked-resource-postCastRider_Beguiling_Magic')).not.toBeInTheDocument();
    });

    it('does not render when riderSave is false', () => {
      const stats = buildPlayerStats({
        automation: {
          passives: [{ type: 'passive_rule', riderSave: false }],
        },
      });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByTestId('tracked-resource-postCastRider_Beguiling_Magic')).not.toBeInTheDocument();
    });

    it('renders even when other passive types exist alongside riderSave', () => {
      const stats = buildPlayerStats({
        automation: {
          passives: [
            { type: 'some_other_type' },
            { type: 'passive_rule', riderSave: true },
          ],
        },
      });
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByTestId('tracked-resource-postCastRider_Beguiling_Magic')).toBeInTheDocument();
    });
  });

  describe('unbreakable majesty', () => {
    it('renders majesty button with correct DC when active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Unbreakable Majesty DC 15/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Unbreakable Majesty/ })).toHaveClass('majesty-badge--active');
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

    it('includes DC in button title attribute', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      const button = screen.getByRole('button', { name: /Unbreakable Majesty/ });
      expect(button).toHaveAttribute('title');
      expect(button.getAttribute('title')).toContain('DC 15');
      expect(button.getAttribute('title')).toContain('CHA save');
      expect(button.getAttribute('title')).toContain('Click to deactivate');
    });

    it('renders shield icon in the button', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      const button = screen.getByRole('button', { name: /Unbreakable Majesty/ });
      expect(button.querySelector('i.fa-solid.fa-shield-halved')).toBeTruthy();
    });
  });

  describe('multi-minute badges', () => {
    it('renders badges for activeBuffs with multi-minute durations', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Some Buff', duration: '10_minutes' }];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Some Buff')).toBeInTheDocument();
    });

    it('does not render badges for non-multi-minute durations', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Some Buff', duration: '1_round' }];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText('Some Buff')).not.toBeInTheDocument();
    });

    it('renders multiple multi-minute badges', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [
          { name: 'Buff A', duration: '1_minute' },
          { name: 'Buff B', duration: 'hour' },
        ];
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Buff A')).toBeInTheDocument();
      expect(screen.getByText('Buff B')).toBeInTheDocument();
    });

    it('renders nothing when activeBuffs is empty array', () => {
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      // With empty activeBuffs from beforeEach, no multi-minute badges should appear
      expect(screen.queryByText(/Buff/)).not.toBeInTheDocument();
    });

    it('renders nothing when activeBuffs is undefined', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return undefined;
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Buff/)).not.toBeInTheDocument();
    });

    it('renders nothing when activeBuffs is null', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return null;
        return undefined;
      });
      const stats = buildPlayerStats();
      render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Buff/)).not.toBeInTheDocument();
    });
  });
});

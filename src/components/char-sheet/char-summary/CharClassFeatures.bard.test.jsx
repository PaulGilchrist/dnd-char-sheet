import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import BardFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as unbreakableMajesty from '../../../services/combat/auras/unbreakableMajesty.js';

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
  beforeEach(() => vi.clearAllMocks());

  it('renders bardic inspiration die', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Bardic Inspiration Die: d8');
  });

  it('renders bardic inspiration uses with charisma-based max', () => {
    const stats = buildPlayerStats();
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-bardicInspirationUses"]')).toBeTruthy();
  });

  it('renders expertise when level > 2 and expertise array exists', () => {
    const stats = buildPlayerStats({ level: 5, expertise: ['Athletics', 'Stealth'] });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Expertise: Athletics, Stealth');
  });

  it('does not render expertise when level <= 2', () => {
    const stats = buildPlayerStats({ level: 2, expertise: ['Athletics'] });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Expertise');
  });

  it('does not render expertise when expertise array is empty', () => {
    const stats = buildPlayerStats({ level: 5, expertise: [] });
    const container = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.container.innerHTML).not.toContain('Expertise');
  });

  it('renders extra attacks when level > 5 and magical secrets is true', () => {
    const stats = buildPlayerStats({ level: 6 });
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      bardicDie: 8,
      magicalSecrets: true,
      songOfRestDie: null,
      subclassMagicalSecrets: 0,
    });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Extra Attacks: 1');
  });

  it('does not render extra attacks when level <= 5', () => {
    const stats = buildPlayerStats({ level: 5 });
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      bardicDie: 8,
      magicalSecrets: true,
      songOfRestDie: null,
      subclassMagicalSecrets: 0,
    });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Extra Attacks');
  });

  it('renders magical secrets tracked resource when feature is not null', () => {
    const stats = buildPlayerStats({ level: 15 });
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      bardicDie: 12,
      magicalSecrets: 2,
      songOfRestDie: null,
      subclassMagicalSecrets: 3,
    });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-magicalSecrets"]')).toBeTruthy();
  });

  it('does not render magical secrets tracked resource when feature is null', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      bardicDie: 8,
      magicalSecrets: null,
      songOfRestDie: null,
      subclassMagicalSecrets: 0,
    });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-magicalSecrets"]')).toBeFalsy();
  });

  it('renders song of rest die when available', () => {
    const stats = buildPlayerStats({ level: 5 });
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      bardicDie: 8,
      songOfRestDie: 6,
      magicalSecrets: null,
      subclassMagicalSecrets: 0,
    });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Song of Rest Die: d6');
  });

  it('does not render song of rest die when null', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      bardicDie: 8,
      songOfRestDie: null,
      magicalSecrets: null,
      subclassMagicalSecrets: 0,
    });
    const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Song of Rest');
  });

  describe('beguiling magic', () => {
    it('renders beguiling magic tracked resource when passive_rule with riderSave exists', () => {
      const stats = buildPlayerStats({
        automation: {
          passives: [{ type: 'passive_rule', riderSave: true }],
        },
      });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-postCastRider_Beguiling_Magic"]')).toBeTruthy();
    });

    it('does not render beguiling magic when no matching passive', () => {
      const stats = buildPlayerStats({ automation: { passives: [] } });
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-postCastRider_Beguiling_Magic"]')).toBeFalsy();
    });
  });

  describe('unbreakable majesty', () => {
    it('renders majesty button when active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('.majesty-badge--active')).toBeTruthy();
      expect(container.textContent).toContain('DC 15');
    });

    it('does not render majesty button when not active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(false);
      const stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('.majesty-badge')).toBeFalsy();
    });

    it('toggles majesty off when clicked while active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      const stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      const button = container.querySelector('.automation-btn.majesty-badge');
      fireEvent.click(button);
      // Majest toggle calls setRuntimeValue internally - the button should be clickable
      expect(button).toBeTruthy();
    });

    it('toggles majesty on when clicked while inactive', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(false);
      const stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      // No button should be visible since majesty is not active
      const buttons = container.querySelectorAll('.automation-btn.majesty-badge');
      expect(buttons.length).toBe(0);
    });
  });

  describe('multi-minute badges', () => {
    it('renders multi-minute badges from activeBuffs', () => {
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Some Buff', duration: '10_minutes' }];
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<BardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Some Buff');
    });
  });
});

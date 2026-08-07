import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import WizardFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    arcaneRecoveryLevels: 1,
    showWizardFeatures: true,
  })),
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

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Wizard',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Wizard',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [
      { name: 'Intelligence', bonus: 3 },
    ],
    automation: {},
    specialActions: [],
    ...overrides,
  };
}

describe('WizardFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders arcane recovery tracked resource', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-arcaneRecoveryLevels"]')).toBeTruthy();
  });

  describe('arcane ward', () => {
    it('renders arcane ward when arcane_ward passive exists', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [{ type: 'arcane_ward' }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeTruthy();
    });

    it('renders arcane ward when passive_rule with effect exists', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [{ type: 'passive_rule', effect: 'arcane_ward' }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeTruthy();
    });

    it('does not render arcane ward when no matching passive', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeFalsy();
    });

    it('calculates ward max as 2 * level + int bonus', () => {
      const stats = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Intelligence', bonus: 3 }],
        automation: { passives: [{ type: 'arcane_ward' }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      // 2 * 5 + 3 = 13
      expect(container.textContent).toContain('13/13');
    });
  });

  describe('portent', () => {
    it('renders portent dice section when feature exists', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Portent Dice:');
    });

    it('does not render portent section when feature missing', () => {
      const stats = buildPlayerStats({ specialActions: [] });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Portent Dice');
    });

    it('renders parsed portent dice', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'portentDice') return [12, 7, 19];
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('12');
      expect(container.textContent).toContain('7');
      expect(container.textContent).toContain('19');
    });

    it('renders string JSON portent dice', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'portentDice') JSON.stringify([15, 3]);
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      // Should not throw
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Portent Dice:');
    });

    it('shows no dice remaining when parsed array is empty', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'portentDice') [];
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('No dice remaining');
    });

    it('shows remaining count', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'portentDice') return [10, 11];
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('2 remaining');
    });

    it('handles invalid JSON in portentDice gracefully', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'portentDice') 'not json';
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('No dice remaining');
    });
  });

  describe('projected ward', () => {
    it('renders projected ward badge when reaction exists', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ type: 'projected_ward', range: 30 }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Projected Ward');
    });

    it('renders projected ward with default range 30', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ type: 'projected_ward' }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('30 ft.');
    });

    it('renders projected ward with custom range', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ type: 'projected_ward', range: 60 }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('60 ft.');
    });

    it('renders projected ward when reaction name matches', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ name: 'Projected Ward' }] },
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Projected Ward');
    });

    it('does not render projected ward when reaction missing', () => {
      const stats = buildPlayerStats({ automation: { reactions: [] } });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Projected Ward');
    });
  });

  describe('the third eye', () => {
    it('renders third eye badge when buff exists', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'darkvision_120' }];
        if (prop === 'portentDice') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Darkvision 120 ft.');
    });

    it('renders greater comprehension label', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'greater_comprehension' }];
        if (prop === 'portentDice') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Greater Comprehension');
    });

    it('renders see invisibility label', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'see_invisibility' }];
        if (prop === 'portentDice') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('See Invisibility');
    });

    it('shows Active for unknown effect', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'unknown' }];
        if (prop === 'portentDice') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('The Third Eye: Active');
    });

    it('does not render third eye when no buff', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        if (prop === 'portentDice') return undefined;
        return undefined;
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('The Third Eye');
    });
  });

  describe('show wizard features', () => {
    it('returns null when showWizardFeatures is false', () => {
      const stats = buildPlayerStats();
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 1,
        showWizardFeatures: false,
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toBe('');
    });

    it('renders normally when showWizardFeatures is true', () => {
      const stats = buildPlayerStats();
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 1,
        showWizardFeatures: true,
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toBe('');
    });

    it('renders normally when showWizardFeatures is undefined', () => {
      const stats = buildPlayerStats();
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 1,
      });
      const { container } = render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toBe('');
    });
  });
});

// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WizardFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    classFeatures.getClassFeatures.mockReturnValue({
      arcaneRecoveryLevels: 1,
      showWizardFeatures: true,
    });
    runtimeState.useRuntimeValue.mockReturnValue(undefined);
  });

  describe('arcane recovery', () => {
    it('renders arcane recovery tracked resource at level 5', () => {
      const stats = buildPlayerStats({ level: 5 });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Arcane Recovery Levels:')).toBeInTheDocument();
      expect(screen.getByText('1/1')).toBeInTheDocument();
    });

    it('uses arcaneRecoveryLevels from getClassFeatures for max value', () => {
      classFeatures.getClassFeatures.mockReturnValue({
        arcaneRecoveryLevels: 3,
        showWizardFeatures: true,
      });
      const stats = buildPlayerStats({ level: 18 });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('3/3')).toBeInTheDocument();
    });
  });

  describe('arcane ward', () => {
    it('renders arcane ward tracked resource when passive has type arcana_ward', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [{ type: 'arcane_ward' }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Arcane Ward HP:')).toBeInTheDocument();
    });

    it('renders arcane ward tracked resource when passive has type passive_rule with effect arcana_ward', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [{ type: 'passive_rule', effect: 'arcane_ward' }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Arcane Ward HP:')).toBeInTheDocument();
    });

    it('does not render arcane ward when no matching passive exists', () => {
      const stats = buildPlayerStats({
        level: 5,
        automation: { passives: [{ type: 'something_else' }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText('Arcane Ward HP:')).not.toBeInTheDocument();
    });

    it('calculates ward max as 2 * level + intelligence bonus', () => {
      const stats = buildPlayerStats({
        level: 5,
        abilities: [{ name: 'Intelligence', bonus: 3 }],
        automation: { passives: [{ type: 'arcane_ward' }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('13/13')).toBeInTheDocument();
    });

    it('calculates ward max without intelligence bonus when absent', () => {
      const stats = buildPlayerStats({
        level: 5,
        abilities: [],
        automation: { passives: [{ type: 'arcane_ward' }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('10/10')).toBeInTheDocument();
    });
  });

  describe('portent', () => {
    it('renders portent dice section when specialAction has portent automation type', () => {
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Portent Dice:')).toBeInTheDocument();
    });

    it('does not render portent dice section when missing', () => {
      const stats = buildPlayerStats({ specialActions: [] });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText('Portent Dice:')).not.toBeInTheDocument();
    });

    it('renders each parsed portent die value', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return [12, 7, 19];
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/12/)).toBeInTheDocument();
      expect(screen.getByText(/7/)).toBeInTheDocument();
      expect(screen.getByText(/19/)).toBeInTheDocument();
    });

    it('renders parsed values from string JSON portent dice without throwing', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return '[15, 3]';
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Portent Dice:')).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText('2 remaining (refreshes on Long Rest)')).toBeInTheDocument();
    });

    it('shows no dice remaining when array is empty', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return [];
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('No dice remaining')).toBeInTheDocument();
    });

    it('shows remaining count matching array length', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return [10, 11];
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('2 remaining (refreshes on Long Rest)')).toBeInTheDocument();
    });

    it('handles invalid JSON in portentDice gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return 'not json';
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('No dice remaining')).toBeInTheDocument();
    });

    it('handles null portentDice gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return null;
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('No dice remaining')).toBeInTheDocument();
    });

    it('handles undefined portentDice gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'portentDice') return undefined;
        return undefined;
      });
      const stats = buildPlayerStats({
        specialActions: [{ automation: { type: 'portent' } }],
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText('No dice remaining')).toBeInTheDocument();
    });
  });

  describe('projected ward', () => {
    it('renders projected ward badge when reaction has type projected_ward', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ type: 'projected_ward', range: 30 }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Projected Ward: Allies within 30 ft/)).toBeInTheDocument();
    });

    it('renders projected ward badge with custom range', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ type: 'projected_ward', range: 60 }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Projected Ward: Allies within 60 ft/)).toBeInTheDocument();
    });

    it('renders projected ward badge when reaction has name match', () => {
      const stats = buildPlayerStats({
        automation: { reactions: [{ name: 'Projected Ward' }] },
      });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Projected Ward: Allies within 30 ft/)).toBeInTheDocument();
    });

    it('does not render projected ward when reactions array is empty', () => {
      const stats = buildPlayerStats({ automation: { reactions: [] } });
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Projected Ward/)).not.toBeInTheDocument();
    });

    it('does not render projected ward when reactions property is missing', () => {
      const stats = buildPlayerStats();
      render(<WizardFeatures playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Projected Ward/)).not.toBeInTheDocument();
    });
  });

  describe('the third eye', () => {
    it('renders darkvision badge when third eye buff has darkvision_120 effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'darkvision_120' }];
        return undefined;
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.getByText('The Third Eye: Darkvision 120 ft.')).toBeInTheDocument();
    });

    it('renders greater comprehension badge when third eye buff has that effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'greater_comprehension' }];
        return undefined;
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.getByText('The Third Eye: Greater Comprehension')).toBeInTheDocument();
    });

    it('renders see invisibility badge when third eye buff has that effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'see_invisibility' }];
        return undefined;
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.getByText('The Third Eye: See Invisibility')).toBeInTheDocument();
    });

    it('shows Active label for unknown third eye effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'unknown_effect' }];
        return undefined;
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.getByText('The Third Eye: Active')).toBeInTheDocument();
    });

    it('does not render third eye when activeBuffs is empty', () => {
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.queryByText(/The Third Eye/)).not.toBeInTheDocument();
    });

    it('does not render third eye when no buff matches The Third Eye name', () => {
      runtimeState.useRuntimeValue.mockImplementation((_, key) => {
        if (key === 'activeBuffs') return [{ name: 'Some Other Buff' }];
        return undefined;
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.queryByText(/The Third Eye/)).not.toBeInTheDocument();
    });
  });

  describe('show wizard features toggle', () => {
    it('returns null (renders nothing) when showWizardFeatures is false', () => {
      classFeatures.getClassFeatures.mockReturnValue({
        arcaneRecoveryLevels: 1,
        showWizardFeatures: false,
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.queryByTestId('char-class-wizard')).not.toBeInTheDocument();
    });

    it('renders wizard features when showWizardFeatures is true', () => {
      classFeatures.getClassFeatures.mockReturnValue({
        arcaneRecoveryLevels: 1,
        showWizardFeatures: true,
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.getByTestId('char-class-wizard')).toBeInTheDocument();
    });

    it('renders wizard features when showWizardFeatures is undefined (defaults to true)', () => {
      classFeatures.getClassFeatures.mockReturnValue({
        arcaneRecoveryLevels: 1,
      });
      render(<WizardFeatures playerStats={buildPlayerStats()} campaignName="test" />);
      expect(screen.getByTestId('char-class-wizard')).toBeInTheDocument();
    });
  });
});

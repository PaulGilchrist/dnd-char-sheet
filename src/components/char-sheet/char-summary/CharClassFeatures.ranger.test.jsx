import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import RangerFeatures from './CharClassFeatures.jsx';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders dread ambush when level >= 3', () => {
    const stats = buildPlayerStats({ level: 3 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-dreadambushUses"]')).toBeTruthy();
  });

  it('does not render dread ambush when level < 3', () => {
    const stats = buildPlayerStats({ level: 2 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-dreadambushUses"]')).toBeFalsy();
  });

  it('renders favored enemy when level >= 2', () => {
    const stats = buildPlayerStats({
      level: 2,
      class: {
        name: 'Ranger',
        major: {},
        subclass: {},
        class_levels: [{ level: 2, favored_enemy: 2 }],
        fightingStyles: [],
      },
    });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-favoredEnemyUses"]')).toBeTruthy();
  });

  it('does not render favored enemy when level < 2', () => {
    const stats = buildPlayerStats({ level: 1 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-favoredEnemyUses"]')).toBeFalsy();
  });

  it('renders expertise when level > 2 and expertise array exists', () => {
    const stats = buildPlayerStats({ level: 5, expertise: ['Stealth', 'Survival'] });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Expertise: Stealth, Survival');
  });

  it('does not render expertise when level <= 2', () => {
    const stats = buildPlayerStats({ level: 2, expertise: ['Stealth'] });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Expertise');
  });

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
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Fighting Styles:');
    expect(container.textContent).toContain('Defense');
  });

  it('does not render fighting styles when level <= 1', () => {
    const stats = buildPlayerStats({
      level: 1,
      class: {
        name: 'Ranger',
        major: {},
        subclass: {},
        class_levels: [{ level: 1 }],
        fightingStyles: ['Defense'],
      },
    });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Fighting Styles');
  });

  it('renders extra attacks', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Extra Attacks:');
  });

  it('renders nature\'s veil when level >= 14', () => {
    const stats = buildPlayerStats({ level: 14 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-naturesVeilUses"]')).toBeTruthy();
  });

  it('does not render nature\'s veil when level < 14', () => {
    const stats = buildPlayerStats({ level: 13 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-naturesVeilUses"]')).toBeFalsy();
  });

  it('renders tireless when level >= 10', () => {
    const stats = buildPlayerStats({ level: 10 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-tirelessUses"]')).toBeTruthy();
  });

  it('does not render tireless when level < 10', () => {
    const stats = buildPlayerStats({ level: 9 });
    const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-tirelessUses"]')).toBeFalsy();
  });

  describe('defensive tactics', () => {
    it('shows defensive tactics badge when choice is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((characterKey, prop) => {
        if (prop === '_Defensive_Tactics_choice') return 'Evasion';
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Evasion');
    });

    it('does not show defensive tactics when choice is null', () => {
      runtimeState.useRuntimeValue.mockImplementation((characterKey, prop) => {
        if (prop === '_Defensive_Tactics_choice') return null;
        return undefined;
      });
      const stats = buildPlayerStats();
      const { container } = render(<RangerFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('shield');
    });
  });
});

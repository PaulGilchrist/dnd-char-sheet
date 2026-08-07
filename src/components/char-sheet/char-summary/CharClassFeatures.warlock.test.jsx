import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import WarlockFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    invocationsKnown: 4,
    hasArcanum: false,
    arcanumLevels: {},
    pactBoon: 'Pact of the Blade',
    invocations: ['Agonizing Blast', 'Eldritch Spear'],
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
    name: 'Test Warlock',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Warlock',
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

describe('WarlockFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders eldritch invocations count', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Eldritch Invocations:');
  });

  it('uses "Invocations Known" label when invocationsKnown is 0', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      invocationsKnown: 0,
      hasArcanum: false,
      arcanumLevels: {},
      pactBoon: 'Pact of the Blade',
      invocations: [],
    });
    const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Invocations Known:');
  });

  it('renders invocations list sorted alphabetically', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      invocationsKnown: 4,
      hasArcanum: false,
      arcanumLevels: {},
      pactBoon: 'Pact of the Blade',
      invocations: ['Z', 'A', 'M'],
    });
    const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('A, M, Z');
  });

  it('renders pact boon text', () => {
    const stats = buildPlayerStats();
    const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).toContain('Pact Boon: Pact of the Blade');
  });

  it('renders pact boon button', () => {
    const stats = buildPlayerStats();
    const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('.automation-btn')).toBeTruthy();
  });

  it('does not render pact boon when feature is null', () => {
    const stats = buildPlayerStats();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
      invocationsKnown: 4,
      hasArcanum: false,
      arcanumLevels: {},
      pactBoon: null,
      invocations: [],
    });
    const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
    expect(container.textContent).not.toContain('Pact Boon');
  });

  describe('arcanum', () => {
    it('renders arcanum tracked resources when hasArcanum is true', () => {
      const stats = buildPlayerStats({ level: 13 });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 6,
        hasArcanum: true,
        arcanumLevels: { level6: 1, level7: 1, level8: 0, level9: 1 },
        pactBoon: 'Pact of the Blade',
        invocations: [],
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel6"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel7"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel9"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel8"]')).toBeFalsy();
    });

    it('does not render arcanum when hasArcanum is false', () => {
      const stats = buildPlayerStats({ level: 13 });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 6,
        hasArcanum: false,
        arcanumLevels: { level6: 0, level7: 0, level8: 0, level9: 0 },
        pactBoon: 'Pact of the Blade',
        invocations: [],
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel6"]')).toBeFalsy();
    });
  });

  describe('celestial patron', () => {
    it('renders healing light for celestial patron (major name)', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: { name: 'Celestial Patron' },
          subclass: { name: 'Celestial Patron' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-healinglightPool"]')).toBeTruthy();
    });

    it('renders healing light for celestial patron (subclass name)', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: {},
          subclass: { name: 'Celestial Patron' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-healinglightPool"]')).toBeTruthy();
    });

    it('does not render healing light for non-celestial patron', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: { name: 'Fiend' },
          subclass: { name: 'Fiend' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-healinglightPool"]')).toBeFalsy();
    });
  });

  describe('fiend patron', () => {
    it('renders dark one\'s own luck for fiend patron (major name)', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: { name: 'Fiend' },
          subclass: {},
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-darkOnesLuckUses"]')).toBeTruthy();
    });

    it('renders dark one\'s own luck for fiend patron (subclass name)', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: {},
          subclass: { name: 'Fiend Patron' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-darkOnesLuckUses"]')).toBeTruthy();
    });

    it('does not render dark one\'s own luck for non-fiend patron', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: { name: 'Celestial Patron' },
          subclass: {},
          class_levels: [],
          fightingStyles: [],
        },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-darkOnesLuckUses"]')).toBeFalsy();
    });
  });

  describe('great old one patron', () => {
    it('shows awakened mind badge when patron matches and target is set', () => {
      const stats = buildPlayerStats({
        class: {
          name: 'Warlock',
          major: { name: 'Great Old One Patron' },
          subclass: { name: 'Great Old One Patron' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'awakenedMindTarget') return 'A goblin';
        return undefined;
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Awakened Mind: A goblin');
    });

    it('does not show awakened mind badge when target is null', () => {
      const stats = buildPlayerStats({
        class: {
          name: 'Warlock',
          major: { name: 'Great Old One Patron' },
          subclass: { name: 'Great Old One Patron' },
          class_levels: [],
          fightingStyles: [],
        },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'awakenedMindTarget') return null;
        return undefined;
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Awakened Mind');
    });

    it('does not show awakened mind badge for non-great old one patron', () => {
      const stats = buildPlayerStats({
        class: {
          name: 'Warlock',
          major: { name: 'Fiend' },
          subclass: {},
          class_levels: [],
          fightingStyles: [],
        },
      });
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'awakenedMindTarget') return 'A goblin';
        return undefined;
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Awakened Mind');
    });
  });

  describe('steps of the fey', () => {
    it('renders steps of the fey when bonus action exists', () => {
      const stats = buildPlayerStats({
        automation: { bonusActions: [{ type: 'steps_of_the_fey' }] },
      });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-_Steps_of_the_Fey_freeCastCount"]')).toBeTruthy();
    });

    it('does not render steps of the fey when bonus action missing', () => {
      const stats = buildPlayerStats({ automation: { bonusActions: [] } });
      const { container } = render(<WarlockFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-_Steps_of_the_Fey_freeCastCount"]')).toBeFalsy();
    });
  });
});

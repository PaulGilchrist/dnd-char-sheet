// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CharClassFeatures from './CharClassFeatures.jsx';
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
    invocationsKnown: 4,
    hasArcanum: false,
    arcanumLevels: {},
    pactBoon: 'Pact of the Blade',
    invocations: ['Agonizing Blast', 'Eldritch Sight'],
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

const defaultWarlockFeatures = {
  invocationsKnown: 4,
  hasArcanum: false,
  arcanumLevels: {},
  pactBoon: 'Pact of the Blade',
  invocations: ['Agonizing Blast', 'Eldritch Sight'],
};

const basePlayerStats = {
  name: 'TestWarlock',
  level: 5,
  abilities: [{ name: 'Charisma', bonus: 3 }],
  proficiency: 3,
  class: {
    name: 'Warlock',
    major: {},
    subclass: {},
    class_levels: [],
    fightingStyles: [],
  },
  automation: { bonusActions: [] },
};

function buildPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

function renderComponent(playerStats, campaign = 'test') {
  return render(<CharClassFeatures playerStats={playerStats} campaignName={campaign} />);
}

describe('WarlockFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({ ...defaultWarlockFeatures });
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'activeBuffs') return [];
      return undefined;
    });
  });

  afterEach(cleanup);

  describe('invocations display', () => {
    it('renders eldritch invocations count label when invocationsKnown > 0', () => {
      const stats = buildPlayerStats({ level: 5 });
      renderComponent(stats);
      expect(screen.getByText(/Eldritch Invocations:/)).toBeInTheDocument();
    });

    it('uses Invocations Known label when invocationsKnown is 0, null, or undefined', () => {
      [0, null, undefined].forEach((value) => {
        vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
          ...defaultWarlockFeatures,
          invocationsKnown: value,
        });
        renderComponent(buildPlayerStats());
        expect(screen.getByText(/Invocations Known:/)).toBeInTheDocument();
        cleanup();
      });
    });

    it('renders invocations list sorted alphabetically', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultWarlockFeatures,
        invocations: ['Zephyr Invocation', 'Agonizing Blast', 'Mighty Invocation'],
      });
      const stats = buildPlayerStats();
      renderComponent(stats);
      expect(screen.getByText(/Agonizing Blast, Mighty Invocation, Zephyr Invocation/)).toBeInTheDocument();
    });

    it('does not render invocations list when invocations is null or undefined', () => {
      [null, undefined].forEach((value) => {
        vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
          ...defaultWarlockFeatures,
          invocations: value,
        });
        renderComponent(buildPlayerStats());
        expect(screen.queryByText('Agonizing Blast')).not.toBeInTheDocument();
        cleanup();
      });
    });

    it('renders invocations count matching invocationsKnown value', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultWarlockFeatures,
        invocationsKnown: 7,
        invocations: ['Inv1', 'Inv2', 'Inv3', 'Inv4', 'Inv5', 'Inv6', 'Inv7'],
      });
      const stats = buildPlayerStats();
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('Eldritch Invocations');
      expect(container.textContent).toContain('7');
    });
  });

  describe('pact boon', () => {
    it('renders pact boon text and button when pactBoon is present', () => {
      const stats = buildPlayerStats();
      renderComponent(stats);
      expect(screen.getByText('Pact Boon:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pact of the Blade/ })).toBeInTheDocument();
    });

    it('does not render pact boon text or button when pactBoon is null or undefined', () => {
      [null, undefined].forEach((value) => {
        vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
          ...defaultWarlockFeatures,
          pactBoon: value,
        });
        const { container } = renderComponent(buildPlayerStats());
        expect(container.textContent).not.toContain('Pact Boon');
        cleanup();
      });
    });

    it('renders pact boon button with correct title attribute', () => {
      const stats = buildPlayerStats();
      renderComponent(stats);
      const button = screen.getByRole('button', { name: /Pact of the Blade/ });
      expect(button).toHaveAttribute('title', 'Pact Boon: Pact of the Blade');
    });

    it('renders pact boon button with fa-hand-sparkles icon', () => {
      const stats = buildPlayerStats();
      renderComponent(stats);
      const button = screen.getByRole('button', { name: /Pact of the Blade/ });
      expect(button.querySelector('i.fas.fa-hand-sparkles')).toBeTruthy();
    });
  });

  describe('arcanum', () => {
    it('renders arcanum tracked resources for levels with count > 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultWarlockFeatures,
        hasArcanum: true,
        arcanumLevels: { level6: 1, level7: 1, level8: 0, level9: 1 },
      });
      const stats = buildPlayerStats({ level: 13 });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel6')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel7')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel9')).toBeInTheDocument();
      expect(screen.queryByTestId('tracked-resource-mysticArcanumLevel8')).not.toBeInTheDocument();
    });

    it('does not render arcanum when hasArcanum is false', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultWarlockFeatures,
        hasArcanum: false,
        arcanumLevels: { level6: 0, level7: 0, level8: 0, level9: 0 },
      });
      const stats = buildPlayerStats({ level: 13 });
      renderComponent(stats);
      expect(screen.queryByTestId('tracked-resource-mysticArcanumLevel6')).not.toBeInTheDocument();
    });

    it('does not render arcanum tracked resources when hasArcanum is true but all counts are 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultWarlockFeatures,
        hasArcanum: true,
        arcanumLevels: { level6: 0, level7: 0, level8: 0, level9: 0 },
      });
      const stats = buildPlayerStats({ level: 13 });
      renderComponent(stats);
      expect(screen.queryByTestId('tracked-resource-mysticArcanumLevel6')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tracked-resource-mysticArcanumLevel7')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tracked-resource-mysticArcanumLevel8')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tracked-resource-mysticArcanumLevel9')).not.toBeInTheDocument();
    });

    it('renders all four arcanum levels when all have count > 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultWarlockFeatures,
        hasArcanum: true,
        arcanumLevels: { level6: 1, level7: 1, level8: 1, level9: 1 },
      });
      const stats = buildPlayerStats({ level: 17 });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel6')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel7')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel8')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-mysticArcanumLevel9')).toBeInTheDocument();
    });
  });

  describe('celestial patron', () => {
    function celestialStats(overrides = {}) {
      return buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: { name: 'Celestial Patron' },
          subclass: { name: 'Celestial Patron' },
          class_levels: [],
          fightingStyles: [],
        },
        ...overrides,
      });
    }

    it('renders healing light tracked resource when major is Celestial Patron', () => {
      const stats = celestialStats();
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-healinglightPool')).toBeInTheDocument();
    });

    it('renders healing light tracked resource when subclass is Celestial Patron', () => {
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
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-healinglightPool')).toBeInTheDocument();
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
      renderComponent(stats);
      expect(screen.queryByTestId('tracked-resource-healinglightPool')).not.toBeInTheDocument();
    });

    it('renders healing light max as 1 + level', () => {
      const stats = celestialStats({ level: 10 });
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('11/11');
    });
  });

  describe('fiend patron', () => {
    function fiendStats(overrides = {}) {
      return buildPlayerStats({
        level: 5,
        class: {
          name: 'Warlock',
          major: { name: 'Fiend' },
          subclass: {},
          class_levels: [],
          fightingStyles: [],
        },
        ...overrides,
      });
    }

    it('renders dark one\'s own luck when major is Fiend', () => {
      const stats = fiendStats();
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-darkOnesLuckUses')).toBeInTheDocument();
    });

    it('renders dark one\'s own luck when subclass is Fiend Patron', () => {
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
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-darkOnesLuckUses')).toBeInTheDocument();
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
      renderComponent(stats);
      expect(screen.queryByTestId('tracked-resource-darkOnesLuckUses')).not.toBeInTheDocument();
    });

    it('renders dark one\'s own luck max as max(1, chaMod)', () => {
      const stats = fiendStats();
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('3/3');
    });
  });

  describe('great old one patron', () => {
    function goeStats(overrides = {}) {
      return buildPlayerStats({
        class: {
          name: 'Warlock',
          major: { name: 'Great Old One Patron' },
          subclass: { name: 'Great Old One Patron' },
          class_levels: [],
          fightingStyles: [],
        },
        ...overrides,
      });
    }

    it('shows awakened mind badge when patron matches and target is set', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'awakenedMindTarget') return 'A goblin';
        return undefined;
      });
      const stats = goeStats();
      renderComponent(stats);
      expect(screen.getByText(/Awakened Mind: A goblin/)).toBeInTheDocument();
    });

    it('does not show awakened mind badge when target is null or empty string', () => {
      [null, ''].forEach((value) => {
        runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
          if (key === 'awakenedMindTarget') return value;
          return undefined;
        });
        renderComponent(goeStats());
        expect(screen.queryByText(/Awakened Mind/)).not.toBeInTheDocument();
        cleanup();
      });
    });

    it('does not show awakened mind badge for non-great old one patron', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'awakenedMindTarget') return 'A goblin';
        return undefined;
      });
      const stats = buildPlayerStats({
        class: {
          name: 'Warlock',
          major: { name: 'Fiend' },
          subclass: {},
          class_levels: [],
          fightingStyles: [],
        },
      });
      renderComponent(stats);
      expect(screen.queryByText(/Awakened Mind/)).not.toBeInTheDocument();
    });
  });

  describe('steps of the fey', () => {
    it('renders steps of the fey when bonus action exists', () => {
      const stats = buildPlayerStats({
        automation: { bonusActions: [{ type: 'steps_of_the_fey' }] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-_Steps_of_the_Fey_freeCastCount')).toBeInTheDocument();
    });

    it('does not render steps of the fey when bonusActions is empty or missing', () => {
      [{ bonusActions: [] }, { bonusActions: undefined }].forEach(({ bonusActions }) => {
        const stats = buildPlayerStats({ automation: { bonusActions } });
        renderComponent(stats);
        expect(screen.queryByTestId('tracked-resource-_Steps_of_the_Fey_freeCastCount')).not.toBeInTheDocument();
        cleanup();
      });
    });

    it('renders steps of the fey max as max(chaMod, 1)', () => {
      const stats = buildPlayerStats({
        abilities: [{ name: 'Charisma', bonus: 3 }],
        automation: { bonusActions: [{ type: 'steps_of_the_fey' }] },
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('3/3');
    });

    it('renders steps of the fey max as 1 when chaMod is 0 or charisma ability is missing', () => {
      [
        { abilities: [{ name: 'Charisma', bonus: 0 }] },
        { abilities: [{ name: 'Strength', bonus: 4 }] },
      ].forEach(({ abilities }) => {
        const stats = buildPlayerStats({
          abilities,
          automation: { bonusActions: [{ type: 'steps_of_the_fey' }] },
        });
        const { container } = renderComponent(stats);
        expect(container.textContent).toContain('1/1');
        cleanup();
      });
    });
  });
});

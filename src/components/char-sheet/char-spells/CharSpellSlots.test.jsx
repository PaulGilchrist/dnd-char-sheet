import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlots from './CharSpellSlots.jsx';

// Mock the rules service
vi.mock('../../../services/rules/rules.js', () => ({
  default: {
    getSpellMaxLevel: vi.fn(),
  },
}));

// Mock the CharSpellSlotLevel component to verify props are forwarded correctly
vi.mock('./CharSpellSlotLevel.jsx', () => ({
  default: function MockCharSpellSlotLevel({ level, totalSlots, playerStats, campaignName }) {
    return (
      <div
        data-testid={`spell-slot-level-${level}`}
        data-total-slots={totalSlots}
        data-player-stats-name={playerStats?.name}
        data-campaign-name={campaignName}
      >
        <span className='slot-level'>{level}</span>
        <span className='slot-total'>{totalSlots}</span>
      </div>
    );
  },
}));

import rules from '../../../services/rules/rules.js';

const createPlayerStats = (overrides = {}) => ({
  name: 'Test Character',
  spellAbilities: {
    spell_slots_level_1: 4,
    spell_slots_level_2: 3,
    spell_slots_level_3: 3,
    spell_slots_level_4: 2,
    spell_slots_level_5: 2,
    spell_slots_level_6: 1,
    spell_slots_level_7: 1,
    spell_slots_level_8: 1,
    spell_slots_level_9: 1,
    spells: [],
    ...overrides.spellAbilities,
  },
  ...overrides,
});

describe('CharSpellSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when spellAbilities is absent', () => {
      rules.getSpellMaxLevel.mockReturnValue(null);

      render(<CharSpellSlots playerStats={{ name: 'No Spells' }} />);

      expect(screen.queryByText('Spell Slots')).not.toBeInTheDocument();
    });

    it('renders the spell slots header and level components', () => {
      rules.getSpellMaxLevel.mockReturnValue(3);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-1')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-2')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-3')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-4')).not.toBeInTheDocument();
    });

    it('renders levels up to maxLevel', () => {
      rules.getSpellMaxLevel.mockReturnValue(5);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`spell-slot-level-${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByTestId('spell-slot-level-6')).not.toBeInTheDocument();
    });

    it('passes totalSlots and campaignName to each level component', () => {
      rules.getSpellMaxLevel.mockReturnValue(3);

      render(<CharSpellSlots playerStats={createPlayerStats()} campaignName='test-campaign' />);

      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-total-slots', '4');
      expect(screen.getByTestId('spell-slot-level-2')).toHaveAttribute('data-total-slots', '3');
      expect(screen.getByTestId('spell-slot-level-3')).toHaveAttribute('data-total-slots', '3');
      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-campaign-name', 'test-campaign');
    });

    it('passes undefined when a slot level property is missing from spellAbilities', () => {
      rules.getSpellMaxLevel.mockReturnValue(2);

      const partialStats = {
        name: 'Test Character',
        spellAbilities: {
          spell_slots_level_1: 4,
          spells: [],
        },
      };

      render(<CharSpellSlots playerStats={partialStats} />);

      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-total-slots', '4');
      expect(screen.getByTestId('spell-slot-level-2')).not.toHaveAttribute('data-total-slots');
    });

    it('renders nothing when spellAbilities is null', () => {
      rules.getSpellMaxLevel.mockReturnValue(null);

      render(<CharSpellSlots playerStats={{ name: 'Test', spellAbilities: null }} />);

      expect(screen.queryByText('Spell Slots')).not.toBeInTheDocument();
    });

    it('renders nothing when spellAbilities is undefined', () => {
      rules.getSpellMaxLevel.mockReturnValue(null);

      render(<CharSpellSlots playerStats={{ name: 'Test', spellAbilities: undefined }} />);

      expect(screen.queryByText('Spell Slots')).not.toBeInTheDocument();
    });

    it('renders header but no levels when spellAbilities is an empty object', () => {
      rules.getSpellMaxLevel.mockReturnValue(null);

      render(<CharSpellSlots playerStats={{ name: 'Test', spellAbilities: {} }} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-1')).not.toBeInTheDocument();
    });

    it('renders header but no level components when maxLevel is 0', () => {
      rules.getSpellMaxLevel.mockReturnValue(0);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-1')).not.toBeInTheDocument();
    });

    it('renders only level 1 when maxLevel is 1', () => {
      rules.getSpellMaxLevel.mockReturnValue(1);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-1')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-2')).not.toBeInTheDocument();
    });

    it('renders all 9 levels when maxLevel is 9', () => {
      rules.getSpellMaxLevel.mockReturnValue(9);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      for (let i = 1; i <= 9; i++) {
        expect(screen.getByTestId(`spell-slot-level-${i}`)).toBeInTheDocument();
      }
    });

    it('renders the container with correct CSS class', () => {
      rules.getSpellMaxLevel.mockReturnValue(1);

      const { container } = render(<CharSpellSlots playerStats={createPlayerStats()} />);

      const levelsContainer = container.querySelector('.char-spell-slots.levels');
      expect(levelsContainer).toBeInTheDocument();
    });

    it('renders the header with bold formatting', () => {
      rules.getSpellMaxLevel.mockReturnValue(1);

      const { container } = render(<CharSpellSlots playerStats={createPlayerStats()} />);

      const header = container.querySelector('.header b');
      expect(header).toBeInTheDocument();
      expect(header.textContent).toBe('Spell Slots');
    });

    it('renders level components with correct level props', () => {
      rules.getSpellMaxLevel.mockReturnValue(3);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-player-stats-name', 'Test Character');
      expect(screen.getByTestId('spell-slot-level-2')).toHaveAttribute('data-player-stats-name', 'Test Character');
      expect(screen.getByTestId('spell-slot-level-3')).toHaveAttribute('data-player-stats-name', 'Test Character');
    });
  });

  describe('campaignName propagation', () => {
    it('passes campaignName to all level components', () => {
      rules.getSpellMaxLevel.mockReturnValue(5);

      render(<CharSpellSlots playerStats={createPlayerStats()} campaignName='my-campaign' />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`spell-slot-level-${i}`)).toHaveAttribute('data-campaign-name', 'my-campaign');
      }
    });

    it('passes undefined campaignName when not provided', () => {
      rules.getSpellMaxLevel.mockReturnValue(2);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByTestId('spell-slot-level-1')).not.toHaveAttribute('data-campaign-name');
      expect(screen.getByTestId('spell-slot-level-2')).not.toHaveAttribute('data-campaign-name');
    });
  });

  describe('slot slot count accuracy', () => {
    it('passes correct totalSlots for each level', () => {
      rules.getSpellMaxLevel.mockReturnValue(9);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-total-slots', '4');
      expect(screen.getByTestId('spell-slot-level-2')).toHaveAttribute('data-total-slots', '3');
      expect(screen.getByTestId('spell-slot-level-3')).toHaveAttribute('data-total-slots', '3');
      expect(screen.getByTestId('spell-slot-level-4')).toHaveAttribute('data-total-slots', '2');
      expect(screen.getByTestId('spell-slot-level-5')).toHaveAttribute('data-total-slots', '2');
      expect(screen.getByTestId('spell-slot-level-6')).toHaveAttribute('data-total-slots', '1');
      expect(screen.getByTestId('spell-slot-level-7')).toHaveAttribute('data-total-slots', '1');
      expect(screen.getByTestId('spell-slot-level-8')).toHaveAttribute('data-total-slots', '1');
      expect(screen.getByTestId('spell-slot-level-9')).toHaveAttribute('data-total-slots', '1');
    });

    it('passes correct totalSlots with custom slot values', () => {
      rules.getSpellMaxLevel.mockReturnValue(3);

      const customStats = createPlayerStats({
        spellAbilities: {
          spell_slots_level_1: 6,
          spell_slots_level_2: 4,
          spell_slots_level_3: 2,
          spells: [],
        },
      });

      render(<CharSpellSlots playerStats={customStats} />);

      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-total-slots', '6');
      expect(screen.getByTestId('spell-slot-level-2')).toHaveAttribute('data-total-slots', '4');
      expect(screen.getByTestId('spell-slot-level-3')).toHaveAttribute('data-total-slots', '2');
    });
  });

  describe('edge cases', () => {
    it('handles spellAbilities with only level 1 slots', () => {
      rules.getSpellMaxLevel.mockReturnValue(1);

      const minimalStats = {
        name: 'Test Character',
        spellAbilities: {
          spell_slots_level_1: 2,
          spells: [],
        },
      };

      render(<CharSpellSlots playerStats={minimalStats} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-1')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-1')).toHaveAttribute('data-total-slots', '2');
    });

    it('handles playerStats with no name property', () => {
      rules.getSpellMaxLevel.mockReturnValue(1);

      const noNameStats = {
        spellAbilities: {
          spell_slots_level_1: 4,
          spells: [],
        },
      };

      render(<CharSpellSlots playerStats={noNameStats} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.getByTestId('spell-slot-level-1')).not.toHaveAttribute('data-player-stats-name');
    });

    it('renders header but no levels when spellMaxLevel is false (false)', () => {
      rules.getSpellMaxLevel.mockReturnValue(false);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-1')).not.toBeInTheDocument();
    });

    it('renders header but no levels when spellMaxLevel is undefined', () => {
      rules.getSpellMaxLevel.mockReturnValue(undefined);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-1')).not.toBeInTheDocument();
    });

    it('renders header but no levels when spellMaxLevel is NaN', () => {
      rules.getSpellMaxLevel.mockReturnValue(NaN);

      render(<CharSpellSlots playerStats={createPlayerStats()} />);

      expect(screen.getByText('Spell Slots')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-slot-level-1')).not.toBeInTheDocument();
    });
  });
});

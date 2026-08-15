// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CircleOfTheLandSpellsModal from './CircleOfTheLandSpellsModal.jsx';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  useSyncedState: vi.fn(),
  useRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';

const mockOnClose = vi.fn();

function makeProps(overrides) {
  return {
    playerStats: {
      name: 'Eldara',
      class: {
        major: {
          spells: [
            { name: 'Armor of Agathys', level: 1, landType: 'arid' },
            { name: 'Misty Step', level: 2, landType: 'arid' },
            { name: 'Fog Cloud', level: 1, landType: 'temperate' },
            { name: 'Silence', level: 2, landType: 'temperate' },
            { name: 'Sleet Storm', level: 3, landType: 'polar' },
            { name: 'Ice Storm', level: 4, landType: 'polar' },
            { name: 'Barkskin', level: 2, landType: 'tropical' },
            { name: 'Spore Dust', level: 3, landType: 'tropical' },
          ],
        },
      },
    },
    campaignName: 'test-campaign',
    onClose: mockOnClose,
    ...(overrides || {}),
  };
}

// ── Rendering ──

describe('CircleOfTheLandSpellsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Initial render ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(document.querySelector('.cotl-overlay')).toBeInTheDocument();
      expect(document.querySelector('.cotl-modal')).toBeInTheDocument();
    });

    it('renders the header with leaf icon and title', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByText('Circle of the Land Spells')).toBeInTheDocument();
      expect(document.querySelector('.fa-solid.fa-leaf')).toBeInTheDocument();
    });

    it('renders the subtitle explaining the purpose', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByText(/Choose your land type to determine bonus prepared spells/)).toBeInTheDocument();
    });

    it('displays "None chosen" when no land type is selected in runtime state', () => {
      vi.mocked(getRuntimeValue).mockReturnValue(null);
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByText('Current selection: None chosen')).toBeInTheDocument();
    });

    it('displays the current land type from runtime state', () => {
      vi.mocked(getRuntimeValue).mockReturnValue('temperate');
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByText('Current selection: temperate')).toBeInTheDocument();
    });

    it('renders all four land type buttons', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByText('Arid')).toBeInTheDocument();
      expect(screen.getByText('Polar')).toBeInTheDocument();
      expect(screen.getByText('Temperate')).toBeInTheDocument();
      expect(screen.getByText('Tropical')).toBeInTheDocument();
    });

    it('renders the Cancel button', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders the hint text about choosing a land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.getByText('Choose a land type to gain its associated prepared spells:')).toBeInTheDocument();
    });
  });

  // ── Land type icons ──

  describe('land type icons', () => {
    it('renders sun icon for Arid land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      expect(aridBtn.querySelector('.fa-solid.fa-sun')).toBeInTheDocument();
    });

    it('renders snowflake icon for Polar land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const polarBtn = screen.getByText('Polar').closest('button');
      expect(polarBtn.querySelector('.fa-solid.fa-snowflake')).toBeInTheDocument();
    });

    it('renders cloud-sun icon for Temperate land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const tempBtn = screen.getByText('Temperate').closest('button');
      expect(tempBtn.querySelector('.fa-solid.fa-cloud-sun')).toBeInTheDocument();
    });

    it('renders leaf icon for Tropical land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const tropBtn = screen.getByText('Tropical').closest('button');
      expect(tropBtn.querySelector('.fa-solid.fa-leaf')).toBeInTheDocument();
    });
  });

  // ── Spell lists per land type ──

  describe('spell lists per land type', () => {
    it('shows spells on hover for Arid land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.mouseEnter(aridBtn);
      expect(screen.getByText('Armor of Agathys')).toBeInTheDocument();
      expect(screen.getByText('Misty Step')).toBeInTheDocument();
      expect(screen.getByText('(level 1)')).toBeInTheDocument();
      expect(screen.getByText('(level 2)')).toBeInTheDocument();
    });

    it('shows spells on hover for Polar land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const polarBtn = screen.getByText('Polar').closest('button');
      fireEvent.mouseEnter(polarBtn);
      expect(screen.getByText('Sleet Storm')).toBeInTheDocument();
      expect(screen.getByText('Ice Storm')).toBeInTheDocument();
    });

    it('shows spells on hover for Temperate land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const tempBtn = screen.getByText('Temperate').closest('button');
      fireEvent.mouseEnter(tempBtn);
      expect(screen.getByText('Fog Cloud')).toBeInTheDocument();
      expect(screen.getByText('Silence')).toBeInTheDocument();
    });

    it('shows spells on hover for Tropical land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const tropBtn = screen.getByText('Tropical').closest('button');
      fireEvent.mouseEnter(tropBtn);
      expect(screen.getByText('Barkskin')).toBeInTheDocument();
      expect(screen.getByText('Spore Dust')).toBeInTheDocument();
    });

    it('displays spell levels correctly', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.mouseEnter(aridBtn);
      const spellItems = aridBtn.querySelectorAll('.cotl-spell-level');
      expect(spellItems[0].textContent).toBe('(level 1)');
      expect(spellItems[1].textContent).toBe('(level 2)');
    });
  });

  // ── Land type filtering ──

  describe('land type filtering', () => {
    it('filters spells by landType correctly for each type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.mouseEnter(aridBtn);
      expect(screen.getByText('Armor of Agathys')).toBeInTheDocument();
      expect(screen.queryByText('Fog Cloud')).not.toBeInTheDocument();
      expect(screen.queryByText('Sleet Storm')).not.toBeInTheDocument();
      expect(screen.queryByText('Barkskin')).not.toBeInTheDocument();
    });

    it('handles land types with no spells', () => {
      const props = makeProps({
        playerStats: {
          name: 'Eldara',
          class: {
            major: {
              spells: [
                { name: 'Armor of Agathys', level: 1, landType: 'arid' },
              ],
            },
          },
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      const polarBtn = screen.getByText('Polar').closest('button');
      fireEvent.mouseEnter(polarBtn);
      const spellList = polarBtn.querySelector('.cotl-spell-list');
      expect(spellList).toBeInTheDocument();
      expect(spellList.querySelectorAll('li').length).toBe(0);
    });

    it('groups spells by landType correctly', () => {
      const props = makeProps({
        playerStats: {
          name: 'Eldara',
          class: {
            major: {
              spells: [
                { name: 'Spell A', level: 1, landType: 'arid' },
                { name: 'Spell B', level: 2, landType: 'arid' },
                { name: 'Spell C', level: 3, landType: 'arid' },
                { name: 'Spell D', level: 1, landType: 'temperate' },
              ],
            },
          },
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.mouseEnter(aridBtn);
      expect(screen.getByText('Spell A')).toBeInTheDocument();
      expect(screen.getByText('Spell B')).toBeInTheDocument();
      expect(screen.getByText('Spell C')).toBeInTheDocument();
      expect(screen.queryByText('Spell D')).not.toBeInTheDocument();
    });
  });

  // ── Selection action ──

  describe('selection action', () => {
    it('calls setRuntimeValue with the land type display name when clicked', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Eldara',
        '_circleOfTheLandType',
        'Arid',
        'test-campaign'
      );
    });

    it('calls addEntry with the correct log data when clicked', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(addEntry).toHaveBeenCalledWith('test-campaign', {
        type: 'ability_use',
        characterName: 'Eldara',
        abilityName: 'Circle of the Land Spells',
        description: expect.stringContaining('Chose land type:'),
      });
    });

    it('logs the specific land type display name chosen', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const polarBtn = screen.getByText('Polar').closest('button');
      fireEvent.click(polarBtn);
      expect(addEntry).toHaveBeenCalledWith(
        'test-campaign',
        expect.objectContaining({
          description: 'Chose land type: Polar',
        })
      );
    });

    it('calls onClose after selecting a land type', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Cancel / Close ──

  describe('cancel / close', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call setRuntimeValue when Cancel is clicked', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking the overlay', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.cotl-overlay'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.cotl-modal'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── Escape key ──

  describe('escape key', () => {
    it('calls onClose when Escape key is pressed', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose for other keys', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('removes event listener on unmount', () => {
      const { unmount } = render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── Edge cases: missing data ──

  describe('edge cases: missing data', () => {
    it('handles missing class.major.spells gracefully', () => {
      const props = makeProps({
        playerStats: {
          name: 'Eldara',
          class: {},
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      expect(screen.getByText('Circle of the Land Spells')).toBeInTheDocument();
      expect(screen.getByText('Arid')).toBeInTheDocument();
      expect(screen.getByText('Polar')).toBeInTheDocument();
      expect(screen.getByText('Temperate')).toBeInTheDocument();
      expect(screen.getByText('Tropical')).toBeInTheDocument();
    });

    it('handles missing class entirely', () => {
      const props = makeProps({
        playerStats: {
          name: 'Eldara',
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      expect(screen.getByText('Circle of the Land Spells')).toBeInTheDocument();
      expect(screen.getByText('Arid')).toBeInTheDocument();
    });

    it('handles empty spells array', () => {
      const props = makeProps({
        playerStats: {
          name: 'Eldara',
          class: {
            major: {
              spells: [],
            },
          },
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      expect(screen.getByText('Circle of the Land Spells')).toBeInTheDocument();
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.mouseEnter(aridBtn);
      const spellList = aridBtn.querySelector('.cotl-spell-list');
      expect(spellList).toBeInTheDocument();
      expect(spellList.querySelectorAll('li').length).toBe(0);
    });

    it('handles undefined spells', () => {
      const props = makeProps({
        playerStats: {
          name: 'Eldara',
          class: {
            major: {},
          },
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      expect(screen.getByText('Circle of the Land Spells')).toBeInTheDocument();
    });
  });

  // ── Character name from playerStats ──

  describe('character name usage', () => {
    it('uses playerStats.name for runtime state lookups', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Eldara',
        '_circleOfTheLandType',
        expect.anything(),
        'test-campaign'
      );
    });

    it('uses playerStats.name for log entry characterName', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(addEntry).toHaveBeenCalledWith(
        'test-campaign',
        expect.objectContaining({
          characterName: 'Eldara',
        })
      );
    });

    it('uses different character name when provided', () => {
      const props = makeProps({
        playerStats: {
          ...makeProps().playerStats,
          name: 'Gromak',
        },
      });
      render(<CircleOfTheLandSpellsModal {...props} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Gromak',
        '_circleOfTheLandType',
        'Arid',
        'test-campaign'
      );
    });
  });

  // ── Campaign name usage ──

  describe('campaign name usage', () => {
    it('passes campaignName to setRuntimeValue and addEntry', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      fireEvent.click(aridBtn);
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Eldara',
        '_circleOfTheLandType',
        expect.anything(),
        'test-campaign'
      );
      expect(addEntry).toHaveBeenCalledWith(
        'test-campaign',
        expect.anything()
      );
    });
  });

  // ── addEntry error handling ──

  describe('addEntry error handling', () => {
    it('does not crash when addEntry rejects', () => {
      vi.mocked(addEntry).mockRejectedValue(new Error('Network error'));
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      expect(() => fireEvent.click(aridBtn)).not.toThrow();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Spell list visibility ──

  describe('spell list visibility', () => {
    it('does not show spell lists without hover', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      expect(screen.queryByText('Armor of Agathys')).not.toBeInTheDocument();
      expect(screen.queryByText('Fog Cloud')).not.toBeInTheDocument();
    });

    it('shows correct spells for each land type independently', () => {
      render(<CircleOfTheLandSpellsModal {...makeProps()} />);
      const aridBtn = screen.getByText('Arid').closest('button');
      const tropBtn = screen.getByText('Tropical').closest('button');

      fireEvent.mouseEnter(aridBtn);
      expect(screen.getByText('Armor of Agathys')).toBeInTheDocument();
      expect(screen.queryByText('Barkskin')).not.toBeInTheDocument();

      fireEvent.mouseEnter(tropBtn);
      expect(screen.getByText('Barkskin')).toBeInTheDocument();
      expect(screen.queryByText('Armor of Agathys')).not.toBeInTheDocument();
    });
  });
});

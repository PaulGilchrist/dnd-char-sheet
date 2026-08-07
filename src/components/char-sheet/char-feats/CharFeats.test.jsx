import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharFeats from './CharFeats.jsx';

// Mock the dataLoader module
vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFeatData: vi.fn(),
}));

// Mock the usePopup hook
vi.mock('../../../hooks/combat/usePopup.js', () => ({
  default: vi.fn(() => ({
    showPopup: vi.fn(),
    popupHtml: null,
    setPopupHtml: vi.fn(),
  })),
}));

// Mock the Popup component
vi.mock('../../common/Popup.jsx', () => ({
  default: vi.fn(({ html }) => (
    <div data-testid="popup-overlay" dangerouslySetInnerHTML={{ __html: html }} />
  )),
}));

import usePopup from '../../../hooks/combat/usePopup.js';
import { loadFeatData } from '../../../services/ui/dataLoader.js';

const mockSetPopupHtml = vi.fn();
const mockShowPopup = vi.fn();

const mockPlayerStats = {
  feats: ['Actor', 'Athlete'],
  rules: '5e',
};

const mockFeatsData = [
  {
    name: 'Actor',
    index: 'actor',
    desc: ['You look, sound, and act like a different person.'],
  },
  {
    name: 'Athlete',
    index: 'athlete',
    desc: ['You excel at athletic feats.'],
  },
];

const defaultProps = {
  playerStats: mockPlayerStats,
  showPopup: mockShowPopup,
};

describe('CharFeats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePopup.mockReturnValue({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: mockSetPopupHtml,
    });
    loadFeatData.mockResolvedValue(mockFeatsData);
  });

  describe('rendering - null/empty states', () => {
    it('should return null when feats array is empty', () => {
      const { container } = render(
        <CharFeats playerStats={{ feats: [] }} showPopup={mockShowPopup} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should return null when feats is undefined', () => {
      const { container } = render(
        <CharFeats playerStats={{}} showPopup={mockShowPopup} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should throw when playerStats is null', () => {
      expect(() => render(<CharFeats playerStats={null} showPopup={mockShowPopup} />)).toThrow();
    });

    it('should throw when playerStats is undefined', () => {
      expect(() => render(<CharFeats playerStats={undefined} showPopup={mockShowPopup} />)).toThrow();
    });
  });

  describe('rendering - feat display', () => {
    it('should render all feat names', () => {
      render(<CharFeats {...defaultProps} />);
      expect(screen.getByText(/Actor/)).toBeInTheDocument();
      expect(screen.getByText(/Athlete/)).toBeInTheDocument();
    });

    it('should render the "Feats:" label', () => {
      render(<CharFeats {...defaultProps} />);
      expect(screen.getByText('Feats:')).toBeInTheDocument();
    });

    it('should wrap feats in char-feats-section div', () => {
      const { container } = render(<CharFeats {...defaultProps} />);
      expect(container.querySelector('.char-feats-section')).toBeInTheDocument();
    });

    it('should wrap feats in feats-container div', () => {
      const { container } = render(<CharFeats {...defaultProps} />);
      expect(container.querySelector('.feats-container')).toBeInTheDocument();
    });

    it('should render feat names with clickable class', () => {
      render(<CharFeats {...defaultProps} />);
      const actorElement = screen.getByText(/Actor/);
      expect(actorElement).toHaveClass('feat-name');
      expect(actorElement).toHaveClass('clickable');
    });

    it('should render a single feat without comma separator', () => {
      render(<CharFeats {...defaultProps} playerStats={{ feats: ['Actor'] }} />);
      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.queryByText(', ')).not.toBeInTheDocument();
    });

    it('should render multiple feats with comma separators', () => {
      render(<CharFeats {...defaultProps} />);
      const container = document.querySelector('.feats-container');
      expect(container.textContent).toContain(',');
    });

    it('should preserve feat name order', () => {
      const { container } = render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Zombie Feat', 'Alpha Feat', 'Beta Feat'] }} />
      );
      const featsContainer = container.querySelector('.feats-container');
      const text = featsContainer.textContent;
      const zombieIndex = text.indexOf('Zombie Feat');
      const alphaIndex = text.indexOf('Alpha Feat');
      const betaIndex = text.indexOf('Beta Feat');
      expect(zombieIndex).toBeLessThan(alphaIndex);
      expect(alphaIndex).toBeLessThan(betaIndex);
    });
  });

  describe('rendering - duplicate feats', () => {
    it('should display count for duplicate feat names', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor', 'Actor', 'Athlete'] }} />
      );
      expect(screen.getByText(/Actor \* 2/)).toBeInTheDocument();
    });

    it('should not display count for single occurrence', () => {
      render(<CharFeats {...defaultProps} />);
      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.queryByText(/Actor \*/)).not.toBeInTheDocument();
    });

    it('should handle multiple duplicates of different feats', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor', 'Actor', 'Athlete', 'Athlete', 'Athlete'] }} />
      );
      expect(screen.getByText(/Actor \* 2/)).toBeInTheDocument();
      expect(screen.getByText(/Athlete \* 3/)).toBeInTheDocument();
    });

    it('should preserve order when feats have duplicates', () => {
      const { container } = render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Zebra', 'Alpha', 'Zebra', 'Alpha'] }} />
      );
      const featsContainer = container.querySelector('.feats-container');
      const text = featsContainer.textContent;
      const zebraIndex = text.indexOf('Zebra');
      const alphaIndex = text.indexOf('Alpha');
      expect(zebraIndex).toBeLessThan(alphaIndex);
    });
  });

  describe('feat click behavior - normal ruleset', () => {
    it('should call showPopup with feat data when a feat is clicked', async () => {
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Actor', index: 'actor' })
        );
      });
    });

    it('should call loadFeatData with the rules version from playerStats', async () => {
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(loadFeatData).toHaveBeenCalledWith('5e');
      });
    });

    it('should default to 5e when playerStats has no rules field', async () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'] }} />
      );
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(loadFeatData).toHaveBeenCalledWith('5e');
      });
    });

    it('should use 2024 rules version when specified', async () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(loadFeatData).toHaveBeenCalledWith('2024');
      });
    });

    it('should search by feat name when found', async () => {
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Actor' })
        );
      });
    });

    it('should search by feat index when name does not match', async () => {
      const featsWithDifferentIndex = [
        {
          name: 'Some Other Feat',
          index: 'actor',
          desc: ['Not the actor feat'],
        },
      ];
      loadFeatData.mockResolvedValue(featsWithDifferentIndex);

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Some Other Feat', index: 'actor' })
        );
      });
    });
  });

  describe('feat click behavior - 2024 ruleset normalization', () => {
    it('should find 2024 feat by uppercase name with underscores', async () => {
      const mock2024Feats = [
        {
          name: 'ACTOR',
          index: 'ACTOR',
          desc: ['2024 version of Actor feat'],
        },
      ];
      loadFeatData.mockResolvedValue(mock2024Feats);

      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'ACTOR' })
        );
      });
    });

    it('should normalize feat names with spaces to underscores', async () => {
      const featsWithSpaces = [
        {
          name: 'Actor Feat',
          index: 'actor_feat',
          desc: ['Feat with spaces'],
        },
      ];
      loadFeatData.mockResolvedValue(featsWithSpaces);

      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor Feat'], rules: '2024' }} />
      );
      const featElements = screen.getAllByText(/Actor Feat/);
      fireEvent.click(featElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Actor Feat' })
        );
      });
    });

    it('should match 2024 feat by uppercase index', async () => {
      const mock2024Feats = [
        {
          name: 'Actor',
          index: 'ACTOR',
          desc: ['2024 version'],
        },
      ];
      loadFeatData.mockResolvedValue(mock2024Feats);

      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Actor' })
        );
      });
    });
  });

  describe('feat click behavior - not found', () => {
    it('should call setPopupHtml with not found message when feat is not in database', async () => {
      const emptyFeats = [];
      loadFeatData.mockResolvedValue(emptyFeats);

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Actor')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('not found in database')
        );
      });
    });

    it('should not call showPopup when feat is not found', async () => {
      loadFeatData.mockResolvedValue([]);

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockShowPopup).not.toHaveBeenCalled();
      });
    });

    it('should call setPopupHtml with not found message when no match by name or index', async () => {
      const unrelatedFeats = [
        {
          name: 'Completely Different Feat',
          index: 'completely-different-feat',
          desc: ['Not the actor feat'],
        },
      ];
      loadFeatData.mockResolvedValue(unrelatedFeats);

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Actor')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('not found in database')
        );
      });
    });
  });

  describe('feat click behavior - error handling', () => {
    it('should call setPopupHtml with error message when loadFeatData rejects', async () => {
      loadFeatData.mockRejectedValue(new Error('Network error'));
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Error loading feat details')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        );
      });
    });

    it('should include the feat name in the error popup', async () => {
      loadFeatData.mockRejectedValue(new Error('Network error'));
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Actor')
        );
      });
    });

    it('should include console.error call on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      loadFeatData.mockRejectedValue(new Error('Test error'));

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[CharFeats] Error loading feats'),
          expect.anything()
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('popup rendering', () => {
    it('should not render Popup when popupHtml is null', () => {
      const { container } = render(<CharFeats {...defaultProps} />);
      expect(container.querySelector('[data-testid="popup-overlay"]')).not.toBeInTheDocument();
    });
  });

  describe('display name formatting', () => {
    it('should display feat name without count suffix for single occurrence', () => {
      render(<CharFeats {...defaultProps} playerStats={{ feats: ['Actor'] }} />);
      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.queryByText(/Actor \*/)).not.toBeInTheDocument();
    });

    it('should display feat name with * count suffix for duplicates', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor', 'Actor', 'Actor'] }} />
      );
      expect(screen.getByText('Actor * 3')).toBeInTheDocument();
    });

    it('should use the original feat name casing in display', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['actor', 'ACTOR'] }} />
      );
      // 'actor' and 'ACTOR' are different strings, so both appear
      expect(screen.getByText('actor')).toBeInTheDocument();
      expect(screen.getByText('ACTOR')).toBeInTheDocument();
    });
  });
});

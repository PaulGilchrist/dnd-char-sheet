// @cleaned-by-ai
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
vi.mock('../../common/popup.jsx', () => ({
  default: ({ html, onClickOrKeyDown }) => (
    <div data-testid="popup-overlay" onClick={onClickOrKeyDown} dangerouslySetInnerHTML={{ __html: html }} />
  ),
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
    it('should return null when feats is undefined', () => {
      const { container } = render(
        <CharFeats playerStats={{}} showPopup={mockShowPopup} />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('rendering - feat display', () => {
    it('should render all feat names with proper structure and classes', () => {
      render(<CharFeats {...defaultProps} />);
      expect(screen.getByText('Feats:')).toBeInTheDocument();
      expect(screen.getByText(/Actor/)).toHaveClass('feat-name');
      expect(screen.getByText(/Actor/)).toHaveClass('clickable');
      expect(screen.getByText(/Athlete/)).toHaveClass('feat-name');
      expect(screen.getByText(/Athlete/)).toHaveClass('clickable');
      expect(document.querySelector('.char-feats-section')).toBeInTheDocument();
      expect(document.querySelector('.feats-container')).toBeInTheDocument();
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
    it('should display count for duplicate feat names and omit count for singles', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor', 'Actor', 'Athlete'] }} />
      );
      expect(screen.getByText(/Actor \* 2/)).toBeInTheDocument();
      expect(screen.getByText('Athlete')).toBeInTheDocument();
      expect(screen.queryByText(/Athlete \*/)).not.toBeInTheDocument();
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

  describe('feat click behavior', () => {
    it('should call showPopup with feat data when a feat is clicked', async () => {
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(mockShowPopup).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Actor', index: 'actor' })
          );
        },
        { timeout: 5000 }
      );
    });

    it('should call loadFeatData with the rules version from playerStats', async () => {
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(loadFeatData).toHaveBeenCalledWith('5e');
        },
        { timeout: 5000 }
      );
    });

    it('should default to 5e when playerStats has no rules field', async () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'] }} />
      );
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(loadFeatData).toHaveBeenCalledWith('5e');
        },
        { timeout: 5000 }
      );
    });

    it('should use 2024 rules version when specified', async () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(loadFeatData).toHaveBeenCalledWith('2024');
        },
        { timeout: 5000 }
      );
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
      await vi.waitFor(
        () => {
          expect(mockShowPopup).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Some Other Feat', index: 'actor' })
          );
        },
        { timeout: 5000 }
      );
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
      await vi.waitFor(
        () => {
          expect(mockShowPopup).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'ACTOR' })
          );
        },
        { timeout: 5000 }
      );
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
      await vi.waitFor(
        () => {
          expect(mockShowPopup).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Actor Feat' })
          );
        },
        { timeout: 5000 }
      );
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
      await vi.waitFor(
        () => {
          expect(mockShowPopup).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Actor' })
          );
        },
        { timeout: 5000 }
      );
    });
  });

  describe('feat click behavior - not found', () => {
    it('should call setPopupHtml with not found message when feat is not in database', async () => {
      loadFeatData.mockResolvedValue([]);

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(mockSetPopupHtml).toHaveBeenCalledWith(
            expect.stringContaining('Actor')
          );
          expect(mockSetPopupHtml).toHaveBeenCalledWith(
            expect.stringContaining('not found in database')
          );
        },
        { timeout: 5000 }
      );
    });
  });

  describe('feat click behavior - error handling', () => {
    it('should call setPopupHtml with error message and feat name when loadFeatData rejects', async () => {
      loadFeatData.mockRejectedValue(new Error('Network error'));
      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(mockSetPopupHtml).toHaveBeenCalledWith(
            expect.stringContaining('Actor')
          );
          expect(mockSetPopupHtml).toHaveBeenCalledWith(
            expect.stringContaining('Error loading feat details')
          );
          expect(mockSetPopupHtml).toHaveBeenCalledWith(
            expect.stringContaining('Network error')
          );
        },
        { timeout: 5000 }
      );
    });

    it('should log console.error when loadFeatData rejects', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      loadFeatData.mockRejectedValue(new Error('Test error'));

      render(<CharFeats {...defaultProps} />);
      const actorElements = screen.getAllByText(/Actor/);
      fireEvent.click(actorElements[0]);
      await vi.waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[CharFeats] Error loading feats'),
            expect.any(Error)
          );
        },
        { timeout: 5000 }
      );

      consoleSpy.mockRestore();
    });
  });
});

// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  describe('null/empty states', () => {
    it('returns null when feats is undefined', () => {
      const { container } = render(
        <CharFeats playerStats={{}} showPopup={mockShowPopup} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('returns null when feats is an empty array', () => {
      const { container } = render(
        <CharFeats playerStats={{ feats: [] }} showPopup={mockShowPopup} />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('feat display', () => {
    it('renders the section header and all feat names as clickable elements', () => {
      render(<CharFeats {...defaultProps} />);
      expect(screen.getByText('Feats:')).toBeInTheDocument();
      expect(screen.getByText('Actor')).toHaveClass('feat-name', 'clickable');
      expect(screen.getByText('Athlete')).toHaveClass('feat-name', 'clickable');
    });

    it('shows a count badge for duplicate feats', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor', 'Actor', 'Athlete'] }} />
      );
      expect(screen.getByText(/Actor \* 2/)).toBeInTheDocument();
      expect(screen.getByText('Athlete')).toBeInTheDocument();
      expect(screen.queryByText(/Athlete \*/)).not.toBeInTheDocument();
    });

    it('shows count badges for multiple duplicate sets', () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor', 'Actor', 'Athlete', 'Athlete', 'Athlete'] }} />
      );
      expect(screen.getByText(/Actor \* 2/)).toBeInTheDocument();
      expect(screen.getByText(/Athlete \* 3/)).toBeInTheDocument();
    });

    it('renders a single feat without a comma separator', () => {
      render(<CharFeats {...defaultProps} playerStats={{ feats: ['Actor'] }} />);
      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.queryByText(', ')).not.toBeInTheDocument();
    });

    it('renders multiple feats with comma separators between them', () => {
      render(<CharFeats {...defaultProps} />);
      const text = screen.getByText('Feats:').parentElement?.textContent || '';
      expect(text).toContain(',');
    });

    it('preserves the original feat order', () => {
      const { container } = render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Zombie Feat', 'Alpha Feat', 'Beta Feat'] }} />
      );
      const text = container.textContent;
      const zombieIndex = text.indexOf('Zombie Feat');
      const alphaIndex = text.indexOf('Alpha Feat');
      const betaIndex = text.indexOf('Beta Feat');
      expect(zombieIndex).toBeLessThan(alphaIndex);
      expect(alphaIndex).toBeLessThan(betaIndex);
    });
  });

  describe('feat click behavior', () => {
    it('calls showPopup with the matching feat data when clicked', async () => {
      render(<CharFeats {...defaultProps} />);
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Actor', index: 'actor' })
        );
      });
    });

    it('passes the rules version from playerStats to loadFeatData', async () => {
      render(<CharFeats {...defaultProps} />);
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(loadFeatData).toHaveBeenCalledWith('5e');
      });
    });

    it('defaults to 5e when playerStats has no rules field', async () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'] }} />
      );
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(loadFeatData).toHaveBeenCalledWith('5e');
      });
    });

    it('uses 2024 rules version when specified', async () => {
      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(loadFeatData).toHaveBeenCalledWith('2024');
      });
    });

    it('finds a feat by index when the name does not match', async () => {
      loadFeatData.mockResolvedValue([
        { name: 'Some Other Feat', index: 'actor', desc: ['Not the actor feat'] },
      ]);

      render(<CharFeats {...defaultProps} />);
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Some Other Feat', index: 'actor' })
        );
      });
    });

    it('handles feat name normalization for 2024 ruleset', async () => {
      loadFeatData.mockResolvedValue([
        { name: 'ACTOR', index: 'ACTOR', desc: ['2024 version of Actor feat'] },
      ]);

      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'ACTOR' })
        );
      });
    });

    it('matches a feat by uppercase index in 2024 ruleset', async () => {
      loadFeatData.mockResolvedValue([
        { name: 'Actor', index: 'ACTOR', desc: ['2024 version'] },
      ]);

      render(
        <CharFeats {...defaultProps} playerStats={{ feats: ['Actor'], rules: '2024' }} />
      );
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(mockShowPopup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Actor' })
        );
      });
    });
  });

  describe('feat not found handling', () => {
    it('shows a not found message when the feat is absent from the database', async () => {
      loadFeatData.mockResolvedValue([]);

      render(<CharFeats {...defaultProps} />);
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Actor')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('not found in database')
        );
      });
    });
  });

  describe('error handling', () => {
    it('shows an error message with the feat name when loadFeatData rejects', async () => {
      loadFeatData.mockRejectedValue(new Error('Network error'));

      render(<CharFeats {...defaultProps} />);
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Actor')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Error loading feat details')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        );
      });
    });

    it('logs an error to console when loadFeatData rejects', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      loadFeatData.mockRejectedValue(new Error('Test error'));

      render(<CharFeats {...defaultProps} />);
      fireEvent.click(screen.getByText('Actor'));
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[CharFeats] Error loading feats'),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});

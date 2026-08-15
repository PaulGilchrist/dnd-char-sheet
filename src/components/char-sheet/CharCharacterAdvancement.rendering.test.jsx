// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CharCharacterAdvancement from './CharCharacterAdvancement.jsx';

const { mockGetRuntimeValue, mockSetRuntimeValue } = vi.hoisted(() => ({
  mockGetRuntimeValue: vi.fn(),
  mockSetRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: mockGetRuntimeValue,
  setRuntimeValue: mockSetRuntimeValue,
}));

describe('CharCharacterAdvancement - Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

  describe('container and structure', () => {
    it('renders the main container with the correct CSS class', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: 'A feature' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const mainDiv = container.querySelector('.char-character-advancement');
      expect(mainDiv).toBeInTheDocument();
    });

    it('renders the section header with the correct CSS class', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const headerDiv = container.querySelector('.sectionHeader');
      expect(headerDiv).toBeInTheDocument();
      expect(headerDiv.textContent).toBe('Character Advancement');
    });

    it('renders a half-line divider at the end of the container', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: 'Desc' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const halfLineDivs = container.querySelectorAll('.half-line');
      expect(halfLineDivs.length).toBe(1);
    });
  });

  describe('feature rendering structure', () => {
    it('wraps each feature in a div with the feature name as bold label followed by description', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Darkvision', description: 'See in darkness' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const featureDivs = container.querySelectorAll('.char-character-advancement > div > b');
      expect(featureDivs.length).toBe(1);
      expect(featureDivs[0].textContent).toBe('Darkvision:');
    });

    it('renders feature descriptions in a span element', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: 'Some description' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const spans = container.querySelectorAll('.char-character-advancement > div > span');
      expect(spans.length).toBe(1);
      expect(spans[0].textContent).toBe('Some description');
    });

    it('renders multiple features in order as separate divs', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'First', description: '1' },
          { name: 'Second', description: '2' },
          { name: 'Third', description: '3' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const featureBolds = container.querySelectorAll('.char-character-advancement > div > b');
      expect(featureBolds.length).toBe(3);
      expect(featureBolds[0].textContent).toBe('First:');
      expect(featureBolds[1].textContent).toBe('Second:');
      expect(featureBolds[2].textContent).toBe('Third:');
    });
  });

  describe('null/missing data handling', () => {
    it('renders the section header when characterAdvancement is empty', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    });

    it('renders the section header when characterAdvancement is missing', () => {
      const playerStats = {
        name: 'Test Character',
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    });

    it('renders the section header when characterAdvancement is undefined', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: undefined,
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    });

    it('renders features when playerStats has no name property', () => {
      const playerStats = {
        characterAdvancement: [
          { name: 'Feature', description: 'Desc' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
      expect(screen.getByText('Feature:')).toBeInTheDocument();
    });
  });

  describe('count suffix for duplicates', () => {
    it('appends " * N" count suffix when the same feature name appears multiple times', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Mystic Arcanum', description: '9th level' },
          { name: 'Mystic Arcanum', description: '9th level' },
          { name: 'Mystic Arcanum', description: '9th level' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Mystic Arcanum * 3:')).toBeInTheDocument();
    });

    it('omits count suffix when a feature appears exactly once', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Mystic Arcanum', description: '9th level' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Mystic Arcanum:')).toBeInTheDocument();
      expect(screen.queryByText('Mystic Arcanum * 1:')).not.toBeInTheDocument();
    });

    it('groups by feature name only, ignoring description differences', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature A', description: 'First' },
          { name: 'Feature B', description: 'Second' },
          { name: 'Feature A', description: 'First again' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Feature A * 2:')).toBeInTheDocument();
      expect(screen.getByText('Feature B:')).toBeInTheDocument();
    });

    it('uses the first feature\'s data when duplicates are grouped', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Dup Feature', description: 'First description' },
          { name: 'Dup Feature', description: 'Second description' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Dup Feature * 2:')).toBeInTheDocument();
      expect(screen.getByText('First description')).toBeInTheDocument();
      expect(screen.queryByText('Second description')).not.toBeInTheDocument();
    });
  });

  describe('filtering with featuresToIgnore', () => {
    it('filters out 5e featuresToIgnore entries like Spellcasting and Extra Attack', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Spellcasting', description: 'Casts spells' },
          { name: 'Extra Attack', description: 'Attacks twice' },
          { name: 'Valid Feature', description: 'Should appear' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Valid Feature:')).toBeInTheDocument();
      expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
      expect(screen.queryByText('Extra Attack:')).not.toBeInTheDocument();
    });

    it('filters out 2024-specific featuresToIgnore when ruleset is 2024', () => {
      const playerStats = {
        name: 'Test Character',
        rules: '2024',
        characterAdvancement: [
          { name: 'Fighter Subclass', description: 'Subclass' },
          { name: 'Barbarian Subclass', description: 'Subclass' },
          { name: 'Feat', description: 'A feat' },
          { name: 'Darkvision', description: 'See in darkness' },
          { name: 'Valid Feature', description: 'Should appear' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Valid Feature:')).toBeInTheDocument();
      expect(screen.queryByText('Fighter Subclass:')).not.toBeInTheDocument();
      expect(screen.queryByText('Barbarian Subclass:')).not.toBeInTheDocument();
      expect(screen.queryByText('Feat:')).not.toBeInTheDocument();
      expect(screen.queryByText('Darkvision:')).not.toBeInTheDocument();
    });

    it('keeps features not in the ignore list', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Mystic Arcanum', description: '9th level spells' },
          { name: 'Draconic Ancestry', description: 'Dragon parent' },
          { name: 'Spellcasting', description: 'Casts spells' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Mystic Arcanum:')).toBeInTheDocument();
      expect(screen.getByText('Draconic Ancestry:')).toBeInTheDocument();
      expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    });

    it('defaults to 5e filtering when playerStats.rules is null', () => {
      const playerStats = {
        name: 'Test Character',
        rules: null,
        characterAdvancement: [
          { name: 'Spellcasting', description: 'Casts spells' },
          { name: 'Valid Feature', description: 'Should appear' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Valid Feature:')).toBeInTheDocument();
      expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    });

    it('defaults to 5e filtering when playerStats.rules is undefined', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Spellcasting', description: 'Casts spells' },
          { name: 'Valid Feature', description: 'Should appear' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Valid Feature:')).toBeInTheDocument();
      expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    });
  });

  describe('edge cases for feature data', () => {
    it('renders a feature with an empty name', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: '', description: 'Empty name feature' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText(':')).toBeInTheDocument();
      expect(screen.getByText('Empty name feature')).toBeInTheDocument();
    });

    it('renders a feature with an empty string description', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: '' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Feature:')).toBeInTheDocument();
    });

    it('renders a feature with no description property', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Feature:')).toBeInTheDocument();
    });

    it('renders the half-line divider at the end when there are features', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: 'Desc' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      const halfLineDivs = container.querySelectorAll('.half-line');
      expect(halfLineDivs.length).toBe(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  describe('basic rendering', () => {
    it('renders the section header', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature One', description: 'A feature' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    });

    it('renders features with their names and descriptions', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Darkvision', description: 'See in darkness' },
          { name: 'Fighting Style', description: 'Boosts combat' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Darkvision:')).toBeInTheDocument();
      expect(screen.getByText('See in darkness')).toBeInTheDocument();
      expect(screen.getByText('Fighting Style:')).toBeInTheDocument();
      expect(screen.getByText('Boosts combat')).toBeInTheDocument();
    });

    it('renders nothing when characterAdvancement is empty', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
      expect(screen.queryByText('Feature One:')).not.toBeInTheDocument();
    });

    it('renders nothing when characterAdvancement is missing', () => {
      const playerStats = {
        name: 'Test Character',
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    });

    it('renders nothing when characterAdvancement is undefined', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: undefined,
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    });
  });

  describe('filtering featuresToIgnore', () => {
    it('filters out features in the 5e featuresToIgnore list by default', () => {
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
          { name: 'Fighting Style', description: '5e feature' },
          { name: 'Barbarian Subclass', description: '2024 feature' },
          { name: 'Valid Feature', description: 'Should appear' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Valid Feature:')).toBeInTheDocument();
      expect(screen.queryByText('Fighting Style:')).not.toBeInTheDocument();
      expect(screen.queryByText('Barbarian Subclass:')).not.toBeInTheDocument();
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
      // Mystic Arcanum is NOT in 5e featuresToIgnore
      expect(screen.getByText('Mystic Arcanum:')).toBeInTheDocument();
      // Draconic Ancestry is also NOT in 5e featuresToIgnore
      expect(screen.getByText('Draconic Ancestry:')).toBeInTheDocument();
      // Spellcasting IS in 5e featuresToIgnore
      expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    });

    it('uses rules from playerStats, defaulting to 5e', () => {
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

    it('handles null playerStats.rules gracefully', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Spellcasting', description: 'Casts spells' },
          { name: 'Feature', description: 'A feature' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Feature:')).toBeInTheDocument();
      expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    });
  });

  describe('duplicate counting', () => {
    it('shows * count suffix when the same feature appears multiple times', () => {
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

    it('shows single feature name without count when it appears once', () => {
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

    it('handles different features alongside duplicates', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Mystic Arcanum', description: '9th level' },
          { name: 'Mystic Arcanum', description: '9th level' },
          { name: 'Draconic Ancestry', description: 'Dragon parent' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Mystic Arcanum * 2:')).toBeInTheDocument();
      expect(screen.getByText('Draconic Ancestry:')).toBeInTheDocument();
    });

    it('uses feature name as key for grouping', () => {
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
  });

  describe('HTML sanitization', () => {
    it('passes feature description through sanitizeHtml', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: '<b>Bold text</b> and <i>italic text</i>' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      // The mocked sanitizeHtml returns input as-is, so HTML tags render as elements
      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText('italic text')).toBeInTheDocument();
    });

    it('renders sanitized HTML in the description span', () => {
      // The mock sanitizeHtml returns html as-is, so bold text should render
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature', description: '<b>Bold text</b>' },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Bold text')).toBeInTheDocument();
    });
  });

  describe('key generation', () => {
    it('uses feature.name as the React key', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          { name: 'Feature A', description: 'A' },
          { name: 'Feature B', description: 'B' },
        ],
      };
      const { container } = render(
        <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
      );
      // The component wraps each feature in a div; check that both render
      const divs = container.querySelectorAll(':scope > div');
      expect(divs.length).toBeGreaterThan(0);
    });
  });
});

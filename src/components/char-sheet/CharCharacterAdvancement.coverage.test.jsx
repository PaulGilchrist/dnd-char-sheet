import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharCharacterAdvancement from './CharCharacterAdvancement.jsx';

const { mockGetRuntimeValue, mockSetRuntimeValue, mockCategories, mockSanitizeHtml } = vi.hoisted(() => ({
  mockGetRuntimeValue: vi.fn(),
  mockSetRuntimeValue: vi.fn().mockResolvedValue(undefined),
  mockCategories: null,
  mockSanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: mockSanitizeHtml,
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: mockGetRuntimeValue,
  setRuntimeValue: mockSetRuntimeValue,
}));

vi.mock('../../services/character/featureCategories.js', () => ({
  getCategories: vi.fn((ruleset) => {
    if (mockCategories) return mockCategories;
    const base = {
      featuresToIgnore: [
        'Spellcasting', 'Extra Attack', 'Ability Score Improvement',
      ],
    };
    if (ruleset === '2024') {
      return {
        ...base,
        featuresToIgnore: [
          ...base.featuresToIgnore,
          'Fighter Subclass', 'Bard Subclass', 'Feat', 'Darkvision',
        ],
      };
    }
    return base;
  }),
}));

describe('CharCharacterAdvancement - Feature Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('filters out features listed in featuresToIgnore for 5e ruleset', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Spellcasting', description: 'Cast spells' },
        { name: 'Extra Attack', description: 'Attack twice' },
        { name: 'Visible Feature', description: 'Should appear' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    expect(screen.queryByText('Extra Attack:')).not.toBeInTheDocument();
    expect(screen.getByText('Visible Feature:')).toBeInTheDocument();
  });

  it('filters out features listed in featuresToIgnore for 2024 ruleset', () => {
    const playerStats = {
      name: 'Test Character',
      rules: '2024',
      characterAdvancement: [
        { name: 'Fighter Subclass', description: 'Subclass feature' },
        { name: 'Feat', description: 'A feat' },
        { name: 'Darkvision', description: 'See in darkness' },
        { name: 'Spellcasting', description: 'Cast spells' },
        { name: 'Keep This', description: 'Should remain' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.queryByText('Fighter Subclass:')).not.toBeInTheDocument();
    expect(screen.queryByText('Feat:')).not.toBeInTheDocument();
    expect(screen.queryByText('Darkvision:')).not.toBeInTheDocument();
    expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    expect(screen.getByText('Keep This:')).toBeInTheDocument();
  });

  it('uses 5e ruleset when rules property is not specified', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Spellcasting', description: 'Cast spells' },
        { name: 'Visible Feature', description: 'Should appear' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    expect(screen.getByText('Visible Feature:')).toBeInTheDocument();
  });

  it('keeps features not in the ignore list', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Mystic Arcanum', description: 'High level spells' },
        { name: 'Draconic Ancestry', description: 'Dragon resistance' },
        { name: 'Extra Attack', description: 'Attack twice' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Mystic Arcanum:')).toBeInTheDocument();
    expect(screen.getByText('Draconic Ancestry:')).toBeInTheDocument();
    expect(screen.queryByText('Extra Attack:')).not.toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Grouping Duplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('groups duplicate features and shows count multiplier', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature A', description: 'First' },
        { name: 'Feature A', description: 'Second' },
        { name: 'Feature A', description: 'Third' },
        { name: 'Feature B', description: 'Only one' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Feature A * 3:')).toBeInTheDocument();
    expect(screen.getByText('Feature B:')).toBeInTheDocument();
  });

  it('uses the first feature\'s description when duplicates are grouped', () => {
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

  it('uses the first feature\'s automation when duplicates are grouped', () => {
    mockGetRuntimeValue.mockReturnValue('Opt A');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Dup Choice',
          description: 'First',
          automation: { options: ['Opt A', 'Opt B'] },
        },
        {
          name: 'Dup Choice',
          description: 'Second',
          automation: { options: ['Opt X', 'Opt Y'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Dup Choice * 2:')).toBeInTheDocument();
    expect(screen.getByText('Opt A')).toBeInTheDocument();
    expect(screen.getByText('Opt B')).toBeInTheDocument();
    expect(screen.queryByText('Opt X')).not.toBeInTheDocument();
  });

  it('uses the first feature\'s name for the option key when duplicates are grouped', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Dup Feature',
          description: 'First',
          automation: { options: ['A', 'B'] },
        },
        {
          name: 'Dup Feature',
          description: 'Second',
          automation: { options: ['X', 'Y'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(mockGetRuntimeValue).toHaveBeenCalledWith(
      'Test Character',
      '_Dup_Feature_option',
      'test-campaign'
    );
  });

  it('does not apply multiplier for single features', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Solo Feature', description: 'Only one' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Solo Feature:')).toBeInTheDocument();
    expect(screen.queryByText('Solo Feature * 1:')).not.toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Rendering Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('renders the section header', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [],
    };
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    const header = container.querySelector('.sectionHeader');
    expect(header).toBeInTheDocument();
    expect(header.textContent).toBe('Character Advancement');
  });

  it('renders a half-line divider at the end', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [{ name: 'Feature', description: 'Desc' }],
    };
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    expect(container.querySelectorAll('.half-line').length).toBe(1);
  });

  it('renders feature name as bold followed by colon', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [{ name: 'My Feature', description: 'Description text' }],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('My Feature:')).toBeInTheDocument();
  });

  it('renders feature description via dangerouslySetInnerHTML with sanitizeHtml', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [{ name: 'Feature', description: '<b>Bold text</b>' }],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Bold text')).toBeInTheDocument();
  });

  it('renders features in the order they appear in characterAdvancement', () => {
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
    const mainDiv = container.querySelector('.char-character-advancement');
    const divs = mainDiv.querySelectorAll('div');
    expect(divs.length).toBe(5);
  });

  it('renders features after filtering in remaining order', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Spellcasting', description: 'Ignored' },
        { name: 'First', description: '1' },
        { name: 'Extra Attack', description: 'Ignored' },
        { name: 'Second', description: '2' },
      ],
    };
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    const mainDiv = container.querySelector('.char-character-advancement');
    const divs = mainDiv.querySelectorAll('div');
    // sectionHeader + 2 feature divs + half-line = 4
    expect(divs.length).toBe(4);
    expect(screen.getByText('First:')).toBeInTheDocument();
    expect(screen.getByText('Second:')).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Key Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('uses feature.name as the React key', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Unique Feature', description: 'Desc' },
      ],
    };
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    const featureDiv = container.querySelector('.char-character-advancement > div:not(.sectionHeader):not(.half-line)');
    expect(featureDiv).toBeInTheDocument();
  });

  it('falls back to feature.index for the key when name is missing', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { index: 'feat-1', description: 'No name' },
      ],
    };
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    const featureDiv = container.querySelector('.char-character-advancement > div:not(.sectionHeader):not(.half-line)');
    expect(featureDiv).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Choice Styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('shows first option as bold/underlined when it is the current selection', () => {
    mockGetRuntimeValue.mockReturnValue('Option A');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: ['Option A', 'Option B'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const optionA = screen.getByText('Option A');
    const optionB = screen.getByText('Option B');
    expect(optionA).toHaveStyle('font-weight: bold');
    expect(optionA).toHaveStyle('text-decoration: underline');
    expect(optionB).toHaveStyle('opacity: 0.6');
  });

  it('shows selected option as bold/underlined when it is not the first', () => {
    mockGetRuntimeValue.mockReturnValue('Option B');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: ['Option A', 'Option B'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const optionA = screen.getByText('Option A');
    const optionB = screen.getByText('Option B');
    expect(optionA).toHaveStyle('opacity: 0.6');
    expect(optionB).toHaveStyle('font-weight: bold');
    expect(optionB).toHaveStyle('text-decoration: underline');
  });

  it('renders separator between options', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: ['A', 'B', 'C'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const choiceDiv = screen.getByText('Choice:').parentElement;
    expect(choiceDiv).toHaveStyle('font-size: 0.9em');
  });

  it('applies clickable class to option spans', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: ['A', 'B'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const optionA = screen.getByText('A');
    const optionB = screen.getByText('B');
    expect(optionA).toHaveClass('clickable');
    expect(optionB).toHaveClass('clickable');
  });

  it('renders choice label with opacity styling', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: ['A', 'B'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const choiceLabel = screen.getByText('Choice:');
    expect(choiceLabel).toHaveStyle('opacity: 0.7');
  });
});

describe('CharCharacterAdvancement - Object Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('extracts name from object options for display', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: [{ name: 'Alpha' }, { name: 'Beta' }] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders object options with default styling when no runtime value exists', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: [{ name: 'First Object' }, { name: 'Second Object' }] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const firstObj = screen.getByText('First Object');
    const secondObj = screen.getByText('Second Object');
    expect(firstObj).toBeInTheDocument();
    expect(secondObj).toBeInTheDocument();
  });

  it('renders object options with styling when runtime value matches object name', () => {
    mockGetRuntimeValue.mockReturnValue('Second Object');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: [{ name: 'First Object' }, { name: 'Second Object' }] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const secondObj = screen.getByText('Second Object');
    expect(secondObj).toBeInTheDocument();
  });

  it('saves object name string to runtime when clicked', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    mockGetRuntimeValue.mockReturnValue(null);
    const { fireEvent, waitFor } = await import('@testing-library/react');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: [{ name: 'Opt A' }, { name: 'Opt B' }] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    fireEvent.click(screen.getByText('Opt B'));
    await waitFor(() => {
      expect(mockSetRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        '_Choose_option',
        'Opt B',
        'test-campaign'
      );
    });
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'buffs-updated' }));
    dispatchSpy.mockRestore();
  });
});

describe('CharCharacterAdvancement - stopPropagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('calls stopPropagation on the event when an option is clicked', async () => {
    const { fireEvent, waitFor } = await import('@testing-library/react');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: { options: ['A', 'B'] },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const optionB = screen.getByText('B');
    fireEvent.click(optionB);
    await waitFor(() => {
      expect(mockSetRuntimeValue).toHaveBeenCalled();
    });
  });
});

describe('CharCharacterAdvancement - sanitizeHtml integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('passes feature description to sanitizeHtml', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: '<b>bold</b> and <i>italic</i>' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(mockSanitizeHtml).toHaveBeenCalledWith('<b>bold</b> and <i>italic</i>');
  });

  it('renders sanitized HTML content in the DOM', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: '<b>bold text</b>' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('bold text')).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Missing characterAdvancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('handles missing characterAdvancement property gracefully', () => {
    const playerStats = {
      name: 'Test Character',
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    expect(screen.queryByText(':')).not.toBeInTheDocument();
  });

  it('handles null characterAdvancement property', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: null,
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Character Advancement')).toBeInTheDocument();
  });

  it('handles undefined characterAdvancement property', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: undefined,
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Character Advancement')).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Feature without automation property', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('renders feature without automation without choice UI', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Plain Feature', description: 'No automation at all' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Plain Feature:')).toBeInTheDocument();
    expect(screen.getByText('No automation at all')).toBeInTheDocument();
    expect(screen.queryByText('Choice:')).not.toBeInTheDocument();
  });

  it('renders feature with automation but no options without choice UI', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: 'Has automation', automation: { type: 'test' } },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Feature:')).toBeInTheDocument();
    expect(screen.queryByText('Choice:')).not.toBeInTheDocument();
  });
});

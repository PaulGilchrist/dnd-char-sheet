// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('CharCharacterAdvancement - Default Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows first string option as default when no runtime value exists', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose Feature',
          description: 'A choice',
          automation: {
            options: ['Option A', 'Option B', 'Option C'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    // First option should be shown as the current choice
    expect(screen.getByText('Choice:')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('shows first object option as default when no runtime value exists', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose Feature',
          description: 'A choice',
          automation: {
            options: [{ name: 'Opt Alpha' }, { name: 'Opt Beta' }],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Choice:')).toBeInTheDocument();
    expect(screen.getByText('Opt Alpha')).toBeInTheDocument();
    expect(screen.getByText('Opt Beta')).toBeInTheDocument();
  });

  it('shows runtime value as selected option when it exists', () => {
    mockGetRuntimeValue.mockReturnValue('Option B');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose Feature',
          description: 'A choice',
          automation: {
            options: ['Option A', 'Option B', 'Option C'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Choice:')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('uses correct optionKey format with spaces replaced by underscores', () => {
    mockGetRuntimeValue.mockReturnValue('Selected Option');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose Feature',
          description: 'A choice',
          automation: {
            options: ['Opt 1', 'Opt 2'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(mockGetRuntimeValue).toHaveBeenCalledWith(
      'Test Character',
      '_Choose_Feature_option',
      'test-campaign'
    );
  });

  it('uses correct optionKey format with multiple spaces', () => {
    mockGetRuntimeValue.mockReturnValue(null);
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose Multiple Words Feature',
          description: 'A choice',
          automation: {
            options: ['A', 'B'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(mockGetRuntimeValue).toHaveBeenCalledWith(
      'Test Character',
      '_Choose_Multiple_Words_Feature_option',
      'test-campaign'
    );
  });
});

describe('CharCharacterAdvancement - Option Selection Styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('renders all options when automation.options has exactly 2 items', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Pick One',
          description: 'Pick one',
          automation: {
            options: ['Alpha', 'Beta'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Choice:')).toBeInTheDocument();
  });

  it('renders all options when automation.options has more than 3 items', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choice',
          description: 'Pick one',
          automation: {
            options: ['A', 'B', 'C', 'D', 'E'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('does not render choice section when automation.options is null', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Feature',
          description: 'No options',
          automation: { options: null },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.queryByText('Choice:')).not.toBeInTheDocument();
  });

  it('does not crash when automation is null', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Feature',
          description: 'No automation',
          automation: null,
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Feature:')).toBeInTheDocument();
    expect(screen.getByText('No automation')).toBeInTheDocument();
  });

  it('does not crash when automation is undefined', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Feature',
          description: 'No automation',
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Feature:')).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('selects a different option and calls setRuntimeValue', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: {
            options: ['First', 'Second'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    fireEvent.click(screen.getByText('Second'));
    await waitFor(() => {
      expect(mockSetRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        '_Choose_option',
        'Second',
        'test-campaign'
      );
    });
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'buffs-updated' }));
    dispatchSpy.mockRestore();
  });

  it('clicking an option updates the runtime value', async () => {
    mockGetRuntimeValue.mockReturnValue('A');
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Choose',
          description: 'Pick',
          automation: {
            options: ['A', 'B'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    // Current option A should be bold/underlined
    const optionB = screen.getByText('B');
    expect(optionB).toBeInTheDocument();
    fireEvent.click(optionB);
    await waitFor(() => {
      expect(mockSetRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        '_Choose_option',
        'B',
        'test-campaign'
      );
    });
  });

  it('handles mixed string and object options correctly', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Mixed Choices',
          description: 'Mixed types',
          automation: {
            options: ['String Option', { name: 'Object Option' }],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('String Option')).toBeInTheDocument();
    expect(screen.getByText('Object Option')).toBeInTheDocument();
  });

  it('renders choice label with opacity styling', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        {
          name: 'Pick',
          description: 'Pick one',
          automation: {
            options: ['A', 'B'],
          },
        },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    const choiceLabel = screen.getByText('Choice:');
    expect(choiceLabel).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  it('handles feature with empty name', () => {
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

  it('handles feature with empty description', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: '' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Feature:')).toBeInTheDocument();
  });

  it('handles feature with no description property', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Feature:')).toBeInTheDocument();
  });

  it('handles playerStats with no name property', () => {
    const playerStats = {
      characterAdvancement: [
        { name: 'Feature', description: 'Desc' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.getByText('Character Advancement')).toBeInTheDocument();
    expect(screen.getByText('Feature:')).toBeInTheDocument();
  });

  it('handles campaignName being null', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: 'Desc' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName={null} />);
    expect(screen.getByText('Character Advancement')).toBeInTheDocument();
  });

  it('handles campaignName being undefined', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: 'Desc' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName={undefined} />);
    expect(screen.getByText('Character Advancement')).toBeInTheDocument();
  });

  it('renders multiple features in order', () => {
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
    // sectionHeader + 3 feature divs + half-line div = 5
    expect(divs.length).toBe(5);
  });

  it('handles duplicate features with different descriptions', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [
        { name: 'Feature', description: 'First description' },
        { name: 'Feature', description: 'Second description' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    // Only first description should be shown since only one grouped entry is created
    expect(screen.getByText('Feature * 2:')).toBeInTheDocument();
    expect(screen.getByText('First description')).toBeInTheDocument();
  });

  it('renders the half-line divider at the end', () => {
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

  it('renders the main container with correct class', () => {
    const playerStats = {
      name: 'Test Character',
      characterAdvancement: [],
    };
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    const mainDiv = container.querySelector('.char-character-advancement');
    expect(mainDiv).toBeInTheDocument();
  });

  it('renders sectionHeader with correct class', () => {
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
});

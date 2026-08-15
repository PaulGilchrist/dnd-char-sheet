// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import CharCharacterAdvancement from './CharCharacterAdvancement.jsx';

const { mockGetRuntimeValue, mockSetRuntimeValue } = vi.hoisted(() => ({
  mockGetRuntimeValue: vi.fn(),
  mockSetRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: mockGetRuntimeValue,
  setRuntimeValue: mockSetRuntimeValue,
}));

describe('CharCharacterAdvancement - 2024 FeaturesToIgnore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

  it('filters out 2024-specific features: Fighter Subclass, Bard Subclass, Feat, Darkvision', () => {
    const playerStats = {
      name: 'Test Character',
      rules: '2024',
      characterAdvancement: [
        { name: 'Fighter Subclass', description: 'Subclass feature' },
        { name: 'Bard Subclass', description: 'Subclass feature' },
        { name: 'Feat', description: 'A feat' },
        { name: 'Darkvision', description: 'See in darkness' },
        { name: 'Keep This', description: 'Should remain' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.queryByText('Fighter Subclass:')).not.toBeInTheDocument();
    expect(screen.queryByText('Bard Subclass:')).not.toBeInTheDocument();
    expect(screen.queryByText('Feat:')).not.toBeInTheDocument();
    expect(screen.queryByText('Darkvision:')).not.toBeInTheDocument();
    expect(screen.getByText('Keep This:')).toBeInTheDocument();
  });

  it('still filters 5e features when ruleset is 2024', () => {
    const playerStats = {
      name: 'Test Character',
      rules: '2024',
      characterAdvancement: [
        { name: 'Spellcasting', description: 'Cast spells' },
        { name: 'Extra Attack', description: 'Attack twice' },
        { name: 'Ability Score Improvement', description: 'Increase stats' },
        { name: 'Visible Feature', description: 'Should appear' },
      ],
    };
    render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
    expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    expect(screen.queryByText('Extra Attack:')).not.toBeInTheDocument();
    expect(screen.queryByText('Ability Score Improvement:')).not.toBeInTheDocument();
    expect(screen.getByText('Visible Feature:')).toBeInTheDocument();
  });
});

describe('CharCharacterAdvancement - Grouping Duplicates with Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

  it('uses the first feature\'s automation options when duplicates are grouped', () => {
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
    expect(screen.queryByText('Opt Y')).not.toBeInTheDocument();
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
});

describe('CharCharacterAdvancement - Choice Styling Details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

  it('applies clickable class to option spans', () => {
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
    expect(screen.getByText('A')).toHaveClass('clickable');
    expect(screen.getByText('B')).toHaveClass('clickable');
  });

  it('renders separator between options with opacity styling', () => {
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
    const { container } = render(
      <CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />
    );
    const choiceDiv = container.querySelector('.char-character-advancement div[style*="font-size: 0.9em"]');
    const separators = choiceDiv.querySelectorAll('span[style*="opacity: 0.4"]');
    expect(separators.length).toBe(1);
  });
});

describe('CharCharacterAdvancement - Object Options Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

  it('saves object name string to runtime when clicked and dispatches buffs-updated', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
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

describe('CharCharacterAdvancement - Feature without automation property', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

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

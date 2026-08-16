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

describe('CharCharacterAdvancement - Choice Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeValue.mockReturnValue(null);
  });

  afterEach(cleanup);

  describe('choice UI visibility', () => {
    it('does not render choice UI when automation.options is an empty array', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          {
            name: 'Empty Choices',
            description: 'Has options array but no items',
            automation: { options: [] },
          },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Empty Choices:')).toBeInTheDocument();
      expect(screen.queryByText('Choice:')).not.toBeInTheDocument();
    });

    it('does not render choice UI when automation.options has a single string item', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          {
            name: 'Single Choice',
            description: 'Only one option available',
            automation: { options: ['Only Option'] },
          },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Single Choice:')).toBeInTheDocument();
      expect(screen.queryByText('Choice:')).not.toBeInTheDocument();
    });

    it('does not render choice UI when automation.options has a single object item', () => {
      const playerStats = {
        name: 'Test Character',
        characterAdvancement: [
          {
            name: 'Single Object Choice',
            description: 'Only one object option',
            automation: { options: [{ name: 'Only Object' }] },
          },
        ],
      };
      render(<CharCharacterAdvancement playerStats={playerStats} campaignName="test-campaign" />);
      expect(screen.getByText('Single Object Choice:')).toBeInTheDocument();
      expect(screen.queryByText('Choice:')).not.toBeInTheDocument();
    });
  });
});

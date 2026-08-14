// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackedResourceInput from './TrackedResourceInput.jsx';

vi.mock('../../../hooks/runtime/useTrackedResource.js', () => ({
  default: vi.fn(),
}));

import useTrackedResource from '../../../hooks/runtime/useTrackedResource.js';

describe('TrackedResourceInput', () => {
  const baseProps = {
    label: 'Sorcery Points',
    resourceKey: 'sorceryPoints',
    playerName: 'Test Character',
    getMax: () => 10,
    deps: [],
    campaignName: 'test-campaign',
    playerStats: {
      name: 'Test Character',
      _trackedResources: {},
    },
  };

  const createTrackedResource = (overrides = {}) => ({
    current: 5,
    max: 10,
    update: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useTrackedResource.mockReturnValue(createTrackedResource());
  });

  describe('rendering', () => {
    it('renders the label with current and max values', () => {
      render(<TrackedResourceInput {...baseProps} />);
      expect(screen.getByText('Sorcery Points:')).toBeInTheDocument();
      expect(screen.getByText('(cur/max)')).toBeInTheDocument();
    });

    it('displays the current and max values from the hook', () => {
      render(<TrackedResourceInput {...baseProps} />);
      // The clickable div contains the value display from HiddenInput + "/" + max
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');
      expect(clickable.textContent).toContain('5/10');
    });

    it('renders as a focusable clickable element', () => {
      render(<TrackedResourceInput {...baseProps} />);
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');
      expect(clickable).toHaveAttribute('tabIndex', '0');
    });

    it('renders with zero current value', () => {
      useTrackedResource.mockReturnValue(createTrackedResource({ current: 0, max: 5 }));
      render(<TrackedResourceInput {...baseProps} getMax={() => 5} />);
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');
      expect(clickable.textContent).toContain('0/5');
    });

    it('renders with current equal to max', () => {
      useTrackedResource.mockReturnValue(createTrackedResource({ current: 10, max: 10 }));
      render(<TrackedResourceInput {...baseProps} />);
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');
      expect(clickable.textContent).toContain('10/10');
    });
  });

  describe('toggle behavior', () => {
    it('toggles input visibility on click', () => {
      render(<TrackedResourceInput {...baseProps} />);
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');

      // Initially no input
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

      // Click to show input
      fireEvent.click(clickable);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();

      // Click again to hide input
      fireEvent.click(clickable);
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('toggles input visibility on Enter key', () => {
      render(<TrackedResourceInput {...baseProps} />);
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');

      fireEvent.keyDown(clickable, { key: 'Enter' });
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();

      fireEvent.keyDown(clickable, { key: 'Enter' });
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('toggles input visibility on any key press', () => {
      render(<TrackedResourceInput {...baseProps} />);
      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');

      fireEvent.keyDown(clickable, { key: 'ArrowDown' });
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();

      fireEvent.keyDown(clickable, { key: 'Escape' });
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });

  describe('useTrackedResource integration', () => {
    it('calls useTrackedResource with the correct props', () => {
      render(<TrackedResourceInput {...baseProps} />);

      expect(useTrackedResource).toHaveBeenCalledWith(
        'sorceryPoints',
        'Test Character',
        expect.any(Function),
        [],
        'test-campaign',
        expect.objectContaining({ name: 'Test Character' }),
      );
    });

    it('passes the update function from the hook', () => {
      const mockUpdate = vi.fn();
      useTrackedResource.mockReturnValue(createTrackedResource({ update: mockUpdate }));
      render(<TrackedResourceInput {...baseProps} />);

      const clickable = screen.getByText('Sorcery Points:').closest('.clickable');
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '7' } });
      fireEvent.blur(input);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

// @improved-by-ai
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharGold from './CharGold.jsx';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(),
}));

vi.mock('../../common/HiddenInput.jsx', () => {
  function HiddenInput({ handleInputToggle, handleValueChange, showInput, value }) {
    const [localValue, setLocalValue] = React.useState(value ?? '');

    const commit = () => {
      const numVal = Number(localValue);
      const clamped = Math.max(numVal, 0);
      handleValueChange(clamped);
      handleInputToggle();
    };

    const handleChange = (event) => {
      setLocalValue(event.target.value);
    };

    if (showInput) {
      return (
        <span className="hidden-input clickable">
          <input
            data-testid="gold-input"
            type="number"
            min="0"
            value={localValue}
            onChange={handleChange}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                commit();
              }
            }}
          />
        </span>
      );
    }
    return <span data-testid="gold-value">{value}</span>;
  }
  const React = require('react');
  HiddenInput.displayName = 'HiddenInput';
  return { default: HiddenInput };
});

import { setRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';

const createPlayerStats = (overrides = {}) => ({
  name: 'Test Character',
  inventory: { gold: 500 },
  ...overrides,
});

describe('CharGold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeValue.mockReturnValue(null);
  });

  describe('value display priority', () => {
    it('displays runtime gold value when available', () => {
      useRuntimeValue.mockReturnValue(250);

      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      expect(screen.getByTestId('gold-value')).toHaveTextContent('250');
    });

    it('falls back to inventory.gold when runtime value is null', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      expect(screen.getByTestId('gold-value')).toHaveTextContent('500');
    });

    it('falls back to 0 when both runtime and inventory.gold are missing', () => {
      render(<CharGold playerStats={createPlayerStats({ inventory: {} })} campaignName={campaignName} />);

      expect(screen.getByTestId('gold-value')).toHaveTextContent('0');
    });

    it('prioritizes runtime over inventory.gold', () => {
      useRuntimeValue.mockReturnValue(100);

      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      expect(screen.getByTestId('gold-value')).toHaveTextContent('100');
    });
  });

  describe('input toggling', () => {
    it('shows the input field when the display area is clicked', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      expect(screen.getByTestId('gold-input')).toBeInTheDocument();
      expect(screen.queryByTestId('gold-value')).not.toBeInTheDocument();
    });

    it('hides the input and restores the value display on blur', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);
      expect(screen.getByTestId('gold-input')).toBeInTheDocument();

      const input = screen.getByTestId('gold-input');
      fireEvent.blur(input);

      expect(screen.getByTestId('gold-value')).toBeInTheDocument();
      expect(screen.queryByTestId('gold-input')).not.toBeInTheDocument();
    });

    it('toggles input open via Enter key on the container', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.keyDown(clickable, { key: 'Enter' });

      expect(screen.getByTestId('gold-input')).toBeInTheDocument();
    });
  });

  describe('value persistence', () => {
    it('saves the new value to runtime store on blur', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('gold-input');
      fireEvent.change(input, { target: { value: '750' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'gold',
        750,
        'test-campaign',
      );
    });

    it('saves the new value to runtime store on Enter', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('gold-input');
      fireEvent.change(input, { target: { value: '300' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'gold',
        300,
        'test-campaign',
      );
    });

    it('clamps negative input values to 0', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('gold-input');
      fireEvent.change(input, { target: { value: '-100' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'gold',
        0,
        'test-campaign',
      );
    });

    it('uses the character name and campaign name from props', () => {
      const customStats = createPlayerStats({ name: 'Custom Char' });

      render(<CharGold playerStats={customStats} campaignName="my-campaign" />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('gold-input');
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Custom Char',
        'gold',
        10,
        'my-campaign',
      );
    });
  });
});

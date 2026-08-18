// @cleaned-by-ai
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
    const scenarios = [
      { name: 'runtime value when available', runtime: 250, inventory: { gold: 500 }, expected: '250' },
      { name: 'fallback to inventory.gold when runtime is null', runtime: null, inventory: { gold: 500 }, expected: '500' },
      { name: 'fallback to 0 when both are missing', runtime: null, inventory: {}, expected: '0' },
      { name: 'runtime prioritized over inventory.gold', runtime: 100, inventory: { gold: 500 }, expected: '100' },
    ];

    for (const { name, runtime, inventory, expected } of scenarios) {
      it(`displays ${expected} - ${name}`, () => {
        useRuntimeValue.mockReturnValue(runtime);

        render(<CharGold playerStats={createPlayerStats({ inventory })} campaignName={campaignName} />);

        expect(screen.getByTestId('gold-value')).toHaveTextContent(expected);
      });
    }
  });

  describe('input toggling', () => {
    it('shows the input field when the display area is clicked', () => {
      render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      expect(screen.getByTestId('gold-input')).toBeInTheDocument();
      expect(screen.queryByTestId('gold-value')).not.toBeInTheDocument();
    });
  });

  describe('value persistence', () => {
    const saveScenarios = [
      { name: 'on blur', trigger: 'blur' },
      { name: 'on Enter', trigger: 'enter' },
    ];

    for (const { name, trigger } of saveScenarios) {
      it(`saves the new value to runtime store ${name}`, () => {
        render(<CharGold playerStats={createPlayerStats()} campaignName={campaignName} />);

        const clickable = screen.getByText(/Gold:/).parentElement;
        fireEvent.click(clickable);

        const input = screen.getByTestId('gold-input');
        fireEvent.change(input, { target: { value: '750' } });

        if (trigger === 'blur') {
          fireEvent.blur(input);
        } else {
          fireEvent.keyDown(input, { key: 'Enter' });
        }

        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Test Character',
          'gold',
          750,
          'test-campaign',
        );
      });
    }

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
  });
});

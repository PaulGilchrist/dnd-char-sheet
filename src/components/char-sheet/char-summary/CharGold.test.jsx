// @improved-by-ai
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharGold from './CharGold.jsx';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(),
}));

import { setRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';

function createPlayerStats(overrides = {}) {
  return {
    name: 'Test Character',
    inventory: { gold: 500 },
    ...overrides,
  };
}

function renderCharGold(overrides = {}) {
  const { campaignName: customCampaign, playerStats: customPlayerStats, ...statsOverrides } = overrides;
  const playerStats = customPlayerStats || createPlayerStats(statsOverrides);
  return render(
    <CharGold
      playerStats={playerStats}
      campaignName={customCampaign || campaignName}
    />
  );
}

describe('CharGold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeValue.mockReturnValue(null);
  });

  describe('value display priority', () => {
    it('displays stored runtime gold when available', () => {
      useRuntimeValue.mockReturnValue(250);

      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      expect(clickable).toHaveTextContent(/Gold:\s*250/);
    });

    it('falls back to inventory.gold when runtime value is null', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      expect(clickable).toHaveTextContent(/Gold:\s*500/);
    });

    it('falls back to 0 when both runtime and inventory.gold are missing', () => {
      useRuntimeValue.mockReturnValue(null);

      renderCharGold({ inventory: {} });

      const clickable = screen.getByText(/Gold:/).parentElement;
      expect(clickable).toHaveTextContent(/Gold:\s*0/);
    });

    it('prioritizes runtime over inventory when both exist', () => {
      useRuntimeValue.mockReturnValue(100);

      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      expect(clickable).toHaveTextContent(/Gold:\s*100/);
    });
  });

  describe('input toggling', () => {
    it('shows the input field when the display area is clicked', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.queryByText(/Gold: \d+/)).not.toBeInTheDocument();
    });

    it('hides the input and shows the value when clicked again', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();

      fireEvent.click(clickable);
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
      expect(clickable).toHaveTextContent(/Gold:\s*\d+/);
    });

    it('can be activated via keyboard Enter', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.keyDown(clickable, { key: 'Enter' });

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });
  });

  describe('value persistence', () => {
    it.each([
      ['blur', 'blur'],
      ['Enter key', 'enter'],
    ])('saves the new value to runtime store on %s', (_trigger, trigger) => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
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

    it('clamps negative input values to 0', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '-100' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'gold',
        0,
        'test-campaign',
      );
    });

    it('clamps NaN input values to 0', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'not-a-number' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'gold',
        0,
        'test-campaign',
      );
    });

    it('does not commit when Escape is pressed (only Enter triggers save)', () => {
      renderCharGold();

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // HiddenInput only commits on Enter key; Escape falls through without triggering commit
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('setRuntimeValue arguments', () => {
    it('passes character name as the first argument', () => {
      const customStats = { name: 'DragonSlayer', inventory: { gold: 100 } };

      renderCharGold({ playerStats: customStats });

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '200' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'DragonSlayer',
        'gold',
        200,
        'test-campaign',
      );
    });

    it('uses the campaignName prop as the last argument', () => {
      renderCharGold({ campaignName: 'my-campaign' });

      const clickable = screen.getByText(/Gold:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '300' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'gold',
        300,
        'my-campaign',
      );
    });
  });
});

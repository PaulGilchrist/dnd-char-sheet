// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharHitPoints from './CharHitPoints.jsx';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
  clearDeathSavePrompt: vi.fn(),
}));

vi.mock('./DeathSavingThrows.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="death-saving-throws">
      Death Saving Throws for {playerStats.name}
    </div>
  )),
}));

vi.mock('../../common/HiddenInput.jsx', () => {
  const MockHiddenInput = ({ value, showInput, handleValueChange, handleInputToggle }) => {
    if (showInput) {
      return (
        <input
          data-testid="hp-input"
          type="number"
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={() => handleInputToggle()}
        />
      );
    }
    return <span data-testid="hp-display">{value}</span>;
  };
  MockHiddenInput.displayName = 'MockHiddenInput';
  return { default: MockHiddenInput };
});

import { setRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { clearDeathSavePrompt } from '../../../services/combat/conditions/savePromptService.js';

const mockPlayerStats = {
  name: 'TestCharacter',
  hitPoints: 10,
};

const campaignName = 'test-campaign';

function renderCharHitPoints(props = {}) {
  return render(
    <CharHitPoints playerStats={mockPlayerStats} campaignName={campaignName} {...props} />
  );
}

function setupFetchMock() {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: vi.fn(() => Promise.resolve({})) }));
  global.fetch = fetchMock;
  return fetchMock;
}

describe('CharHitPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: vi.fn() }));
    useRuntimeValue.mockReturnValue(null);
  });

  describe('initial display', () => {
    it('renders hit points label with current and max values', () => {
      renderCharHitPoints();

      expect(screen.getByText(/Hit Points:/)).toBeInTheDocument();
      expect(screen.getByTestId('hp-display')).toHaveTextContent('10');
    });

    it('displays effective max HP including aidHpMaxIncrease', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'aidHpMaxIncrease') return 3;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('hp-display')).toHaveTextContent('13');
    });

    it('displays effective max HP including heroesFeastHpMaxIncrease', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'heroesFeastHpMaxIncrease') return 5;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('hp-display')).toHaveTextContent('15');
    });

    it('combines aidHpMaxIncrease and heroesFeastHpMaxIncrease into effective max', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'aidHpMaxIncrease') return 3;
        if (prop === 'heroesFeastHpMaxIncrease') return 5;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('hp-display')).toHaveTextContent('18');
    });

    it('shows stored current HP when available instead of max', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'currentHitPoints') return 5;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('hp-display')).toHaveTextContent('5');
    });

    it('shows effective max when stored HP is null', () => {
      renderCharHitPoints();

      expect(screen.getByTestId('hp-display')).toHaveTextContent('10');
    });

    it('treats falsy heroesFeastHpMaxIncrease values as 0', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'heroesFeastHpMaxIncrease') return undefined;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('hp-display')).toHaveTextContent('10');
    });
  });

  describe('temp HP display', () => {
    it('shows temp HP when tempHp is greater than 0', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'tempHp') return 5;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByText(/Temp HP: 5/)).toBeInTheDocument();
    });

    it('hides temp HP when tempHp is 0', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'tempHp') return 0;
        return null;
      });

      renderCharHitPoints();

      expect(screen.queryByText(/Temp HP/)).not.toBeInTheDocument();
    });

    it('hides temp HP when tempHp is null', () => {
      renderCharHitPoints();

      expect(screen.queryByText(/Temp HP/)).not.toBeInTheDocument();
    });
  });

  describe('HP input toggling', () => {
    it('toggles input visibility on click', () => {
      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      expect(screen.getByTestId('hp-input')).toBeInTheDocument();
      expect(screen.queryByTestId('hp-display')).not.toBeInTheDocument();

      fireEvent.click(clickable);
      expect(screen.getByTestId('hp-display')).toBeInTheDocument();
      expect(screen.queryByTestId('hp-input')).not.toBeInTheDocument();
    });

    it('toggles input visibility on keyboard Enter', () => {
      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.keyDown(clickable, { key: 'Enter' });

      expect(screen.getByTestId('hp-input')).toBeInTheDocument();
    });
  });

  describe('HP value changes', () => {
    it('calls setRuntimeValue when current HP is decreased', () => {
      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '7' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'TestCharacter',
        'currentHitPoints',
        7,
        'test-campaign'
      );
    });

    it('calls setRuntimeValue when current HP is increased', () => {
      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '15' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'TestCharacter',
        'currentHitPoints',
        15,
        'test-campaign'
      );
    });

    it('logs hp_change event with correct delta for damage', async () => {
      const fetchMock = setupFetchMock();

      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '7' } });
      fireEvent.blur(input);

      await waitFor(() => {
        const loggedData = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(loggedData).toEqual(
          expect.objectContaining({
            type: 'hp_change',
            targetName: 'TestCharacter',
            delta: -3,
            isHealing: false,
            isUnconscious: false,
          })
        );
      });
    });

    it('logs hp_change event with correct delta for healing', async () => {
      const fetchMock = setupFetchMock();

      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'currentHitPoints') return 5;
        return null;
      });

      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.blur(input);

      await waitFor(() => {
        const loggedData = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(loggedData).toEqual(
          expect.objectContaining({
            type: 'hp_change',
            targetName: 'TestCharacter',
            delta: 5,
            isHealing: true,
            isUnconscious: false,
          })
        );
      });
    });

    it('logs hp_change event with isUnconscious true when HP is set to 0', async () => {
      const fetchMock = setupFetchMock();

      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);

      await waitFor(() => {
        const loggedData = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(loggedData.isUnconscious).toBe(true);
      });
    });

    it('resets death saves when HP is set above 0', () => {
      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '5' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'TestCharacter',
        'deathSaves',
        [false, false, false],
        'test-campaign'
      );
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'TestCharacter',
        'deathFailures',
        [false, false, false],
        'test-campaign'
      );
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'TestCharacter',
        'isDead',
        0,
        'test-campaign'
      );
      expect(clearDeathSavePrompt).toHaveBeenCalledWith('test-campaign', 'TestCharacter');
    });

    it('does not reset death saves when HP is set to 0 or below', () => {
      renderCharHitPoints();

      const clickable = screen.getByText(/Hit Points:/).parentElement;
      fireEvent.click(clickable);

      const input = screen.getByTestId('hp-input');
      fireEvent.change(input, { target: { value: '-2' } });
      fireEvent.blur(input);

      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'TestCharacter',
        'deathSaves',
        [false, false, false],
        'test-campaign'
      );
      expect(clearDeathSavePrompt).not.toHaveBeenCalled();
    });
  });

  describe('death saving throws rendering', () => {
    it('renders DeathSavingThrows when current HP is exactly 0', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'currentHitPoints') return 0;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('death-saving-throws')).toBeInTheDocument();
    });

    it('renders DeathSavingThrows when current HP is negative', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'currentHitPoints') return -5;
        return null;
      });

      renderCharHitPoints();

      expect(screen.getByTestId('death-saving-throws')).toBeInTheDocument();
    });

    it('does not render DeathSavingThrows when current HP is above 0', () => {
      useRuntimeValue.mockImplementation((_, prop) => {
        if (prop === 'currentHitPoints') return 1;
        return null;
      });

      renderCharHitPoints();

      expect(screen.queryByTestId('death-saving-throws')).not.toBeInTheDocument();
    });
  });

  describe('death-save-result event', () => {
    it('updates current HP when event target matches character name', async () => {
      renderCharHitPoints();

      const event = new CustomEvent('death-save-result', {
        detail: { targetName: 'TestCharacter', restoredToHp: 8 },
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenLastCalledWith(
          'TestCharacter',
          'currentHitPoints',
          8,
          'test-campaign'
        );
      });
    });

    it('ignores event when targetName does not match', async () => {
      renderCharHitPoints();

      const event = new CustomEvent('death-save-result', {
        detail: { targetName: 'OtherCharacter', restoredToHp: 8 },
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(setRuntimeValue).not.toHaveBeenCalled();
      });
    });

    it('ignores event when detail is null', async () => {
      renderCharHitPoints();

      const event = new CustomEvent('death-save-result', { detail: null });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(setRuntimeValue).not.toHaveBeenCalled();
      });
    });

    it('ignores event when restoredToHp is missing from detail', async () => {
      renderCharHitPoints();

      const event = new CustomEvent('death-save-result', {
        detail: { targetName: 'TestCharacter' },
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(setRuntimeValue).not.toHaveBeenCalled();
      });
    });
  });
});

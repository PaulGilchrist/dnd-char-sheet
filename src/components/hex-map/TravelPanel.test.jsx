// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TravelPanel from './TravelPanel.jsx';
import { TRAVEL_PACES, formatTravelTime, getHexTravelTime } from '../../services/campaign/travelService.js';
import { EVENT_FREQUENCIES } from '../../services/campaign/randomEventService.js';

describe('TravelPanel', () => {
  let props;

  const mockPath = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 },
  ];

  const makeProps = (overrides = {}) => ({
    travelPace: 'normal',
    path: mockPath,
    pathIndex: 0,
    accruedCost: 5,
    dailyBudget: 10,
    dayExhausted: false,
    lastMessage: null,
    hexesRemaining: 3,
    isTravelActive: true,
    pendingEvent: null,
    terrain: {},
    eventFrequency: 'none',
    onChangePace: vi.fn(),
    onAdvance: vi.fn(),
    onCancel: vi.fn(),
    onForceCamp: vi.fn(),
    onForcedMarch: vi.fn(),
    weather: null,
    onReRollWeather: vi.fn(),
    onSetEventFrequency: vi.fn(),
    horseback: false,
    onToggleHorseback: vi.fn(),
    forcedMarchHours: 0,
    exhaustionMultiplier: 100,
    partyHasMaxExhaustion: false,
    ...overrides,
  });

  beforeEach(() => {
    props = makeProps();
  });

  describe('rendering', () => {
    it('should not render when travel is not active', () => {
      render(<TravelPanel {...props} isTravelActive={false} />);
      expect(screen.queryByText('Travel Mode')).not.toBeInTheDocument();
    });

    it('should render the panel title', () => {
      render(<TravelPanel {...props} />);
      expect(screen.getByText('Travel Mode')).toBeInTheDocument();
    });

    it('should render the close and cancel buttons', () => {
      render(<TravelPanel {...props} />);
      expect(screen.getByTitle('Cancel travel')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render the number of hexes remaining', () => {
      render(<TravelPanel {...props} hexesRemaining={5} />);
      expect(screen.getByText('5 hexes')).toBeInTheDocument();
    });

    it('should render the travel message when provided', () => {
      render(<TravelPanel {...props} lastMessage="Traveling through the forest" />);
      expect(screen.getByText('Traveling through the forest')).toBeInTheDocument();
    });

    it('should remove the travel message when lastMessage becomes null', () => {
      const { rerender } = render(<TravelPanel {...props} lastMessage="Traveling through the forest" />);
      expect(screen.getByText('Traveling through the forest')).toBeInTheDocument();
      rerender(<TravelPanel {...props} lastMessage={null} />);
      expect(screen.queryByText('Traveling through the forest')).not.toBeInTheDocument();
    });
  });

  describe('budget bar', () => {
    it('should render the accrued cost and daily budget text', () => {
      render(<TravelPanel {...props} accruedCost={7.5} dailyBudget={10} />);
      expect(screen.getByText('7.5 / 10')).toBeInTheDocument();
    });

    it('should render the remaining budget text', () => {
      render(<TravelPanel {...props} accruedCost={3} dailyBudget={10} />);
      expect(screen.getByText('7.0 left')).toBeInTheDocument();
    });

    it('should cap the budget bar fill at 100% when cost exceeds budget', () => {
      render(<TravelPanel {...props} accruedCost={15} dailyBudget={10} />);
      expect(screen.getByText('15.0 / 10')).toBeInTheDocument();
      expect(screen.getByText('0.0 left')).toBeInTheDocument();
    });

    it('should render zero budget text when daily budget is zero', () => {
      render(<TravelPanel {...props} accruedCost={5} dailyBudget={0} />);
      expect(screen.getByText('5.0 / 0')).toBeInTheDocument();
    });
  });

  describe('day exhausted state', () => {
    it('should render the exhausted message, camp button, and forced march button', () => {
      render(<TravelPanel {...props} dayExhausted />);
      expect(screen.getByText('Travel budget exhausted — camp or forced march?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Camp' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Forced March' })).toBeInTheDocument();
    });

    it('should disable the forced march button when the party has max exhaustion', () => {
      render(<TravelPanel {...props} dayExhausted partyHasMaxExhaustion />);
      expect(screen.getByRole('button', { name: 'Forced March' })).toBeDisabled();
    });

    it('should not render the exhausted section when the budget is not exhausted', () => {
      render(<TravelPanel {...props} dayExhausted={false} />);
      expect(screen.queryByRole('button', { name: 'Camp' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Forced March' })).not.toBeInTheDocument();
    });
  });

  describe('forced march display', () => {
    it('should render forced march stacks and speed when forcedMarchHours > 0', () => {
      render(<TravelPanel {...props} forcedMarchHours={3} exhaustionMultiplier={83} />);
      expect(screen.getByText('Forced March')).toBeInTheDocument();
      expect(screen.getByText('3 / 6 stacks')).toBeInTheDocument();
      expect(screen.getByText('Speed: 83%')).toBeInTheDocument();
    });

    it('should not render the exhaustion panel when there are no forced march hours', () => {
      render(<TravelPanel {...props} forcedMarchHours={0} />);
      expect(screen.queryByText('Forced March')).not.toBeInTheDocument();
    });
  });

  describe('weather section', () => {
    const weather = { icon: 'cloud-sun', label: 'Partly Cloudy', description: 'Mostly clear skies' };

    it('should render weather details when provided', () => {
      render(<TravelPanel {...props} weather={weather} />);
      expect(screen.getByText('Weather:')).toBeInTheDocument();
      expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();
      expect(screen.getByText('Mostly clear skies')).toBeInTheDocument();
    });

    it('should not render the weather section when weather is null', () => {
      render(<TravelPanel {...props} weather={null} />);
      expect(screen.queryByText('Weather:')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Re-roll weather')).not.toBeInTheDocument();
    });
  });

  describe('event frequency buttons', () => {
    it('should render buttons for all event frequencies', () => {
      render(<TravelPanel {...props} />);
      Object.values(EVENT_FREQUENCIES).forEach(freq => {
        const buttons = screen.queryAllByRole('button', { name: freq.label });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should call onSetEventFrequency with the chosen frequency', () => {
      render(<TravelPanel {...props} eventFrequency="sparse" />);
      fireEvent.click(screen.getByRole('button', { name: EVENT_FREQUENCIES.frequent.label }));
      expect(props.onSetEventFrequency).toHaveBeenCalledWith('frequent');
    });

    it('should mark the active frequency button', () => {
      render(<TravelPanel {...props} eventFrequency="sparse" />);
      const activeBtn = screen.getByRole('button', { name: EVENT_FREQUENCIES.sparse.label });
      expect(activeBtn).toHaveClass('active');
    });
  });

  describe('pace buttons', () => {
    it('should render a button for every travel pace', () => {
      render(<TravelPanel {...props} />);
      TRAVEL_PACES.forEach(pace => {
        const buttons = screen.queryAllByRole('button', { name: pace.name });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should call onChangePace with the chosen pace', () => {
      render(<TravelPanel {...props} travelPace="normal" />);
      fireEvent.click(screen.getByRole('button', { name: 'Fast' }));
      expect(props.onChangePace).toHaveBeenCalledWith('fast');
    });

    it('should mark the active pace button', () => {
      render(<TravelPanel {...props} travelPace="slow" />);
      const activeBtn = screen.getByRole('button', { name: 'Slow' });
      expect(activeBtn).toHaveClass('active');
    });
  });

  describe('horseback toggle', () => {
    it('should show Walking or Horseback label based on horseback prop', () => {
      const { rerender } = render(<TravelPanel {...props} horseback={false} />);
      expect(screen.getByRole('button', { name: 'Walking' })).toBeInTheDocument();
      rerender(<TravelPanel {...props} horseback />);
      expect(screen.getByRole('button', { name: 'Horseback' })).toBeInTheDocument();
    });

    it('should call onToggleHorseback when clicked', () => {
      render(<TravelPanel {...props} horseback={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Walking' }));
      expect(props.onToggleHorseback).toHaveBeenCalledTimes(1);
    });

    it('should mark the active horseback button', () => {
      render(<TravelPanel {...props} horseback />);
      const activeBtn = screen.getByRole('button', { name: 'Horseback' });
      expect(activeBtn).toHaveClass('active');
    });
  });

  describe('advance button', () => {
    it.each([
      { condition: 'travel budget is exhausted', dayExhausted: true },
      { condition: 'at the end of the path', pathIndex: 3, buttonText: 'Arrived' },
      { condition: 'an event is pending', pendingEvent: { title: 'Ambush' } },
      { condition: 'the party has max exhaustion', partyHasMaxExhaustion: true },
      { condition: 'the path is empty', path: [], pathIndex: 0, buttonText: 'Arrived' },
    ])('should be disabled when $condition', ({ dayExhausted, pathIndex, pendingEvent, partyHasMaxExhaustion, path, buttonText }) => {
      render(<TravelPanel {...props} dayExhausted={dayExhausted} pathIndex={pathIndex ?? 0} pendingEvent={pendingEvent} partyHasMaxExhaustion={partyHasMaxExhaustion} path={path ?? mockPath} />);
      expect(screen.getByRole('button', { name: buttonText ?? 'Advance One Hex' })).toBeDisabled();
    });

    it('should be enabled when all conditions are clear', () => {
      render(<TravelPanel {...props} />);
      expect(screen.getByRole('button', { name: 'Advance One Hex' })).not.toBeDisabled();
    });
  });

  describe('click handlers', () => {
    it('should call onCancel when the close button is clicked', () => {
      render(<TravelPanel {...props} />);
      fireEvent.click(screen.getByTitle('Cancel travel'));
      expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when the cancel button is clicked', () => {
      render(<TravelPanel {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onAdvance when the advance button is clicked', () => {
      render(<TravelPanel {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Advance One Hex' }));
      expect(props.onAdvance).toHaveBeenCalledTimes(1);
    });

    it('should call onForceCamp when the camp button is clicked', () => {
      render(<TravelPanel {...props} dayExhausted />);
      fireEvent.click(screen.getByRole('button', { name: 'Camp' }));
      expect(props.onForceCamp).toHaveBeenCalledTimes(1);
    });

    it('should call onForcedMarch when the forced march button is clicked', () => {
      render(<TravelPanel {...props} dayExhausted />);
      fireEvent.click(screen.getByRole('button', { name: 'Forced March' }));
      expect(props.onForcedMarch).toHaveBeenCalledTimes(1);
    });

    it('should call onReRollWeather when the re-roll button is clicked', () => {
      render(<TravelPanel {...props} weather={{ icon: 'sun', label: 'Sunny', description: 'Clear' }} />);
      fireEvent.click(screen.getByTitle('Re-roll weather'));
      expect(props.onReRollWeather).toHaveBeenCalledTimes(1);
    });
  });

  describe('travel time display', () => {
    const plainsTerrain = { '0,0': 'plains' };

    it('should show the current hex travel time at the current pace', () => {
      render(<TravelPanel {...props} terrain={plainsTerrain} />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'normal')))).toBeInTheDocument();
    });

    it('should fall back to plains when the current hex has no terrain entry', () => {
      render(<TravelPanel {...props} terrain={{}} />);
      expect(screen.getByText('Next hex')).toBeInTheDocument();
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'normal')))).toBeInTheDocument();
    });

    it('should not render the next-hex stat when the path is fully traversed', () => {
      render(<TravelPanel {...props} terrain={plainsTerrain} pathIndex={mockPath.length} />);
      expect(screen.queryByText('Next hex')).not.toBeInTheDocument();
    });

    it('should not render the next-hex stat when the path is empty', () => {
      render(<TravelPanel {...props} terrain={plainsTerrain} path={[]} />);
      expect(screen.queryByText('Next hex')).not.toBeInTheDocument();
    });

    it('should show horseback-adjusted travel time when horseback is true', () => {
      render(<TravelPanel {...props} terrain={plainsTerrain} horseback />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'normal', true)))).toBeInTheDocument();
    });
  });
});

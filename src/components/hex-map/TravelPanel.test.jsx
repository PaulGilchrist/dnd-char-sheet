// @improved-by-ai
import { render, screen, fireEvent, within } from '@testing-library/react';
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
    it('should render nothing when travel is not active', () => {
      const { container } = render(<TravelPanel {...props} isTravelActive={false} />);
      expect(container).toBeEmptyDOMElement();
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
    it('should fill the bar in proportion to accrued cost', () => {
      const { container } = render(<TravelPanel {...props} accruedCost={5} dailyBudget={10} />);
      expect(container.querySelector('.travel-budget-fill')).toHaveStyle({ width: '50%' });
    });

    it('should cap the bar at 100% when cost exceeds the budget', () => {
      const { container } = render(<TravelPanel {...props} accruedCost={15} dailyBudget={10} />);
      expect(container.querySelector('.travel-budget-fill')).toHaveStyle({ width: '100%' });
    });

    it('should leave the bar empty when daily budget is zero', () => {
      const { container } = render(<TravelPanel {...props} accruedCost={5} dailyBudget={0} />);
      expect(container.querySelector('.travel-budget-fill')).toHaveStyle({ width: '0%' });
    });

    it('should render the accrued cost and daily budget', () => {
      render(<TravelPanel {...props} accruedCost={7.5} dailyBudget={10} />);
      expect(screen.getByText('7.5 / 10')).toBeInTheDocument();
    });

    it('should render the remaining budget', () => {
      render(<TravelPanel {...props} accruedCost={3} dailyBudget={10} />);
      expect(screen.getByText('7.0 left')).toBeInTheDocument();
    });

    it('should clamp remaining budget at 0.0 when cost exceeds the budget', () => {
      render(<TravelPanel {...props} accruedCost={15} dailyBudget={10} />);
      expect(screen.getByText('0.0 left')).toBeInTheDocument();
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
      const { container } = render(<TravelPanel {...props} forcedMarchHours={0} />);
      expect(container.querySelector('.travel-panel-exhaustion')).not.toBeInTheDocument();
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

    it('should render the re-roll button when weather is present', () => {
      render(<TravelPanel {...props} weather={weather} />);
      expect(screen.getByTitle('Re-roll weather')).toBeInTheDocument();
    });

    it('should not render the weather section when weather is null', () => {
      render(<TravelPanel {...props} weather={null} />);
      expect(screen.queryByText('Weather:')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Re-roll weather')).not.toBeInTheDocument();
    });
  });

  describe('event frequency buttons', () => {
    it('should render a button for every event frequency', () => {
      const { container } = render(<TravelPanel {...props} />);
      const freqBox = within(container.querySelector('.travel-panel-frequency'));
      Object.values(EVENT_FREQUENCIES).forEach(freq => {
        expect(freqBox.getByRole('button', { name: freq.label })).toBeInTheDocument();
      });
    });

    it('should highlight the active frequency button', () => {
      const { container } = render(<TravelPanel {...props} eventFrequency="sparse" />);
      const freqBox = within(container.querySelector('.travel-panel-frequency'));
      expect(freqBox.getByRole('button', { name: EVENT_FREQUENCIES.sparse.label })).toHaveClass('active');
      expect(freqBox.getByRole('button', { name: EVENT_FREQUENCIES.frequent.label })).not.toHaveClass('active');
    });

    it('should call onSetEventFrequency with the chosen frequency', () => {
      const { container } = render(<TravelPanel {...props} eventFrequency="sparse" />);
      const freqBox = within(container.querySelector('.travel-panel-frequency'));
      fireEvent.click(freqBox.getByRole('button', { name: EVENT_FREQUENCIES.frequent.label }));
      expect(props.onSetEventFrequency).toHaveBeenCalledWith('frequent');
    });
  });

  describe('pace buttons', () => {
    it('should render a button for every travel pace', () => {
      const { container } = render(<TravelPanel {...props} />);
      const paceBox = within(container.querySelector('.travel-panel-pace'));
      TRAVEL_PACES.forEach(pace => {
        expect(paceBox.getByRole('button', { name: pace.name })).toBeInTheDocument();
      });
    });

    it('should highlight the active pace button', () => {
      const { container } = render(<TravelPanel {...props} travelPace="slow" />);
      const paceBox = within(container.querySelector('.travel-panel-pace'));
      expect(paceBox.getByRole('button', { name: 'Slow' })).toHaveClass('active');
      expect(paceBox.getByRole('button', { name: 'Normal' })).not.toHaveClass('active');
    });

    it('should call onChangePace with the chosen pace', () => {
      const { container } = render(<TravelPanel {...props} travelPace="normal" />);
      const paceBox = within(container.querySelector('.travel-panel-pace'));
      fireEvent.click(paceBox.getByRole('button', { name: 'Fast' }));
      expect(props.onChangePace).toHaveBeenCalledWith('fast');
    });
  });

  describe('horseback toggle', () => {
    it('should show Walking or Horseback label based on horseback prop', () => {
      const { rerender } = render(<TravelPanel {...props} horseback={false} />);
      expect(screen.getByRole('button', { name: 'Walking' })).toBeInTheDocument();
      rerender(<TravelPanel {...props} horseback />);
      expect(screen.getByRole('button', { name: 'Horseback' })).toBeInTheDocument();
    });

    it('should highlight the toggle when horseback is active', () => {
      render(<TravelPanel {...props} horseback />);
      expect(screen.getByRole('button', { name: 'Horseback' })).toHaveClass('active');
    });

    it('should call onToggleHorseback when clicked', () => {
      render(<TravelPanel {...props} horseback={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Walking' }));
      expect(props.onToggleHorseback).toHaveBeenCalledTimes(1);
    });
  });

  describe('advance button', () => {
    it('should be disabled when the travel budget is exhausted', () => {
      render(<TravelPanel {...props} dayExhausted />);
      expect(screen.getByRole('button', { name: 'Advance One Hex' })).toBeDisabled();
    });

    it('should read "Arrived" and be disabled at the end of the path', () => {
      render(<TravelPanel {...props} pathIndex={mockPath.length} />);
      expect(screen.getByRole('button', { name: 'Arrived' })).toBeDisabled();
    });

    it('should be disabled while an event is pending', () => {
      render(<TravelPanel {...props} pendingEvent={{ title: 'Ambush' }} />);
      expect(screen.getByRole('button', { name: 'Advance One Hex' })).toBeDisabled();
    });

    it('should be disabled when the party has max exhaustion', () => {
      render(<TravelPanel {...props} partyHasMaxExhaustion />);
      expect(screen.getByRole('button', { name: 'Advance One Hex' })).toBeDisabled();
    });

    it('should be disabled when the path is empty', () => {
      render(<TravelPanel {...props} path={[]} pathIndex={0} />);
      expect(screen.getByRole('button', { name: 'Arrived' })).toBeDisabled();
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

  describe('draggable header', () => {
    it('should set cursor to grabbing on header pointer down', () => {
      const { container } = render(<TravelPanel {...props} />);
      const header = container.querySelector('.travel-panel-header');
      fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });
      expect(container.querySelector('.travel-panel').style.cursor).toBe('grabbing');
    });

    it('should move the panel on pointer move', () => {
      const { container } = render(<TravelPanel {...props} />);
      const header = container.querySelector('.travel-panel-header');
      const panel = container.querySelector('.travel-panel');
      fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });

      fireEvent.pointerMove(document, { clientX: 150, clientY: 120 });
      expect(panel.style.left).toBe('50px');
      expect(panel.style.top).toBe('20px');
      expect(panel.style.bottom).toBe('auto');
      expect(panel.style.transform).toBe('none');
    });

    it('should reset cursor on pointer up', () => {
      const { container } = render(<TravelPanel {...props} />);
      const header = container.querySelector('.travel-panel-header');
      const panel = container.querySelector('.travel-panel');
      fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });

      fireEvent.pointerUp(document);
      expect(panel.style.cursor).toBe('');
    });

    it('should not start a drag when pointer down lands on a button', () => {
      const { container } = render(<TravelPanel {...props} />);
      const closeBtn = container.querySelector('.travel-panel-header button');
      fireEvent.pointerDown(closeBtn, { clientX: 100, clientY: 100, target: closeBtn });
      expect(container.querySelector('.travel-panel').style.cursor).toBe('');
    });
  });

  describe('travel time display', () => {
    const plainsTerrain = { '0,0': 'plains' };
    const mountainsTerrain = { '0,0': 'mountains' };

    it('should show the current hex travel time at the current pace', () => {
      render(<TravelPanel {...props} terrain={plainsTerrain} />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'normal')))).toBeInTheDocument();
    });

    it('should update travel time for slow pace', () => {
      render(<TravelPanel {...props} travelPace="slow" terrain={plainsTerrain} />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'slow')))).toBeInTheDocument();
    });

    it('should update travel time for fast pace', () => {
      render(<TravelPanel {...props} travelPace="fast" terrain={plainsTerrain} />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'fast')))).toBeInTheDocument();
    });

    it('should reflect the terrain move cost', () => {
      render(<TravelPanel {...props} terrain={mountainsTerrain} />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('mountains', 'normal')))).toBeInTheDocument();
    });

    it('should halve travel time when travelling by horseback', () => {
      render(<TravelPanel {...props} terrain={plainsTerrain} horseback />);
      expect(screen.getByText(formatTravelTime(getHexTravelTime('plains', 'normal', true)))).toBeInTheDocument();
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
  });

  describe('structure', () => {
    it('should render all core panel sections', () => {
      const { container } = render(<TravelPanel {...props} />);
      expect(container.querySelector('.travel-panel')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-header')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-frequency')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-pace')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-horseback')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-stats')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-budget-bar')).toBeInTheDocument();
      expect(container.querySelector('.travel-panel-controls')).toBeInTheDocument();
    });
  });
});

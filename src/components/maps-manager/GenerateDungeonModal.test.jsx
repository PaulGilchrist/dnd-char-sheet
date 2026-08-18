// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenerateDungeonModal from './GenerateDungeonModal';

const { dungeonMocks } = vi.hoisted(() => {
  const defaultDungeonResult = {
    name: 'Test Dungeon',
    gridSize: 30,
    walls: [],
    placedItems: [],
    players: [],
    zoom: 1,
    panX: 0,
    panY: 0,
  };
  return {
    dungeonMocks: {
      generateDungeon: vi.fn(() => ({ ...defaultDungeonResult })),
      generateAdjacentDungeon: vi.fn(() => ({ ...defaultDungeonResult })),
    },
  };
});

const { mapsServiceMocks } = vi.hoisted(() => ({
  mapsServiceMocks: {
    createMap: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../services/maps/dungeonGenerator.js', () => dungeonMocks);
vi.mock('../../services/maps/mapsService.js', () => mapsServiceMocks);

// ---------------------------------------------------------------------------
// Interaction helpers
// ---------------------------------------------------------------------------
const fillMapName = (name) =>
  fireEvent.change(screen.getByLabelText(/Map Name/), { target: { value: name } });

const clickGenerate = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

const clickCancelButton = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

const selectMode = (modeLabel) =>
  fireEvent.click(screen.getByRole('button', { name: modeLabel }));

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GenerateDungeonModal', () => {
  let props;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      campaignName: 'test-campaign',
      initialMapName: '',
      onClose: vi.fn(),
      onMapCreated: vi.fn(),
    };
  });

  afterEach(() => {
    if (container) {
      container.remove();
      container = null;
    }
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders modal with title and form fields', () => {
      ({ container } = render(<GenerateDungeonModal {...props} />));
      expect(screen.getByText('Generate Dungeon Map')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. Goblin Hideout')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Random if empty')).toBeInTheDocument();
    });

    it('pre-fills map name from initialMapName prop', () => {
      render(<GenerateDungeonModal {...props} initialMapName="Pre-filled Name" />);
      expect(screen.getByDisplayValue('Pre-filled Name')).toBeInTheDocument();
    });

    it('renders BSP mode controls by default', () => {
      render(<GenerateDungeonModal {...props} />);
      expect(screen.getByLabelText(/Grid Size/)).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: /Density/ })).toBeInTheDocument();
      expect(screen.queryByRole('slider', { name: /Room Count/ })).not.toBeInTheDocument();
    });

    it('renders adjacent mode controls when selected', () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      expect(screen.getByRole('slider', { name: /Room Count/ })).toBeInTheDocument();
      expect(screen.getByText('Cramped')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Spacious')).toBeInTheDocument();
      expect(screen.getByText('Compact (rooms adjacent)')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
      expect(screen.getByText('Linear')).toBeInTheDocument();
      expect(screen.getByText('Forking')).toBeInTheDocument();
      expect(screen.getByText('Winding')).toBeInTheDocument();
    });

    it('renders BSP mode controls when re-selected after adjacent', () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      selectMode('BSP Dungeon');
      expect(screen.getByRole('slider', { name: /Density/ })).toBeInTheDocument();
      expect(screen.queryByRole('slider', { name: /Room Count/ })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Generate button state
  // -------------------------------------------------------------------------
  describe('generate button state', () => {
    it('is disabled when map name is empty', () => {
      render(<GenerateDungeonModal {...props} />);
      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    });

    it('is disabled when map name is only whitespace', () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('   ');
      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    });

    it('is enabled when map name has content', () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('My Dungeon');
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
    });

    it('is disabled during generation', async () => {
      const pending = deferred();
      mapsServiceMocks.createMap.mockImplementationOnce(() => pending.promise);
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Test');
      clickGenerate();

      const generatingButton = await screen.findByRole('button', { name: 'Generating...' });
      expect(generatingButton).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

      pending.resolve({});
      await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    });
  });

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------
  describe('cancel', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<GenerateDungeonModal {...props} />);
      clickCancelButton();
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the overlay background is clicked', () => {
      ({ container } = render(<GenerateDungeonModal {...props} />));
      const overlay = container.querySelector('.maps-manager-modal-overlay');
      fireEvent.click(overlay);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Generation flow
  // -------------------------------------------------------------------------
  describe('generation flow', () => {
    it('creates the map with typed name and generated data, then notifies and closes', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Goblin Hideout');
      clickGenerate();

      await waitFor(() => {
        expect(mapsServiceMocks.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Goblin Hideout',
          expect.objectContaining({ gridSize: 30 }),
        );
      });
      await waitFor(() => {
        expect(props.onMapCreated).toHaveBeenCalledTimes(1);
        expect(props.onClose).toHaveBeenCalledTimes(1);
      });
      expect(dungeonMocks.generateAdjacentDungeon).not.toHaveBeenCalled();
    });

    it('passes generateDungeon result data to createMap', async () => {
      const expectedData = {
        walls: ['0,0', '1,0'],
        placedItems: [{ type: 'chest', gridX: 5, gridY: 5 }],
        players: [],
        zoom: 1,
        panX: 0,
        panY: 0,
      };
      dungeonMocks.generateDungeon.mockReturnValueOnce({
        name: 'Generated Name',
        ...expectedData,
      });

      render(<GenerateDungeonModal {...props} />);
      fillMapName('Data Test');
      clickGenerate();

      await waitFor(() => {
        expect(mapsServiceMocks.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Data Test',
          expect.objectContaining(expectedData),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Grid size clamping
  // -------------------------------------------------------------------------
  describe('grid size clamping', () => {
    it('shows an error and clamps to minimum when grid size is below 7', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '3' } });
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText(/Grid size must be between/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 7 }),
        );
      });
    });

    it('shows an error and clamps to maximum when grid size is above 100', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '200' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 100 }),
        );
      });
    });

    it('uses grid size as-is when within valid range', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '50' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 50 }),
        );
      });
    });

    it('uses exact minimum boundary (7) without clamping error', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '7' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 7 }),
        );
      });
      await waitFor(() => {
        expect(screen.queryByText(/Grid size must be between/)).not.toBeInTheDocument();
      });
    });

    it('uses exact maximum boundary (100) without clamping error', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '100' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 100 }),
        );
      });
      await waitFor(() => {
        expect(screen.queryByText(/Grid size must be between/)).not.toBeInTheDocument();
      });
    });

    it('shows clamping error message with the actual clamped value', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '5' } });
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText(/Using 7/)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Density slider
  // -------------------------------------------------------------------------
  describe('density slider', () => {
    it('passes density as a decimal to generateDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Density/ }), { target: { value: '80' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ density: 0.8 }),
        );
      });
    });

    it('passes density of 100% as 1.0', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Density/ }), { target: { value: '100' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ density: 1.0 }),
        );
      });
    });

    it('passes density of 10% as 0.1', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Density/ }), { target: { value: '10' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ density: 0.1 }),
        );
      });
    });

    it('passes default density of 50% as 0.5', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ density: 0.5 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Adjacent mode parameters
  // -------------------------------------------------------------------------
  describe('adjacent mode parameters', () => {
    it('calls generateAdjacentDungeon with default parameters', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({
            roomCount: 8,
            corridorLength: 'compact',
            layoutStyle: 'balanced',
          }),
        );
      });
      expect(dungeonMocks.generateDungeon).not.toHaveBeenCalled();
    });

    it('passes the room count slider value to generateAdjacentDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Room Count/ }), { target: { value: '15' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ roomCount: 15 }),
        );
      });
    });

    it('passes minimum room count (3) to generateAdjacentDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Room Count/ }), { target: { value: '3' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ roomCount: 3 }),
        );
      });
    });

    it('passes maximum room count (20) to generateAdjacentDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Room Count/ }), { target: { value: '20' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ roomCount: 20 }),
        );
      });
    });

    it.each([
      ['Cramped', 3, 8],
      ['Standard', 4, 12],
      ['Spacious', 5, 15],
    ])('scales min/max room dimensions for %s room size', async (roomSize, minRoom, maxRoom) => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      fireEvent.click(screen.getByText(roomSize));
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ minRoom, maxRoom }),
        );
      });
    });

    it.each([
      ['Compact (rooms adjacent)', 'compact'],
      ['Moderate', 'moderate'],
      ['Sprawling (long halls)', 'sprawling'],
    ])('passes corridor length "%s" to generateAdjacentDungeon', async (_label, expectedValue) => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      fireEvent.click(screen.getByText(_label));
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ corridorLength: expectedValue }),
        );
      });
    });

    it.each([
      ['Balanced', 'balanced'],
      ['Linear', 'linear'],
      ['Forking', 'forking'],
      ['Winding', 'winding'],
    ])('passes layout style "%s" to generateAdjacentDungeon', async (_label, expectedValue) => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Adjacent Dungeon');
      fireEvent.click(screen.getByText(_label));
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ layoutStyle: expectedValue }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Seed handling
  // -------------------------------------------------------------------------
  describe('seed handling', () => {
    it('passes the parsed integer seed to generateDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Seeded Dungeon');
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), { target: { value: '42' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ seed: 42 }),
        );
      });
    });

    it('passes the parsed integer seed to generateAdjacentDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectMode('Room Adjacent');
      fillMapName('Seeded Dungeon');
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), { target: { value: '99' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ seed: 99 }),
        );
      });
    });

    it('generates a deterministic random seed when the seed input is empty', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      try {
        render(<GenerateDungeonModal {...props} />);
        fillMapName('Random Dungeon');
        clickGenerate();

        await waitFor(() => {
          expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
            expect.objectContaining({ seed: 1073741823 }),
          );
        });
      } finally {
        randomSpy.mockRestore();
      }
    });

    it('passes NaN when seed is non-numeric', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), { target: { value: 'abc' } });
      clickGenerate();

      await waitFor(() => {
        const callArgs = dungeonMocks.generateDungeon.mock.calls[0][0];
        expect(callArgs.seed).toBeNaN();
      });
    });

    it('parses seed with leading zeros', async () => {
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Dungeon');
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), { target: { value: '0042' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ seed: 42 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('shows the error, re-enables buttons, and does not close when generation throws', async () => {
      dungeonMocks.generateDungeon.mockImplementationOnce(() => { throw new Error('Boom'); });
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Test');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('Boom')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
      expect(props.onMapCreated).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('displays error with maps-manager-error class', async () => {
      dungeonMocks.generateDungeon.mockImplementationOnce(() => { throw new Error('Render error'); });
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Test');
      clickGenerate();

      await waitFor(() => {
        const errorEl = screen.getByText('Render error');
        expect(errorEl).toHaveClass('maps-manager-error');
      });
    });

    it('shows the error and does not close when createMap fails', async () => {
      mapsServiceMocks.createMap.mockRejectedValueOnce(new Error('Save failed'));
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Test');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
      expect(props.onMapCreated).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('allows a successful retry after a generation error', async () => {
      dungeonMocks.generateDungeon
        .mockImplementationOnce(() => { throw new Error('First fail'); })
        .mockReturnValueOnce({ name: 'Retry Dungeon', gridSize: 30, walls: [], placedItems: [], players: [], zoom: 1, panX: 0, panY: 0 });

      render(<GenerateDungeonModal {...props} />);
      fillMapName('Retry');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('First fail')).toBeInTheDocument();
      });

      clickGenerate();
      await waitFor(() => {
        expect(props.onMapCreated).toHaveBeenCalled();
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('allows a successful retry after a createMap failure', async () => {
      mapsServiceMocks.createMap
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({});

      render(<GenerateDungeonModal {...props} />);
      fillMapName('Retry');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      clickGenerate();
      await waitFor(() => {
        expect(props.onMapCreated).toHaveBeenCalled();
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('uses default error message when error has no message', async () => {
      dungeonMocks.generateDungeon.mockImplementationOnce(() => { throw new Error(); });
      render(<GenerateDungeonModal {...props} />);
      fillMapName('Test');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('Failed to generate dungeon')).toBeInTheDocument();
      });
    });
  });
});

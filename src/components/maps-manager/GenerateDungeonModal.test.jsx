// @cleaned-by-ai
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
// Interaction helpers (kept next to the suite that uses them)
// ---------------------------------------------------------------------------
const typeMapName = (name) =>
  fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
    target: { value: name },
  });

const selectAdjacentMode = () =>
  fireEvent.click(screen.getByRole('button', { name: /Room Adjacent/i }));

const clickGenerate = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

describe('GenerateDungeonModal', () => {
  let props;

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      campaignName: 'test-campaign',
      initialMapName: '',
      onClose: vi.fn(),
      onMapCreated: vi.fn(),
    };
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders modal with title and form fields', () => {
      render(<GenerateDungeonModal {...props} />);
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
      selectAdjacentMode();
      expect(screen.getByRole('slider', { name: /Room Count/ })).toBeInTheDocument();
      // Option buttons live inside a <label>, so their accessible names are polluted
      // ("Room Size Standard Spacious" for the first button); match by text instead.
      expect(screen.getByText('Cramped')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Spacious')).toBeInTheDocument();
      expect(screen.getByText('Compact (rooms adjacent)')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
      expect(screen.getByText('Linear')).toBeInTheDocument();
      expect(screen.getByText('Forking')).toBeInTheDocument();
      expect(screen.getByText('Winding')).toBeInTheDocument();
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

    it('is enabled when map name is provided', () => {
      render(<GenerateDungeonModal {...props} />);
      typeMapName('My Dungeon');
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // During generation
  // -------------------------------------------------------------------------
  describe('during generation', () => {
    it('disables both buttons and shows Generating text while the map is being created', async () => {
      const pending = deferred();
      mapsServiceMocks.createMap.mockImplementationOnce(() => pending.promise);
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Test');
      clickGenerate();

      const generateButton = await screen.findByRole('button', { name: 'Generating...' });
      expect(generateButton).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

      pending.resolve({});
      await waitFor(() => {
        expect(props.onClose).toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------
  describe('cancel', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('calls onClose when the overlay is clicked', () => {
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(document.querySelector('.maps-manager-modal-overlay'));
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Generation flow
  // -------------------------------------------------------------------------
  describe('generation flow', () => {
    it('creates the map with the typed name and generated data, then notifies and closes', async () => {
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Goblin Hideout');
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
  });

  // -------------------------------------------------------------------------
  // Grid size clamping
  // -------------------------------------------------------------------------
  describe('grid size clamping', () => {
    it('shows an error and clamps to the minimum when grid size is below 7', async () => {
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Dungeon');
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

    it('clamps to the maximum when grid size is above 100', async () => {
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Dungeon');
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
      typeMapName('Dungeon');
      fireEvent.change(screen.getByLabelText(/Grid Size/), { target: { value: '50' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 50 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Density slider
  // -------------------------------------------------------------------------
  describe('density slider', () => {
    it('passes density as a decimal to generateDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Density/ }), { target: { value: '80' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ density: 0.8 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Adjacent mode parameters
  // -------------------------------------------------------------------------
  describe('adjacent mode parameters', () => {
    it('calls generateAdjacentDungeon with default parameters and not the BSP generator', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectAdjacentMode();
      typeMapName('Adjacent Dungeon');
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
      selectAdjacentMode();
      typeMapName('Adjacent Dungeon');
      fireEvent.change(screen.getByRole('slider', { name: /Room Count/ }), { target: { value: '15' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ roomCount: 15 }),
        );
      });
    });

    it.each([
      ['Cramped', 3, 8],
      ['Standard', 4, 12],
      ['Spacious', 5, 15],
    ])('scales min/max room dimensions for %s room size', async (roomSize, minRoom, maxRoom) => {
      render(<GenerateDungeonModal {...props} />);
      selectAdjacentMode();
      typeMapName('Adjacent Dungeon');
      fireEvent.click(screen.getByText(roomSize));
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ minRoom, maxRoom }),
        );
      });
    });

    it('passes the selected corridor length to generateAdjacentDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectAdjacentMode();
      typeMapName('Adjacent Dungeon');
      fireEvent.click(screen.getByText('Sprawling (long halls)'));
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ corridorLength: 'sprawling' }),
        );
      });
    });

    it('passes the selected layout style to generateAdjacentDungeon', async () => {
      render(<GenerateDungeonModal {...props} />);
      selectAdjacentMode();
      typeMapName('Adjacent Dungeon');
      fireEvent.click(screen.getByText('Winding'));
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateAdjacentDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ layoutStyle: 'winding' }),
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
      typeMapName('Seeded Dungeon');
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), { target: { value: '42' } });
      clickGenerate();

      await waitFor(() => {
        expect(dungeonMocks.generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ seed: 42 }),
        );
      });
    });

    it('generates a deterministic random seed when the seed input is empty', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      try {
        render(<GenerateDungeonModal {...props} />);
        typeMapName('Random Dungeon');
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

  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('shows the error, re-enables buttons, and does not close when generation throws', async () => {
      dungeonMocks.generateDungeon.mockImplementationOnce(() => { throw new Error('Boom'); });
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Test');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('Boom')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
      expect(props.onMapCreated).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('shows the error and does not close when createMap fails', async () => {
      mapsServiceMocks.createMap.mockRejectedValueOnce(new Error('Save failed'));
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Test');
      clickGenerate();

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
      expect(props.onMapCreated).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('allows a successful retry after an error', async () => {
      dungeonMocks.generateDungeon.mockImplementationOnce(() => { throw new Error('First fail'); });
      render(<GenerateDungeonModal {...props} />);
      typeMapName('Retry');
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
  });});

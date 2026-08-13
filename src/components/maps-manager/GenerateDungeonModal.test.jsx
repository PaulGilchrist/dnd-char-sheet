import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenerateDungeonModal from './GenerateDungeonModal';
import * as mapsService from '../../services/maps/mapsService.js';

// Dungeon generator returns a minimal map object; callers can override per-test
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

vi.mock('../../services/maps/dungeonGenerator.js', () => ({
  generateDungeon: vi.fn(() => ({ ...defaultDungeonResult })),
  generateAdjacentDungeon: vi.fn(() => ({ ...defaultDungeonResult })),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  createMap: vi.fn().mockResolvedValue({}),
}));

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
      expect(screen.getByText('Grid Size')).toBeInTheDocument();
      expect(screen.getByText(/Density:/)).toBeInTheDocument();
      expect(screen.queryByText('Room Count:')).not.toBeInTheDocument();
    });

    it('renders adjacent mode controls when selected', () => {
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByRole('button', { name: /Room Adjacent/i }));
      expect(screen.getByText(/Room Count:/)).toBeInTheDocument();
      expect(screen.getByText('Cramped')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Spacious')).toBeInTheDocument();
      expect(screen.getByText('Compact (rooms adjacent)')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
      expect(screen.getByText('Linear')).toBeInTheDocument();
      expect(screen.getByText('Forking')).toBeInTheDocument();
      expect(screen.getByText('Winding')).toBeInTheDocument();
    });

    it('renders Cancel and Generate buttons', () => {
      render(<GenerateDungeonModal {...props} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
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
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'My Dungeon' },
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
    });

    it('is disabled during generation', async () => {
      let resolve;
      mapsService.createMap.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
      });
      resolve();
    });

    it('shows generating state text during generation', async () => {
      let resolve;
      mapsService.createMap.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
      resolve();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------
  describe('cancel', () => {
    it('calls onClose when clicked', () => {
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('is disabled during generation', async () => {
      let resolve;
      mapsService.createMap.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      });
      resolve();
    });
  });

  // -------------------------------------------------------------------------
  // Generation flow
  // -------------------------------------------------------------------------
  describe('generation flow', () => {
    it('calls createMap, onMapCreated, and onClose on success', async () => {
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'My Dungeon' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalled();
        expect(props.onMapCreated).toHaveBeenCalled();
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('does not call createMap when map name is whitespace-only', async () => {
      render(<GenerateDungeonModal {...props} initialMapName=" " />);
      // Generate button stays disabled for whitespace-only names
      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
      expect(mapsService.createMap).not.toHaveBeenCalled();
    });

    it('shows error when generation throws', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockImplementationOnce(() => { throw new Error('Generation failed'); });
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });
    });

    it('re-enables buttons after error', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockImplementationOnce(() => { throw new Error('Boom'); });
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByText('Boom')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
    });

    it('passes map data to createMap with correct campaign and name', async () => {
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Goblin Hideout' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Goblin Hideout',
          expect.objectContaining({ gridSize: 30 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Grid size clamping
  // -------------------------------------------------------------------------
  describe('grid size clamping', () => {
    it('shows error and clamps to min when grid size is below 7', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Dungeon' },
      });
      const gridInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(gridInputs[0], { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByText(/Grid size must be between/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 7 }),
        );
      });
    });

    it('shows error and clamps to max when grid size is above 100', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Dungeon' },
      });
      const gridInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(gridInputs[0], { target: { value: '200' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 100 }),
        );
      });
    });

    it('uses grid size as-is when within valid range', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Dungeon' },
      });
      const gridInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(gridInputs[0], { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ gridSize: 50 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Density slider
  // -------------------------------------------------------------------------
  describe('density slider', () => {
    it('passes density as decimal to generateDungeon', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Dungeon' },
      });
      const densitySlider = screen.getByRole('slider', { name: /Density/ });
      fireEvent.change(densitySlider, { target: { value: '80' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalledWith(
          expect.objectContaining({ density: 0.8 }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Adjacent mode parameters
  // -------------------------------------------------------------------------
  describe('adjacent mode parameters', () => {
    it('calls generateAdjacentDungeon with default params', async () => {
      const { generateAdjacentDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateAdjacentDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByText('Room Adjacent'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Adjacent Dungeon' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateAdjacentDungeon).toHaveBeenCalled();
      });
      const callArgs = generateAdjacentDungeon.mock.calls[0][0];
      expect(callArgs.roomCount).toBe(8);
      expect(callArgs.corridorLength).toBe('compact');
      expect(callArgs.layoutStyle).toBe('balanced');
    });

    it('passes custom room count to generateAdjacentDungeon', async () => {
      const { generateAdjacentDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateAdjacentDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByText('Room Adjacent'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Adjacent Dungeon' },
      });
      const roomSlider = screen.getByRole('slider', { name: /Room Count/ });
      fireEvent.change(roomSlider, { target: { value: '15' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateAdjacentDungeon).toHaveBeenCalled();
      });
      const callArgs = generateAdjacentDungeon.mock.calls[0][0];
      expect(callArgs.roomCount).toBe(15);
    });

    it('passes room size multiplier to generateAdjacentDungeon', async () => {
      const { generateAdjacentDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateAdjacentDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByText('Room Adjacent'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Adjacent Dungeon' },
      });
      fireEvent.click(screen.getByText('Spacious'));
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateAdjacentDungeon).toHaveBeenCalled();
      });
      const callArgs = generateAdjacentDungeon.mock.calls[0][0];
      expect(callArgs.minRoom).toBeGreaterThan(3);
      expect(callArgs.maxRoom).toBeGreaterThan(6);
    });

    it('passes corridor length to generateAdjacentDungeon', async () => {
      const { generateAdjacentDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateAdjacentDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByText('Room Adjacent'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Adjacent Dungeon' },
      });
      fireEvent.click(screen.getByText('Sprawling (long halls)'));
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateAdjacentDungeon).toHaveBeenCalled();
      });
      const callArgs = generateAdjacentDungeon.mock.calls[0][0];
      expect(callArgs.corridorLength).toBe('sprawling');
    });

    it('passes layout style to generateAdjacentDungeon', async () => {
      const { generateAdjacentDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateAdjacentDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.click(screen.getByText('Room Adjacent'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Adjacent Dungeon' },
      });
      fireEvent.click(screen.getByText('Winding'));
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateAdjacentDungeon).toHaveBeenCalled();
      });
      const callArgs = generateAdjacentDungeon.mock.calls[0][0];
      expect(callArgs.layoutStyle).toBe('winding');
    });
  });

  // -------------------------------------------------------------------------
  // Seed handling
  // -------------------------------------------------------------------------
  describe('seed handling', () => {
    it('parses seed as integer when provided', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Seeded Dungeon' },
      });
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), {
        target: { value: '42' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalled();
      });
      const callArgs = generateDungeon.mock.calls[0][0];
      expect(callArgs.seed).toBe(42);
    });

    it('generates random seed when seed input is empty', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Random Dungeon' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalled();
      });
      const callArgs = generateDungeon.mock.calls[0][0];
      expect(typeof callArgs.seed).toBe('number');
      expect(Number.isInteger(callArgs.seed)).toBe(true);
      expect(callArgs.seed).toBeGreaterThan(0);
      expect(callArgs.seed).toBeLessThan(2147483647);
    });

    it('passes NaN seed when non-numeric string is entered (parseInt behavior)', async () => {
      const { generateDungeon } = await import('../../services/maps/dungeonGenerator.js');
      generateDungeon.mockClear();
      render(<GenerateDungeonModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. Goblin Hideout'), {
        target: { value: 'Dungeon' },
      });
      fireEvent.change(screen.getByPlaceholderText('Random if empty'), {
        target: { value: 'not-a-number' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(generateDungeon).toHaveBeenCalled();
      });
      const callArgs = generateDungeon.mock.calls[0][0];
      // parseInt('not-a-number', 10) returns NaN; the component passes it through
      expect(callArgs.seed).toBeNaN();
    });
  });
});

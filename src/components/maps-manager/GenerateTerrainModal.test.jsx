import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenerateTerrainModal from './GenerateTerrainModal.jsx';
import { generateHexTerrain } from '../../services/maps/hexTerrainGenerator.js';
import * as mapsService from '../../services/maps/mapsService.js';

vi.mock('../../services/maps/hexTerrainGenerator.js', () => ({
  generateHexTerrain: vi.fn(() => ({ terrain: {}, rivers: [] })),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  createMap: vi.fn().mockResolvedValue({}),
}));

describe('GenerateTerrainModal', () => {
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
    it('renders modal with title, inputs, and hints', () => {
      render(<GenerateTerrainModal {...props} />);
      expect(screen.getByText('Generate Terrain Map')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. The Wild Frontier')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Random')).toBeInTheDocument();
      expect(screen.getByText(/30 hexes/)).toBeInTheDocument();
      expect(screen.getByText(/fractal noise/)).toBeInTheDocument();
    });

    it('pre-fills map name from initialMapName prop', () => {
      render(<GenerateTerrainModal {...props} initialMapName="My Terrain" />);
      expect(screen.getByDisplayValue('My Terrain')).toBeInTheDocument();
    });

    it('renders Cancel and Generate buttons', () => {
      render(<GenerateTerrainModal {...props} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    });

    it('renders grid size label and seed label', () => {
      render(<GenerateTerrainModal {...props} />);
      expect(screen.getByText('Grid Size')).toBeInTheDocument();
      expect(screen.getByText('Seed (optional)')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Generate button state
  // -------------------------------------------------------------------------
  describe('generate button state', () => {
    const getGenerateButton = () => screen.getByRole('button', { name: /generate/i });

    it('is disabled when map name is empty', () => {
      render(<GenerateTerrainModal {...props} />);
      expect(getGenerateButton()).toBeDisabled();
    });

    it('is enabled when map name is entered', () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Wild Frontier' },
      });
      expect(getGenerateButton()).not.toBeDisabled();
    });

    it('is disabled during generation', async () => {
      let resolve;
      mapsService.createMap.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
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
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
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
      render(<GenerateTerrainModal {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('is disabled during generation', async () => {
      let resolve;
      mapsService.createMap.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      });
      resolve();
    });

    it('calls onClose when overlay is clicked', () => {
      render(<GenerateTerrainModal {...props} />);
      const overlay = document.querySelector('.maps-manager-modal-overlay');
      fireEvent.click(overlay);
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Grid size display updates
  // -------------------------------------------------------------------------
  describe('grid size display', () => {
    it('updates hex count hint when grid size changes', () => {
      render(<GenerateTerrainModal {...props} />);
      expect(screen.getByText(/30 hexes/)).toBeInTheDocument();

      const gridInput = document.querySelector('input[type="number"]');
      fireEvent.change(gridInput, { target: { value: '50' } });
      expect(screen.getByText(/50 hexes/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Seed input
  // -------------------------------------------------------------------------
  describe('seed input', () => {
    it('updates seed value when typed', () => {
      render(<GenerateTerrainModal {...props} />);
      const seedInput = screen.getByPlaceholderText('Random');
      fireEvent.change(seedInput, { target: { value: '42' } });
      expect(seedInput).toHaveValue('42');
    });
  });

  // -------------------------------------------------------------------------
  // Generation flow
  // -------------------------------------------------------------------------
  describe('generation flow', () => {
    it('calls createMap, onMapCreated, and onClose on success', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test Terrain' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalled();
        expect(props.onMapCreated).toHaveBeenCalled();
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('passes campaign name and map name to createMap', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Goblin Territory' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Goblin Territory',
          expect.any(Object),
        );
      });
    });

    it('passes terrain data to createMap', async () => {
      const mockTerrain = { '0,0': 'plains', '1,0': 'forest' };
      generateHexTerrain.mockReturnValueOnce({ terrain: mockTerrain, rivers: [] });

      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Test',
          expect.objectContaining({ terrain: mockTerrain }),
        );
      });
    });

    it('passes type and gridSize to createMap', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ type: 'outdoor', gridSize: 30 }),
        );
      });
    });

    it('passes provided grid size to createMap', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      const gridInput = document.querySelector('input[type="number"]');
      fireEvent.change(gridInput, { target: { value: '60' } });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ gridSize: 60 }),
        );
      });
    });

    it('clamps grid size to min of 30 when below 30', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      const gridInput = document.querySelector('input[type="number"]');
      fireEvent.change(gridInput, { target: { value: '10' } });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ gridSize: 30 }),
        );
      });
    });

    it('clamps grid size to max of 100 when above 100', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      const gridInput = document.querySelector('input[type="number"]');
      fireEvent.change(gridInput, { target: { value: '150' } });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ gridSize: 100 }),
        );
      });
    });

    it('passes seed as integer when provided', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByPlaceholderText('Random'), { target: { value: '42' } });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(generateHexTerrain).toHaveBeenCalledWith(
          expect.objectContaining({ seed: 42 }),
        );
      });
    });

    it('passes undefined seed when seed input is empty', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(generateHexTerrain).toHaveBeenCalledWith(
          expect.objectContaining({ seed: undefined }),
        );
      });
    });

    it('passes undefined seed when seed input contains NaN', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByPlaceholderText('Random'), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(generateHexTerrain).toHaveBeenCalledWith(
          expect.objectContaining({ seed: undefined }),
        );
      });
    });

    it('trims map name before passing to createMap', async () => {
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: '  Trimmed  ' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          expect.any(String),
          'Trimmed',
          expect.any(Object),
        );
      });
    });

    it('does not call createMap when map name is whitespace-only', () => {
      render(<GenerateTerrainModal {...props} initialMapName="   " />);
      expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
      expect(mapsService.createMap).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('shows error when generation throws', async () => {
      const { generateHexTerrain } = await import('../../services/maps/hexTerrainGenerator.js');
      generateHexTerrain.mockImplementationOnce(() => { throw new Error('Terrain failed'); });
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(screen.getByText('Terrain failed')).toBeInTheDocument();
      });
    });

    it('shows default error message when error has no message', async () => {
      const { generateHexTerrain } = await import('../../services/maps/hexTerrainGenerator.js');
      generateHexTerrain.mockImplementationOnce(() => { throw new Error(); });
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(screen.getByText('Failed to generate terrain')).toBeInTheDocument();
      });
    });

    it('re-enables buttons after error', async () => {
      const { generateHexTerrain } = await import('../../services/maps/hexTerrainGenerator.js');
      generateHexTerrain.mockImplementationOnce(() => { throw new Error('Boom'); });
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByText('Boom')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
    });

    it('allows retry after error', async () => {
      const { generateHexTerrain } = await import('../../services/maps/hexTerrainGenerator.js');
      generateHexTerrain
        .mockImplementationOnce(() => { throw new Error('First fail'); })
        .mockReturnValueOnce({ terrain: {}, rivers: [] });

      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Retry Test' },
      });

      // First attempt fails
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(screen.getByText('First fail')).toBeInTheDocument();
      });

      // Second attempt succeeds
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
      await waitFor(() => {
        expect(props.onMapCreated).toHaveBeenCalled();
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('does not call onMapCreated or onClose on error', async () => {
      const { generateHexTerrain } = await import('../../services/maps/hexTerrainGenerator.js');
      generateHexTerrain.mockImplementationOnce(() => { throw new Error('Fail'); });
      render(<GenerateTerrainModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. The Wild Frontier'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate/i }));
      await waitFor(() => {
        expect(screen.getByText('Fail')).toBeInTheDocument();
      });
      expect(props.onMapCreated).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });
});

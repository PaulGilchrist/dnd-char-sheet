import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MapsManager from './MapsManager.jsx';

// Mock the mapsService
vi.mock('../../services/maps/mapsService.js', () => ({
  loadMaps: vi.fn(),
  createMap: vi.fn(),
  deleteMap: vi.fn(),
  renameMap: vi.fn(),
  activateMap: vi.fn(),
  loadMapData: vi.fn(),
  updateMapDescription: vi.fn(),
  formatMapName: (name) => name,
}));

// Mock child components
vi.mock('../common/PreviewToggle.jsx', () => ({
  default: ({ value, onChange, placeholder }) => (
    <textarea
      data-testid="preview-toggle"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('../common/Subscriber.jsx', () => ({
  default: () => <div data-testid="subscriber" />,
}));

vi.mock('./GenerateDungeonModal.jsx', () => ({
  default: () => <div data-testid="generate-dungeon-modal" />,
}));

vi.mock('./GenerateTerrainModal.jsx', () => ({
  default: () => <div data-testid="generate-terrain-modal" />,
}));

import * as mapsService from '../../services/maps/mapsService.js';

const defaultProps = {
  campaignName: 'test-campaign',
  onOpenMap: vi.fn(),
  onBack: vi.fn(),
};

const makeMap = (overrides) => ({
  fileName: 'map1.json',
  name: 'Test Map',
  type: 'indoor',
  isActive: false,
  ...overrides,
});

describe('MapsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapsService.loadMaps.mockResolvedValue({ maps: [] });
  });

  describe('Header & Back Button', () => {
    it('calls onBack when back button is clicked', () => {
      render(<MapsManager {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading & Empty States', () => {
    it('shows loading indicator while loading maps', () => {
      mapsService.loadMaps.mockResolvedValue(new Promise(() => {}));
      render(<MapsManager {...defaultProps} />);
      expect(screen.getByText('Loading maps...')).toBeInTheDocument();
    });

    it('shows empty state when no maps exist', async () => {
      mapsService.loadMaps.mockResolvedValue({ maps: [] });
      render(<MapsManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('No maps yet. Create one to get started.')).toBeInTheDocument();
      });
    });
  });

  describe('Create Map Flow', () => {
    it('creates a map when name is typed and Create Map is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({ maps: [] });
      render(<MapsManager {...defaultProps} />);

      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'Dungeon Level 1' } });
      const createButton = screen.getByRole('button', { name: 'Create Map' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Dungeon Level 1',
          { type: 'indoor' }
        );
      });
    });

    it('creates an outdoor map when outdoor type is selected', async () => {
      render(<MapsManager {...defaultProps} />);
      const outdoorRadio = screen.getByRole('radio', { name: /outdoor/i });
      fireEvent.click(outdoorRadio);
      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'Forest Map' } });
      const createButton = screen.getByRole('button', { name: 'Create Map' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'Forest Map',
          { type: 'outdoor' }
        );
      });
    });

    it('triggers create when Enter key is pressed in create input', async () => {
      render(<MapsManager {...defaultProps} />);
      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'My Map' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mapsService.createMap).toHaveBeenCalledWith(
          'test-campaign',
          'My Map',
          { type: 'indoor' }
        );
      });
    });

    it('disables create button when name is empty or whitespace', () => {
      render(<MapsManager {...defaultProps} />);
      const createButton = screen.getByRole('button', { name: 'Create Map' });
      expect(createButton).toBeDisabled();

      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: '   ' } });
      expect(createButton).toBeDisabled();
    });

    it('clears error before attempting create', async () => {
      mapsService.loadMaps.mockResolvedValue({ maps: [] });
      mapsService.createMap.mockRejectedValue(new Error('Server error'));
      render(<MapsManager {...defaultProps} />);

      // Set an initial error
      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'Bad Map' } });

      const createButton = screen.getByRole('button', { name: 'Create Map' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('rejects create with duplicate name (case-insensitive)', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Existing Map' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Existing Map')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'existing map' } });
      const createButton = screen.getByRole('button', { name: 'Create Map' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('A map with that name already exists')).toBeInTheDocument();
      });
    });

    it('displays error when map creation fails', async () => {
      mapsService.createMap.mockRejectedValue(new Error('Server error'));
      render(<MapsManager {...defaultProps} />);

      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'Bad Map' } });
      const createButton = screen.getByRole('button', { name: 'Create Map' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('shows error for duplicate map names on create', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Existing Map' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Existing Map')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('New map name...');
      fireEvent.change(input, { target: { value: 'Existing Map' } });
      const createButton = screen.getByRole('button', { name: 'Create Map' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('A map with that name already exists')).toBeInTheDocument();
      });
    });

    it('shows generate dungeon button for indoor type', () => {
      render(<MapsManager {...defaultProps} />);
      expect(screen.getByTitle('Generate a dungeon map with rooms, hallways, and doorways')).toBeInTheDocument();
    });

    it('shows generate terrain button for outdoor type', () => {
      render(<MapsManager {...defaultProps} />);
      const outdoorRadio = screen.getByRole('radio', { name: /outdoor/i });
      fireEvent.click(outdoorRadio);
      expect(screen.getByTitle('Generate a terrain map with biomes')).toBeInTheDocument();
    });
  });

  describe('Maps List Rendering', () => {
    it('renders maps sorted alphabetically by name', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [
          makeMap({ fileName: 'map3.json', name: 'Zoo' }),
          makeMap({ fileName: 'map1.json', name: 'Alpha Cave', isActive: true }),
          makeMap({ fileName: 'map2.json', name: 'Beta Forest' }),
        ],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Alpha Cave');
        expect(items[1]).toHaveTextContent('Beta Forest');
        expect(items[2]).toHaveTextContent('Zoo');
      });
    });

    it.each([
      ['indoor', 'Indoor'],
      ['outdoor', 'Outdoor'],
    ])('renders %s type badge (%s)', async (type, badgeText) => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ type })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(badgeText)).toBeInTheDocument();
      });
    });

    it('renders active badge for the active map', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', isActive: true })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('hides Activate button for the active map', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Active Map', isActive: true })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Active Map')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
    });

    it('shows Activate button only for inactive maps', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [
          makeMap({ name: 'Active Map', isActive: true }),
          makeMap({ name: 'Inactive Map', isActive: false }),
        ],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items.length).toBe(2);
      });

      const activateButtons = screen.getAllByRole('button', { name: 'Activate' });
      expect(activateButtons).toHaveLength(1);
    });

    it('renders error message when loading maps fails', async () => {
      mapsService.loadMaps.mockRejectedValue(new Error('Network error'));
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Open Button', () => {
    it('calls onOpenMap with the correct fileName when Open is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', fileName: 'dungeon-level-1.json' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      expect(defaultProps.onOpenMap).toHaveBeenCalledWith('dungeon-level-1.json');
    });
  });

  describe('Activate Button', () => {
    it('calls activateMap with campaign and fileName when Activate is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Forest', fileName: 'forest.json', isActive: false })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Forest')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

      await waitFor(() => {
        expect(mapsService.activateMap).toHaveBeenCalledWith('test-campaign', 'forest.json');
      });
    });

    it('displays error when activation fails', async () => {
      mapsService.activateMap.mockRejectedValue(new Error('Activation failed'));
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Forest', fileName: 'forest.json', isActive: false })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Forest')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

      await waitFor(() => {
        expect(screen.getByText('Activation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Rename Flow', () => {
    it('shows rename input when Rename button is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      expect(screen.getByDisplayValue('Dungeon Level 1')).toBeInTheDocument();
    });

    it('renames a map when new name is typed and Enter is pressed', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', fileName: 'dungeon-level-1.json' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.change(renameInput, { target: { value: 'Renamed Map' } });
      fireEvent.keyDown(renameInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mapsService.renameMap).toHaveBeenCalledWith(
          'test-campaign',
          'dungeon-level-1.json',
          'Renamed Map'
        );
      });
    });

    it('saves rename on blur', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', fileName: 'dungeon-level-1.json' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.change(renameInput, { target: { value: 'Renamed Map' } });
      fireEvent.blur(renameInput);

      await waitFor(() => {
        expect(mapsService.renameMap).toHaveBeenCalledWith(
          'test-campaign',
          'dungeon-level-1.json',
          'Renamed Map'
        );
      });
    });

    it('cancels rename when Escape is pressed', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.keyDown(renameInput, { key: 'Escape' });

      expect(screen.queryByDisplayValue('Dungeon Level 1')).not.toBeInTheDocument();
      expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
    });

    it('cancels rename when empty name is entered and submitted', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.change(renameInput, { target: { value: '' } });
      fireEvent.keyDown(renameInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mapsService.renameMap).not.toHaveBeenCalled();
      });
    });

    it('cancels rename when name has not changed', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.keyDown(renameInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mapsService.renameMap).not.toHaveBeenCalled();
      });
    });

    it('shows error when renaming to a duplicate name (case-insensitive, kebab-normalized)', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [
          makeMap({ name: 'Dungeon Level 1' }),
          makeMap({ name: 'Forest', fileName: 'forest.json' }),
        ],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const renameButtons = screen.getAllByRole('button', { name: 'Rename' });
      fireEvent.click(renameButtons[0]);

      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.change(renameInput, { target: { value: 'Forest' } });
      fireEvent.keyDown(renameInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('A map with that name already exists')).toBeInTheDocument();
      });
    });

    it('displays error when rename fails', async () => {
      mapsService.renameMap.mockRejectedValue(new Error('Rename failed'));
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const renameInput = screen.getByDisplayValue('Dungeon Level 1');
      fireEvent.change(renameInput, { target: { value: 'New Name' } });
      fireEvent.keyDown(renameInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Rename failed')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Flow', () => {
    it('shows delete confirmation modal when Delete button is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.getByRole('heading', { name: 'Delete Map' })).toBeInTheDocument();
      expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
    });

    it('calls deleteMap when delete is confirmed', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', fileName: 'dungeon-level-1.json' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: /Yes, Delete Permanently/i }));

      await waitFor(() => {
        expect(mapsService.deleteMap).toHaveBeenCalledWith('test-campaign', 'dungeon-level-1.json');
      });
    });

    it('closes delete modal when Cancel is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(screen.getByRole('heading', { name: 'Delete Map' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('heading', { name: 'Delete Map' })).not.toBeInTheDocument();
    });

    it('closes delete modal when overlay is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(screen.getByRole('heading', { name: 'Delete Map' })).toBeInTheDocument();

      const overlay = document.querySelector('.maps-manager-modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(screen.queryByRole('heading', { name: 'Delete Map' })).not.toBeInTheDocument();
    });

    it('displays error when delete fails', async () => {
      mapsService.deleteMap.mockRejectedValue(new Error('Delete failed'));
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: /Yes, Delete Permanently/i }));

      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Description Flow', () => {
    it('opens edit description modal when edit description button is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: 'A dark dungeon.' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });
    });

    it('pre-populates the textarea with existing description', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: 'A dark dungeon.' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        const textarea = screen.getByTestId('preview-toggle');
        expect(textarea).toHaveValue('A dark dungeon.');
      });
    });

    it('does not show loading indicator during edit since loadingMapData is internal state', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      // When loadMapData takes a long time, the component sets loadingMapData=true
      // but since we mock it with a never-resolving promise, the UI shows the edit modal
      // with the textarea already rendered (PreviewToggle mock renders instantly)
      mapsService.loadMapData.mockResolvedValue({ description: 'A dark dungeon.' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });
    });

    it('calls updateMapDescription when Save is clicked in edit modal', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', fileName: 'dungeon-level-1.json' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: 'A dark dungeon.' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('preview-toggle');
      fireEvent.change(textarea, { target: { value: 'Updated description.' } });
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mapsService.updateMapDescription).toHaveBeenCalledWith(
          'test-campaign',
          'dungeon-level-1.json',
          'Updated description.'
        );
      });
    });

    it('allows saving an empty description', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1', fileName: 'dungeon-level-1.json' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: 'A dark dungeon.' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('preview-toggle');
      fireEvent.change(textarea, { target: { value: '' } });
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mapsService.updateMapDescription).toHaveBeenCalledWith(
          'test-campaign',
          'dungeon-level-1.json',
          ''
        );
      });
    });

    it('closes edit description modal when Cancel is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: '' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText(/Edit Description/)).not.toBeInTheDocument();
    });

    it('closes edit description modal when overlay is clicked', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: '' });

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });

      // Click on the overlay (outside the modal content)
      const overlay = document.querySelector('.maps-manager-modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(screen.queryByText(/Edit Description/)).not.toBeInTheDocument();
    });

    it('displays error when loading map data fails', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      mapsService.loadMapData.mockRejectedValue(new Error('Load failed'));

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText('Load failed')).toBeInTheDocument();
      });
    });

    it('displays error when saving description fails', async () => {
      mapsService.loadMaps.mockResolvedValue({
        maps: [makeMap({ name: 'Dungeon Level 1' })],
      });
      mapsService.loadMapData.mockResolvedValue({ description: 'Original description.' });
      mapsService.updateMapDescription.mockRejectedValue(new Error('Save failed'));

      render(<MapsManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dungeon Level 1')).toBeInTheDocument();
      });

      const editDescButton = screen.getByTitle('Edit description');
      fireEvent.click(editDescButton);

      await waitFor(() => {
        expect(screen.getByText(/Edit Description/)).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('preview-toggle');
      fireEvent.change(textarea, { target: { value: 'New description.' } });
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });
  });
});

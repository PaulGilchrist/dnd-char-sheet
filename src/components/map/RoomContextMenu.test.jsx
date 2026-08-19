// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoomContextMenu from './RoomContextMenu';

const mockGridCenterX = (gx) => gx * 40 + 20;
const mockGridCenterY = (gy) => gy * 40 + 20;

const defaultSelectedRoom = {
    id: 'room-1',
    label: 'Test Room',
    type: 'common',
    rect: { x: 1, y: 1, w: 3, h: 2 },
};

const createMocks = () => ({
    setMapData: vi.fn(),
    setSelectedRoom: vi.fn(),
});

const renderWithContext = (overrides = {}) => {
    const mocks = createMocks();
    const { container } = render(
        <RoomContextMenu
            selectedRoom={defaultSelectedRoom}
            isLocalhost={true}
            gridSize={30}
            gridCenterX={mockGridCenterX}
            gridCenterY={mockGridCenterY}
            setMapData={mocks.setMapData}
            setSelectedRoom={mocks.setSelectedRoom}
            {...overrides}
        />
    );
    return { container, mocks };
};

// ── Null / non-localhost renders nothing ────────────────────────

describe('null / non-localhost', () => {
    it.each([
        [undefined, true],
        [null, true],
    ])('returns null when selectedRoom is %s (isLocalhost: %s)', (selectedRoom, isLocalhost) => {
        const { container } = render(
            <RoomContextMenu
                selectedRoom={selectedRoom}
                isLocalhost={isLocalhost}
                gridSize={30}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                setMapData={vi.fn()}
                setSelectedRoom={vi.fn()}
            />
        );
        expect(container.innerHTML).toBe('');
    });

    it('returns null when isLocalhost is false', () => {
        const { container } = render(
            <RoomContextMenu
                selectedRoom={defaultSelectedRoom}
                isLocalhost={false}
                gridSize={30}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                setMapData={vi.fn()}
                setSelectedRoom={vi.fn()}
            />
        );
        expect(container.innerHTML).toBe('');
    });
});

// ── Basic rendering when active ─────────────────────────────────

describe('basic rendering', () => {
    it('renders the background rect with correct dimensions and styling', () => {
        const { container } = renderWithContext();
        const rect = container.querySelector('rect');
        expect(rect).toBeTruthy();
        expect(rect.getAttribute('width')).toBe('130');
        expect(rect.getAttribute('height')).toBe('192');
        expect(rect.getAttribute('fill')).toBe('#2a2a2a');
        expect(rect.getAttribute('stroke')).toBe('#555');
        expect(rect.getAttribute('stroke-width')).toBe('1');
    });

    it('renders the "Room" title text', () => {
        renderWithContext();
        expect(screen.getByText('Room')).toBeInTheDocument();
    });

    it('renders the Set Label option', () => {
        renderWithContext();
        expect(screen.getByText('Set Label...')).toBeInTheDocument();
    });

    it('renders Delete Room option with red fill color', () => {
        renderWithContext();
        const deleteText = screen.getByText('Delete Room');
        expect(deleteText.getAttribute('fill')).toBe('#e74c3c');
    });

    it('renders the close button (✕)', () => {
        renderWithContext();
        expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('renders all 6 room type options', () => {
        renderWithContext();
        ['Entrance', 'Common', 'Utility', 'Private', 'Grand', 'Hall'].forEach((type) => {
            expect(screen.getByText(type)).toBeInTheDocument();
        });
    });
});

// ── Menu positioning ────────────────────────────────────────────

describe('menu positioning', () => {
    it('positions menu at the correct X and Y coordinates', () => {
        // room rect: { x: 1, y: 1, w: 3, h: 2 }
        // menuX = min(gridCenterX(1+3) + 10, 30*40 - 140) = min(180+10, 1060) = 190
        // menuY = gridCenterY(1) - 40/2 = 60 - 20 = 40
        const { container } = renderWithContext();
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('x')).toBe('190');
        expect(rect.getAttribute('y')).toBe('40');
    });

    it('clamps menuX to grid width minus 140 when room is near the edge', () => {
        const edgeRoom = { ...defaultSelectedRoom, rect: { x: 28, y: 1, w: 3, h: 2 } };
        const { container } = renderWithContext({ selectedRoom: edgeRoom });
        const rect = container.querySelector('rect');
        // gridCenterX(31) = 31*40+20 = 1260, clamped to 1060
        expect(rect.getAttribute('x')).toBe('1060');
    });
});

// ── Set Label functionality ─────────────────────────────────────

describe('set label', () => {
    let promptSpy;

    beforeEach(() => {
        promptSpy = vi.spyOn(window, 'prompt');
    });

    afterEach(() => {
        promptSpy.mockRestore();
    });

    it('prompts for room label with current label as default', () => {
        renderWithContext();
        fireEvent.click(screen.getByText('Set Label...'));
        expect(promptSpy).toHaveBeenCalledWith('Room label:', 'Test Room');
    });

    it('does NOT call setMapData when prompt is cancelled (null)', () => {
        const { mocks } = renderWithContext();
        promptSpy.mockReturnValue(null);
        fireEvent.click(screen.getByText('Set Label...'));
        expect(mocks.setMapData).not.toHaveBeenCalled();
    });

    it('calls setSelectedRoom(null) after setting label regardless of input', () => {
        const { mocks } = renderWithContext();
        promptSpy.mockReturnValue('New Label');
        fireEvent.click(screen.getByText('Set Label...'));
        expect(mocks.setSelectedRoom).toHaveBeenCalledWith(null);
    });

    it('uses empty string as default label when room has no label', () => {
        const roomNoLabel = { ...defaultSelectedRoom, label: undefined };
        renderWithContext({ selectedRoom: roomNoLabel });
        fireEvent.click(screen.getByText('Set Label...'));
        expect(promptSpy).toHaveBeenCalledWith('Room label:', '');
    });

    it('updates only the selected room in setMapData', () => {
        const { mocks } = renderWithContext();
        promptSpy.mockReturnValue('Updated');
        fireEvent.click(screen.getByText('Set Label...'));
        const updater = mocks.setMapData.mock.calls[0][0];
        const prev = {
            rooms: [
                { id: 'room-1', label: 'Test Room', type: 'common' },
                { id: 'room-2', label: 'Other', type: 'entrance' },
            ],
        };
        const result = updater(prev);
        expect(result.rooms[0].label).toBe('Updated');
        expect(result.rooms[1].label).toBe('Other');
    });
});

// ── Room type selection ─────────────────────────────────────────

describe('room type selection', () => {
    it('updates only the selected room in setMapData for type', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('Entrance'));
        const updater = mocks.setMapData.mock.calls[0][0];
        const prev = {
            rooms: [
                { id: 'room-1', label: 'Test', type: 'common' },
                { id: 'room-2', label: 'Other', type: 'entrance' },
            ],
        };
        const result = updater(prev);
        expect(result.rooms[0].type).toBe('entrance');
        expect(result.rooms[1].type).toBe('entrance');
    });

    it('calls setSelectedRoom(null) after selecting a type', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('Common'));
        expect(mocks.setSelectedRoom).toHaveBeenCalledWith(null);
    });

    it('renders the currently selected type with bold styling and non-selected with normal', () => {
        renderWithContext();
        const commonText = screen.getByText('Common');
        const entranceText = screen.getByText('Entrance');
        expect(commonText.getAttribute('font-weight')).toBe('bold');
        expect(entranceText.getAttribute('font-weight')).toBe('normal');
    });

    it.each([
        ['entrance', 'Entrance'],
        ['grand', 'Grand'],
        ['hall', 'Hall'],
    ])('highlights %s as bold when room type is %s', (type, displayType) => {
        const room = { ...defaultSelectedRoom, type };
        renderWithContext({ selectedRoom: room });
        expect(screen.getByText(displayType).getAttribute('font-weight')).toBe('bold');
    });
});

// ── Delete room functionality ───────────────────────────────────

describe('delete room', () => {
    it('calls setMapData to filter out the room when Delete Room is clicked', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('Delete Room'));
        expect(mocks.setMapData).toHaveBeenCalled();
    });

    it('removes only the selected room from the rooms array', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('Delete Room'));
        const updater = mocks.setMapData.mock.calls[0][0];
        const prev = {
            rooms: [
                { id: 'room-1', label: 'Test', type: 'common' },
                { id: 'room-2', label: 'Other', type: 'entrance' },
                { id: 'room-3', label: 'Third', type: 'utility' },
            ],
        };
        const result = updater(prev);
        expect(result.rooms.length).toBe(2);
        expect(result.rooms.find((r) => r.id === 'room-1')).toBeUndefined();
        expect(result.rooms.find((r) => r.id === 'room-2')).toBeTruthy();
        expect(result.rooms.find((r) => r.id === 'room-3')).toBeTruthy();
    });

    it('calls setSelectedRoom(null) after deleting', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('Delete Room'));
        expect(mocks.setSelectedRoom).toHaveBeenCalledWith(null);
    });

    it('handles rooms being undefined in setMapData', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('Delete Room'));
        const updater = mocks.setMapData.mock.calls[0][0];
        const prev = {};
        const result = updater(prev);
        expect(result.rooms).toEqual([]);
    });
});

// ── Close button ────────────────────────────────────────────────

describe('close button', () => {
    it('calls setSelectedRoom(null) when close button is clicked', () => {
        const { mocks } = renderWithContext();
        fireEvent.click(screen.getByText('✕'));
        expect(mocks.setSelectedRoom).toHaveBeenCalledWith(null);
    });
});

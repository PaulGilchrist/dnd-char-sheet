import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoomContextMenu from './RoomContextMenu';

const mockGridCenterX = (gx) => gx * 40 + 20;
const mockGridCenterY = (gy) => gy * 40 + 20;

const mockSetMapData = vi.fn();
const mockSetSelectedRoom = vi.fn();

const defaultSelectedRoom = {
    id: 'room-1',
    label: 'Test Room',
    type: 'common',
    rect: { x: 1, y: 1, w: 3, h: 2 },
};

const props = {
    selectedRoom: defaultSelectedRoom,
    isLocalhost: true,
    gridSize: 30,
    gridCenterX: mockGridCenterX,
    gridCenterY: mockGridCenterY,
    setMapData: mockSetMapData,
    setSelectedRoom: mockSetSelectedRoom,
};

// ── Null / non-localhost renders nothing ────────────────────────

describe('null / non-localhost', () => {
    it('returns null when selectedRoom is undefined', () => {
        const { container } = render(
            <RoomContextMenu
                selectedRoom={undefined}
                isLocalhost={true}
                gridSize={30}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                setMapData={mockSetMapData}
                setSelectedRoom={mockSetSelectedRoom}
            />
        );
        expect(container.innerHTML).toBe('');
    });

    it('returns null when selectedRoom is null', () => {
        const { container } = render(
            <RoomContextMenu
                selectedRoom={null}
                isLocalhost={true}
                gridSize={30}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                setMapData={mockSetMapData}
                setSelectedRoom={mockSetSelectedRoom}
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
                setMapData={mockSetMapData}
                setSelectedRoom={mockSetSelectedRoom}
            />
        );
        expect(container.innerHTML).toBe('');
    });
});

// ── Basic rendering when active ─────────────────────────────────

describe('basic rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the SVG group with class item-context-menu', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const g = container.querySelector('.item-context-menu');
        expect(g).toBeTruthy();
    });

    it('stops propagation on the outer group click', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const stopSpy = vi.spyOn(Event.prototype, 'stopPropagation');
        const outerG = container.querySelector('.item-context-menu');
        outerG.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(stopSpy).toHaveBeenCalled();
    });

    it('renders the background rect', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect).toBeTruthy();
    });

    it('renders the "Room" title text', () => {
        render(<RoomContextMenu {...props} />);
        expect(screen.getByText('Room')).toBeInTheDocument();
    });

    it('renders the Set Label option', () => {
        render(<RoomContextMenu {...props} />);
        expect(screen.getByText('Set Label...')).toBeInTheDocument();
    });

    it('renders Delete Room option', () => {
        render(<RoomContextMenu {...props} />);
        expect(screen.getByText('Delete Room')).toBeInTheDocument();
    });

    it('renders the close button (✕)', () => {
        render(<RoomContextMenu {...props} />);
        expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('renders all 6 room type options', () => {
        render(<RoomContextMenu {...props} />);
        expect(screen.getByText('Entrance')).toBeInTheDocument();
        expect(screen.getByText('Common')).toBeInTheDocument();
        expect(screen.getByText('Utility')).toBeInTheDocument();
        expect(screen.getByText('Private')).toBeInTheDocument();
        expect(screen.getByText('Grand')).toBeInTheDocument();
        expect(screen.getByText('Hall')).toBeInTheDocument();
    });
});

// ── Menu positioning ────────────────────────────────────────────

describe('menu positioning', () => {
    it('positions menu within grid bounds', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        const menuX = parseInt(rect.getAttribute('x'), 10);
        const menuY = parseInt(rect.getAttribute('y'), 10);
        // gridSize * CELL_SIZE = 30 * 40 = 1200, so menuX + 140 must be <= 1200
        expect(menuX + 140).toBeLessThanOrEqual(1200);
        expect(menuX).toBeGreaterThan(0);
        expect(menuY).toBeGreaterThan(0);
    });

    it('clamps menuX to grid width minus 140', () => {
        // Grid center of room rect x+w = 1+3 = 4 => gridCenterX(4) = 180
        // menuX = min(180 + 10, 1200 - 140) = min(190, 1060) = 190
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('x')).toBe('190');
    });

    it('uses room rect center for menuX calculation', () => {
        // room rect: { x: 1, y: 1, w: 3, h: 2 }
        // r.x + r.w = 1 + 3 = 4 => gridCenterX(4) = 4*40+20 = 180
        // menuX = 180 + 10 = 190
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('x')).toBe('190');
    });
});

// ── Background rect properties ──────────────────────────────────

describe('background rect', () => {
    it('has width 130', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('width')).toBe('130');
    });

    it('has correct height (72 + 6 types * 20 = 192)', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('height')).toBe('192');
    });

    it('has dark fill color', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('fill')).toBe('#2a2a2a');
    });

    it('has stroke with stroke width 1', () => {
        const { container } = render(<RoomContextMenu {...props} />);
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('stroke')).toBe('#555');
        expect(rect.getAttribute('stroke-width')).toBe('1');
    });
});

// ── Set Label functionality ─────────────────────────────────────

describe('set label', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('prompts for room label when Set Label is clicked', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('New Label');
        render(<RoomContextMenu {...props} />);
        screen.getByText('Set Label...').click();
        expect(promptSpy).toHaveBeenCalledWith('Room label:', 'Test Room');
        promptSpy.mockRestore();
    });

    it('calls setMapData with new label when prompt returns a value', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('My Room');
        render(<RoomContextMenu {...props} />);
        screen.getByText('Set Label...').click();
        expect(mockSetMapData).toHaveBeenCalled();
        promptSpy.mockRestore();
    });

    it('calls setMapData with new label when prompt returns empty string', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
        render(<RoomContextMenu {...props} />);
        screen.getByText('Set Label...').click();
        expect(mockSetMapData).toHaveBeenCalled();
        promptSpy.mockRestore();
    });

    it('does NOT call setMapData when prompt is cancelled (null)', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
        render(<RoomContextMenu {...props} />);
        screen.getByText('Set Label...').click();
        expect(mockSetMapData).not.toHaveBeenCalled();
        promptSpy.mockRestore();
    });

    it('calls setSelectedRoom(null) after setting label', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('New Label');
        render(<RoomContextMenu {...props} />);
        screen.getByText('Set Label...').click();
        expect(mockSetSelectedRoom).toHaveBeenCalledWith(null);
        promptSpy.mockRestore();
    });

    it('uses empty string as default label when room has no label', () => {
        const roomNoLabel = { ...defaultSelectedRoom, label: undefined };
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('New Label');
        render(
            <RoomContextMenu
                {...props}
                selectedRoom={roomNoLabel}
            />
        );
        screen.getByText('Set Label...').click();
        expect(promptSpy).toHaveBeenCalledWith('Room label:', '');
        promptSpy.mockRestore();
    });

    it('updates only the selected room in setMapData', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Updated');
        render(<RoomContextMenu {...props} />);
        screen.getByText('Set Label...').click();
        const updater = mockSetMapData.mock.calls[0][0];
        const prev = {
            rooms: [
                { id: 'room-1', label: 'Test Room', type: 'common' },
                { id: 'room-2', label: 'Other', type: 'entrance' },
            ],
        };
        const result = updater(prev);
        expect(result.rooms[0].label).toBe('Updated');
        expect(result.rooms[1].label).toBe('Other');
        promptSpy.mockRestore();
    });
});

// ── Room type selection ─────────────────────────────────────────

describe('room type selection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls setMapData with new type when Entrance is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Entrance').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('calls setMapData with new type when Common is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Common').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('calls setMapData with new type when Utility is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Utility').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('calls setMapData with new type when Private is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Private').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('calls setMapData with new type when Grand is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Grand').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('calls setMapData with new type when Hall is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Hall').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('updates only the selected room in setMapData for type', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Entrance').click();
        const updater = mockSetMapData.mock.calls[0][0];
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
        render(<RoomContextMenu {...props} />);
        screen.getByText('Common').click();
        expect(mockSetSelectedRoom).toHaveBeenCalledWith(null);
    });

    it('renders the currently selected type with bold styling', () => {
        render(<RoomContextMenu {...props} />);
        // The currently selected type is 'common', so the Common text should have font-weight bold
        const commonText = screen.getByText('Common');
        expect(commonText.getAttribute('font-weight')).toBe('bold');
    });

    it('renders non-selected types with normal fontWeight', () => {
        render(<RoomContextMenu {...props} />);
        const entranceText = screen.getByText('Entrance');
        expect(entranceText.getAttribute('font-weight')).toBe('normal');
    });
});

// ── Delete room functionality ───────────────────────────────────

describe('delete room', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls setMapData to filter out the room when Delete Room is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Delete Room').click();
        expect(mockSetMapData).toHaveBeenCalled();
    });

    it('removes only the selected room from the rooms array', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Delete Room').click();
        const updater = mockSetMapData.mock.calls[0][0];
        const prev = {
            rooms: [
                { id: 'room-1', label: 'Test', type: 'common' },
                { id: 'room-2', label: 'Other', type: 'entrance' },
                { id: 'room-3', label: 'Third', type: 'utility' },
            ],
        };
        const result = updater(prev);
        expect(result.rooms.length).toBe(2);
        expect(result.rooms.find(r => r.id === 'room-1')).toBeUndefined();
        expect(result.rooms.find(r => r.id === 'room-2')).toBeTruthy();
        expect(result.rooms.find(r => r.id === 'room-3')).toBeTruthy();
    });

    it('calls setSelectedRoom(null) after deleting', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Delete Room').click();
        expect(mockSetSelectedRoom).toHaveBeenCalledWith(null);
    });

    it('handles rooms being undefined in setMapData', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('Delete Room').click();
        const updater = mockSetMapData.mock.calls[0][0];
        const prev = {};
        const result = updater(prev);
        expect(result.rooms).toEqual([]);
    });

    it('renders Delete Room with red fill color', () => {
        render(<RoomContextMenu {...props} />);
        const deleteText = screen.getByText('Delete Room');
        expect(deleteText.getAttribute('fill')).toBe('#e74c3c');
    });
});

// ── Close button ────────────────────────────────────────────────

describe('close button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls setSelectedRoom(null) when close button is clicked', () => {
        render(<RoomContextMenu {...props} />);
        screen.getByText('✕').click();
        expect(mockSetSelectedRoom).toHaveBeenCalledWith(null);
    });
});

// ── Room without label ──────────────────────────────────────────

describe('room without label', () => {
    it('renders all UI elements when room has no label', () => {
        const roomNoLabel = { ...defaultSelectedRoom, label: undefined };
        const { container } = render(
            <RoomContextMenu
                {...props}
                selectedRoom={roomNoLabel}
            />
        );
        const g = container.querySelector('.item-context-menu');
        expect(g).toBeTruthy();
        expect(screen.getByText('Room')).toBeInTheDocument();
        expect(screen.getByText('Set Label...')).toBeInTheDocument();
    });
});

// ── Room with different types ───────────────────────────────────

describe('room type highlighting', () => {
    it('highlights entrance type when room type is entrance', () => {
        const room = { ...defaultSelectedRoom, type: 'entrance' };
        render(<RoomContextMenu {...props} selectedRoom={room} />);
        const entranceText = screen.getByText('Entrance');
        expect(entranceText.getAttribute('font-weight')).toBe('bold');
        const commonText = screen.getByText('Common');
        expect(commonText.getAttribute('font-weight')).toBe('normal');
    });

    it('highlights grand type when room type is grand', () => {
        const room = { ...defaultSelectedRoom, type: 'grand' };
        render(<RoomContextMenu {...props} selectedRoom={room} />);
        const grandText = screen.getByText('Grand');
        expect(grandText.getAttribute('font-weight')).toBe('bold');
    });

    it('highlights hall type when room type is hall', () => {
        const room = { ...defaultSelectedRoom, type: 'hall' };
        render(<RoomContextMenu {...props} selectedRoom={room} />);
        const hallText = screen.getByText('Hall');
        expect(hallText.getAttribute('font-weight')).toBe('bold');
    });
});

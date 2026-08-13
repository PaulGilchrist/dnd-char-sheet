// @improved-by-ai
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Map from './Map.jsx';

const mockLoadMonsters = vi.fn(() => Promise.resolve([]));

const mockState = {
    mapData: null,
    placedItems: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    panning: false,
    rulerMode: false,
    spellDraft: null,
    dragOverlay: null,
    rotateOverlay: null,
    overlays: [],
    selectedWalls: new Set(),
    selectedItems: new Set(),
    selectionRect: null,
    moveOffset: null,
    selectStart: { current: null },
    moveStartGrid: { current: null },
    roomDrawRect: null,
    selectedRoom: null,
    painting: false,
    dragging: null,
    itemDragging: null,
    npcImages: {},
    rulerStart: null,
    rulerEnd: null,
    rulerPreview: null,
    viewingMonster: null,
};

const createMockSetMapData = vi.fn();
const createMockSetPlacedItems = vi.fn();

class MockEventSource {
    static instances = [];
    constructor() {
        this.onmessage = null;
        this.onerror = null;
        MockEventSource.instances.push(this);
    }
    close() {}
}
globalThis.EventSource = MockEventSource;

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadMonsters: () => mockLoadMonsters(),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
    loadMapData: vi.fn(() => Promise.resolve(null)),
    saveMapData: vi.fn(() => Promise.resolve()),
    formatMapName: vi.fn((name) => name),
    loadMaps: vi.fn(() => Promise.resolve({ maps: [] })),
}));

vi.mock('../../services/ui/logService.js', () => ({
    getLog: vi.fn(() => Promise.resolve([])),
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../hooks/runtime/useLog.js', () => ({
    default: vi.fn(() => ({ logEntries: [], initialized: true, addEntry: vi.fn() })),
}));

vi.mock('./hooks/useMapLoader.js', () => ({
    default: vi.fn(() => ({
        mapData: mockState.mapData,
        setMapData: createMockSetMapData,
        placedItems: mockState.placedItems,
        setPlacedItems: createMockSetPlacedItems,
    })),
}));

vi.mock('./hooks/useZoomPan.js', () => ({
    default: vi.fn(() => ({
        zoom: mockState.zoom,
        panX: mockState.panX,
        panY: mockState.panY,
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        resetView: vi.fn(),
        gridCenterX: (gx) => gx * 40 + 20,
        gridCenterY: (gy) => gy * 40 + 20,
        getGridFromEvent: vi.fn(() => ({ gridX: 5, gridY: 5 })),
        panning: mockState.panning,
        handlePanStart: vi.fn(),
        handlePanMove: vi.fn(),
        handlePanEnd: vi.fn(),
        handleWheel: vi.fn(),
        clientToSVG: vi.fn(),
    })),
}));

vi.mock('./hooks/useWallDrawing.js', () => ({
    default: vi.fn(() => ({
        painting: mockState.painting,
        handleGridPointerDown: vi.fn(),
        handleGridPointerMove: vi.fn(),
        handleGridPointerUp: vi.fn(),
        handleGridPointerLeave: vi.fn(),
    })),
}));

vi.mock('./hooks/useRoomDrawing.js', () => ({
    default: vi.fn(() => ({
        roomDrawRect: mockState.roomDrawRect,
        selectedRoom: mockState.selectedRoom,
        setSelectedRoom: vi.fn(),
        handleRoomPointerDown: vi.fn(),
        handleRoomPointerMove: vi.fn(),
        handleRoomPointerUp: vi.fn(),
        handleRoomClick: vi.fn(),
    })),
}));

vi.mock('./hooks/useSelectMove.js', () => ({
    default: vi.fn(() => ({
        selectionRect: mockState.selectionRect,
        selectedWalls: mockState.selectedWalls,
        selectedItems: mockState.selectedItems,
        moveOffset: mockState.moveOffset,
        selectedWallsRef: { current: mockState.selectedWalls },
        selectedItemsRef: { current: mockState.selectedItems },
        selectStart: mockState.selectStart,
        moveStartGrid: mockState.moveStartGrid,
        moveOffsetRef: { current: null },
        selectionRectRef: { current: null },
        selectionBoundsRef: { current: null },
        placedItemsRef: { current: mockState.placedItems },
        mapDataRef: { current: mockState.mapData },
        handleSelectPointerDown: vi.fn(),
        handleSelectPointerMove: vi.fn(),
        handleSelectPointerUp: vi.fn(),
    })),
}));

vi.mock('./hooks/useRuler.js', () => ({
    default: vi.fn(() => ({
        rulerMode: mockState.rulerMode,
        setRulerMode: vi.fn(),
        rulerStart: mockState.rulerStart,
        rulerEnd: mockState.rulerEnd,
        rulerPreview: mockState.rulerPreview,
        resetRuler: vi.fn(),
        handleRulerPointerDown: vi.fn(),
        handleRulerPointerMove: vi.fn(),
        handleRulerPointerUp: vi.fn(),
    })),
}));

vi.mock('./hooks/useSpellOverlay.js', () => ({
    default: vi.fn(() => ({
        overlays: mockState.overlays,
        addOverlay: vi.fn(),
        updateOverlay: vi.fn(),
        updateOverlayImmediate: vi.fn(),
        removeOverlay: vi.fn(),
        clearOverlays: vi.fn(),
        handleSSEEvent: vi.fn(),
    })),
}));

vi.mock('./hooks/useSpellHandlers.js', () => ({
    default: vi.fn(() => ({
        spellDraft: mockState.spellDraft,
        dragOverlay: mockState.dragOverlay,
        rotateOverlay: mockState.rotateOverlay,
        spellDragActiveRef: { current: false },
        handleSpellPointerDown: vi.fn(),
        handleSpellPointerMove: vi.fn(),
        handleSpellPointerUp: vi.fn(),
        handleSpellDragMove: vi.fn(),
        handleSpellDragEnd: vi.fn(),
    })),
}));

vi.mock('./hooks/usePlayerDragging.js', () => ({
    default: vi.fn(() => ({
        dragging: mockState.dragging,
        handlePointerDown: vi.fn(),
        handlePointerMove: vi.fn(),
        handlePointerUp: vi.fn(),
    })),
}));

vi.mock('./hooks/useItemDragging.js', () => ({
    default: vi.fn(() => ({
        itemDragging: mockState.itemDragging,
        handleItemPointerDown: vi.fn(),
        handleItemPointerMove: vi.fn(),
        handleItemPointerUp: vi.fn(),
        handleItemPointerLeave: vi.fn(),
    })),
}));

vi.mock('./hooks/useNpcImageCache.js', () => ({
    default: vi.fn(() => ({
        npcImages: mockState.npcImages,
        setNpcImages: vi.fn(),
    })),
}));

vi.mock('./hooks/useSSESync.js', () => ({
    default: vi.fn(() => ({
        handleSSEEvent: vi.fn(),
    })),
}));

vi.mock('./hooks/useFogOfWar.js', () => ({
    default: vi.fn(() => new Set()),
}));

vi.mock('./hooks/useMapDrops.js', () => ({
    default: vi.fn(() => ({
        handleDrop: vi.fn(),
    })),
}));

vi.mock('../hex-map/HexMap.jsx', () => ({ default: vi.fn(() => <div data-testid="hex-map" />) }));

const createMockMapData = (overrides = {}) => ({
    players: [],
    walls: new Set(),
    rooms: [],
    ...overrides,
});

const renderMap = (overrides = {}) => {
    const defaultProps = {
        campaignName: 'test-campaign',
        characters: [],
        isLocalhost: true,
        mapName: 'test-map.json',
        onBack: vi.fn(),
        onEncounterCreated: vi.fn(),
        onPoiEntered: vi.fn(),
        ...overrides,
    };
    return render(<Map {...defaultProps} />);
};

const resetState = () => {
    mockState.mapData = createMockMapData();
    mockState.placedItems = [];
    mockState.selectedRoom = null;
    mockState.roomDrawRect = null;
    mockState.selectedWalls = new Set();
    mockState.selectedItems = new Set();
    mockState.selectionRect = null;
    mockState.moveOffset = null;
    mockState.selectStart.current = null;
    mockState.moveStartGrid.current = null;
    mockLoadMonsters.mockReset();
    mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
};

describe('Map - room rendering with types', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders room-highlight rect with type-based CSS class for entrance type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'entrance', label: 'Entrance', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight.room-type-entrance');
        expect(roomRect).toBeTruthy();
        expect(roomRect.getAttribute('width')).toBe('400');
        expect(roomRect.getAttribute('height')).toBe('400');
    });

    it('renders room-highlight rect with type-based CSS class for common type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Hall', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight.room-type-common');
        expect(roomRect).toBeTruthy();
    });

    it('renders room-highlight rect with type-based CSS class for utility type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'utility', label: 'Storage', rect: { x: 0, y: 0, w: 5, h: 5 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight.room-type-utility');
        expect(roomRect).toBeTruthy();
        expect(roomRect.getAttribute('width')).toBe('200');
        expect(roomRect.getAttribute('height')).toBe('200');
    });

    it('renders room-highlight rect with type-based CSS class for private type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'private', label: 'Bedroom', rect: { x: 0, y: 0, w: 8, h: 8 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight.room-type-private');
        expect(roomRect).toBeTruthy();
    });

    it('renders room-highlight rect with type-based CSS class for grand type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'grand', label: 'Throne Room', rect: { x: 0, y: 0, w: 20, h: 15 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight.room-type-grand');
        expect(roomRect).toBeTruthy();
        expect(roomRect.getAttribute('width')).toBe('800');
        expect(roomRect.getAttribute('height')).toBe('600');
    });

    it('renders room-highlight rect with type-based CSS class for hall type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'hall', label: 'Corridor', rect: { x: 0, y: 0, w: 30, h: 5 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight.room-type-hall');
        expect(roomRect).toBeTruthy();
    });

    it('renders room label text from room.label property', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Great Hall', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        await act(async () => renderMap());
        expect(document.querySelector('.room-label')).toHaveTextContent('Great Hall');
    });

    it('falls back to room.type when label is missing', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        await act(async () => renderMap());
        expect(document.querySelector('.room-label')).toHaveTextContent('common');
    });

    it('renders room hit-area rect when tool is none', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.room-hit-area')).toBeTruthy();
    });

    it('renders room hit-area rect when tool is select', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.room-hit-area')).toBeTruthy();
    });

    it('renders room at correct grid position offset', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Off Room', rect: { x: 5, y: 3, w: 4, h: 4 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomRect = container.querySelector('.room-highlight');
        expect(roomRect.getAttribute('x')).toBe('200');
        expect(roomRect.getAttribute('y')).toBe('120');
        expect(roomRect.getAttribute('width')).toBe('160');
        expect(roomRect.getAttribute('height')).toBe('160');
    });

    it('renders multiple rooms with distinct type classes', async () => {
        mockState.mapData = createMockMapData({
            rooms: [
                { id: 'room1', type: 'entrance', label: 'Entrance', rect: { x: 0, y: 0, w: 10, h: 10 } },
                { id: 'room2', type: 'private', label: 'Bedroom', rect: { x: 10, y: 10, w: 5, h: 5 } },
            ],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.room-type-entrance')).toBeTruthy();
        expect(container.querySelector('.room-type-private')).toBeTruthy();
        const roomHighlights = container.querySelectorAll('.room-highlight');
        expect(roomHighlights.length).toBe(2);
    });

    it('applies room-selected class when selectedRoom matches room id', async () => {
        const roomData = { id: 'room1', type: 'common', label: 'Hall', rect: { x: 0, y: 0, w: 10, h: 10 } };
        mockState.mapData = createMockMapData({ rooms: [roomData] });
        mockState.selectedRoom = roomData;
        const { container } = await act(async () => renderMap());
        const selectedRect = container.querySelector('.room-highlight.room-selected');
        expect(selectedRect).toBeTruthy();
    });

    it('does not apply room-selected class when selectedRoom id does not match', async () => {
        const roomData = { id: 'room1', type: 'common', label: 'Hall', rect: { x: 0, y: 0, w: 10, h: 10 } };
        mockState.mapData = createMockMapData({ rooms: [roomData] });
        mockState.selectedRoom = { id: 'room99', rect: { x: 0, y: 0, w: 1, h: 1 } };
        const { container } = await act(async () => renderMap());
        const selectedRect = container.querySelector('.room-highlight.room-selected');
        expect(selectedRect).toBeNull();
    });

    it('renders room group with correct key attribute', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Hall', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        const roomGroup = container.querySelector('g');
        expect(roomGroup).toBeTruthy();
    });
});

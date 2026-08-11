import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Map from './Map.jsx';

// Mutable mock state shared across all tests
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

globalThis.EventSource = class MockEventSource {
    constructor() { this.onmessage = null; this.onerror = null; }
    close() {}
};

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(() => Promise.resolve([])),
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

describe('Map - room rendering with types', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders room with entrance type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'entrance', label: 'Entrance', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room with common type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Hall', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room with utility type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'utility', label: 'Storage', rect: { x: 0, y: 0, w: 5, h: 5 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room with private type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'private', label: 'Bedroom', rect: { x: 0, y: 0, w: 8, h: 8 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room with grand type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'grand', label: 'Throne Room', rect: { x: 0, y: 0, w: 20, h: 15 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room with hall type', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'hall', label: 'Corridor', rect: { x: 0, y: 0, w: 30, h: 5 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room with no label', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room hit area in none tool', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders room hit area in select tool', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

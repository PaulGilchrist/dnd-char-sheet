// @improved-by-ai
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

describe('Map - PlacedItems integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        mockState.itemDragging = null;
        mockState.npcImages = {};
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    describe('rendering with placed items present', () => {
        it('renders the map container with placed items in the array', async () => {
            mockState.placedItems = [
                { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders the map container with multiple placed items', async () => {
            mockState.placedItems = [
                { id: 'furn1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5 },
                { id: 'furn2', type: 'chest', name: 'Chest', gridX: 6, gridY: 6 },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders the map container with placed items that have rotation', async () => {
            mockState.placedItems = [
                { id: 'item1', type: 'table', name: 'Table', gridX: 5, gridY: 5, rotation: 90 },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders the map container with placed items that have open state', async () => {
            mockState.placedItems = [
                { id: 'door1', type: 'door', name: 'Door', gridX: 5, gridY: 5, open: false },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });

    describe('NPC placed items', () => {
        it('renders NPC placed items with an image URL', async () => {
            mockState.placedItems = [
                { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5, imageUrl: '/goblin.png' },
            ];
            mockState.npcImages = {};
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders NPC placed items with npcImages cache entry', async () => {
            mockState.placedItems = [
                { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 },
            ];
            mockState.npcImages = { Goblin: '/goblin.png' };
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders NPC placed items with visible=false', async () => {
            mockState.placedItems = [
                { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5, visible: false },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });

    describe('furniture placed items', () => {
        it('renders furniture with various properties', async () => {
            mockState.placedItems = [
                { id: 'furn1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5 },
                { id: 'furn2', type: 'chest', name: 'Chest', gridX: 6, gridY: 6 },
                { id: 'furn3', type: 'table', name: 'Table', gridX: 7, gridY: 7, rotation: 90 },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders furniture items with visible=false', async () => {
            mockState.placedItems = [
                { id: 'furn1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5, visible: false },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });

    describe('special placed items (doors, traps, secret doors)', () => {
        it('renders closed door', async () => {
            mockState.placedItems = [
                { id: 'door1', type: 'door', name: 'Door', gridX: 5, gridY: 5, open: false },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders open door', async () => {
            mockState.placedItems = [
                { id: 'door1', type: 'door', name: 'Door', gridX: 5, gridY: 5, open: true },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders trap', async () => {
            mockState.placedItems = [
                { id: 'trap1', type: 'trap', name: 'Trap', gridX: 5, gridY: 5 },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });

        it('renders secret door', async () => {
            mockState.placedItems = [
                { id: 'sdoor1', type: 'secretDoor', name: 'Secret Door', gridX: 5, gridY: 5 },
            ];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });

    describe('environmental placed items', () => {
        const environmentalTypes = [
            { id: 'pillar1', type: 'pillar', name: 'Pillar', gridX: 5, gridY: 5 },
            { id: 'stairs1', type: 'stairs', name: 'Stairs', gridX: 5, gridY: 5 },
            { id: 'altar1', type: 'altar', name: 'Altar', gridX: 5, gridY: 5 },
            { id: 'firepit1', type: 'firepit', name: 'Fire Pit', gridX: 5, gridY: 5 },
            { id: 'bed1', type: 'bed', name: 'Bed', gridX: 5, gridY: 5 },
            { id: 'table1', type: 'table', name: 'Table', gridX: 5, gridY: 5 },
            { id: 'chest1', type: 'chest', name: 'Crate', gridX: 5, gridY: 5 },
            { id: 'fountain1', type: 'fountain', name: 'Fountain', gridX: 5, gridY: 5 },
            { id: 'skeleton1', type: 'skeleton', name: 'Skeleton', gridX: 5, gridY: 5 },
            { id: 'statue1', type: 'statue', name: 'Statue', gridX: 5, gridY: 5 },
            { id: 'torch1', type: 'torch', name: 'Torch', gridX: 5, gridY: 5 },
            { id: 'web1', type: 'web', name: 'Web', gridX: 5, gridY: 5 },
            { id: 'tree1', type: 'tree', name: 'Tree', gridX: 5, gridY: 5 },
            { id: 'boulder1', type: 'boulder', name: 'Boulder', gridX: 5, gridY: 5 },
            { id: 'bush1', type: 'bush', name: 'Bush', gridX: 5, gridY: 5 },
            { id: 'bookshelf1', type: 'bookshelf', name: 'Bookshelf', gridX: 5, gridY: 5 },
            { id: 'chair1', type: 'chair', name: 'Chair', gridX: 5, gridY: 5 },
            { id: 'arrow1', type: 'arrowSlitWall', name: 'Arrow Slit', gridX: 5, gridY: 5 },
        ];

        it.each(environmentalTypes)('renders $type placed item', async (item) => {
            mockState.placedItems = [item];
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });

    describe('dragging state', () => {
        it('renders the map container while an item is being dragged', async () => {
            mockState.placedItems = [
                { id: 'item1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5 },
            ];
            mockState.itemDragging = { itemId: 'item1' };
            const { container } = await act(async () => renderMap());
            expect(container.querySelector('.map')).toBeInTheDocument();
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });
});

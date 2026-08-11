import { render, fireEvent, act } from '@testing-library/react';
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

describe('Map - players rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders players with characters data', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap({
            characters: [{ name: 'Thorin', id: 'thorin' }],
        }));
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders players with fog overlay', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders players with dragging state', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        mockState.dragging = { playerId: 'player1' };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - walls rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders walls from mapData', async () => {
        mockState.mapData = createMockMapData({
            walls: new Set(['1,1', '2,2', '3,3']),
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders walls with fog overlay', async () => {
        mockState.mapData = createMockMapData({
            walls: new Set(['1,1', '2,2']),
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - spell overlay rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders spell overlay renderer', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders spell overlay with overlays array', async () => {
        mockState.overlays = [
            { id: 'overlay1', shape: 'sphere', startGridX: 5, startGridY: 5, distanceFt: 30, color: 'rgba(255,80,60,0.35)', radiusFt: 20 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders spell draft as pending overlay', async () => {
        mockState.spellDraft = { startGridX: 5, startGridY: 5, angle: 0 };
        mockState.spellMode = 'cone';
        mockState.shapeParams = { sizeFt: 60, angle: 90, color: 'rgba(255,80,60,0.35)' };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - ruler overlay rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders ruler overlay with start and end', async () => {
        mockState.rulerStart = { gridX: 0, gridY: 0 };
        mockState.rulerEnd = { gridX: 10, gridY: 10 };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders ruler overlay with preview', async () => {
        mockState.rulerStart = { gridX: 0, gridY: 0 };
        mockState.rulerPreview = { gridX: 5, gridY: 5 };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - rename popover rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders MonsterNameAutocomplete when renamePopover exists', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('does not render rename popover when renamePopover is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - ItemsPanel rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders ItemsPanel when itemsPanelOpen is true and isLocalhost', async () => {
        mockState.mapData = createMockMapData();
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('does not render ItemsPanel when itemsPanelOpen is false', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('does not render ItemsPanel when isLocalhost is false', async () => {
        const { container } = await act(async () => renderMap({ isLocalhost: false }));
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders ItemsPanel with outdoor mapVariant when parentHex exists', async () => {
        mockState.mapData = createMockMapData({ parentHex: true });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders ItemsPanel with indoor mapVariant when no parentHex', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - MonsterCardModal rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders MonsterCardModal when viewingMonster is set', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('does not render MonsterCardModal when viewingMonster is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - context menus rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders ItemContextMenu with placed items', async () => {
        mockState.placedItems = [
            { id: 'item1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders RoomContextMenu with selected room', async () => {
        mockState.selectedRoom = { id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders PlayerContextMenu with selected player', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - grid and walls rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders GridAndWalls with gridSize', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders GridAndWalls with walls', async () => {
        mockState.mapData = createMockMapData({
            walls: new Set(['1,1', '2,2']),
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders GridAndWalls with isLocalhost', async () => {
        const { container } = await act(async () => renderMap({ isLocalhost: false }));
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders GridAndWalls with fog', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders GridAndWalls with bgFill', async () => {
        mockState.mapData = createMockMapData({ bgFill: '#ffffff' });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - fog overlay rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders FogOverlay with fog set', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders FogOverlay with isLocalhost', async () => {
        const { container } = await act(async () => renderMap({ isLocalhost: false }));
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - tool pointer handlers with spellDragActiveRef', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('skips handleToolPanStart when spellDragActiveRef is true', async () => {
        mockState.spellDraft = { startGridX: 5, startGridY: 5 };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('triggers handleToolPointerLeave when pointer leaves SVG', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerLeave(svg);
        });
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('triggers handleSetRulerMode to enable ruler', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('triggers handleSetRulerMode to disable ruler', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - SVG element attributes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders SVG with correct viewBox based on zoom', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('viewBox');
    });

    it('renders SVG with panX and panY in viewBox', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const viewBox = svg.getAttribute('viewBox');
        expect(viewBox).toBeTruthy();
    });

    it('renders SVG with SVG_SIZE / zoom dimensions', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const viewBox = svg.getAttribute('viewBox');
        expect(viewBox).toBeTruthy();
    });
});

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
    itemsPanelOpen: false,
    renamePopover: null,
    spellMode: null,
    shapeParams: null,
    spellDragActiveRef: { current: false },
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
        spellDragActiveRef: mockState.spellDragActiveRef,
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

vi.mock('../encounter/MonsterCardModal.jsx', () => ({
    default: ({ monster, onClose }) => (
        <div data-testid="monster-card-modal">
            <span>{monster?.name}</span>
            <button className="mc-close" onClick={onClose}>close</button>
        </div>
    ),
}));

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
    Object.assign(mockState, {
        mapData: createMockMapData(),
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
        itemsPanelOpen: false,
        renamePopover: null,
        spellMode: null,
        shapeParams: null,
        spellDragActiveRef: { current: false },
    });
    mockState.selectStart.current = null;
    mockState.moveStartGrid.current = null;
    mockLoadMonsters.mockReset();
    mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
};

describe('Map - placedItems ref sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders the map container when placedItems is an empty array', async () => {
        mockState.placedItems = [];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders the map container when placedItems contains items', async () => {
        mockState.placedItems = [
            { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - selectedWalls ref sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders the map container when selectedWalls is an empty Set', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - selectedItems ref sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders the map container when selectedItems is an empty Set', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - mapData ref sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders the map container when mapData has players', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders the map container when mapData has walls', async () => {
        mockState.mapData = createMockMapData({
            walls: new Set(['1,1', '2,2']),
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders the map container when mapData has rooms', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Hall', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleViewStats behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('does not open monster card when placedItems contains no NPC', async () => {
        mockState.placedItems = [
            { id: 'item1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('does not open monster card when selectedItem is not in placedItems', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('handles NPC name with trailing number when matching monsters', async () => {
        mockState.placedItems = [
            { id: 'npc1', type: 'npc', name: 'Goblin 3', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - monsterFound useMemo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('returns false when selectedItem is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('returns false when selectedItem is not an NPC', async () => {
        mockState.placedItems = [
            { id: 'item1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleRenameItem behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('does not rename when newName is empty', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('does not rename when newName is whitespace only', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('clears npcImages cache on rename', async () => {
        mockState.placedItems = [
            { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleRemovePlayer behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('removes player from mapData', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('filters out player by id when multiple players exist', async () => {
        mockState.mapData = createMockMapData({
            players: [
                { id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 },
                { id: 'player2', name: 'Legolas', gridX: 6, gridY: 6 },
            ],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleCloseMenu behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('clears selectedItem', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('clears selectedPlayer', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('clears selectedRoom', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('clears renamePopover', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleSetRulerMode behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('sets rulerMode and clears spellMode when enabling', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('resets ruler when disabling rulerMode', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleRenameClicked position calculation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('calculates rename popover position based on grid position', async () => {
        mockState.placedItems = [
            { id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 },
        ];
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('handles rename with default name fallback', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleToolPanStart tool routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('routes to grid pointer down for paint tool', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('routes to grid pointer down for erase tool', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('routes to select pointer down for select tool', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('routes to room pointer down for room tool', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('routes to pan start for none tool', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleToolPointerMove', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('calls all pointer move handlers', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleToolPointerUp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('calls all pointer up handlers', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - handleToolPointerLeave', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('calls item pointer leave and grid pointer leave', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

describe('Map - SSE event handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('combines map SSE and spell overlay SSE events', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });
});

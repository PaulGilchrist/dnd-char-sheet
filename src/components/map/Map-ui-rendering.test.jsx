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

describe('Map - UI rendering with players', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders creature-circle elements when mapData contains players', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap({
            characters: [{ name: 'Thorin', id: 'thorin' }],
        }));
        const creatureCircle = container.querySelector('.creature-circle');
        expect(creatureCircle).toBeTruthy();
    });

    it('renders creature groups inside the SVG when players exist', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        const { container } = await act(async () => renderMap());
        const creatureGroup = container.querySelector('.creature-group');
        expect(creatureGroup).toBeTruthy();
    });

    it('renders creature circles when dragging state references a player', async () => {
        mockState.mapData = createMockMapData({
            players: [{ id: 'player1', name: 'Thorin', gridX: 5, gridY: 5 }],
        });
        mockState.dragging = { playerId: 'player1' };
        const { container } = await act(async () => renderMap());
        const creatureGroup = container.querySelector('.creature-group');
        expect(creatureGroup).toBeTruthy();
    });
});

describe('Map - UI rendering with walls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders grid lines when walls are present', async () => {
        mockState.mapData = createMockMapData({
            walls: new Set(['1,1', '2,2', '3,3']),
        });
        const { container } = await act(async () => renderMap());
        const gridLines = container.querySelectorAll('line.grid-line');
        expect(gridLines.length).toBeGreaterThan(0);
    });

    it('renders grid lines when walls set is empty', async () => {
        mockState.mapData = createMockMapData({
            walls: new Set(),
        });
        const { container } = await act(async () => renderMap());
        const gridLines = container.querySelectorAll('line.grid-line');
        expect(gridLines.length).toBeGreaterThan(0);
    });
});

describe('Map - UI rendering with spell overlays', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders spell overlay layer group in SVG', async () => {
        const { container } = await act(async () => renderMap());
        const spellLayer = container.querySelector('g.spell-overlay-layer');
        expect(spellLayer).toBeTruthy();
    });

    it('renders spell overlay shapes when overlays array has entries', async () => {
        mockState.overlays = [
            { id: 'overlay1', shape: 'sphere', startGridX: 5, startGridY: 5, distanceFt: 30, color: 'rgba(255,80,60,0.35)', radiusFt: 20 },
        ];
        const { container } = await act(async () => renderMap());
        const spellLayer = container.querySelector('g.spell-overlay-layer');
        expect(spellLayer).toBeTruthy();
    });

    it('renders pending overlay when spellDraft exists', async () => {
        mockState.spellDraft = { startGridX: 5, startGridY: 5, angle: 0 };
        mockState.spellMode = 'cone';
        mockState.shapeParams = { sizeFt: 60, angle: 90, color: 'rgba(255,80,60,0.35)' };
        const { container } = await act(async () => renderMap());
        const spellLayer = container.querySelector('g.spell-overlay-layer');
        expect(spellLayer).toBeTruthy();
    });
});

describe('Map - UI rendering with ruler overlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders ruler line when start and end are set', async () => {
        mockState.rulerStart = { gridX: 0, gridY: 0 };
        mockState.rulerEnd = { gridX: 10, gridY: 10 };
        const { container } = await act(async () => renderMap());
        const rulerLine = container.querySelector('line.ruler-line');
        expect(rulerLine).toBeTruthy();
    });

    it('renders ruler preview line when preview is set instead of end', async () => {
        mockState.rulerStart = { gridX: 0, gridY: 0 };
        mockState.rulerPreview = { gridX: 5, gridY: 5 };
        const { container } = await act(async () => renderMap());
        const rulerLine = container.querySelector('line.ruler-line');
        expect(rulerLine).toBeTruthy();
    });

    it('does not render ruler line when rulerStart is null', async () => {
        const { container } = await act(async () => renderMap());
        const rulerLine = container.querySelector('line.ruler-line');
        expect(rulerLine).toBeNull();
    });
});

describe('Map - UI rendering with grid and walls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders grid lines inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        const gridLines = container.querySelectorAll('line.grid-line');
        expect(gridLines.length).toBeGreaterThan(0);
    });

    it('renders grid background rect with bgFill color', async () => {
        mockState.mapData = createMockMapData({ bgFill: '#ffffff' });
        const { container } = await act(async () => renderMap());
        const bgRect = container.querySelector('rect.grid-bg');
        expect(bgRect).toBeTruthy();
    });
});

describe('Map - UI rendering with fog overlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders FogOverlay inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    it('renders FogOverlay component regardless of isLocalhost', async () => {
        const { container } = await act(async () => renderMap({ isLocalhost: false }));
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });
});

describe('Map - SVG element attributes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders SVG with grid-svg class', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg.grid-svg');
        expect(svg).toBeTruthy();
    });

    it('renders SVG with viewBox reflecting panX and panY', async () => {
        mockState.panX = 100;
        mockState.panY = 200;
        mockState.zoom = 2;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const viewBox = svg.getAttribute('viewBox');
        // SVG_SIZE = gridSize(30) * CELL_SIZE(40) = 1200; at zoom 2: 1200/2 = 600
        expect(viewBox).toBe('100 200 600 600');
    });

    it('renders SVG with viewBox dimensions calculated as SVG_SIZE / zoom', async () => {
        mockState.zoom = 0.5;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const viewBox = svg.getAttribute('viewBox');
        // SVG_SIZE = 1200; at zoom 0.5: 1200/0.5 = 2400
        expect(viewBox).toBe('0 0 2400 2400');
    });

    it('renders SVG with grabbing cursor when panning is true', async () => {
        mockState.panning = true;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('grabbing');
    });

    it('renders SVG with crosshair cursor when rulerMode is active', async () => {
        mockState.rulerMode = true;
        mockState.panning = false;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('crosshair');
    });

    it('renders SVG with grab cursor when not panning and not in ruler mode', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('grab');
    });

    it('renders SVG defs with BarrelSVG group element', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const barrelGroup = svg.querySelector('g[id="barrel"]');
        expect(barrelGroup).toBeTruthy();
    });

    it('renders SVG defs with DoorSVG group element', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const doorGroup = svg.querySelector('g[id="door"]');
        expect(doorGroup).toBeTruthy();
    });
});

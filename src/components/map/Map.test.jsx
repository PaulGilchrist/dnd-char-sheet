// @cleaned-by-ai
import { render, screen, act } from '@testing-library/react';
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
};

const createMockSetMapData = vi.fn();
const createMockSetPlacedItems = vi.fn();

// Mock EventSource globally
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

describe('Map - initial rendering and null mapData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = null;
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('returns null when mapData is null (loading state)', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.firstChild).toBeNull();
    });

    it('does not render SVG when mapData is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeNull();
    });

    it('does not render map toolbar when mapData is null', async () => {
        await act(async () => renderMap());
        expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('does not render map container when mapData is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeNull();
    });
});

describe('Map - loaded mapData rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders the map container div when mapData loads', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
    });

    it('renders the SVG element with correct class', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.grid-svg')).toBeInTheDocument();
    });

    it('renders MapToolbar with toolbar class', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.toolbar')).toBeInTheDocument();
    });

    it('renders GridAndWalls content inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders Players content inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders PlacedItems content inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders FogOverlay content inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders SpellOverlayRenderer content inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders RulerOverlay content inside SVG', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders context menus (ItemContextMenu, RoomContextMenu, PlayerContextMenu)', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeTruthy();
    });
});

describe('Map - outdoor map type rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders HexMap when mapData.type is "outdoor"', async () => {
        mockState.mapData = createMockMapData({ type: 'outdoor' });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('[data-testid="hex-map"]')).toBeInTheDocument();
    });

    it('does not render the indoor SVG when map is outdoor', async () => {
        mockState.mapData = createMockMapData({ type: 'outdoor' });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.grid-svg')).toBeNull();
    });

    it('does not render map container div when map is outdoor', async () => {
        mockState.mapData = createMockMapData({ type: 'outdoor' });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeNull();
    });
});

describe('Map - SVG structure and attributes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders SVG element', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    it('renders SVG with grid-svg class', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg.grid-svg');
        expect(svg).toBeTruthy();
    });

    it('renders SVG with viewBox attribute', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('viewBox');
    });

    it('renders SVG with cursor style', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('style');
    });

    it('renders SVG with grid background rect', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const bgRect = svg.querySelector('rect.grid-bg');
        expect(bgRect).toBeTruthy();
    });

    it('renders SVG with grid lines', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const gridLines = svg.querySelectorAll('line.grid-line');
        expect(gridLines.length).toBeGreaterThan(0);
    });

    it('renders SVG with spell overlay layer', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const spellLayer = svg.querySelector('g.spell-overlay-layer');
        expect(spellLayer).toBeTruthy();
    });
});

describe('Map - SVG cursor styles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.panning = false;
        mockState.rulerMode = false;
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('applies grabbing cursor when panning', async () => {
        mockState.panning = true;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('grabbing');
    });

    it('applies crosshair cursor when rulerMode is active', async () => {
        mockState.rulerMode = true;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('crosshair');
    });

    it('applies grab cursor when tool is none and not panning', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('grab');
    });
});

describe('Map - SVG defs rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = createMockMapData();
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('renders SVG defs with all SVG group elements', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        // SVG components render as <g> elements directly inside <defs>
        const defs = svg.querySelector('defs');
        const groups = defs ? Array.from(defs.children).filter(c => c.tagName === 'g') : [];
        expect(groups.length).toBe(23);
    });

    it('renders BarrelSVG group with id="barrel"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const barrelGroup = svg.querySelector('g[id="barrel"]');
        expect(barrelGroup).toBeTruthy();
    });

    it('renders DoorSVG group with id="door"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const doorGroup = svg.querySelector('g[id="door"]');
        expect(doorGroup).toBeTruthy();
    });

    it('renders SecretDoorSVG group with id="secretDoor"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const secretDoorGroup = svg.querySelector('g[id="secretDoor"]');
        expect(secretDoorGroup).toBeTruthy();
    });

    it('renders TrapSVG group with id="trap"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const trapGroup = svg.querySelector('g[id="trap"]');
        expect(trapGroup).toBeTruthy();
    });

    it('renders ChestSVG group with id="chest"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const chestGroup = svg.querySelector('g[id="chest"]');
        expect(chestGroup).toBeTruthy();
    });

    it('renders TorchSVG group with id="torch"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const torchGroup = svg.querySelector('g[id="torch"]');
        expect(torchGroup).toBeTruthy();
    });

    it('renders WebSVG group with id="web"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const webGroup = svg.querySelector('g[id="web"]');
        expect(webGroup).toBeTruthy();
    });

    it('renders TreeSVG group with id="tree"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const treeGroup = svg.querySelector('g[id="tree"]');
        expect(treeGroup).toBeTruthy();
    });

    it('renders BoulderSVG group with id="boulder"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const boulderGroup = svg.querySelector('g[id="boulder"]');
        expect(boulderGroup).toBeTruthy();
    });

    it('renders BushSVG group with id="bush"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const bushGroup = svg.querySelector('g[id="bush"]');
        expect(bushGroup).toBeTruthy();
    });

    it('renders PillarSVG group with id="pillar"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const pillarGroup = svg.querySelector('g[id="pillar"]');
        expect(pillarGroup).toBeTruthy();
    });

    it('renders StairsSVG group with id="stairs"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const stairsGroup = svg.querySelector('g[id="stairs"]');
        expect(stairsGroup).toBeTruthy();
    });

    it('renders AltarSVG group with id="altar"', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const altarGroup = svg.querySelector('g[id="altar"]');
        expect(altarGroup).toBeTruthy();
    });
});

// @improved-by-ai
import { render, act, screen } from '@testing-library/react';
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

describe('Map - loading state (null mapData)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.mapData = null;
        mockState.placedItems = [];
        createMockSetMapData.mockClear();
        createMockSetPlacedItems.mockClear();
    });

    it('returns null when mapData is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.firstChild).toBeNull();
    });

    it('does not render SVG when mapData is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('svg')).toBeNull();
    });
});

describe('Map - SVG defs registry completeness', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders all expected SVG defs groups in the defs element', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        const defs = svg.querySelector('defs');
        expect(defs).toBeTruthy();
        const groupIds = Array.from(defs.querySelectorAll('g')).map(g => g.id);
        const expectedIds = [
            'barrel', 'table', 'bed', 'firepit', 'door', 'secretDoor', 'trap',
            'pillar', 'stairs', 'altar', 'arrowSlitWall', 'bookshelf', 'chair',
            'chest', 'crate', 'fountain', 'skeleton', 'statue', 'torch', 'web',
            'tree', 'boulder', 'bush',
        ];
        for (const id of expectedIds) {
            expect(groupIds).toContain(id);
        }
    });
});

describe('Map - outdoor map type returns HexMap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders HexMap instead of indoor SVG when mapData.type is "outdoor"', async () => {
        mockState.mapData = createMockMapData({ type: 'outdoor' });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('[data-testid="hex-map"]')).toBeInTheDocument();
        expect(container.querySelector('.grid-svg')).toBeNull();
    });

    it('does not render the indoor map container for outdoor maps', async () => {
        mockState.mapData = createMockMapData({ type: 'outdoor' });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeNull();
    });
});

describe('Map - SVG structure with loaded mapData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders the map container div with grid-svg child', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
        expect(container.querySelector('.grid-svg')).toBeInTheDocument();
    });

    it('renders MapToolbar with toolbar class', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.toolbar')).toBeInTheDocument();
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

    it('renders SVG with spell overlay layer group', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const spellLayer = svg.querySelector('g.spell-overlay-layer');
        expect(spellLayer).toBeTruthy();
    });
});

describe('Map - SVG cursor styles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('applies grabbing cursor when panning', async () => {
        mockState.panning = true;
        mockState.rulerMode = false;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('grabbing');
    });

    it('applies crosshair cursor when rulerMode is active', async () => {
        mockState.panning = false;
        mockState.rulerMode = true;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('crosshair');
    });

    it('applies grab cursor when tool is none and not panning', async () => {
        mockState.panning = false;
        mockState.rulerMode = false;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.style.cursor).toBe('grab');
    });
});

describe('Map - SVG viewBox calculation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders SVG with viewBox reflecting panX and panY', async () => {
        mockState.panX = 100;
        mockState.panY = 200;
        mockState.zoom = 2;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.getAttribute('viewBox')).toBe('100 200 600 600');
    });

    it('renders SVG with viewBox dimensions calculated as SVG_SIZE / zoom', async () => {
        mockState.zoom = 0.5;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        expect(svg.getAttribute('viewBox')).toBe('0 0 2400 2400');
    });
});

describe('Map - non-localhost mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders the map for non-localhost clients', async () => {
        const { container } = await act(async () => renderMap({ isLocalhost: false }));
        expect(container.querySelector('.map')).toBeInTheDocument();
        expect(container.querySelector('.grid-svg')).toBeInTheDocument();
    });
});

describe('Map - room rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders room highlights with type-based CSS classes', async () => {
        mockState.mapData = createMockMapData({
            rooms: [
                { id: 'room1', type: 'entrance', label: 'Entrance', rect: { x: 0, y: 0, w: 10, h: 10 } },
                { id: 'room2', type: 'private', label: 'Bedroom', rect: { x: 10, y: 10, w: 5, h: 5 } },
            ],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.room-highlight')).toBeTruthy();
        expect(container.querySelector('.room-type-entrance')).toBeTruthy();
        expect(container.querySelector('.room-type-private')).toBeTruthy();
    });

    it('renders room labels from room.label property', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', label: 'Great Hall', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        await act(async () => renderMap());
        expect(screen.getByText('Great Hall')).toBeInTheDocument();
    });

    it('falls back to room.type when label is missing', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        await act(async () => renderMap());
        expect(screen.getByText('common')).toBeInTheDocument();
    });

    it('renders room hit areas when tool is none', async () => {
        mockState.mapData = createMockMapData({
            rooms: [{ id: 'room1', type: 'common', rect: { x: 0, y: 0, w: 10, h: 10 } }],
        });
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.room-hit-area')).toBeTruthy();
    });
});

describe('Map - RulerOverlay rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders ruler line when rulerStart and rulerEnd are set', async () => {
        mockState.rulerStart = { gridX: 0, gridY: 0 };
        mockState.rulerEnd = { gridX: 10, gridY: 10 };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('line.ruler-line')).toBeTruthy();
    });

    it('renders ruler preview line when rulerPreview is set instead of rulerEnd', async () => {
        mockState.rulerStart = { gridX: 0, gridY: 0 };
        mockState.rulerPreview = { gridX: 5, gridY: 5 };
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('line.ruler-line')).toBeTruthy();
    });

    it('does not render ruler line when rulerStart is null', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('line.ruler-line')).toBeNull();
    });
});

describe('Map - SpellOverlayRenderer rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetState();
    });

    it('renders spell overlay layer with existing overlays', async () => {
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

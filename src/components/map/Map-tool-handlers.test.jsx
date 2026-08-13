// @improved-by-ai
import { render, fireEvent, act, screen, createEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Map from './Map.jsx';
import { CELL_SIZE } from '../../config/mapConfig';
import { clearRuntimeState } from '../../hooks/runtime/useRuntimeState.js';

const mockLoadMonsters = vi.fn(() => Promise.resolve([]));

const handlers = {
    setMapData: vi.fn(),
    setPlacedItems: vi.fn(),
    setNpcImages: vi.fn(),
    setSelectedRoom: vi.fn(),
    gridPointerDown: vi.fn(),
    gridPointerMove: vi.fn(),
    gridPointerUp: vi.fn(),
    gridPointerLeave: vi.fn(),
    roomPointerDown: vi.fn(),
    roomPointerMove: vi.fn(),
    roomPointerUp: vi.fn(),
    roomClick: vi.fn(),
    selectPointerDown: vi.fn(),
    selectPointerMove: vi.fn(),
    selectPointerUp: vi.fn(),
    panStart: vi.fn(),
    panMove: vi.fn(),
    panEnd: vi.fn(),
    resetRuler: vi.fn(),
    setRulerMode: vi.fn(),
    rulerPointerDown: vi.fn(),
    rulerPointerMove: vi.fn(),
    rulerPointerUp: vi.fn(),
    spellPointerDown: vi.fn(),
    spellPointerMove: vi.fn(),
    spellPointerUp: vi.fn(),
    spellDragMove: vi.fn(),
    spellDragEnd: vi.fn(),
    playerPointerMove: vi.fn(),
    playerPointerUp: vi.fn(),
    itemPointerMove: vi.fn(),
    itemPointerUp: vi.fn(),
    itemPointerLeave: vi.fn(),
    mapSSE: vi.fn(),
    spellOverlaySSE: vi.fn(),
    drop: vi.fn(),
};

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
    spellDragActiveRef: { current: false },
};

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

globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadMonsters: () => mockLoadMonsters(),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
    loadMapData: vi.fn(() => Promise.resolve(null)),
    saveMapData: vi.fn(() => Promise.resolve()),
    formatMapName: vi.fn((name) => name),
    loadMaps: vi.fn(() => Promise.resolve({ maps: [] })),
}));

vi.mock('./hooks/useMapLoader.js', () => ({
    default: vi.fn(() => ({
        mapData: mockState.mapData,
        setMapData: handlers.setMapData,
        placedItems: mockState.placedItems,
        setPlacedItems: handlers.setPlacedItems,
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
        handlePanStart: handlers.panStart,
        handlePanMove: handlers.panMove,
        handlePanEnd: handlers.panEnd,
        handleWheel: vi.fn(),
        clientToSVG: vi.fn(),
    })),
}));

vi.mock('./hooks/useWallDrawing.js', () => ({
    default: vi.fn(() => ({
        painting: mockState.painting,
        handleGridPointerDown: handlers.gridPointerDown,
        handleGridPointerMove: handlers.gridPointerMove,
        handleGridPointerUp: handlers.gridPointerUp,
        handleGridPointerLeave: handlers.gridPointerLeave,
    })),
}));

vi.mock('./hooks/useRoomDrawing.js', () => ({
    default: vi.fn(() => ({
        roomDrawRect: mockState.roomDrawRect,
        selectedRoom: mockState.selectedRoom,
        setSelectedRoom: handlers.setSelectedRoom,
        handleRoomPointerDown: handlers.roomPointerDown,
        handleRoomPointerMove: handlers.roomPointerMove,
        handleRoomPointerUp: handlers.roomPointerUp,
        handleRoomClick: handlers.roomClick,
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
        handleSelectPointerDown: handlers.selectPointerDown,
        handleSelectPointerMove: handlers.selectPointerMove,
        handleSelectPointerUp: handlers.selectPointerUp,
    })),
}));

vi.mock('./hooks/useRuler.js', () => ({
    default: vi.fn(() => ({
        rulerMode: mockState.rulerMode,
        setRulerMode: handlers.setRulerMode,
        rulerStart: mockState.rulerStart,
        rulerEnd: mockState.rulerEnd,
        rulerPreview: mockState.rulerPreview,
        resetRuler: handlers.resetRuler,
        handleRulerPointerDown: handlers.rulerPointerDown,
        handleRulerPointerMove: handlers.rulerPointerMove,
        handleRulerPointerUp: handlers.rulerPointerUp,
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
        handleSSEEvent: handlers.spellOverlaySSE,
    })),
}));

vi.mock('./hooks/useSpellHandlers.js', () => ({
    default: vi.fn(() => ({
        spellDraft: mockState.spellDraft,
        dragOverlay: mockState.dragOverlay,
        rotateOverlay: mockState.rotateOverlay,
        spellDragActiveRef: mockState.spellDragActiveRef,
        handleSpellPointerDown: handlers.spellPointerDown,
        handleSpellPointerMove: handlers.spellPointerMove,
        handleSpellPointerUp: handlers.spellPointerUp,
        handleSpellDragMove: handlers.spellDragMove,
        handleSpellDragEnd: handlers.spellDragEnd,
    })),
}));

vi.mock('./hooks/usePlayerDragging.js', () => ({
    default: vi.fn(() => ({
        dragging: mockState.dragging,
        handlePointerDown: vi.fn(),
        handlePointerMove: handlers.playerPointerMove,
        handlePointerUp: handlers.playerPointerUp,
    })),
}));

vi.mock('./hooks/useItemDragging.js', () => ({
    default: vi.fn(() => ({
        itemDragging: mockState.itemDragging,
        handleItemPointerDown: vi.fn(),
        handleItemPointerMove: handlers.itemPointerMove,
        handleItemPointerUp: handlers.itemPointerUp,
        handleItemPointerLeave: handlers.itemPointerLeave,
    })),
}));

vi.mock('./hooks/useNpcImageCache.js', () => ({
    default: vi.fn(() => ({
        npcImages: mockState.npcImages,
        setNpcImages: handlers.setNpcImages,
    })),
}));

vi.mock('./hooks/useSSESync.js', () => ({
    default: vi.fn(() => ({ handleSSEEvent: handlers.mapSSE })),
}));

vi.mock('./hooks/useFogOfWar.js', () => ({
    default: vi.fn(() => new Set()),
}));

vi.mock('./hooks/useMapDrops.js', () => ({
    default: vi.fn(() => ({ handleDrop: handlers.drop })),
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

describe('Map - SVG pointer event routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        MockEventSource.instances.length = 0;
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
            spellDragActiveRef: { current: false },
        });
        mockState.selectStart.current = null;
        mockState.moveStartGrid.current = null;
        mockLoadMonsters.mockReset();
        mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
    });

    it('routes pointer down to pan start when tool is none', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerDown(svg, { button: 0 });
        });
        expect(handlers.panStart).toHaveBeenCalled();
        expect(handlers.gridPointerDown).not.toHaveBeenCalled();
        expect(handlers.selectPointerDown).not.toHaveBeenCalled();
        expect(handlers.roomPointerDown).not.toHaveBeenCalled();
    });

    it('routes pointer down to wall drawing for paint tool', async () => {
        const { container } = await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /paint/i }));
        });
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerDown(svg, { button: 0 });
        });
        expect(handlers.gridPointerDown).toHaveBeenCalledWith(expect.anything(), handlers.setMapData);
        expect(handlers.panStart).not.toHaveBeenCalled();
    });

    it('routes pointer down to wall drawing for erase tool', async () => {
        const { container } = await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /erase/i }));
        });
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerDown(svg, { button: 0 });
        });
        expect(handlers.gridPointerDown).toHaveBeenCalledWith(expect.anything(), handlers.setMapData);
        expect(handlers.panStart).not.toHaveBeenCalled();
    });

    it('routes pointer down to select pointer down for select tool', async () => {
        const { container } = await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /select/i }));
        });
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerDown(svg, { button: 0 });
        });
        expect(handlers.selectPointerDown).toHaveBeenCalledWith(expect.anything(), mockState.placedItems, mockState.mapData);
        expect(handlers.panStart).not.toHaveBeenCalled();
    });

    it('routes pointer down to room pointer down for room tool', async () => {
        const { container } = await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /room/i }));
        });
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerDown(svg, { button: 0 });
        });
        expect(handlers.roomPointerDown).toHaveBeenCalled();
        expect(handlers.panStart).not.toHaveBeenCalled();
    });

    it('skips tool routing when spell drag is active but still calls spell handlers', async () => {
        mockState.spellDragActiveRef.current = true;
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerDown(svg, { button: 0 });
        });
        expect(handlers.panStart).not.toHaveBeenCalled();
        expect(handlers.gridPointerDown).not.toHaveBeenCalled();
        expect(handlers.selectPointerDown).not.toHaveBeenCalled();
        expect(handlers.roomPointerDown).not.toHaveBeenCalled();
        expect(handlers.spellPointerDown).toHaveBeenCalled();
    });

    it('calls all pointer move handlers with correct arguments', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerMove(svg, { button: 0 });
        });
        expect(handlers.playerPointerMove).toHaveBeenCalled();
        expect(handlers.itemPointerMove).toHaveBeenCalled();
        expect(handlers.gridPointerMove).toHaveBeenCalledWith(expect.anything(), handlers.setMapData, false, 'none');
        expect(handlers.selectPointerMove).toHaveBeenCalled();
        expect(handlers.roomPointerMove).toHaveBeenCalled();
        expect(handlers.panMove).toHaveBeenCalled();
        expect(handlers.spellPointerMove).toHaveBeenCalled();
        expect(handlers.spellDragMove).toHaveBeenCalled();
        expect(handlers.rulerPointerMove).toHaveBeenCalled();
    });

    it('calls all pointer up handlers with correct arguments', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerUp(svg, { button: 0 });
        });
        expect(handlers.playerPointerUp).toHaveBeenCalled();
        expect(handlers.itemPointerUp).toHaveBeenCalled();
        expect(handlers.gridPointerUp).toHaveBeenCalled();
        expect(handlers.selectPointerUp).toHaveBeenCalledWith(expect.anything(), mockState.placedItems, mockState.mapData, handlers.setMapData, handlers.setPlacedItems);
        expect(handlers.roomPointerUp).toHaveBeenCalledWith(expect.anything(), 30, handlers.setMapData);
        expect(handlers.panEnd).toHaveBeenCalled();
        expect(handlers.spellPointerUp).toHaveBeenCalled();
        expect(handlers.spellDragEnd).toHaveBeenCalled();
        expect(handlers.rulerPointerUp).toHaveBeenCalled();
    });

    it('calls leave handlers when pointer leaves SVG', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.pointerLeave(svg);
        });
        expect(handlers.itemPointerLeave).toHaveBeenCalled();
        expect(handlers.gridPointerLeave).toHaveBeenCalled();
        expect(handlers.selectPointerUp).toHaveBeenCalledWith(expect.anything(), mockState.placedItems, mockState.mapData, handlers.setMapData, handlers.setPlacedItems);
    });

    it('closes menus and routes room click on left click only', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.click(svg, { button: 0 });
        });
        expect(handlers.roomClick).toHaveBeenCalledWith(expect.anything(), mockState.mapData, 'none');
        expect(handlers.setSelectedRoom).toHaveBeenCalledWith(null);
    });

    it('does not close menus on right click', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.click(svg, { button: 2 });
        });
        expect(handlers.roomClick).not.toHaveBeenCalled();
        expect(handlers.setSelectedRoom).not.toHaveBeenCalled();
    });

    it('prevents default context menu on SVG', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const contextMenuEvent = createEvent.contextMenu(svg);
        fireEvent(svg, contextMenuEvent);
        expect(contextMenuEvent.defaultPrevented).toBe(true);
    });

    it('prevents default drag over on SVG', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        const dragOverEvent = createEvent.dragOver(svg);
        fireEvent(svg, dragOverEvent);
        expect(dragOverEvent.defaultPrevented).toBe(true);
    });

    it('calls handleDrop on drop event', async () => {
        const { container } = await act(async () => renderMap());
        const svg = container.querySelector('svg');
        await act(async () => {
            fireEvent.drop(svg);
        });
        expect(handlers.drop).toHaveBeenCalled();
    });

    it('dispatches SSE events to map and spell overlay handlers', async () => {
        const { container } = await act(async () => renderMap());
        expect(container.querySelector('.map')).toBeInTheDocument();
        const eventSource = MockEventSource.instances[0];
        expect(eventSource).toBeTruthy();
        const payload = { type: 'map-data', value: { players: [] } };
        await act(async () => {
            eventSource.onmessage({ data: JSON.stringify(payload) });
        });
        expect(handlers.mapSSE).toHaveBeenCalledWith(payload);
        expect(handlers.spellOverlaySSE).toHaveBeenCalledWith(payload);
    });
});

describe('Map - toolbar interactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        Object.assign(mockState, {
            mapData: createMockMapData(),
            placedItems: [],
            rulerMode: false,
        });
        mockState.selectStart.current = null;
        mockState.moveStartGrid.current = null;
        mockState.spellDragActiveRef.current = false;
        mockLoadMonsters.mockReset();
        mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
    });

    it('enables ruler mode and resets ruler when toggled on', async () => {
        await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /ruler/i }));
        });
        expect(handlers.setRulerMode).toHaveBeenCalledWith(true);
        expect(handlers.resetRuler).toHaveBeenCalled();
    });

    it('disables ruler mode without resetting ruler when toggled off', async () => {
        mockState.rulerMode = true;
        await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /ruler/i }));
        });
        expect(handlers.setRulerMode).toHaveBeenCalledWith(false);
        expect(handlers.resetRuler).not.toHaveBeenCalled();
    });

    it('opens and closes the items panel', async () => {
        const { container } = await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /items/i }));
        });
        expect(container.querySelector('.items-panel-close')).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(container.querySelector('.items-panel-close'));
        });
        expect(container.querySelector('.items-panel-close')).not.toBeInTheDocument();
    });

    it('opens the items panel for an outdoor map variant', async () => {
        mockState.mapData = createMockMapData({ parentHex: true });
        const { container } = await act(async () => renderMap());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /items/i }));
        });
        expect(container.querySelector('.items-panel-close')).toBeInTheDocument();
    });
});

describe('Map - selection, room draw and move previews', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        Object.assign(mockState, {
            mapData: createMockMapData(),
            placedItems: [],
            selectedWalls: new Set(),
            selectedItems: new Set(),
            selectionRect: null,
            moveOffset: null,
            roomDrawRect: null,
        });
        mockState.selectStart.current = null;
        mockState.moveStartGrid.current = null;
        mockState.spellDragActiveRef.current = false;
        mockLoadMonsters.mockReset();
        mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
    });

    it('renders selection preview rect with correct pixel dimensions', async () => {
        mockState.selectStart.current = { gridX: 2, gridY: 3 };
        mockState.selectionRect = { minX: 2, maxX: 4, minY: 3, maxY: 5 };
        const { container } = await act(async () => renderMap());
        const preview = container.querySelector('rect.selection-preview');
        expect(preview).toBeTruthy();
        expect(preview).toHaveAttribute('x', String(2 * CELL_SIZE));
        expect(preview).toHaveAttribute('y', String(3 * CELL_SIZE));
        expect(preview).toHaveAttribute('width', String((4 - 2 + 1) * CELL_SIZE));
        expect(preview).toHaveAttribute('height', String((5 - 3 + 1) * CELL_SIZE));
    });

    it('renders room draw preview rect with correct pixel dimensions', async () => {
        mockState.roomDrawRect = { minX: 1, maxX: 3, minY: 2, maxY: 4 };
        const { container } = await act(async () => renderMap());
        const preview = container.querySelector('rect.room-draw-preview');
        expect(preview).toBeTruthy();
        expect(preview).toHaveAttribute('x', String(1 * CELL_SIZE));
        expect(preview).toHaveAttribute('y', String(2 * CELL_SIZE));
        expect(preview).toHaveAttribute('width', String((3 - 1 + 1) * CELL_SIZE));
        expect(preview).toHaveAttribute('height', String((4 - 2 + 1) * CELL_SIZE));
    });

    it('does not render selection preview when selectStart is null', async () => {
        mockState.selectStart.current = null;
        mockState.selectionRect = { minX: 2, maxX: 4, minY: 3, maxY: 5 };
        const { container } = await act(async () => renderMap());
        const preview = container.querySelector('rect.selection-preview');
        expect(preview).toBeFalsy();
    });

    it('does not render room draw preview when roomDrawRect is null', async () => {
        mockState.roomDrawRect = null;
        const { container } = await act(async () => renderMap());
        const preview = container.querySelector('rect.room-draw-preview');
        expect(preview).toBeFalsy();
    });
});

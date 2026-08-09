import { render, fireEvent, act, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Map from './Map.jsx';
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
    });
    mockState.selectStart.current = null;
    mockState.moveStartGrid.current = null;
    mockState.spellDragActiveRef.current = false;
    mockLoadMonsters.mockReset();
    mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
};

describe('Map - NPC context menu and monster stats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        MockEventSource.instances.length = 0;
        resetState();
    });

    it('shows context menu with rename option when an NPC is right-clicked', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        expect(hitRect).toBeTruthy();
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        expect(screen.getByText('Rename')).toBeInTheDocument();
    });

    it('opens the monster card modal via View Stats when the monster is loaded', async () => {
        mockLoadMonsters.mockImplementation(() => Promise.resolve([{ name: 'Goblin', index: 'goblin' }]));
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        await act(async () => {});
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('View Stats'));
        });
        const modal = screen.getByTestId('monster-card-modal');
        expect(modal).toBeInTheDocument();
        expect(within(modal).getByText('Goblin')).toBeInTheDocument();
    });

    it('closes the monster card modal via its close button', async () => {
        mockLoadMonsters.mockImplementation(() => Promise.resolve([{ name: 'Goblin', index: 'goblin' }]));
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        await act(async () => {});
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('View Stats'));
        });
        expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(container.querySelector('.mc-close'));
        });
        expect(screen.queryByTestId('monster-card-modal')).not.toBeInTheDocument();
    });

    it('hides View Stats when the monster is not in the loaded list', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Zombie', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        await act(async () => {});
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
        expect(screen.getByText('Rename')).toBeInTheDocument();
    });

    it('logs an error when monsters fail to load', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockLoadMonsters.mockImplementation(() => Promise.reject(new Error('boom')));
        await act(async () => renderMap());
        expect(errorSpy).toHaveBeenCalledWith('[Map] Error:', expect.any(Error));
        errorSpy.mockRestore();
    });
});

describe('Map - rename flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        MockEventSource.instances.length = 0;
        resetState();
    });

    it('renames an NPC through the autocomplete commit', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('Rename'));
        });
        const input = container.querySelector('.monster-autocomplete-input');
        expect(input).toBeInTheDocument();
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Orc' } });
            fireEvent.keyDown(input, { key: 'Enter' });
        });
        expect(handlers.setPlacedItems).toHaveBeenCalledTimes(1);
        const updater = handlers.setPlacedItems.mock.calls[0][0];
        const renamed = updater([{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }]);
        expect(renamed[0].name).toBe('Orc');
        expect(handlers.setNpcImages).toHaveBeenCalled();
        const imageUpdater = handlers.setNpcImages.mock.calls[0][0];
        expect(imageUpdater({})).toEqual({ Orc: null });
        expect(container.querySelector('.monster-autocomplete-input')).not.toBeInTheDocument();
    });

    it('does not rename when the committed name is empty', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('Rename'));
        });
        const input = container.querySelector('.monster-autocomplete-input');
        await act(async () => {
            fireEvent.change(input, { target: { value: '' } });
            fireEvent.keyDown(input, { key: 'Enter' });
        });
        expect(handlers.setPlacedItems).not.toHaveBeenCalled();
    });
});

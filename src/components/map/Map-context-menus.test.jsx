// @improved-by-ai
import { render, fireEvent, act, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Map from './Map.jsx';
import { clearRuntimeState } from '../../hooks/runtime/useRuntimeState.js';

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

vi.mock('../../hooks/runtime/useLog.js', () => ({
    default: vi.fn(() => ({ logEntries: [], initialized: true, addEntry: vi.fn() })),
}));

vi.mock('./hooks/useMapLoader.js', () => ({
    default: vi.fn(() => ({
        mapData: mockState.mapData,
        setMapData: vi.fn((fn) => {
            const result = typeof fn === 'function' ? fn(mockState.mapData) : fn;
            mockState.mapData = result;
        }),
        placedItems: mockState.placedItems,
        setPlacedItems: vi.fn((fn) => {
            const result = typeof fn === 'function' ? fn(mockState.placedItems) : fn;
            mockState.placedItems = result;
        }),
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
        setNpcImages: vi.fn((fn) => {
            const result = typeof fn === 'function' ? fn(mockState.npcImages) : fn;
            Object.assign(mockState.npcImages, result);
        }),
    })),
}));

vi.mock('./hooks/useSSESync.js', () => ({
    default: vi.fn(() => ({ handleSSEEvent: vi.fn() })),
}));

vi.mock('./hooks/useFogOfWar.js', () => ({
    default: vi.fn(() => new Set()),
}));

vi.mock('./hooks/useMapDrops.js', () => ({
    default: vi.fn(() => ({ handleDrop: vi.fn() })),
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
    mockLoadMonsters.mockReset();
    mockLoadMonsters.mockImplementation(() => Promise.resolve([]));
};

describe('Map - NPC context menu rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        MockEventSource.instances.length = 0;
        resetState();
    });

    it('shows context menu with Rename option when an NPC is right-clicked', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        expect(hitRect).toBeTruthy();
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        expect(screen.getByText('Rename')).toBeInTheDocument();
    });

    it('does not show View Stats when no monsters are loaded', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
    });

    it('does not show View Stats for non-NPC placed items', async () => {
        mockState.placedItems = [{ id: 'barrel1', type: 'barrel', name: 'Barrel', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.item-hit-area');
        expect(hitRect).toBeTruthy();
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
        expect(screen.queryByText('Rename')).not.toBeInTheDocument();
    });

    it('hides View Stats when NPC name does not match any loaded monster', async () => {
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Zombie', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
        expect(screen.getByText('Rename')).toBeInTheDocument();
    });
});

describe('Map - NPC rename flow', () => {
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
        expect(mockState.placedItems[0].name).toBe('Orc');
        expect(mockState.npcImages).toHaveProperty('Orc', null);
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
        expect(mockState.placedItems[0].name).toBe('Goblin');
    });

    it('trims whitespace from the committed name', async () => {
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
            fireEvent.change(input, { target: { value: '  Orc  ' } });
            fireEvent.keyDown(input, { key: 'Enter' });
        });
        expect(mockState.placedItems[0].name).toBe('Orc');
    });
});

describe('Map - monster card modal flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        MockEventSource.instances.length = 0;
        resetState();
    });

    it('opens the monster card modal via View Stats when the monster is loaded', async () => {
        mockLoadMonsters.mockImplementation(() => Promise.resolve([{ name: 'Goblin', index: 'goblin' }]));
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
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

    it('matches monster names case-insensitively for View Stats', async () => {
        mockLoadMonsters.mockImplementation(() => Promise.resolve([{ name: 'goblin', index: 'goblin' }]));
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'GOBLIN', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('View Stats'));
        });
        expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
    });

    it('strips trailing numbers from NPC names when matching monsters', async () => {
        mockLoadMonsters.mockImplementation(() => Promise.resolve([{ name: 'Goblin', index: 'goblin' }]));
        mockState.placedItems = [{ id: 'npc1', type: 'npc', name: 'Goblin 3', gridX: 5, gridY: 5 }];
        const { container } = await act(async () => renderMap());
        const hitRect = container.querySelector('.npc-group rect');
        await act(async () => {
            fireEvent.contextMenu(hitRect);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('View Stats'));
        });
        expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
    });
});

describe('Map - error handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearRuntimeState('test-campaign');
        MockEventSource.instances.length = 0;
        resetState();
    });

    it('logs an error when monsters fail to load', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockLoadMonsters.mockImplementation(() => Promise.reject(new Error('boom')));
        await act(async () => renderMap());
        expect(errorSpy).toHaveBeenCalledWith('[Map] Error:', expect.any(Error));
        errorSpy.mockRestore();
    });
});

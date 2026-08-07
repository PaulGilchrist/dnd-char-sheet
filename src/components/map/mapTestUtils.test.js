import { describe, it, expect, vi } from 'vitest';
import {
    mockGridCenterX,
    mockGridCenterY,
    createDefaultMocks,
    createZoomPanMocks,
    createWallDrawingMocks,
    createRoomDrawingMocks,
    createSelectMoveMocks,
    createRulerMocks,
    createSpellOverlayMocks,
    createSpellHandlersMocks,
    createPlayerDraggingMocks,
    createItemDraggingMocks,
    createNpcImageCacheMocks,
    createSSESyncMocks,
    createMapDropsMocks,
    setupMapMocks,
} from './mapTestUtils.js';

describe('mapTestUtils', () => {
    describe('mockGridCenterX', () => {
        it('should convert grid X to pixel center', () => {
            expect(mockGridCenterX(0)).toBe(20);
            expect(mockGridCenterX(1)).toBe(60);
            expect(mockGridCenterX(5)).toBe(220);
            expect(mockGridCenterX(10)).toBe(420);
        });

        it('should handle negative grid values', () => {
            expect(mockGridCenterX(-1)).toBe(-20);
        });
    });

    describe('mockGridCenterY', () => {
        it('should convert grid Y to pixel center', () => {
            expect(mockGridCenterY(0)).toBe(20);
            expect(mockGridCenterY(1)).toBe(60);
            expect(mockGridCenterY(5)).toBe(220);
            expect(mockGridCenterY(10)).toBe(420);
        });

        it('should handle negative grid values', () => {
            expect(mockGridCenterY(-1)).toBe(-20);
        });
    });

    describe('createDefaultMocks', () => {
        it('should return an object with mapData, setMapData, placedItems, setPlacedItems', () => {
            const mocks = createDefaultMocks();

            expect(mocks).toHaveProperty('mapData');
            expect(mocks).toHaveProperty('setMapData');
            expect(mocks).toHaveProperty('placedItems');
            expect(mocks).toHaveProperty('setPlacedItems');
        });

        it('should initialize mapData with players array, walls Set, and rooms array', () => {
            const { mapData } = createDefaultMocks();

            expect(mapData).toHaveProperty('players');
            expect(mapData.players).toEqual([]);
            expect(mapData.walls).toBeInstanceOf(Set);
            expect(mapData.walls.size).toBe(0);
            expect(mapData).toHaveProperty('rooms');
            expect(mapData.rooms).toEqual([]);
        });

        it('should initialize placedItems as empty array', () => {
            const { placedItems } = createDefaultMocks();
            expect(placedItems).toEqual([]);
        });

        it('should create vi.fn() for setMapData and setPlacedItems', () => {
            const { setMapData, setPlacedItems } = createDefaultMocks();

            expect(typeof setMapData).toBe('function');
            expect(typeof setPlacedItems).toBe('function');
        });

        it('should accept overrides for mapData', () => {
            const overrides = {
                mapData: { players: [{ name: 'Test' }], walls: new Set(['1,1-2,2']), rooms: [{ id: 'r1' }] },
            };
            const { mapData } = createDefaultMocks(overrides);

            expect(mapData.players).toEqual([{ name: 'Test' }]);
            expect(mapData.walls.has('1,1-2,2')).toBe(true);
            expect(mapData.rooms).toEqual([{ id: 'r1' }]);
        });

        it('should accept overrides for placedItems', () => {
            const overrides = { placedItems: [{ id: 'item1' }] };
            const { placedItems } = createDefaultMocks(overrides);

            expect(placedItems).toEqual([{ id: 'item1' }]);
        });

        it('should accept overrides for functions', () => {
            const customFn = vi.fn();
            const overrides = { setMapData: customFn };
            const { setMapData } = createDefaultMocks(overrides);

            expect(setMapData).toBe(customFn);
        });
    });

    describe('createZoomPanMocks', () => {
        it('should return an object with all zoom/pan properties', () => {
            const mocks = createZoomPanMocks();

            expect(mocks).toHaveProperty('zoom');
            expect(mocks).toHaveProperty('panX');
            expect(mocks).toHaveProperty('panY');
            expect(mocks).toHaveProperty('zoomIn');
            expect(mocks).toHaveProperty('zoomOut');
            expect(mocks).toHaveProperty('resetView');
            expect(mocks).toHaveProperty('gridCenterX');
            expect(mocks).toHaveProperty('gridCenterY');
            expect(mocks).toHaveProperty('getGridFromEvent');
            expect(mocks).toHaveProperty('panning');
            expect(mocks).toHaveProperty('handlePanStart');
            expect(mocks).toHaveProperty('handlePanMove');
            expect(mocks).toHaveProperty('handlePanEnd');
            expect(mocks).toHaveProperty('handleWheel');
            expect(mocks).toHaveProperty('clientToSVG');
        });

        it('should initialize zoom to 1, panX/panY to 0, panning to false', () => {
            const { zoom, panX, panY, panning } = createZoomPanMocks();

            expect(zoom).toBe(1);
            expect(panX).toBe(0);
            expect(panY).toBe(0);
            expect(panning).toBe(false);
        });

        it('should create vi.fn() for all handler functions', () => {
            const { zoomIn, zoomOut, resetView, getGridFromEvent, handlePanStart, handlePanMove, handlePanEnd, handleWheel, clientToSVG } = createZoomPanMocks();

            expect(typeof zoomIn).toBe('function');
            expect(typeof zoomOut).toBe('function');
            expect(typeof resetView).toBe('function');
            expect(typeof getGridFromEvent).toBe('function');
            expect(typeof handlePanStart).toBe('function');
            expect(typeof handlePanMove).toBe('function');
            expect(typeof handlePanEnd).toBe('function');
            expect(typeof handleWheel).toBe('function');
            expect(typeof clientToSVG).toBe('function');
        });

        it('should set gridCenterX/gridCenterY to mockGridCenterX/mockGridCenterY', () => {
            const { gridCenterX, gridCenterY } = createZoomPanMocks();

            expect(gridCenterX).toBe(mockGridCenterX);
            expect(gridCenterY).toBe(mockGridCenterY);
        });

        it('should initialize getGridFromEvent to return { gridX: 5, gridY: 5 }', () => {
            const { getGridFromEvent } = createZoomPanMocks();

            const result = getGridFromEvent();
            expect(result).toEqual({ gridX: 5, gridY: 5 });
        });

        it('should accept overrides', () => {
            const customFn = vi.fn(() => ({ gridX: 10, gridY: 10 }));
            const overrides = { zoom: 2, getGridFromEvent: customFn };
            const mocks = createZoomPanMocks(overrides);

            expect(mocks.zoom).toBe(2);
            expect(mocks.getGridFromEvent()).toEqual({ gridX: 10, gridY: 10 });
        });
    });

    describe('createWallDrawingMocks', () => {
        it('should return an object with painting and wall event handlers', () => {
            const mocks = createWallDrawingMocks();

            expect(mocks).toHaveProperty('painting');
            expect(mocks).toHaveProperty('handleGridPointerDown');
            expect(mocks).toHaveProperty('handleGridPointerMove');
            expect(mocks).toHaveProperty('handleGridPointerUp');
            expect(mocks).toHaveProperty('handleGridPointerLeave');
        });

        it('should initialize painting to false', () => {
            const { painting } = createWallDrawingMocks();
            expect(painting).toBe(false);
        });

        it('should create vi.fn() for all handler functions', () => {
            const { handleGridPointerDown, handleGridPointerMove, handleGridPointerUp, handleGridPointerLeave } = createWallDrawingMocks();

            expect(typeof handleGridPointerDown).toBe('function');
            expect(typeof handleGridPointerMove).toBe('function');
            expect(typeof handleGridPointerUp).toBe('function');
            expect(typeof handleGridPointerLeave).toBe('function');
        });
    });

    describe('createRoomDrawingMocks', () => {
        it('should return an object with room drawing state and handlers', () => {
            const mocks = createRoomDrawingMocks();

            expect(mocks).toHaveProperty('roomDrawRect');
            expect(mocks).toHaveProperty('selectedRoom');
            expect(mocks).toHaveProperty('setSelectedRoom');
            expect(mocks).toHaveProperty('handleRoomPointerDown');
            expect(mocks).toHaveProperty('handleRoomPointerMove');
            expect(mocks).toHaveProperty('handleRoomPointerUp');
            expect(mocks).toHaveProperty('handleRoomClick');
        });

        it('should initialize roomDrawRect and selectedRoom to null', () => {
            const { roomDrawRect, selectedRoom } = createRoomDrawingMocks();

            expect(roomDrawRect).toBeNull();
            expect(selectedRoom).toBeNull();
        });

        it('should create vi.fn() for setSelectedRoom and handlers', () => {
            const { setSelectedRoom, handleRoomPointerDown, handleRoomPointerMove, handleRoomPointerUp, handleRoomClick } = createRoomDrawingMocks();

            expect(typeof setSelectedRoom).toBe('function');
            expect(typeof handleRoomPointerDown).toBe('function');
            expect(typeof handleRoomPointerMove).toBe('function');
            expect(typeof handleRoomPointerUp).toBe('function');
            expect(typeof handleRoomClick).toBe('function');
        });
    });

    describe('createSelectMoveMocks', () => {
        it('should return an object with selection state and handlers', () => {
            const mocks = createSelectMoveMocks();

            expect(mocks).toHaveProperty('selectionRect');
            expect(mocks).toHaveProperty('selectedWalls');
            expect(mocks).toHaveProperty('selectedItems');
            expect(mocks).toHaveProperty('moveOffset');
            expect(mocks).toHaveProperty('selectedWallsRef');
            expect(mocks).toHaveProperty('selectedItemsRef');
            expect(mocks).toHaveProperty('selectStart');
            expect(mocks).toHaveProperty('moveStartGrid');
            expect(mocks).toHaveProperty('moveOffsetRef');
            expect(mocks).toHaveProperty('selectionRectRef');
            expect(mocks).toHaveProperty('selectionBoundsRef');
            expect(mocks).toHaveProperty('placedItemsRef');
            expect(mocks).toHaveProperty('mapDataRef');
            expect(mocks).toHaveProperty('handleSelectPointerDown');
            expect(mocks).toHaveProperty('handleSelectPointerMove');
            expect(mocks).toHaveProperty('handleSelectPointerUp');
        });

        it('should initialize selectionRect and moveOffset to null', () => {
            const { selectionRect, moveOffset } = createSelectMoveMocks();

            expect(selectionRect).toBeNull();
            expect(moveOffset).toBeNull();
        });

        it('should initialize selectedWalls and selectedItems as empty Sets', () => {
            const { selectedWalls, selectedItems } = createSelectMoveMocks();

            expect(selectedWalls).toBeInstanceOf(Set);
            expect(selectedItems).toBeInstanceOf(Set);
            expect(selectedWalls.size).toBe(0);
            expect(selectedItems.size).toBe(0);
        });

        it('should initialize refs with correct initial values', () => {
            const { selectedWallsRef, selectedItemsRef, selectStart, moveStartGrid, moveOffsetRef, selectionRectRef, selectionBoundsRef, placedItemsRef, mapDataRef } = createSelectMoveMocks();

            expect(selectedWallsRef.current).toBeInstanceOf(Set);
            expect(selectedItemsRef.current).toBeInstanceOf(Set);
            expect(selectStart.current).toBeNull();
            expect(moveStartGrid.current).toBeNull();
            expect(moveOffsetRef.current).toBeNull();
            expect(selectionRectRef.current).toBeNull();
            expect(selectionBoundsRef.current).toBeNull();
            expect(placedItemsRef.current).toEqual([]);
            expect(mapDataRef.current).toBeNull();
        });

        it('should create vi.fn() for all handler functions', () => {
            const { handleSelectPointerDown, handleSelectPointerMove, handleSelectPointerUp } = createSelectMoveMocks();

            expect(typeof handleSelectPointerDown).toBe('function');
            expect(typeof handleSelectPointerMove).toBe('function');
            expect(typeof handleSelectPointerUp).toBe('function');
        });
    });

    describe('createRulerMocks', () => {
        it('should return an object with ruler state and handlers', () => {
            const mocks = createRulerMocks();

            expect(mocks).toHaveProperty('rulerMode');
            expect(mocks).toHaveProperty('setRulerMode');
            expect(mocks).toHaveProperty('rulerStart');
            expect(mocks).toHaveProperty('rulerEnd');
            expect(mocks).toHaveProperty('rulerPreview');
            expect(mocks).toHaveProperty('resetRuler');
            expect(mocks).toHaveProperty('handleRulerPointerDown');
            expect(mocks).toHaveProperty('handleRulerPointerMove');
            expect(mocks).toHaveProperty('handleRulerPointerUp');
        });

        it('should initialize rulerMode to false and positions to null', () => {
            const { rulerMode, rulerStart, rulerEnd, rulerPreview } = createRulerMocks();

            expect(rulerMode).toBe(false);
            expect(rulerStart).toBeNull();
            expect(rulerEnd).toBeNull();
            expect(rulerPreview).toBeNull();
        });

        it('should create vi.fn() for setRulerMode, resetRuler, and handlers', () => {
            const { setRulerMode, resetRuler, handleRulerPointerDown, handleRulerPointerMove, handleRulerPointerUp } = createRulerMocks();

            expect(typeof setRulerMode).toBe('function');
            expect(typeof resetRuler).toBe('function');
            expect(typeof handleRulerPointerDown).toBe('function');
            expect(typeof handleRulerPointerMove).toBe('function');
            expect(typeof handleRulerPointerUp).toBe('function');
        });
    });

    describe('createSpellOverlayMocks', () => {
        it('should return an object with overlay state and handlers', () => {
            const mocks = createSpellOverlayMocks();

            expect(mocks).toHaveProperty('overlays');
            expect(mocks).toHaveProperty('addOverlay');
            expect(mocks).toHaveProperty('updateOverlay');
            expect(mocks).toHaveProperty('updateOverlayImmediate');
            expect(mocks).toHaveProperty('removeOverlay');
            expect(mocks).toHaveProperty('clearOverlays');
            expect(mocks).toHaveProperty('handleSSEEvent');
        });

        it('should initialize overlays as empty array', () => {
            const { overlays } = createSpellOverlayMocks();
            expect(overlays).toEqual([]);
        });

        it('should create vi.fn() for all handler functions', () => {
            const { addOverlay, updateOverlay, updateOverlayImmediate, removeOverlay, clearOverlays, handleSSEEvent } = createSpellOverlayMocks();

            expect(typeof addOverlay).toBe('function');
            expect(typeof updateOverlay).toBe('function');
            expect(typeof updateOverlayImmediate).toBe('function');
            expect(typeof removeOverlay).toBe('function');
            expect(typeof clearOverlays).toBe('function');
            expect(typeof handleSSEEvent).toBe('function');
        });
    });

    describe('createSpellHandlersMocks', () => {
        it('should return an object with spell handler state and handlers', () => {
            const mocks = createSpellHandlersMocks();

            expect(mocks).toHaveProperty('spellDraft');
            expect(mocks).toHaveProperty('dragOverlay');
            expect(mocks).toHaveProperty('rotateOverlay');
            expect(mocks).toHaveProperty('spellDragActiveRef');
            expect(mocks).toHaveProperty('handleSpellPointerDown');
            expect(mocks).toHaveProperty('handleSpellPointerMove');
            expect(mocks).toHaveProperty('handleSpellPointerUp');
            expect(mocks).toHaveProperty('handleSpellDragMove');
            expect(mocks).toHaveProperty('handleSpellDragEnd');
        });

        it('should initialize spellDraft, dragOverlay, rotateOverlay to null', () => {
            const { spellDraft, dragOverlay, rotateOverlay } = createSpellHandlersMocks();

            expect(spellDraft).toBeNull();
            expect(dragOverlay).toBeNull();
            expect(rotateOverlay).toBeNull();
        });

        it('should initialize spellDragActiveRef with current: false', () => {
            const { spellDragActiveRef } = createSpellHandlersMocks();
            expect(spellDragActiveRef.current).toBe(false);
        });

        it('should create vi.fn() for all handler functions', () => {
            const { handleSpellPointerDown, handleSpellPointerMove, handleSpellPointerUp, handleSpellDragMove, handleSpellDragEnd } = createSpellHandlersMocks();

            expect(typeof handleSpellPointerDown).toBe('function');
            expect(typeof handleSpellPointerMove).toBe('function');
            expect(typeof handleSpellPointerUp).toBe('function');
            expect(typeof handleSpellDragMove).toBe('function');
            expect(typeof handleSpellDragEnd).toBe('function');
        });
    });

    describe('createPlayerDraggingMocks', () => {
        it('should return an object with dragging state and handlers', () => {
            const mocks = createPlayerDraggingMocks();

            expect(mocks).toHaveProperty('dragging');
            expect(mocks).toHaveProperty('handlePointerDown');
            expect(mocks).toHaveProperty('handlePointerMove');
            expect(mocks).toHaveProperty('handlePointerUp');
        });

        it('should initialize dragging to null', () => {
            const { dragging } = createPlayerDraggingMocks();
            expect(dragging).toBeNull();
        });

        it('should create vi.fn() for all handler functions', () => {
            const { handlePointerDown, handlePointerMove, handlePointerUp } = createPlayerDraggingMocks();

            expect(typeof handlePointerDown).toBe('function');
            expect(typeof handlePointerMove).toBe('function');
            expect(typeof handlePointerUp).toBe('function');
        });
    });

    describe('createItemDraggingMocks', () => {
        it('should return an object with itemDragging state and handlers', () => {
            const mocks = createItemDraggingMocks();

            expect(mocks).toHaveProperty('itemDragging');
            expect(mocks).toHaveProperty('handleItemPointerDown');
            expect(mocks).toHaveProperty('handleItemPointerMove');
            expect(mocks).toHaveProperty('handleItemPointerUp');
            expect(mocks).toHaveProperty('handleItemPointerLeave');
        });

        it('should initialize itemDragging to null', () => {
            const { itemDragging } = createItemDraggingMocks();
            expect(itemDragging).toBeNull();
        });

        it('should create vi.fn() for all handler functions', () => {
            const { handleItemPointerDown, handleItemPointerMove, handleItemPointerUp, handleItemPointerLeave } = createItemDraggingMocks();

            expect(typeof handleItemPointerDown).toBe('function');
            expect(typeof handleItemPointerMove).toBe('function');
            expect(typeof handleItemPointerUp).toBe('function');
            expect(typeof handleItemPointerLeave).toBe('function');
        });
    });

    describe('createNpcImageCacheMocks', () => {
        it('should return an object with npcImages and setNpcImages', () => {
            const mocks = createNpcImageCacheMocks();

            expect(mocks).toHaveProperty('npcImages');
            expect(mocks).toHaveProperty('setNpcImages');
        });

        it('should initialize npcImages as empty object', () => {
            const { npcImages } = createNpcImageCacheMocks();
            expect(npcImages).toEqual({});
        });

        it('should create vi.fn() for setNpcImages', () => {
            const { setNpcImages } = createNpcImageCacheMocks();
            expect(typeof setNpcImages).toBe('function');
        });
    });

    describe('createSSESyncMocks', () => {
        it('should return an object with handleSSEEvent', () => {
            const mocks = createSSESyncMocks();

            expect(mocks).toHaveProperty('handleSSEEvent');
        });

        it('should create vi.fn() for handleSSEEvent', () => {
            const { handleSSEEvent } = createSSESyncMocks();
            expect(typeof handleSSEEvent).toBe('function');
        });
    });

    describe('createMapDropsMocks', () => {
        it('should return an object with handleDrop', () => {
            const mocks = createMapDropsMocks();

            expect(mocks).toHaveProperty('handleDrop');
        });

        it('should create vi.fn() for handleDrop', () => {
            const { handleDrop } = createMapDropsMocks();
            expect(typeof handleDrop).toBe('function');
        });
    });

    describe('setupMapMocks', () => {
        it('should be a function', () => {
            expect(typeof setupMapMocks).toBe('function');
        });

        it('should throw when called outside a test context where vi.mock hoisting is available', () => {
            expect(() => setupMapMocks({})).toThrow(TypeError);
        });

        it('should throw with vi.mock error message', () => {
            try {
                setupMapMocks();
            } catch (e) {
                expect(e.message).toContain('mock');
            }
        });

        it('should have a default empty object parameter', () => {
            const fnLength = setupMapMocks.length;
            expect(fnLength).toBe(0);
        });
    });
});

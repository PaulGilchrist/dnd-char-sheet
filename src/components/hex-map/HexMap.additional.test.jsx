import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// JSDOM PointerEvent polyfill (needed for React 19 onPointerLeave handlers)
if (!globalThis.PointerEvent) {
    globalThis.PointerEvent = class PointerEvent extends MouseEvent {
        constructor(type, init = {}) {
            super(type, init);
            this.pointerId = init.pointerId || 0;
            this.pointerType = init.pointerType || 'mouse';
        }
    };
}

// Capture POI layer props so tests can inspect values HexMap passes to it.
const { poiLayerProps } = vi.hoisted(() => ({ poiLayerProps: { current: null } }));

// ── Mock child components ──
vi.mock('./TerrainLayer.jsx', () => ({ default: () => <g data-testid="terrain-layer" /> }));
vi.mock('./HexGridLayer.jsx', () => ({ default: () => <g data-testid="hex-grid-layer" /> }));
vi.mock('./HexMapToolbar.jsx', () => ({
    default: ({ onBack, mapName, zoomIn, zoomOut, resetView, setTool }) =>
        <div data-testid="toolbar">
            <button data-testid="toolbar-back" onClick={onBack}>Back</button>
            <span data-testid="toolbar-name">{mapName}</span>
            <button data-testid="toolbar-zoomin" onClick={zoomIn}>+</button>
            <button data-testid="toolbar-zoomout" onClick={zoomOut}>-</button>
            <button data-testid="toolbar-resetview" onClick={resetView}>Reset</button>
            <button data-testid="tool-paint" onClick={() => setTool('paint')}>Paint</button>
        </div>,
}));
vi.mock('./POILayer.jsx', () => ({
    default: (props) => {
        poiLayerProps.current = props;
        return <g data-testid="poi-layer" />;
    },
}));
vi.mock('./POIPanel.jsx', () => ({ default: ({ onClose }) => <div data-testid="poi-panel"><button onClick={onClose}>Close</button></div> }));
vi.mock('./POIContextMenu.jsx', () => ({ default: ({ selectedPoi, onClose }) => selectedPoi ? <g data-testid="poi-context-menu"><text onClick={onClose}>Close</text></g> : null }));
vi.mock('./MarchingOrderPanel.jsx', () => ({ default: () => <div data-testid="marching-panel" /> }));
vi.mock('./PartyMarkerLayer.jsx', () => ({ default: ({ position }) => position ? <g data-testid="party-marker" /> : null }));
vi.mock('./RiverLayer.jsx', () => ({ default: () => <g data-testid="river-layer" /> }));
vi.mock('./RoadLayer.jsx', () => ({ default: () => <g data-testid="road-layer" /> }));
vi.mock('./TravelPathLayer.jsx', () => ({ default: () => <g data-testid="travel-path-layer" /> }));
vi.mock('./WeatherOverlay.jsx', () => ({ default: ({ weather }) => weather ? <div data-testid="weather-overlay" /> : null }));
vi.mock('./EventDialog.jsx', () => ({ default: ({ event, onAccept, onSkip, onReroll }) => event ? <div data-testid="event-dialog"><button data-testid="event-accept" onClick={onAccept}>Accept</button><button data-testid="event-skip" onClick={onSkip}>Skip</button><button data-testid="event-reroll" onClick={onReroll}>Reroll</button></div> : null }));
vi.mock('./TravelPanel.jsx', () => ({
    default: ({ isTravelActive, onAdvance, onForceCamp, onForcedMarch, onCancel, onChangePace, onToggleHorseback }) =>
        <div data-testid="travel-panel">
            {isTravelActive && <>
                <button data-testid="btn-advance" onClick={onAdvance}>Advance</button>
                <button data-testid="btn-camp" onClick={onForceCamp}>Camp</button>
                <button data-testid="btn-forced-march" onClick={onForcedMarch}>Forced March</button>
                <button data-testid="btn-cancel" onClick={onCancel}>Cancel</button>
                <button data-testid="btn-pace" onClick={onChangePace}>Change Pace</button>
                <button data-testid="btn-horseback" onClick={onToggleHorseback}>Horseback</button>
            </>}
        </div>,
}));

vi.mock('./svg/CampSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/CitySVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/DungeonSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/HazardSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/LandmarkSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/LoreSiteSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/NaturalWonderSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/SettlementSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('./svg/TowerSVG.jsx', () => ({ default: (props) => <g {...props} /> }));
vi.mock('../common/Subscriber.jsx', () => ({ default: () => <div data-testid="subscriber" /> }));

// ── Mock hooks and services ──
vi.mock('./hooks/useMapLoader.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/useZoomPan.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/useHexHover.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/useTerrainPainting.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/usePoiManagement.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/useTravelToolSync.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/useEncounterGeneration.js', () => ({ default: vi.fn() }));
vi.mock('./hooks/useHexMapSSESync.js', () => ({ default: vi.fn() }));
vi.mock('../../hooks/management/useTravelManagement.js', () => ({ default: vi.fn() }));
vi.mock('../../hooks/ui/useMonstersData.js', () => ({ useMonstersData: vi.fn() }));
vi.mock('../../hooks/runtime/useLog.js', () => ({ default: vi.fn() }));
vi.mock('../../hooks/runtime/useSSEEqualityGuard.js', () => ({ default: vi.fn((setter) => setter) }));
vi.mock('../../services/maps/mapsService.js', () => ({
    loadMaps: vi.fn(() => Promise.resolve({ maps: [] })),
    loadMapData: vi.fn(() => Promise.resolve({})),
    saveMapData: vi.fn(() => Promise.resolve({})),
    createMap: vi.fn(() => Promise.resolve({ name: 'test', alreadyExists: false })),
    formatMapName: vi.fn((name) => name || ''),
}));
vi.mock('../../services/campaign/weatherService.js', () => ({
    generateWeather: vi.fn(() => ({ condition: 'clear', label: 'Clear', icon: 'sun', moveCostMod: 1, budgetMod: 1, encounterMod: 0, description: 'Clear skies' })),
}));

import useMapLoader from './hooks/useMapLoader.js';
import useZoomPan from './hooks/useZoomPan.js';
import useHexHover from './hooks/useHexHover.js';
import useTerrainPainting from './hooks/useTerrainPainting.js';
import usePoiManagement from './hooks/usePoiManagement.js';
import useEncounterGeneration from './hooks/useEncounterGeneration.js';
import useHexMapSSESync from './hooks/useHexMapSSESync.js';
import useTravelManagement from '../../hooks/management/useTravelManagement.js';
import useLog from '../../hooks/runtime/useLog.js';
import { useMonstersData } from '../../hooks/ui/useMonstersData.js';
import * as mapsService from '../../services/maps/mapsService.js';
import { generateWeather } from '../../services/campaign/weatherService.js';
import HexMap from './HexMap.jsx';

function makeMapLoader(overrides = {}) {
    return {
        loading: false, setMapData: vi.fn(),
        gridSize: 30, setGridSize: vi.fn(),
        terrain: {}, setTerrain: vi.fn(),
        rivers: [], setRivers: vi.fn(),
        roads: [], setRoads: vi.fn(),
        pois: [], setPois: vi.fn(),
        marchingOrder: [], setMarchingOrder: vi.fn(),
        partyPosition: null, setPartyPosition: vi.fn(),
        weather: null, setWeather: vi.fn(),
        travelInit: null, setTravelInit: vi.fn(),
        setTravelStateRef: vi.fn(),
        zoom: 2, setZoom: vi.fn(),
        panX: 0, setPanX: vi.fn(),
        panY: 0, setPanY: vi.fn(),
        needsResetViewRef: { current: false },
        ...overrides,
    };
}

function makeZoomPan(overrides = {}) {
    return {
        svgWidth: 1039, svgHeight: 519,
        zoomIn: vi.fn(), zoomOut: vi.fn(), resetView: vi.fn(),
        clampPan: vi.fn((z, x, y) => ({ x, y })),
        centerView: vi.fn(() => ({ x: 0, y: 0 })),
        panning: false,
        handlePanStart: vi.fn(), handlePanMove: vi.fn(), handlePanEnd: vi.fn(),
        handleWheel: vi.fn(),
        ...overrides,
    };
}

function makeHexHover(overrides = {}) {
    return {
        hoveredHex: null, setHoveredHex: vi.fn(),
        getHexFromEvent: vi.fn(), handleHexHover: vi.fn(),
        ...overrides,
    };
}

function makePoiManagement(overrides = {}) {
    return {
        selectedPoiMenu: null, setSelectedPoiMenu: vi.fn(),
        showRename: null, setShowRename: vi.fn(),
        poiDragging: null, roadStartPoiId: null, setRoadStartPoiId: vi.fn(),
        handlePoiPointerDown: vi.fn(), handlePoiPointerMove: vi.fn(),
        handlePoiPointerUp: vi.fn(),
        handlePoiContextMenu: vi.fn(), handleTogglePoiVisibility: vi.fn(),
        handleDeletePoi: vi.fn(), handleRenamePoi: vi.fn(),
        handleLinkMap: vi.fn(), handleUnlinkMap: vi.fn(), handleRemoveRoads: vi.fn(),
        ...overrides,
    };
}

function makeTravelMgmt(overrides = {}) {
    return {
        travelMode: 'inactive', travelPace: 'normal',
        destination: null, path: [], pathIndex: 0,
        accruedCost: 0, dailyBudget: 4, dayExhausted: false,
        lastMessage: null, pendingEvent: null,
        eventFrequency: 'normal', rerollsRemaining: 3,
        currentPosition: null, remainingSteps: [],
        paceInfo: { id: 'normal', name: 'Normal' },
        hexesRemaining: 0, horseback: false, forcedMarchHours: 0,
        exhaustionMultiplier: 100, partyHasMaxExhaustion: false,
        isTravelActive: false,
        startPlanning: vi.fn(), cancelTravel: vi.fn(),
        setDestinationAndPath: vi.fn(), toggleHorseback: vi.fn(),
        changePace: vi.fn(), advanceOneHex: vi.fn(() => ({ moved: false })),
        forceCamp: vi.fn(), forcedMarch: vi.fn(),
        acceptEvent: vi.fn(), skipEvent: vi.fn(), rerollEvent: vi.fn(),
        setEventFrequency: vi.fn(), setTravelLog: vi.fn(), setLastMessage: vi.fn(),
        ...overrides,
    };
}

function setupDefaultMocks() {
    useMapLoader.mockReturnValue(makeMapLoader());
    useZoomPan.mockReturnValue(makeZoomPan());
    useHexHover.mockReturnValue(makeHexHover());
    useTerrainPainting.mockReturnValue({ handleTerrainPointerDown: vi.fn(), handleTerrainPointerMove: vi.fn(), handleTerrainPointerUp: vi.fn() });
    usePoiManagement.mockReturnValue(makePoiManagement());
    useEncounterGeneration.mockReturnValue({ generateMonsterPlacements: vi.fn(), handleStartEncounter: vi.fn() });
    useHexMapSSESync.mockReturnValue({ handleSSEEvent: vi.fn() });
    useMonstersData.mockReturnValue({ monsters: [], loading: false, error: null });
    useTravelManagement.mockReturnValue(makeTravelMgmt());
    useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry: vi.fn() });
    mapsService.formatMapName.mockImplementation((name) => name || '');
    // Linked maps are "valid" by default; tests opt into the failure path with
    // mockRejectedValue so the Promise.allSettled filter is exercised honestly.
    mapsService.loadMapData.mockImplementation(() => Promise.resolve({}));
}

/**
 * Renders HexMap with a pending event and an active travel session, then clicks
 * the dialog's Accept button. `acceptEvent` returns the same pendingEvent by
 * default. Returns `{ tm, addEntry }`.
 */
function renderEventAccept({ pendingEvent, travelOverrides = {}, mapOverrides = {}, encounter }) {
    const addEntry = vi.fn();
    const tm = makeTravelMgmt({
        isTravelActive: true,
        pendingEvent,
        acceptEvent: vi.fn(() => pendingEvent),
        currentPosition: { q: 10, r: 5 },
        ...travelOverrides,
    });
    useTravelManagement.mockReturnValue(tm);
    useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
    useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 10, r: 5 }, ...mapOverrides }));
    if (encounter) useEncounterGeneration.mockReturnValue(encounter);
    render(<HexMap campaignName="test" mapName="test-map" />);
    return { tm, addEntry };
}

describe('HexMap additional coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        poiLayerProps.current = null;
        setupDefaultMocks();
    });

    describe('Force camp handler', () => {
        it('forces camp, regenerates weather, and logs with the current position', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                forceCamp: vi.fn(),
                currentPosition: { q: 15, r: 8 },
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 10, r: 5 }, weather: { label: 'Clear' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('btn-camp'));
            expect(tm.forceCamp).toHaveBeenCalledTimes(1);
            expect(generateWeather).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'camp', hex: { q: 15, r: 8 }, weather: 'Clear',
            }));
        });

        it('falls back to partyPosition when travel has no currentPosition', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                forceCamp: vi.fn(),
                currentPosition: null,
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 20, r: 12 }, weather: { label: 'Storm' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('btn-camp'));
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'camp', hex: { q: 20, r: 12 }, weather: 'Storm',
            }));
        });
    });

    describe('Forced march handler', () => {
        it('forces a march and logs with the current position and weather', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                forcedMarch: vi.fn(),
                currentPosition: { q: 15, r: 8 },
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 10, r: 5 }, weather: { label: 'Storm' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('btn-forced-march'));
            expect(tm.forcedMarch).toHaveBeenCalledTimes(1);
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'forced_march', hex: { q: 15, r: 8 }, weather: 'Storm',
            }));
        });

        it('falls back to partyPosition when travel has no currentPosition', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                forcedMarch: vi.fn(),
                currentPosition: null,
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 20, r: 12 }, weather: { label: 'Rain' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('btn-forced-march'));
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'forced_march', hex: { q: 20, r: 12 }, weather: 'Rain',
            }));
        });
    });

    describe('POI enter handler', () => {
        function renderWithPoi({ linkedMap, onPoiEntered }) {
            useMapLoader.mockReturnValue(makeMapLoader({
                pois: [{ id: 'poi-1', q: 10, r: 5, type: 'dungeon', visible: true, ...(linkedMap ? { linkedMap } : {}) }],
            }));
            render(<HexMap campaignName="test" mapName="test-map" onPoiEntered={onPoiEntered} />);
        }

        it('calls onPoiEntered with the linked map name when the map is valid', async () => {
            const onPoiEntered = vi.fn();
            renderWithPoi({ linkedMap: 'dungeon-1', onPoiEntered });
            await vi.waitFor(() => {
                expect(poiLayerProps.current.validLinkedMaps.has('dungeon-1')).toBe(true);
            });
            poiLayerProps.current.onPoiEnter({ id: 'poi-1', linkedMap: 'dungeon-1' });
            expect(onPoiEntered).toHaveBeenCalledWith('dungeon-1');
        });

        it('does not call onPoiEntered when the linked map failed to load', async () => {
            const onPoiEntered = vi.fn();
            mapsService.loadMapData.mockRejectedValue(new Error('Map not found'));
            renderWithPoi({ linkedMap: 'missing', onPoiEntered });
            await vi.waitFor(() => {
                expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'missing');
            });
            expect(poiLayerProps.current.validLinkedMaps.has('missing')).toBe(false);
            poiLayerProps.current.onPoiEnter({ id: 'poi-1', linkedMap: 'missing' });
            expect(onPoiEntered).not.toHaveBeenCalled();
        });

        it('does not call onPoiEntered when the POI has no linked map', () => {
            const onPoiEntered = vi.fn();
            renderWithPoi({ linkedMap: null, onPoiEntered });
            poiLayerProps.current.onPoiEnter({ id: 'poi-1' });
            expect(onPoiEntered).not.toHaveBeenCalled();
        });

        it('does not call onPoiEntered when the callback is not provided', async () => {
            mapsService.loadMapData.mockRejectedValue(new Error('Map not found'));
            useMapLoader.mockReturnValue(makeMapLoader({
                pois: [{ id: 'poi-1', q: 10, r: 5, type: 'dungeon', visible: true, linkedMap: 'missing' }],
            }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            await vi.waitFor(() => {
                expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'missing');
            });
            // Should not throw even though onPoiEntered is undefined
            expect(() => poiLayerProps.current.onPoiEnter({ id: 'poi-1', linkedMap: 'missing' })).not.toThrow();
        });
    });

    describe('Linked map validation', () => {
        it('loads each unique linked map and exposes only the valid ones to the POI layer', async () => {
            const pois = [
                { id: 'poi-1', q: 10, r: 5, type: 'city', linkedMap: 'dungeon-1', visible: true },
                { id: 'poi-2', q: 20, r: 10, type: 'dungeon', linkedMap: 'dungeon-2', visible: true },
            ];
            useMapLoader.mockReturnValue(makeMapLoader({ pois }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            await vi.waitFor(() => {
                expect([...poiLayerProps.current.validLinkedMaps].sort()).toEqual(['dungeon-1', 'dungeon-2']);
            });
            expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'dungeon-1');
            expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'dungeon-2');
        });

        it('deduplicates linked maps when multiple POIs reference the same map', async () => {
            const pois = [
                { id: 'poi-1', q: 10, r: 5, type: 'city', linkedMap: 'dungeon-1', visible: true },
                { id: 'poi-2', q: 20, r: 10, type: 'dungeon', linkedMap: 'dungeon-1', visible: true },
            ];
            useMapLoader.mockReturnValue(makeMapLoader({ pois }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            await vi.waitFor(() => {
                expect([...poiLayerProps.current.validLinkedMaps]).toEqual(['dungeon-1']);
            });
            // Should only load the unique map once
            expect(mapsService.loadMapData).toHaveBeenCalledTimes(1);
            expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'dungeon-1');
        });

        it('excludes linked maps that fail to load', async () => {
            const pois = [
                { id: 'poi-1', q: 10, r: 5, type: 'city', linkedMap: 'dungeon-1', visible: true },
                { id: 'poi-2', q: 20, r: 10, type: 'dungeon', linkedMap: 'missing', visible: true },
            ];
            mapsService.loadMapData.mockImplementation((campaign, name) => {
                if (name === 'dungeon-1') return Promise.resolve({});
                return Promise.reject(new Error('Map not found'));
            });
            useMapLoader.mockReturnValue(makeMapLoader({ pois }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            await vi.waitFor(() => {
                expect([...poiLayerProps.current.validLinkedMaps]).toEqual(['dungeon-1']);
            });
            expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'dungeon-1');
            expect(mapsService.loadMapData).toHaveBeenCalledWith('test', 'missing');
        });

        it('passes an empty set when no POIs have linked maps', async () => {
            useMapLoader.mockReturnValue(makeMapLoader({
                pois: [{ id: 'poi-1', q: 10, r: 5, type: 'city', visible: true }],
            }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            await vi.waitFor(() => {
                expect(poiLayerProps.current.validLinkedMaps.size).toBe(0);
            });
            expect(mapsService.loadMapData).not.toHaveBeenCalled();
        });
    });

    describe('POI drop edge cases', () => {
        function dropOnMap({ dragData, getHexFromEvent, mapOverrides = {} }) {
            const dt = { getData: vi.fn(() => dragData) };
            const ml = makeMapLoader(mapOverrides);
            useHexHover.mockReturnValue(makeHexHover({ getHexFromEvent }));
            useMapLoader.mockReturnValue(ml);
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.drop(screen.getByTestId('hex-svg'), { dataTransfer: dt });
            return { dt, ml };
        }

        it.each([
            ['a negative column', { q: -1, r: 5 }],
            ['a negative row', { q: 10, r: -1 }],
            ['an out-of-range column', { q: 999, r: 5 }],
            ['an out-of-range row', { q: 10, r: 999 }],
            ['a null hex', null],
        ])('does not add a POI dropped on %s', (_label, dropHex) => {
            const { dt, ml } = dropOnMap({
                dragData: 'city',
                getHexFromEvent: vi.fn(() => dropHex),
            });
            expect(dt.getData).toHaveBeenCalledWith('text/plain');
            expect(ml.setPois).not.toHaveBeenCalled();
            expect(ml.setMarchingOrder).not.toHaveBeenCalled();
            expect(ml.setPartyPosition).not.toHaveBeenCalled();
        });

        it('adds a dropped character to the marching order and places the party at the drop hex', () => {
            const { dt, ml } = dropOnMap({
                dragData: 'character:Thorin',
                getHexFromEvent: vi.fn(() => ({ q: 10, r: 5 })),
                mapOverrides: { marchingOrder: ['Legolas'] },
            });
            expect(dt.getData).toHaveBeenCalledWith('text/plain');
            expect(ml.setMarchingOrder).toHaveBeenCalledTimes(1);
            expect(ml.setPartyPosition).toHaveBeenCalledTimes(1);
            expect(ml.setPois).not.toHaveBeenCalled();

            // Verify the marching order updater appends only when not already present
            const orderUpdater = ml.setMarchingOrder.mock.calls[0][0];
            expect(orderUpdater).toEqual(expect.any(Function));
            expect(orderUpdater(['Legolas'])).toEqual(['Legolas', 'Thorin']);
            // Duplicating a character should not add them again
            expect(orderUpdater(['Legolas', 'Thorin'])).toEqual(['Legolas', 'Thorin']);

            // Party should only be set when currently null
            const posUpdater = ml.setPartyPosition.mock.calls[0][0];
            expect(posUpdater(null)).toEqual({ q: 10, r: 5 });
            expect(posUpdater({ q: 3, r: 3 })).toEqual({ q: 3, r: 3 });
        });

        it('does not add a character that is already in the marching order', () => {
            const { ml } = dropOnMap({
                dragData: 'character:Legolas',
                getHexFromEvent: vi.fn(() => ({ q: 10, r: 5 })),
                mapOverrides: { marchingOrder: ['Legolas'] },
            });
            const orderUpdater = ml.setMarchingOrder.mock.calls[0][0];
            expect(orderUpdater(['Legolas'])).toEqual(['Legolas']);
        });

        it('does not add a POI when the drag data is not a recognized type', () => {
            const { ml } = dropOnMap({
                dragData: 'unknown-type',
                getHexFromEvent: vi.fn(() => ({ q: 10, r: 5 })),
            });
            expect(ml.setPois).not.toHaveBeenCalled();
            expect(ml.setMarchingOrder).not.toHaveBeenCalled();
        });
    });

    describe('Event acceptance', () => {
        it('starts a combat encounter with monster placements when monsters are specified', () => {
            const generateMonsterPlacements = vi.fn(() => [{ id: 'mon-1', name: 'goblin' }]);
            const handleStartEncounter = vi.fn();
            const pendingEvent = { type: 'combat', encounter: { monsters: [{ name: 'goblin', qty: 2 }] } };
            const { tm, addEntry } = renderEventAccept({
                pendingEvent,
                travelOverrides: { currentPosition: { q: 15, r: 8 } },
                mapOverrides: { partyPosition: { q: 15, r: 8 }, terrain: { '15,8': 'plains' } },
                encounter: { generateMonsterPlacements, handleStartEncounter },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(tm.acceptEvent).toHaveBeenCalled();
            expect(generateMonsterPlacements).toHaveBeenCalledWith([{ name: 'goblin', qty: 2 }], 30);
            expect(handleStartEncounter).toHaveBeenCalledWith(15, 8, [{ id: 'mon-1', name: 'goblin' }]);
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_accept', hex: { q: 15, r: 8 }, terrain: 'plains',
            }));
        });

        it('does not call handleStartEncounter when there is no position', () => {
            const handleStartEncounter = vi.fn();
            const { tm } = renderEventAccept({
                pendingEvent: { type: 'combat', encounter: { monsters: [{ name: 'goblin', qty: 1 }] } },
                travelOverrides: { currentPosition: null },
                mapOverrides: { partyPosition: null, terrain: {} },
                encounter: { generateMonsterPlacements: vi.fn(), handleStartEncounter },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(tm.acceptEvent).toHaveBeenCalled();
            expect(handleStartEncounter).not.toHaveBeenCalled();
        });

        it('regenerates weather and resumes pace for weather change during travel', () => {
            const { tm, addEntry } = renderEventAccept({
                pendingEvent: { type: 'weatherChange' },
                mapOverrides: { terrain: { '10,5': 'plains' } },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(generateWeather).toHaveBeenCalled();
            expect(tm.changePace).toHaveBeenCalledWith('normal');
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_accept', eventType: 'weatherChange',
            }));
        });

        it('regenerates weather but does not resume pace when travel is not active', () => {
            const { tm } = renderEventAccept({
                pendingEvent: { type: 'weatherChange' },
                travelOverrides: { isTravelActive: false },
                mapOverrides: { terrain: { '10,5': 'desert' } },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(generateWeather).toHaveBeenCalled();
            expect(tm.changePace).not.toHaveBeenCalled();
        });

        it('logs event acceptance with terrain and event type for a skirmish event', () => {
            const { addEntry } = renderEventAccept({
                pendingEvent: { type: 'skirmish' },
                travelOverrides: { isTravelActive: false },
                mapOverrides: { terrain: { '10,5': 'desert' } },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_accept', hex: { q: 10, r: 5 }, terrain: 'desert', eventType: 'skirmish',
            }));
        });
    });

    describe('Event skip handler', () => {
        it('skips the pending event and logs with the event details', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                pendingEvent: { type: 'skirmish', title: 'Goblin Ambush' },
                skipEvent: vi.fn(),
                currentPosition: { q: 12, r: 6 },
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 10, r: 5 }, weather: { label: 'Cloudy' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('event-skip'));
            expect(tm.skipEvent).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_skip', eventType: 'skirmish', eventTitle: 'Goblin Ambush',
            }));
        });

    });

    describe('Event reroll handler', () => {
        it('rerolls the pending event and logs with event details, position and weather', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                pendingEvent: { type: 'wild-magic', title: 'Wild Surge' },
                rerollEvent: vi.fn(),
                currentPosition: { q: 12, r: 6 },
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            useMapLoader.mockReturnValue(makeMapLoader({ partyPosition: { q: 10, r: 5 }, weather: { label: 'Fog' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('event-reroll'));
            expect(tm.rerollEvent).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_reroll', eventType: 'wild-magic', hex: { q: 12, r: 6 }, weather: 'Fog',
            }));
        });
    });



    describe('TravelPanel wiring', () => {
        it.each([true, false])('renders travel controls only while a session is active (isTravelActive=%s)', (isTravelActive) => {
            useTravelManagement.mockReturnValue(makeTravelMgmt({ isTravelActive }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            const advanceBtn = screen.queryByTestId('btn-advance');
            const campBtn = screen.queryByTestId('btn-camp');
            if (isTravelActive) {
                expect(advanceBtn).toBeInTheDocument();
                expect(campBtn).toBeInTheDocument();
            } else {
                expect(advanceBtn).not.toBeInTheDocument();
                expect(campBtn).not.toBeInTheDocument();
            }
        });
    });

    describe('Event dialog visibility', () => {
        it('renders the event dialog when there is a pending event', () => {
            const tm = makeTravelMgmt({
                isTravelActive: true,
                pendingEvent: { type: 'skirmish', title: 'Goblin Ambush' },
            });
            useTravelManagement.mockReturnValue(tm);
            render(<HexMap campaignName="test" mapName="test-map" />);
            expect(screen.getByTestId('event-dialog')).toBeInTheDocument();
        });

        it('does not render the event dialog when there is no pending event', () => {
            useTravelManagement.mockReturnValue(makeTravelMgmt({ isTravelActive: true, pendingEvent: null }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            expect(screen.queryByTestId('event-dialog')).not.toBeInTheDocument();
        });
    });

    describe('Weather overlay visibility', () => {
        it('renders the weather overlay when weather is set', () => {
            useMapLoader.mockReturnValue(makeMapLoader({ weather: { label: 'Rain', icon: 'cloud-rain' } }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            expect(screen.getByTestId('weather-overlay')).toBeInTheDocument();
        });

        it('does not render the weather overlay when weather is null', () => {
            render(<HexMap campaignName="test" mapName="test-map" />);
            expect(screen.queryByTestId('weather-overlay')).not.toBeInTheDocument();
        });
    });

});

// @cleaned-by-ai

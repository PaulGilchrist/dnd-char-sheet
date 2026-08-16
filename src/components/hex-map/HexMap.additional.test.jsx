// @improved-by-ai
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

// Props of the mocked child components, captured on every render so tests can
// drive handlers that live inside HexMap and inspect values it forwards.
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

const MODES = { INACTIVE: 'inactive', PLANNING: 'planning', TRAVELING: 'traveling', PAUSED: 'paused' };

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
        MODES,
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
 * default (matching how the component reads `evt`). Returns `{ tm, addEntry }`.
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
        it('forces camp, regenerates weather, and logs the camp with the party location', () => {
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
    });

    describe('POI enter handler', () => {
        function renderWithPoi({ linkedMap, onPoiEntered }) {
            useMapLoader.mockReturnValue(makeMapLoader({
                pois: [{ id: 'poi-1', q: 10, r: 5, type: 'dungeon', visible: true, ...(linkedMap ? { linkedMap } : {}) }],
            }));
            render(<HexMap campaignName="test" mapName="test-map" onPoiEntered={onPoiEntered} />);
        }

        it('enters a POI whose linked map was validated', async () => {
            const onPoiEntered = vi.fn();
            renderWithPoi({ linkedMap: 'dungeon-1', onPoiEntered });
            await vi.waitFor(() => {
                expect(poiLayerProps.current.validLinkedMaps.has('dungeon-1')).toBe(true);
            });
            poiLayerProps.current.onPoiEnter({ id: 'poi-1', linkedMap: 'dungeon-1' });
            expect(onPoiEntered).toHaveBeenCalledWith('dungeon-1');
        });

        it('does not enter a POI whose linked map failed to load', async () => {
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

        it('does not enter a POI without a linked map', () => {
            const onPoiEntered = vi.fn();
            renderWithPoi({ linkedMap: null, onPoiEntered });
            poiLayerProps.current.onPoiEnter({ id: 'poi-1' });
            expect(onPoiEntered).not.toHaveBeenCalled();
        });

        it('does not crash when no onPoiEntered handler is provided', async () => {
            renderWithPoi({ linkedMap: 'dungeon-1', onPoiEntered: undefined });
            await vi.waitFor(() => {
                expect(poiLayerProps.current.validLinkedMaps.has('dungeon-1')).toBe(true);
            });
            expect(() => poiLayerProps.current.onPoiEnter({ id: 'poi-1', linkedMap: 'dungeon-1' })).not.toThrow();
        });
    });

    describe('Linked map validation', () => {
        it('loads each linked map and exposes only the valid ones to the POI layer', async () => {
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
    });

    describe('POI drop edge cases', () => {
        function drop(ml, hh, dragData) {
            useHexHover.mockReturnValue(hh);
            useMapLoader.mockReturnValue(ml);
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.drop(document.querySelector('.hex-svg'), { dataTransfer: { getData: () => dragData } });
        }

        it.each([
            ['drag data that is not a POI type', 'invalid-type'],
            ['empty drag data', ''],
        ])('does not add a POI for %s', (_label, dragData) => {
            const ml = makeMapLoader();
            drop(ml, makeHexHover({ getHexFromEvent: vi.fn(() => ({ q: 10, r: 5 })) }), dragData);
            expect(ml.setPois).not.toHaveBeenCalled();
        });

        it.each([
            ['a negative column', { q: -1, r: 5 }],
            ['a negative row', { q: 10, r: -1 }],
            ['an out-of-range column', { q: 999, r: 5 }],
            ['an out-of-range row', { q: 10, r: 999 }],
        ])('does not add a POI dropped on %s', (_label, dropHex) => {
            const ml = makeMapLoader();
            drop(ml, makeHexHover({ getHexFromEvent: vi.fn(() => dropHex) }), 'city');
            expect(ml.setPois).not.toHaveBeenCalled();
        });

        it('does not add a POI when the drop does not resolve to a hex', () => {
            const ml = makeMapLoader();
            drop(ml, makeHexHover({ getHexFromEvent: vi.fn(() => null) }), 'city');
            expect(ml.setPois).not.toHaveBeenCalled();
        });

        it('adds a dropped character to the marching order and places the party at the drop hex', () => {
            const ml = makeMapLoader({ marchingOrder: ['Legolas'] });
            drop(ml, makeHexHover({ getHexFromEvent: vi.fn(() => ({ q: 10, r: 5 })) }), 'character:Thorin');

            const orderUpdater = ml.setMarchingOrder.mock.calls[0][0];
            expect(orderUpdater).toEqual(expect.any(Function));
            expect(orderUpdater(['Legolas'])).toEqual(['Legolas', 'Thorin']);
            expect(orderUpdater(['Legolas', 'Thorin'])).toEqual(['Legolas', 'Thorin']);

            const posUpdater = ml.setPartyPosition.mock.calls[0][0];
            expect(posUpdater(null)).toEqual({ q: 10, r: 5 });
            expect(posUpdater({ q: 3, r: 3 })).toEqual({ q: 3, r: 3 });

            expect(ml.setPois).not.toHaveBeenCalled();
        });
    });

    describe('Event acceptance', () => {
        it('starts an encounter with generated monster placements for a combat event', () => {
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

        it('starts an encounter without monster placements when a combat event has no monster list', () => {
            const handleStartEncounter = vi.fn();
            const { addEntry } = renderEventAccept({
                pendingEvent: { type: 'combat' },
                encounter: { generateMonsterPlacements: vi.fn(), handleStartEncounter },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(handleStartEncounter).toHaveBeenCalledWith(10, 5);
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_accept', hex: { q: 10, r: 5 }, terrain: 'plains',
            }));
        });

        it('regenerates weather and resumes the current pace for a weather change event', () => {
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

        it('logs event acceptance when no travel session is active', () => {
            const { tm, addEntry } = renderEventAccept({
                pendingEvent: { type: 'skirmish' },
                travelOverrides: { isTravelActive: false },
                mapOverrides: { terrain: { '10,5': 'desert' } },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(tm.acceptEvent).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_accept', hex: { q: 10, r: 5 }, terrain: 'desert', eventType: 'skirmish',
            }));
        });

        it('does not resume the pace when a weather change event is accepted outside travel', () => {
            const { tm } = renderEventAccept({
                pendingEvent: { type: 'weatherChange' },
                travelOverrides: { isTravelActive: false },
            });
            fireEvent.click(screen.getByTestId('event-accept'));
            expect(generateWeather).toHaveBeenCalled();
            expect(tm.changePace).not.toHaveBeenCalled();
        });

        describe('with no party position', () => {
            it('does not start an encounter for a combat event', () => {
                const handleStartEncounter = vi.fn();
                const generateMonsterPlacements = vi.fn();
                const { tm, addEntry } = renderEventAccept({
                    pendingEvent: { type: 'combat', encounter: { monsters: [{ name: 'goblin', qty: 2 }] } },
                    travelOverrides: { currentPosition: null },
                    mapOverrides: { partyPosition: null },
                    encounter: { generateMonsterPlacements, handleStartEncounter },
                });
                fireEvent.click(screen.getByTestId('event-accept'));
                expect(tm.acceptEvent).toHaveBeenCalled();
                expect(generateMonsterPlacements).not.toHaveBeenCalled();
                expect(handleStartEncounter).not.toHaveBeenCalled();
                expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                    action: 'event_accept', hex: null,
                }));
            });

            it('logs event acceptance without crashing for a non-combat event', () => {
                const { tm, addEntry } = renderEventAccept({
                    pendingEvent: { type: 'skirmish' },
                    travelOverrides: { currentPosition: null },
                    mapOverrides: { partyPosition: null },
                });
                fireEvent.click(screen.getByTestId('event-accept'));
                expect(tm.acceptEvent).toHaveBeenCalled();
                expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                    action: 'event_accept', hex: null,
                }));
            });
        });
    });

    describe('Event skip handler', () => {
        it('skips the pending event and logs the skip with the event details', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                pendingEvent: { type: 'skirmish', title: 'Goblin Ambush' },
                skipEvent: vi.fn(),
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('event-skip'));
            expect(tm.skipEvent).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_skip', eventType: 'skirmish', eventTitle: 'Goblin Ambush',
            }));
        });
    });

    describe('Event reroll handler', () => {
        it('rerolls the pending event and logs the reroll with the event details', () => {
            const addEntry = vi.fn();
            const tm = makeTravelMgmt({
                isTravelActive: true,
                pendingEvent: { type: 'wild-magic', title: 'Wild Surge' },
                rerollEvent: vi.fn(),
            });
            useTravelManagement.mockReturnValue(tm);
            useLog.mockReturnValue({ logEntries: [], initialized: true, addEntry });
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('event-reroll'));
            expect(tm.rerollEvent).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
                action: 'event_reroll', eventType: 'wild-magic',
            }));
        });
    });

    describe('Forced march handler', () => {
        it('forces a march and logs the forced_march action with the current weather', () => {
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
                action: 'forced_march', weather: 'Storm',
            }));
        });
    });

    describe('SVG cursor style', () => {
        it('shows a grabbing cursor while panning', () => {
            useZoomPan.mockReturnValue(makeZoomPan({ panning: true }));
            render(<HexMap campaignName="test" mapName="test-map" />);
            expect(document.querySelector('.hex-svg')).toHaveStyle({ cursor: 'grabbing' });
        });

        it('shows a grab cursor by default', () => {
            render(<HexMap campaignName="test" mapName="test-map" />);
            expect(document.querySelector('.hex-svg')).toHaveStyle({ cursor: 'grab' });
        });

        it('shows a crosshair cursor when a drawing tool is active', () => {
            render(<HexMap campaignName="test" mapName="test-map" />);
            fireEvent.click(screen.getByTestId('tool-paint'));
            expect(document.querySelector('.hex-svg')).toHaveStyle({ cursor: 'crosshair' });
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
});

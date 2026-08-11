import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSseEventHandler } from './initiative-sse-handlers.jsx';
import * as combatData from '../../services/encounters/combatData.js';
import * as expirations from '../../services/rules/effects/expirations.js';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
    getRuntimeValue: vi.fn(),
}));
vi.mock('../../services/encounters/combatData.js', () => ({
    getActiveCreatureName: vi.fn(() => null),
    getCombatSummary: vi.fn(() => null),
    setCombatSummaryCache: vi.fn(),
}));
vi.mock('../../services/rules/effects/expirations.js', () => ({
    expireStaleEffects: vi.fn(),
    applyTurnStartEffects: vi.fn(),
}));

describe('createSseEventHandler', () => {
    let handler;
    let refs;
    let mocks;

    const campaignName = 'test-campaign';
    const characters = [
        { name: 'Alice', computedStats: { hitPoints: 20 } },
        { name: 'Bob', computedStats: { hitPoints: 15 } },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        refs = {
            combatSummaryRef: { current: { round: 1, creatures: [{ name: 'Alice', type: 'player' }] } },
            activeCreatureNameRef: { current: 'Alice' },
            lastAppliedTurnStartCreatureRef: { current: null },
        };

        mocks = {
            setCombatSummary: vi.fn(),
            setCombatSummaryG: vi.fn(),
            setActiveCreatureNameG: vi.fn(),
            setRuntimeStateTick: vi.fn(),
            handleOverlayEvent: vi.fn(),
        };

        handler = createSseEventHandler({
            campaignName,
            characters,
            combatSummaryRef: refs.combatSummaryRef,
            activeCreatureNameRef: refs.activeCreatureNameRef,
            lastAppliedTurnStartCreatureRef: refs.lastAppliedTurnStartCreatureRef,
            setCombatSummary: mocks.setCombatSummary,
            setCombatSummaryG: mocks.setCombatSummaryG,
            setActiveCreatureNameG: mocks.setActiveCreatureNameG,
            setRuntimeStateTick: mocks.setRuntimeStateTick,
            handleOverlayEvent: mocks.handleOverlayEvent,
        });
    });

    // ---- Early returns / routing ----

    describe('early returns', () => {
        it('should return early when event.key is null', () => {
            handler({ key: null, data: null });
            expect(mocks.setCombatSummary).not.toHaveBeenCalled();
        });

        it('should return early when event.data is null', () => {
            handler({ key: 'change-test-campaign-something', data: null });
            expect(mocks.setCombatSummary).not.toHaveBeenCalled();
        });

        it('should delegate spell-overlay events to handleOverlayEvent and return', () => {
            const overlayEvent = { key: 'spell-overlay-test-campaign', data: { action: 'clear' } };
            handler(overlayEvent);
            expect(mocks.handleOverlayEvent).toHaveBeenCalledWith(overlayEvent);
        });

        it('should ignore non-matching campaign prefix', () => {
            handler({ key: 'change-other-campaign-combatSummary', data: { creatures: [] } });
            expect(mocks.setCombatSummary).not.toHaveBeenCalled();
        });
    });

    // ---- combatSummary handling ----

    describe('combatSummary dataKey', () => {
        const baseCombatSummary = { round: 2, creatures: [{ name: 'Alice', type: 'player' }] };

        it('should skip when event.data has no creatures', () => {
            handler({ key: 'change-test-campaign-combatSummary', data: { round: 2 } });
            expect(mocks.setCombatSummaryG).not.toHaveBeenCalled();
        });

        it('should process a valid combatSummary event', () => {
            handler({ key: 'change-test-campaign-combatSummary', data: baseCombatSummary });
            expect(mocks.setCombatSummaryG).toHaveBeenCalledWith(
                expect.objectContaining({ round: 2, creatures: [{ name: 'Alice', type: 'player' }] }),
            );
        });

        it('should fill in activeCreatureName from getActiveCreatureName when missing', () => {
            combatData.getActiveCreatureName.mockReturnValue('Bob');
            const data = { round: 2, creatures: [{ name: 'Alice', type: 'player' }] };
            handler({ key: 'change-test-campaign-combatSummary', data });
            expect(mocks.setCombatSummaryG).toHaveBeenCalledWith(
                expect.objectContaining({ activeCreatureName: 'Bob' }),
            );
        });

        it('should skip when merged.round < prevRound (round regression)', () => {
            refs.combatSummaryRef.current = { round: 5, creatures: [] };
            handler({ key: 'change-test-campaign-combatSummary', data: { round: 3, creatures: [] } });
            expect(mocks.setCombatSummaryG).not.toHaveBeenCalled();
        });

        it('should NOT call expireStaleEffects in combatSummary path (round check is dead code after ref assignment)', () => {
            refs.combatSummaryRef.current = { round: 1, creatures: [] };
            handler({ key: 'change-test-campaign-combatSummary', data: { round: 2, creatures: [], activeCreatureName: 'Alice' } });
            // Line 85 sets combatSummaryRef.current = merged, so line 88 comparison is always false
            expect(expirations.expireStaleEffects).not.toHaveBeenCalled();
        });

        it('should call setCombatSummaryCache', () => {
            handler({ key: 'change-test-campaign-combatSummary', data: baseCombatSummary });
            expect(combatData.setCombatSummaryCache).toHaveBeenCalled();
        });

        it('should skip expireStaleEffects when round does not change', () => {
            refs.combatSummaryRef.current = { round: 2, creatures: [] };
            handler({ key: 'change-test-campaign-combatSummary', data: { round: 2, creatures: [], activeCreatureName: 'Alice' } });
            expect(expirations.expireStaleEffects).not.toHaveBeenCalled();
        });

        it('should use combatSummaryRef.current.round default of 1 when ref is undefined', () => {
            refs.combatSummaryRef.current = undefined;
            handler({ key: 'change-test-campaign-combatSummary', data: { round: 0, creatures: [] } });
            // round 0 < 1 (default), so should skip
            expect(mocks.setCombatSummaryG).not.toHaveBeenCalled();
        });
    });

    // ---- lastAttack dataKey ----

    describe('lastAttack dataKey', () => {
        it('should do nothing for lastAttack events', () => {
            handler({ key: 'change-test-campaign-lastAttack', data: { attackerName: 'Goblin' } });
            expect(mocks.setCombatSummary).not.toHaveBeenCalled();
            expect(mocks.setRuntimeStateTick).not.toHaveBeenCalled();
        });
    });

    // ---- activeCreatureName dataKey ----

    describe('activeCreatureName dataKey', () => {
        beforeEach(() => {
            refs.combatSummaryRef.current = { round: 1, creatures: [{ name: 'Alice', type: 'player' }], activeCreatureName: 'Alice' };
        });

        it('should update refs and state when active creature changes', () => {
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(refs.activeCreatureNameRef.current).toBe('Bob');
            expect(mocks.setActiveCreatureNameG).toHaveBeenCalledWith('Bob');
        });

        it('should call expireStaleEffects with the new active creature', () => {
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(expirations.expireStaleEffects).toHaveBeenCalledWith(
                'test-campaign', 'Bob',
            );
        });

        it('should update combatSummary cache', () => {
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(combatData.setCombatSummaryCache).toHaveBeenCalled();
        });

        it('should apply turn-start effects when creature actually changes', () => {
            refs.lastAppliedTurnStartCreatureRef.current = null;
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(expirations.applyTurnStartEffects).toHaveBeenCalled();
            expect(mocks.setRuntimeStateTick).toHaveBeenCalled();
        });

        it('should NOT apply turn-start effects when prevActive === event.data', () => {
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Alice' });
            expect(expirations.applyTurnStartEffects).not.toHaveBeenCalled();
        });

        it('should NOT apply turn-start effects when lastApplied === event.data', () => {
            refs.lastAppliedTurnStartCreatureRef.current = 'Bob';
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(expirations.applyTurnStartEffects).not.toHaveBeenCalled();
        });

        it('should update lastAppliedTurnStartCreature in runtime store when applying', () => {
            refs.lastAppliedTurnStartCreatureRef.current = null;
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                '__initiative__', 'lastAppliedTurnStartCreature', 'Bob', 'test-campaign',
            );
        });

        it('should update combatSummary.lastAppliedTurnStartCreature when different', () => {
            refs.lastAppliedTurnStartCreatureRef.current = null;
            refs.combatSummaryRef.current = { round: 1, creatures: [], lastAppliedTurnStartCreature: 'Alice' };
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(mocks.setCombatSummary).toHaveBeenCalled();
        });

        it('should NOT update combatSummary when lastApplied already equals event.data', () => {
            refs.combatSummaryRef.current = { round: 1, creatures: [], lastAppliedTurnStartCreature: 'Bob' };
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(mocks.setCombatSummary).not.toHaveBeenCalled();
        });

        it('should look up character by name with suffix matching', () => {
            refs.lastAppliedTurnStartCreatureRef.current = null;
            refs.combatSummaryRef.current = { round: 1, creatures: [] };
            refs.activeCreatureNameRef.current = 'Charlie';
            const chars = [{ name: 'Alice (Druid)', computedStats: { turnStartEffects: [] } }];
            handler = createSseEventHandler({
                campaignName,
                characters: chars,
                combatSummaryRef: refs.combatSummaryRef,
                activeCreatureNameRef: refs.activeCreatureNameRef,
                lastAppliedTurnStartCreatureRef: refs.lastAppliedTurnStartCreatureRef,
                setCombatSummary: mocks.setCombatSummary,
                setCombatSummaryG: mocks.setCombatSummaryG,
                setActiveCreatureNameG: mocks.setActiveCreatureNameG,
                setRuntimeStateTick: mocks.setRuntimeStateTick,
                handleOverlayEvent: mocks.handleOverlayEvent,
            });
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Alice' });
            expect(expirations.applyTurnStartEffects).toHaveBeenCalledWith(
                'Alice', expect.anything(), 'test-campaign', expect.any(Array),
            );
        });

        it('should pass undefined computedStats when character not found', () => {
            refs.lastAppliedTurnStartCreatureRef.current = null;
            refs.combatSummaryRef.current = { round: 1, creatures: [] };
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Unknown' });
            expect(expirations.applyTurnStartEffects).toHaveBeenCalledWith(
                'Unknown', undefined, 'test-campaign', characters,
            );
        });

        it('should get combatSummary from getCombatSummary when ref is null', () => {
            refs.combatSummaryRef.current = null;
            combatData.getCombatSummary.mockReturnValue({
                round: 1, creatures: [], activeCreatureName: 'Bob',
            });
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(combatData.getCombatSummary).toHaveBeenCalledWith('test-campaign');
        });

        it('should skip combatSummary update when cs is null from ref and getCombatSummary', () => {
            refs.combatSummaryRef.current = null;
            combatData.getCombatSummary.mockReturnValue(null);
            // With cs being null, the cs check at line 98 fails, so setActiveCreatureNameG still runs
            // but no cache update or expireStaleEffects from the cs branch
            handler({ key: 'change-test-campaign-activeCreatureName', data: 'Bob' });
            expect(mocks.setActiveCreatureNameG).toHaveBeenCalledWith('Bob');
        });
    });

    // ---- Character-level dataKey changes ----

    describe('character-level dataKey changes', () => {
        it('should trigger re-render tick for unknown dataKeys', () => {
            handler({ key: 'change-test-campaign-someCharacterKey', data: { foo: 'bar' } });
            expect(mocks.setRuntimeStateTick).toHaveBeenCalled();
        });

        it('should NOT trigger tick for log dataKey', () => {
            handler({ key: 'change-test-campaign-log', data: [] });
            expect(mocks.setRuntimeStateTick).not.toHaveBeenCalled();
        });

        it('should NOT trigger tick for spell-overlay dataKey', () => {
            handler({ key: 'change-test-campaign-spell-overlay', data: {} });
            expect(mocks.setRuntimeStateTick).not.toHaveBeenCalled();
        });
    });
});

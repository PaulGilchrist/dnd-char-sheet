import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNextCreatureHandler, createPreviousCreatureHandler } from './initiative-navigation.jsx';
import * as initiativeService from '../../services/encounters/initiativeService.js';
import * as unbreakableMajesty from '../../services/combat/auras/unbreakableMajesty.js';
import * as expirations from '../../services/rules/effects/expirations.js';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import storage from '../../services/ui/storage.js';

vi.mock('../../services/encounters/initiativeService.js', () => ({
    getNextCreatureName: vi.fn(),
    getPreviousCreatureName: vi.fn(),
}));

vi.mock('../../services/combat/auras/unbreakableMajesty.js', () => ({
    clearPerRoundMajestyTrackers: vi.fn(),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
    expireStaleEffects: vi.fn(),
    applyTurnStartEffects: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/ui/storage.js', () => ({
    default: {
        get: vi.fn(),
        set: vi.fn(),
        getProperty: vi.fn(),
        setProperty: vi.fn(),
    },
}));

describe('initiative-navigation.jsx', () => {
    const campaignName = 'test-campaign';

    const baseCombatSummary = {
        round: 1,
        creatures: [
            { name: 'Alice', type: 'player' },
            { name: 'Bob', type: 'player' },
            { name: 'Charlie', type: 'player' },
        ],
    };

    const baseCharacters = [
        { name: 'Alice', computedStats: { hitPoints: 20 } },
        { name: 'Bob', computedStats: { hitPoints: 15 } },
        { name: 'Charlie', computedStats: { hitPoints: 18 } },
    ];

    let combatSummaryRef;
    let roundRef;
    let lastAppliedTurnStartCreatureRef;
    let setCombatSummary;
    let setActiveCreatureName;
    let setRuntimeStateTick;

    beforeEach(() => {
        vi.clearAllMocks();
        combatSummaryRef = { current: { ...baseCombatSummary } };
        roundRef = { current: 1 };
        lastAppliedTurnStartCreatureRef = { current: null };
        setCombatSummary = vi.fn();
        setActiveCreatureName = vi.fn();
        setRuntimeStateTick = vi.fn((fn) => {
            if (typeof fn === 'function') {
                return fn(0);
            }
            return fn;
        });
    });

    describe('createNextCreatureHandler', () => {
        it('should return early when combatSummary is null', () => {
            const handler = createNextCreatureHandler({
                combatSummaryRef: { current: null },
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(storage.set).not.toHaveBeenCalled();
            expect(setActiveCreatureName).not.toHaveBeenCalled();
        });

        it('should set next creature without round increment when not at last creature', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundIncrement: false,
            });

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(storage.set).toHaveBeenCalledWith('activeCreatureName', 'Bob', campaignName);
            expect(setActiveCreatureName).toHaveBeenCalledWith('Bob');
            expect(setCombatSummary).not.toHaveBeenCalled();
        });

        it('should increment round when moving from last creature to first', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundIncrement: true,
            });

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(roundRef.current).toBe(1);
            expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.objectContaining({ round: 2 }), campaignName);
            expect(setCombatSummary).toHaveBeenCalledWith(expect.objectContaining({ round: 2 }));
            expect(storage.set).toHaveBeenCalledWith('activeCreatureName', 'Alice', campaignName);
            expect(setActiveCreatureName).toHaveBeenCalledWith('Alice');
        });

        it('should reset player runtime values on round increment', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundIncrement: true,
            });

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_cunningStrikeCostUsed', 0, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_CunningStrike_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_Charge_Attack_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_FastHands_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_CunningAction_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_Cleave_UsedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_Nick_UsedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'surgeUsedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'illusoryRealityUsedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'portentUsedThisTurn', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'psionicStrikeUsedThisTurn', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_BrutalStrike_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_fortifiedHealth_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', '_Shield_Bash_usedRound', null, campaignName);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'piercerPunctureUsedThisTurn', null, campaignName);
        });

        it('should call clearPerRoundMajestyTrackers for each creature on round increment', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundIncrement: true,
            });

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).toHaveBeenCalledWith('Alice', campaignName);
            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).toHaveBeenCalledWith('Bob', campaignName);
            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).toHaveBeenCalledWith('Charlie', campaignName);
        });

        it('should NOT reset player runtime values when there is no round increment', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundIncrement: false,
            });

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith('Alice', '_cunningStrikeCostUsed', 0, campaignName);
            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).not.toHaveBeenCalled();
            expect(expirations.expireStaleEffects).not.toHaveBeenCalled();
        });

        it('should apply turn start effects when lastApplied creature differs', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundIncrement: true,
            });
            lastAppliedTurnStartCreatureRef.current = 'Alice';

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(expirations.expireStaleEffects).toHaveBeenCalledWith(campaignName, 'Bob');
            expect(lastAppliedTurnStartCreatureRef.current).toBe('Bob');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('__initiative__', 'lastAppliedTurnStartCreature', 'Bob', campaignName);
            expect(storage.set).toHaveBeenCalledWith('lastAppliedTurnStartCreature', 'Bob', campaignName);
            expect(expirations.applyTurnStartEffects).toHaveBeenCalledWith('Bob', expect.any(Object), campaignName, baseCharacters);
            expect(setRuntimeStateTick).toHaveBeenCalled();
        });

        it('should NOT apply turn start effects when lastApplied creature matches new active', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundIncrement: true,
            });
            lastAppliedTurnStartCreatureRef.current = 'Alice';

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(expirations.expireStaleEffects).toHaveBeenCalledWith(campaignName, 'Alice');
            expect(lastAppliedTurnStartCreatureRef.current).toBe('Alice');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith('__initiative__', 'lastAppliedTurnStartCreature', 'Alice', campaignName);
            expect(storage.set).not.toHaveBeenCalledWith('lastAppliedTurnStartCreature', 'Alice', campaignName);
            expect(expirations.applyTurnStartEffects).not.toHaveBeenCalled();
            expect(setRuntimeStateTick).not.toHaveBeenCalled();
        });

        it('should use roundRef.current ?? 1 when roundRef is null', () => {
            roundRef.current = null;
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundIncrement: true,
            });

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.objectContaining({ round: 2 }), campaignName);
        });

        it('should find character by name prefix for turn start effects', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Bear',
                roundIncrement: true,
            });
            lastAppliedTurnStartCreatureRef.current = null;

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: [
                    { name: 'Alice', computedStats: { hitPoints: 20 } },
                    { name: 'Bob', computedStats: { hitPoints: 15 } },
                ],
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            // Should find the character and pass computedStats
            expect(expirations.applyTurnStartEffects).toHaveBeenCalledWith(
                'Bear',
                undefined,
                campaignName,
                expect.any(Array)
            );
        });

        it('should update combatSummary.lastAppliedTurnStartCreature when different', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundIncrement: true,
            });
            const updatedSummary = { ...baseCombatSummary, lastAppliedTurnStartCreature: 'Alice' };
            combatSummaryRef.current = updatedSummary;

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            expect(setCombatSummary).toHaveBeenCalledWith(expect.objectContaining({
                lastAppliedTurnStartCreature: 'Bob',
            }));
        });

        it('should NOT call setCombatSummary for lastAppliedTurnStartCreature when it already matches', () => {
            initiativeService.getNextCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundIncrement: true,
            });
            const updatedSummary = { ...baseCombatSummary, lastAppliedTurnStartCreature: 'Bob' };
            combatSummaryRef.current = updatedSummary;
            lastAppliedTurnStartCreatureRef.current = 'Alice';

            const handler = createNextCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Charlie',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
            });

            handler();

            // Should only be called once (for the round update), not again for lastApplied
            expect(setCombatSummary).toHaveBeenCalledTimes(1);
        });
    });

    describe('createPreviousCreatureHandler', () => {
        it('should return early when isPreviousDisabled is true', () => {
            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: true,
            });

            handler();

            expect(storage.set).not.toHaveBeenCalled();
            expect(setActiveCreatureName).not.toHaveBeenCalled();
        });

        it('should return early when combatSummary is null', () => {
            const handler = createPreviousCreatureHandler({
                combatSummaryRef: { current: null },
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(storage.set).not.toHaveBeenCalled();
            expect(setActiveCreatureName).not.toHaveBeenCalled();
        });

        it('should set previous creature without round decrement when not at first creature', () => {
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundDecrement: false,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Bob',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(storage.set).toHaveBeenCalledWith('activeCreatureName', 'Alice', campaignName);
            expect(setActiveCreatureName).toHaveBeenCalledWith('Alice');
            expect(setCombatSummary).not.toHaveBeenCalled();
        });

        it('should decrement round when moving from first to last creature', () => {
            roundRef.current = 3;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Charlie',
                roundDecrement: true,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.objectContaining({ round: 2 }), campaignName);
            expect(setCombatSummary).toHaveBeenCalledWith(expect.objectContaining({ round: 2 }));
            expect(storage.set).toHaveBeenCalledWith('activeCreatureName', 'Charlie', campaignName);
            expect(setActiveCreatureName).toHaveBeenCalledWith('Charlie');
        });

        it('should NOT decrement round when currentRound is 1', () => {
            roundRef.current = 1;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Charlie',
                roundDecrement: true,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(storage.set).not.toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
            expect(setCombatSummary).not.toHaveBeenCalled();
        });

        it('should call expireStaleEffects on round decrement', () => {
            roundRef.current = 2;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Charlie',
                roundDecrement: true,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(expirations.expireStaleEffects).toHaveBeenCalledWith(campaignName, 'Charlie');
        });

        it('should apply turn start effects when lastApplied creature differs on previous', () => {
            roundRef.current = 2;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundDecrement: true,
            });
            lastAppliedTurnStartCreatureRef.current = 'Alice';

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(lastAppliedTurnStartCreatureRef.current).toBe('Bob');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('__initiative__', 'lastAppliedTurnStartCreature', 'Bob', campaignName);
            expect(storage.set).toHaveBeenCalledWith('lastAppliedTurnStartCreature', 'Bob', campaignName);
            expect(expirations.applyTurnStartEffects).toHaveBeenCalledWith('Bob', expect.any(Object), campaignName, baseCharacters);
            expect(setRuntimeStateTick).toHaveBeenCalled();
        });

        it('should NOT apply turn start effects when lastApplied matches on previous', () => {
            roundRef.current = 2;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundDecrement: true,
            });
            lastAppliedTurnStartCreatureRef.current = 'Bob';

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(lastAppliedTurnStartCreatureRef.current).toBe('Bob');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith('__initiative__', 'lastAppliedTurnStartCreature', 'Bob', campaignName);
            expect(expirations.applyTurnStartEffects).not.toHaveBeenCalled();
            expect(setRuntimeStateTick).not.toHaveBeenCalled();
        });

        it('should call clearPerRoundMajestyTrackers for each creature on round decrement', () => {
            roundRef.current = 2;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Charlie',
                roundDecrement: true,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).toHaveBeenCalledWith('Alice', campaignName);
            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).toHaveBeenCalledWith('Bob', campaignName);
            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).toHaveBeenCalledWith('Charlie', campaignName);
        });

        it('should NOT call clearPerRoundMajestyTrackers when no round decrement', () => {
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Alice',
                roundDecrement: false,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Bob',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(unbreakableMajesty.clearPerRoundMajestyTrackers).not.toHaveBeenCalled();
            expect(expirations.expireStaleEffects).not.toHaveBeenCalled();
        });

        it('should use roundRef.current ?? 1 when roundRef is null', () => {
            roundRef.current = null;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Charlie',
                roundDecrement: true,
            });

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            // roundRef.current ?? 1 = 1, so currentRound > 1 is false, nothing happens
            expect(storage.set).not.toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
        });

        it('should update combatSummary.lastAppliedTurnStartCreature when different on previous', () => {
            roundRef.current = 2;
            initiativeService.getPreviousCreatureName.mockReturnValue({
                newActiveName: 'Bob',
                roundDecrement: true,
            });
            const updatedSummary = { ...baseCombatSummary, lastAppliedTurnStartCreature: 'Alice' };
            combatSummaryRef.current = updatedSummary;
            lastAppliedTurnStartCreatureRef.current = null;

            const handler = createPreviousCreatureHandler({
                combatSummaryRef,
                activeCreatureName: 'Alice',
                campaignName,
                characters: baseCharacters,
                roundRef,
                lastAppliedTurnStartCreatureRef,
                setCombatSummary,
                setActiveCreatureName,
                setRuntimeStateTick,
                isPreviousDisabled: false,
            });

            handler();

            expect(setCombatSummary).toHaveBeenCalledWith(expect.objectContaining({
                lastAppliedTurnStartCreature: 'Bob',
            }));
        });
    });
});

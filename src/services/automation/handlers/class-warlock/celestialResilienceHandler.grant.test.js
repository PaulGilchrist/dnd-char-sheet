import { describe, it, expect, vi, beforeEach } from 'vitest';

import { grantCelestialResilience } from './celestialResilienceHandler.js';
import { CAMPAIGN, MAP, makeCelestialStats } from './celestialResilienceHelpers.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../maps/mapsService.js', () => ({
    loadMapData: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
    getDistanceFeet: vi.fn(),
    rangeToFeet: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { evaluateAutoExpression } from '../../../combat/automation/automationService.js';
import { loadMapData } from '../../../maps/mapsService.js';
import { getDistanceFeet, rangeToFeet } from '../../../rules/combat/rangeValidation.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';
import { getCombatSummary } from '../../../encounters/combatData.js';

describe('celestialResilienceHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isWithinRange.mockResolvedValue(true);
    });

    describe('grantCelestialResilience', () => {
        it('returns null when player is not a celestial patron', async () => {
            const result = await grantCelestialResilience(
                makeCelestialStats({ class: { major: { name: 'Other Patron' } } }),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );
            expect(result).toBe(null);
            expect(evaluateAutoExpression).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('recognizes subclass as celestial patron', async () => {
            evaluateAutoExpression.mockReturnValue(5);
            getRuntimeValue.mockReturnValue(0);

            const result = await grantCelestialResilience(
                makeCelestialStats({
                    class: { major: { name: 'Other Patron' }, subclass: { name: 'Celestial Patron' } },
                }),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result).not.toBe(null);
            expect(result.selfTempHp).toBe(5);
        });

        it('returns null when Celestial Resilience feature is missing or has no automation', async () => {
            let result = await grantCelestialResilience(
                makeCelestialStats({ specialActions: [] }),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );
            expect(result).toBe(null);

            result = await grantCelestialResilience(
                makeCelestialStats({ specialActions: [{ name: 'Celestial Resilience', automation: null }] }),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );
            expect(result).toBe(null);

            result = await grantCelestialResilience(
                makeCelestialStats({ specialActions: [{ name: 'Celestial Resilience' }] }),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );
            expect(result).toBe(null);
        });

        it('returns null when self temp HP expression evaluates to invalid value', async () => {
            evaluateAutoExpression.mockReturnValue(0);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result).toBe(null);
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('grants self temp HP and returns result when valid', async () => {
            evaluateAutoExpression.mockReturnValue(7);
            getRuntimeValue.mockReturnValue(0);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result).not.toBe(null);
            expect(result.selfTempHp).toBe(7);
            expect(result.message).toContain('7 temporary hit points');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestHero',
                'tempHp',
                7,
                CAMPAIGN,
            );
        });

        it('uses Math.max when new temp HP is lower than existing', async () => {
            evaluateAutoExpression.mockReturnValue(3);
            getRuntimeValue.mockReturnValue(5);

            await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestHero',
                'tempHp',
                5,
                CAMPAIGN,
            );
        });

        it('uses new temp HP when higher than existing', async () => {
            evaluateAutoExpression.mockReturnValue(7);
            getRuntimeValue.mockReturnValue(3);

            await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestHero',
                'tempHp',
                7,
                CAMPAIGN,
            );
        });

        it('does not grant ally temp HP data when source is not magical_cunning', async () => {
            evaluateAutoExpression.mockReturnValue(5);
            getRuntimeValue.mockReturnValue(0);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'other_source',
                MAP,
            );

            expect(result).not.toBe(null);
            expect(result.selfTempHp).toBe(5);
            expect(result.allyTempHp).toBeUndefined();
        });

        it('returns ally temp HP data when source is magical_cunning', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(3);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(60);
            loadMapData.mockResolvedValue({
                players: [
                    { name: 'TestHero', gridX: 10, gridY: 10 },
                    { name: 'Ally1', gridX: 12, gridY: 12, currentHp: 10, maxHp: 20 },
                    { name: 'Ally2', gridX: 20, gridY: 20 },
                ],
            });
            getDistanceFeet.mockReturnValue(10);
            isWithinRange.mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result.allyTempHp).toBe(3);
            expect(result.maxAllies).toBe(5);
            expect(result.allies).toHaveLength(1);
            expect(result.allies[0].name).toBe('Ally1');
        });

        it('collects all allies in range (maxAllies limits selection, not display)', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(100);
            loadMapData.mockResolvedValue({
                players: [
                    { name: 'TestHero', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 1, gridY: 1 },
                    { name: 'Ally2', gridX: 2, gridY: 2 },
                    { name: 'Ally3', gridX: 3, gridY: 3 },
                    { name: 'Ally4', gridX: 4, gridY: 4 },
                    { name: 'Ally5', gridX: 5, gridY: 5 },
                    { name: 'Ally6', gridX: 6, gridY: 6 },
                ],
            });
            getDistanceFeet.mockReturnValue(10);

            const stats = makeCelestialStats({
                specialActions: [
                    {
                        name: 'Celestial Resilience',
                        automation: {
                            tempHpExpression: '10',
                            allyTempHpExpression: '2',
                            maxAllies: 3,
                            range: '100_ft',
                        },
                    },
                ],
            });

            const result = await grantCelestialResilience(stats, CAMPAIGN, 'magical_cunning', MAP);

            expect(result.allies.length).toBe(6);
            expect(result.maxAllies).toBe(3);
        });

        it('filters allies by range', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(20);
            loadMapData.mockResolvedValue({
                players: [
                    { name: 'TestHero', gridX: 0, gridY: 0 },
                    { name: 'NearAlly', gridX: 2, gridY: 2 },
                    { name: 'FarAlly', gridX: 10, gridY: 10 },
                ],
            });
            isWithinRange.mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result.allies.map(a => a.name)).toContain('NearAlly');
            expect(result.allies.map(a => a.name)).not.toContain('FarAlly');
        });

        it('returns empty allies when map data is missing or no map name', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);
            loadMapData.mockResolvedValue(null);

            let result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result.allyTempHp).toBe(2);
            expect(result.allies).toEqual([]);

            vi.clearAllMocks();
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);

            result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                null,
            );

            expect(result.allyTempHp).toBe(2);
            expect(result.allies).toEqual([]);
        });

        it('does not grant ally temp HP data when ally expression is invalid', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(0);
            getRuntimeValue.mockReturnValue(0);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result.selfTempHp).toBe(5);
            expect(result.allyTempHp).toBeUndefined();
        });

        it('uses default expressions when automation fields are missing', async () => {
            evaluateAutoExpression.mockReturnValueOnce(5);
            getRuntimeValue.mockReturnValue(0);

            const stats = makeCelestialStats({
                specialActions: [
                    {
                        name: 'Celestial Resilience',
                        automation: {
                            tempHpExpression: '10',
                            maxAllies: 5,
                            range: '60_ft',
                        },
                    },
                ],
            });

            await grantCelestialResilience(stats, CAMPAIGN, 'magical_cunning', MAP);

            expect(evaluateAutoExpression).toHaveBeenCalledWith(
                'floor(warlock level / 2) + CHA modifier',
                expect.any(Object),
            );
        });

        it('uses default maxAllies when missing', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(60);
            loadMapData.mockResolvedValue({
                players: [
                    { name: 'TestHero', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 1, gridY: 1 },
                ],
            });
            getDistanceFeet.mockReturnValue(10);

            const stats = makeCelestialStats({
                specialActions: [
                    {
                        name: 'Celestial Resilience',
                        automation: {
                            tempHpExpression: '10',
                            allyTempHpExpression: '2',
                            range: '60_ft',
                        },
                    },
                ],
            });

            const result = await grantCelestialResilience(stats, CAMPAIGN, 'magical_cunning', MAP);

            expect(result.maxAllies).toBe(5);
        });

        it('uses allCreatures from combatSummary when mapPlayers is empty', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(60);
            loadMapData.mockResolvedValue({
                players: [],
            });
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 20 },
                    { name: 'Ally2', type: 'npc', currentHp: 5, maxHp: 10 },
                ],
            });
            isWithinRange.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'magical_cunning',
                MAP,
            );

            expect(result.allyTempHp).toBe(2);
            expect(result.allies).toHaveLength(1);
            expect(result.allies[0].name).toBe('Ally1');
            expect(result.allies[0].type).toBe('player');
        });

        it('uses allCreatures when mapPlayers is undefined', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(60);
            loadMapData.mockResolvedValue({});
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 20 },
                ],
            });
            isWithinRange.mockResolvedValueOnce(true);

            const result = await grantCelestialResilience(
                makeCelestialStats(),
                CAMPAIGN,
                'short_rest',
                MAP,
            );

            expect(result.allyTempHp).toBe(2);
            expect(result.allies).toHaveLength(1);
            expect(result.allies[0].name).toBe('Ally1');
        });
    });
});

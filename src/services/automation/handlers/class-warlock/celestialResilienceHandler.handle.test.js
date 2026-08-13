import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './celestialResilienceHandler.js';
import { CAMPAIGN, MAP, makeCelestialStats, makeAction } from './celestialResilienceHelpers.js';

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

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { evaluateAutoExpression } from '../../../combat/automation/automationService.js';
import { addEntry } from '../../../ui/logService.js';
import { loadMapData } from '../../../maps/mapsService.js';
import { getDistanceFeet, rangeToFeet } from '../../../rules/combat/rangeValidation.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';

describe('celestialResilienceHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isWithinRange.mockResolvedValue(true);
    });

    describe('handle', () => {
        it('returns popup when mapName is null (special action click)', async () => {
            const result = await handle(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
                null,
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('Magical Cunning');
        });

        it('returns null when grantCelestialResilience returns null', async () => {
            const result = await handle(
                makeAction(),
                makeCelestialStats({ class: { major: { name: 'Other Patron' } } }),
                CAMPAIGN,
                MAP,
            );
            expect(result).toBe(null);
        });

        it('returns modal payload when allies are available for selection', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(3);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(60);
            loadMapData.mockResolvedValue({
                players: [
                    { name: 'TestHero', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 1, gridY: 1, currentHp: 10, maxHp: 20 },
                ],
            });
            getDistanceFeet.mockReturnValue(10);

            const result = await handle(makeAction(), makeCelestialStats(), CAMPAIGN, MAP);

            expect(result).not.toBe(null);
            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('celestialResilienceModal');
            expect(result.payload.creatureTargets).toHaveLength(1);
            expect(result.payload.allyTempHp).toBe(3);
            expect(result.payload.selfTempHp).toBe(5);
            expect(result.payload.maxTargets).toBe(5);
        });

        it('returns popup when no allies are in range', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(3);
            getRuntimeValue.mockReturnValue(0);
            rangeToFeet.mockReturnValue(10);
            loadMapData.mockResolvedValue({
                players: [
                    { name: 'TestHero', gridX: 0, gridY: 0 },
                    { name: 'DistantAlly', gridX: 50, gridY: 50 },
                ],
            });
            isWithinRange.mockResolvedValue(false);

            const result = await handle(makeAction(), makeCelestialStats(), CAMPAIGN, MAP);

            expect(result).not.toBe(null);
            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No allies in range');
        });

        it('logs ability use on success', async () => {
            evaluateAutoExpression.mockReturnValue(7);
            getRuntimeValue.mockReturnValue(0);

            await handle(makeAction(), makeCelestialStats(), CAMPAIGN, MAP);

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    type: 'ability_use',
                    characterName: 'TestHero',
                    abilityName: 'Celestial Resilience',
                    description: expect.stringContaining('7 temporary hit points'),
                }),
            );
        });

        it('uses custom action name in log entry', async () => {
            evaluateAutoExpression.mockReturnValue(7);
            getRuntimeValue.mockReturnValue(0);

            const action = {
                name: 'Custom Celestial Resilience',
                automation: makeAction().automation,
            };

            await handle(action, makeCelestialStats(), CAMPAIGN, MAP);

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    abilityName: 'Custom Celestial Resilience',
                }),
            );
        });

        it('handles addEntry rejection in handle without throwing', async () => {
            evaluateAutoExpression
                .mockReturnValueOnce(7)
                .mockReturnValueOnce(0);
            getRuntimeValue.mockReturnValue(0);
            addEntry.mockImplementation(() => Promise.reject(new Error('log error')));
            const errorSpy = vi.spyOn(console, 'error');

            const result = await handle(makeAction(), makeCelestialStats(), CAMPAIGN, MAP);

            expect(result).not.toBe(null);
            expect(result.type).toBe('popup');
            expect(errorSpy).toHaveBeenCalledWith(
                '[celestialResilience] Error:',
                expect.any(Error),
            );
            errorSpy.mockRestore();
        });
    });
});

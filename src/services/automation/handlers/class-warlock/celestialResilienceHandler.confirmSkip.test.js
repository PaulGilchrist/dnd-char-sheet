import { describe, it, expect, vi, beforeEach } from 'vitest';

import { confirmCelestialResilience, skipCelestialResilience } from './celestialResilienceHandler.js';
import { CAMPAIGN, makeCelestialStats, makeAction } from './celestialResilienceHelpers.js';

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
import { addEntry } from '../../../ui/logService.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';

describe('celestialResilienceHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isWithinRange.mockResolvedValue(true);
    });

    describe('confirmCelestialResilience', () => {
        it('returns popup when no targets selected', async () => {
            const result = await confirmCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
                [],
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('selected no allies');
            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    description: expect.stringContaining('selected no allies'),
                }),
            );
        });

        it('grants temp HP to selected allies', async () => {
            evaluateAutoExpression.mockReturnValue(3);
            getRuntimeValue.mockReturnValue(0);

            const result = await confirmCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
                ['Ally1', 'Ally2'],
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('Ally1');
            expect(result.payload.description).toContain('Ally2');
            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'tempHp', 3, CAMPAIGN);
            expect(setRuntimeValue).toHaveBeenCalledWith('Ally2', 'tempHp', 3, CAMPAIGN);
            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    description: expect.stringContaining('grants 3 temporary hit points'),
                }),
            );
        });

        it('logs when single ally selected', async () => {
            evaluateAutoExpression.mockReturnValue(5);

            await confirmCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
                ['Ally1'],
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    description: expect.stringContaining('Ally1'),
                }),
            );
        });
    });

    describe('skipCelestialResilience', () => {
        it('logs skip and returns popup', async () => {
            const result = await skipCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('skipped granting');
            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    description: expect.stringContaining('skipped granting'),
                }),
            );
        });

        it('does not grant temp HP to any allies on skip', async () => {
            await skipCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
            );

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                expect.any(String),
                'tempHp',
                expect.any(Number),
                CAMPAIGN,
            );
        });

        it('handles addEntry rejection in skipCelestialResilience without throwing', async () => {
            addEntry.mockImplementation(() => Promise.reject(new Error('log error')));
            const errorSpy = vi.spyOn(console, 'error');

            const result = await skipCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
            );

            expect(result.type).toBe('popup');
            expect(errorSpy).toHaveBeenCalledWith(
                '[celestialResilience] Error:',
                expect.any(Error),
            );
            errorSpy.mockRestore();
        });
    });

    describe('confirmCelestialResilience error paths', () => {
        it('handles addEntry rejection when no targets selected', async () => {
            addEntry.mockImplementation(() => Promise.reject(new Error('log error')));
            const errorSpy = vi.spyOn(console, 'error');

            const result = await confirmCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
                [],
            );

            expect(result.type).toBe('popup');
            expect(errorSpy).toHaveBeenCalledWith(
                '[celestialResilience] Error:',
                expect.any(Error),
            );
            errorSpy.mockRestore();
        });

        it('handles addEntry rejection when granting to allies', async () => {
            evaluateAutoExpression.mockReturnValue(3);
            addEntry.mockImplementation(() => Promise.reject(new Error('log error')));
            const errorSpy = vi.spyOn(console, 'error');

            const result = await confirmCelestialResilience(
                makeAction(),
                makeCelestialStats(),
                CAMPAIGN,
                ['Ally1', 'Ally2'],
            );

            expect(result.type).toBe('popup');
            expect(errorSpy).toHaveBeenCalledWith(
                '[celestialResilience] Error:',
                expect.any(Error),
            );
            errorSpy.mockRestore();
        });
    });
});

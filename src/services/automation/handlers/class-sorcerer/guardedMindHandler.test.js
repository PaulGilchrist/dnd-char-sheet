// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './guardedMindHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

const campaignName = 'test-campaign';
const playerName = 'TestHero';

function makeAction(overrides = {}) {
    return {
        name: 'Guarded Mind',
        automation: { type: 'guarded_mind', resource: 'psionicEnergy', ...overrides.automation },
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        level: 10,
        _trackedResources: { psionicEnergy: { max: 6 } },
        ...overrides,
    };
}

describe('guardedMindHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        runtimeState.getRuntimeValue.mockReturnValue(null);
        runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    });

    describe('handle', () => {
        it('should return error popup when no psionic energy remaining (zero and negative)', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No Psionic Energy remaining');
            expect(result.payload.automation).toEqual(makeAction().automation);
        });

        it('should remove charmed and/or frightened conditions and decrement resource', async () => {
            // Single charmed
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(['charmed', 'blinded']);

            let result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.payload.description).toContain('Ended charmed');
            expect(result.payload.description).toContain('Psionic Energy: 4/6');
            expect(runtimeState.setRuntimeValue).toHaveBeenLastCalledWith(
                playerName, 'activeConditions', ['blinded'], campaignName
            );

            // Single frightened
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(3)
                .mockReturnValueOnce(['frightened', 'poisoned']);

            result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.payload.description).toContain('Ended frightened');
            expect(result.payload.description).toContain('Psionic Energy: 2/6');
            expect(runtimeState.setRuntimeValue).toHaveBeenLastCalledWith(
                playerName, 'activeConditions', ['poisoned'], campaignName
            );

            // Both charmed and frightened
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(2)
                .mockReturnValueOnce(['charmed', 'frightened', 'poisoned']);

            result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.payload.description).toContain('Ended charmed and frightened');
            expect(runtimeState.setRuntimeValue).toHaveBeenLastCalledWith(
                playerName, 'activeConditions', ['poisoned'], campaignName
            );
        });

        it('should leave non-target conditions intact', async () => {
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(4)
                .mockReturnValueOnce(['blinded', 'charmed', 'poisoned', 'frightened']);

            await handle(makeAction(), makePlayerStats(), campaignName);

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName, 'activeConditions', ['blinded', 'poisoned'], campaignName
            );
        });

        it('should report none when no matching conditions are present (empty, null, no match)', async () => {
            // Empty array
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(3)
                .mockReturnValueOnce([]);

            let result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.payload.description).toContain('Ended none');
            expect(result.payload.description).toContain('Psionic Energy: 2/6');

            // Null
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(3)
                .mockReturnValueOnce(null);

            result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.payload.description).toContain('Ended none');
            expect(runtimeState.setRuntimeValue).toHaveBeenLastCalledWith(
                playerName, 'activeConditions', [], campaignName
            );

            // Non-matching conditions
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(6)
                .mockReturnValueOnce(['blinded', 'poisoned']);

            result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.payload.description).toContain('Ended none');
            expect(result.payload.description).toContain('Psionic Energy: 5/6');
        });

        it('should use default max resource when resources object or key is missing', async () => {
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(3)
                .mockReturnValueOnce(['charmed']);

            const result = await handle(
                makeAction(),
                makePlayerStats({ _trackedResources: { otherResource: { max: 10 } } }),
                campaignName
            );

            expect(result.payload.description).toContain('Psionic Energy: 2/6');
        });

        it('should use custom resource key from automation config', async () => {
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(8)
                .mockReturnValueOnce(['charmed']);

            const customAction = makeAction({ automation: { resource: 'runeCharge' } });

            await handle(customAction, makePlayerStats(), campaignName);

            expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith(
                playerName, 'runeCharge', campaignName
            );
        });

        it('should call addEntry for campaign logging', async () => {
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(['charmed']);

            await handle(makeAction(), makePlayerStats(), campaignName);

            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestHero',
                abilityName: 'Guarded Mind',
            }));
        });

        it('should handle addEntry rejection gracefully', async () => {
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(['charmed']);
            logService.addEntry.mockRejectedValueOnce(new Error('log fail'));

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('should treat case-insensitive conditions correctly', async () => {
            runtimeState.getRuntimeValue
                .mockReturnValueOnce(4)
                .mockReturnValueOnce(['CHARMED', 'Frightened', 'blinded']);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName, 'activeConditions', ['blinded'], campaignName
            );
            expect(result.payload.description).toContain('CHARMED');
            expect(result.payload.description).toContain('Frightened');
        });
    });
});

// CLA-081: Defensive Tactics verification for 2024 Ranger (Hunter)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle, applyChoice } from './defensiveTacticsHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { addEntry } = await import('../../../ui/logService.js');

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
    return {
        name: 'RangerTest',
        level: 7,
        rules: '2024',
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Defensive Tactics',
        automation: {
            type: 'defensive_tactics',
            casting_time: 'passive',
        },
        ...overrides,
    };
}

describe('CLA-081: Defensive Tactics (2024 Ranger Hunter)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle - no choice made', () => {
        it('should return modal when no choice has been made', async () => {
            getRuntimeValue.mockReturnValue(undefined);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('defensiveTactics');
            expect(result.payload.action).toBeDefined();
            expect(result.payload.playerStats).toBeDefined();
            expect(result.payload.campaignName).toBe('test-campaign');
        });

        it('should return modal for falsy runtime values (null, empty string)', async () => {
            for (const falsy of [null, '']) {
                vi.clearAllMocks();
                getRuntimeValue.mockReturnValue(falsy);

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                expect(result.type).toBe('modal');
                expect(result.modalName).toBe('defensiveTactics');
            }
        });
    });

    describe('handle - choice already made', () => {
        it.each([
            ['Escape the Horde'],
            ['Multiattack Defense'],
        ])('should return info popup for "%s"', async (choice) => {
            getRuntimeValue.mockReturnValue(choice);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Defensive Tactics');
            expect(result.payload.description).toContain(choice);
            expect(result.payload.description).toContain('Short Rest or Long Rest');
            expect(result.payload.automation).toBeDefined();
        });
    });

    describe('applyChoice', () => {
        it.each([
            ['Invalid Choice'],
            [''],
            [null],
            [undefined],
        ])('should return null for invalid choice: %s', async (choice) => {
            const result = await applyChoice(makePlayerStats(), campaignName, choice);

            expect(result).toBeNull();
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it.each([
            ['Escape the Horde'],
            ['Multiattack Defense'],
        ])('should store "%s" and return confirmation popup', async (choice) => {
            const result = await applyChoice(makePlayerStats(), campaignName, choice);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Defensive Tactics');
            expect(result.payload.description).toContain(choice);
            expect(result.payload.description).toContain('Short Rest or Long Rest');
            expect(result.payload.automation).toBeUndefined();

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'RangerTest',
                '_Defensive_Tactics_choice',
                choice,
                campaignName,
            );

            expect(addEntry).toHaveBeenCalledWith(campaignName, {
                type: 'ability_use',
                characterName: 'RangerTest',
                abilityName: 'Defensive Tactics',
                description: `Defensive Tactics choice: ${choice}`,
            });
        });
    });

    describe('end-to-end flow', () => {
        it('should flow: modal -> applyChoice -> popup', async () => {
            // Step 1: No choice yet - modal
            getRuntimeValue.mockReturnValue(undefined);
            let result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.type).toBe('modal');

            // Step 2: Apply a choice
            result = await applyChoice(makePlayerStats(), campaignName, 'Escape the Horde');
            expect(result.type).toBe('popup');
            expect(result.payload.name).toBe('Defensive Tactics');

            // Step 3: Trigger again - should show the popup with existing choice
            // In the real app, setRuntimeValue persists and getRuntimeValue reads it back
            getRuntimeValue.mockReturnValue('Escape the Horde');
            result = await handle(makeAction(), makePlayerStats(), campaignName);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Escape the Horde');
        });
    });

    describe('executeHandler integration', () => {
        it('should execute via executeHandler and return modal', async () => {
            const { executeHandler } = await import('../../index.js');
            getRuntimeValue.mockReturnValue(undefined);

            const result = await executeHandler(makeAction(), makePlayerStats(), campaignName, null, [makePlayerStats()]);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('defensiveTactics');
            expect(result.payload.action.name).toBe('Defensive Tactics');
        });

        it('should execute via executeHandler and return popup when choice exists', async () => {
            const { executeHandler } = await import('../../index.js');
            getRuntimeValue.mockReturnValue('Multiattack Defense');

            const result = await executeHandler(makeAction(), makePlayerStats(), campaignName, null, [makePlayerStats()]);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Defensive Tactics');
            expect(result.payload.description).toContain('Multiattack Defense');
        });
    });
});

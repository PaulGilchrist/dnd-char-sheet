// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { isPsychicSpellsActive, getPsychicSpellsConfig, handle } from './psychicSpellsHandler.js';
import * as logService from '../../../ui/logService.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { addEntry } = await import('../../../ui/logService.js');

const campaignName = 'TestCampaign';
const playerName = 'TestWarlock';

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        automation: {
            passives: [],
            ...overrides,
        },
        ...overrides,
    };
}

function makeFeature(overrides = {}) {
    return {
        name: 'Psychic Spells',
        automation: {
            type: 'psychic_spells',
            damageType: 'Psychic',
            componentReduction: ['V', 'S'],
            spellSchools: ['enchantment', 'illusion'],
        },
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('psychicSpellsHandler', () => {
    describe('isPsychicSpellsActive', () => {
        it('should return true when psychic_spells passive exists in automation.passives', () => {
            const playerStats = makePlayerStats({
                automation: {
                    passives: [
                        { type: 'psychic_spells', name: 'Psychic Spells', damageType: 'Psychic' },
                    ],
                },
            });
            expect(isPsychicSpellsActive(playerStats)).toBe(true);
        });

        it('should return false when psychic_spells passive is not in automation.passives', () => {
            const playerStats = makePlayerStats({
                automation: {
                    passives: [
                        { type: 'radiant_soul', name: 'Radiant Soul' },
                    ],
                },
            });
            expect(isPsychicSpellsActive(playerStats)).toBe(false);
        });

        it('should return false when automation.passives is empty', () => {
            expect(isPsychicSpellsActive(makePlayerStats({ automation: { passives: [] } }))).toBe(false);
        });

        it('should return false when automation is null', () => {
            expect(isPsychicSpellsActive(makePlayerStats({ automation: null }))).toBe(false);
        });

        it('should return false when automation is missing', () => {
            expect(isPsychicSpellsActive(makePlayerStats({ automation: {} }))).toBe(false);
        });

        it('should return false when playerStats is null', () => {
            expect(isPsychicSpellsActive(null)).toBe(false);
        });

        it('should return false when playerStats is undefined', () => {
            expect(isPsychicSpellsActive(undefined)).toBe(false);
        });

        it('should return false when playerStats.automation.passives is missing', () => {
            expect(isPsychicSpellsActive({ name: 'Test' })).toBe(false);
        });
    });

    describe('getPsychicSpellsConfig', () => {
        it('should return the psychic_spells passive config object', () => {
            const config = { type: 'psychic_spells', name: 'Psychic Spells', damageType: 'Psychic', componentReduction: ['V', 'S'] };
            const playerStats = makePlayerStats({
                automation: {
                    passives: [config],
                },
            });
            expect(getPsychicSpellsConfig(playerStats)).toEqual(config);
        });

        it('should return the first matching psychic_spells passive when multiple exist', () => {
            const playerStats = makePlayerStats({
                automation: {
                    passives: [
                        { type: 'psychic_spells', name: 'Psychic Spells' },
                        { type: 'psychic_spells', name: 'Duplicate Psychic Spells' },
                    ],
                },
            });
            const result = getPsychicSpellsConfig(playerStats);
            expect(result.name).toBe('Psychic Spells');
        });

        it('should return undefined when automation.passives is empty', () => {
            expect(getPsychicSpellsConfig(makePlayerStats({ automation: { passives: [] } }))).toBeUndefined();
        });

        it('should return undefined when automation is null', () => {
            expect(getPsychicSpellsConfig(makePlayerStats({ automation: null }))).toBeUndefined();
        });

        it('should return undefined when playerStats is null', () => {
            expect(getPsychicSpellsConfig(null)).toBeUndefined();
        });

        it('should return undefined when playerStats.automation.passives is missing', () => {
            expect(getPsychicSpellsConfig({ name: 'Test' })).toBeUndefined();
        });
    });

    describe('handle', () => {
        it('should set runtime damageType when not already set', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            await handle(action, playerStats, campaignName);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Psychic_Spells_damageType',
                'Psychic',
                campaignName
            );
        });

        it('should use custom damageType from automation config', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature({ automation: { damageType: 'Force' } });
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            await handle(action, playerStats, campaignName);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Psychic_Spells_damageType',
                'Force',
                campaignName
            );
        });

        it('should skip setting runtime damageType when already set', async () => {
            getRuntimeValue.mockReturnValue('Force');
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            await handle(action, playerStats, campaignName);

            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should return a popup response with feature description', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            const result = await handle(action, playerStats, campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Psychic Spells');
            expect(result.payload.description).toContain('Psychic');
            expect(result.payload.description).toContain('Enchantment');
            expect(result.payload.description).toContain('Illusion');
            expect(result.payload.description).toContain('Verbal');
            expect(result.payload.description).toContain('Somatic');
            expect(result.payload.automation).toEqual(action.automation);
        });

        it('should use custom damageType in the popup description', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature({ automation: { damageType: 'Force' } });
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            const result = await handle(action, playerStats, campaignName);

            expect(result.payload.description).toContain('Force');
        });

        it('should log an ability_use entry to the campaign log', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            await handle(action, playerStats, campaignName);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: playerName,
                abilityName: 'Psychic Spells',
            }));
        });

        it('should include the description in the log entry', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            await handle(action, playerStats, campaignName);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Psychic'),
            }));
        });

        it('should ignore the mapName parameter', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            const result = await handle(action, playerStats, campaignName, 'TestMap');

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Psychic_Spells_damageType',
                'Psychic',
                campaignName
            );
        });

        it('should throw when action.name is undefined', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature({ name: undefined });
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            await expect(handle(action, playerStats, campaignName)).rejects.toThrow();
        });

        it('should handle action with empty name', async () => {
            getRuntimeValue.mockReturnValue(null);
            const action = makeFeature({ name: '' });
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            const result = await handle(action, playerStats, campaignName);

            expect(result.payload.name).toBe('');
        });

        it('should handle addEntry rejection silently', async () => {
            getRuntimeValue.mockReturnValue(null);
            vi.spyOn(logService, 'addEntry').mockRejectedValue(new Error('log failure'));
            const action = makeFeature();
            const playerStats = makePlayerStats({ automation: { passives: [] } });

            const result = await handle(action, playerStats, campaignName);

            expect(result.type).toBe('popup');
        });
    });
});

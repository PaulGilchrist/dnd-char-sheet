// @cleaned-by-ai
// Suppress fire-and-forget logService.addEntry rejection warnings from source code
process.on('unhandledRejection', () => {});

import { handle, applyDeathWard, isDeathWardActive } from './deathWardHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../../services/ui/logService.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js');
vi.mock('../../../../services/ui/logService.js', () => ({ addEntry: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../../services/rules/combat/rangeValidation.js', () => ({ rangeToFeet: vi.fn(() => 0) }));
vi.mock('../../../common/targetResolver.js', () => ({ resolveMapPositions: vi.fn() }));
vi.mock('../../../../services/encounters/combatData.js', () => ({ getCombatSummary: vi.fn(() => null) }));

const PLAYER_NAME = 'Cleric1';
const CAMPAIGN_NAME = 'TestCampaign';

const MOCK_ACTION = {
    name: 'Death Ward',
    spell: {
        name: 'Death Ward',
        range: 'Touch',
        duration: '8 hours',
    },
    automation: {
        type: 'death_ward',
        target: 'willing_creature',
        duration: '8 hours',
        casting_time: '1 action',
        range: 'Touch',
    },
};

const MOCK_PLAYER_STATS = { name: PLAYER_NAME };

describe('deathWardHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        it('should return a popup with type death_ward_target_selection', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(undefined);

            const result = await handle(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, []);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('death_ward_target_selection');
            expect(result.payload.name).toBe('Death Ward');
            expect(result.payload.range).toBe('Touch');
            expect(result.payload.duration).toBe('8 hours');
        });

        it('should include creature targets from combat summary', async () => {
            const { getCombatSummary } = await import('../../../../services/encounters/combatData.js');
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Cleric1' },
                    { name: 'Fighter1' },
                    { name: 'Goblin' },
                ],
            });

            const result = await handle(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, []);

            expect(result.payload.creatureTargets).toEqual(['Cleric1', 'Fighter1', 'Goblin']);
        });
    });

    describe('applyDeathWard', () => {
        it('should add death_ward buff to target', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);

            const result = await applyDeathWard(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, ['Fighter1']);

            expect(result).not.toBeNull();
            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith('Fighter1', 'activeBuffs', CAMPAIGN_NAME);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Fighter1',
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Death Ward',
                        effect: 'death_ward',
                        duration: '8 hours',
                        sourceCharacter: PLAYER_NAME,
                    }),
                ]),
                CAMPAIGN_NAME,
            );
        });

        it('should log ability_use entry', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            logService.addEntry.mockResolvedValue(undefined);

            await applyDeathWard(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, ['Fighter1']);

            expect(logService.addEntry).toHaveBeenCalledWith(CAMPAIGN_NAME, expect.objectContaining({
                type: 'ability_use',
                characterName: PLAYER_NAME,
                abilityName: 'Death Ward',
                description: expect.stringContaining('Death Ward'),
            }));
        });

        it('should not add duplicate buff if already active', async () => {
            const existingBuff = {
                name: 'Death Ward',
                effect: 'death_ward',
                duration: '8 hours',
                sourceCharacter: 'OtherCleric',
            };
            runtimeState.getRuntimeValue.mockImplementation((_charName, key) => {
                if (key === 'activeBuffs') return [existingBuff];
                return undefined;
            });

            const result = await applyDeathWard(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, ['Fighter1']);

            expect(result).not.toBeNull();
            expect(result.payload.type).toBe('automation_info');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'Fighter1',
                'activeBuffs',
                expect.anything(),
                CAMPAIGN_NAME,
            );
        });

        it('should return null when no targets provided', async () => {
            const result = await applyDeathWard(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, []);
            expect(result).toBeNull();
        });

        it('should handle multiple targets', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_charName, key) => {
                if (key === 'activeBuffs') return [];
                return undefined;
            });
            logService.addEntry.mockResolvedValue(undefined);

            const result = await applyDeathWard(MOCK_ACTION, MOCK_PLAYER_STATS, CAMPAIGN_NAME, null, ['Fighter1', 'Ranger1']);

            expect(result.payload.description).toContain('2 targets');
            expect(result.payload.description).toContain('Fighter1');
            expect(result.payload.description).toContain('Ranger1');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Fighter1', 'activeBuffs', expect.anything(), CAMPAIGN_NAME);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Ranger1', 'activeBuffs', expect.anything(), CAMPAIGN_NAME);
        });
    });

    describe('isDeathWardActive', () => {
        it('should return true when death_ward buff is active', () => {
            runtimeState.getRuntimeValue.mockReturnValue([
                { name: 'Death Ward', effect: 'death_ward', duration: '8 hours' },
            ]);

            const result = isDeathWardActive(PLAYER_NAME, CAMPAIGN_NAME);

            expect(result).toBe(true);
        });

        it('should return false when no death_ward buff exists', () => {
            runtimeState.getRuntimeValue.mockReturnValue([
                { name: 'Mage Armor', effect: 'mage_armor' },
            ]);

            const result = isDeathWardActive(PLAYER_NAME, CAMPAIGN_NAME);

            expect(result).toBe(false);
        });

        it('should return false when buff has different effect type', () => {
            runtimeState.getRuntimeValue.mockReturnValue([
                { name: 'Death Ward', effect: 'shield_of_faith' },
            ]);

            const result = isDeathWardActive(PLAYER_NAME, CAMPAIGN_NAME);

            expect(result).toBe(false);
        });

        it('should return false when no buffs exist', () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);

            const result = isDeathWardActive(PLAYER_NAME, CAMPAIGN_NAME);

            expect(result).toBe(false);
        });
    });
});

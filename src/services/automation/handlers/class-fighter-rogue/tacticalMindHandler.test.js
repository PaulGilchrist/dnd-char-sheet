// @improved-by-ai
import { handle } from './tacticalMindHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

const mockRandom = (value) => vi.spyOn(Math, 'random').mockReturnValue((value - 1) / 10);

const makeAction = (overrides = {}) => ({
    name: 'Tactical Mind',
    automation: {
        type: 'tactical_mind',
        trigger: 'failed_ability_check',
        target: 'ability_check',
        bonusExpression: '1d10',
        resourceCost: 'second_wind',
        casting_time: 'passive',
        ...overrides,
    },
});

const makePlayerStats = (overrides = {}) => ({
    name: 'TestFighter',
    level: 2,
    class: {
        class_levels: [{ level: 2, second_wind: 2 }],
    },
    ...overrides,
});

const mockCheck = (overrides = {}) => ({
    rollType: 'check',
    attackerName: 'TestFighter',
    d20: 8,
    bonus: 3,
    checkName: 'Insight',
    ...overrides,
});

describe('tacticalMindHandler.handle', () => {
    describe('early exit — no valid ability check', () => {
        it('returns popup when no recent ability check found for the player', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return { rollType: 'attack', attackerName: 'TestFighter', d20: 15, bonus: 3, targetAc: 15, hit: true };
                return undefined;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Tactical Mind');
            expect(result.payload.description).toContain('No recent ability check found');
            expect(result.payload.description).toContain('TestFighter');
            expect(result.payload.automation).toEqual(makeAction().automation);
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('returns popup when lastAttack is null', async () => {
            getRuntimeValue.mockResolvedValue(null);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent ability check found');
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('returns popup when ability check was made by a different character', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return { rollType: 'check', attackerName: 'Goblin', d20: 15, bonus: 2, checkName: 'Stealth' };
                return undefined;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent ability check found');
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('early exit — natural 20', () => {
        it('returns popup indicating natural 20 needs no bonus', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return { rollType: 'check', attackerName: 'TestFighter', d20: 20, bonus: 3, checkName: 'Insight' };
                return undefined;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.name).toBe('Tactical Mind');
            expect(result.payload.description).toContain('Natural 20');
            expect(result.payload.automation).toEqual(makeAction().automation);
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });
    });

    describe('early exit — no Second Wind uses', () => {
        it('returns popup when no Second Wind uses remain and resets to max', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 8 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 0;
                return undefined;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Second Wind uses remaining');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'secondWindUses', 0, 'test-campaign');
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('returns popup when Second Wind uses are negative', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 8 });
                if (name === 'TestFighter' && key === 'secondWindUses') return -1;
                return undefined;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Second Wind uses remaining');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'secondWindUses', 0, 'test-campaign');
        });
    });

    describe('successful application', () => {
        it('returns popup with original and modified totals for a failed check', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 8 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            const randomSpy = mockRandom(5);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.name).toBe('Tactical Mind');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('Tactical Mind');
            expect(result.payload.description).toContain('Insight');
            expect(result.payload.description).toContain('8');
            expect(result.payload.description).toContain('11');
            expect(result.payload.description).toContain('5');
            expect(result.payload.automation).toEqual(makeAction().automation);

            randomSpy.mockRestore();
        });

        it('expend one Second Wind use on successful application', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            const randomSpy = mockRandom(3);

            await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'secondWindUses', 1, 'test-campaign');

            randomSpy.mockRestore();
        });

        it('logs an ability_use entry to the campaign log', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            addEntry.mockResolvedValue(undefined);
            const randomSpy = mockRandom(7);

            await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Tactical Mind',
                timestamp: expect.any(Number),
                description: expect.stringContaining('+7'),
                d10Roll: 7,
            }));

            randomSpy.mockRestore();
        });

        it('logs error when addEntry rejects', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            const testError = new Error('log failed');
            addEntry.mockRejectedValue(testError);
            const randomSpy = mockRandom(7);
            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(addEntry).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('[tacticalMind] Error:', testError);

            randomSpy.mockRestore();
            consoleSpy.mockRestore();
        });

        it('resets secondWindUses to max when getRuntimeValue returns null', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5 });
                if (name === 'TestFighter' && key === 'secondWindUses') return null;
                return undefined;
            });
            const randomSpy = mockRandom(3);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Tactical Mind');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'secondWindUses', 0, 'test-campaign');

            randomSpy.mockRestore();
        });

        it('uses level 1 as default when playerStats.level is falsy', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 1;
                return undefined;
            });
            const randomSpy = mockRandom(1);

            const stats = makePlayerStats({ level: undefined });

            const result = await handle(makeAction(), stats, 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'secondWindUses', 0, 'test-campaign');

            randomSpy.mockRestore();
        });

        it('handles skill rollType in addition to check', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return { rollType: 'skill', attackerName: 'TestFighter', d20: 12, bonus: 3, checkName: 'Athletics' };
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            const randomSpy = mockRandom(6);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Athletics');
            expect(result.payload.description).toContain('21');

            randomSpy.mockRestore();
        });

        it('uses level 1 when class_levels is missing', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 1;
                return undefined;
            });
            const randomSpy = mockRandom(1);

            const stats = makePlayerStats({ class: undefined, level: undefined });

            const result = await handle(makeAction(), stats, 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'secondWindUses', 0, 'test-campaign');

            randomSpy.mockRestore();
        });

        it('handles checkName with spaces', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 5, checkName: 'History (Insight)' });
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            const randomSpy = mockRandom(4);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('History (Insight)');
            expect(result.payload.description).toContain('12');

            randomSpy.mockRestore();
        });

        it('applies bonus correctly when d20 + bonus is zero', async () => {
            getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'lastAttack') return mockCheck({ d20: 1, bonus: -1 });
                if (name === 'TestFighter' && key === 'secondWindUses') return 2;
                return undefined;
            });
            const randomSpy = mockRandom(10);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('0');
            expect(result.payload.description).toContain('10');

            randomSpy.mockRestore();
        });
    });
});

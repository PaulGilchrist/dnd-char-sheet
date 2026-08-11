import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './beguilingTwistHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../common/savePrompt.js', () => ({
    createSaveListener: vi.fn().mockReturnValue({ promptId: 'test-prompt-id' }),
    buildSaveDc: vi.fn().mockReturnValue(15),
}));

vi.mock('../../common/damageRollback.js', () => ({
    findLastAttack: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { findLastAttack } = await import('../../common/damageRollback.js');
const { addEntry } = await import('../../../ui/logService.js');
const { isWithinRange } = await import('../../../rules/combat/rangeCheck.js');
const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');
const { createSaveListener, buildSaveDc } = await import('../../common/savePrompt.js');
const { addExpiration } = await import('../../../rules/effects/expirations.js');

const campaignName = 'test-campaign';
const playerName = 'WarlockPlayer';

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
        ...overrides,
    };
}

function makeAction(automation = {}) {
    return {
        name: 'Beguiling Twist',
        automation: { type: 'reaction_save', ...automation },
    };
}

describe('beguilingTwistHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findLastAttack.mockResolvedValue({
            attackEvent: null,
            attackerName: null,
            targetName: null,
            primaryDamage: 0,
            secondaryDamage: 0,
            totalDamage: 0,
            damageTypes: [],
        });
        getCombatContext.mockResolvedValue({
            creatures: [
                { name: 'Ally1', type: 'player' },
                { name: playerName, type: 'player' },
                { name: 'Goblin', type: 'monster' },
            ],
        });
        isWithinRange.mockResolvedValue(true);
    });

    describe('range parsing', () => {
        it('should default to 120 when no range in automation', async () => {
            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('120 ft');
        });

        it('should parse range from automation string', async () => {
            const result = await handle(makeAction({ range: '60_ft' }), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('60_ft');
        });

        it('should parse numeric range from automation string', async () => {
            const result = await handle(makeAction({ range: '30ft' }), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('30ft');
        });
    });

    describe('self-target mode (isSelf=true)', () => {
        it('should find triggering save when last attack targets self and hit', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true, rollType: 'attack' },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: ['slashing'],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe(playerName);
            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: playerName,
                saveType: 'WIS',
                saveDc: 15,
            }));
        });

        it('should return popup when last attack targets self but did not hit', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: false, rollType: 'attack' },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: false,
                primaryDamage: 0,
                secondaryDamage: 0,
                totalDamage: 0,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should return popup when last attack targets different creature', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'OtherPlayer',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should return popup when no attack event exists', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: null,
                attackerName: null,
                targetName: null,
                primaryDamage: 0,
                secondaryDamage: 0,
                totalDamage: 0,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });
    });

    describe('different-creature mode (isSelf=false)', () => {
        it('should find ally attack within range', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            isWithinRange.mockResolvedValue(true);

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe('Ally1');
            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'Ally1',
            }));
        });

        it('should return popup when ally is out of range', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            isWithinRange.mockResolvedValue(false);

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should default to 120ft range when range is null', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'different_creature', range: null }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe('Ally1');
        });

        it('should return popup when attacker is the player themselves', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: playerName,
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should return popup when no attack event exists', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: null,
                attackerName: null,
                targetName: null,
                primaryDamage: 0,
                secondaryDamage: 0,
                totalDamage: 0,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });
    });

    describe('different-creature popup messages', () => {
        beforeEach(() => {
            findLastAttack.mockReset().mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
        });

        it('should show "cannot determine targets" when combat context is null', async () => {
            getCombatContext.mockReset().mockResolvedValue(null);

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Cannot determine targets');
        });

        it('should show "cannot determine targets" when combat context has no creatures', async () => {
            getCombatContext.mockReset().mockResolvedValue({ creatures: null });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Cannot determine targets');
        });

        it('should show "no other creatures available" when only the attacker exists in combat', async () => {
            getCombatContext.mockReset().mockResolvedValue({ creatures: [{ name: 'Goblin' }] });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no other creatures are available to target');
        });
    });

    describe('save prompt and logging', () => {
        it('should create save listener with correct parameters', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: playerName,
                saveType: 'WIS',
                saveDc: 15,
            }));
        });

        it('should log ability_use entry on activation', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: playerName,
                abilityName: 'Beguiling Twist',
                promptId: 'test-prompt-id',
            }));
        });

        it('should use custom feature name from action', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle({ name: 'My Custom Twist', automation: { type: 'reaction_save', target: 'self' } }, makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                abilityName: 'My Custom Twist',
            }));
        });

        it('should default feature name to Beguiling Twist when not provided', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle({ automation: { type: 'reaction_save', target: 'self' } }, makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                abilityName: 'Beguiling Twist',
            }));
        });

        it('should return popup with targetName in payload', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.targetName).toBe(playerName);
        });

        it('should add event listener for save-result', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEventListenerSpy).toHaveBeenCalledWith('save-result', expect.any(Function));
            addEventListenerSpy.mockRestore();
        });
    });

    describe('condition type handling', () => {
        it('should default to charmed_frightened condition type', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Charmed or Frightened'),
            }));
        });

        it('should use charmed condition type when specified', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self', condition: 'charmed' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Charmed'),
            }));
        });

        it('should use frightened condition type when specified', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self', condition: 'frightened' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Frightened'),
            }));
        });
    });

    describe('save result handler - failure', () => {
        it('should add condition to target when save fails', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'activeConditions', expect.arrayContaining(['charmed']), campaignName);
            addEventListenerSpy.mockRestore();
        });

        it('should add frightened condition when conditionType is frightened', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self', condition: 'frightened' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'activeConditions', expect.arrayContaining(['frightened']), campaignName);
            addEventListenerSpy.mockRestore();
        });

        it('should not duplicate condition if already present', async () => {
            findLastAttack.mockReset().mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            getRuntimeValue.mockReset().mockImplementation((_name, key, _campaign) => {
                if (_name === playerName && key === 'activeConditions') return ['charmed'];
                if (_name === 'campaign' && key === 'lastAttack') return null;
                return undefined;
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            // setRuntimeValue should NOT be called because condition already exists
            expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, 'activeConditions', expect.arrayContaining(['charmed', 'charmed']), campaignName);
            addEventListenerSpy.mockRestore();
        });

        it('should call addExpiration on save failure', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(addExpiration).toHaveBeenCalledWith(playerName, playerName, [
                { type: 'condition', condition: 'charmed' }
            ]);
            addEventListenerSpy.mockRestore();
        });

        it('should log save_result entry on failure', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                targetName: playerName,
                saveDc: 15,
                saveType: 'WIS',
                success: false,
            }));
            addEventListenerSpy.mockRestore();
        });

        it('should remove event listener after handling save result', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(removeEventListenerSpy).toHaveBeenCalledWith('save-result', expect.any(Function));
            addEventListenerSpy.mockRestore();
            removeEventListenerSpy.mockRestore();
        });

        it('should ignore save-result events with wrong promptId', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'wrong-prompt-id', success: false } });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, 'activeConditions', expect.any(Array), campaignName);
            addEventListenerSpy.mockRestore();
        });

        it('should use different target name for condition on failure', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'activeConditions', expect.arrayContaining(['charmed']), campaignName);
            addEventListenerSpy.mockRestore();
        });
    });

    describe('save result handler - success', () => {
        it('should log save_result entry on success', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: true } });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                targetName: playerName,
                saveDc: 15,
                saveType: 'WIS',
                success: true,
            }));
            addEventListenerSpy.mockRestore();
        });

        it('should not add condition on save success', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: true } });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, 'activeConditions', expect.any(Array), campaignName);
            addEventListenerSpy.mockRestore();
        });

        it('should not call addExpiration on save success', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: true } });

            expect(addExpiration).not.toHaveBeenCalled();
            addEventListenerSpy.mockRestore();
        });

        it('should remove event listener after handling save success', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: true } });

            expect(removeEventListenerSpy).toHaveBeenCalledWith('save-result', expect.any(Function));
            addEventListenerSpy.mockRestore();
            removeEventListenerSpy.mockRestore();
        });
    });

    describe('DC calculation', () => {
        it('should use buildSaveDc to compute the DC', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            buildSaveDc.mockReturnValue(17);

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(buildSaveDc).toHaveBeenCalled();
            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                saveDc: 17,
            }));
        });
    });

    describe('description messages', () => {
        it('should include range in no-result popup', async () => {
            const result = await handle(makeAction({ target: 'self', range: '60_ft' }), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('60_ft');
        });

        it('should include feature name in no-result popup', async () => {
            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('Beguiling Twist');
        });

        it('should include feature name in activation popup description', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('WIS saving throw');
            expect(result.payload.description).toContain('DC 17');
        });
    });

    describe('addEntry error handling', () => {
        it('should handle addEntry rejection on ability_use logging', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            addEntry.mockRejectedValue(new Error('log failed'));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();
            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(consoleErrorSpy).toHaveBeenCalledWith('[beguilingTwist] Error:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });

        it('should handle addEntry rejection on save failure logging', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            addEntry.mockRejectedValue(new Error('log failed'));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: false } });

            expect(consoleErrorSpy).toHaveBeenCalledWith('[beguilingTwist] Error:', expect.any(Error));
            addEventListenerSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should handle addEntry rejection on save success logging', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            addEntry.mockRejectedValue(new Error('log failed'));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'save-result')[1];
            handler({ detail: { promptId: 'test-prompt-id', success: true } });

            expect(consoleErrorSpy).toHaveBeenCalledWith('[beguilingTwist] Error:', expect.any(Error));
            addEventListenerSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });
});

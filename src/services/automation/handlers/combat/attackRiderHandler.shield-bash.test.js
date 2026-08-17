// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './attackRiderHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(() => 15),
    createSaveListener: vi.fn(() => ({
        promptId: 'shield-bash-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
    })),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => ({
        creatures: [{ name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } }],
    })),
    getTargetFromAttacker: vi.fn(() => ({ name: 'Goblin' })),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../common/oncePerTurn.js', () => ({
    checkOncePerTurn: vi.fn(async () => null),
    checkOncePerTurnWithSkip: vi.fn(async () => null),
}));

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { buildSaveDc, createSaveListener } from '../../../automation/common/savePrompt.js';
import { checkOncePerTurnWithSkip } from '../../common/oncePerTurn.js';

// ── Helpers ────────────────────────────────────────────────────

function makeShieldBashAction(overrides = {}) {
    return {
        name: 'Shield Bash',
        description: 'Push or knock prone on hit.',
        automation: {
            type: 'attack_rider',
            effect: 'push_or_prone',
            oncePerTurn: true,
            trigger: 'hit',
            saveDc: 15,
            saveType: 'STR',
            saveAbility: 'STR',
            options: [],
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestHero',
        proficiency: 3,
        abilities: [
            { name: 'Strength', bonus: 2 },
            { name: 'Dexterity', bonus: 2 },
        ],
        inventory: {
            equipped: overrides.equipped || [],
            backpack: [],
        },
        equipment: overrides.equipment || [],
        ...overrides,
    };
}

function setupShieldBashMocks(saveResult) {
    getRuntimeValue.mockImplementation((_scope, key, _camp) => {
        if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
        return null;
    });
    vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'shield-bash-prompt',
        promise: Promise.resolve(saveResult),
    });
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - Shield Bash (push_or_prone + oncePerTurn)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRuntimeValue).mockReset();
        vi.mocked(checkOncePerTurnWithSkip).mockResolvedValue(null);
    });

    describe('prerequisites - shield check', () => {
        it('should return popup when no shield equipped', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats();

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires an equipped shield');
        });

        it('should return popup when shield not in equipped items', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Longsword', 'Chain Mail'],
                equipment: [
                    { name: 'Longsword', armor_category: 'Light Armor' },
                    { name: 'Chain Mail', armor_category: 'Medium Armor' },
                ],
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires an equipped shield');
        });

        it('should pass shield check when Shield is equipped with armor_category', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield', 'Longsword'],
                equipment: [
                    { name: 'Longsword', armor_category: 'Light Armor' },
                    { name: 'Shield', armor_category: 'Shield' },
                ],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');
        });

        it('should pass shield check with equipment_category Shield', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Tower Shield'],
                equipment: [
                    { name: 'Tower Shield', equipment_category: 'Shield' },
                ],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');
        });

        it('should pass shield check with magic item name prefix (+1 Shield)', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['+1 Shield'],
                equipment: [
                    { name: 'Shield', armor_category: 'Shield' },
                ],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');
        });
    });

    describe('prerequisites - lastAttack validation', () => {
        it('should return popup when lastAttack is null', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return null;
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires a hit');
        });

        it('should return popup when lastAttack.hit is false', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: false, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires a hit');
        });

        it('should return popup when lastAttack.attackerName does not match player', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'Orc', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('your own melee weapon attack');
        });

        it('should return popup when lastAttack.weaponType is not melee', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'ranged', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('melee weapon attack');
        });

        it('should return popup when lastAttack.targetName is null', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: null };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no target found');
        });

        it('should return popup when lastAttack.targetName is undefined', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no target found');
        });
    });

    describe('oncePerTurn skip check', () => {
        it('should return popup when oncePerTurn skip returns already used', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            vi.mocked(checkOncePerTurnWithSkip).mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Shield Bash',
                    description: 'Shield Bash can only be used once per turn.',
                },
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('once per turn');
            expect(createSaveListener).not.toHaveBeenCalled();
        });

        it('should return popup when oncePerTurn skip returns skipped this round', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            vi.mocked(checkOncePerTurnWithSkip).mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Shield Bash',
                    description: 'Shield Bash was not used this turn.',
                },
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('was not used this turn');
            expect(createSaveListener).not.toHaveBeenCalled();
        });
    });

    describe('save flow', () => {
        it('should call createSaveListener with correct params on failed save', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            expect(createSaveListener).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 15,
                dcSuccess: false,
                sourceName: 'Shield Bash',
            }));
        });

        it('should return modal and log save entries on failed save', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');

            const calls = addEntry.mock.calls;
            expect(calls).toHaveLength(2);

            // First call: save prompt
            expect(calls[0][1]).toEqual(expect.objectContaining({
                type: 'roll',
                rollType: 'save-damage',
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 15,
            }));

            // Second call: save result
            const resultEntry = calls.find(c => c[1]?.saveResult === 'failure');
            expect(resultEntry).toBeDefined();
            expect(resultEntry[1].total).toBe(5);
            expect(resultEntry[1].rolls).toEqual([5]);
            expect(resultEntry[1].bonus).toBe(0);
        });

        it('should return popup on successful save', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            setupShieldBashMocks({ success: true, roll: 18, total: 18, saveBonus: 3 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('succeeded on STR save');
            expect(result.payload.description).toContain('no effect');
        });

        it('should log save result to campaign log on success', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            setupShieldBashMocks({ success: true, roll: 18, total: 18, saveBonus: 3 });

            await handle(action, stats, 'test-campaign', 'map');

            const calls = addEntry.mock.calls;
            const resultEntry = calls.find(c => c[1]?.saveResult === 'success');
            expect(resultEntry).toBeDefined();
            expect(resultEntry[1].total).toBe(18);
            expect(resultEntry[1].rolls).toEqual([18]);
            expect(resultEntry[1].bonus).toBe(3);
        });

        it('should log save result to campaign log on failure with correct fields', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            const calls = addEntry.mock.calls;
            const resultEntry = calls.find(c => c[1]?.saveResult === 'failure');
            expect(resultEntry).toBeDefined();
            expect(resultEntry[1].total).toBe(5);
            expect(resultEntry[1].rolls).toEqual([5]);
            expect(resultEntry[1].bonus).toBe(0);
            expect(resultEntry[1].formula).toBe('1d20');
        });

        it('should build save DC using buildSaveDc when saveDc is ability', async () => {
            const action = makeShieldBashAction({
                automation: {
                    effect: 'push_or_prone',
                    oncePerTurn: true,
                    trigger: 'hit',
                    saveDc: 'ability',
                    saveType: 'STR',
                    saveAbility: 'STR',
                    options: [],
                },
            });
            const stats = makePlayerStats({
                proficiency: 3,
                abilities: [{ name: 'Strength', bonus: 4 }],
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            expect(buildSaveDc).toHaveBeenCalledWith(action.automation, stats);
        });

        it('should build save DC from formula when saveDc is null', async () => {
            const action = makeShieldBashAction({
                automation: {
                    effect: 'push_or_prone',
                    oncePerTurn: true,
                    trigger: 'hit',
                    saveDc: null,
                    saveType: 'STR',
                    saveAbility: 'STR',
                    options: [],
                },
            });
            const stats = makePlayerStats({
                proficiency: 3,
                abilities: [{ name: 'Strength', bonus: 4 }],
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            // Should compute: 8 + STR bonus (4) + proficiency (3) = 15
            expect(buildSaveDc).not.toHaveBeenCalled();
        });

        it('should use auto.saveDc value directly when provided as number', async () => {
            const action = makeShieldBashAction({
                automation: {
                    effect: 'push_or_prone',
                    oncePerTurn: true,
                    trigger: 'hit',
                    saveDc: 18,
                    saveType: 'STR',
                    saveAbility: 'STR',
                    options: [],
                },
            });
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            expect(buildSaveDc).not.toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                saveDc: 18,
            }));
        });

        it('should handle missing Strength ability by using 0 bonus in formula', async () => {
            const action = makeShieldBashAction({
                automation: {
                    effect: 'push_or_prone',
                    oncePerTurn: true,
                    trigger: 'hit',
                    saveDc: null,
                    saveType: 'STR',
                    saveAbility: 'STR',
                    options: [],
                },
            });
            const stats = makePlayerStats({
                proficiency: 3,
                abilities: [{ name: 'Dexterity', bonus: 2 }],
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            // Formula: 8 + 0 (no STR) + 3 (proficiency) = 11
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                saveDc: 11,
            }));
        });

        it('should handle null abilities array using default formula', async () => {
            const action = makeShieldBashAction({
                automation: {
                    effect: 'push_or_prone',
                    oncePerTurn: true,
                    trigger: 'hit',
                    saveDc: null,
                    saveType: 'STR',
                    saveAbility: 'STR',
                    options: [],
                },
            });
            const stats = makePlayerStats({
                proficiency: 3,
                abilities: null,
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            // Formula: 8 + 0 (no abilities) + 3 (proficiency) = 11
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                saveDc: 11,
            }));
        });
    });

    describe('modal payload', () => {
        it('should include action, playerStats, campaignName, targetName, saveDc in modal payload', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.payload.action.name).toBe('Shield Bash');
            expect(result.payload.action.options).toHaveLength(1);
            expect(result.payload.action.options[0].name).toBe('Prone');
            expect(result.payload.playerStats).toBe(stats);
            expect(result.payload.campaignName).toBe('test-campaign');
            expect(result.payload.targetName).toBe('Goblin');
            expect(result.payload.saveDc).toBe(15);
        });

        it('should include automation object in modal payload action', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.payload.action.automation).toEqual(action.automation);
        });
    });
});

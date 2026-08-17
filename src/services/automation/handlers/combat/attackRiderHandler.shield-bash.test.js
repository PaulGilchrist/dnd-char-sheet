// @cleaned-by-ai
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
import { createSaveListener } from '../../../automation/common/savePrompt.js';
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
        it.each([
            [{ equipped: [], equipment: [] }, 'no equipped items'],
            [{ equipped: ['Longsword', 'Chain Mail'], equipment: [{ name: 'Longsword', armor_category: 'Light Armor' }, { name: 'Chain Mail', armor_category: 'Medium Armor' }] }, 'equipped items that are not shields'],
        ])('should return popup when %s', async (config, _description) => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats(config);

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires an equipped shield');
        });

        it.each([
            [{ equipped: ['Shield'], equipment: [{ name: 'Shield', armor_category: 'Shield' }] }, 'standard shield'],
            [{ equipped: ['Tower Shield'], equipment: [{ name: 'Tower Shield', equipment_category: 'Shield' }] }, 'tower shield via equipment_category'],
            [{ equipped: ['+1 Shield'], equipment: [{ name: 'Shield', armor_category: 'Shield' }] }, 'magic shield (parsed base name)'],
        ])('should pass shield check for %s', async (config, _description) => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats(config);
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
        it.each([
            [null, 'Shield Bash requires a hit'],
            [{ hit: false, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' }, 'Shield Bash requires a hit'],
        ])('should return popup when lastAttack is %j', async (lastAttack, expectedText) => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });

            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'lastAttack') return lastAttack;
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(expectedText);
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

        it('should return popup when lastAttack.targetName is null or undefined', async () => {
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
    });

    describe('save flow', () => {
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

            expect(createSaveListener).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 15,
                dcSuccess: false,
                sourceName: 'Shield Bash',
            }));

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'roll',
                rollType: 'save-damage',
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 15,
            }));

            const failureEntry = addEntry.mock.calls.find(c => c[1]?.saveResult === 'failure');
            expect(failureEntry).toBeDefined();
            expect(failureEntry[1].total).toBe(5);
            expect(failureEntry[1].rolls).toEqual([5]);
            expect(failureEntry[1].bonus).toBe(0);
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

            const calls = addEntry.mock.calls;
            const successEntry = calls.find(c => c[1]?.saveResult === 'success');
            expect(successEntry).toBeDefined();
            expect(successEntry[1].total).toBe(18);
            expect(successEntry[1].rolls).toEqual([18]);
            expect(successEntry[1].bonus).toBe(3);
        });

        it.each([
            [[{ name: 'Dexterity', bonus: 2 }], 'missing Strength ability'],
            [null, 'null abilities array'],
        ])('should use default formula DC 11 when %s', async (abilities, _description) => {
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
                abilities,
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
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                saveDc: 11,
            }));
        });
    });

    describe('modal payload', () => {
        it('should return shieldBash modal with action, playerStats, campaignName, targetName, saveDc', async () => {
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

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');
            expect(result.payload.action.name).toBe('Shield Bash');
            expect(result.payload.action.options).toHaveLength(1);
            expect(result.payload.action.options[0].name).toBe('Prone');
            expect(result.payload.playerStats).toBe(stats);
            expect(result.payload.campaignName).toBe('test-campaign');
            expect(result.payload.targetName).toBe('Goblin');
            expect(result.payload.saveDc).toBe(15);
            expect(result.payload.action.automation).toEqual(action.automation);
        });
    });
});

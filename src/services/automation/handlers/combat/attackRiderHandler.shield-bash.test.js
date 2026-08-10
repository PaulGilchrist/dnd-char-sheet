import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './attackRiderHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
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

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { buildSaveDc, createSaveListener } from '../../../automation/common/savePrompt.js';

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

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - Shield Bash (push_or_prone + oncePerTurn)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: getRuntimeValue returns null for oncePerTurn checks
        getRuntimeValue.mockImplementation((scope, key, _camp) => {
            if (key === 'lastAttack') return null;
            return null;
        });
    });

    describe('prerequisites', () => {
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

        it('should pass shield check when Shield is equipped', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield', 'Longsword'],
                equipment: [
                    { name: 'Longsword', armor_category: 'Light Armor' },
                    { name: 'Shield', armor_category: 'Shield' },
                ],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
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
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');
        });
    });

    describe('lastAttack validation', () => {
        it('should return popup when lastAttack is null', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return null;
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires a hit');
        });

        it('should return popup when lastAttack did not hit', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: false, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Shield Bash requires a hit');
        });

        it('should return popup when lastAttack attacker is not player', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'Orc', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('your own melee weapon attack');
        });

        it('should return popup when lastAttack weaponType is not melee', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'ranged', targetName: 'Goblin' };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('melee weapon attack');
        });

        it('should return popup when no targetName in lastAttack', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: null };
                return null;
            });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no target found');
        });
    });

    describe('save flow', () => {
        function setupShieldBashMocks(saveResult) {
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'shield-bash-prompt',
                promise: Promise.resolve(saveResult),
            });
        }

        it('should create save listener and return modal on failed save', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('shieldBash');
            expect(createSaveListener).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'roll',
                rollType: 'save-damage',
                targetName: 'Goblin',
                saveType: 'STR',
            }));
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

            // Should have 2 addEntry calls: first for the prompt, second for the result
            const calls = addEntry.mock.calls;
            const resultEntry = calls.find(c => c[1]?.saveResult === 'success');
            expect(resultEntry).toBeDefined();
            expect(resultEntry[1].total).toBe(18);
            expect(resultEntry[1].rolls).toEqual([18]);
            expect(resultEntry[1].bonus).toBe(3);
        });

        it('should log save result to campaign log on failure', async () => {
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
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            expect(buildSaveDc).toHaveBeenCalledWith(action.automation, stats);
        });

        it('should build save DC from formula when saveDc is not ability', async () => {
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
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            await handle(action, stats, 'test-campaign', 'map');

            // Should compute: 8 + STR bonus (4) + proficiency (3) = 15
            expect(buildSaveDc).not.toHaveBeenCalled();
        });

        it('should use auto.saveDc value directly when provided', async () => {
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
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
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
    });

    describe('modal payload', () => {
        it('should include action, playerStats, campaignName, targetName, saveDc in modal payload', async () => {
            const action = makeShieldBashAction();
            const stats = makePlayerStats({
                equipped: ['Shield'],
                equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            });
            getRuntimeValue.mockImplementation((scope, key, _camp) => {
                if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
                return null;
            });
            setupShieldBashMocks({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const result = await handle(action, stats, 'test-campaign', 'map');

            expect(result.payload.action.name).toBe('Shield Bash');
            expect(result.payload.playerStats).toBe(stats);
            expect(result.payload.campaignName).toBe('test-campaign');
            expect(result.payload.targetName).toBe('Goblin');
            expect(result.payload.saveDc).toBe(15);
        });
    });
});

function setupShieldBashMocks(saveResult) {
    getRuntimeValue.mockImplementation((scope, key, _camp) => {
        if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
        return null;
    });
    vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'shield-bash-prompt',
        promise: Promise.resolve(saveResult),
    });
}

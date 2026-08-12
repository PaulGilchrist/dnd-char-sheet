import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './beguilingDefensesHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../common/damageRollback.js', () => ({
    findLastAttack: vi.fn().mockResolvedValue({
        attackEvent: null,
        attackerName: null,
        targetName: null,
        primaryDamage: 0,
        secondaryDamage: 0,
        totalDamage: 0,
        damageTypes: [],
    }),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(),
    createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
    applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => {
    const mockStorage = {
        set: vi.fn(),
    };
    return { default: mockStorage };
});

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { findLastAttack } = await import('../../common/damageRollback.js');
const { addEntry } = await import('../../../ui/logService.js');
const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');
const { buildSaveDc, createSaveListener } = await import('../../common/savePrompt.js');
const { applyHealingToTarget } = await import('../../../rules/combat/applyHealing.js');
const { applyDamageToTarget } = await import('../../../rules/combat/applyDamage.js');
const storageModule = await import('../../../ui/storage.js');
const storage = storageModule.default;

const campaignName = 'test-campaign';
const playerName = 'WarlockGirl';

beforeEach(() => {
    vi.clearAllMocks();
});

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        abilities: [{ name: 'CHA', bonus: 4 }],
        proficiency: 3,
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Beguiling Defenses',
        automation: {
            type: 'beguiling_defenses',
            saveDc: 15,
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makeAttackResult(overrides = {}) {
    return {
        attackEvent: overrides.attackEvent ?? null,
        attackerName: overrides.attackerName ?? null,
        targetName: overrides.targetName ?? null,
        primaryDamage: overrides.primaryDamage ?? 0,
        secondaryDamage: overrides.secondaryDamage ?? 0,
        totalDamage: overrides.totalDamage ?? 0,
        damageTypes: overrides.damageTypes ?? [],
    };
}

function makeHitAttack(attacker, target) {
    return makeAttackResult({
        attackEvent: { timestamp: Date.now(), targetName: target, damageTypes: ['Piercing'] },
        attackerName: attacker,
        targetName: target,
        primaryDamage: 20,
        secondaryDamage: 0,
        totalDamage: 20,
        damageTypes: ['Piercing'],
    });
}

function setupHappyPath(attackResult) {
    findLastAttack.mockResolvedValue(attackResult || makeHitAttack('Goblin', playerName));
    getRuntimeValue.mockReturnValue(0);
    getCombatContext.mockResolvedValue({ creatures: [] });
    buildSaveDc.mockReturnValue(15);
    createSaveListener.mockReturnValue({ promptId: 'test-prompt-id' });
    applyHealingToTarget.mockReturnValue({ actualHeal: 10, oldHp: 15, newHp: 25 });
    applyDamageToTarget.mockReturnValue(null);
    storage.set.mockReturnValue(undefined);
}

describe('beguilingDefensesHandler - save results', () => {
    describe('save-result event handling', () => {
        it('applies psychic damage on save failure', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: false,
                    total: 12,
                    roll: 8,
                    bonus: 4,
                },
            });

            // Wait for async addEntry calls to complete
            await new Promise(r => setTimeout(r, 10));

            expect(applyDamageToTarget).toHaveBeenCalledWith(
                expect.any(Object),
                'Goblin',
                10,
                ['Psychic'],
                campaignName,
                ['Goblin'],
                false,
                playerName
            );
            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'roll',
                rollType: 'damage',
                name: 'Beguiling Defenses Psychic Retaliation',
                targetName: 'Goblin',
                damageType: 'Psychic',
                saveResult: 'failure',
                saveRoll: 8,
                saveBonus: 4,
            }));
            spy.mockRestore();
        });

        it('ignores save-result event with wrong promptId', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'wrong-prompt-id',
                    success: false,
                    total: 12,
                    roll: 8,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(applyDamageToTarget).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalledWith('campaign', 'lastAttack', expect.any(Object));
            spy.mockRestore();
        });

        it('stores save result in lastAttack when existing data is present', async () => {
            findLastAttack.mockResolvedValue(makeHitAttack('Goblin', playerName));
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'beguilingDefensesUses') return 0;
                if (key === 'lastAttack') return { attackId: 'old-attack' };
                return null;
            });
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
            buildSaveDc.mockReturnValue(15);
            createSaveListener.mockReturnValue({ promptId: 'test-prompt-id' });
            applyHealingToTarget.mockReturnValue({ actualHeal: 10, oldHp: 15, newHp: 25 });
            applyDamageToTarget.mockReturnValue(null);
            storage.set.mockReturnValue(undefined);

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: false,
                    total: 12,
                    roll: 8,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'lastAttack',
                expect.objectContaining({
                    attackId: 'old-attack',
                    saveResult: 'failure',
                    saveDc: 15,
                    saveType: 'WIS',
                    saveRoll: 8,
                    saveBonus: 4,
                    saveTotal: 12,
                }),
                campaignName
            );
            spy.mockRestore();
        });

        it('stores save success result in lastAttack when existing data is present', async () => {
            findLastAttack.mockResolvedValue(makeHitAttack('Goblin', playerName));
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'beguilingDefensesUses') return 0;
                if (key === 'lastAttack') return { attackId: 'old-attack' };
                return null;
            });
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
            buildSaveDc.mockReturnValue(15);
            createSaveListener.mockReturnValue({ promptId: 'test-prompt-id' });
            applyHealingToTarget.mockReturnValue({ actualHeal: 10, oldHp: 15, newHp: 25 });
            applyDamageToTarget.mockReturnValue(null);
            storage.set.mockReturnValue(undefined);

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: true,
                    total: 18,
                    roll: 14,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'lastAttack',
                expect.objectContaining({
                    attackId: 'old-attack',
                    saveResult: 'success',
                    saveDc: 15,
                    saveType: 'WIS',
                    saveRoll: 14,
                    saveBonus: 4,
                    saveTotal: 18,
                }),
                campaignName
            );
            spy.mockRestore();
        });

        it('does not apply psychic damage when halfDamage is 0 on save failure', async () => {
            findLastAttack.mockResolvedValue(makeAttackResult({
                attackEvent: { timestamp: Date.now(), targetName: playerName, damageTypes: ['Piercing'] },
                attackerName: 'Goblin',
                targetName: playerName,
                totalDamage: 1,
                damageTypes: ['Piercing'],
            }));
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'beguilingDefensesUses') return 0;
                return null;
            });
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
            buildSaveDc.mockReturnValue(15);
            createSaveListener.mockReturnValue({ promptId: 'test-prompt-id' });
            applyHealingToTarget.mockReturnValue({ actualHeal: 0, oldHp: 15, newHp: 15 });
            applyDamageToTarget.mockReturnValue(null);
            storage.set.mockReturnValue(undefined);

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: false,
                    total: 10,
                    roll: 6,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(applyDamageToTarget).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('passes empty characters array to applyDamageToTarget when characters is empty', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, []);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: false,
                    total: 12,
                    roll: 8,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(applyDamageToTarget).toHaveBeenCalledWith(
                expect.any(Object),
                'Goblin',
                10,
                ['Psychic'],
                campaignName,
                [],
                false,
                playerName
            );
            spy.mockRestore();
        });

        it('logs save success on save success', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: true,
                    total: 18,
                    roll: 14,
                    bonus: 4,
                },
            });

            // Wait for async addEntry calls to complete
            await new Promise(r => setTimeout(r, 10));

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                targetName: 'Goblin',
                saveDc: 15,
                saveType: 'WIS',
                success: true,
                saveRoll: 14,
                saveBonus: 4,
            }));
            spy.mockRestore();
        });

        it('handles addEntry rejection in psychic damage log on save failure', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });
            addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: false,
                    total: 12,
                    roll: 8,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(applyDamageToTarget).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('handles addEntry rejection in save success log', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });
            addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, ['Goblin']);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: true,
                    total: 18,
                    roll: 14,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            spy.mockRestore();
        });

        it('uses empty array fallback when characters is null in applyDamageToTarget', async () => {
            setupHappyPath(makeHitAttack('Goblin', playerName));
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }], lastAttack: {} });

            const spy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction(), makePlayerStats(), campaignName, null, null);

            const saveResultHandler = spy.mock.calls.find(
                call => call[0] === 'save-result'
            );
            const handler = saveResultHandler[1];
            handler({
                detail: {
                    promptId: 'test-prompt-id',
                    success: false,
                    total: 12,
                    roll: 8,
                    bonus: 4,
                },
            });

            await new Promise(r => setTimeout(r, 10));

            expect(applyDamageToTarget).toHaveBeenCalledWith(
                expect.any(Object),
                'Goblin',
                10,
                ['Psychic'],
                campaignName,
                [],
                false,
                playerName
            );
            spy.mockRestore();
        });
    });
});

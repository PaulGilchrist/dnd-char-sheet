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
    buildSaveDc: vi.fn(() => 14),
    createSaveListener: vi.fn(() => ({
        promptId: 'test-prompt',
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

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

// ── Helpers ────────────────────────────────────────────────────

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestHero',
        proficiency: 3,
        abilities: [
            { name: 'Strength', bonus: 2 },
        ],
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - push_or_prone expansion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should expand push_or_prone effect into Prone option when options is empty', async () => {
        getRuntimeValue.mockImplementation((_scope, key, _camp) => {
            if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
            if (key === 'targetEffects') return [];
            return null;
        });

        const action = {
            name: 'Charger',
            automation: {
                type: 'attack_rider',
                effect: 'push_or_prone',
                options: [],
                saveType: 'STR',
                saveDc: 'ability',
                saveAbility: 'STR',
            },
        };
        const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

        // After expansion, options has 1 item (Prone) with saveType: 'STR'
        // So it goes through the save flow and returns null (save result)
        expect(result).toBeNull();
        expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.any(Array), 'test-campaign');
    });

    it('should NOT expand push_or_prone when options already exist', async () => {
        getRuntimeValue.mockImplementation((_scope, key, _camp) => {
            if (key === 'lastAttack') return { hit: true, attackerName: 'TestHero', weaponType: 'melee', targetName: 'Goblin' };
            if (key === 'targetEffects') return [];
            return null;
        });

        const action = {
            name: 'Charger',
            automation: {
                type: 'attack_rider',
                effect: 'push_or_prone',
                options: [{ name: 'Push', effect: 'push', value: 10 }],
            },
        };
        const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

        // Options already exist with 1 item, so it applies immediately (push)
        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('pushed 10 feet away');
    });
});

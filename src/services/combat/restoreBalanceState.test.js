import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn(async () => true),
}));

vi.mock('../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { isWithinRange } from '../rules/combat/rangeCheck.js';
import { addEntry } from '../ui/logService.js';
import {
    consumeArmedRestoreBalance,
    armRestoreBalance,
    isRestoreBalanceArmed,
    RESTORE_BALANCE_ARMED_KEY,
    RESTORE_BALANCE_RANGE_FT,
} from './restoreBalanceState.js';

const campaignName = 'test-campaign';

function mockRuntime(map) {
    getRuntimeValue.mockImplementation((name, prop) => map[`${name}.${prop}`] ?? null);
}

const combatSummary = {
    creatures: [
        { name: 'DraconicDragon', conditions: [] },
        { name: 'AberrantSorcerer', conditions: [] },
    ],
};

beforeEach(() => {
    vi.clearAllMocks();
    isWithinRange.mockResolvedValue(true);
});

describe('armRestoreBalance / isRestoreBalanceArmed', () => {
    it('arms via runtime store with JSON armedAt payload', async () => {
        await armRestoreBalance('AberrantSorcerer', 123, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'AberrantSorcerer',
            RESTORE_BALANCE_ARMED_KEY,
            JSON.stringify({ armedAt: 123 }),
            campaignName,
        );
    });

    it('isRestoreBalanceArmed only true for valid armed JSON payload', () => {
        mockRuntime({
            [`A.${RESTORE_BALANCE_ARMED_KEY}`]: JSON.stringify({ armedAt: 1 }),
            [`B.${RESTORE_BALANCE_ARMED_KEY}`]: 'garbage',
            [`C.${RESTORE_BALANCE_ARMED_KEY}`]: '3',
            [`D.${RESTORE_BALANCE_ARMED_KEY}`]: null,
        });
        expect(isRestoreBalanceArmed('A', campaignName)).toBe(true);
        expect(isRestoreBalanceArmed('B', campaignName)).toBe(false);
        expect(isRestoreBalanceArmed('C', campaignName)).toBe(false);
        expect(isRestoreBalanceArmed('D', campaignName)).toBe(false);
    });
});

describe('consumeArmedRestoreBalance (CLA-295)', () => {
    it('consumes armed flag and logs when holder sees roller in range', async () => {
        mockRuntime({
            [`AberrantSorcerer.${RESTORE_BALANCE_ARMED_KEY}`]: JSON.stringify({ armedAt: 1 }),
        });

        const consumed = await consumeArmedRestoreBalance(
            campaignName, combatSummary, 'DraconicDragon', 'Warhammer', 'attack',
        );

        expect(consumed).toBe('AberrantSorcerer');
        expect(isWithinRange).toHaveBeenCalledWith('AberrantSorcerer', 'DraconicDragon', RESTORE_BALANCE_RANGE_FT);
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'AberrantSorcerer', RESTORE_BALANCE_ARMED_KEY, null, campaignName,
        );
        expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            type: 'ability_use',
            characterName: 'AberrantSorcerer',
            abilityName: 'Restore Balance',
            description: expect.stringContaining('DraconicDragon'),
        }));
    });

    it('returns null and leaves flag when nothing armed', async () => {
        mockRuntime({});

        const consumed = await consumeArmedRestoreBalance(
            campaignName, combatSummary, 'DraconicDragon', 'Warhammer', 'attack',
        );

        expect(consumed).toBeNull();
        expect(setRuntimeValue).not.toHaveBeenCalled();
        expect(addEntry).not.toHaveBeenCalled();
    });

    it('does not consume when roller is out of 60 ft range', async () => {
        mockRuntime({
            [`AberrantSorcerer.${RESTORE_BALANCE_ARMED_KEY}`]: JSON.stringify({ armedAt: 1 }),
        });
        isWithinRange.mockResolvedValue(false);

        const consumed = await consumeArmedRestoreBalance(
            campaignName, combatSummary, 'DraconicDragon', 'Warhammer', 'attack',
        );

        expect(consumed).toBeNull();
        expect(setRuntimeValue).not.toHaveBeenCalled();
        expect(addEntry).not.toHaveBeenCalled();
    });

    it('does not consume when holder is Blinded (cannot see roller)', async () => {
        mockRuntime({
            [`AberrantSorcerer.${RESTORE_BALANCE_ARMED_KEY}`]: JSON.stringify({ armedAt: 1 }),
        });
        const blindedSummary = {
            creatures: [
                { name: 'DraconicDragon', conditions: [] },
                { name: 'AberrantSorcerer', conditions: [{ key: 'blinded' }] },
            ],
        };

        const consumed = await consumeArmedRestoreBalance(
            campaignName, blindedSummary, 'DraconicDragon', 'Warhammer', 'attack',
        );

        expect(consumed).toBeNull();
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('lets the holder cancel its own adv/dis roll', async () => {
        mockRuntime({
            [`AberrantSorcerer.${RESTORE_BALANCE_ARMED_KEY}`]: JSON.stringify({ armedAt: 1 }),
        });

        const consumed = await consumeArmedRestoreBalance(
            campaignName, combatSummary, 'AberrantSorcerer', 'Fire Bolt', 'attack',
        );

        expect(consumed).toBe('AberrantSorcerer');
    });
});

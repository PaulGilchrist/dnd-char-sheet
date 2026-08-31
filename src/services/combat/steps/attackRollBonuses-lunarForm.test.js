// CLA-217: Lunar Form once-per-turn re-arm regression.
// The once-per-turn gate in buildWeaponHitBonusesStep previously called
// getCurrentCombatRound() WITHOUT campaignName, so combatData returned null
// and the round resolved to a permanently-stale constant 1. usedRound was
// written 1 forever, suppressing the 2d10 Radiant bonus for the rest of the
// page session. These tests pin campaignName plumbing and round re-arm.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWeaponHitBonusesStep } from './attackRollBonuses.js';

vi.mock('../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(() => ({ total: 14, rolls: [6, 8], modifier: 0 })),
}));
vi.mock('../../encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
}));
vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(),
}));
vi.mock('../../combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn(() => null),
}));
vi.mock('../../automation/common/buffToggle.js', () => ({
    getActiveBuffs: vi.fn(() => []),
}));
vi.mock('../automation/automationExpressions.js', () => ({
    resolveDiceExpression: vi.fn((expr) => expr),
}));
vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve({})),
}));

import { getCurrentCombatRound } from '../../encounters/combatData.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const lunarBonus = {
    name: 'Lunar Form',
    type: 'damage_bonus',
    trigger: 'weapon_or_beast_form_attack_hit',
    damageExpression: '2d10',
    damageType: 'Radiant',
    oncePerTurn: true,
};

function makeCtx(overrides = {}) {
    return {
        campaignName: 'test-campaign',
        playerStats: {
            name: 'Wild_Sage_Druid',
            automation: { actions: [lunarBonus], passives: [] },
        },
        formula: '1d4-1',
        total: 0,
        rolls: [1],
        ...overrides,
    };
}

describe('CLA-217: weaponHitBonuses once-per-turn round re-arm', () => {
    let step;

    beforeEach(() => {
        vi.clearAllMocks();
        step = buildWeaponHitBonusesStep();
    });

    it('reads the combat round WITH campaignName (no stale no-arg call)', async () => {
        const ctx = makeCtx();
        await step.handler(ctx);

        expect(getCurrentCombatRound).toHaveBeenCalledWith('test-campaign');
    });

    it('applies the bonus and writes usedRound = actual combat round on first hit', async () => {
        getRuntimeValue.mockReturnValue(null);
        getCurrentCombatRound.mockReturnValue(2);

        const ctx = makeCtx();
        const result = await step.handler(ctx);

        expect(result.data.formula).toBe('1d4-1 + 2d10 [radiant]');
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Wild_Sage_Druid',
            '_Lunar_Form_usedRound',
            2,
            'test-campaign',
        );
    });

    it('re-arms on a later round: stored usedRound 1 does not suppress round 2 hit', async () => {
        getCurrentCombatRound.mockReturnValue(2);
        getRuntimeValue.mockImplementation((_key, prop) => {
            if (prop === '_Lunar_Form_usedRound') return 1;
            return null;
        });

        const ctx = makeCtx();
        const result = await step.handler(ctx);

        expect(result.data.formula).toContain('+ 2d10 [radiant]');
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Wild_Sage_Druid',
            '_Lunar_Form_usedRound',
            2,
            'test-campaign',
        );
    });

    it('still suppresses a second hit within the SAME round', async () => {
        getCurrentCombatRound.mockReturnValue(2);
        getRuntimeValue.mockImplementation((_key, prop) => {
            if (prop === '_Lunar_Form_usedRound') return 2;
            return null;
        });

        const ctx = makeCtx();
        const result = await step.handler(ctx);

        expect(result.data.formula).not.toContain('2d10');
    });
});

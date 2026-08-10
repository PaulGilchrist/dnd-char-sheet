import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollD20: vi.fn(),
    rollExpression: vi.fn(),
}));

vi.mock('../../services/ui/utils.js', () => ({
    default: {
        getName: vi.fn((n) => n || 'Unknown'),
        guid: vi.fn(() => 'test-guid-1234'),
    },
    DEBUG_FORCE_CRIT: false,
}));

vi.mock('../../services/ui/storage.js', () => ({
    default: {
        get: vi.fn(),
        set: vi.fn(),
        getProperty: vi.fn(),
        setProperty: vi.fn(),
    },
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getTargetFromAttacker: vi.fn(),
    findCreatureByName: vi.fn(() => null),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
    clearReTriggeredSequence: vi.fn(),
}));

vi.mock('../runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
    clearAllExpirationEffects: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    loadCombatSummary: vi.fn(),
    getCombatSummary: vi.fn(),
}));

vi.mock('../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(),
    getUnbreakableMajestySaveDc: vi.fn(),
    hasAttackerTriggeredMajesty: vi.fn(),
    markAttackerTriggeredMajesty: vi.fn(),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
    getEmpoweredEvocationFeatures: vi.fn(() => []),
    getEmpoweredEvocationIntModifier: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    hasIgnoreResistance: vi.fn(),
    hasGreatWeaponFighting: vi.fn(),
    applyGreatWeaponFightingToDamage: vi.fn((rolls) => rolls),
}));

vi.mock('../../services/combat/automation/automationPassives.js', () => ({
    isResilientSphereActive: vi.fn(),
}));

vi.mock('../../services/combat/auras/bardicInspirationState.js', () => ({
    hasBardicInspirationDefense: vi.fn(),
    hasBardicInspirationOffense: vi.fn(),
    getBardicInspirationDieSize: vi.fn(),
    getBardicInspirationDieSizeFromClass: vi.fn(),
}));

vi.mock('./loggedDiceRollUtils.js', () => ({
    dispatchUnbreakableMajestySave: vi.fn(),
    hasPotentCantrip: vi.fn(),
    getShieldAcBonus: vi.fn(),
    getShieldOfFaithAcBonus: vi.fn(),
    applyMinDamageAdjustment: vi.fn((d) => d),
}));

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadManeuvers: vi.fn(),
    loadWildMagicSurgeTable: vi.fn(async () => []),
}));

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/handlers/spells/forcecageHandler.js', () => ({
    isForcecageBlocked: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/spells/mazeHandler.js', () => ({
    isMazeBlocked: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/spells/banishmentHandler.js', () => ({
    isBanishmentBlocked: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/spells/imprisonmentHandler.js', () => ({
    isImprisonmentBlocked: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/spells/prismaticSprayHandler.js', () => ({
    isPrismaticSprayBlocked: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/spells/sanctuaryHandler.js', () => ({
    endSanctuary: vi.fn(),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../services/automation/common/damageRollback.js', () => ({
    addTargetResult: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/common/savePrompt.js', () => ({
    createSaveListener: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/compelledDuelHandler.js', () => ({
    checkCompelledDuelAttackExpiry: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
    getManeuversForRules: vi.fn(),
}));

import { rollD20, rollExpression } from '../../services/dice/diceRoller.js';
import utils from '../../services/ui/utils.js';
import { getTargetFromAttacker, findCreatureByName } from '../../services/rules/combat/damageUtils.js';
import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js';
import { loadCombatSummary } from '../../services/encounters/combatData.js';
import {
    isUnbreakableMajestyActive,
    hasAttackerTriggeredMajesty,
} from '../../services/combat/auras/unbreakableMajesty.js';
import {
    getShieldAcBonus,
    getShieldOfFaithAcBonus,
    applyMinDamageAdjustment,
} from './loggedDiceRollUtils.js';
import { createLogAndShow } from './useLoggedDiceRollAttack.js';
import { getManeuversForRules } from '../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js';
import {
    hasBardicInspirationDefense,
    getBardicInspirationDieSize,
} from '../../services/combat/auras/bardicInspirationState.js';

describe('createLogAndShow - Bane, Bless, Sundering Blow', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        loadCombatSummary.mockResolvedValue({ creatures: [{ name: 'Goblin', type: 'npc', ac: 12 }] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    function mockTargetEffects(effects) {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'campaign' && prop === 'targetEffects') return effects;
            return null;
        });
    }

    describe('sundering blow bonus', () => {
        it('adds +5 to hit bonus when next_attack_bonus effect exists on target', async () => {
            mockTargetEffects([
                { target: 'Goblin', effect: 'next_attack_bonus', value: '5' },
            ]);
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 22 });
            const fn = createFn();
            await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                bonus: 10,
                bonusDetail: expect.stringContaining('Sundering Blow'),
            }));
        });

        it('parses custom sundering blow value', async () => {
            mockTargetEffects([
                { target: 'Goblin', effect: 'next_attack_bonus', value: '10' },
            ]);
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 27 });
            const fn = createFn();
            await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                bonus: 15,
            }));
        });

        it('uses default 5 when value is not a number', async () => {
            mockTargetEffects([
                { target: 'Goblin', effect: 'next_attack_bonus', value: 'invalid' },
            ]);
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 22 });
            const fn = createFn();
            await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                bonus: 10,
            }));
        });
    });

    describe('bane attack penalty', () => {
        it('applies -1d4 penalty when bane_penalty effect is on attacker', async () => {
            mockTargetEffects([
                { target: 'TestFighter', effect: 'bane_penalty' },
            ]);
            rollExpression.mockReturnValue({ total: 3, rolls: [3], modifier: 0 });
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 20 });
            const fn = createFn();
            await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
            expect(rollExpression).toHaveBeenCalledWith('1d4');
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                bonus: expect.any(Number),
                bonusDetail: expect.stringContaining('Bane'),
            }));
        });

        it('applies bane penalty from target self-applied blade ward', async () => {
            mockTargetEffects([
                { target: 'Goblin', effect: 'bane_penalty', source: 'Goblin' },
            ]);
            rollExpression.mockReturnValue({ total: 2, rolls: [2], modifier: 0 });
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 20 });
            const fn = createFn();
            await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
            expect(rollExpression).toHaveBeenCalledWith('1d4');
        });

        it('does not apply bane for non-attack roll types', async () => {
            mockTargetEffects([
                { target: 'TestFighter', effect: 'bane_penalty' },
            ]);
            const fn = createFn();
            await fn('Athletics', 3, 'check', {});
            expect(rollExpression).not.toHaveBeenCalledWith('1d4');
        });
    });

    describe('bless attack bonus', () => {
        it('adds 1d4 when bless_bonus effect is on attacker', async () => {
            mockTargetEffects([
                { target: 'TestFighter', effect: 'bless_bonus' },
            ]);
            rollExpression.mockReturnValue({ total: 4, rolls: [4], modifier: 0 });
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 24 });
            const fn = createFn();
            await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
            expect(rollExpression).toHaveBeenCalledWith('1d4');
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                bonusDetail: expect.stringContaining('Bless'),
            }));
        });

        it('does not apply bless for non-attack roll types', async () => {
            mockTargetEffects([
                { target: 'TestFighter', effect: 'bless_bonus' },
            ]);
            const fn = createFn();
            await fn('Athletics', 3, 'check', {});
            expect(rollExpression).not.toHaveBeenCalledWith('1d4');
        });
    });
});

describe('createLogAndShow - Lucky feat advantage/disadvantage', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        loadCombatSummary.mockResolvedValue({ creatures: [{ name: 'Goblin', type: 'npc', ac: 12 }] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    it('applies disadvantage when target has luckyDisadvantageActive', async () => {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'Goblin' && prop === 'luckyDisadvantageActive') return true;
            return null;
        });
        rollD20.mockReturnValueOnce(9).mockReturnValueOnce(3);
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
        expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'luckyDisadvantageActive', null, 'test-campaign');
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            mode: 'disadvantage',
            total: 3,
        }));
    });

    it('applies advantage when target has luckyAdvantageActive', async () => {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'Goblin' && prop === 'luckyAdvantageActive') return true;
            return null;
        });
        rollD20.mockReturnValueOnce(3).mockReturnValueOnce(9);
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
        expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'luckyAdvantageActive', null, 'test-campaign');
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            mode: 'advantage',
            total: 9,
        }));
    });

    it('does not apply lucky feat when forcedMode is already set', async () => {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'Goblin' && prop === 'luckyDisadvantageActive') return true;
            return null;
        });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin', forcedMode: 'disadvantage' });
        expect(setRuntimeValue).not.toHaveBeenCalledWith('Goblin', 'luckyDisadvantageActive', null, 'test-campaign');
    });
});

describe('createLogAndShow - Bonus detail parts', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        loadCombatSummary.mockResolvedValue({ creatures: [{ name: 'Goblin', type: 'npc', ac: 12 }] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    function mockTargetEffects(effects) {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'campaign' && prop === 'targetEffects') return effects;
            return null;
        });
    }

    it('includes sacred weapon bonus in bonusDetail', async () => {
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', {
            targetName: 'Goblin',
            sacredWeaponBonus: 4,
        });
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            bonusDetail: expect.stringContaining('Sacred Weapon'),
        }));
    });

    it('includes cosmic omen bonus in bonusDetail', async () => {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'cosmicOmen' && prop === 'cosmicOmenPendingBonus') {
                return JSON.stringify({ type: 'Weal', value: 2 });
            }
            return null;
        });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            bonusDetail: expect.stringContaining('Weal'),
        }));
    });

    it('includes bane penalty in bonusDetail', async () => {
        mockTargetEffects([
            { target: 'TestFighter', effect: 'bane_penalty' },
        ]);
        rollExpression.mockReturnValue({ total: 3, rolls: [3], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            bonusDetail: expect.stringContaining('Bane'),
        }));
    });

    it('includes bless bonus in bonusDetail', async () => {
        mockTargetEffects([
            { target: 'TestFighter', effect: 'bless_bonus' },
        ]);
        rollExpression.mockReturnValue({ total: 4, rolls: [4], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            bonusDetail: expect.stringContaining('Bless'),
        }));
    });
});

describe('createLogAndShow - Ray of Enfeeblement', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue(null);
        loadCombatSummary.mockResolvedValue({ creatures: [] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    function mockTargetEffects(effects) {
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'campaign' && prop === 'targetEffects') return effects;
            return null;
        });
    }

    it('applies disadvantage to effectiveD20Roll when attacker has ray_of_enfeeble_debuff for STR skills', async () => {
        mockTargetEffects([
            { target: 'TestFighter', effect: 'ray_of_enfeeble_debuff', strCheckDisadvantage: true },
        ]);
        rollD20.mockReturnValueOnce(9).mockReturnValueOnce(3);
        const fn = createFn();
        await fn('Athletics', 3, 'skill', {});
        // effectiveD20Roll uses Math.min(r1, r2) = 3 for disadvantage
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            total: 3,
        }));
    });

    it('applies disadvantage for Strength ability checks', async () => {
        mockTargetEffects([
            { target: 'TestFighter', effect: 'ray_of_enfeeble_debuff', strCheckDisadvantage: true },
        ]);
        rollD20.mockReturnValueOnce(9).mockReturnValueOnce(3);
        const fn = createFn();
        await fn('Strength', 3, 'check', {});
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            total: 3,
        }));
    });

    it('does not apply disadvantage for non-STR skills', async () => {
        mockTargetEffects([
            { target: 'TestFighter', effect: 'ray_of_enfeeble_debuff', strCheckDisadvantage: true },
        ]);
        rollD20.mockReturnValueOnce(15);
        const fn = createFn();
        await fn('Stealth', 3, 'skill', {});
        // r1=15, effectiveD20Roll=15, log total = effectiveD20Roll = 15
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            total: 15,
        }));
    });
});

describe('createLogAndShow - Maneuvers loading', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue(null);
        loadCombatSummary.mockResolvedValue({ creatures: [] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
        getManeuversForRules.mockResolvedValue(undefined);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    it('loads maneuvers for skill check roll type', async () => {
        const fn = createFn();
        await fn('Athletics', 3, 'skill', {});
        expect(getManeuversForRules).toHaveBeenCalledWith('2024');
    });

    it('loads maneuvers for check roll type', async () => {
        const fn = createFn();
        await fn('Athletics', 3, 'check', {});
        expect(getManeuversForRules).toHaveBeenCalledWith('2024');
    });

    it('loads maneuvers for initiative roll type', async () => {
        const fn = createFn();
        await fn('Initiative', 3, 'initiative', {});
        expect(getManeuversForRules).toHaveBeenCalledWith('2024');
    });

    it('does not load maneuvers for attack roll type', async () => {
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        loadCombatSummary.mockResolvedValue({ creatures: [{ name: 'Goblin', type: 'npc', ac: 12 }] });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Goblin' });
        expect(getManeuversForRules).not.toHaveBeenCalled();
    });
});

describe('createLogAndShow - Bardic Inspiration Defense', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [{ name: 'Bard', computedStats: { armorClass: 14, evasionEffects: [] } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Bard', ac: 14 });
        loadCombatSummary.mockResolvedValue({ creatures: [{ name: 'Bard', type: 'player', ac: 14 }] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    function mockBardicInspiration(hasDefense, dieSize, uses) {
        hasBardicInspirationDefense.mockReturnValue(hasDefense);
        getBardicInspirationDieSize.mockReturnValue(dieSize);
        getRuntimeValue.mockImplementation((name, prop) => {
            if (name === 'Bard' && prop === 'bardicInspirationUses') return uses;
            return null;
        });
    }

    it('sets bardicInspirationDefense context when hit and target has defense', async () => {
        mockBardicInspiration(true, 'd6', 3);
        const context = {
            targetName: 'Bard',
            playerStats: { automation: { features: [{ type: 'bardic_inspiration_offense' }] } },
        };
        const fn = createFn();
        await fn('Fire Bolt', 3, 'attack', context);
        expect(context.bardicInspirationDefense).toBe(true);
        expect(context.bardicInspirationDefenseDieSize).toBe('d6');
        expect(context.bardicInspirationDefenseTargetName).toBe('Bard');
    });

    it('does not set bardicInspirationDefense when not hit', async () => {
        mockBardicInspiration(true, 'd6', 3);
        getTargetFromAttacker.mockReturnValue({ name: 'Bard', ac: 25 });
        const context = {
            targetName: 'Bard',
            playerStats: { automation: { features: [{ type: 'bardic_inspiration_offense' }] } },
        };
        const fn = createFn();
        await fn('Fire Bolt', 3, 'attack', context);
        expect(context.bardicInspirationDefense).toBe(undefined);
    });

    it('does not set bardicInspirationDefense when target has no defense', async () => {
        mockBardicInspiration(false, null, 0);
        const context = {
            targetName: 'Bard',
            playerStats: { automation: { features: [] } },
        };
        const fn = createFn();
        await fn('Fire Bolt', 3, 'attack', context);
        expect(context.bardicInspirationDefense).toBe(false);
    });
});

describe('createLogAndShow - Explicit target resolution', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        autoDamageSourceRef: { current: null },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollD20.mockReturnValue(15);
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        loadCombatSummary.mockResolvedValue({ creatures: [{ name: 'Goblin', type: 'npc', ac: 12 }] });
        isUnbreakableMajestyActive.mockReturnValue(false);
        hasAttackerTriggeredMajesty.mockReturnValue(false);
        getRuntimeValue.mockReturnValue(null);
        getShieldAcBonus.mockReturnValue(0);
        getShieldOfFaithAcBonus.mockReturnValue(0);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        utils.getName.mockImplementation((n) => n);
    });

    function createFn() {
        return createLogAndShow(deps);
    }

    it('uses findCreatureByName when explicitTargetName is provided', async () => {
        const creature = { name: 'Orc', ac: 15, type: 'npc' };
        findCreatureByName.mockReturnValue(creature);
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Orc' });
        expect(findCreatureByName).toHaveBeenCalled();
        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            targetAc: 15,
        }));
    });

    it('falls back to getTargetFromAttacker when findCreatureByName returns null', async () => {
        findCreatureByName.mockReturnValue(null);
        getTargetFromAttacker.mockReturnValue({ name: 'Goblin', ac: 12 });
        const fn = createFn();
        await fn('Longsword', 5, 'attack', { targetName: 'Orc' });
        expect(getTargetFromAttacker).toHaveBeenCalled();
    });
});

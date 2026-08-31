// CLA-218: Mage Hand Legerdemain — the conditional_advantage saveModifier
// (DEX ability_check) must only grant advantage while the spectral hand is
// being controlled (runtime flag mageHandControlled, set by
// mageHandControlHandler, cleared at next-turn start).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
    getDistanceFeet: vi.fn(() => null),
}));

vi.mock('../../services/rules/combat/rangeCheck.js', () => ({
    isDistanceInRange: vi.fn(() => true),
}));

vi.mock('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js', () => ({
    isCreatureWarded: vi.fn(() => false),
    handle: vi.fn(),
    applyProtectionFromEvilAndGood: vi.fn(),
    isProtectionFromEvilAndGoodActive: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/buffs/holyAuraHandler.js', () => ({
    getHolyAuraTargets: vi.fn(() => []),
    handle: vi.fn(),
    applyHolyAura: vi.fn(),
}));

import { computeCharConditionEffects } from './CharSheet.conditionEffects.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

const LEGERDEMAIN_MOD = {
    source: 'Mage Hand Legerdemain',
    target: 'ability_check',
    condition: 'mage_hand_legerdemain',
    effect: 'advantage',
    abilities: ['DEX'],
    skills: [],
};

function makePlayerStats() {
    return {
        name: 'ArcaneTricksterTest',
        level: 3,
        saveModifiers: [LEGERDEMAIN_MOD],
        abilities: [{ name: 'Dexterity', bonus: 3 }],
    };
}

describe('CLA-218 — Mage Hand Legerdemain Sleight of Hand advantage gate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue(null);
    });

    it('drops the legerdemain modifier (no DEX check advantage) while the hand is not controlled', () => {
        getRuntimeValue.mockImplementation((_name, prop) => {
            if (prop === 'mageHandControlled') return false;
            return null;
        });
        const { conditionEffects } = computeCharConditionEffects(
            { name: 'ArcaneTricksterTest' }, makePlayerStats(), 'test-campaign', []
        );
        expect(conditionEffects.abilityCheckAdvantageAbilities || []).not.toContain('DEX');
    });

    it('grants DEX ability check advantage while the hand is controlled', () => {
        getRuntimeValue.mockImplementation((_name, prop) => {
            if (prop === 'mageHandControlled') return true;
            return null;
        });
        const { conditionEffects } = computeCharConditionEffects(
            { name: 'ArcaneTricksterTest' }, makePlayerStats(), 'test-campaign', []
        );
        expect(conditionEffects.abilityCheckAdvantageAbilities || []).toContain('DEX');
    });
});

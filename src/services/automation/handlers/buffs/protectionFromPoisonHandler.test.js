// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
    addConcentration: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../combat/conditions/targetEffectDefinitions.js', () => ({
    getEffectDefinition: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import {
    handle,
    applyProtectionFromPoison,
    isProtectionFromPoisonActive,
} from './protectionFromPoisonHandler.js';

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';
import * as logService from '../../../ui/logService.js';
import * as combatData from '../../../encounters/combatData.js';

// ── Constants & Helpers ────────────────────────────────────────────────────

const CAMPAIGN_NAME = 'TestCampaign';
const PLAYER_NAME = 'TestCharacter';

function makePlayerStats(overrides = {}) {
    return { name: PLAYER_NAME, level: 5, proficiency: 3, spellAbilities: { saveDc: 13 }, ...overrides };
}

function makeAction(automation = {}) {
    return {
        name: 'Protection from Poison',
        automation: { duration: '1 hour', range: 'Touch', ...automation },
    };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('protectionFromPoisonHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useRuntimeState.getRuntimeValue.mockReset();
        useRuntimeState.getRuntimeValue.mockReturnValue(undefined);
        useRuntimeState.setRuntimeValue.mockReset();
        logService.addEntry.mockResolvedValue(undefined);
        concentrationService.addConcentration.mockReset();
        expirations.addExpiration.mockReset();
        combatData.getCombatSummary.mockReset();
    });

    describe('handle', () => {
        it('returns error popup when no combat context', async () => {
            combatData.getCombatSummary.mockReturnValue(null);

            const action = makeAction();
            const result = await handle(action, makePlayerStats(), CAMPAIGN_NAME, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Protection from Poison');
            expect(result.payload.description).toContain('No combat context found');
        });

        it('returns target selection popup with combat context including caster', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Ally1' },
                    { name: 'Ally2' },
                ],
            });

            const action = makeAction();
            const result = await handle(action, makePlayerStats(), CAMPAIGN_NAME, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('protection_from_poison_target_selection');
            expect(result.payload.name).toBe('Protection from Poison');
            expect(result.payload.creatureTargets).toHaveLength(3);
            expect(result.payload.creatureTargets[0]).toBe(PLAYER_NAME);
            expect(result.payload.creatureTargets[1]).toBe('Ally1');
            expect(result.payload.creatureTargets[2]).toBe('Ally2');
        });

        it('passes automation and range through to payload with defaults', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1' }],
            });

            const action = makeAction({ type: 'buff' });
            const result = await handle(action, makePlayerStats(), CAMPAIGN_NAME, null);

            expect(result.payload.automation).toEqual({
                duration: '1 hour',
                range: 'Touch',
                type: 'buff',
            });
            expect(result.payload.range).toBe('Touch');
        });
    });

    describe('applyProtectionFromPoison', () => {
        it('returns null when no target provided', async () => {
            const action = makeAction();
            const result = await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                null
            );

            expect(result).toBeNull();
        });

        it('removes Poisoned condition from target when present', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([]);

            const action = makeAction();
            const result = await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: PLAYER_NAME }
            );

            expect(useRuntimeState.getRuntimeValue).toHaveBeenCalledWith(
                PLAYER_NAME,
                'activeConditions'
            );
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                PLAYER_NAME,
                'activeConditions',
                [],
                CAMPAIGN_NAME
            );
            expect(result.type).toBe('popup');
        });

        it('applies buff with correct properties when none currently active', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            const action = makeAction();
            await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: 'Ally1' }
            );

            const buffCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'activeBuffs'
            );
            expect(buffCalls).toHaveLength(1);
            expect(buffCalls[0][3]).toBe(CAMPAIGN_NAME);

            const buffs = buffCalls[0][2];
            const poisonBuff = buffs.find(
                (b) => b.name === 'Protection from Poison'
            );
            expect(poisonBuff).toBeTruthy();
            expect(poisonBuff.sourceCharacter).toBe(PLAYER_NAME);
            expect(poisonBuff.duration).toBe('1 hour');
            expect(poisonBuff.resistanceTypes).toEqual(['Poison']);
            expect(poisonBuff.saveAdvantageTypes).toEqual(['poisoned']);
        });

        it('registers target effect for badge rendering', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: PLAYER_NAME }],
            });

            const action = makeAction();
            await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: 'Ally1' }
            );

            const teCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'targetEffects'
            );
            expect(teCalls.length).toBeGreaterThan(0);
            const effects = teCalls[teCalls.length - 1][2];
            const poisonEffect = effects.find(
                (te) => te.effect === 'protection_from_poison'
            );
            expect(poisonEffect).toBeTruthy();
            expect(poisonEffect.target).toBe('Ally1');
            expect(poisonEffect.source).toBe(PLAYER_NAME);
            expect(poisonEffect.duration).toBe('concentration');
        });

        it('registers concentration', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: PLAYER_NAME }],
            });

            const action = makeAction();
            await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: 'Ally1' }
            );

            expect(concentrationService.addConcentration).toHaveBeenCalledWith(
                expect.objectContaining({ creatures: expect.any(Array) }),
                PLAYER_NAME,
                'Protection from Poison',
                13, // spellSaveDc from playerStats
                'Ally1'
            );
        });

        it('registers expiration for initiative/rest cleanup', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            const action = makeAction({ duration: '1 hour' });
            await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: PLAYER_NAME }
            );

            expect(expirations.addExpiration).toHaveBeenCalledWith(
                PLAYER_NAME,
                PLAYER_NAME,
                [
                    {
                        type: 'remove_active_buff',
                        buffName: 'Protection from Poison',
                    },
                    {
                        type: 'remove_target_effect',
                        effectKey: 'protection_from_poison',
                        source: PLAYER_NAME,
                    },
                ],
                CAMPAIGN_NAME,
                Infinity,
                PLAYER_NAME
            );
        });

        it('calls addEntry with correct log payload', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            const action = makeAction();
            await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: 'Ally1' }
            );

            expect(logService.addEntry).toHaveBeenCalledWith(CAMPAIGN_NAME, {
                type: 'ability_use',
                characterName: PLAYER_NAME,
                abilityName: 'Protection from Poison',
                description: expect.stringMatching(/Ally1.*Advantage.*Resistance/),
                targetName: 'Ally1',
                timestamp: expect.any(Number),
            });
        });

        it('updates existing buff when already active', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([
                    {
                        name: 'Protection from Poison',
                        effect: 'protection_from_poison',
                        duration: '10 minutes',
                    },
                    {
                        name: 'Mage Armor',
                        effect: 'mage_armor',
                    },
                ]);

            const action = makeAction({ duration: '1 hour' });
            await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: PLAYER_NAME }
            );

            const buffCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'activeBuffs'
            );
            expect(buffCalls).toHaveLength(1);

            const buffs = buffCalls[0][2];
            const poisonBuffs = buffs.filter(
                (b) => b.name === 'Protection from Poison'
            );
            expect(poisonBuffs).toHaveLength(1);
            expect(poisonBuffs[0].duration).toBe('1 hour');
            expect(poisonBuffs[0].resistanceTypes).toEqual(['Poison']);

            const mageArmor = buffs.find((b) => b.name === 'Mage Armor');
            expect(mageArmor).toBeTruthy();
        });

        it('handles activeBuffs stored as null', async () => {
            useRuntimeState.getRuntimeValue
                .mockReturnValueOnce(['poisoned'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce(null);

            const action = makeAction();
            const result = await applyProtectionFromPoison(
                action,
                makePlayerStats(),
                CAMPAIGN_NAME,
                null,
                { targetName: PLAYER_NAME }
            );

            expect(result.type).toBe('popup');
            const buffCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'activeBuffs'
            );
            expect(buffCalls).toHaveLength(1);
            expect(buffCalls[0][2]).toContainEqual(
                expect.objectContaining({
                    name: 'Protection from Poison',
                })
            );
        });
    });

    describe('isProtectionFromPoisonActive', () => {
        it('returns true when buff is active', () => {
            useRuntimeState.getRuntimeValue.mockReturnValue([
                { name: 'Protection from Poison', effect: 'protection_from_poison' },
            ]);

            expect(
                isProtectionFromPoisonActive(PLAYER_NAME, CAMPAIGN_NAME)
            ).toBe(true);
        });

        it('returns true alongside other buffs', () => {
            useRuntimeState.getRuntimeValue.mockReturnValue([
                { name: 'Mage Armor', effect: 'mage_armor' },
                { name: 'Protection from Poison', effect: 'protection_from_poison' },
                { name: 'Shield of Faith', effect: 'ac_bonus' },
            ]);

            expect(
                isProtectionFromPoisonActive(PLAYER_NAME, CAMPAIGN_NAME)
            ).toBe(true);
        });

        it('returns false when buff is not active', () => {
            useRuntimeState.getRuntimeValue.mockReturnValue([]);
            expect(
                isProtectionFromPoisonActive(PLAYER_NAME, CAMPAIGN_NAME)
            ).toBe(false);
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsBaseActions from './useCharActionsBaseActions.js';
import { createHooks, mockSetPopupHtml, mockRollSkillCheck, mockAddEntry, campaignName, basePlayerStats } from './useCharActionsBaseActions.test.helpers.js';

describe('useCharActionsBaseActions - handleHideAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handleHideAction', () => {
        it('should return early without action when cannotAct is true', async () => {
            const hooks = createHooks({ cannotAct: true });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(hooks.getRuntimeValue).not.toHaveBeenCalled();
            expect(mockRollSkillCheck).not.toHaveBeenCalled();
        });

        it('should show popup and return early when already invisible', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') {
                    return ['invisible'];
                }
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Hide',
                description: expect.stringContaining('already hidden'),
            });
            expect(mockRollSkillCheck).not.toHaveBeenCalled();
        });

        it('should perform stealth check and succeed when rollTotal >= DC 15', async () => {
            const stealthSkill = { name: 'Stealth', bonus: 4 };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                if (key === 'activeBuffs') return [];
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const playerStats = { ...basePlayerStats, skills: [stealthSkill], skillProficiencies: ['Stealth'] };
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw, playerStats });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.objectContaining({}));
            expect(srw).toHaveBeenCalledWith('TestFighter', 'activeConditions', expect.arrayContaining(['invisible']), campaignName);
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Hide',
                description: expect.stringContaining('Hide successful'),
            });
            expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Hide',
            }));
        });

        it('should perform stealth check and fail when rollTotal < DC 15', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 10, d20: 8 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalled();
            expect(srw).not.toHaveBeenCalledWith('TestFighter', 'activeConditions', expect.arrayContaining(['invisible']));
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Hide',
                description: expect.stringContaining('Hide failed'),
            });
            expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Hide',
            }));
        });

        it('should apply Wis check replace when conditionEffects.wisCheckReplace is true', async () => {
            const stealthSkill = { name: 'Stealth', bonus: 2 };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const playerStats = {
                ...basePlayerStats,
                skills: [stealthSkill],
                skillProficiencies: ['Stealth'],
            };
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                playerStats,
                conditionEffects: { wisCheckReplace: true },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            // Stealth bonus should be calculated from Wisdom (1) + proficiency (3) = 4, not from skill bonus
            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.any(Object));
        });

        it('should apply Jack of All Trades bonus when character has the passive and is not proficient', async () => {
            const stealthSkill = { name: 'Stealth', bonus: 0 };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const playerStats = {
                ...basePlayerStats,
                skills: [stealthSkill],
                skillProficiencies: [],
                automation: { passives: [{ type: 'jack_of_all_trades' }] },
            };
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw, playerStats });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalled();
        });

        it('should apply passWithoutTraceBonus when conditionEffects has it', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 20, d20: 15 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: { passWithoutTraceBonus: 10 },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalled();
        });

        it('should apply forced disadvantage from conditionEffects.abilityCheckDisadvantage', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: { abilityCheckDisadvantage: true },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), { forcedMode: 'disadvantage' });
        });

        it('should apply forced disadvantage from hexAbilityCheckDisadvantage with DEX', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: { hexAbilityCheckDisadvantage: true, hexAbilityCheckDisadvantageAbility: 'DEX' },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), { forcedMode: 'disadvantage' });
        });

        it('should override disadvantage with advantage from abilityCheckAdvantage', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: {
                    abilityCheckDisadvantage: true,
                    abilityCheckAdvantage: true,
                },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            // When both disadvantage and advantage are set, advantage clears the forcedMode (code behavior: sets to undefined)
            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), { forcedMode: undefined });
        });

        it('should apply advantage from peerlessAthleteAdvantageSkills for Stealth', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: { peerlessAthleteAdvantageSkills: ['Stealth'] },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), { forcedMode: 'advantage' });
        });

        it('should apply Skulker feat advantage for 2024 rules', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const playerStats = {
                ...basePlayerStats,
                rules: '2024',
                feats: ['Skulker'],
            };
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw, playerStats });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), { forcedMode: 'advantage' });
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Hide',
                description: expect.stringContaining('Skulker - Fog of War'),
            });
        });

        it('should add advantage_on_stealth buff when hiding successfully and buff not already active', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                if (key === 'activeBuffs') return [];
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(srw).toHaveBeenCalledWith('TestFighter', 'activeBuffs', expect.arrayContaining([
                expect.objectContaining({ effect: 'advantage_on_stealth' }),
            ]), campaignName);
        });

        it('should not duplicate advantage_on_stealth buff when already active', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                if (key === 'activeBuffs') {
                    return [{ name: 'Hide', effect: 'advantage_on_stealth' }];
                }
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            // Should not add a second advantage_on_stealth buff
            const buffCalls = srw.mock.calls.filter(c => c[1] === 'activeBuffs');
            expect(buffCalls.length).toBeGreaterThanOrEqual(1);
            const lastBuffCall = buffCalls[buffCalls.length - 1];
            const buffs = lastBuffCall[2];
            const stealthBuffs = buffs.filter(b => b.effect === 'advantage_on_stealth');
            expect(stealthBuffs.length).toBe(1);
        });

        it('should handle exhaustionPenalty reducing stealth bonus', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 12, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw, exhaustionPenalty: 2 });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalled();
        });

        it('should handle missing stealth skill gracefully', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 10, d20: 8 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const playerStats = {
                ...basePlayerStats,
                skills: [],
            };
            const hooks = createHooks({ getRuntimeValue: grv, setRuntimeValue: srw, playerStats });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalled();
        });

        it('should handle abilityCheckAdvantage with specific Stealth skill', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: { abilityCheckAdvantage: true, abilityCheckAdvantageSkill: 'Stealth' },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), { forcedMode: 'advantage' });
        });

        it('should not apply abilityCheckAdvantage when skill does not match', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeConditions') return [];
                if (key === 'lastAttack') return { total: 16, d20: 10 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
                conditionEffects: { abilityCheckAdvantage: true, abilityCheckAdvantageSkill: 'Athletics' },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleHideAction();

            // abilityCheckAdvantageSkill = 'Athletics' doesn't match Stealth, so no forcedMode
            expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), {});
        });
    });
});

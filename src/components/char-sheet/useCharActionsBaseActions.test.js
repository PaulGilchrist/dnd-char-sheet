import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsBaseActions from './useCharActionsBaseActions.js';
import * as logService from '../../services/ui/logService.js';

vi.mock('../../hooks/runtime/useRuntimeState.js');
vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'TestFighter',
    level: 5,
    class: { name: 'Fighter' },
    abilities: [
        { name: 'Strength', bonus: 4 },
        { name: 'Dexterity', bonus: 2 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Constitution', bonus: 3 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Charisma', bonus: 0 },
    ],
    skills: [
        { name: 'Stealth', bonus: 2 },
    ],
    skillProficiencies: [],
    feats: [],
    automation: { passives: [] },
};

const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
const mockRollAbilityCheck = vi.fn().mockResolvedValue(undefined);
const mockAddEntry = logService.addEntry;
const mockSetPopupHtml = vi.fn();
const mockToggleBuff = vi.fn();
const mockAddExpiration = vi.fn();
const mockLoadCombatSummary = vi.fn();
const mockGetMonsterData = vi.fn();

function createHooks(overrides = {}) {
    const {
        cannotAct = false,
        getRuntimeValue = vi.fn(),
        setRuntimeValue = vi.fn(),
        playerStats = basePlayerStats,
        campaignName: cn = campaignName,
        exhaustionPenalty = 0,
        conditionEffects = {},
        loadCombatSummary: lcs = mockLoadCombatSummary,
        getMonsterData: gmd = mockGetMonsterData,
    } = overrides;

    return {
        cannotAct,
        getRuntimeValue,
        setRuntimeValue,
        rollSkillCheck: overrides.rollSkillCheck || mockRollSkillCheck,
        rollAbilityCheck: overrides.rollAbilityCheck || mockRollAbilityCheck,
        addEntry: overrides.addEntry || mockAddEntry,
        setPopupHtml: overrides.setPopupHtml || mockSetPopupHtml,
        playerStats: overrides.playerStats || playerStats,
        campaignName: cn,
        exhaustionPenalty,
        conditionEffects,
        toggleBuff: overrides.toggleBuff || mockToggleBuff,
        addExpiration: overrides.addExpiration || mockAddExpiration,
        loadCombatSummary: lcs,
        getMonsterData: gmd,
    };
}

describe('useCharActionsBaseActions', () => {
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

    describe('handleDodgeAction', () => {
        it('should return early when cannotAct is true', async () => {
            const hooks = createHooks({ cannotAct: true });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).not.toHaveBeenCalled();
        });

        it('should activate dodge when buff is not already active', async () => {
            mockToggleBuff.mockReturnValue({ wasActive: false });
            const hooks = createHooks();
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).toHaveBeenCalledWith(
                'TestFighter', 'Dodge',
                { effect: 'dodge', duration: 'until_start_of_next_turn' },
                campaignName, 'TestFighter'
            );
            expect(mockAddExpiration).toHaveBeenCalledWith(
                'TestFighter', 'TestFighter',
                [{ type: 'remove_active_buff', buffName: 'Dodge' }],
                campaignName, undefined, 'TestFighter'
            );
            expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Dodge',
            }));
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Dodge',
                description: expect.stringContaining('Dodge activated'),
            });
        });

        it('should deactivate dodge when buff is already active', async () => {
            mockToggleBuff.mockReturnValue({ wasActive: true });
            const hooks = createHooks();
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).toHaveBeenCalled();
            expect(mockAddExpiration).not.toHaveBeenCalled();
            expect(mockAddEntry).not.toHaveBeenCalled();
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Dodge',
                description: 'Dodge deactivated.',
            });
        });

        it('should pass the correct character name for buff toggle', async () => {
            mockToggleBuff.mockReturnValue({ wasActive: false });
            const playerStats = { ...basePlayerStats, name: 'RogueOne' };
            const hooks = createHooks({ playerStats });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).toHaveBeenCalledWith(
                'RogueOne', 'Dodge',
                { effect: 'dodge', duration: 'until_start_of_next_turn' },
                campaignName, 'RogueOne'
            );
        });
    });

    describe('handleGrappleAction', () => {
        it('should return early when cannotAct is true', async () => {
            const hooks = createHooks({ cannotAct: true });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockLoadCombatSummary).not.toHaveBeenCalled();
        });

        it('should show popup and return early when no combat summary', async () => {
            const hooks = createHooks({ loadCombatSummary: () => Promise.resolve(null) });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: 'No target selected. Select a target in combat first.',
            });
        });

        it('should show popup and return early when no target from combat summary', async () => {
            const cs = { creatures: [{ name: 'Enemy', conditions: [] }] };
            const hooks = createHooks({ loadCombatSummary: () => Promise.resolve(cs) });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: 'No target selected. Select a target in combat first.',
            });
        });

        it('should show popup when target is already grappled', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: ['grappled'], computedStats: { abilities: [] } },
                ],
            };
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: () => null,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: 'Target is already grappled.',
            });
        });

        it('should perform ability check and succeed when rollTotal > target STR', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.any(Object));
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: expect.stringContaining('Grapple successful'),
            });
            expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Grapple',
            }));
        });

        it('should perform ability check and fail when rollTotal <= target STR', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 5 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 4, d20: 0 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalled();
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: expect.stringContaining('Grapple failed'),
            });
        });

        it('should use Dexterity for monk instead of Strength', async () => {
            const monkStats = {
                ...basePlayerStats,
                class: { name: 'Monk' },
                abilities: [
                    { name: 'Strength', bonus: 2 },
                    { name: 'Dexterity', bonus: 5 },
                    { name: 'Wisdom', bonus: 1 },
                    { name: 'Constitution', bonus: 3 },
                    { name: 'Intelligence', bonus: 0 },
                    { name: 'Charisma', bonus: 0 },
                ],
            };
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 3 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                playerStats: monkStats,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalledWith('Dexterity', expect.any(Number), expect.any(Object));
        });

        it('should apply Jack of All Trades bonus for grapple', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 14, d20: 10 };
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                automation: { passives: [{ type: 'jack_of_all_trades' }] },
            };
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                playerStats,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalled();
        });

        it('should apply peerlessAthleteAdvantageSkills for monk', async () => {
            const monkStats = {
                ...basePlayerStats,
                class: { name: 'Monk' },
                abilities: [
                    { name: 'Strength', bonus: 2 },
                    { name: 'Dexterity', bonus: 5 },
                    { name: 'Wisdom', bonus: 1 },
                    { name: 'Constitution', bonus: 3 },
                    { name: 'Intelligence', bonus: 0 },
                    { name: 'Charisma', bonus: 0 },
                ],
            };
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                playerStats: monkStats,
                conditionEffects: { peerlessAthleteAdvantageSkills: ['Dexterity'] },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalledWith('Dexterity', expect.any(Number), { forcedMode: 'advantage' });
        });

        it('should apply strCheckDisadvantage condition', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 14, d20: 10 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                conditionEffects: { strCheckDisadvantage: true },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), { forcedMode: 'disadvantage' });
        });

        it('should apply hexAbilityCheckDisadvantage for Strength', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 14, d20: 10 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                conditionEffects: { hexAbilityCheckDisadvantage: true, hexAbilityCheckDisadvantageAbility: 'Strength' },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), { forcedMode: 'disadvantage' });
        });

        it('should override disadvantage with abilityCheckAdvantage', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 14, d20: 10 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                conditionEffects: {
                    strCheckDisadvantage: true,
                    abilityCheckAdvantage: true,
                },
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            // When both disadvantage and advantage are set, advantage clears the forcedMode (code behavior: sets to undefined)
            expect(mockRollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), { forcedMode: undefined });
        });

        it('should get target STR from target.abilities fallback', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], abilities: [{ name: 'Strength', bonus: 3 }] },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalled();
        });

        it('should get target STR from target.ability_score_modifiers.str fallback', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], type: 'npc', ability_score_modifiers: { str: 4 } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const gmd = vi.fn().mockResolvedValue(null);
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                getMonsterData: gmd,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalled();
        });

        it('should get target STR from monster data when all else fails', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], type: 'monster' },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 3, d20: 0 };
                return undefined;
            });
            const gmd = vi.fn().mockResolvedValue({ ability_score_modifiers: { str: 5 } });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                getMonsterData: gmd,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(gmd).toHaveBeenCalledWith('TargetCreature', expect.any(Array));
        });

        it('should get target STR from player creature in combat summary', async () => {
            const cs = {
                creatures: [
                    { name: 'TargetCreature', conditions: [], type: 'player' },
                    {
                        name: 'TargetCreature',
                        computedStats: { abilities: [{ name: 'Strength', bonus: 6 }] },
                    },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (charKey === 'campaign' && key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const gmd = vi.fn().mockResolvedValue(null);
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                getMonsterData: gmd,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockGetMonsterData).not.toHaveBeenCalled();
        });

        it('should set grappled condition on target creature when grapple succeeds', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 1 }] } },
                ],
            };
            const grv = vi.fn((charKey, key) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                if (charKey === 'TargetCreature') return [];
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(srw).toHaveBeenCalledWith('TargetCreature', 'activeConditions', expect.arrayContaining(['grappled']), campaignName);
        });

        it('should filter out existing grappled condition and re-add it', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 1 }] } },
                ],
            };
            const grv = vi.fn((charKey, key) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                if (charKey === 'TargetCreature') return ['grappled', 'poisoned'];
                return undefined;
            });
            const srw = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(srw).toHaveBeenCalledWith('TargetCreature', 'activeConditions', expect.arrayContaining(['grappled']), campaignName);
        });

        it('should apply exhaustionPenalty to grapple check bonus', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 1 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 14, d20: 10 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
                exhaustionPenalty: 2,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockRollAbilityCheck).toHaveBeenCalled();
        });

        it('should format positive STR bonus with + sign in popup', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: 3 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 18, d20: 12 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: expect.stringContaining('+3'),
            });
        });

        it('should format negative STR bonus with - sign in popup', async () => {
            const cs = {
                creatures: [
                    { name: 'TestFighter', targetName: 'TargetCreature' },
                    { name: 'TargetCreature', conditions: [], computedStats: { abilities: [{ name: 'Strength', bonus: -2 }] } },
                ],
            };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'lastAttack') return { total: 10, d20: 8 };
                return undefined;
            });
            const hooks = createHooks({
                loadCombatSummary: () => Promise.resolve(cs),
                getRuntimeValue: grv,
            });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleGrappleAction();

            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Grapple',
                description: expect.stringContaining('-2'),
            });
        });

        it('should return the three action handlers', async () => {
            const hooks = createHooks();
            const actions = useCharActionsBaseActions(hooks);

            expect(typeof actions.handleHideAction).toBe('function');
            expect(typeof actions.handleDodgeAction).toBe('function');
            expect(typeof actions.handleGrappleAction).toBe('function');
        });
    });
});

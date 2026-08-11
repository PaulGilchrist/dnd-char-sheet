import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';

vi.mock('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js', () => ({
    onSpellSelected: vi.fn(),
    onDivineInterventionSpellSelected: vi.fn(),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
    executeSpellCast: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../services/character/classFeatures.js', () => ({
    getClassFeatures: vi.fn(),
}));

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'TestFighter',
    level: 5,
    class: { class_levels: [{ level: 5, focus_points: 2 }] },
    abilities: [
        { name: 'Strength', bonus: 4 },
        { name: 'Dexterity', bonus: 2 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Constitution', bonus: 3 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Charisma', bonus: 0 },
    ],
    skills: [],
    feats: [],
    automation: { passives: [] },
};

function createHooks(overrides = {}) {
    const {
        cannotAct = false,
        getRuntimeValue: customGRV,
        setRuntimeValue: customSRV,
        playerStats = basePlayerStats,
        campaignName: cn = campaignName,
        activeBuffs = [],
        focusPoints = 3,
        rollDamage: customRollDamage,
        rollAttack: customRollAttack,
        executeHandler: customExecuteHandler,
        addEntry: customAddEntry,
        setPopupHtml: customSetPopupHtml,
        setModalState: customSetModalState,
        onBuffsChange: customOnBuffsChange,
    } = overrides;

    const baseGRV = vi.fn((charKey, key, _cn) => {
        if (key === 'activeBuffs') return activeBuffs;
        if (key === 'focusPoints') return focusPoints;
        if (key === 'lastActionSpellCast') return null;
        return undefined;
    });

    const grv = customGRV || baseGRV;
    const srw = customSRV || vi.fn();

    return {
        cannotAct,
        getRuntimeValue: grv,
        setRuntimeValue: srw,
        rollDamage: customRollDamage || vi.fn(),
        rollAttack: customRollAttack || vi.fn(),
        executeHandler: customExecuteHandler || vi.fn(),
        addEntry: customAddEntry || vi.fn().mockResolvedValue(undefined),
        setPopupHtml: customSetPopupHtml || vi.fn(),
        setModalState: customSetModalState || vi.fn(),
        modalState: overrides.modalState || {},
        playerStats,
        campaignName: cn,
        mapName: overrides.mapName || 'test-map',
        characters: overrides.characters || [],
        onBuffsChange: customOnBuffsChange || vi.fn(),
    };
}

describe('useCharActionsAutomation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handleAutomationAction - early returns', () => {
        it('should return early when cannotAct is true', async () => {
            const hooks = createHooks({ cannotAct: true });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction' };
            await handleAutomationAction(action);

            expect(hooks.getRuntimeValue).not.toHaveBeenCalled();
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should return early when focus points are 0 for monk ki feature', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'focusPoints') return 0;
                return undefined;
            });
            const hooks = createHooks({
                playerStats: { ...basePlayerStats, class: { class_levels: [{ level: 5, focus_points: 2 }] } },
                getRuntimeValue: grv,
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows' };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith(
                '<b>Flurry of Blows</b><br/>No ki points remaining.'
            );
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should return early when focus points are 0 for 2024 rules', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'focusPoints') return 0;
                return undefined;
            });
            const monkStats = {
                ...basePlayerStats,
                rules: '2024',
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats: monkStats,
                getRuntimeValue: grv,
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows' };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith(
                '<b>Flurry of Blows</b><br/>No Focus Points remaining.'
            );
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should skip FP cost when Flurry of Healing and Harm is active for Hand of Healing', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                specialActions: [{ name: 'Flurry of Healing and Harm' }],
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats,
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Hand of Healing', automation: {} };
            await handleAutomationAction(action);

            expect(srw).not.toHaveBeenCalledWith(
                'TestFighter',
                'focusPoints',
                expect.any(Number)
            );
        });

        it('should skip FP cost when Flurry of Healing and Harm is active for Flurry of Blows', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                specialActions: [{ name: 'Flurry of Healing and Harm' }],
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats,
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows', automation: {} };
            await handleAutomationAction(action);

            expect(srw).not.toHaveBeenCalledWith(
                'TestFighter',
                'focusPoints',
                expect.any(Number)
            );
        });

        it('should skip FP cost when Cloak of Shadows is active for Flurry of Blows', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const hooks = createHooks({
                activeBuffs: [{ effect: 'cloak_of_shadows' }],
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows', automation: {} };
            await handleAutomationAction(action);

            expect(srw).not.toHaveBeenCalledWith(
                'TestFighter',
                'focusPoints',
                expect.any(Number)
            );
        });

        it('should NOT skip FP cost when Flurry of Healing and Harm is active but action is not Hand of Healing or Flurry of Blows', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                specialActions: [{ name: 'Flurry of Healing and Harm' }],
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats,
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Patient Defense', automation: {} };
            await handleAutomationAction(action);

            expect(srw).toHaveBeenCalledWith('TestFighter', 'focusPoints', 2, campaignName);
        });

        it('should decrement focus points for monk ki features', async () => {
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Stunning Strike', automation: {} };
            await handleAutomationAction(action);

            expect(srw).toHaveBeenCalledWith('TestFighter', 'focusPoints', 2, campaignName);
        });

        it('should dispatch focus-points-updated event when spending focus points', async () => {
            const dispatchEvent = vi.spyOn(window, 'dispatchEvent');
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Stunning Strike', automation: {} };
            await handleAutomationAction(action);

            expect(dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
            dispatchEvent.mockRestore();
        });
    });

    describe('handleAutomationAction - trigger conditions', () => {
        it('should show popup when trigger is after_casting_action_spell and no last action spell cast', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'lastActionSpellCast') return null;
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { trigger: 'after_casting_action_spell' } };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith(
                '<b>TestAction</b><br/>You must cast a spell with a casting time of an action first.'
            );
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should clear lastActionSpellCast and proceed when trigger is after_casting_action_spell and spell was cast', async () => {
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'lastActionSpellCast') return 'Cure Wounds';
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { trigger: 'after_casting_action_spell' } };
            await handleAutomationAction(action);

            expect(srw).toHaveBeenCalledWith('TestFighter', 'lastActionSpellCast', 0, campaignName);
            expect(hooks.executeHandler).toHaveBeenCalled();
        });
    });

    describe('handleAutomationAction - damage_bonus with options', () => {
        it('should show modal when damage_bonus has options and no choice made yet', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_Test_Action_option') return null;
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = {
                name: 'Test Action',
                automation: { type: 'damage_bonus', options: ['Option A', 'Option B'] },
            };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                featureChoice: {
                    action,
                    options: ['Option A', 'Option B'],
                    optionKey: '_Test_Action_option',
                },
            });
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should proceed when damage_bonus has options and a choice was already made', async () => {
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_Test_Action_option') return 'Option A';
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const action = {
                name: 'Test Action',
                automation: { type: 'damage_bonus', options: ['Option A', 'Option B'] },
            };
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            await handleAutomationAction(action);

            expect(hooks.executeHandler).toHaveBeenCalled();
        });
    });

    describe('handleAutomationAction - defensive_tactics', () => {
        it('should show modal when defensive_tactics type and no choice made yet', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_Defensive_Tactics_choice') return null;
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = {
                name: 'Defensive Tactics',
                automation: { type: 'defensive_tactics' },
            };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                featureChoice: {
                    action,
                    options: ['Escape the Horde', 'Multiattack Defense'],
                    optionKey: '_Defensive_Tactics_choice',
                },
            });
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });
    });

    describe('handleAutomationAction - result types', () => {
        it('should handle popup result type', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: '<b>Test</b>' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith('<b>Test</b>');
        });

        it('should handle notify_buffs_changed result type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'notify_buffs_changed' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(onBuffsChange).toHaveBeenCalled();
        });

        it('should call onBuffsChange when popup with temp_buff type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { type: 'temp_buff' } };
            await handleAutomationAction(action);

            expect(onBuffsChange).toHaveBeenCalled();
        });

        it('should call onBuffsChange when popup with combat_stance type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { type: 'combat_stance' } };
            await handleAutomationAction(action);

            expect(onBuffsChange).toHaveBeenCalled();
        });

        it('should NOT call onBuffsChange when popup without temp_buff or combat_stance type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { type: 'other' } };
            await handleAutomationAction(action);

            expect(onBuffsChange).not.toHaveBeenCalled();
        });

        it('should handle roll result type with damage', async () => {
            const rollDamage = vi.fn();
            const hooks = createHooks({ rollDamage });
            hooks.executeHandler.mockResolvedValue({
                type: 'roll',
                payload: {
                    rollType: 'damage',
                    name: 'Test Damage',
                    formula: '2d6+3',
                    total: 10,
                    rolls: [3, 7],
                    modifier: 3,
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(rollDamage).toHaveBeenCalledWith(
                'Test Damage',
                '2d6+3',
                10,
                [3, 7],
                3,
                {}
            );
        });

        it('should handle attack_roll result type', async () => {
            const rollAttack = vi.fn();
            const hooks = createHooks({ rollAttack });
            hooks.executeHandler.mockResolvedValue({
                type: 'attack_roll',
                payload: {
                    attack: {
                        name: 'Test Attack',
                        hitBonus: 6,
                        autoDamageFormula: '1d4',
                        autoDamageName: 'Test Attack Damage',
                        damageType: 'Slashing',
                    },
                    targetName: 'Enemy',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(rollAttack).toHaveBeenCalledWith(
                'Test Attack',
                6,
                expect.objectContaining({
                    targetName: 'Enemy',
                    autoDamageFormula: '1d4',
                    autoDamageName: 'Test Attack Damage',
                    damageType: 'Slashing',
                })
            );
        });

        it('should handle attack_roll with missing autoDamage fields using defaults', async () => {
            const rollAttack = vi.fn();
            const hooks = createHooks({ rollAttack });
            hooks.executeHandler.mockResolvedValue({
                type: 'attack_roll',
                payload: {
                    attack: { name: 'Test Attack', hitBonus: 6 },
                    targetName: 'Enemy',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(rollAttack).toHaveBeenCalledWith(
                'Test Attack',
                6,
                expect.objectContaining({
                    targetName: 'Enemy',
                    autoDamageFormula: null,
                    autoDamageName: 'Test Attack',
                    damageType: 'Slashing',
                })
            );
        });

        it('should log entries when result has logEntries', async () => {
            const addEntry = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({ addEntry });
            hooks.executeHandler.mockResolvedValue({
                type: 'popup',
                payload: 'done',
                logEntries: [
                    { type: 'ability_use', abilityName: 'Test' },
                ],
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(addEntry).toHaveBeenCalledWith(campaignName, { type: 'ability_use', abilityName: 'Test' });
        });

        it('should handle executeHandler returning null', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue(null);
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).not.toHaveBeenCalled();
            expect(hooks.setModalState).not.toHaveBeenCalled();
        });
    });

    describe('handleAutomationAction - modal cases', () => {
        it('should handle healingPool modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'healingPool',
                payload: { amount: 5 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ healingPoolModal: { amount: 5 } });
        });

        it('should handle handOfHealing modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'handOfHealing',
                payload: { amount: 3 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ handOfHealingModal: { amount: 3 } });
        });

        it('should handle fontOfMagic modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fontOfMagic',
                payload: {},
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ fontOfMagicModal: true });
        });

        it('should handle resourcePool modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'resourcePool',
                payload: { type: 'spell_slots' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ resourcePoolModal: { type: 'spell_slots' } });
        });

        it('should handle setCondition modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'setCondition',
                payload: { condition: 'blinded' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ setConditionModal: { condition: 'blinded' } });
        });

        it('should handle attackRider modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'attackRider',
                payload: { rider: 'extra_damage' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ attackRiderModal: { rider: 'extra_damage' } });
        });

        it('should handle openHandTechnique modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'openHandTechnique',
                payload: { option: 'shove' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ openHandTechniqueModal: { option: 'shove' } });
        });

        it('should handle shieldBash modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'shieldBash',
                payload: { target: 'enemy1' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ shieldBashModal: { target: 'enemy1' } });
        });

        it('should handle quiveringPalm modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'quiveringPalm',
                payload: { duration: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ quiveringPalmModal: { duration: 10 } });
        });

        it('should handle combatStance modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'combatStance',
                payload: { stance: 'berserker' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ combatStanceModal: { stance: 'berserker' } });
        });

        it('should handle teleport modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'teleport',
                payload: { destination: 'room2' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ teleportModal: { destination: 'room2' } });
        });

        it('should handle invokeDuplicity modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'invokeDuplicity',
                payload: { count: 2 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ invokeDuplicityModal: { count: 2 } });
        });

        it('should handle saveAttackHeal modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'saveAttackHeal',
                payload: { healAmount: 5 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ saveAttackHealModal: { healAmount: 5 } });
        });

        it('should handle saveAttackAoe modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'saveAttackAoe',
                payload: { radius: 15 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ saveAttackAoeModal: { radius: 15 } });
        });

        it('should handle aoeCondition modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'aoeCondition',
                payload: { condition: 'frightened' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ aoeConditionModal: { condition: 'frightened' } });
        });

        it('should handle elementalAttunement modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalAttunement',
                payload: { type: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elementalAttunementModal: { type: 'fire' } });
        });

        it('should handle divineIntervention modal', async () => {
            const hooks = createHooks();
            const action = { name: 'Divine Intervention' };
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'divineIntervention',
                payload: { options: ['smite', 'teleport'] },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                divineInterventionAction: action,
                divineInterventionModal: { options: ['smite', 'teleport'] },
            });
        });

        it('should handle moonlightStepResource modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'moonlightStepResource',
                payload: { resource: 'mistyStep' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ moonlightStepResourceModal: { resource: 'mistyStep' } });
        });

        it('should handle starryFormConstellation modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'starryFormConstellation',
                payload: { shape: 'arrow' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ starryFormConstellationModal: { shape: 'arrow' } });
        });

        it('should handle arcaneCharge modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'arcaneCharge',
                payload: { type: 'bolt' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ arcaneChargeModal: { type: 'bolt' } });
        });

        it('should handle warMagicCantrip modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'warMagicCantrip',
                payload: { cantrip: 'lightningBoLt' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ warMagicCantripModal: { cantrip: 'lightningBoLt' } });
        });

        it('should handle sacredWeaponDamageType modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'sacredWeaponDamageType',
                payload: { type: 'radiant' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ sacredWeaponModal: { type: 'radiant' } });
        });

        it('should handle primalCompanionBonusActionCommand modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'primalCompanionBonusActionCommand',
                payload: { command: 'attack' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ primalCompanionBonusActionModal: { command: 'attack' } });
        });

        it('should handle primalCompanionSummon modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'primalCompanionSummon',
                payload: { companion: 'bear' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ primalCompanionSummonModal: { companion: 'bear' } });
        });

        it('should handle wildMagicSurge modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'wildMagicSurge',
                payload: { surge: 'teleport' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ wildMagicSurgeModal: { surge: 'teleport' } });
        });

        it('should handle weaponMasteryChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'weaponMasteryChoice',
                payload: { choice: 'push' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ weaponMasteryChoiceModal: { choice: 'push' } });
        });

        it('should handle bendFateChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bendFateChoice',
                payload: { option: 'reroll' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bendFateModal: { option: 'reroll' } });
        });

        it('should handle thirdEye modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'thirdEye',
                payload: { vision: 'truesight' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ thirdEyeModal: { vision: 'truesight' } });
        });

        it('should handle soulstitchSpells modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'soulstitchSpells',
                payload: { spell: 'magicMissile' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ soulstitchSpellsModal: { spell: 'magicMissile' } });
        });

        it('should handle illusoryReality modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'illusoryReality',
                payload: { effect: 'healing' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ illusoryRealityModal: { effect: 'healing' } });
        });

        it('should handle celestialRevelation modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'celestialRevelation',
                payload: { ability: 'healingHands' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ celestialRevelationModal: { ability: 'healingHands' } });
        });

        it('should handle fiendishResilience modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishResilience',
                payload: {
                    action: { name: 'Fiendish Resilience' },
                    damageTypes: ['Fire'],
                    existingType: 'Fire',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                fiendishResilienceModal: {
                    action: { name: 'Fiendish Resilience' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Fire'],
                    existingType: 'Fire',
                },
            });
        });

        it('should handle dragonCompanion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'dragonCompanion',
                payload: { dragon: 'red' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ dragonCompanionModal: { dragon: 'red' } });
        });

        it('should handle weaponKindMastery modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'weaponKindMastery',
                payload: { kind: 'melee' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ weaponKindMasteryModal: { kind: 'melee' } });
        });

        it('should handle combatSuperiority modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'combatSuperiority',
                payload: { maneuver: 'precisionAttack' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ combatSuperiorityModal: { maneuver: 'precisionAttack' } });
        });

        it('should handle sweepingAttackTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'sweepingAttackTarget',
                payload: { target: 'enemy2' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ sweepingAttackTargetModal: { target: 'enemy2' } });
        });

        it('should handle baitAndSwitchChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'baitAndSwitchChoice',
                payload: { choice: 'switch' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ baitAndSwitchChoiceModal: { choice: 'switch' } });
        });

        it('should handle bulwarkOfForce modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bulwarkOfForceTarget',
                payload: { target: 'ally1' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bulwarkOfForceModal: { target: 'ally1' } });
        });

        it('should handle zealousPresenceTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'zealousPresenceTarget',
                payload: { target: 'ally2' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ zealousPresenceModal: { target: 'ally2' } });
        });

        it('should handle clockworkCavalcade modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'clockworkCavalcade',
                payload: { effect: 'dispel' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ clockworkCavalcadeModal: { effect: 'dispel' } });
        });

        it('should handle naturesSanctuaryCreatures modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'naturesSanctuaryCreatures',
                payload: { creature: 'goblin1' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: { creature: 'goblin1' } });
        });

        it('should handle coronaEnemySelection modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'coronaEnemySelection',
                payload: { enemy: 'darkLord' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ coronaEnemySelectionModal: { enemy: 'darkLord' } });
        });

        it('should handle radianceOfDawn modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'radianceOfDawn',
                payload: { radius: 15 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ radianceOfDawnModal: { radius: 15 } });
        });

        it('should handle mantleOfInspirationTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'mantleOfInspirationTarget',
                payload: { target: 'ally3' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ mantleOfInspirationTarget: { target: 'ally3' } });
        });

        it('should handle vitalitYOfTheTreeTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'vitalityOfTheTreeTarget',
                payload: { target: 'ally4' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ vitalityOfTheTreeTarget: { target: 'ally4' } });
        });

        it('should handle tricksterBlessing modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'tricksterBlessing',
                payload: { blessing: 'speed' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ tricksterBlessingModal: { blessing: 'speed' } });
        });

        it('should handle bardicInspirationTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bardicInspirationTarget',
                payload: { target: 'ally5' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bardicInspirationTargetModal: { target: 'ally5' } });
        });

        it('should handle inspiringMovementAlly modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'inspiringMovementAlly',
                payload: { ally: 'paladin' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ inspiringMovementAllyModal: { ally: 'paladin' } });
        });

        it('should handle arcaneWardRestore modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'arcaneWardRestore',
                payload: { amount: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ arcaneWardRestoreModal: { amount: 10 } });
        });

        it('should handle oceanicGiftTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'oceanicGiftTarget',
                payload: { target: 'ally6' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ oceanicGiftTargetModal: { target: 'ally6' } });
        });

        it('should handle blindessDeafness modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'blindnessDeafness',
                payload: { effect: 'blind' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ blindnessDeafnessModal: { effect: 'blind' } });
        });

        it('should handle eyebiteEffect modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'eyebiteEffect',
                payload: { effect: 'sleep' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ eyebiteEffectModal: { effect: 'sleep' } });
        });

        it('should handle healingIllusion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'healingIllusion',
                payload: { amount: 8 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ healingIllusionModal: { amount: 8 } });
        });

        it('should handle elementalBurst modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalBurst',
                payload: { type: 'lightning' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elementalBurstModal: { type: 'lightning' } });
        });

        it('should handle divineSpark modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'divineSpark',
                payload: { damage: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineSparkModal: { damage: 10 } });
        });

        it('should handle moonlightStepFallback modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'moonlightStepFallback',
                payload: { fallback: 'dash' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ moonlightStepFallbackModal: { fallback: 'dash' } });
        });

        it('should handle twinklingConstellation modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'twinklingConstellation',
                payload: { effect: 'shield' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ twinklingConstellationModal: { effect: 'shield' } });
        });

        it('should handle warMagicSpell modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'warMagicSpell',
                payload: { spell: 'fireball' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ warMagicSpellModal: { spell: 'fireball' } });
        });

        it('should handle mistyWanderer modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'mistyWanderer',
                payload: { location: 'shadow' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ mistyWandererModal: { location: 'shadow' } });
        });

        it('should handle feyReinforcements modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'feyReinforcements',
                payload: { feyType: 'seelie' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ feyReinforcementsModal: { feyType: 'seelie' } });
        });

        it('should handle stepsOfTheFeyTaunt modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'stepsOfTheFeyTaunt',
                payload: { target: 'goblin3' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ stepsOfTheFeyTauntModal: { target: 'goblin3' } });
        });

        it('should handle bonusActionChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bonusActionChoice',
                payload: { choices: ['attack', 'dash'] },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bonusActionChoiceModal: { choices: ['attack', 'dash'] } });
        });

        it('should handle stealthAttack modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'stealthAttack',
                payload: { damage: 15 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ stealthAttackModal: { damage: 15 } });
        });

        it('should handle revelationInFlesh modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'revelationInFlesh',
                payload: { form: 'dragon' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ revelationInFleshModal: { form: 'dragon' } });
        });

        it('should handle bastionOfLaw modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bastionOfLaw',
                payload: { effect: 'lawful' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bastionOfLawModal: { effect: 'lawful' } });
        });

        it('should handle elementalAffinity modal with damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalAffinity',
                payload: {
                    action: { name: 'Elemental Affinity' },
                    damageTypes: ['Fire', 'Cold'],
                    existingType: 'Fire',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                elementalAffinityModal: {
                    action: { name: 'Elemental Affinity' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Fire', 'Cold'],
                    existingType: 'Fire',
                },
            });
        });

        it('should handle elementalAffinity modal with default damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalAffinity',
                payload: {
                    action: { name: 'Elemental Affinity' },
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                elementalAffinityModal: {
                    action: { name: 'Elemental Affinity' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'],
                    existingType: undefined,
                },
            });
        });

        it('should handle fiendishResilience modal with damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishResilience',
                payload: {
                    action: { name: 'Fiendish Resilience' },
                    damageTypes: ['Fire'],
                    existingType: 'Fire',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                fiendishResilienceModal: {
                    action: { name: 'Fiendish Resilience' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Fire'],
                    existingType: 'Fire',
                },
            });
        });

        it('should handle fiendishResilience modal with default damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishResilience',
                payload: {
                    action: { name: 'Fiendish Resilience' },
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                fiendishResilienceModal: {
                    action: { name: 'Fiendish Resilience' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: [
                        'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning',
                        'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
                    ],
                    existingType: undefined,
                },
            });
        });

        it('should handle breathWeaponShape modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'breathWeaponShape',
                payload: {
                    action: { name: 'Breath Weapon' },
                    options: ['cone', 'line'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                breathWeaponShapeModal: {
                    action: { name: 'Breath Weapon' },
                    playerStats: basePlayerStats,
                    campaignName,
                    options: ['cone', 'line'],
                },
            });
        });

        it('should handle hypnoticPatternShake modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'hypnoticPatternShake',
                payload: { effect: 'charmed' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ hypnoticPatternShakeModal: { effect: 'charmed' } });
        });

        it('should handle animateDead modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'animateDead',
                payload: { undead: 'zombie' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ animateDeadModal: { undead: 'zombie' } });
        });

        it('should handle createUndead modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'createUndead',
                payload: { undead: 'skeleton' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ createUndeadModal: { undead: 'skeleton' } });
        });

        it('should handle summonSpirit modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'summonSpirit',
                payload: { spirit: 'wolf' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ summonSpiritModal: { spirit: 'wolf' } });
        });

        it('should handle flurryOfBlows modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'flurryOfBlows',
                payload: { strikes: 3 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: { strikes: 3 } });
        });

        it('should handle elementalEpitome modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalEpitome',
                payload: { element: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ epitomeModal: { element: 'fire' } });
        });

        it('should handle destructiveStride modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'destructiveStride',
                payload: { effect: 'knockdown' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ destructiveStrideModal: { effect: 'knockdown' } });
        });

        it('should handle destructiveStrideTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'destructiveStrideTarget',
                payload: { target: 'enemy5' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ destructiveStrideTargetModal: { target: 'enemy5' } });
        });

        it('should handle wildCompanion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'wildCompanion',
                payload: { action: 'bite' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ wildCompanionModal: { action: 'bite' } });
        });

        it('should handle celestialResilienceModal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'celestialResilienceModal',
                payload: { resistance: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                celestialResilienceModal: {
                    resistance: 'fire',
                    playerStats: basePlayerStats,
                    campaignName,
                },
            });
        });

        it('should handle elfishLineage modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elfishLineage',
                payload: { trait: 'feyIntuition' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elfishLineageModal: { trait: 'feyIntuition' } });
        });

        it('should handle gnomishLineage modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'gnomishLineage',
                payload: { trait: 'magicSensitive' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ gnomishLineageModal: { trait: 'magicSensitive' } });
        });

        it('should handle fiendishLegacy modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishLegacy',
                payload: { trait: 'hellishResistance' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ fiendishLegacyModal: { trait: 'hellishResistance' } });
        });

        it('should handle giantAncestry modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'giantAncestry',
                payload: { giantType: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ giantAncestryModal: { giantType: 'fire' } });
        });

        it('should handle telepathicSpeech modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'telepathicSpeech',
                payload: {
                    action: { name: 'Telepathic Speech' },
                    creatureTargets: ['goblin1', 'goblin2'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                secondaryTargetModal: expect.objectContaining({
                    title: 'Telepathic Speech',
                    icon: 'fa-brain',
                    targets: ['goblin1', 'goblin2'],
                    confirmLabel: 'Establish Link',
                    confirmIcon: 'fa-brain',
                    description: 'Choose one creature within 30 feet to communicate with telepathically.',
                }),
            });
            // Verify the onTargetSelected and onSkip callbacks are functions
            const callArgs = hooks.setModalState.mock.calls[0][0];
            expect(typeof callArgs.secondaryTargetModal.onTargetSelected).toBe('function');
            expect(typeof callArgs.secondaryTargetModal.onSkip).toBe('function');
        });

        it('should call onTargetSelected callback for telepathicSpeech', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'telepathicSpeech',
                payload: {
                    action: { name: 'Telepathic Speech' },
                    creatureTargets: ['goblin1'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            const callArgs = hooks.setModalState.mock.calls[0][0];
            await callArgs.secondaryTargetModal.onTargetSelected('goblin1');

            expect(hooks.setModalState).toHaveBeenCalledWith({ secondaryTargetModal: null });
        });

        it('should call onSkip callback for telepathicSpeech', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'telepathicSpeech',
                payload: {
                    action: { name: 'Telepathic Speech' },
                    creatureTargets: ['goblin1'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            const callArgs = hooks.setModalState.mock.calls[0][0];
            callArgs.secondaryTargetModal.onSkip();

            expect(hooks.setModalState).toHaveBeenCalledWith({ secondaryTargetModal: null });
        });
    });

    describe('handleDivineInterventionCast', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should clear divine intervention modal state on start', async () => {
            const hooks = createHooks({
                modalState: {
                    divineInterventionAction: { name: 'Divine Intervention' },
                    divineInterventionModal: { options: ['smite'] },
                },
            });
            hooks.getRuntimeValue.mockReturnValue(null);
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineInterventionModal: null, divineInterventionAction: null });
        });

        it('should return early when no divine intervention action found', async () => {
            const hooks = createHooks({
                modalState: {},
            });
            hooks.getRuntimeValue.mockReturnValue(null);
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineInterventionModal: null, divineInterventionAction: null });
        });

        it('should get action from runtime value when not in modalState', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return { name: 'Divine Intervention' };
                return undefined;
            });
            const hooks = createHooks({
                modalState: {},
                getRuntimeValue: grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(grv).toHaveBeenCalledWith('charActions', 'divineInterventionAction', campaignName);
        });

        it('should call onSpellSelected and executeSpellCast when action exists', async () => {
            const { onSpellSelected } = await import('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js');
            const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'until you finish a Long Rest',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: null,
            });

            const action = { name: 'Divine Intervention' };
            const hooks = createHooks({
                modalState: { divineInterventionAction: action },
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(onSpellSelected).toHaveBeenCalledWith(action, basePlayerStats, campaignName, { name: 'Guidance' });
            expect(executeSpellCast).toHaveBeenCalled();
        });

        it('should return early when onSpellSelected returns null', async () => {
            const { onSpellSelected } = await import('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js');
            onSpellSelected.mockResolvedValue(null);

            const action = { name: 'Divine Intervention' };
            const hooks = createHooks({
                modalState: { divineInterventionAction: action },
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setPopupHtml).not.toHaveBeenCalled();
        });

        it('should handle spell_selected result with triggerResult modal', async () => {
            const { onSpellSelected } = await import('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js');
            const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: { type: 'modal', modalName: 'wildMagicSurge', payload: { surge: 'teleport' } },
            });

            const action = { name: 'Divine Intervention' };
            const hooks = createHooks({
                modalState: { divineInterventionAction: action },
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setModalState).toHaveBeenCalledWith({ wildMagicSurgeModal: { surge: 'teleport' } });
        });

        it('should handle spell_selected result with triggerResult popup', async () => {
            const { onSpellSelected } = await import('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js');
            const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: {
                    type: 'popup',
                    payload: { name: 'Test', description: 'Test desc' },
                },
            });

            const action = { name: 'Divine Intervention' };
            const hooks = createHooks({
                modalState: { divineInterventionAction: action },
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Test',
                description: 'Test desc',
            });
        });

        it('should handle spell_selected result with healing', async () => {
            const { onSpellSelected } = await import('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js');
            const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Cure Wounds' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 8,
                rawTotal: 10,
                formula: '1d8+3',
                rolls: [5, 5],
                targetName: 'TestFighter',
                bonusHeal: 2,
                bonusDetails: [{ amount: 2, name: 'Inspiration' }],
                triggerResult: null,
            });

            const action = { name: 'Divine Intervention' };
            const hooks = createHooks({
                modalState: { divineInterventionAction: action },
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Cure Wounds' });

            expect(hooks.setPopupHtml).toHaveBeenCalledWith({
                type: 'heal',
                name: 'Cure Wounds',
                formula: '1d8+3',
                rolls: [5, 5],
                total: 10,
                targetName: 'TestFighter',
                finalHeal: 8,
                bonusHeal: 2,
                bonusHealDetail: '2 Inspiration',
                healingRerollOriginalRolls: null,
                healingRerollDisplayRolls: null,
            });
        });
    });
});

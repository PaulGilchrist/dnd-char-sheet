// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAttackDamageResolution from './useAttackDamageResolution.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
    rollExpressionDoubled: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
    loadCombatSummary: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/ui/utils.js', () => ({
    default: {
        getAbilityLongName: vi.fn(),
        getName: vi.fn((name) => name),
        guid: vi.fn(() => 'test-prompt-id-12345'),
    },
    DEBUG_FORCE_CRIT: false,
}));

vi.mock('../../services/automation/common/buffToggle.js', () => ({
    getActiveBuffs: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    collectWeaponMastery: vi.fn(),
    evaluateAutoExpression: vi.fn(),
    hasTwoWeaponFighting: vi.fn(),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
}));

vi.mock('../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: vi.fn((name) => ({ baseName: name })),
}));

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

import { rollExpression, rollExpressionDoubled } from '../../services/dice/diceRoller.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { getCurrentCombatRound } from '../../services/encounters/combatData.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../services/automation/common/buffToggle.js';
import { collectWeaponMastery, hasTwoWeaponFighting } from '../../services/combat/automation/automationService.js';
import { parseMagicItemName } from '../../services/rules/core/attackCalc.js';
import { sendSavePrompt } from '../../services/combat/conditions/savePromptService.js';

const mockPlayerStats = {
    name: 'TestFighter',
    level: 20,
    abilities: [
        { name: 'Strength', bonus: 5 },
        { name: 'Dexterity', bonus: 2 },
    ],
    proficiency: 6,
    class: { name: 'Fighter', class_levels: [{ level: 20, rage_damage: 2 }] },
    automation: { actions: [], passives: [] },
    inventory: { equipped: ['Shield'] },
    equipment: [{ name: 'Shield', equipment_category: 'Shield' }],
};

const mockCampaignName = 'test-campaign';
const defaultRollResult = { total: 5, rolls: [5], modifier: 0 };

describe('useAttackDamageResolution - feats', () => {
    const mockSetPopupHtml = vi.fn();
    const mockRollDamage = vi.fn();
    const mockBuildCtx = vi.fn(() => Promise.resolve({ targetName: 'Goblin' }));
    const mockBuildCtxSync = vi.fn(() => Promise.resolve({ targetName: 'Goblin' }));
    const mockPendingDamageRef = { current: null };
    const modalState = {};

    function useAttackDamageResolutionHook(overrides = {}) {
        const deps = {
            playerStats: mockPlayerStats,
            campaignName: mockCampaignName,
            mapName: null,
            popupHtml: null,
            setPopupHtml: mockSetPopupHtml,
            rollDamage: mockRollDamage,
            buildCtx: mockBuildCtx,
            buildCtxSync: mockBuildCtxSync,
            modalState,
            setModalState: vi.fn((updates) => {
                if (typeof updates === 'function') {
                    return updates(modalState);
                }
                Object.assign(modalState, updates);
            }),
            pendingDamageRef: mockPendingDamageRef,
            ...overrides,
        };
        return useAttackDamageResolution(deps);
    }

    beforeEach(() => {
        vi.clearAllMocks();
        rollExpression.mockReturnValue(defaultRollResult);
        rollExpressionDoubled.mockReturnValue({ total: 10, rolls: [5, 5], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        getActiveBuffs.mockReturnValue([]);
        hasTwoWeaponFighting.mockReturnValue(false);
        collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
        getCombatContext.mockResolvedValue(null);
        getTargetFromAttacker.mockReturnValue(null);
        getCurrentCombatRound.mockReturnValue(1);
        parseMagicItemName.mockImplementation((name) => ({ baseName: name }));
        mockBuildCtx.mockReturnValue(Promise.resolve({ targetName: 'Goblin' }));
        mockBuildCtxSync.mockReturnValue(Promise.resolve({ targetName: 'Goblin' }));
        mockPendingDamageRef.current = null;
        Object.keys(modalState).forEach(key => delete modalState[key]);
    });

    async function tick() {
        await new Promise(r => setTimeout(r, 0));
    }

    function createCombatContext(playerName = 'TestFighter', targetName = 'Goblin') {
        return {
            creatures: [
                { name: playerName, type: 'player' },
                { name: targetName, type: 'npc' },
            ],
        };
    }

    function dispatchSaveResult(promptId, success, roll = 10, bonus = 0) {
        window.dispatchEvent(new CustomEvent('save-result', {
            detail: {
                promptId,
                targetName: 'Goblin',
                success,
                roll,
                total: roll + bonus,
                saveBonus: bonus,
            },
        }));
    }

    describe('Charger feat', () => {
        it('does not auto-apply Charger effect during attack damage pipeline', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'melee_hit_after_10ft_charge',
                            chooseOne: true, name: 'Charge Attack',
                            options: [{ name: 'Push 10 ft', effect: 'push', value: 10 }],
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(setRuntimeValue).not.toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({
                    target: 'Goblin',
                    source: 'Charge Attack',
                    effect: 'push',
                    value: 10,
                }),
            ]), 'test-campaign');
            expect(setRuntimeValue).not.toHaveBeenCalledWith('TestFighter', '_Charge_Attack_usedRound', expect.any(Number), 'test-campaign');
            expect(mockRollDamage).toHaveBeenCalled();
        });

        it('skips Charger when oncePerTurn already used this round (new format)', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            setRuntimeValue.mockImplementation(async (key, value, _campaignName) => {
                if (key === 'TestFighter' && value === '_Charge_Attack_usedRound') {
                    // Simulate oncePerTurn already used this round (new format)
                    return;
                }
            });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'melee_hit_after_10ft_charge',
                            chooseOne: true, name: 'Charge Attack',
                            options: [{ name: 'Push 10 ft', effect: 'push', value: 10 }],
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(mockRollDamage).toHaveBeenCalled();
        });
    });

    describe('Shield Master (2024 ruleset)', () => {
        it('shows shield bash modal on failed STR save with shield equipped', async () => {
            const loadCombatSummary = await import('../../services/encounters/combatData.js');
            loadCombatSummary.loadCombatSummary.mockResolvedValue({
                lastAttack: {
                    hit: true,
                    attackerName: 'TestFighter',
                    weaponType: 'melee',
                    targetName: 'Goblin',
                },
            });

            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'melee_hit_with_shield_equipped',
                            name: 'Shield Bash',
                            options: [{ name: 'Push 5 ft', effect: 'push', value: 5 }],
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };

            // Start the resolve — pipeline will call createSaveListener which registers event listener
            const resolvePromise = resolveAttackDamage(attack);

            // Give the async pipeline a tick to register the event listener
            await new Promise(r => setTimeout(r, 10));
            // Now dispatch save result
            dispatchSaveResult('test-prompt-id-12345', false, 5, 3); // failed save

            await resolvePromise;
            await tick();

            // Should have created a save prompt
            expect(sendSavePrompt).toHaveBeenCalled();
            // Should have paused for modal
            expect(modalState.shieldBashModal).toBeDefined();
        }, 10000);

        it('skips Shield Bash when lastAttack is not from player', async () => {
            const loadCombatSummary = await import('../../services/encounters/combatData.js');
            loadCombatSummary.loadCombatSummary.mockResolvedValue({
                lastAttack: {
                    hit: true,
                    attackerName: 'Goblin',
                    weaponType: 'melee',
                    targetName: 'TestFighter',
                },
            });

            const stats = {
                ...mockPlayerStats,
                automation: {
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'melee_hit_with_shield_equipped',
                            name: 'Shield Bash',
                            options: [{ name: 'Push 5 ft', effect: 'push', value: 5 }],
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();

            expect(modalState.shieldBashModal).toBeUndefined();
        });

        it('skips Shield Bash when lastAttack was not a melee weapon', async () => {
            const loadCombatSummary = await import('../../services/encounters/combatData.js');
            loadCombatSummary.loadCombatSummary.mockResolvedValue({
                lastAttack: {
                    hit: true,
                    attackerName: 'TestFighter',
                    weaponType: 'ranged',
                    targetName: 'Goblin',
                },
            });

            const stats = {
                ...mockPlayerStats,
                automation: {
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'melee_hit_with_shield_equipped',
                            name: 'Shield Bash',
                            options: [{ name: 'Push 5 ft', effect: 'push', value: 5 }],
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();

            expect(modalState.shieldBashModal).toBeUndefined();
        });

        it('skips Shield Bash when no shield equipped', async () => {
            const loadCombatSummary = await import('../../services/encounters/combatData.js');
            loadCombatSummary.loadCombatSummary.mockResolvedValue({
                lastAttack: {
                    hit: true,
                    attackerName: 'TestFighter',
                    weaponType: 'melee',
                    targetName: 'Goblin',
                },
            });

            const stats = {
                ...mockPlayerStats,
                inventory: { equipped: [] },
                equipment: [],
                automation: {
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'melee_hit_with_shield_equipped',
                            name: 'Shield Bash',
                            options: [{ name: 'Push 5 ft', effect: 'push', value: 5 }],
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();

            expect(modalState.shieldBashModal).toBeUndefined();
        });

        it('handles 2024 Shield Master with push_or_prone effect', async () => {
            const loadCombatSummary = await import('../../services/encounters/combatData.js');
            loadCombatSummary.loadCombatSummary.mockResolvedValue({
                lastAttack: {
                    hit: true,
                    attackerName: 'TestFighter',
                    weaponType: 'melee',
                    targetName: 'Goblin',
                },
            });

            const stats = {
                ...mockPlayerStats,
                automation: {
                    passives: [
                        {
                            type: 'attack_rider',
                            effect: 'push_or_prone',
                            oncePerTurn: true,
                            name: 'Shield Bash',
                            automation: {
                                saveType: 'STR',
                                saveDc: 'ability',
                                saveAbility: 'STR',
                            },
                        },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };

            // Start the resolve — pipeline will call createSaveListener which registers event listener
            const resolvePromise = resolveAttackDamage(attack);

            // Give the async pipeline a tick to register the event listener
            await new Promise(r => setTimeout(r, 10));
            // Now dispatch save result
            dispatchSaveResult('test-prompt-id-12345', false, 5, 3); // failed save

            await resolvePromise;
            await tick();

            // Should have paused for modal
            expect(sendSavePrompt).toHaveBeenCalled();
            expect(modalState.shieldBashModal).toBeDefined();
            expect(modalState.shieldBashModal.saveDc).toBe(19); // 8 + 5 (STR) + 6 (prof)
        }, 10000);
    });

    describe('Crusher feat', () => {
        it('applies Crusher push on bludgeoning hit', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        {
                            type: 'attack_rider', trigger: 'bludgeoning_damage_hit',
                            oncePerTurn: true, name: 'Crusher',
                            options: [{ name: 'Push 5 ft', effect: 'push', value: 5 }],
                        },
                        { type: 'conditional_advantage', trigger: 'critical_hit_bludgeoning', name: 'Crusher Enhanced Critical' },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Warhammer', damage: '1d8+5', damageType: 'Bludgeoning',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({
                    target: 'Goblin',
                    source: 'Crusher',
                    effect: 'push',
                }),
            ]), 'test-campaign');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_Crusher_usedRound', 1, 'test-campaign');
        });

        it('applies Crusher Enhanced Critical on bludgeoning crit', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        { type: 'conditional_advantage', trigger: 'critical_hit_bludgeoning', name: 'Crusher Enhanced Critical' },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({
                playerStats: stats,
                popupHtml: { isCrit: true },
            });
            const attack = {
                name: 'Warhammer', damage: '1d8+5', damageType: 'Bludgeoning',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({
                    target: 'Goblin',
                    effect: 'crusher_enhanced_critical',
                }),
            ]), 'test-campaign');
        });
    });

    describe('Slasher feat', () => {
        it('applies Slasher Enhanced Critical on slashing crit', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        { type: 'conditional_advantage', trigger: 'critical_hit_slashing', name: 'Slasher Enhanced Critical' },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({
                playerStats: stats,
                popupHtml: { isCrit: true },
            });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({
                    target: 'Goblin',
                    effect: 'slasher_enhanced_critical',
                }),
            ]), 'test-campaign');
        });

        it('sets up expiration for Slasher Enhanced Critical', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        { type: 'conditional_advantage', trigger: 'critical_hit_slashing', name: 'Slasher Enhanced Critical' },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({
                playerStats: stats,
                popupHtml: { isCrit: true },
            });
            const attack = {
                name: 'Longsword', damage: '1d8+5', damageType: 'Slashing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', expect.any(String), expect.arrayContaining([
                expect.objectContaining({
                    target: 'Goblin',
                    effects: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'remove_target_effect',
                            effectKey: 'slasher_enhanced_critical',
                            source: 'Slasher Enhanced Critical'
                        })
                    ]),
                    expiryRounds: Infinity,
                    expireOnCreatureName: 'TestFighter'
                })
            ]), 'test-campaign');
        });
    });

    describe('Piercer feat', () => {
        it('applies Piercer extra damage die on crit', async () => {
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        { type: 'damage_bonus', trigger: 'critical_hit_piercing', diceType: 'weapon_die', name: 'Piercer Critical' },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({
                playerStats: stats,
                popupHtml: { isCrit: true },
            });
            const attack = {
                name: 'Rapier', damage: '1d8+5', damageType: 'Piercing',
                weaponType: 'melee', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(mockRollDamage).toHaveBeenCalledWith(
                'Rapier',
                expect.stringContaining('plus 1d8 [Enhanced Critical]'),
                expect.any(Number), expect.any(Array), expect.any(Number), expect.any(Object)
            );
        });
    });

    describe('Savage Attacker', () => {
        it('does not auto-apply in pipeline when savage attacker passives exist', async () => {
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [
                        { type: 'passive_rule', effect: 'reroll_damage_once_per_turn', name: 'Savage Attacker' },
                    ],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Greataxe', damage: '1d12+5', damageType: 'Slashing',
                weaponType: 'melee', properties: ['Heavy'],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(mockRollDamage).toHaveBeenCalled();
        });
    });

    describe('Tavern Brawler', () => {
        it('rerolls ones on unarmed strike damage dice', async () => {
            rollExpression.mockReturnValue({ total: 1, rolls: [1], modifier: 0 });
            const floorSpy = vi.spyOn(Math, 'floor')
                .mockReturnValueOnce(5) // reroll the 1 -> 5
                .mockReturnValueOnce(3); // for random elsewhere

            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [{ effect: 'tavern_brawler_reroll_ones' }],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Unarmed Strike', damage: '1d4', damageType: 'Bludgeoning',
                weaponType: 'unarmed', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(mockRollDamage).toHaveBeenCalledWith(
                'Unarmed Strike',
                expect.stringContaining('[Tavern Brawler]'),
                expect.any(Number), expect.any(Array), expect.any(Number), expect.any(Object)
            );
            floorSpy.mockRestore();
        });

        it('applies Tavern Brawler push on unarmed strike hit', async () => {
            getCombatContext.mockResolvedValue(createCombatContext());
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
            const stats = {
                ...mockPlayerStats,
                automation: {
                    actions: [],
                    passives: [{ effect: 'tavern_brawler_push' }],
                },
            };
            const { resolveAttackDamage } = useAttackDamageResolutionHook({ playerStats: stats });
            const attack = {
                name: 'Unarmed Strike', damage: '1d4', damageType: 'Bludgeoning',
                weaponType: 'unarmed', properties: [],
            };
            await resolveAttackDamage(attack);
            await tick();
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({
                    target: 'Goblin',
                    source: 'Tavern Brawler',
                    effect: 'push',
                    value: 5,
                }),
            ]), 'test-campaign');
        });
    });
});

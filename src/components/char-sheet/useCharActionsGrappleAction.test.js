import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsBaseActions from './useCharActionsBaseActions.js';
import { createHooks, mockRollAbilityCheck, mockSetPopupHtml, mockAddEntry, mockLoadCombatSummary, mockGetMonsterData, campaignName, basePlayerStats } from './useCharActionsBaseActions.test.helpers.js';

describe('useCharActionsBaseActions - handleGrappleAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

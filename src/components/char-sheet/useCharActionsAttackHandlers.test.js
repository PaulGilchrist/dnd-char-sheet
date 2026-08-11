import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsAttackHandlers from './useCharActionsAttackHandlers.js';

vi.mock('../../hooks/runtime/useRuntimeState.js');
vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/encounters/combatData.js', () => ({
    getActiveCreatureName: vi.fn(() => 'TestFighter'),
}));
vi.mock('../../services/automation/common/buffToggle.js', () => ({
    toggleBuff: vi.fn(),
}));
vi.mock('../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));
vi.mock('../../services/automation/common/oncePerTurn.js', () => ({
    markOncePerTurn: vi.fn().mockResolvedValue({ round: 1, activeCreature: 'TestFighter' }),
}));
vi.mock('../../services/rules/features/friendsService.js', () => ({
    endFriendsOnHostileAction: vi.fn(),
}));
vi.mock('../../services/rules/features/invisibilityService.js', () => ({
    endInvisibilityOnHostileAction: vi.fn(),
}));

import * as buffToggle from '../../services/automation/common/buffToggle.js';
import * as expirations from '../../services/rules/effects/expirations.js';
import * as logService from '../../services/ui/logService.js';
import * as oncePerTurn from '../../services/automation/common/oncePerTurn.js';
import * as friendsService from '../../services/rules/features/friendsService.js';
import * as invisibilityService from '../../services/rules/features/invisibilityService.js';


const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'TestFighter',
    level: 5,
    class: { name: 'Fighter' },
};

function createDeps(overrides = {}) {
    const {
        cannotAct = false,
        playerName = 'TestFighter',
        playerStats = basePlayerStats,
        getRuntimeValue = vi.fn(),
        setRuntimeValue = vi.fn(),
        buildCtx = vi.fn(() => Promise.resolve({})),
        rollAttack = vi.fn(),
        setModalState = vi.fn(),
        specialActions = [],
        passives = [],
        exhaustionPenalty = 0,
    } = overrides;

    return {
        cannotAct,
        buildCtx,
        rollAttack,
        exhaustionPenalty,
        playerName,
        campaignName,
        setModalState,
        specialActions,
        passives,
        playerStats,
        getRuntimeValue,
        setRuntimeValue,
    };
}

describe('useCharActionsAttackHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handleAttackClick', () => {
        it('should return early without any action when cannotAct is true', () => {
            const deps = createDeps({ cannotAct: true });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).not.toHaveBeenCalled();
            expect(deps.buildCtx).not.toHaveBeenCalled();
            expect(deps.rollAttack).not.toHaveBeenCalled();
        });

        it('should return the five handler functions', () => {
            const deps = createDeps();
            const handlers = useCharActionsAttackHandlers(deps);

            expect(typeof handlers.handleAttackClick).toBe('function');
            expect(typeof handlers.handleRecklessAttackConfirm).toBe('function');
            expect(typeof handlers.handleRecklessAttackCancel).toBe('function');
            expect(typeof handlers.handleBrutalStrikeConfirm).toBe('function');
            expect(typeof handlers.handleBrutalStrikeCancel).toBe('function');
        });

        it('should call endFriendsOnHostileAction and endInvisibilityOnHostileAction', () => {
            const deps = createDeps();
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(friendsService.endFriendsOnHostileAction).toHaveBeenCalledWith('TestFighter', campaignName);
            expect(invisibilityService.endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestFighter', campaignName);
        });

        it('should open reckless attack modal when feature exists, buff not active, and not offered this turn', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const specialActions = [
                { effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' },
            ];

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions,
                passives: [],
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).toHaveBeenCalledWith({
                recklessAttackModal: {
                    attack,
                    mode: 'full',
                    hasBrutalStrike: false,
                    brutalStrikeOptions: [],
                    maxEffects: 1,
                },
            });
            expect(deps.buildCtx).not.toHaveBeenCalled();
            expect(deps.rollAttack).not.toHaveBeenCalled();
        });

        it('should open brutal strike only modal when reckless is active and brutal strike exists but not used this turn', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const specialActions = [
                { effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' },
            ];
            const passives = [
                { type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6', options: ['option1'], maxEffects: 2 },
            ];

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions,
                passives,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).toHaveBeenCalledWith({
                recklessAttackModal: {
                    attack,
                    mode: 'brutalOnly',
                    hasBrutalStrike: true,
                    brutalStrikeOptions: ['option1'],
                    maxEffects: 2,
                },
            });
            expect(deps.buildCtx).not.toHaveBeenCalled();
        });

        it('should skip modal and go straight to buildCtx when reckless is active and brutal strike already used this turn', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return { activeCreature: 'TestFighter' };
                return undefined;
            });
            const specialActions = [
                { effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' },
            ];
            const passives = [
                { type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6' },
            ];

            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions,
                passives,
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).not.toHaveBeenCalled();

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should skip modal and go straight to buildCtx when no reckless feature', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [],
                passives: [],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).not.toHaveBeenCalled();

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should skip modal and go straight to buildCtx when reckless offered this turn for current creature', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return { activeCreature: 'TestFighter' };
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const specialActions = [
                { effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' },
            ];
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions,
                passives: [],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).not.toHaveBeenCalled();

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should apply exhaustionPenalty to the attack roll', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [],
                passives: [],
                buildCtx,
                rollAttack,
                exhaustionPenalty: 2,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            await new Promise(process.nextTick);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', 4, expect.any(Object));
        });

        it('should use ctx.hitBonus when available, falling back to attack.hitBonus', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 10 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [],
                passives: [],
                buildCtx,
                rollAttack,
                exhaustionPenalty: 0,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword', hitBonus: 5 };

            handlers.handleAttackClick(attack);

            await new Promise(process.nextTick);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', 10, expect.any(Object));
        });

        it('should sort brutal strike passives by damage expression count descending', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const specialActions = [
                { effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' },
            ];
            const passives = [
                { type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '1d6', options: ['low'], maxEffects: 1 },
                { type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '3d6', options: ['high'], maxEffects: 3 },
                { type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6', options: ['mid'], maxEffects: 2 },
            ];

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions,
                passives,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).toHaveBeenCalledWith({
                recklessAttackModal: expect.objectContaining({
                    hasBrutalStrike: true,
                    brutalStrikeOptions: ['high'],
                    maxEffects: 3,
                }),
            });
        });

        it('should handle missing passives array gracefully', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [],
                passives: undefined,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).not.toHaveBeenCalled();
        });

        it('should handle missing specialActions gracefully', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: undefined,
                passives: [],
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            expect(deps.setModalState).not.toHaveBeenCalled();
        });

        it('should handle buildCtx rejection gracefully', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.reject(new Error('build failed')));
            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [],
                passives: [],
                buildCtx,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);

            await new Promise(process.nextTick);
            expect(consoleErrorSpy).toHaveBeenCalledWith('[CharActions] Error:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('handleRecklessAttackConfirm', () => {
        it('should toggle buff, add log entry, set expiration, and update targetEffects', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                if (charKey === 'campaign' && key === 'targetEffects') return [];
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [{ effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' }],
                passives: [],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);
            handlers.handleRecklessAttackConfirm(attack, null);

            expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
                'TestFighter',
                'Reckless Attack',
                { effect: 'advantage_attacks_advantage_against', duration: 'until_start_of_next_turn' },
                campaignName,
                'TestFighter'
            );
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Reckless Attack',
            }));
            expect(expirations.addExpiration).toHaveBeenCalledWith(
                'TestFighter',
                'TestFighter',
                [{ type: 'remove_active_buff', buffName: 'Reckless Attack' }],
                campaignName,
                undefined,
                'TestFighter'
            );
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({ effect: 'reckless_attack', target: 'TestFighter' }),
            ]), campaignName);
            expect(deps.setRuntimeValue).toHaveBeenCalledWith(
                'TestFighter',
                '_recklessAttack_offeredThisTurn',
                expect.objectContaining({ activeCreature: 'TestFighter' }),
                campaignName
            );
            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should not duplicate targetEffects entry if reckless_attack already exists', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                if (charKey === 'campaign' && key === 'targetEffects') return [
                    { target: 'TestFighter', source: 'TestFighter', effect: 'reckless_attack', duration: 'until_start_of_next_turn' },
                ];
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [{ effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' }],
                passives: [],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);
            handlers.handleRecklessAttackConfirm(attack, null);

            expect(buffToggle.toggleBuff).toHaveBeenCalled();
            expect(logService.addEntry).toHaveBeenCalled();
            expect(expirations.addExpiration).toHaveBeenCalled();

            // targetEffects should NOT have a duplicate - the code checks hasRecklessEffect
            const teCalls = deps.setRuntimeValue.mock.calls.filter(c => c[1] === 'targetEffects');
            expect(teCalls.length).toBe(0);

            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });
        });

        it('should set up brutal strike when choice is provided', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                if (charKey === 'campaign' && key === 'targetEffects') return [];
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: ['option1', 'option2'],
            };

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [{ effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' }],
                passives: [{ type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6' }],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);
            handlers.handleRecklessAttackConfirm(attack, brutalChoice);

            expect(buffToggle.toggleBuff).toHaveBeenCalled();
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeActive', true, campaignName);
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeEffects', ['option1', 'option2'], campaignName);
            expect(oncePerTurn.markOncePerTurn).toHaveBeenCalledWith('Brutal Strike', '_BrutalStrike_usedRound', basePlayerStats, campaignName);
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeNoAdvantage', true, campaignName);

            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Brutal Strike',
                description: expect.stringContaining('Brutal Strike'),
            }));
        });

        it('should clear _brutalStrikeNoAdvantage in finally block when brutal strike was used', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                if (charKey === 'campaign' && key === 'targetEffects') return [];
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: ['option1'],
            };

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [{ effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' }],
                passives: [{ type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6' }],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);
            handlers.handleRecklessAttackConfirm(attack, brutalChoice);

            await new Promise(process.nextTick);
            await new Promise(process.nextTick);

            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeNoAdvantage', null, campaignName);
        });

        it('should NOT clear _brutalStrikeNoAdvantage when brutal strike was not used', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                if (charKey === 'campaign' && key === 'targetEffects') return [];
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: false,
                effectChoices: [],
            };

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [{ effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' }],
                passives: [{ type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6' }],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);
            handlers.handleRecklessAttackConfirm(attack, brutalChoice);

            await new Promise(process.nextTick);
            await new Promise(process.nextTick);

            const brutalNoAdvCalls = deps.setRuntimeValue.mock.calls.filter(
                c => c[1] === '_brutalStrikeNoAdvantage'
            );
            expect(brutalNoAdvCalls.length).toBe(0);
        });

        it('should handle buildCtx error in finally block', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_recklessAttack_offeredThisTurn') return null;
                if (key === '_BrutalStrike_usedRound') return null;
                if (charKey === 'campaign' && key === 'targetEffects') return [];
                return undefined;
            });
            const buildCtx = vi.fn(() => Promise.reject(new Error('build failed')));
            const rollAttack = vi.fn();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: ['option1'],
            };

            const deps = createDeps({
                getRuntimeValue: grv,
                specialActions: [{ effect: 'advantage_attacks_advantage_against', trigger: 'first_attack_of_turn' }],
                passives: [{ type: 'attack_rider', trigger: 'strength_attack_hit_after_reckless', damageExpression: '2d6' }],
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleAttackClick(attack);
            handlers.handleRecklessAttackConfirm(attack, brutalChoice);

            await new Promise(process.nextTick);
            await new Promise(process.nextTick);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[CharActions] Error:', expect.any(Error));
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeNoAdvantage', null, campaignName);
            consoleErrorSpy.mockRestore();
        });
    });

    describe('handleRecklessAttackCancel', () => {
        it('should set offeredThisTurn, clear modal, and proceed with attack', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleRecklessAttackCancel(attack);

            expect(deps.setRuntimeValue).toHaveBeenCalledWith(
                'TestFighter',
                '_recklessAttack_offeredThisTurn',
                { round: 1, activeCreature: 'TestFighter' },
                campaignName
            );
            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should handle buildCtx rejection', async () => {
            const buildCtx = vi.fn(() => Promise.reject(new Error('build failed')));
            const rollAttack = vi.fn();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleRecklessAttackCancel(attack);

            await new Promise(process.nextTick);
            expect(consoleErrorSpy).toHaveBeenCalledWith('[CharActions] Error:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('handleBrutalStrikeConfirm', () => {
        it('should set up brutal strike when useBrutalStrike is true', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: ['option1', 'option2'],
            };

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleBrutalStrikeConfirm(brutalChoice, attack);

            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeActive', true, campaignName);
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeEffects', ['option1', 'option2'], campaignName);
            expect(oncePerTurn.markOncePerTurn).toHaveBeenCalledWith('Brutal Strike', '_BrutalStrike_usedRound', basePlayerStats, campaignName);
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Brutal Strike',
                description: expect.stringContaining('Brutal Strike'),
            }));
            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should skip brutal strike setup when useBrutalStrike is false', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: false,
                effectChoices: [],
            };

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleBrutalStrikeConfirm(brutalChoice, attack);

            expect(deps.setRuntimeValue).not.toHaveBeenCalledWith('TestFighter', '_brutalStrikeActive', true, campaignName);
            expect(oncePerTurn.markOncePerTurn).not.toHaveBeenCalled();
            expect(logService.addEntry).not.toHaveBeenCalledWith(campaignName, expect.objectContaining({ abilityName: 'Brutal Strike' }));
            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
        });

        it('should skip buildCtx/rollAttack when attack is null', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: ['option1'],
            };

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);

            handlers.handleBrutalStrikeConfirm(brutalChoice, null);

            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });
            expect(buildCtx).not.toHaveBeenCalled();
            expect(rollAttack).not.toHaveBeenCalled();
        });

        it('should handle missing attack name gracefully in log entry', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: [],
            };

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = null;

            handlers.handleBrutalStrikeConfirm(brutalChoice, attack);

            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('no effect'),
            }));
            expect(buildCtx).not.toHaveBeenCalled();
        });

        it('should handle buildCtx rejection', async () => {
            const buildCtx = vi.fn(() => Promise.reject(new Error('build failed')));
            const rollAttack = vi.fn();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();

            const brutalChoice = {
                useBrutalStrike: true,
                effectChoices: ['option1'],
            };

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleBrutalStrikeConfirm(brutalChoice, attack);

            await new Promise(process.nextTick);
            expect(consoleErrorSpy).toHaveBeenCalledWith('[CharActions] Error:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('handleBrutalStrikeCancel', () => {
        it('should clear modal and proceed with attack', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleBrutalStrikeCancel(attack);

            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });

            await new Promise(process.nextTick);
            expect(buildCtx).toHaveBeenCalledWith(attack);
            expect(rollAttack).toHaveBeenCalledWith('Longsword', expect.any(Number), expect.any(Object));
        });

        it('should skip buildCtx/rollAttack when attack is null', async () => {
            const buildCtx = vi.fn(() => Promise.resolve({ hitBonus: 6 }));
            const rollAttack = vi.fn();

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);

            handlers.handleBrutalStrikeCancel(null);

            expect(deps.setModalState).toHaveBeenCalledWith({ recklessAttackModal: null });
            expect(buildCtx).not.toHaveBeenCalled();
            expect(rollAttack).not.toHaveBeenCalled();
        });

        it('should handle buildCtx rejection', async () => {
            const buildCtx = vi.fn(() => Promise.reject(new Error('build failed')));
            const rollAttack = vi.fn();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();

            const deps = createDeps({
                buildCtx,
                rollAttack,
            });
            const handlers = useCharActionsAttackHandlers(deps);
            const attack = { name: 'Longsword' };

            handlers.handleBrutalStrikeCancel(attack);

            await new Promise(process.nextTick);
            expect(consoleErrorSpy).toHaveBeenCalledWith('[CharActions] Error:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });
});

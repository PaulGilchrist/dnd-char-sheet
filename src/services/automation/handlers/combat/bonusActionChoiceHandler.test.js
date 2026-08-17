// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => ({ round: 1, activeCreatureName: 'TestRogue' })),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, applyBonusActionChoice } from './bonusActionChoiceHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as logService from '../../../ui/logService.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestRogue',
        ...overrides,
    };
}

function makeAction(automation = {}) {
    return {
        name: 'Cunning Action',
        description: 'On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide.',
        automation: {
            type: 'bonus_action_choice',
            options: [
                { name: 'Dash', description: 'Double your movement speed until the end of the turn' },
                { name: 'Disengage', description: 'Your movement doesn\'t provoke opportunity attacks until the end of the turn' },
                { name: 'Hide', description: 'Attempt to hide from creatures until the end of the turn' },
            ],
            ...automation,
        },
    };
}

function makeFastHandsAction(automation = {}) {
    return {
        name: 'Fast Hands',
        description: 'You can use the bonus action granted by the Sleight of Hand feature to make a Dexterity (Sleight of Hand) check, use thieves\' tools to pick a lock or disarm a trap, or use an object.',
        automation: {
            type: 'bonus_action_choice',
            options: [
                { name: 'Sleight of Hand', description: 'Make a Dexterity (Sleight of Hand) check' },
                { name: 'Thieves\' Tools', description: 'Use thieves\' tools to pick a lock or disarm a trap' },
                { name: 'Use an Object', description: 'Use an object' },
            ],
            ...automation,
        },
    };
}

// ── handle: options flow ───────────────────────────────────────

describe('bonusActionChoiceHandler.handle — options flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns modal with action and options when options are available', async () => {
        const ps = makePlayerStats();
        const action = makeAction();

        const result = await handle(action, ps, campaignName);

        expect(result).toEqual({
            type: 'modal',
            modalName: 'bonusActionChoice',
            payload: {
                action,
                options: action.automation.options,
            },
        });
    });

    it('returns info popup when options are undefined', async () => {
        const ps = makePlayerStats();
        const action = {
            name: 'Cunning Action',
            automation: {
                type: 'bonus_action_choice',
                options: undefined,
            },
        };

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.name).toBe('Cunning Action');
        expect(result.payload.description).toBe('Cunning Action has no options available.');
        expect(result.payload.automation).toEqual({ type: 'bonus_action_choice' });
    });

    it('returns info popup when options are an empty array', async () => {
        const ps = makePlayerStats();
        const action = {
            name: 'Cunning Action',
            automation: {
                type: 'bonus_action_choice',
                options: [],
            },
        };

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toBe('Cunning Action has no options available.');
    });
});

// ── handle: once-per-turn flow ─────────────────────────────────

describe('bonusActionChoiceHandler.handle — once-per-turn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns info popup when oncePerTurn is true and already used this round', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 1, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue({ round: 1, activeCreature: 'TestRogue' });

        const result = await handle(action, ps, campaignName);

        expect(result).toEqual({
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: 'Cunning Action',
                description: 'Cunning Action can only be used once per turn.',
            },
        });
    });

    it('returns info popup with Fast Hands tracking when oncePerTurn is true and already used', async () => {
        const ps = makePlayerStats();
        const action = makeFastHandsAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 1, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue({ round: 1, activeCreature: 'TestRogue' });

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('once per turn');
    });

    it('proceeds to modal when oncePerTurn is true but round differs by one', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 2, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue({ round: 1, activeCreature: 'TestRogue' });

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('bonusActionChoice');
    });

    it('proceeds to modal when oncePerTurn is true but round differs by more than one', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 5, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue({ round: 1, activeCreature: 'TestRogue' });

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('bonusActionChoice');
    });

    it('proceeds to modal when oncePerTurn is false', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: false });

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('bonusActionChoice');
        expect(useRuntimeState.getRuntimeValue).not.toHaveBeenCalled();
    });

    it('proceeds to modal when oncePerTurn is true but no stored value exists', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 1, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue(null);

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('bonusActionChoice');
    });

    it('proceeds to modal when oncePerTurn is true with legacy stored format (number) and different round', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 2, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue(1);

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('bonusActionChoice');
    });

    it('returns info popup when oncePerTurn is true with legacy stored format and same round', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 1, activeCreatureName: 'TestRogue' });
        useRuntimeState.getRuntimeValue.mockReturnValue(1);

        const result = await handle(action, ps, campaignName);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('once per turn');
    });
});

// ── handle: missing automation ─────────────────────────────────

describe('bonusActionChoiceHandler.handle — missing automation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when action.automation is undefined', async () => {
        const ps = makePlayerStats();
        const action = { name: 'Cunning Action' };

        await expect(handle(action, ps, campaignName)).rejects.toThrow(
            "Cannot read properties of undefined (reading 'options')",
        );
    });
});

// ── applyBonusActionChoice: known options ──────────────────────

describe('applyBonusActionChoice — known options', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns popup with correct description for Dash', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, 'Dash');

        expect(result.payload.description).toBe('Dash selected: You take the Dash bonus action. Your movement speed is doubled until the end of the turn.');
    });

    it('returns popup with correct description for Disengage', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, 'Disengage');

        expect(result.payload.description).toBe('Disengage selected: You take the Disengage bonus action. Your movement doesn\'t provoke opportunity attacks until the end of the turn.');
    });

    it('returns popup with correct description for Hide', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, 'Hide');

        expect(result.payload.description).toBe('Hide selected: You attempt to Hide. Make a Dexterity (Stealth) check to try to become hidden from creatures until the end of the turn.');
    });

    it('returns popup with correct description for Sleight of Hand', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeFastHandsAction(), ps, campaignName, 'Sleight of Hand');

        expect(result.payload.description).toBe('Sleight of Hand selected: You use Fast Hands to make a Dexterity (Sleight of Hand) check — pick pocket, palming a small object, hiding a small item, etc.');
    });

    it('returns popup with correct description for Thieves\' Tools', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeFastHandsAction(), ps, campaignName, 'Thieves\' Tools');

        expect(result.payload.description).toBe('Thieves\' Tools selected: You use Fast Hands to use thieves\' tools to pick a lock or disarm a trap.');
    });

    it('returns popup with correct description for Use an Object', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeFastHandsAction(), ps, campaignName, 'Use an Object');

        expect(result.payload.description).toBe('Use an Object selected: You use Fast Hands to use an object. Using a magic item that requires an action uses the Utilize action. Normal objects use the standard Action.');
    });

    it('returns popup with automation payload for known options', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true, customField: 'test' });
        const result = await applyBonusActionChoice(action, ps, campaignName, 'Dash');

        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.name).toBe('Cunning Action');
        expect(result.payload.automation).toEqual({
            type: 'bonus_action_choice',
            options: action.automation.options,
            oncePerTurn: true,
            customField: 'test',
        });
    });
});

// ── applyBonusActionChoice: unknown option ─────────────────────

describe('applyBonusActionChoice — unknown option', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns popup with unknown option message for unrecognized option', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, 'Foo');

        expect(result.payload.description).toBe('Unknown option: Foo');
    });

    it('returns popup with unknown option message when options array is empty', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction({ options: [] }), ps, campaignName, 'Dash');

        expect(result.payload.description).toBe('Unknown option: Dash');
    });

    it('returns popup with unknown option message when options is undefined', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction({ options: undefined }), ps, campaignName, 'Dash');

        expect(result.payload.description).toBe('Unknown option: Dash');
    });

    it('returns popup with unknown option message when chosenOption is null', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, null);

        expect(result.payload.description).toBe('Unknown option: null');
    });

    it('returns popup with unknown option message when chosenOption is undefined', async () => {
        const ps = makePlayerStats();
        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, undefined);

        expect(result.payload.description).toBe('Unknown option: undefined');
    });
});

// ── applyBonusActionChoice: once-per-turn tracking ─────────────

describe('applyBonusActionChoice — once-per-turn tracking', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('tracks once-per-turn usage with Cunning Action key when set', async () => {
        const ps = makePlayerStats();
        const action = makeAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 3, activeCreatureName: 'TestRogue' });

        await applyBonusActionChoice(action, ps, campaignName, 'Dash');

        expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
            ps.name,
            '_CunningAction_usedRound',
            { round: 3, activeCreature: 'TestRogue' },
            campaignName,
        );
    });

    it('tracks once-per-turn usage with Fast Hands key when action name is Fast Hands', async () => {
        const ps = makePlayerStats();
        const action = makeFastHandsAction({ oncePerTurn: true });
        damageUtils.getCombatContext.mockResolvedValue({ round: 5, activeCreatureName: 'TestRogue' });

        await applyBonusActionChoice(action, ps, campaignName, 'Sleight of Hand');

        expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
            ps.name,
            '_FastHands_usedRound',
            { round: 5, activeCreature: 'TestRogue' },
            campaignName,
        );
    });

    it('does not track when oncePerTurn is false', async () => {
        const ps = makePlayerStats();

        await applyBonusActionChoice(makeAction({ oncePerTurn: false }), ps, campaignName, 'Dash');
        expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('does not track when oncePerTurn is absent', async () => {
        const ps = makePlayerStats();

        await applyBonusActionChoice(makeAction(), ps, campaignName, 'Dash');
        expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
});

// ── applyBonusActionChoice: campaign logging ───────────────────

describe('applyBonusActionChoice — campaign logging', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('logs campaign entry for Cunning Action Dash', async () => {
        const ps = makePlayerStats();

        await applyBonusActionChoice(makeAction(), ps, campaignName, 'Dash');
        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
            type: 'ability_use',
            characterName: ps.name,
            abilityName: 'Cunning Action',
            description: 'Dash selected',
        });
    });

    it('logs campaign entry for Fast Hands Sleight of Hand', async () => {
        const ps = makePlayerStats();

        await applyBonusActionChoice(makeFastHandsAction(), ps, campaignName, 'Sleight of Hand');
        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
            type: 'ability_use',
            characterName: ps.name,
            abilityName: 'Fast Hands',
            description: 'Sleight of Hand selected',
        });
    });

    it('logs campaign entry for Fast Hands Thieves\' Tools', async () => {
        const ps = makePlayerStats();

        await applyBonusActionChoice(makeFastHandsAction(), ps, campaignName, 'Thieves\' Tools');
        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
            type: 'ability_use',
            characterName: ps.name,
            abilityName: 'Fast Hands',
            description: 'Thieves\' Tools selected',
        });
    });

    it('returns popup even when addEntry rejects', async () => {
        const ps = makePlayerStats();
        logService.addEntry.mockRejectedValue(new Error('log failed'));

        const result = await applyBonusActionChoice(makeAction(), ps, campaignName, 'Dash');

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Dash selected');
    });
});

// ── applyBonusActionChoice: missing automation ─────────────────

describe('applyBonusActionChoice — missing automation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when automation is null', async () => {
        const ps = makePlayerStats();
        const action = { name: 'Cunning Action', automation: null };

        await expect(applyBonusActionChoice(action, ps, campaignName, 'Dash')).rejects.toThrow(
            "Cannot read properties of null (reading 'options')",
        );
    });

    it('throws when automation is undefined', async () => {
        const ps = makePlayerStats();
        const action = { name: 'Cunning Action' };

        await expect(applyBonusActionChoice(action, ps, campaignName, 'Dash')).rejects.toThrow(
            "Cannot read properties of undefined (reading 'options')",
        );
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsBaseActions from './useCharActionsBaseActions.js';
import { createHooks, mockSetPopupHtml, mockAddEntry, campaignName, basePlayerStats } from './useCharActionsBaseActions.test-utils.js';

function makeGrv(activeConditions = [], lastAttack = null, activeBuffs = []) {
    return vi.fn((_charKey, key, _cn) => {
        if (key === 'activeConditions') return activeConditions;
        if (key === 'lastAttack') return lastAttack;
        if (key === 'activeBuffs') return activeBuffs;
        return undefined;
    });
}

function halflingStats(overrides = {}) {
    return {
        ...basePlayerStats,
        rules: '2024',
        race: { name: 'Halfling', size: 'Small (about 2-3 feet tall)' },
        automation: { passives: [{ type: 'passive_rule', effect: 'naturally_stealthy' }] },
        ...overrides,
    };
}

describe('useCharActionsBaseActions - handleHideAction Naturally Stealthy (CLA-177)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('cites Naturally Stealthy in popup and log when a one-size-larger creature is present', async () => {
        const grv = makeGrv([], { total: 18, d20: 12 });
        const srw = vi.fn().mockResolvedValue(undefined);
        const loadCombatSummary = vi.fn().mockResolvedValue({
            creatures: [
                { name: 'TestFighter', type: 'player' },
                { name: 'Ogre 1' },
            ],
        });
        const getMonsterData = vi.fn().mockResolvedValue({ name: 'Ogre', size: 'Large' });
        const hooks = createHooks({
            getRuntimeValue: grv,
            setRuntimeValue: srw,
            playerStats: halflingStats(),
            loadCombatSummary,
            getMonsterData,
        });
        const actions = useCharActionsBaseActions(hooks);
        await actions.handleHideAction();

        expect(mockSetPopupHtml).toHaveBeenCalledWith({
            type: 'automation_info',
            name: 'Hide',
            description: expect.stringContaining('Naturally Stealthy - obscured by Ogre 1 (Large, at least one size larger)'),
        });
        expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            type: 'ability_use',
            abilityName: 'Hide',
            description: expect.stringContaining('Naturally Stealthy - obscured by Ogre 1 (Large, at least one size larger)'),
        }));
    });

    it('cites Naturally Stealthy on failure popup and log too', async () => {
        const grv = makeGrv([], { total: 10, d20: 4 });
        const srw = vi.fn().mockResolvedValue(undefined);
        const loadCombatSummary = vi.fn().mockResolvedValue({
            creatures: [{ name: 'TestFighter' }, { name: 'Ogre 1', size: 'Large' }],
        });
        const hooks = createHooks({
            getRuntimeValue: grv,
            setRuntimeValue: srw,
            playerStats: halflingStats(),
            loadCombatSummary,
        });
        const actions = useCharActionsBaseActions(hooks);
        await actions.handleHideAction();

        expect(mockSetPopupHtml).toHaveBeenCalledWith({
            type: 'automation_info',
            name: 'Hide',
            description: expect.stringContaining('Hide failed! (Naturally Stealthy - obscured by Ogre 1'),
        });
        expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            description: expect.stringContaining('Naturally Stealthy'),
        }));
    });

    it('resolves creature size from monsters.json when combatSummary entry has no size', async () => {
        const grv = makeGrv([], { total: 18, d20: 12 });
        const srw = vi.fn().mockResolvedValue(undefined);
        const loadCombatSummary = vi.fn().mockResolvedValue({
            creatures: [{ name: 'TestFighter' }, { name: 'Ogre 1', size: '' }],
        });
        const getMonsterData = vi.fn().mockResolvedValue({ name: 'Ogre', size: 'Large' });
        const hooks = createHooks({
            getRuntimeValue: grv,
            setRuntimeValue: srw,
            playerStats: halflingStats(),
            loadCombatSummary,
            getMonsterData,
        });
        const actions = useCharActionsBaseActions(hooks);
        await actions.handleHideAction();

        expect(getMonsterData).toHaveBeenCalledWith('Ogre 1', expect.any(Array));
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            description: expect.stringContaining('Naturally Stealthy'),
        }));
    });

    it('does NOT cite trait for a halfling with no larger creature (baseline flat DC flow)', async () => {
        const grv = makeGrv([], { total: 18, d20: 12 });
        const srw = vi.fn().mockResolvedValue(undefined);
        const loadCombatSummary = vi.fn().mockResolvedValue({
            creatures: [{ name: 'TestFighter' }, { name: 'Kobold 1', size: 'Small' }],
        });
        const getMonsterData = vi.fn().mockResolvedValue(null);
        const hooks = createHooks({
            getRuntimeValue: grv,
            setRuntimeValue: srw,
            playerStats: halflingStats(),
            loadCombatSummary,
            getMonsterData,
        });
        const actions = useCharActionsBaseActions(hooks);
        await actions.handleHideAction();

        expect(mockSetPopupHtml).toHaveBeenCalledWith({
            type: 'automation_info',
            name: 'Hide',
            description: 'Hide successful! (d20: 12 + 0 = 18) You gain the Invisible condition and advantage on Dexterity (Stealth) checks until you attack, take damage, or use Lesser Restoration to remove the condition.',
        });
    });

    it('non-halfling control: identical baseline flow with NO trait citation even with a Large creature present', async () => {
        const grv = makeGrv([], { total: 18, d20: 12 });
        const srw = vi.fn().mockResolvedValue(undefined);
        const loadCombatSummary = vi.fn().mockResolvedValue({
            creatures: [{ name: 'TestFighter' }, { name: 'Ogre 1', size: 'Large' }],
        });
        const hooks = createHooks({
            getRuntimeValue: grv,
            setRuntimeValue: srw,
            playerStats: { ...basePlayerStats, rules: '2024' },
            loadCombatSummary,
        });
        const actions = useCharActionsBaseActions(hooks);
        await actions.handleHideAction();

        expect(mockSetPopupHtml).toHaveBeenCalledWith({
            type: 'automation_info',
            name: 'Hide',
            description: 'Hide successful! (d20: 12 + 0 = 18) You gain the Invisible condition and advantage on Dexterity (Stealth) checks until you attack, take damage, or use Lesser Restoration to remove the condition.',
        });
        expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            type: 'ability_use',
            abilityName: 'Hide',
            description: 'Stealth check: 18 (d20: 12 + 0) vs DC 15 — Success. Gained Invisible condition and advantage on Stealth checks.',
        }));
    });
});

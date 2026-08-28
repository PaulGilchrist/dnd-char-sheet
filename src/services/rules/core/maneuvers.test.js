import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processManeuvers } from './maneuvers.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));

vi.mock('../../ui/dataLoader.js', () => ({
    loadManeuvers: vi.fn(async () => [
        { name: 'Evasive Footwork', description: 'Bonus action Disengage + AC.', actionType: 'bonus_action', effect: 'ac_bonus_disengage', dieExpression: 'superiority_die' },
        { name: 'Bait and Switch', description: 'Swap places + AC.', actionType: 'movement', effect: 'ac_bonus_and_swap', dieExpression: 'superiority_die', range: '5_ft' },
        { name: 'Riposte', description: 'Reaction attack.', actionType: 'reaction', effect: 'melee_attack_reaction', dieExpression: 'superiority_die' },
    ]),
}));

vi.mock('./magicSpells.js', () => ({
    renameMagicInitiateFeatures: vi.fn(),
}));

const SELECTION_KEY = 'BattleMasterManeuvers_selection';

function makeFixtures() {
    const playerStats = {
        name: 'EvasiveFighter',
        rules: '2024',
        bonusActions: [],
        reactions: [],
        automation: { specialActions: [] },
    };
    const playerSummary = { campaignName: 'test-campaign' };
    const allFeatures = [];
    const collectAutomationFromFeatures = vi.fn(() => ({ specialActions: [] }));
    const mergeAutomationSpecialActions = vi.fn();
    return { playerStats, playerSummary, allFeatures, collectAutomationFromFeatures, mergeAutomationSpecialActions };
}

describe('processManeuvers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setRuntimeValue('EvasiveFighter', SELECTION_KEY, [], 'test-campaign');
    });

    it('does nothing when no maneuvers are selected', async () => {
        const f = makeFixtures();
        await processManeuvers(f.playerStats, f.playerSummary, f.allFeatures, f.collectAutomationFromFeatures, f.mergeAutomationSpecialActions);
        expect(f.playerStats.bonusActions).toHaveLength(0);
        expect(f.collectAutomationFromFeatures).not.toHaveBeenCalled();
    });

    it('adds Evasive Footwork as a bonus action with combat_superiority_bonus_action automation', async () => {
        setRuntimeValue('EvasiveFighter', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        const f = makeFixtures();

        await processManeuvers(f.playerStats, f.playerSummary, f.allFeatures, f.collectAutomationFromFeatures, f.mergeAutomationSpecialActions);

        const feature = f.playerStats.bonusActions.find(a => a.name === 'Evasive Footwork');
        expect(feature).toBeDefined();
        expect(feature.hasAutomation).toBe(true);
        expect(feature.automation.type).toBe('combat_superiority_bonus_action');
        expect(feature.automation.maneuverName).toBe('Evasive Footwork');
        expect(feature.automation.actionType).toBe('bonus_action');
        expect(feature.automation.effect).toBe('ac_bonus_disengage');
        expect(f.allFeatures).toContain(feature);
        expect(f.collectAutomationFromFeatures).toHaveBeenCalled();
        expect(f.mergeAutomationSpecialActions).toHaveBeenCalledWith(f.playerStats);
    });

    it('adds movement maneuvers to automation without touching bonus actions', async () => {
        setRuntimeValue('EvasiveFighter', SELECTION_KEY, ['Bait and Switch'], 'test-campaign');
        const f = makeFixtures();

        await processManeuvers(f.playerStats, f.playerSummary, f.allFeatures, f.collectAutomationFromFeatures, f.mergeAutomationSpecialActions);

        expect(f.playerStats.bonusActions).toHaveLength(0);
        const movement = f.allFeatures.find(a => a.name === 'Bait and Switch');
        expect(movement.automation.type).toBe('combat_superiority_movement');
    });

    it('picks up a selection changed at runtime without character JSON changes', async () => {
        const f = makeFixtures();
        await processManeuvers(f.playerStats, f.playerSummary, f.allFeatures, f.collectAutomationFromFeatures, f.mergeAutomationSpecialActions);
        expect(f.playerStats.bonusActions).toHaveLength(0);

        setRuntimeValue('EvasiveFighter', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        await processManeuvers(f.playerStats, f.playerSummary, f.allFeatures, f.collectAutomationFromFeatures, f.mergeAutomationSpecialActions);

        expect(f.playerStats.bonusActions.map(a => a.name)).toContain('Evasive Footwork');
    });
});

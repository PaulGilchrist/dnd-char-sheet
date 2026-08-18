// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle, applyWarpingImplosion } from './warpingImplosionHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as metamagic from '../../../../hooks/combat/useMetamagic.js';
import * as diceRoller from '../../../dice/diceRoller.js';
import { addEntry } from '../../../ui/logService.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as mapsService from '../../../maps/mapsService.js';
import * as classFeatures from '../../../../services/character/classFeatures.js';
import * as rangeValidation from '../../../rules/combat/rangeValidation.js';

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../../maps/mapsService.js', () => ({
    loadMapData: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../hooks/combat/useMetamagic.js', () => ({
    getCurrentSorceryPoints: vi.fn(),
    spendSorceryPoints: vi.fn(),
}));

vi.mock('../../../../services/character/classFeatures.js', () => ({
    getClassFeatures: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
    rangeToFeet: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

const campaignName = 'TestCampaign';
const playerName = 'TestHero';

const makeAction = (overrides = {}) => ({
    name: 'Warping Implosion',
    automation: {
        action: 'action',
        casting_time: '1 action',
        damage: '3d10',
        damageType: 'Force',
        saveType: 'STR',
        saveDc: 'ability',
        saveAbility: 'CHA',
        shape: 'emanation_30ft',
        range: '30_ft',
        uses: 1,
        recharge: 'long_rest',
        resourceCost: 'sorcery_points',
        restoreCost: 5,
        hasOptions: true,
        optionDetails: {},
        ...overrides.automation,
    },
    ...overrides,
});

const makePlayerStats = (overrides = {}) => ({
    name: playerName,
    level: 18,
    proficiencyBonus: 6,
    abilities: [{ name: 'Charisma', bonus: 4 }],
    ...overrides,
});

describe('warpingImplosionHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollExpression.mockReturnValue({ total: 27, rolls: [10, 10, 7], modifier: 0 });
        runtimeState.getRuntimeValue.mockReturnValue(null);
        metamagic.getCurrentSorceryPoints.mockReturnValue(10);
        metamagic.spendSorceryPoints.mockReturnValue(undefined);
        addEntry.mockResolvedValue(undefined);
        runtimeState.setRuntimeValue.mockResolvedValue(undefined);
        savePrompt.buildSaveDc.mockReturnValue(14);
        mapsService.loadMapData.mockResolvedValue(null);
        classFeatures.getClassFeatures.mockReturnValue({ maxSorceryPoints: 20 });
        rangeValidation.rangeToFeet.mockReturnValue(undefined);
    });

    describe('handle', () => {
        it('returns modal with correct payload for normal use', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('warpingImplosion');
            expect(result.payload.saveType).toBe('STR');
            expect(result.payload.saveDc).toBe(14);
            expect(result.payload.damageType).toBe('Force');
            expect(result.payload.damageExpression).toBe('3d10');
            expect(result.payload.teleportRange).toBe(120);
            expect(result.payload.restoreCost).toBe(5);
            expect(result.payload.canRestore).toBe(true);
            expect(result.payload.hasRemaining).toBe(true);
            expect(result.payload.campaignName).toBe(campaignName);
        });

        it('returns popup when no uses and cannot restore', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);
            metamagic.getCurrentSorceryPoints.mockReturnValue(2);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No remaining uses');
            expect(result.payload.description).toContain('cannot restore');
        });

        it('returns modal when no uses but can restore', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);
            metamagic.getCurrentSorceryPoints.mockReturnValue(10);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.canRestore).toBe(true);
            expect(result.payload.hasRemaining).toBe(false);
        });

        it('defaults to max uses when runtime value is null or NaN', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            let result = await handle(makeAction(), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('modal');
            expect(result.payload.hasRemaining).toBe(true);

            runtimeState.getRuntimeValue.mockReturnValue(NaN);
            result = await handle(makeAction(), makePlayerStats(), campaignName, null);
            expect(result.payload.hasRemaining).toBe(false);
        });

        it('returns modal with range resolved from shape string when rangeToFeet is falsy', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.rangeFeet).toBe(30);
        });

        it('returns modal with range 10 as fallback for unknown shape', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);
            const action = makeAction({ automation: { shape: 'unknown_shape' } });

            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result.payload.rangeFeet).toBe(10);
        });

        it('returns modal with aquaticAffinity range override when available', async () => {
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (key === 'aquaticAffinityEmanationRange') return '60';
                return 1;
            });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.rangeFeet).toBe(60);
        });

        it('includes mapData and attackerPos in payload when no map provided', async () => {
            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.mapData).toBeNull();
            expect(result.payload.attackerPos).toBeNull();
        });

        it('includes mapData and attackerPos when mapName is provided', async () => {
            const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');
            getCombatContext.mockResolvedValue({ attacker: {} });
            mapsService.loadMapData.mockResolvedValue({ tiles: [] });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'battlemap');

            expect(result.payload.mapData).toEqual({ tiles: [] });
            expect(result.payload.attackerPos).toEqual({ gridX: 0, gridY: 0 });
        });

        it('handles map loading failure gracefully', async () => {
            const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');
            getCombatContext.mockResolvedValue({ attacker: {} });
            mapsService.loadMapData.mockRejectedValue(new Error('map not found'));

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'battlemap');

            expect(result.payload.mapData).toBeNull();
            expect(result.payload.attackerPos).toEqual({ gridX: 0, gridY: 0 });
        });

        it('uses custom restoreCost in payload', async () => {
            const action = makeAction({ automation: { restoreCost: 3 } });

            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result.payload.restoreCost).toBe(3);
        });

        it('uses custom resourceKey for uses tracking', async () => {
            const action = makeAction({ automation: { resourceKey: 'customUses' } });
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (key === 'customUses') return 1;
                return 1;
            });

            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.hasRemaining).toBe(true);
        });

        it('handles null getClassFeatures without crashing', async () => {
            classFeatures.getClassFeatures.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.canRestore).toBe(true);
        });

        it('handles negative currentUses with canRestore', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(-1);
            metamagic.getCurrentSorceryPoints.mockReturnValue(10);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.hasRemaining).toBe(false);
        });
    });

    describe('applyWarpingImplosion', () => {
        it('returns popup when no uses remaining and not restoring', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No remaining uses');
        });

        it('returns popup when not enough sorcery points to restore', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            metamagic.getCurrentSorceryPoints.mockReturnValue(2);

            const result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                true
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Not enough Sorcery Points');
        });

        it('spends sorcery points when restoring successfully', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            metamagic.getCurrentSorceryPoints.mockReturnValue(10);

            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                true
            );

            expect(metamagic.spendSorceryPoints).toHaveBeenCalledWith(
                playerName,
                5,
                campaignName,
                20
            );
        });

        it('decrements uses when not restoring', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'warpingimplosionUses',
                0,
                campaignName
            );
        });

        it('uses custom resourceKey for uses tracking', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            const action = makeAction({ automation: { resourceKey: 'customImplosionUses' } });

            await applyWarpingImplosion(
                action,
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'customImplosionUses',
                0,
                campaignName
            );
        });

        it('returns roll result with damage data', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(result.type).toBe('roll');
            expect(result.payload.rollType).toBe('damage');
            expect(result.payload.name).toBe('Warping Implosion');
            expect(result.payload.formula).toBe('3d10');
            expect(result.payload.total).toBe(27);
            expect(result.payload.rolls).toEqual([10, 10, 7]);
            expect(result.payload.modifier).toBe(0);
        });

        it('includes save configuration and notes in roll payload', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            savePrompt.buildSaveDc.mockReturnValue(15);

            const result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(result.payload.contextConfig.damageType).toBe('Force');
            expect(result.payload.contextConfig.saveDc).toBe(15);
            expect(result.payload.contextConfig.saveType).toBe('STR');
            expect(result.payload.contextConfig.attackerName).toBe(playerName);
            expect(result.payload.notes).toContain('Teleported to an unoccupied space within 120 feet');
            expect(result.payload.notes).toContain('30 feet');
            expect(result.payload.notes).toContain('STR saving throw');
            expect(result.payload.notes).toContain('DC 15');
            expect(result.payload.notes).toContain('27 Force damage');
        });

        it('adds campaign log entry for ability use', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: playerName,
                abilityName: 'Warping Implosion',
                timestamp: expect.any(Number),
            }));
        });

        it('includes restored note when using sorcery points', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            metamagic.getCurrentSorceryPoints.mockReturnValue(10);

            const result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                true
            );

            expect(result.payload.notes).toContain('Restored with 5 Sorcery Points');
        });

        it('dispels magical darkness when shape is an area shape', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            const action = makeAction({ automation: { shape: 'sphere' } });

            const result = await applyWarpingImplosion(
                action,
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(result.payload.notes).toContain('Magical Darkness in the area is dispelled');
        });

        it('does not dispel darkness for non-area or missing shapes', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            let result = await applyWarpingImplosion(
                makeAction({ automation: { shape: 'single_target' } }),
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );
            expect(result.payload.notes).not.toContain('Magical Darkness');

            result = await applyWarpingImplosion(
                makeAction({ automation: { shape: undefined } }),
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );
            expect(result.payload.notes).not.toContain('Magical Darkness');

            result = await applyWarpingImplosion(
                makeAction({ automation: { shape: '' } }),
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );
            expect(result.payload.notes).not.toContain('Magical Darkness');
        });

        it('handles null or empty damage result gracefully', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            diceRoller.rollExpression.mockReturnValue(null);
            let result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );
            expect(result.payload.total).toBe(0);
            expect(result.payload.rolls).toEqual([]);
            expect(result.payload.modifier).toBe(0);

            diceRoller.rollExpression.mockReturnValue({});
            result = await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );
            expect(result.payload.total).toBe(0);
            expect(result.payload.rolls).toEqual([]);
            expect(result.payload.modifier).toBe(0);
        });

        it('uses custom action name when provided', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            const action = makeAction({ name: 'Custom Warping Implosion' });

            const result = await applyWarpingImplosion(
                action,
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(result.payload.name).toBe('Custom Warping Implosion');
            expect(result.payload.contextConfig.attackerName).toBe('TestHero');
        });

        it('uses custom saveType from automation', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            const action = makeAction({ automation: { saveType: 'DEX' } });

            const result = await applyWarpingImplosion(
                action,
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(result.payload.contextConfig.saveType).toBe('DEX');
        });

        it('handles spentSP as 0 (falsy) by decrementing uses', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                0
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'warpingimplosionUses',
                0,
                campaignName
            );
            expect(metamagic.spendSorceryPoints).not.toHaveBeenCalled();
        });

        it('handles null or undefined targets in log entry', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                { gridX: 5, gridY: 5 },
                false
            );
            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('0 creature'),
            }));

            addEntry.mockClear();
            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                undefined,
                { gridX: 5, gridY: 5 },
                false
            );
            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('0 creature'),
            }));
        });

        it('respects custom restoreCost when spending SP', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);
            metamagic.getCurrentSorceryPoints.mockReturnValue(10);
            const action = makeAction({ automation: { restoreCost: 3 } });

            await applyWarpingImplosion(
                action,
                makePlayerStats(),
                campaignName,
                [],
                { gridX: 5, gridY: 5 },
                true
            );

            expect(metamagic.spendSorceryPoints).toHaveBeenCalledWith(
                playerName,
                3,
                campaignName,
                20
            );
        });

        it('uses custom uses value and decrements correctly', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);
            const action = makeAction({ automation: { uses: 3 } });

            await applyWarpingImplosion(
                action,
                makePlayerStats(),
                campaignName,
                ['Enemy1'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'warpingimplosionUses',
                2,
                campaignName
            );
        });

        it('includes target count in log description', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            await applyWarpingImplosion(
                makeAction(),
                makePlayerStats(),
                campaignName,
                ['Enemy1', 'Enemy2', 'Enemy3'],
                { gridX: 5, gridY: 5 },
                false
            );

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('3 creature'),
            }));
        });
    });
});

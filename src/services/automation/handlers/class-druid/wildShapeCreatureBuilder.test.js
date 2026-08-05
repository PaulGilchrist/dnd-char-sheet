import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/storage.js', () => ({
    default: { set: vi.fn() },
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../buffs/tempHpService.js', () => ({
    setTempHp: vi.fn(),
}));

import { activateWildShape, cleanupWildShape } from './wildShapeCreatureBuilder.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import storage from '../../../ui/storage.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { setTempHp } from '../buffs/tempHpService.js';
import { addEntry } from '../../../ui/logService.js';

const campaignName = 'TestCampaign';

const giantSpider = { index: 'giant-spider', name: 'Giant Spider', challenge_rating: 1 };

const druidStats = {
    name: 'Maribelle',
    level: 2,
    class: { major: { name: 'Druid' }, class_levels: [{ level: 2, wild_shape: 2 }] },
};

function mockRuntimeForActivate() {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === 'campaign' && key === 'targetEffects') return [];
        return undefined;
    });
}

describe('wildShapeCreatureBuilder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRuntimeForActivate();
        setTempHp.mockImplementation(() => {});
        addEntry.mockResolvedValue(undefined);
    });

    describe('activateWildShape', () => {
        it('marks the druid player creature and does not add a beast creature', async () => {
            const cs = { creatures: [{ name: 'Maribelle', type: 'player', initiative: '20' }] };
            getCombatContext.mockResolvedValue(cs);

            const result = await activateWildShape('Maribelle', giantSpider, druidStats, campaignName);

            expect(cs.creatures).toHaveLength(1);
            expect(cs.creatures[0].name).toBe('Maribelle');
            expect(cs.creatures[0].type).toBe('player');
            expect(cs.creatures[0].wildShapeSource).toBe('Maribelle');
            expect(cs.creatures[0].beastIndex).toBe('giant-spider');
            expect(cs.creatures[0].beastName).toBe('Giant Spider');
            expect(storage.set).toHaveBeenCalledWith('combatSummary', cs, campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', [
                { target: 'Maribelle', source: 'Maribelle', effect: 'wild_shape', beastName: 'Giant Spider' },
            ], campaignName);
            expect(setTempHp).toHaveBeenCalledWith('Maribelle', 2, campaignName);
            expect(result).toEqual({ name: 'Giant Spider', index: 'giant-spider' });
        });

        it('removes leftover beast creatures from previous versions', async () => {
            const cs = {
                creatures: [
                    { name: 'Giant Spider', type: 'npc', wildShapeSource: 'Maribelle' },
                    { name: 'Maribelle', type: 'player' },
                ],
            };
            getCombatContext.mockResolvedValue(cs);

            await activateWildShape('Maribelle', giantSpider, druidStats, campaignName);

            expect(cs.creatures).toHaveLength(1);
            expect(cs.creatures[0].name).toBe('Maribelle');
            expect(cs.creatures[0].wildShapeSource).toBe('Maribelle');
        });

        it('keeps working when there is no combat summary yet', async () => {
            getCombatContext.mockResolvedValue(null);

            await expect(activateWildShape('Maribelle', giantSpider, druidStats, campaignName)).resolves.toBeDefined();
        });
    });

    describe('cleanupWildShape', () => {
        it('clears markers from the druid player creature and removes leftover beast cards', () => {
            const cs = {
                creatures: [
                    { name: 'Giant Spider', type: 'npc', wildShapeSource: 'Maribelle' },
                    { name: 'Maribelle', type: 'player', wildShapeSource: 'Maribelle', beastIndex: 'giant-spider', beastName: 'Giant Spider' },
                ],
            };
            getCombatSummary.mockReturnValue(cs);
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'campaign' && key === 'targetEffects') {
                    return [{ target: 'Maribelle', source: 'Maribelle', effect: 'wild_shape', beastName: 'Giant Spider' }];
                }
                if (name === 'Maribelle' && key === 'activeBuffs') {
                    return [{ name: 'Wild Shape', effect: 'shape_shift' }];
                }
                return undefined;
            });

            cleanupWildShape('Maribelle', campaignName);

            expect(cs.creatures).toHaveLength(1);
            expect(cs.creatures[0].name).toBe('Maribelle');
            expect(cs.creatures[0].wildShapeSource).toBeUndefined();
            expect(cs.creatures[0].beastIndex).toBeUndefined();
            expect(cs.creatures[0].beastName).toBeUndefined();
            expect(storage.set).toHaveBeenCalledWith('combatSummary', cs, campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', [], campaignName, true);
            expect(setRuntimeValue).toHaveBeenCalledWith('Maribelle', 'activeBuffs', [], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith('Maribelle', 'tempHp', 0, campaignName);
        });
    });
});

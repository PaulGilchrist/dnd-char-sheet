// WM-004: Push weapon mastery — hit applies instant 10 ft push te (Large or
// smaller gate via MN-015 validateSizeLimit) + ability_use log.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { applyMasteryEffect, MASTERY_EFFECTS } from './weaponMasteryHandler.js';
import { getEffectDefinition } from '../../../combat/conditions/targetEffectDefinitions.js';

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as monsterUtils from '../../../npcs/monsterUtils.js';
import * as combatData from '../../../../services/encounters/combatData.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../npcs/monsterUtils.js', () => ({
    getMonsterData: vi.fn(),
    getMonsterImageUrl: vi.fn(),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(),
}));

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
    return {
        name: 'DraconicDragon',
        proficiency: 6,
        size: 'Medium',
        abilities: [{ name: 'Strength', bonus: 5 }],
        ...overrides,
    };
}

function combatSummaryWith(targetName, size) {
    return { creatures: [{ name: targetName, size }] };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(combatData.getCurrentCombatRound).mockReturnValue(1);
    vi.mocked(useRuntimeState.getRuntimeValue).mockReturnValue([]);
});

describe('MASTERY_EFFECTS Push entry', () => {
    it('has a Push entry shaped consistently with Slow/Sap siblings', () => {
        expect(MASTERY_EFFECTS.Push).toBeDefined();
        expect(MASTERY_EFFECTS.Push.effect).toBe('push');
        expect(MASTERY_EFFECTS.Push.value).toBe(10);
        expect(MASTERY_EFFECTS.Push.sizeLimit).toBe('large_or_smaller');
        expect(MASTERY_EFFECTS.Push.requiresSave).toBeUndefined();
    });

    it('push is registered in the target effect registry', () => {
        const def = getEffectDefinition('push');
        expect(def).toBeDefined();
        expect(def.label).toBe('Pushed');
        expect(def.group).toBe('Movement');
    });
});

describe('applyMasteryEffect Push', () => {
    it('writes instant push targetEffect value 10 and logs on a Medium target', async () => {
        vi.mocked(damageUtils.getCombatContext).mockResolvedValue(combatSummaryWith('Thug 1', 'Medium'));
        vi.mocked(monsterUtils.getMonsterData).mockResolvedValue({ size: 'Medium' });

        const result = await applyMasteryEffect('Push', makePlayerStats(), campaignName, 'Thug 1');

        const setCalls = vi.mocked(useRuntimeState.setRuntimeValue).mock.calls;
        const teWrite = setCalls.find(c => c[1] === 'targetEffects');
        expect(teWrite).toBeDefined();
        const te = teWrite[2].find(t => t.effect === 'push');
        expect(te).toMatchObject({
            target: 'Thug 1',
            source: 'Push',
            option: 'Push',
            effect: 'push',
            value: 10,
            duration: 'instant',
        });

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('pushed up to 10 feet straight away');

        const log = vi.mocked(logService.addEntry).mock.calls.map(c => c[1])
            .find(e => e.type === 'ability_use' && e.abilityName === 'Push');
        expect(log).toBeDefined();
        expect(log.description).toContain('Thug 1');
        expect(log.description).toContain('pushed 10 feet');
    });

    it('falls back to combatSummary target.size when monster data has no entry', async () => {
        vi.mocked(damageUtils.getCombatContext).mockResolvedValue(combatSummaryWith('Thug 1', 'Medium'));
        vi.mocked(monsterUtils.getMonsterData).mockResolvedValue(null);

        const result = await applyMasteryEffect('Push', makePlayerStats(), campaignName, 'Thug 1');

        expect(result.type).toBe('popup');
        const teWrite = vi.mocked(useRuntimeState.setRuntimeValue).mock.calls.find(c => c[1] === 'targetEffects');
        expect(teWrite[2].some(t => t.effect === 'push' && t.target === 'Thug 1')).toBe(true);
    });

    it('refuses a Huge target: no targetEffect, refusal log, no push-applied wording', async () => {
        vi.mocked(damageUtils.getCombatContext).mockResolvedValue(combatSummaryWith('Hill Giant 1', 'Huge'));
        vi.mocked(monsterUtils.getMonsterData).mockResolvedValue({ size: 'Huge' });

        const result = await applyMasteryEffect('Push', makePlayerStats(), campaignName, 'Hill Giant 1');

        const teWrites = vi.mocked(useRuntimeState.setRuntimeValue).mock.calls.filter(c => c[1] === 'targetEffects');
        expect(teWrites.length).toBe(0);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Huge');
        expect(result.payload.description).toContain('Large or smaller');

        const logs = vi.mocked(logService.addEntry).mock.calls.map(c => c[1]);
        const refusal = logs.find(e => e.type === 'ability_use' && e.abilityName === 'Push');
        expect(refusal).toBeDefined();
        expect(refusal.description).toContain('too large');
        expect(refusal.description).not.toContain('pushed 10 feet');
    });

    it('keeps sibling masteries intact: Slow still writes speed_reduction te', async () => {
        vi.mocked(damageUtils.getCombatContext).mockResolvedValue(combatSummaryWith('Thug 1', 'Medium'));

        const result = await applyMasteryEffect('Slow', makePlayerStats(), campaignName, 'Thug 1');

        expect(result.type).toBe('popup');
        const teWrite = vi.mocked(useRuntimeState.setRuntimeValue).mock.calls.find(c => c[1] === 'targetEffects');
        expect(teWrite[2].some(t => t.effect === 'speed_reduction' && t.value === 10)).toBe(true);
    });
});

// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispelSpellsOnTarget, resolveSpellLevel } from './clockworkCavalcadeDispel.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/dataLoader.js', () => ({
    loadSpells: vi.fn(),
}));

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import { loadSpells } from '../../../ui/dataLoader.js';

const CAMPAIGN = 'test-campaign';
const TARGET = 'Goblin';

const MOCK_SPELLS = [
    { name: 'Bless', level: 1 },
    { name: 'Hold Person', level: 2 },
    { name: 'Fly', level: 3 },
    { name: 'Death Ward', level: 4 },
    { name: 'Wall of Force', level: 5 },
    { name: 'Invisibility', level: 2 },
    { name: 'Mage Armor', level: 1 },
    { name: 'Simulacrum', level: 7 },
    { name: 'Power Word Kill', level: 9 },
];

function baseRuntimeValues() {
    useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return baseEffects();
        if (key === TARGET && prop === 'activeBuffs') return baseBuffs();
        if (key === TARGET && prop === 'activeConditions') return ['charmed', 'poisoned'];
        if (key === TARGET && prop === 'activeConditionMeta') return { charmed: { label: 'Charmed' } };
        return null;
    });
}

function baseEffects() {
    return [
        { target: TARGET, effect: 'charmed', spellName: 'Hold Person', condition: 'charmed' },
        { target: TARGET, effect: 'bless', spellName: 'Bless' },
        { target: TARGET, effect: 'simulacrum', spellName: 'Simulacrum' },
        { target: 'Other', effect: 'shield', spellName: 'Shield' },
    ];
}

function baseBuffs() {
    return [
        { name: 'Mage Armor', duration: '8_hours' },
        { name: 'Death Ward', duration: '8_hours' },
        { name: 'Invisibility', duration: '1_minute' },
        { name: 'Bardic Inspiration', duration: '10_minutes' },
    ];
}

describe('clockworkCavalcadeDispel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        loadSpells.mockResolvedValue(MOCK_SPELLS);
        baseRuntimeValues();
    });

    describe('resolveSpellLevel', () => {
        it('uses the stored spellLevel when present', async () => {
            const level = await resolveSpellLevel({ spellName: 'Unknown', spellLevel: 4 });
            expect(level).toBe(4);
            expect(loadSpells).not.toHaveBeenCalled();
        });

        it('looks up the spell level by name', async () => {
            const level = await resolveSpellLevel({ spellName: 'Wall of Force' });
            expect(level).toBe(5);
        });

        it('falls back to label when spellName is missing', async () => {
            const level = await resolveSpellLevel({ label: 'Fly' });
            expect(level).toBe(3);
        });

        it('returns null for unknown names', async () => {
            const level = await resolveSpellLevel({ spellName: 'Not A Spell' });
            expect(level).toBeNull();
        });
    });

    describe('dispelSpellsOnTarget', () => {
        it('removes target effects of level 6 or lower and keeps higher-level ones', async () => {
            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            expect(result.effects.map(te => te.spellName)).toEqual(['Hold Person', 'Bless']);
            const remaining = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'targetEffects'
            );
            const remainingForTarget = remaining[2].filter(te => te.target === TARGET);
            expect(remainingForTarget.map(te => te.spellName)).toEqual(['Simulacrum']);
        });

        it('does not touch effects on other targets', async () => {
            await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            const remaining = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'targetEffects'
            );
            expect(remaining[2]).toContainEqual(expect.objectContaining({ target: 'Other' }));
        });

        it('removes spell-derived buffs of level 6 or lower', async () => {
            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            expect(result.buffs.map(b => b.name)).toEqual(['Mage Armor', 'Death Ward', 'Invisibility']);
            const remaining = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeBuffs'
            );
            expect(remaining[2].map(b => b.name)).toEqual(['Bardic Inspiration']);
        });

        it('removes conditions matching dispelled effect conditions', async () => {
            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            expect(result.conditions).toEqual(['charmed']);
            const condsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeConditions'
            );
            expect(condsCall[2]).toEqual(['poisoned']);
        });

        it('cleans up condition metadata for removed conditions', async () => {
            await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            const metaCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeConditionMeta'
            );
            expect(metaCall[2]).toEqual({});
        });

        it('keeps high-level effects and non-spell buffs untouched', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [
                        { target: TARGET, effect: 'pwk', spellName: 'Power Word Kill' },
                        { target: TARGET, effect: 'heroism', label: 'Heroism' },
                    ];
                }
                if (key === TARGET && prop === 'activeBuffs') {
                    return [{ name: 'Mage Armor' }];
                }
                return [];
            });

            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            expect(result.effects).toEqual([]);
            expect(result.buffs.map(b => b.name)).toEqual(['Mage Armor']);
            const effectsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'targetEffects'
            );
            expect(effectsCall).toBeUndefined();
            const buffsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeBuffs'
            );
            expect(buffsCall[2]).toEqual([]);
        });

        it('returns a report with the target name', async () => {
            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);
            expect(result.target).toBe(TARGET);
        });
    });
});
// @cleaned-by-ai

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
    { name: 'Bane', level: 1 },
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
        it('returns the stored spellLevel when present', async () => {
            const level = await resolveSpellLevel({ spellName: 'Unknown', spellLevel: 4 });
            expect(level).toBe(4);
            expect(loadSpells).not.toHaveBeenCalled();
        });

        it('returns 0 when spellLevel is 0', async () => {
            const level = await resolveSpellLevel({ spellLevel: 0 });
            expect(level).toBe(0);
            expect(loadSpells).not.toHaveBeenCalled();
        });

        it('falls through to name lookup when spellLevel is null', async () => {
            const level = await resolveSpellLevel({ spellLevel: null, spellName: 'Fly' });
            expect(level).toBe(3);
        });

        it('falls through to name lookup when spellLevel is undefined', async () => {
            const level = await resolveSpellLevel({ spellLevel: undefined, spellName: 'Fly' });
            expect(level).toBe(3);
        });

        it('looks up the spell level by spellName', async () => {
            const level = await resolveSpellLevel({ spellName: 'Wall of Force' });
            expect(level).toBe(5);
        });

        it('looks up by name property when spellName is absent', async () => {
            const level = await resolveSpellLevel({ name: 'Fly' });
            expect(level).toBe(3);
        });

        it('looks up by label when spellName and name are absent', async () => {
            const level = await resolveSpellLevel({ label: 'Fly' });
            expect(level).toBe(3);
        });

        it('looks up by condition when no name properties are present', async () => {
            const level = await resolveSpellLevel({ condition: 'Hold Person' });
            expect(level).toBe(2);
        });

        it('returns null for unknown spell names', async () => {
            const level = await resolveSpellLevel({ spellName: 'Not A Spell' });
            expect(level).toBeNull();
        });

        it('returns null when effect is null', async () => {
            const level = await resolveSpellLevel(null);
            expect(level).toBeNull();
        });

        it('returns null when effect is undefined', async () => {
            const level = await resolveSpellLevel(undefined);
            expect(level).toBeNull();
        });

        it('returns null when effect has no resolvable properties', async () => {
            const level = await resolveSpellLevel({});
            expect(level).toBeNull();
        });

        it('returns null when all fallback properties are empty strings', async () => {
            const level = await resolveSpellLevel({ spellName: '', name: '', label: '', condition: '' });
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

        it('keeps high-level and unresolvable effects while removing low-level buffs', async () => {
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

        it('does not call setRuntimeValue when no effects are dispelled', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [
                        { target: TARGET, effect: 'simulacrum', spellName: 'Simulacrum' },
                    ];
                }
                if (key === TARGET && prop === 'activeBuffs') {
                    return [{ name: 'Bardic Inspiration' }];
                }
                return [];
            });

            await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            const effectsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'targetEffects'
            );
            expect(effectsCall).toBeUndefined();
            const buffsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeBuffs'
            );
            expect(buffsCall).toBeUndefined();
        });

        it('handles null targetEffects gracefully', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return null;
                if (key === TARGET && prop === 'activeBuffs') return [];
                return [];
            });

            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);
            expect(result.effects).toEqual([]);
            expect(result.buffs).toEqual([]);
            expect(result.conditions).toEqual([]);
            expect(result.target).toBe(TARGET);
        });

        it('handles null activeBuffs gracefully', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [];
                if (key === TARGET && prop === 'activeBuffs') return null;
                return [];
            });

            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);
            expect(result.effects).toEqual([]);
            expect(result.buffs).toEqual([]);
            expect(result.conditions).toEqual([]);
        });

        it('handles null activeConditions gracefully', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: TARGET, effect: 'bless', spellName: 'Bless' }];
                }
                if (key === TARGET && prop === 'activeBuffs') return [];
                if (key === TARGET && prop === 'activeConditions') return null;
                return {};
            });

            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);
            expect(result.effects.map(te => te.spellName)).toEqual(['Bless']);
            expect(result.conditions).toEqual([]);
        });

        it('keeps buffs with no resolvable spell level', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [];
                if (key === TARGET && prop === 'activeBuffs') {
                    return [{ name: 'Rage', duration: '1_minute' }];
                }
                return [];
            });

            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);
            expect(result.buffs).toEqual([]);
            const buffsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeBuffs'
            );
            expect(buffsCall).toBeUndefined();
        });

        it('does not clean up condition metadata when no effects have conditions', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: TARGET, effect: 'bless', spellName: 'Bless' }];
                }
                if (key === TARGET && prop === 'activeBuffs') return [];
                if (key === TARGET && prop === 'activeConditions') return ['poisoned'];
                if (key === TARGET && prop === 'activeConditionMeta') return { poisoned: { label: 'Poisoned' } };
                return null;
            });

            await dispelSpellsOnTarget(TARGET, CAMPAIGN);

            const metaCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeConditionMeta'
            );
            expect(metaCall).toBeUndefined();
        });

        it('removes only matching conditions from the condition list', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [
                        { target: TARGET, effect: 'charmed', spellName: 'Hold Person', condition: 'charmed' },
                        { target: TARGET, effect: 'frightened', spellName: 'Bane', condition: 'frightened' },
                    ];
                }
                if (key === TARGET && prop === 'activeBuffs') return [];
                if (key === TARGET && prop === 'activeConditions') return ['charmed', 'frightened', 'poisoned'];
                if (key === TARGET && prop === 'activeConditionMeta') return {
                    charmed: { label: 'Charmed' },
                    frightened: { label: 'Frightened' },
                    poisoned: { label: 'Poisoned' },
                };
                return null;
            });

            const result = await dispelSpellsOnTarget(TARGET, CAMPAIGN);
            expect(result.conditions).toEqual(['charmed', 'frightened']);
            const condsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
                c => c[1] === 'activeConditions'
            );
            expect(condsCall[2]).toEqual(['poisoned']);
        });
    });
});

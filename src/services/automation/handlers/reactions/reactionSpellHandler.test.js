// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle, applyWarCasterReaction } from './reactionSpellHandler.js';
import * as logService from '../../../ui/logService.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────

const campaignName = 'TestCampaign';
const playerName = 'TestCleric';

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        level: 10,
        spellAbilities: {
            spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: 'Always', level: 1, range: '30 feet' },
                { name: 'Shield', casting_time: '1 reaction', prepared: 'Always', level: 1, range: 'Self' },
                { name: 'Fireball', casting_time: '1 action', prepared: 'Always', level: 3, range: '150 feet', area_of_effect: { shape: 'sphere', size: '20-foot-radius' } },
                { name: 'Mage Armor', casting_time: '1 bonus action', prepared: 'Always', level: 1, range: 'Touch' },
            ],
        },
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Reactive Spell',
        automation: { type: 'reaction_spell', ...overrides.automation },
        ...overrides,
    };
}

// ── Tests ────────────────────────────────────────────────────────

describe('reactionSpellHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle — return structure', () => {
        it('returns popup with automation_info type and correct payload fields', async () => {
            const action = makeAction();
            const ps = makePlayerStats();

            const result = await handle(action, ps, campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.trigger).toBe('opportunity_attack_reaction');
            expect(result.payload.automation).toEqual(action.automation);
            expect(result.payload.name).toBe('Reactive Spell');
        });

        it('uses the action name in the payload', async () => {
            const action = { name: 'My Reactive Spell', automation: { type: 'reaction_spell' } };
            const ps = makePlayerStats();

            const result = await handle(action, ps, campaignName);

            expect(result.payload.name).toBe('My Reactive Spell');
        });

        it('handles null or missing action.automation gracefully', async () => {
            const action = { name: 'Test', automation: null };
            const ps = makePlayerStats();

            const result = await handle(action, ps, campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.automation).toBeNull();
        });

        it('handles missing action name by using undefined', async () => {
            const action = { automation: { type: 'reaction_spell' } };
            const ps = makePlayerStats();

            const result = await handle(action, ps, campaignName);

            expect(result.payload.name).toBeUndefined();
        });
    });

    describe('handle — spell eligibility filtering', () => {
        it('includes 1 action spells and excludes reaction and bonus action spells', async () => {
            const ps = makePlayerStats();
            const result = await handle(makeAction(), ps, campaignName);

            const spellNames = result.payload.eligibleSpells.map(s => s.name);
            expect(spellNames).toContain('Burning Hands');
            expect(spellNames).not.toContain('Shield');
            expect(spellNames).not.toContain('Mage Armor');
        });

        it('includes spells with casting_time "Action" (capitalized)', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Cure Wounds', casting_time: 'Action', prepared: 'Always', level: 1 },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells.map(s => s.name)).toContain('Cure Wounds');
        });

        it('excludes spells with casting_time other than 1 action or Action', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Haste', casting_time: '1 bonus action', prepared: 'Always', level: 3 },
                { name: 'Castigate', casting_time: '1 minute', prepared: 'Always', level: 5 },
                { name: 'Shield', casting_time: '1 reaction', prepared: 'Always', level: 1 },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells).toHaveLength(0);
        });

        it('excludes unprepared spells (string and boolean false)', async () => {
            const ps1 = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: 'Not Prepared', level: 1 },
            ] } });
            let result = await handle(makeAction(), ps1, campaignName);
            expect(result.payload.eligibleSpells).toHaveLength(0);

            const ps2 = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: false, level: 1 },
            ] } });
            result = await handle(makeAction(), ps2, campaignName);
            expect(result.payload.eligibleSpells).toHaveLength(0);
        });

        it('includes spells with prepared "Prepared" or "Always"', async () => {
            const ps1 = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: 'Prepared', level: 1 },
            ] } });
            let result = await handle(makeAction(), ps1, campaignName);
            expect(result.payload.eligibleSpells).toHaveLength(1);

            const ps2 = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: 'Always', level: 1 },
            ] } });
            result = await handle(makeAction(), ps2, campaignName);
            expect(result.payload.eligibleSpells).toHaveLength(1);
        });

        it('handles null or missing spellAbilities/spells gracefully', async () => {
            expect((await handle(makeAction(), makePlayerStats({ spellAbilities: null }), campaignName)).payload.eligibleSpells).toHaveLength(0);
            expect((await handle(makeAction(), makePlayerStats({ spellAbilities: {} }), campaignName)).payload.eligibleSpells).toHaveLength(0);
            expect((await handle(makeAction(), null, campaignName)).payload.eligibleSpells).toHaveLength(0);
        });
    });

    describe('handle — single-target filtering', () => {
        it('excludes spells with area_of_effect', async () => {
            const ps = makePlayerStats();
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells.find(s => s.name === 'Fireball')).toBeUndefined();
            expect(result.payload.hasWarnings).toBe(true);
        });

        it('excludes spells with automation.maxTargets > 1', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Acid Splash', casting_time: '1 action', prepared: 'Always', level: 1, automation: { maxTargets: 2 } },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells).toHaveLength(0);
            expect(result.payload.hasWarnings).toBe(true);
        });

        it('includes single-target spells without area_of_effect or maxTargets', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: 'Always', level: 1 },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells).toHaveLength(1);
            expect(result.payload.hasWarnings).toBe(false);
        });

        it('includes spells with automation.maxTargets <= 1', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Magic Missile', casting_time: '1 action', prepared: 'Always', level: 1, automation: { maxTargets: 1 } },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells).toHaveLength(1);
            expect(result.payload.hasWarnings).toBe(false);
        });
    });

    describe('handle — spell data structure', () => {
        it('includes name, level, casting_time, range and derived fields in eligible spell data', async () => {
            const ps = makePlayerStats();
            const result = await handle(makeAction(), ps, campaignName);

            const spell = result.payload.eligibleSpells.find(s => s.name === 'Burning Hands');
            expect(spell.name).toBe('Burning Hands');
            expect(spell.level).toBe(1);
            expect(spell.casting_time).toBe('1 action');
            expect(spell.range).toBe('30 feet');
            expect(spell.isSingleTarget).toBe(true);
            expect(spell.hasAreaOfEffect).toBe(false);
            expect(spell.maxTargets).toBe(1);
        });

        it('defaults level to 0 when not specified', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Cantrip', casting_time: '1 action', prepared: 'Always' },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells[0].level).toBe(0);
        });

        it('defaults maxTargets to 1 when automation.maxTargets is missing', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burnt Hands', casting_time: '1 action', prepared: 'Always', level: 1 },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells[0].maxTargets).toBe(1);
        });
    });

    describe('handle — description content', () => {
        it('describes the trigger behavior and lists available spells', async () => {
            const ps = makePlayerStats();
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.description).toContain('leaves your reach');
            expect(result.payload.description).toContain('Burning Hands');
        });

        it('lists excluded multi-target spells', async () => {
            const ps = makePlayerStats();
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.hasWarnings).toBe(true);
            expect(result.payload.description).toContain('Excluded');
            expect(result.payload.description).toContain('Fireball');
        });

        it('reports no available spells when none match', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Shield', casting_time: '1 reaction', prepared: 'Always' },
                { name: 'Mage Armor', casting_time: '1 bonus action', prepared: 'Always' },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.description).toContain('No spells');
            expect(result.payload.hasWarnings).toBe(false);
        });

        it('includes no warning section when all spells are eligible', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [
                { name: 'Burning Hands', casting_time: '1 action', prepared: 'Always', level: 1 },
                { name: 'Magic Missile', casting_time: '1 action', prepared: 'Always', level: 1 },
            ] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.hasWarnings).toBe(false);
            expect(result.payload.description).not.toContain('Excluded');
        });
    });

    describe('handle — empty spell list', () => {
        it('reports no spells when spellAbilities.spells is empty', async () => {
            const ps = makePlayerStats({ spellAbilities: { spells: [] } });
            const result = await handle(makeAction(), ps, campaignName);

            expect(result.payload.eligibleSpells).toHaveLength(0);
            expect(result.payload.description).toContain('No spells');
            expect(result.payload.hasWarnings).toBe(false);
        });
    });

    describe('applyWarCasterReaction', () => {
        it('stores reaction with target, spell, and character info', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Burning Hands', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);

            applyWarCasterReaction('Goblin', 'Burning Hands', spellData, ps, campaignName);

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'warCasterReactions',
                expect.arrayContaining([
                    expect.objectContaining({
                        targetName: 'Goblin',
                        spellName: 'Burning Hands',
                        spellData,
                        characterName: playerName,
                    }),
                ]),
                campaignName,
            );
        });

        it('returns ok:true on success', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Burning Hands', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);

            const result = applyWarCasterReaction('Goblin', 'Burning Hands', spellData, ps, campaignName);

            expect(result).toEqual({ ok: true });
        });

        it('appends to existing reactions', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Fireball', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([
                { targetName: 'Orc', spellName: 'Magic Missile' },
            ]);

            applyWarCasterReaction('Goblin', 'Fireball', spellData, ps, campaignName);

            const storedCall = useRuntimeState.setRuntimeValue.mock.calls.find(c => c[1] === 'warCasterReactions');
            expect(storedCall[2].length).toBe(2);
        });

        it('logs an ability_use entry', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Burning Hands', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);

            applyWarCasterReaction('Goblin', 'Burning Hands', spellData, ps, campaignName);

            expect(logService.addEntry).toHaveBeenCalledWith(
                campaignName,
                expect.objectContaining({
                    type: 'ability_use',
                    characterName: playerName,
                    abilityName: 'War Caster - Reactive Spell',
                    description: 'War Caster Reactive Spell: Casting Burning Hands as a reaction on Goblin.',
                }),
            );
        });

        it('swallows addEntry errors and still returns ok', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Fireball', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);
            logService.addEntry.mockRejectedValue(new Error('network'));

            const result = applyWarCasterReaction('Goblin', 'Fireball', spellData, ps, campaignName);

            expect(result).toEqual({ ok: true });
        });

        it('handles null warCasterReactions by initializing new array', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Fireball', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue(null);

            const result = applyWarCasterReaction('Goblin', 'Fireball', spellData, ps, campaignName);

            expect(result).toEqual({ ok: true });
            const storedCall = useRuntimeState.setRuntimeValue.mock.calls.find(c => c[1] === 'warCasterReactions');
            expect(storedCall[2].length).toBe(1);
        });

        it('stores timestamp in the reaction entry', async () => {
            const ps = makePlayerStats();
            const spellData = { name: 'Fireball', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);

            applyWarCasterReaction('Goblin', 'Fireball', spellData, ps, campaignName);

            const storedCall = useRuntimeState.setRuntimeValue.mock.calls.find(c => c[1] === 'warCasterReactions');
            expect(storedCall[2][0].timestamp).toBeDefined();
            expect(typeof storedCall[2][0].timestamp).toBe('number');
        });

        it('includes characterName from playerStats', async () => {
            const ps = { name: 'CustomCharacter', level: 5 };
            const spellData = { name: 'Fireball', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);

            applyWarCasterReaction('Goblin', 'Fireball', spellData, ps, campaignName);

            const storedCall = useRuntimeState.setRuntimeValue.mock.calls.find(c => c[1] === 'warCasterReactions');
            expect(storedCall[2][0].characterName).toBe('CustomCharacter');
        });

        it('uses playerStats.name in the log description', async () => {
            const ps = { name: 'CustomCharacter', level: 5 };
            const spellData = { name: 'Fireball', level: 3 };

            useRuntimeState.getRuntimeValue.mockReturnValue([]);

            applyWarCasterReaction('Goblin', 'Fireball', spellData, ps, campaignName);

            expect(logService.addEntry).toHaveBeenCalledWith(
                campaignName,
                expect.objectContaining({
                    description: 'War Caster Reactive Spell: Casting Fireball as a reaction on Goblin.',
                }),
            );
        });
    });
});

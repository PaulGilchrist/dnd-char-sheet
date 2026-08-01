import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerExpeditiousRetreat } from './expeditiousRetreatService.js';

vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../ui/storage.js', () => ({
    default: {
        set: vi.fn(),
    },
}));

vi.mock('../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../combat/concentration/concentrationService.js', () => ({
    addConcentration: vi.fn(),
}));

const { getCombatSummary } = await import('../../encounters/combatData.js');
const { addConcentration } = await import('../../combat/concentration/concentrationService.js');
const { addEntry } = await import('../../ui/logService.js');
const storage = await import('../../ui/storage.js');

describe('expeditiousRetreatService', () => {
    let dispatchSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        addEntry.mockResolvedValue({});
        dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    });

    const campaignName = 'TestCampaign';
    const mapName = 'testMap';
    const playerStats = {
        name: 'Wizard',
        proficiency: 2,
        abilities: { CON: { bonus: 0 } },
    };

    function callTrigger(spell = { name: 'Expeditious Retreat', level: 1 }, metaCtx = {}, stats = playerStats) {
        return triggerExpeditiousRetreat(spell, metaCtx, stats, campaignName, mapName);
    }

    describe('triggerExpeditiousRetreat', () => {
        describe('non-Expeditious Retreat spells', () => {
            it('returns null for non-matching spell names', async () => {
                const result = await triggerExpeditiousRetreat(
                    { name: 'Blur' },
                    {},
                    playerStats,
                    campaignName,
                    mapName,
                );

                expect(result).toBeNull();
                expect(addConcentration).not.toHaveBeenCalled();
                expect(addEntry).not.toHaveBeenCalled();
            });

            it.each([
                'blur',
                'friends',
                'expeditious retreats',
                'not expeditious retreat',
            ])('returns null for spell "%s"', async (spellName) => {
                const result = await triggerExpeditiousRetreat(
                    { name: spellName },
                    {},
                    playerStats,
                    campaignName,
                    mapName,
                );

                expect(result).toBeNull();
            });
        });

        describe('case-insensitive matching', () => {
            it.each([
                'expeditious retreat',
                'Expeditious Retreat',
                'EXPEDITIOUS RETREAT',
                'ExpEdItIoUs ReTrEaT',
            ])('matches spell name "%s"', async (spellName) => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                const result = await triggerExpeditiousRetreat(
                    { name: spellName },
                    {},
                    playerStats,
                    campaignName,
                    mapName,
                );

                expect(result).not.toBeNull();
                expect(result.type).toBe('popup');
            });
        });

        describe('concentration badge', () => {
            it('adds concentration when combatSummary exists', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                await callTrigger();

                expect(addConcentration).toHaveBeenCalledWith(
                    cs,
                    playerStats.name,
                    'Expeditious Retreat',
                    10, // 8 + 2 (proficiency) + 0 (CON bonus)
                );
            });

            it('uses player CON bonus in concentration DC', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                const statsWithConBonus = {
                    ...playerStats,
                    abilities: { CON: { bonus: 2 } },
                };

                await callTrigger({ name: 'Expeditious Retreat', level: 1 }, {}, statsWithConBonus);

                expect(addConcentration).toHaveBeenCalledWith(
                    cs,
                    statsWithConBonus.name,
                    'Expeditious Retreat',
                    12, // 8 + 2 + 2
                );
            });

            it('defaults CON bonus to 0 when missing', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                const statsNoCon = {
                    ...playerStats,
                    abilities: {},
                };

                await callTrigger({ name: 'Expeditious Retreat', level: 1 }, {}, statsNoCon);

                expect(addConcentration).toHaveBeenCalledWith(
                    cs,
                    playerStats.name,
                    'Expeditious Retreat',
                    10, // 8 + 2 + 0
                );
            });

            it('dispatches combat-summary-updated event', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                await callTrigger();

                expect(storage.default.set).toHaveBeenCalledWith(
                    'combatSummary',
                    cs,
                    campaignName,
                );

                expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                    type: 'combat-summary-updated',
                }));
            });

            it('does nothing when combatSummary is null', async () => {
                getCombatSummary.mockReturnValue(null);

                await callTrigger();

                expect(addConcentration).not.toHaveBeenCalled();
                expect(storage.default.set).not.toHaveBeenCalled();
            });
        });

        describe('campaign logging', () => {
            it('logs spell entry to campaign', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                await callTrigger();

                expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    type: 'spell',
                    characterName: 'Wizard',
                    targetName: 'Wizard',
                    spellName: 'Expeditious Retreat',
                    spellLevel: 1,
                    description: expect.stringContaining('casts Expeditious Retreat on themself'),
                }));
            });
        });

        describe('return value', () => {
            it('returns popup with automation_info', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                const result = await callTrigger();

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Expeditious Retreat',
                        automationType: 'expeditious_retreat',
                        description: expect.stringContaining('Expeditious Retreat'),
                    },
                });
            });

            it('includes concentration badge info in popup', async () => {
                const cs = { creatures: [{ name: 'Wizard' }] };
                getCombatSummary.mockReturnValue(cs);

                const result = await callTrigger();

                expect(result.payload.description).toContain('Concentration');
                expect(result.payload.description).toContain('Dash action');
            });
        });
    });
});

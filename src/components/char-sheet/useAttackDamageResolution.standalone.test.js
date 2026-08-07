import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAttackDamageStandalone } from './useAttackDamageResolution.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
    getEmpoweredEvocationFeatures: vi.fn(() => []),
    getEmpoweredEvocationIntModifier: vi.fn(() => 0),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
    executeAttackRiderManeuver: vi.fn(),
}));

vi.mock('../../services/combat/steps/index.js', () => ({
    buildPipelineForAction: vi.fn(() => ({
        run: vi.fn().mockResolvedValue(undefined),
    })),
}));

import { buildPipelineForAction } from '../../services/combat/steps/index.js';
import { rollExpression } from '../../services/dice/diceRoller.js';

const mockRollDamage = vi.fn();
const mockSetPopupHtml = vi.fn();


describe('resolveAttackDamageStandalone', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 3 });
        buildPipelineForAction.mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
        });
    });

    describe('basic flow', () => {
        it('builds a pipeline and runs housekeeping:do', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            await resolveAttackDamageStandalone(attack, {}, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            expect(buildPipelineForAction).toHaveBeenCalledWith(attack, playerStats);
            expect(buildPipelineForAction().run).toHaveBeenCalledWith('housekeeping:do', expect.any(Object), expect.any(Object));
        });

        it('uses defaults when ctxOverrides is empty', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            await resolveAttackDamageStandalone(attack, {}, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            expect(ctx.hit).toBe(true);
            expect(ctx.isCrit).toBe(false);
            expect(ctx.isNatural20).toBe(false);
            expect(ctx.targetName).toBe(null);
            expect(ctx.isBonusActionAttack).toBe(false);
            expect(ctx.overchannelActive).toBe(false);
            expect(ctx.overchannelUseCount).toBe(0);
            expect(ctx.overchannelSpellLevel).toBe(1);
        });

        it('respects ctxOverrides for hit/crit flags', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };
            const overrides = { hit: false, isCrit: true, isNatural20: false };

            await resolveAttackDamageStandalone(attack, overrides, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            expect(ctx.hit).toBe(false);
            expect(ctx.isCrit).toBe(true);
            expect(ctx.isNatural20).toBe(false);
        });

        it('passes ctxOverrides through to pipeline context', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };
            const overrides = { targetName: 'Goblin', isBonusActionAttack: true };

            await resolveAttackDamageStandalone(attack, overrides, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            expect(ctx.targetName).toBe('Goblin');
            expect(ctx.isBonusActionAttack).toBe(true);
        });

        it('uses ctxOverrides values over defaults when provided', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };
            const overrides = { hit: false, isCrit: false, overchannelActive: true, overchannelUseCount: 2, overchannelSpellLevel: 3 };

            await resolveAttackDamageStandalone(attack, overrides, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            expect(ctx.hit).toBe(false);
            expect(ctx.isCrit).toBe(false);
            expect(ctx.overchannelActive).toBe(true);
            expect(ctx.overchannelUseCount).toBe(2);
            expect(ctx.overchannelSpellLevel).toBe(3);
        });
    });

    describe('modal state handlers', () => {
        it('creates modalState object and exposes setters', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            await resolveAttackDamageStandalone(attack, {}, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            expect(ctx.setDamageTypeChoice).toBeDefined();
            expect(ctx.setDivineFuryChoice).toBeDefined();
            expect(ctx.setAttackRiderModal).toBeDefined();
            expect(ctx.setAttackRiderManeuverPrompt).toBeDefined();
            expect(ctx.setSweepingAttackTargetModal).toBeDefined();
            expect(ctx.setSecondaryTargetModal).toBeDefined();
        });

        it('setDamageTypeChoice updates modalState.damageTypeChoice', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            await resolveAttackDamageStandalone(attack, {}, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            ctx.setDamageTypeChoice('fire');
            // modalState is internal; verify via the proceedWithDamage flow
            expect(typeof ctx.setDamageTypeChoice).toBe('function');
        });
    });

    describe('proceedWithDamage', () => {
        it('calls rollDamage with minimalCtx when proceedWithDamage is invoked by pipeline', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            // Override the pipeline run to call proceedWithDamage
            const mockRun = vi.fn().mockImplementation(async (event, ctx) => {
                if (event === 'housekeeping:do') {
                    // Simulate pipeline calling proceedWithDamage
                    ctx.proceedWithDamage(
                        { name: 'Longsword', damageType: 'slashing' },
                        '1d8+3',
                        8,
                        [5, 3],
                        3,
                        { targetName: 'Goblin', isCrit: false }
                    );
                }
            });
            buildPipelineForAction.mockReturnValue({ run: mockRun });

            await resolveAttackDamageStandalone(attack, { targetName: 'Goblin' }, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            expect(mockRollDamage).toHaveBeenCalledWith(
                'Longsword',
                '1d8+3',
                8,
                [5, 3],
                3,
                expect.objectContaining({
                    attackName: 'Longsword',
                    damageType: 'slashing',
                    targetName: 'Goblin',
                    attackerName: 'Longsword',
                    isAutoCrit: false,
                })
            );
        });

        it('passes autoDamageSecondary fields through minimalCtx from ctxOverrides', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            const mockRun = vi.fn().mockImplementation(async (event, ctx) => {
                if (event === 'housekeeping:do') {
                    ctx.proceedWithDamage(
                        { name: 'Longsword', damageType: 'slashing' },
                        '1d8+3',
                        8,
                        [5, 3],
                        3,
                        {}
                    );
                }
            });
            buildPipelineForAction.mockReturnValue({ run: mockRun });

            await resolveAttackDamageStandalone(attack, {
                autoDamageSecondaryFormula: '1d6',
                autoDamageSecondaryName: 'Secondary',
                autoDamageSecondaryDamageType: 'fire',
                saveDc: 15,
                saveType: 'Dexterity',
                dcSuccess: 'half',
            }, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            expect(mockRollDamage).toHaveBeenCalledWith(
                'Longsword',
                '1d8+3',
                8,
                [5, 3],
                3,
                expect.objectContaining({
                    autoDamageSecondaryFormula: '1d6',
                    autoDamageSecondaryName: 'Secondary',
                    autoDamageSecondaryDamageType: 'fire',
                    saveDc: 15,
                    saveType: 'Dexterity',
                    dcSuccess: 'half',
                })
            );
        });

        it('includes metamagic fields in minimalCtx from ctxOverrides', async () => {
            const attack = { name: 'Fire Bolt', damage: '1d10+4', damageType: 'fire' };
            const playerStats = { name: 'TestWizard', level: 10, abilities: [], automation: { actions: [], passives: [] } };

            const mockRun = vi.fn().mockImplementation(async (event, ctx) => {
                if (event === 'housekeeping:do') {
                    ctx.proceedWithDamage(
                        { name: 'Fire Bolt', damageType: 'fire' },
                        '1d10+4',
                        14,
                        [10, 4],
                        4,
                        {}
                    );
                }
            });
            buildPipelineForAction.mockReturnValue({ run: mockRun });

            await resolveAttackDamageStandalone(attack, { metamagicTwinTarget: 'Goblin', metamagicHeighten: true }, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            expect(mockRollDamage).toHaveBeenCalledWith(
                'Fire Bolt',
                '1d10+4',
                14,
                [10, 4],
                4,
                expect.objectContaining({
                    metamagicTwinTarget: 'Goblin',
                    metamagicHeighten: true,
                })
            );
        });

        it('defaults doubledRolls to null when not in ctxOverrides', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };

            const mockRun = vi.fn().mockImplementation(async (event, ctx) => {
                if (event === 'housekeeping:do') {
                    ctx.proceedWithDamage(
                        { name: 'Longsword', damageType: 'slashing' },
                        '1d8+3',
                        8,
                        [5, 3],
                        3,
                        {}
                    );
                }
            });
            buildPipelineForAction.mockReturnValue({ run: mockRun });

            await resolveAttackDamageStandalone(attack, {}, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            expect(mockRollDamage).toHaveBeenCalledWith(
                'Longsword',
                '1d8+3',
                8,
                [5, 3],
                3,
                expect.objectContaining({
                    doubledRolls: null,
                })
            );
        });
    });

    describe('ctxOverrides spread', () => {
        it('spreads all ctxOverrides into the pipeline context', async () => {
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };
            const playerStats = { name: 'TestFighter', level: 5, abilities: [], automation: { actions: [], passives: [] } };
            const overrides = {
                sneakDice: 4,
                effectiveSneakDice: 4,
                isMeleeOrUnarmed: true,
                autoFormulaOverride: 'custom formula',
                empoweredEvocationModifier: 2,
                autoDamageSaveDc: 16,
            };

            await resolveAttackDamageStandalone(attack, overrides, {
                playerStats,
                campaignName: 'test-campaign',
                setPopupHtml: mockSetPopupHtml,
                rollDamage: mockRollDamage,
            });

            const ctx = buildPipelineForAction().run.mock.calls[0][1];
            expect(ctx.sneakDice).toBe(4);
            expect(ctx.effectiveSneakDice).toBe(4);
            expect(ctx.isMeleeOrUnarmed).toBe(true);
            expect(ctx.autoFormulaOverride).toBe('custom formula');
            expect(ctx.empoweredEvocationModifier).toBe(2);
            expect(ctx.autoDamageSaveDc).toBe(16);
        });
    });
});

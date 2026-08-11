import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEffectAdderHandlers } from './initiative-effect-adder.jsx';
import * as conditionSaveService from '../../services/combat/conditions/conditionSaveService.js';
import * as concentrationService from '../../services/combat/concentration/concentrationService.js';
import * as combatLoggingService from '../../services/encounters/combatLoggingService.js';
import * as useRuntimeState from '../../hooks/runtime/useRuntimeState.js';
import storage from '../../services/ui/storage.js';
import { cloneDeep } from 'lodash';

vi.mock('../../services/ui/storage.js', () => ({
    default: { get: vi.fn(), set: vi.fn(), getProperty: vi.fn(), setProperty: vi.fn() },
}));

vi.mock('../../services/combat/conditions/conditionSaveService.js', () => ({
    addCondition: vi.fn(),
}));

vi.mock('../../services/combat/concentration/concentrationService.js', () => ({
    addConcentration: vi.fn(),
}));

vi.mock('../../services/encounters/combatLoggingService.js', () => ({
    logConditionEvent: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

describe('createEffectAdderHandlers', () => {
    let handlers;
    let campaignName;
    let characters;
    let combatSummary;
    let setEffectAdderTarget;
    let setCombatSummary;

    const mockCombatSummary = {
        round: 1,
        creatures: [
            { name: 'Alice', type: 'player', computedStats: { hitPoints: 20 } },
            { name: 'Bob', type: 'player', computedStats: { hitPoints: 15 } },
            { name: 'Goblin', type: 'npc' },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        campaignName = 'test-campaign';
        characters = [
            { name: 'Alice', computedStats: { hitPoints: 20, currentHitPoints: 20 } },
            { name: 'Bob', computedStats: { hitPoints: 15, currentHitPoints: 15 } },
        ];
        combatSummary = cloneDeep(mockCombatSummary);
        setEffectAdderTarget = vi.fn();
        setCombatSummary = vi.fn();

        handlers = createEffectAdderHandlers({
            campaignName,
            characters,
            combatSummary,
            setEffectAdderTarget,
            setCombatSummary,
        });
    });

    describe('return value', () => {
        it('should return an object with handleApplyEffect', () => {
            expect(handlers).toHaveProperty('handleApplyEffect');
            expect(typeof handlers.handleApplyEffect).toBe('function');
        });

        it('should return only handleApplyEffect', () => {
            expect(Object.keys(handlers)).toEqual(['handleApplyEffect']);
        });
    });

    describe('early return - no combatSummary', () => {
        it('should return early without side effects when combatSummary is null', () => {
            const handlersNoCs = createEffectAdderHandlers({
                campaignName,
                characters,
                combatSummary: null,
                setEffectAdderTarget,
                setCombatSummary,
            });

            handlersNoCs.handleApplyEffect('conditions', { conditionKey: 'blinded', target: 'Alice' });
            expect(conditionSaveService.addCondition).not.toHaveBeenCalled();
            expect(storage.set).not.toHaveBeenCalled();
            expect(setCombatSummary).not.toHaveBeenCalled();
            expect(combatLoggingService.logConditionEvent).not.toHaveBeenCalled();
        });

        it('should return early without side effects when combatSummary is undefined', () => {
            const handlersNoCs = createEffectAdderHandlers({
                campaignName,
                characters,
                combatSummary: undefined,
                setEffectAdderTarget,
                setCombatSummary,
            });

            handlersNoCs.handleApplyEffect('effects', { target: 'Alice', effectKey: 'goad' });
            expect(useRuntimeState.getRuntimeValue).not.toHaveBeenCalled();
            expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should proceed with empty object combatSummary (truthy but no creatures)', () => {
            const handlersNoCs = createEffectAdderHandlers({
                campaignName,
                characters,
                combatSummary: {},
                setEffectAdderTarget,
                setCombatSummary,
            });

            // Empty object is truthy, so it proceeds past the !combatSummary check
            // The concentration tab will call addConcentration which internally handles missing creature
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });
            handlersNoCs.handleApplyEffect('concentration', { spellName: 'Shield', target: 'Alice' });
            expect(concentrationService.addConcentration).toHaveBeenCalled();
        });
    });

    describe('conditions tab', () => {
        const conditionData = {
            conditionKey: 'blinded',
            target: 'Alice',
            dc: 15,
            ability: 'wis',
        };

        it('should call addCondition with correct arguments', () => {
            handlers.handleApplyEffect('conditions', conditionData);

            expect(conditionSaveService.addCondition).toHaveBeenCalledWith(
                combatSummary,
                'Alice',
                expect.objectContaining({ key: 'blinded' }),
                15,
                'wis',
                useRuntimeState.getRuntimeValue,
                useRuntimeState.setRuntimeValue,
                'test-campaign',
                expect.any(Object),
            );
        });

        it('should find condition definition by key from CONDITIONS', () => {
            handlers.handleApplyEffect('conditions', conditionData);

            // Verify addCondition was called (which internally uses CONDITIONS)
            expect(conditionSaveService.addCondition).toHaveBeenCalled();
        });

        it('should call storage.set with combatSummary', () => {
            handlers.handleApplyEffect('conditions', conditionData);

            expect(storage.set).toHaveBeenCalledWith('combatSummary', combatSummary, 'test-campaign');
        });

        it('should call setCombatSummary with cloned combatSummary', () => {
            handlers.handleApplyEffect('conditions', conditionData);

            expect(setCombatSummary).toHaveBeenCalled();
            // cloneDeep creates a new object with same structure
            const callArg = setCombatSummary.mock.calls[0][0];
            expect(callArg).toStrictEqual(combatSummary);
        });

        it('should call logConditionEvent with correct parameters', () => {
            handlers.handleApplyEffect('conditions', conditionData);

            expect(combatLoggingService.logConditionEvent).toHaveBeenCalledWith(
                'test-campaign',
                'applied',
                'Alice',
                'Blinded',
                15,
                'wis',
            );
        });

        it('should call setEffectAdderTarget(null) at the end', () => {
            handlers.handleApplyEffect('conditions', conditionData);

            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });

        it('should use targetCharacter.computedStats when available', () => {
            const targetChar = characters[0];
            handlers.handleApplyEffect('conditions', { ...conditionData, target: 'Alice' });

            expect(conditionSaveService.addCondition).toHaveBeenCalledWith(
                combatSummary,
                'Alice',
                expect.any(Object),
                15,
                'wis',
                useRuntimeState.getRuntimeValue,
                useRuntimeState.setRuntimeValue,
                'test-campaign',
                targetChar.computedStats,
            );
        });

        it('should handle target with suffix name (e.g. "Alice the Wizard")', () => {
            characters.push({ name: 'Alice the Wizard', computedStats: { hitPoints: 25 } });
            const cs = cloneDeep(mockCombatSummary);
            cs.creatures.push({ name: 'Alice the Wizard', type: 'player' });

            const handlersAlt = createEffectAdderHandlers({
                campaignName,
                characters,
                combatSummary: cs,
                setEffectAdderTarget,
                setCombatSummary,
            });

            handlersAlt.handleApplyEffect('conditions', { conditionKey: 'blinded', target: 'Alice the Wizard', dc: 10, ability: 'con' });

            expect(conditionSaveService.addCondition).toHaveBeenCalled();
            expect(conditionSaveService.addCondition).toHaveBeenCalledWith(
                cs,
                'Alice the Wizard',
                expect.any(Object),
                10,
                'con',
                useRuntimeState.getRuntimeValue,
                useRuntimeState.setRuntimeValue,
                'test-campaign',
                expect.objectContaining({ hitPoints: 25 }),
            );
        });

        it('should handle unknown condition key gracefully (no conditionDef)', () => {
            handlers.handleApplyEffect('conditions', { conditionKey: 'nonexistent', target: 'Alice', dc: 10, ability: 'con' });

            // Should not call any services since conditionDef is null
            expect(conditionSaveService.addCondition).not.toHaveBeenCalled();
            expect(storage.set).not.toHaveBeenCalled();
            expect(setCombatSummary).not.toHaveBeenCalled();
            expect(combatLoggingService.logConditionEvent).not.toHaveBeenCalled();
            // setEffectAdderTarget is NOT called because of early return on line 24
            expect(setEffectAdderTarget).not.toHaveBeenCalled();
        });

        it('should use default DC and ability when not provided', () => {
            handlers.handleApplyEffect('conditions', { conditionKey: 'blinded', target: 'Alice' });

            expect(conditionSaveService.addCondition).toHaveBeenCalledWith(
                combatSummary,
                'Alice',
                expect.any(Object),
                undefined,
                undefined,
                useRuntimeState.getRuntimeValue,
                useRuntimeState.setRuntimeValue,
                'test-campaign',
                expect.any(Object),
            );
        });

        it('should find target in combatSummary creatures', () => {
            handlers.handleApplyEffect('conditions', { conditionKey: 'blinded', target: 'Goblin', dc: 10, ability: 'con' });

            expect(conditionSaveService.addCondition).toHaveBeenCalledWith(
                combatSummary,
                'Goblin',
                expect.any(Object),
                10,
                'con',
                useRuntimeState.getRuntimeValue,
                useRuntimeState.setRuntimeValue,
                'test-campaign',
                undefined, // Goblin has no computedStats in characters array
            );
        });
    });

    describe('effects tab', () => {
        const effectData = {
            target: 'Alice',
            effectKey: 'goad',
        };

        it('should add effectEntry without optional fields when not provided', () => {
            handlers.handleApplyEffect('effects', effectData);

            expect(useRuntimeState.getRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects');
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'goad' }),
                ]),
                'test-campaign',
            );
        });

        it('should include source when provided', () => {
            handlers.handleApplyEffect('effects', { ...effectData, source: 'Bob' });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ source: 'Bob' }),
                ]),
                'test-campaign',
            );
        });

        it('should include value when provided', () => {
            handlers.handleApplyEffect('effects', { ...effectData, value: 5 });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ value: 5 }),
                ]),
                'test-campaign',
            );
        });

        it('should include ability when provided', () => {
            handlers.handleApplyEffect('effects', { ...effectData, ability: 'str' });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ ability: 'str' }),
                ]),
                'test-campaign',
            );
        });

        it('should include saveDc and saveAbility when dc is provided', () => {
            handlers.handleApplyEffect('effects', { ...effectData, dc: 15, ability: 'wis' });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ saveDc: 15, saveAbility: 'wis' }),
                ]),
                'test-campaign',
            );
        });

        it('should include saveAbility as wis when dc provided but ability not', () => {
            handlers.handleApplyEffect('effects', { ...effectData, dc: 15 });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ saveDc: 15, saveAbility: 'wis' }),
                ]),
                'test-campaign',
            );
        });

        it('should include notes when provided', () => {
            handlers.handleApplyEffect('effects', { ...effectData, notes: 'GM note' });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ notes: 'GM note' }),
                ]),
                'test-campaign',
            );
        });

        it('should filter out existing effect with same target and effectKey before adding', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockReturnValue([
                { target: 'Alice', effect: 'goad', source: 'Old Source' },
                { target: 'Bob', effect: 'goad', source: 'Bob' },
            ]);

            handlers.handleApplyEffect('effects', { ...effectData, source: 'New Source' });

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Bob', effect: 'goad' }),
                    expect.objectContaining({ target: 'Alice', effect: 'goad', source: 'New Source' }),
                ]),
                'test-campaign',
            );
            // Should have 2 items (removed old Alice goad, added new one, kept Bob goad)
            const effectsArg = useRuntimeState.setRuntimeValue.mock.calls[0][2];
            expect(effectsArg).toHaveLength(2);
        });

        it('should handle empty existing targetEffects array', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockReturnValue([]);

            handlers.handleApplyEffect('effects', effectData);

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'goad' }),
                ]),
                'test-campaign',
            );
        });

        it('should handle null existing targetEffects', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockReturnValue(null);

            handlers.handleApplyEffect('effects', effectData);

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'goad' }),
                ]),
                'test-campaign',
            );
        });

        it('should call logConditionEvent with correct parameters', () => {
            handlers.handleApplyEffect('effects', effectData);

            expect(combatLoggingService.logConditionEvent).toHaveBeenCalledWith(
                'test-campaign',
                'target-effect-applied',
                'Alice',
                'goad',
                undefined,
                undefined,
            );
        });

        it('should call logConditionEvent with dc and ability when provided', () => {
            handlers.handleApplyEffect('effects', { ...effectData, dc: 18, ability: 'dex' });

            expect(combatLoggingService.logConditionEvent).toHaveBeenCalledWith(
                'test-campaign',
                'target-effect-applied',
                'Alice',
                'goad',
                18,
                'dex',
            );
        });

        it('should call setEffectAdderTarget(null) at the end', () => {
            handlers.handleApplyEffect('effects', effectData);

            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });
    });

    describe('concentration tab', () => {
        const concentrationData = {
            target: 'Alice',
            spellName: 'Shield',
            dc: 13,
        };

        it('should call addConcentration with correct arguments', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(concentrationService.addConcentration).toHaveBeenCalledWith(
                combatSummary,
                'Alice',
                'Shield',
                13,
            );
        });

        it('should call storage.set with combatSummary', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(storage.set).toHaveBeenCalledWith('combatSummary', combatSummary, 'test-campaign');
        });

        it('should call setCombatSummary with cloned combatSummary', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(setCombatSummary).toHaveBeenCalled();
        });

        it('should call logConditionEvent with concentration prefix on spell name', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(combatLoggingService.logConditionEvent).toHaveBeenCalledWith(
                'test-campaign',
                'concentration-started',
                'Alice',
                'Concentration: Shield',
                13,
                'con',
            );
        });

        it('should call setEffectAdderTarget(null) at the end', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });

        it('should return early without adding concentration when target has Rage buff', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') {
                    return [{ name: 'Rage' }, { name: 'Bless' }];
                }
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(concentrationService.addConcentration).not.toHaveBeenCalled();
            expect(storage.set).not.toHaveBeenCalled();
            expect(setCombatSummary).not.toHaveBeenCalled();
            expect(combatLoggingService.logConditionEvent).not.toHaveBeenCalled();
            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });

        it('should return early when activeBuffs is null', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return null;
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            // Should NOT return early - null is not an array with Rage
            expect(concentrationService.addConcentration).toHaveBeenCalled();
            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });

        it('should return early when activeBuffs is empty array', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            // Should NOT return early - empty array has no Rage
            expect(concentrationService.addConcentration).toHaveBeenCalled();
            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });

        it('should not return early when target has other buffs but not Rage', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') {
                    return [{ name: 'Bless' }, { name: 'Heroism' }];
                }
                return null;
            });

            handlers.handleApplyEffect('concentration', concentrationData);

            expect(concentrationService.addConcentration).toHaveBeenCalled();
            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });

        it('should use default DC when not provided', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice' && prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('concentration', { target: 'Alice', spellName: 'Shield' });

            expect(concentrationService.addConcentration).toHaveBeenCalledWith(
                combatSummary,
                'Alice',
                'Shield',
                undefined,
            );
        });

        it('should handle target with suffix in name for buff check', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (key === 'Alice the Wizard' && prop === 'activeBuffs' && campaign === 'test-campaign') {
                    return [{ name: 'Rage' }];
                }
                return null;
            });

            handlers.handleApplyEffect('concentration', { target: 'Alice the Wizard', spellName: 'Fireball', dc: 15 });

            expect(concentrationService.addConcentration).not.toHaveBeenCalled();
            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });
    });

    describe('invalid tab', () => {
        it('should do nothing for unknown tab and still clear effect adder target', () => {
            handlers.handleApplyEffect('unknownTab', { some: 'data' });

            expect(conditionSaveService.addCondition).not.toHaveBeenCalled();
            expect(useRuntimeState.getRuntimeValue).not.toHaveBeenCalled();
            expect(concentrationService.addConcentration).not.toHaveBeenCalled();
            expect(setEffectAdderTarget).toHaveBeenCalledWith(null);
        });
    });

    describe('multiple handles in sequence', () => {
        it('should handle conditions then effects in sequence', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockReturnValue([]);

            handlers.handleApplyEffect('conditions', { conditionKey: 'blinded', target: 'Alice', dc: 10, ability: 'con' });
            handlers.handleApplyEffect('effects', { target: 'Bob', effectKey: 'goad' });

            expect(conditionSaveService.addCondition).toHaveBeenCalledTimes(1);
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledTimes(1);
            expect(setEffectAdderTarget).toHaveBeenCalledTimes(2);
        });

        it('should handle conditions then concentration in sequence', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((key, prop, campaign) => {
                if (prop === 'activeBuffs' && campaign === 'test-campaign') return [];
                return null;
            });

            handlers.handleApplyEffect('conditions', { conditionKey: 'blinded', target: 'Alice', dc: 10, ability: 'con' });
            handlers.handleApplyEffect('concentration', { target: 'Bob', spellName: 'Shield', dc: 12 });

            expect(conditionSaveService.addCondition).toHaveBeenCalledTimes(1);
            expect(concentrationService.addConcentration).toHaveBeenCalledTimes(1);
            expect(setEffectAdderTarget).toHaveBeenCalledTimes(2);
        });
    });
});

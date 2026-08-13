import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './bonusActionAttackHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../common/damageRollback.js', () => ({
    findLastAttack: vi.fn().mockResolvedValue({ attackEvent: { bonus: 5 }, targetName: 'Goblin' }),
}));

vi.mock('../../common/polearmUtils.js', () => ({
    isPolearmWeapon: vi.fn(async () => true),
}));

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { findLastAttack } from '../../common/damageRollback.js';
import { isPolearmWeapon } from '../../common/polearmUtils.js';

// ── Helpers ────────────────────────────────────────────────────

function makeAction(overrides = {}) {
    return {
        name: 'Bonus Action Attack',
        description: 'Make a bonus action attack.',
        automation: {
            type: 'bonus_action_attack',
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestHero',
        proficiency: 3,
        inventory: { equipped: [] },
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('bonusActionAttackHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        describe('basic case (no special triggers/effects)', () => {
            it('should return automation_info popup with action details', async () => {
                const action = makeAction();
                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.name).toBe('Bonus Action Attack');
                expect(result.payload.description).toBe('Make a bonus action attack.');
                expect(result.payload.automation).toEqual(action.automation);
            });

            it('should use empty string for description when missing', async () => {
                const action = makeAction({ description: undefined });
                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.payload.description).toBe('');
            });
        });

        describe('uses tracking', () => {
            it('should return uses remaining message when uses exhausted', async () => {
                const action = makeAction({ automation: { usesMax: 3 } });
                getRuntimeValue.mockReturnValue(0);

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('no uses remaining');
                expect(result.payload.description).toContain('Long Rest');
                expect(setRuntimeValue).not.toHaveBeenCalled();
            });

            it('should return uses remaining message with custom recharge text', async () => {
                const action = makeAction({ automation: { usesMax: 1, recharge: 'Short Rest' } });
                getRuntimeValue.mockReturnValue(0);

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.payload.description).toContain('Short Rest');
                expect(setRuntimeValue).not.toHaveBeenCalled();
            });

            it('should decrement uses and return success popup', async () => {
                const action = makeAction({ automation: { usesMax: 3 } });
                getRuntimeValue.mockReturnValue(2);

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.type).toBe('popup');
                expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'warPriestUses', 1, 'campaign');
            });

            it('should use custom resourceKey for tracking', async () => {
                const action = makeAction({ automation: { usesMax: 1, resourceKey: 'warPriestUses' } });
                getRuntimeValue.mockReturnValue(1);

                await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'warPriestUses', 0, 'campaign');
            });

            it('should skip use tracking when usesMax is 0 or undefined', async () => {
                const action = makeAction({ automation: { usesMax: 0 } });
                getRuntimeValue.mockReturnValue(0);

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.type).toBe('popup');
                expect(setRuntimeValue).not.toHaveBeenCalled();
            });
        });

        describe('polearm trigger', () => {
            it('should reject when no equipped weapons', async () => {
                isPolearmWeapon.mockResolvedValue(false);
                const action = makeAction({ automation: { trigger: 'after_attack_action_with_polearm' } });
                const stats = makePlayerStats({ inventory: { equipped: [] } });

                const result = await handle(action, stats, 'campaign', 'map', []);

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('requires you to be holding');
            });

            it('should return attack_roll with Quarterstaff', async () => {
                isPolearmWeapon.mockResolvedValue(true);
                findLastAttack.mockResolvedValue({ attackEvent: { bonus: 7 }, targetName: 'Goblin' });
                const action = makeAction({ automation: { trigger: 'after_attack_action_with_polearm', damage: '1d4', damageType: 'Bludgeoning' }, name: 'Pole Strike' });
                const stats = makePlayerStats({ inventory: { equipped: ['Quarterstaff'] }, proficiency: 2 });
                const allEquipment = [{ name: 'Quarterstaff', properties: [] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('attack_roll');
                expect(result.payload.attack.name).toBe('Pole Strike');
                expect(result.payload.attack.type).toBe('Bonus Action');
                expect(result.payload.attack.hitBonus).toBe(7);
                expect(result.payload.attack.damage).toBe('1d4');
                expect(result.payload.attack.damageType).toBe('Bludgeoning');
                expect(result.payload.targetName).toBe('Goblin');
            });

            it('should return attack_roll with Spear', async () => {
                isPolearmWeapon.mockResolvedValue(true);
                findLastAttack.mockResolvedValue({ attackEvent: { bonus: 5 }, targetName: 'Orc' });
                const action = makeAction({ automation: { trigger: 'after_attack_action_with_polearm' }, name: 'Polearm Master' });
                const stats = makePlayerStats({ inventory: { equipped: ['Spear'] } });
                const allEquipment = [{ name: 'Spear', properties: [] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('attack_roll');
                expect(result.payload.attack.hitBonus).toBe(5);
                expect(result.payload.attack.autoDamageFormula).toBe('1d4');
            });

            it('should return attack_roll with Heavy + Reach weapon', async () => {
                isPolearmWeapon.mockResolvedValue(true);
                findLastAttack.mockResolvedValue({ attackEvent: { bonus: 6 }, targetName: 'Troll' });
                const action = makeAction({ automation: { trigger: 'after_attack_action_with_polearm', extraDamageExpression: '1d4' }, name: 'Polearm Master' });
                const stats = makePlayerStats({ inventory: { equipped: ['Glaive'] } });
                const allEquipment = [{ name: 'Glaive', properties: ['Heavy', 'Reach', 'Two-Handed'] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('attack_roll');
                expect(result.payload.attack.hitBonus).toBe(6);
                expect(result.payload.attack.autoDamageFormula).toBe('1d4');
            });

            it('should reject weapon missing Heavy or Reach properties', async () => {
                isPolearmWeapon.mockResolvedValue(false);
                const action = makeAction({ automation: { trigger: 'after_attack_action_with_polearm' } });
                const stats = makePlayerStats({ inventory: { equipped: ['Warhammer'] } });
                const allEquipment = [{ name: 'Warhammer', properties: ['Heavy'] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('requires you to be holding');
            });

            it('should fall back to proficiency bonus when no lastAttack', async () => {
                isPolearmWeapon.mockResolvedValue(true);
                findLastAttack.mockResolvedValue({ attackEvent: null, targetName: null });
                const action = makeAction({ automation: { trigger: 'after_attack_action_with_polearm' }, name: 'Pole Strike' });
                const stats = makePlayerStats({ inventory: { equipped: ['Halberd'] }, proficiency: 4 });
                const allEquipment = [{ name: 'Halberd', properties: ['Heavy', 'Reach', 'Two-Handed'] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('attack_roll');
                expect(result.payload.attack.hitBonus).toBe(4);
            });
        });

        describe('weaponRequirement trigger', () => {
            it('should return attack_roll with Heavy + Reach weapon via weaponRequirement + trigger', async () => {
                isPolearmWeapon.mockResolvedValue(true);
                findLastAttack.mockResolvedValue({ attackEvent: { bonus: 8 }, targetName: 'Dragon' });
                const action = makeAction({ automation: { weaponRequirement: 'quarterstaff_spear_heavy_reach', trigger: 'after_attack_action_with_polearm', damage: '1d4', damageType: 'Bludgeoning' }, name: 'Pole Strike' });
                const stats = makePlayerStats({ inventory: { equipped: ['Pike'] }, proficiency: 3 });
                const allEquipment = [{ name: 'Pike', properties: ['Heavy', 'Reach', 'Two-Handed'] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('attack_roll');
                expect(result.payload.attack.hitBonus).toBe(8);
                expect(result.payload.attack.damageType).toBe('Bludgeoning');
            });

            it('should reject weapon missing required properties via weaponRequirement', async () => {
                isPolearmWeapon.mockResolvedValue(false);
                const action = makeAction({ automation: { weaponRequirement: 'quarterstaff_spear_heavy_reach' } });
                const stats = makePlayerStats({ inventory: { equipped: ['Warhammer'] } });
                const allEquipment = [{ name: 'Warhammer', properties: ['Heavy'] }];

                const result = await handle(action, stats, 'campaign', 'map', allEquipment);

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('requires you to be holding');
            });
        });

        describe('disengage_end_grappled effect', () => {
            it('should remove grappled condition and show disengage message', async () => {
                getRuntimeValue.mockImplementation((name, key) => {
                    if (key === 'activeConditions') return ['grappled', 'fatigued'];
                    return null;
                });
                const action = makeAction({ automation: { effect: 'disengage_end_grappled' } });

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.payload.description).toContain('Disengage action');
                expect(result.payload.description).toContain('Grappled condition ends');
                expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', ['fatigued'], 'campaign');
            });

            it('should not modify conditions if player is not grappled', async () => {
                getRuntimeValue.mockImplementation((name, key) => {
                    if (key === 'activeConditions') return ['fatigued'];
                    return null;
                });
                const action = makeAction({ automation: { effect: 'disengage_end_grappled' } });

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.payload.description).toContain('Disengage action');
                expect(setRuntimeValue).not.toHaveBeenCalled();
            });

            it('should handle empty conditions array', async () => {
                getRuntimeValue.mockImplementation((name, key) => {
                    if (key === 'activeConditions') return [];
                    return null;
                });
                const action = makeAction({ automation: { effect: 'disengage_end_grappled' } });

                const result = await handle(action, makePlayerStats(), 'campaign', 'map', []);

                expect(result.payload.description).toContain('Disengage action');
                expect(setRuntimeValue).not.toHaveBeenCalled();
            });
        });
    });
});

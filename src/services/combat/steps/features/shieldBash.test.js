import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../rules/core/attackCalc.js', () => ({
  parseMagicItemName: vi.fn((name) => ({ baseName: name, magicBonus: 0 })),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(() => 13),
  createSaveListener: vi.fn(() => ({ promise: Promise.resolve({ success: false, total: 7, roll: 7, saveBonus: 0 }) })),
}));

vi.mock('../../../automation/common/oncePerTurn.js', () => ({
  checkOncePerTurnWithSkip: vi.fn(() => null),
}));

vi.mock('../../../../services/combat/conditions/conditionSaveService.js', () => ({
  addCondition: vi.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────

import { shieldBash, applyShieldBashEffect } from './shieldBash.js';

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { parseMagicItemName } from '../../../rules/core/attackCalc.js';
import { addEntry } from '../../../ui/logService.js';
import { buildSaveDc, createSaveListener } from '../../../automation/common/savePrompt.js';
import { checkOncePerTurnWithSkip } from '../../../automation/common/oncePerTurn.js';
import { addCondition } from '../../../../services/combat/conditions/conditionSaveService.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  return {
    campaignName: 'test-campaign',
    playerStats: { name: 'Fighter1' },
    ...overrides,
  };
}

function makeShieldPassive(options = {}) {
  return {
    type: 'attack_rider',
    trigger: 'melee_hit_with_shield_equipped',
    options: ['push', 'prone'],
    automation: { saveDc: 'ability', saveAbility: 'STR' },
    ...options,
  };
}

function makeNewStylePassive(options = {}) {
  return {
    type: 'attack_rider',
    effect: 'push_or_prone',
    oncePerTurn: true,
    automation: { saveDc: 'ability', saveAbility: 'STR' },
    ...options,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('shieldBash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('condition', () => {
    it('returns true when automation.passives exists', () => {
      const ctx = makeCtx({
        playerStats: {
          automation: { passives: [makeShieldPassive()] },
        },
      });
      expect(shieldBash.condition(ctx)).toBe(true);
    });

    it('returns false when automation.passives is missing', () => {
      const ctx = makeCtx({
        playerStats: { automation: {} },
      });
      expect(shieldBash.condition(ctx)).toBe(false);
    });

    it('returns false when automation is missing', () => {
      const ctx = makeCtx({ playerStats: {} });
      expect(shieldBash.condition(ctx)).toBe(false);
    });

    it('returns false when playerStats is null', () => {
      const ctx = makeCtx({ playerStats: null });
      expect(() => shieldBash.condition(ctx)).toThrow();
    });
  });

  describe('handler', () => {
    describe('early returns — no shield bash passive', () => {
      it('returns null when no passives exist', async () => {
        const ctx = makeCtx({
          playerStats: { automation: { passives: [] } },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toBeNull();
      });

      it('returns null when no passive matches old-style', async () => {
        const ctx = makeCtx({
          playerStats: {
            automation: { passives: [{ type: 'attack_rider', effect: 'other' }] },
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toBeNull();
      });

      it('returns null when no passive matches new-style', async () => {
        const ctx = makeCtx({
          playerStats: {
            automation: { passives: [{ type: 'attack_rider', effect: 'other', oncePerTurn: true }] },
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toBeNull();
      });
    });

    describe('early returns — lastAttack checks', () => {
      it('returns { data: prevData } when lastAttack is null', async () => {
        getRuntimeValue.mockResolvedValue(null);
        const ctx = makeCtx({
          playerStats: { automation: { passives: [makeShieldPassive()] } },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });

      it('returns { data: prevData } when lastAttack.hit is false', async () => {
        getRuntimeValue.mockResolvedValue({ hit: false, targetName: 'Goblin1' });
        const ctx = makeCtx({
          playerStats: { automation: { passives: [makeShieldPassive()] } },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });

      it('returns { data: prevData } when attackerName does not match player', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Goblin1', weaponType: 'melee', targetName: 'Goblin2' });
        const ctx = makeCtx({
          playerStats: { name: 'Fighter1', automation: { passives: [makeShieldPassive()] } },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });

      it('returns { data: prevData } when weaponType is ranged', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'ranged', targetName: 'Goblin1' });
        const ctx = makeCtx({
          playerStats: { name: 'Fighter1', automation: { passives: [makeShieldPassive()] } },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });

      it('returns { data: prevData } when targetName is missing', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee' });
        const ctx = makeCtx({
          playerStats: { name: 'Fighter1', automation: { passives: [makeShieldPassive()] } },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });
    });

    describe('early returns — shield check', () => {
      it('returns { data: prevData } when no shield equipped', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Longsword'] },
            equipment: [{ name: 'Longsword', armor_category: 'Heavy', equipment_category: 'Weapon' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });

      it('returns { data: prevData } when equipped item is a shield by armor_category but checkOncePerTurn skips', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue({ type: 'popup' });
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });

      it('returns { data: prevData } when equipped item is a shield by equipment_category but checkOncePerTurn skips', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue({ type: 'popup' });
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', equipment_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });
    });

    describe('early returns — oncePerTurn skip', () => {
      it('returns { data: prevData } when checkOncePerTurnWithSkip returns truthy (already used)', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue({ type: 'popup' });
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);
        expect(result).toEqual({ data: prevData });
      });
    });

    describe('save prompt flow — failed save', () => {
      it('creates save listener and returns modal on failed save', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(15);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);

        expect(createSaveListener).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            targetName: 'Goblin1',
            saveType: 'STR',
            saveDc: 15,
            dcSuccess: false,
            sourceName: 'Shield Bash',
          }),
        );

        expect(addEntry).toHaveBeenCalledTimes(2);
        expect(addEntry).toHaveBeenNthCalledWith(1, 'test-campaign', expect.objectContaining({
          type: 'roll',
          name: 'Shield Bash',
          targetName: 'Goblin1',
          saveDc: 15,
          saveType: 'STR',
        }));

        expect(result).toHaveProperty('modal');
        expect(result.modal.type).toBe('shieldBash');
        expect(result.modal.props.action.name).toBe('Shield Bash');
        expect(result.modal.props.targetName).toBe('Goblin1');
        expect(result.modal.props.saveDc).toBe(15);
      });

      it('creates save listener and returns { data: prevData } on successful save', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(15);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: true, total: 18, roll: 13, saveBonus: 5 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
        expect(addEntry).toHaveBeenCalledTimes(2);
      });
    });

    describe('save prompt flow — log entries', () => {
      it('logs save result entry with correct fields on failure', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Orc1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(16);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 8, roll: 6, saveBonus: 2 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        const secondCall = addEntry.mock.calls[1][1];
        expect(secondCall.type).toBe('roll');
        expect(secondCall.saveResult).toBe('failure');
        expect(secondCall.total).toBe(8);
        expect(secondCall.rolls).toEqual([6]);
        expect(secondCall.bonus).toBe(2);
        expect(secondCall.formula).toBe('1d20+2');
        expect(secondCall.description).toContain('failed');
      });

      it('logs save result entry with correct fields on success', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Orc1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(16);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: true, total: 20, roll: 15, saveBonus: 5 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        const secondCall = addEntry.mock.calls[1][1];
        expect(secondCall.type).toBe('roll');
        expect(secondCall.saveResult).toBe('success');
        expect(secondCall.total).toBe(20);
        expect(secondCall.rolls).toEqual([15]);
        expect(secondCall.bonus).toBe(5);
        expect(secondCall.formula).toBe('1d20+5');
        expect(secondCall.description).toContain('succeeded');
      });

      it('logs save result with zero bonus', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Orc1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(13);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 13, roll: 13, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        const secondCall = addEntry.mock.calls[1][1];
        expect(secondCall.bonus).toBe(0);
        expect(secondCall.formula).toBe('1d20');
      });
    });

    describe('save DC calculation', () => {
      it('uses buildSaveDc when new-style passive has automation', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(17);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeNewStylePassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        expect(buildSaveDc).toHaveBeenCalledWith(
          expect.objectContaining({ saveDc: 'ability', saveAbility: 'STR' }),
          expect.any(Object),
        );
        expect(createSaveListener).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({ saveDc: 17 }),
        );
      });

      it('uses buildSaveDc when old-style passive has automation', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(14);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        expect(buildSaveDc).toHaveBeenCalledWith(
          expect.objectContaining({ saveDc: 'ability', saveAbility: 'STR' }),
          expect.any(Object),
        );
      });

      it('uses fallback DC calculation when passive has no automation', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [{ type: 'attack_rider', trigger: 'melee_hit_with_shield_equipped', options: ['push'] }] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            abilities: [{ name: 'Strength', bonus: 4 }],
            proficiency: 2,
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        // Fallback: 8 + 4 + 2 = 14
        expect(createSaveListener).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({ saveDc: 14 }),
        );
      });

      it('uses fallback DC with zero ability bonus when Strength not found', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [{ type: 'attack_rider', trigger: 'melee_hit_with_shield_equipped', options: ['push'] }] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
            abilities: [{ name: 'Dexterity', bonus: 3 }],
            proficiency: 2,
          },
        });
        const prevData = { formula: '1d8+3' };
        await shieldBash.handler(ctx, prevData);

        // Fallback: 8 + 0 + 2 = 10
        expect(createSaveListener).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({ saveDc: 10 }),
        );
      });
    });

    describe('new-style passive', () => {
      it('finds new-style passive when both old and new style exist', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Goblin1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(15);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: {
              passives: [makeShieldPassive(), makeNewStylePassive()],
            },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);

        expect(result).toHaveProperty('modal');
        expect(result.modal.type).toBe('shieldBash');
      });
    });

    describe('modal structure', () => {
      it('returns modal with correct options', async () => {
        getRuntimeValue.mockResolvedValue({ hit: true, attackerName: 'Fighter1', weaponType: 'melee', targetName: 'Dragon1' });
        checkOncePerTurnWithSkip.mockResolvedValue(null);
        parseMagicItemName.mockReturnValue({ baseName: 'Shield', magicBonus: 0 });
        buildSaveDc.mockReturnValue(18);
        createSaveListener.mockReturnValue({
          promise: Promise.resolve({ success: false, total: 5, roll: 5, saveBonus: 0 }),
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'Fighter1',
            automation: { passives: [makeShieldPassive()] },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', armor_category: 'Shield' }],
          },
        });
        const prevData = { formula: '1d8+3' };
        const result = await shieldBash.handler(ctx, prevData);

        expect(result.modal.type).toBe('shieldBash');
        expect(result.modal.props.action.name).toBe('Shield Bash');
        expect(result.modal.props.action.options).toEqual([
          { name: 'Push', effect: 'push', value: 5 },
          { name: 'Prone', effect: 'prone' },
        ]);
        expect(result.modal.props.targetName).toBe('Dragon1');
        expect(result.modal.props.saveDc).toBe(18);
        expect(result.modal.props.campaignName).toBe('test-campaign');
      });
    });
  });
});

describe('applyShieldBashEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and logs when chosenOption is skip', async () => {
    getRuntimeValue.mockReturnValue([]);
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    const result = await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'skip', 15);

    expect(result).toBeNull();
    expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'ability_use',
      abilityName: 'Shield Bash',
      description: expect.stringContaining('skipped'),
    }));
    expect(setRuntimeValue).not.toHaveBeenCalled();
    expect(getCombatContext).not.toHaveBeenCalled();
  });

  it('applies push effect and logs', async () => {
    getRuntimeValue.mockReturnValue([]);
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    const result = await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'Push', 15);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({
          target: 'Goblin1',
          source: 'Shield Bash',
          option: 'Push',
          effect: 'push',
          value: 5,
          duration: 'instant',
        }),
      ]),
      'test-campaign',
    );

    expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'ability_use',
      abilityName: 'Shield Bash',
      description: expect.stringContaining('pushed 5 ft'),
    }));

    expect(result).toHaveProperty('type', 'popup');
    expect(result.payload.type).toBe('automation_info');
    expect(result.payload.description).toContain('pushed 5 ft');
  });

  it('applies prone effect, adds condition, and logs', async () => {
    getRuntimeValue.mockReturnValue([]);
    getCombatContext.mockResolvedValue({ round: 3, activeCreatureName: 'Fighter1' });
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    const result = await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Orc1', 'Prone', 16);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({
          target: 'Orc1',
          source: 'Shield Bash',
          option: 'Prone',
          effect: 'prone_and_push',
          value: 5,
          duration: 'until_start_of_next_turn',
          saveType: 'STR',
          saveDc: 16,
          saveAbility: 'STR',
        }),
      ]),
      'test-campaign',
    );

    expect(addCondition).toHaveBeenCalledWith(
      expect.any(Object),
      'Orc1',
      { key: 'prone', label: 'Prone' },
      16,
      'STR',
      getRuntimeValue,
      setRuntimeValue,
      'test-campaign',
      playerStats,
    );

    expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'ability_use',
      abilityName: 'Shield Bash',
      description: expect.stringContaining('Prone condition'),
    }));

    expect(result).toHaveProperty('type', 'popup');
    expect(result.payload.description).toContain('Prone condition');
  });

  it('marks oncePerTurn as used after push', async () => {
    getRuntimeValue.mockReturnValue([]);
    getCombatContext.mockResolvedValue({ round: 5, activeCreatureName: 'Fighter1' });
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'Push', 15);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Fighter1',
      '_Shield_Bash_usedRound',
      { round: 5, activeCreature: 'Fighter1' },
      'test-campaign',
    );
  });

  it('marks oncePerTurn as used after prone', async () => {
    getRuntimeValue.mockReturnValue([]);
    getCombatContext.mockResolvedValue({ round: 2, activeCreatureName: 'Fighter1' });
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'Prone', 14);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Fighter1',
      '_Shield_Bash_usedRound',
      { round: 2, activeCreature: 'Fighter1' },
      'test-campaign',
    );
  });

  it('handles existing targetEffects when applying push', async () => {
    const existingEffects = [
      { target: 'Goblin1', effect: 'slowed' },
    ];
    getRuntimeValue.mockReturnValue(existingEffects);
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'Push', 15);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({ effect: 'slowed' }),
        expect.objectContaining({ effect: 'push' }),
      ]),
      'test-campaign',
    );
  });

  it('handles missing combat context gracefully for round tracking', async () => {
    getRuntimeValue.mockReturnValue([]);
    getCombatContext.mockResolvedValue(null);
    const playerStats = { name: 'Fighter1' };
    const action = { automation: {} };

    await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'Push', 15);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Fighter1',
      '_Shield_Bash_usedRound',
      { round: 1, activeCreature: 'Fighter1' },
      'test-campaign',
    );
  });

  it('preserves automation reference in popup result', async () => {
    getRuntimeValue.mockReturnValue([]);
    const playerStats = { name: 'Fighter1' };
    const action = { automation: { someKey: 'someValue' } };

    const result = await applyShieldBashEffect(action, playerStats, 'test-campaign', 'Goblin1', 'Push', 15);

    expect(result.payload.automation).toEqual({ someKey: 'someValue' });
  });
});

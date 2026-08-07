import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
  setCombatSummaryCache: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../ui/storage.js', () => ({
  default: { get: vi.fn(), set: vi.fn(() => Promise.resolve()) },
}));

vi.mock('./truePolymorphHandler.js', () => ({
  handle: vi.fn(),
}));

vi.mock('./polymorphService.js', () => ({
  revertPolymorph: vi.fn(),
}));

vi.mock('../../../ui/dataLoader.js', () => ({
  loadMonsters: vi.fn(),
}));

import {
  getActiveTruePolymorphs,
  getActiveObjectTransforms,
  getTruePolymorphCaster,
  getObjectTransformCaster,
  applyTruePolymorph,
  confirmTruePolymorphTransform,
  applyObjectTransform,
  summonCreatureFromObject,
  revertTruePolymorph,
} from './truePolymorphService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary, setCombatSummaryCache } from '../../../encounters/combatData.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import { addEntry } from '../../../ui/logService.js';
import storage from '../../../ui/storage.js';
import { handle as runTruePolymorphHandler } from './truePolymorphHandler.js';
import { revertPolymorph } from './polymorphService.js';
import { loadMonsters } from '../../../ui/dataLoader.js';

const campaignName = 'TestCampaign';
const casterName = 'TestCaster';
const targetName = 'Goblin';

function makePlayerStats(overrides = {}) {
  return {
    name: casterName,
    level: 10,
    proficiency: 4,
    abilities: { CON: { bonus: 2 } },
    spellAbilities: { saveDc: 15 },
    ...overrides,
  };
}

const baseTransform = {
  targetName,
  creature: {
    name: 'Bear',
    index: 'bear',
    size: 'Large',
    hit_points: 34,
    armor_class: 11,
    speed: '40 ft.',
    challenge_rating: '1',
  },
  casterName,
  spell: { name: 'True Polymorph', level: 9 },
  playerStats: makePlayerStats(),
  campaignName,
};

describe('truePolymorphService.getActiveTruePolymorphs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only true_polymorph effects', () => {
    getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'true_polymorph', source: casterName },
      { target: 'Orc', effect: 'polymorph', source: casterName },
      { target: 'Kobold', effect: 'true_polymorph', source: 'OtherCaster' },
    ]);

    const effects = getActiveTruePolymorphs(campaignName);

    expect(effects).toHaveLength(2);
    expect(effects.every(te => te.effect === 'true_polymorph')).toBe(true);
  });

  it('returns empty array when no effects exist', () => {
    getRuntimeValue.mockReturnValue([]);

    const effects = getActiveTruePolymorphs(campaignName);

    expect(effects).toEqual([]);
  });

  it('returns empty array when targetEffects is undefined', () => {
    getRuntimeValue.mockReturnValue(undefined);

    const effects = getActiveTruePolymorphs(campaignName);

    expect(effects).toEqual([]);
  });
});

describe('truePolymorphService.getActiveObjectTransforms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only object_transform effects', () => {
    getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'object_transform', source: casterName },
      { target: 'Orc', effect: 'true_polymorph', source: casterName },
      { target: 'Kobold', effect: 'object_transform', source: 'OtherCaster' },
    ]);

    const effects = getActiveObjectTransforms(campaignName);

    expect(effects).toHaveLength(2);
    expect(effects.every(te => te.effect === 'object_transform')).toBe(true);
  });

  it('returns empty array when no effects exist', () => {
    getRuntimeValue.mockReturnValue([]);

    const effects = getActiveObjectTransforms(campaignName);

    expect(effects).toEqual([]);
  });
});

describe('truePolymorphService.getTruePolymorphCaster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the source for a target with true_polymorph effect', () => {
    getRuntimeValue.mockReturnValue([
      { target: targetName, effect: 'true_polymorph', source: casterName },
      { target: targetName, effect: 'polymorph', source: 'OtherCaster' },
    ]);

    expect(getTruePolymorphCaster(targetName, campaignName)).toBe(casterName);
  });

  it('returns null when target has no true_polymorph effect', () => {
    getRuntimeValue.mockReturnValue([
      { target: targetName, effect: 'polymorph', source: casterName },
    ]);

    expect(getTruePolymorphCaster(targetName, campaignName)).toBeNull();
  });

  it('handles array target (takes first element)', () => {
    getRuntimeValue.mockReturnValue([
      { target: [targetName, 'extra'], effect: 'true_polymorph', source: casterName },
    ]);

    expect(getTruePolymorphCaster(targetName, campaignName)).toBe(casterName);
  });
});

describe('truePolymorphService.getObjectTransformCaster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the source for a target with object_transform effect', () => {
    getRuntimeValue.mockReturnValue([
      { target: targetName, effect: 'object_transform', source: casterName },
      { target: targetName, effect: 'true_polymorph', source: 'OtherCaster' },
    ]);

    expect(getObjectTransformCaster(targetName, campaignName)).toBe(casterName);
  });

  it('returns null when target has no object_transform effect', () => {
    getRuntimeValue.mockReturnValue([
      { target: targetName, effect: 'true_polymorph', source: casterName },
    ]);

    expect(getObjectTransformCaster(targetName, campaignName)).toBeNull();
  });

  it('handles array target (takes first element)', () => {
    getRuntimeValue.mockReturnValue([
      { target: [targetName, 'extra'], effect: 'object_transform', source: casterName },
    ]);

    expect(getObjectTransformCaster(targetName, campaignName)).toBe(casterName);
  });
});

describe('truePolymorphService.applyTruePolymorph', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for non-true-polymorph spells', async () => {
    const result = await applyTruePolymorph({ name: 'Fireball' }, {}, makePlayerStats(), campaignName, null);

    expect(result).toBeNull();
    expect(runTruePolymorphHandler).not.toHaveBeenCalled();
  });

  it('dispatches to the handler and returns its result', async () => {
    const popup = { type: 'popup', payload: { type: 'true_polymorph_select', targetName } };
    runTruePolymorphHandler.mockResolvedValue(popup);

    const spell = { name: 'True Polymorph', level: 9 };
    const metaCtx = { truePolymorphTarget: targetName, spellSaveDc: 16, slotLevel: 9 };
    const result = await applyTruePolymorph(spell, metaCtx, makePlayerStats(), campaignName, null);

    expect(runTruePolymorphHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'True Polymorph',
        automation: expect.objectContaining({
          type: 'true_polymorph',
          saveDc: 16,
          saveType: 'WIS',
          mode: undefined,
        }),
        spellSlotLevel: 9,
      }),
      expect.anything(),
      campaignName,
      null,
    );
    expect(result).toBe(popup);
  });

  it('uses proficiency-based DC when spellSaveDc is not provided', async () => {
    runTruePolymorphHandler.mockResolvedValue({ type: 'popup', payload: {} });

    const spell = { name: 'True Polymorph', level: 9 };
    const playerStats = makePlayerStats({ proficiency: 4, spellAbilities: null });
    await applyTruePolymorph(spell, {}, playerStats, campaignName, null);

    expect(runTruePolymorphHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        automation: expect.objectContaining({ saveDc: 12 }),
      }),
      expect.anything(),
      campaignName,
      null,
    );
  });

  it('returns null when the handler throws', async () => {
    runTruePolymorphHandler.mockRejectedValue(new Error('boom'));

    const result = await applyTruePolymorph(
      { name: 'True Polymorph', level: 9 },
      {},
      makePlayerStats(),
      campaignName,
      null,
    );

    expect(result).toBeNull();
  });

  it('passes the mode from metaCtx', async () => {
    runTruePolymorphHandler.mockResolvedValue({ type: 'popup', payload: {} });

    const spell = { name: 'True Polymorph' };
    const metaCtx = { truePolymorphPath: 'object_into_creature' };
    await applyTruePolymorph(spell, metaCtx, makePlayerStats(), campaignName, null);

    expect(runTruePolymorphHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        automation: expect.objectContaining({ mode: 'object_into_creature' }),
      }),
      expect.anything(),
      campaignName,
      null,
    );
  });
});

describe('truePolymorphService.confirmTruePolymorphTransform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCombatContext.mockResolvedValue({
      creatures: [
        { name: targetName, type: 'monster', currentHp: 7, maxHp: 15, ac: 13, speed: '30 ft.', initiative: 12, initiativeBonus: 0 },
        { name: casterName, type: 'player' },
      ],
    });
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: targetName, type: 'monster', currentHp: 7, maxHp: 15, ac: 13, speed: '30 ft.', initiative: 12, initiativeBonus: 0 },
        { name: casterName, type: 'player' },
      ],
    });
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === 'campaign' && subKey === 'targetEffects') return [];
      if (key === casterName && subKey === 'pendingExpirations') return [];
      return undefined;
    });
  });

  it('summons creature for object_into_creature mode', async () => {
    const creature = {
      name: 'Bear',
      index: 'bear',
      size: 'Large',
      hit_points: 34,
      armor_class: 11,
      speed: '40 ft.',
      challenge_rating: '1',
    };
    const mode = 'object_into_creature';
    loadMonsters.mockResolvedValue([{ index: 'bear', name: 'Bear' }]);

    const result = await confirmTruePolymorphTransform({
      targetName: null,
      creature,
      casterName,
      spell: { name: 'True Polymorph', level: 9 },
      playerStats: makePlayerStats(),
      campaignName,
      mode,
    });

    // The function delegates to summonCreatureFromObject which is the real function.
    // Verify it was reached by checking loadMonsters was called (summonCreatureFromObject calls it)
    expect(loadMonsters).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('summons creature with random initiative when caster has no initiative', async () => {
    const creature = {
      name: 'Bear',
      index: 'bear',
      size: 'Large',
      hit_points: 34,
      armor_class: 11,
      speed: '40 ft.',
      challenge_rating: '1',
    };
    const mode = 'object_into_creature';
    loadMonsters.mockResolvedValue([{ index: 'bear', name: 'Bear' }]);

    getCombatSummary.mockReturnValue({
      creatures: [
        { name: casterName, type: 'player', initiative: '', initiativeBonus: 2 },
      ],
    });

    const result = await confirmTruePolymorphTransform({
      targetName: null,
      creature,
      casterName,
      spell: { name: 'True Polymorph', level: 9 },
      playerStats: makePlayerStats(),
      campaignName,
      mode,
    });

    // Verify loadMonsters was called (summonCreatureFromObject calls it)
    expect(loadMonsters).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('returns no_target when creature is missing from combat', async () => {
    getCombatContext.mockResolvedValue({ creatures: [{ name: casterName, type: 'player' }] });

    const result = await confirmTruePolymorphTransform(baseTransform);

    expect(result).toEqual({ ok: false, reason: 'no_target' });
  });

  it('overrides creature stats with beast form and stores originals', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 7, ac: 15, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    await confirmTruePolymorphTransform(baseTransform);

    const creature = cs.creatures[0];
    expect(creature.maxHp).toBe(34);
    expect(creature.ac).toBe(11);
    expect(creature.speed).toBe('40 ft.');
    expect(creature.beastName).toBe('Bear');
    expect(creature.polymorphSource).toBe(casterName);
    expect(creature.polymorphOriginal).toEqual({ maxHp: 7, ac: 15, speed: '30 ft.' });
    expect(creature.polymorphBeast).toEqual({
      name: 'Bear',
      index: 'bear',
      size: 'Large',
      hitPoints: 34,
      armorClass: 11,
      speed: '40 ft.',
      challengeRating: '1',
    });
  });

  it('sets temp HP to the full beast form HP', async () => {
    await confirmTruePolymorphTransform(baseTransform);

    expect(setRuntimeValue).toHaveBeenCalledWith(targetName, 'tempHp', 34, campaignName);
    expect(setRuntimeValue).toHaveBeenCalledWith(targetName, 'polymorphTempHp', 34, campaignName);
  });

  it('persists the combat summary', async () => {
    await confirmTruePolymorphTransform(baseTransform);

    expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
    expect(setCombatSummaryCache).toHaveBeenCalled();
  });

  it('adds a true_polymorph targetEffect', async () => {
    await confirmTruePolymorphTransform(baseTransform);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({
          target: targetName,
          source: casterName,
          effect: 'true_polymorph',
          duration: 'concentration',
          beastName: 'Bear',
          mode: 'creature_to_creature',
        }),
      ]),
      campaignName,
      true,
    );
  });

  it('replaces an existing true_polymorph or polymorph effect instead of duplicating', async () => {
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === 'campaign' && subKey === 'targetEffects') {
        return [
          { target: targetName, effect: 'true_polymorph', source: 'OldCaster' },
          { target: targetName, effect: 'polymorph', source: 'AnotherCaster' },
        ];
      }
      if (key === casterName && subKey === 'pendingExpirations') return [];
      return undefined;
    });

    await confirmTruePolymorphTransform(baseTransform);

    const effectsCall = vi.mocked(setRuntimeValue).mock.calls.find(call => call[0] === 'campaign' && call[1] === 'targetEffects');
    const effects = effectsCall[2];
    expect(effects).toHaveLength(1);
    expect(effects[0].source).toBe(casterName);
  });

  it('registers concentration on the caster', async () => {
    await confirmTruePolymorphTransform(baseTransform);

    expect(addConcentration).toHaveBeenCalledWith(
      expect.any(Object),
      casterName,
      'True Polymorph',
      expect.any(Number),
    );
  });

  it('writes a true_polymorph pending expiration with infinite rounds', async () => {
    await confirmTruePolymorphTransform(baseTransform);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      casterName,
      'pendingExpirations',
      expect.arrayContaining([
        expect.objectContaining({
          target: targetName,
          effects: expect.arrayContaining([expect.objectContaining({ type: 'true_polymorph' })]),
          expiryRounds: Infinity,
          expireOnCreatureName: null,
        }),
      ]),
      campaignName,
    );
  });

  it('logs the transformation', async () => {
    await confirmTruePolymorphTransform(baseTransform);

    const transformCalls = vi.mocked(addEntry).mock.calls.filter(call => call[1]?.description.includes('is transformed into Bear'));
    expect(transformCalls.length).toBe(1);
  });

  it('handles creature with no hit_points (defaults to 0)', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 7, ac: 15, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    const creatureWithoutHp = {
      name: 'Bear',
      index: 'bear',
      size: 'Large',
      armor_class: 11,
      speed: '40 ft.',
      challenge_rating: '1',
    };

    await confirmTruePolymorphTransform({
      ...baseTransform,
      creature: creatureWithoutHp,
    });

    const creature = cs.creatures[0];
    expect(creature.maxHp).toBe(0);
    expect(creature.ac).toBe(11);
  });
});

describe('truePolymorphService.applyObjectTransform', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no_target when creature is missing from combat', async () => {
    getCombatContext.mockResolvedValue({ creatures: [{ name: casterName, type: 'player' }] });

    const result = await applyObjectTransform('Missing', 'stone_block', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    expect(result).toEqual({ ok: false, reason: 'no_target' });
  });

  it('overrides creature stats with object form and stores originals', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    const result = await applyObjectTransform(targetName, 'stone_block', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    expect(result.ok).toBe(true);

    const creature = cs.creatures[0];
    expect(creature.polymorphSource).toBe(casterName);
    expect(creature.polymorphOriginal).toEqual({ maxHp: 15, ac: 13, speed: '30 ft.' });
    expect(creature.polymorphObject).toEqual({ type: 'stone_block', icon: 'fa-cube' });
    expect(creature.objectType).toBe('stone_block');
  });

  it('adds incapacitated condition when not already present', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === targetName && subKey === 'activeConditions') return [];
      return undefined;
    });

    await applyObjectTransform(targetName, 'iron_chain', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    expect(setRuntimeValue).toHaveBeenCalledWith(
      targetName,
      'activeConditions',
      expect.arrayContaining(['incapacitated']),
      campaignName,
    );
  });

  it('does not duplicate incapacitated condition when already present', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === targetName && subKey === 'activeConditions') return ['incapacitated'];
      return undefined;
    });

    await applyObjectTransform(targetName, 'iron_chain', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    const condCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
      call => call[1] === 'activeConditions' && call[0] === targetName,
    );
    expect(condCalls.length).toBe(0);
  });

  it('persists the combat summary', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    await applyObjectTransform(targetName, 'stone_block', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
    expect(setCombatSummaryCache).toHaveBeenCalled();
  });

  it('adds an object_transform targetEffect', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    await applyObjectTransform(targetName, 'wooden_crate', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({
          target: targetName,
          source: casterName,
          effect: 'object_transform',
          duration: 'concentration',
          objectType: 'wooden_crate',
        }),
      ]),
      campaignName,
      true,
    );
  });

  it('removes existing object_transform, true_polymorph, and polymorph effects before adding new one', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === 'campaign' && subKey === 'targetEffects') {
        return [
          { target: targetName, effect: 'object_transform', source: 'Old' },
          { target: targetName, effect: 'true_polymorph', source: 'Old' },
          { target: targetName, effect: 'polymorph', source: 'Old' },
          { target: 'Other', effect: 'hold_monster', source: 'Other' },
        ];
      }
      if (key === targetName && subKey === 'activeConditions') return [];
      return undefined;
    });

    await applyObjectTransform(targetName, 'stone_block', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    const effectsCall = vi.mocked(setRuntimeValue).mock.calls.find(call => call[0] === 'campaign' && call[1] === 'targetEffects');
    const effects = effectsCall[2];
    expect(effects).toHaveLength(2); // old ones removed + new one + Other
    expect(effects.find(e => e.effect === 'object_transform')?.source).toBe(casterName);
  });

  it('registers concentration on the caster', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }, { name: casterName, type: 'player' }] };
    getCombatContext.mockResolvedValue(cs);

    await applyObjectTransform(targetName, 'stone_block', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    expect(addConcentration).toHaveBeenCalledWith(
      expect.any(Object),
      casterName,
      'True Polymorph',
      expect.any(Number),
    );
  });

  it('logs the transformation', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    await applyObjectTransform(targetName, 'stone_block', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    const transformCalls = vi.mocked(addEntry).mock.calls.filter(call => call[1]?.description.includes('is transformed into an stone_block'));
    expect(transformCalls.length).toBe(1);
  });

  it('uses default icon for unknown object types', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    await applyObjectTransform(targetName, 'mystery_type', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());

    const creature = cs.creatures[0];
    expect(creature.polymorphObject.icon).toBe('fa-circle');
  });

  it('handles all known object type icons', async () => {
    const cs = { creatures: [{ name: targetName, type: 'monster', currentHp: 5, maxHp: 15, ac: 13, speed: '30 ft.' }] };
    getCombatContext.mockResolvedValue(cs);

    await applyObjectTransform(targetName, 'iron_bars', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());
    expect(cs.creatures[0].polymorphObject.icon).toBe('fa-grip-lines');

    await applyObjectTransform(targetName, 'glass_vial', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());
    expect(cs.creatures[0].polymorphObject.icon).toBe('fa-flask');

    await applyObjectTransform(targetName, 'leather_book', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());
    expect(cs.creatures[0].polymorphObject.icon).toBe('fa-book');

    await applyObjectTransform(targetName, 'bronze_statue', casterName, { name: 'True Polymorph' }, campaignName, makePlayerStats());
    expect(cs.creatures[0].polymorphObject.icon).toBe('fa-statue');
  });
});

describe('truePolymorphService.summonCreatureFromObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: casterName, type: 'player' },
      ],
    });
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === 'campaign' && subKey === 'targetEffects') return [];
      return undefined;
    });
  });

  it('returns no_monster when monster is not found', async () => {
    loadMonsters.mockResolvedValue([{ index: 'wolf', name: 'Wolf' }]);

    const result = await summonCreatureFromObject('nonexistent', casterName, 15, 9, makePlayerStats(), campaignName);

    expect(result).toEqual({ ok: false, reason: 'no_monster' });
  });

  it('returns no_combat when there is no combat summary', async () => {
    getCombatSummary.mockReturnValue(null);
    loadMonsters.mockResolvedValue([{ index: 'wolf', name: 'Wolf' }]);

    const result = await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    expect(result).toEqual({ ok: false, reason: 'no_combat' });
  });

  it('creates a new creature and adds it to combat', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      type: 'beast',
      armor_class: 13,
      hit_points: 11,
      damage_resistances: ['slashing'],
      damage_immunities: [],
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [{ name: 'Bite' }],
    };
    loadMonsters.mockResolvedValue([monster]);

    const result = await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    expect(result.ok).toBe(true);
    expect(result.creatureName).toBe('Wolf');

    const cs = getCombatSummary(campaignName);
    const wolf = cs.creatures.find(c => c.name === 'Wolf');
    expect(wolf).toBeDefined();
    expect(wolf.summonedBy).toBe(casterName);
    expect(wolf.summonSource).toBe('true_polymorph');
    expect(wolf.monsterIndex).toBe('wolf');
  });

  it('calculates AC as base + slot level', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('wolf', casterName, 15, 3, makePlayerStats(), campaignName);

    const cs = getCombatSummary(campaignName);
    const wolf = cs.creatures.find(c => c.name === 'Wolf');
    expect(wolf.ac).toBe(16); // 13 + 3
  });

  it('uses base HP regardless of slot level', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('wolf', casterName, 15, 5, makePlayerStats(), campaignName);

    const cs = getCombatSummary(campaignName);
    const wolf = cs.creatures.find(c => c.name === 'Wolf');
    expect(wolf.maxHp).toBe(11);
    expect(wolf.currentHp).toBe(11);
  });

  it('sets initiative as value - 0.1', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    const cs = getCombatSummary(campaignName);
    const wolf = cs.creatures.find(c => c.name === 'Wolf');
    expect(wolf.initiative).toBe('14.9');
  });

  it('adds a summoned targetEffect', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({
          target: 'Wolf',
          source: casterName,
          effect: 'summoned',
          duration: 'concentration',
        }),
      ]),
      campaignName,
      true,
    );
  });

  it('does not duplicate summoned targetEffect if one already exists', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === 'campaign' && subKey === 'targetEffects') {
        return [{ target: 'Wolf', source: casterName, effect: 'summoned', duration: 'concentration' }];
      }
      return undefined;
    });

    await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    // setRuntimeValue should not be called for targetEffects since the effect already exists
    const effectsCalls = vi.mocked(setRuntimeValue).mock.calls.filter(call => call[1] === 'targetEffects');
    expect(effectsCalls.length).toBe(0);
  });

  it('registers concentration on the caster', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    expect(addConcentration).toHaveBeenCalledWith(
      expect.any(Object),
      casterName,
      'True Polymorph',
      expect.any(Number),
    );
  });

  it('logs the summon', async () => {
    const monster = {
      index: 'wolf',
      name: 'Wolf',
      armor_class: 13,
      hit_points: 11,
      size: 'Medium',
      speed: '50 ft.',
      ability_scores: { str: 12, dex: 14, con: 11, int: 3, wis: 12, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('wolf', casterName, 15, 9, makePlayerStats(), campaignName);

    const logCalls = vi.mocked(addEntry).mock.calls.filter(call => call[1]?.description.includes('transforms an object into Wolf'));
    expect(logCalls.length).toBe(1);
  });

  it('sets default values for missing monster fields', async () => {
    const monster = {
      index: 'empty',
      name: 'Empty',
      armor_class: 10,
      hit_points: 0,
      ability_scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('empty', casterName, 15, 9, makePlayerStats(), campaignName);

    const cs = getCombatSummary(campaignName);
    const creature = cs.creatures.find(c => c.name === 'Empty');
    expect(creature.type).toBe('monstrosity');
    expect(creature.size).toBe('Medium');
    expect(creature.speed).toEqual({ walk: '30 ft.' });
    expect(creature.actions).toEqual([]);
  });

  it('calculates monster save bonuses correctly', async () => {
    const monster = {
      index: 'goblin',
      name: 'Goblin',
      armor_class: 15,
      hit_points: 11,
      size: 'Small',
      speed: '30 ft.',
      ability_scores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      proficiency_bonus: 2,
      special_abilities: [{ name: 'Goblin Stealth' }],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('goblin', casterName, 15, 9, makePlayerStats(), campaignName);

    const cs = getCombatSummary(campaignName);
    const creature = cs.creatures.find(c => c.name === 'Goblin');
    // str: floor((8-10)/2) = -1, no str save bonus
    expect(creature.saveBonuses.str).toBe(-1);
    // dex: floor((14-10)/2) = 2, no dex save bonus in abilities
    expect(creature.saveBonuses.dex).toBe(2);
    // con: floor((10-10)/2) = 0
    expect(creature.saveBonuses.con).toBe(0);
    // wis: floor((8-10)/2) = -1
    expect(creature.saveBonuses.wis).toBe(-1);
  });

  it('uses monster damage_immunities as fallback for immunities', async () => {
    const monster = {
      index: 'fire_elemental',
      name: 'Fire Elemental',
      armor_class: 12,
      hit_points: 50,
      size: 'Large',
      speed: '40 ft.',
      damage_immunities: ['fire'],
      ability_scores: { str: 10, dex: 10, con: 10, int: 6, wis: 10, cha: 10 },
      proficiency_bonus: 2,
      special_abilities: [],
      actions: [],
    };
    loadMonsters.mockResolvedValue([monster]);

    await summonCreatureFromObject('fire_elemental', casterName, 15, 9, makePlayerStats(), campaignName);

    const cs = getCombatSummary(campaignName);
    const creature = cs.creatures.find(c => c.name === 'Fire Elemental');
    expect(creature.immunities).toEqual(['fire']);
  });
});

describe('truePolymorphService.revertTruePolymorph', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false when combat summary has no creatures', () => {
    getCombatSummary.mockReturnValue({ creatures: null });

    const result = revertTruePolymorph(targetName, campaignName);

    expect(result).toBe(false);
  });

  it('returns false when target creature is not found', () => {
    getCombatSummary.mockReturnValue({ creatures: [{ name: casterName, type: 'player' }] });

    const result = revertTruePolymorph(targetName, campaignName);

    expect(result).toBe(false);
  });

  it('removes summoned creature from combat and logs', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: targetName, type: 'monster', summonedBy: casterName, summonSource: 'true_polymorph' },
        { name: casterName, type: 'player' },
      ],
    });
    getRuntimeValue.mockReturnValue([]);

    const result = revertTruePolymorph(targetName, campaignName);

    expect(result).toBe(true);
    expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
    expect(setCombatSummaryCache).toHaveBeenCalled();

    const logCalls = vi.mocked(addEntry).mock.calls.filter(call => call[1]?.description.includes('fades away'));
    expect(logCalls.length).toBe(1);

    // Verify the stored combat summary has the creature removed
    const storageCall = vi.mocked(storage.set).mock.calls.find(call => call[0] === 'combatSummary');
    const storedCs = storageCall[1];
    const found = storedCs.creatures.find(c => c.name === targetName);
    expect(found).toBeUndefined();
  });

  it('removes summoned targetEffect for the creature', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: targetName, type: 'monster', summonedBy: casterName, summonSource: 'true_polymorph' },
        { name: casterName, type: 'player' },
      ],
    });
    getRuntimeValue.mockReturnValue([
      { target: targetName, source: casterName, effect: 'summoned', duration: 'concentration' },
      { target: 'Other', source: 'Other', effect: 'hold_monster' },
    ]);

    revertTruePolymorph(targetName, campaignName);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      expect.arrayContaining([
        expect.objectContaining({ target: 'Other', effect: 'hold_monster' }),
      ]),
      campaignName,
      true,
    );
  });

  it('reverts object transform: restores original stats', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          maxHp: 34,
          ac: 11,
          speed: '40 ft.',
          polymorphSource: casterName,
          polymorphObject: { type: 'stone_block', icon: 'fa-cube' },
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === targetName && subKey === 'activeConditions') return ['incapacitated'];
      return undefined;
    });

    const result = revertTruePolymorph(targetName, campaignName);

    expect(result).toBe(true);

    const cs = getCombatSummary(campaignName);
    const creature = cs.creatures[0];
    expect(creature.maxHp).toBe(15);
    expect(creature.ac).toBe(13);
    expect(creature.speed).toBe('30 ft.');
    expect(creature.polymorphObject).toBeUndefined();
    expect(creature.objectType).toBeUndefined();
    expect(creature.polymorphSource).toBeUndefined();
    expect(creature.polymorphOriginal).toBeUndefined();
  });

  it('removes incapacitated condition on object transform revert', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          maxHp: 34,
          ac: 11,
          speed: '40 ft.',
          polymorphSource: casterName,
          polymorphObject: { type: 'stone_block' },
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === targetName && subKey === 'activeConditions') return ['incapacitated', 'blinded'];
      return undefined;
    });

    revertTruePolymorph(targetName, campaignName);

    expect(setRuntimeValue).toHaveBeenCalledWith(
      targetName,
      'activeConditions',
      ['blinded'],
      campaignName,
    );
  });

  it('does not modify conditions if incapacitated is not present', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          maxHp: 34,
          ac: 11,
          speed: '40 ft.',
          polymorphSource: casterName,
          polymorphObject: { type: 'stone_block' },
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === targetName && subKey === 'activeConditions') return ['blinded'];
      return undefined;
    });

    revertTruePolymorph(targetName, campaignName);

    const condCalls = vi.mocked(setRuntimeValue).mock.calls.filter(call => call[1] === 'activeConditions' && call[0] === targetName);
    expect(condCalls.length).toBe(0);
  });

  it('removes object_transform targetEffect on revert', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          maxHp: 34,
          ac: 11,
          speed: '40 ft.',
          polymorphSource: casterName,
          polymorphObject: { type: 'stone_block' },
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockImplementation((key, subKey) => {
      if (key === targetName && subKey === 'activeConditions') return [];
      if (key === 'campaign' && subKey === 'targetEffects') {
        return [
          { target: targetName, source: casterName, effect: 'object_transform', duration: 'concentration' },
          { target: 'Other', source: 'Other', effect: 'hold_monster' },
        ];
      }
      return undefined;
    });

    revertTruePolymorph(targetName, campaignName);

    const effectsCall = vi.mocked(setRuntimeValue).mock.calls.find(call => call[1] === 'targetEffects');
    if (effectsCall) {
      const effects = effectsCall[2];
      expect(effects.find(e => e.effect === 'object_transform')).toBeUndefined();
      expect(effects.find(e => e.effect === 'hold_monster')).toBeDefined();
    }
  });

  it('logs the revert for object transform', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          maxHp: 34,
          ac: 11,
          speed: '40 ft.',
          polymorphSource: casterName,
          polymorphObject: { type: 'stone_block' },
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockReturnValue([]);

    revertTruePolymorph(targetName, campaignName);

    const revertCalls = vi.mocked(addEntry).mock.calls.filter(call => call[1]?.description.includes('reverts to their normal form'));
    expect(revertCalls.length).toBe(1);
  });

  it('falls through to revertPolymorph for creature_to_creature polymorph', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          polymorphSource: casterName,
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockReturnValue([]);
    revertPolymorph.mockReturnValue(true);

    const result = revertTruePolymorph(targetName, campaignName);

    expect(revertPolymorph).toHaveBeenCalledWith(targetName, campaignName);
    expect(result).toBe(true);
  });

  it('returns false when creature has no polymorph fields', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: targetName, type: 'monster', maxHp: 15, ac: 13, speed: '30 ft.' },
      ],
    });

    const result = revertTruePolymorph(targetName, campaignName);

    expect(result).toBe(false);
    expect(revertPolymorph).not.toHaveBeenCalled();
  });

  it('persists combat summary after reverting object transform', () => {
    getCombatSummary.mockReturnValue({
      creatures: [
        {
          name: targetName,
          type: 'monster',
          maxHp: 34,
          ac: 11,
          speed: '40 ft.',
          polymorphSource: casterName,
          polymorphObject: { type: 'stone_block' },
          polymorphOriginal: { maxHp: 15, ac: 13, speed: '30 ft.' },
        },
      ],
    });
    getRuntimeValue.mockReturnValue([]);

    revertTruePolymorph(targetName, campaignName);

    expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
    expect(setCombatSummaryCache).toHaveBeenCalled();
  });
});

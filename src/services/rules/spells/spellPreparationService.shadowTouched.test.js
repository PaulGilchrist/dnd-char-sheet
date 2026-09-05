// FT-070 — Shadow Touched: Shadow Magic free casts for BOTH the chosen spell and
// Invisibility, tracked with independent per-spell counters
// (`_Shadow_Magic_<Spell>_freeCastCount`, CLA-308 naming). First free cast of each
// consumes no spell slot; once a spell's counter is spent the spell stays castable
// but pays a spell slot normally.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => {
  const setRuntimeValue = vi.fn();
  const getRuntimeValue = vi.fn(() => undefined);
  const clearRuntimeState = vi.fn();
  return { setRuntimeValue, getRuntimeValue, clearRuntimeState };
});

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../../services/combat/concentration/concentrationService.js', () => ({
  breakConcentration: vi.fn(),
  addConcentration: vi.fn(),
  cleanupConcentrationEffects: vi.fn(),
}));

vi.mock('../../../services/ui/storage.js', () => ({
  default: { set: vi.fn() },
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

import { isFreeCastAuthorized, incrementFreeCastResource, prepareSpellCast } from './spellPreparationService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';

const CAMPAIGN = 'test-campaign';
const playerName = 'HexWarlock';

function makePlayerStats(overrides = {}) {
  return {
    name: playerName,
    class: { name: 'Sorcerer' },
    abilities: [{ name: 'Charisma', bonus: 3 }],
    proficiency: 5,
    spellAbilities: {
      spellCastingAbility: 'Charisma',
      spell_slots_level_1: 4,
      spell_slots_level_2: 3,
    },
    automation: { actions: [], bonusActions: [], specialActions: [], passives: [] },
    hitPoints: 73,
    ...overrides,
  };
}

// The live automation shape produced by rules.js for Shadow Touched (FT-070):
// one specialActions entry covering chosen spell + Invisibility with perSpellTracking.
function shadowMagicEntry(chosen = 'False Life') {
  return {
    type: 'free_spell',
    spell: [...new Set([chosen, 'Invisibility'])],
    name: 'Shadow Magic',
    uses: 1,
    recharge: 'long_rest',
    perSpellTracking: true,
  };
}

function makeShadowStats(chosen = 'False Life') {
  const entry = shadowMagicEntry(chosen);
  return makePlayerStats({
    automation: { actions: [], bonusActions: [], specialActions: [entry], passives: [] },
  });
}

function makeSpell(name, level) {
  return {
    name,
    level,
    school: level === 1 ? 'Necromancy' : 'Illusion',
    casting_time: '1 action',
    components: ['V', 'S'],
  };
}

function mockRuntime(map) {
  getRuntimeValue.mockImplementation((_name, key) => (key in map ? map[key] : undefined));
}

describe('FT-070 Shadow Touched — isFreeCastAuthorized per-spell counters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('authorizes a fresh free cast of the chosen spell without a slot', async () => {
    const authorized = await isFreeCastAuthorized(playerName, 'False Life', 1, makeShadowStats(), CAMPAIGN);
    expect(authorized).toBe(true);
  });

  it('authorizes a fresh free cast of Invisibility (previously inert)', async () => {
    const authorized = await isFreeCastAuthorized(playerName, 'Invisibility', 2, makeShadowStats(), CAMPAIGN);
    expect(authorized).toBe(true);
  });

  it('authorizes Invisibility even after the chosen spell free cast is spent (independent counters)', async () => {
    mockRuntime({ '_Shadow_Magic_False_Life_freeCastCount': 0 });
    const authorized = await isFreeCastAuthorized(playerName, 'Invisibility', 2, makeShadowStats(), CAMPAIGN);
    expect(authorized).toBe(true);
  });

  it('refuses the second free cast of the same spell (counter spent)', async () => {
    mockRuntime({ '_Shadow_Magic_Invisibility_freeCastCount': 0 });
    const authorized = await isFreeCastAuthorized(playerName, 'Invisibility', 2, makeShadowStats(), CAMPAIGN);
    expect(authorized).toBe(false);
  });

  it('refuses the second free cast of the chosen spell (counter spent)', async () => {
    mockRuntime({ '_Shadow_Magic_False_Life_freeCastCount': 0 });
    const authorized = await isFreeCastAuthorized(playerName, 'False Life', 1, makeShadowStats(), CAMPAIGN);
    expect(authorized).toBe(false);
  });

  it('ignores spells outside the feature list', async () => {
    const authorized = await isFreeCastAuthorized(playerName, 'Shield', 1, makeShadowStats(), CAMPAIGN);
    expect(authorized).toBe(false);
  });

  it('non-holder without the feature never gets the free cast', async () => {
    const authorized = await isFreeCastAuthorized(playerName, 'Invisibility', 2, makePlayerStats(), CAMPAIGN);
    expect(authorized).toBe(false);
  });
});

describe('FT-070 Shadow Touched — prepareSpellCast consumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('free cast of Invisibility consumes only its own counter, stamps no slot, logs the feature', async () => {
    const playerStats = makeShadowStats();
    const result = await prepareSpellCast(makeSpell('Invisibility', 2), {}, {
      playerName, playerStats, campaignName: CAMPAIGN,
      freeCastAuthorized: await isFreeCastAuthorized(playerName, 'Invisibility', 2, playerStats, CAMPAIGN),
    });
    expect(result.freeCastUsed).toBe(true);
    expect(result.slotConsumed).toBe(false);
    expect(setRuntimeValue).toHaveBeenCalledWith(playerName, '_Shadow_Magic_Invisibility_freeCastCount', 0, CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, '_Shadow_Magic_False_Life_freeCastCount', expect.anything(), CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, 'spell_slots_level_2', expect.anything(), CAMPAIGN);
    const logged = addEntry.mock.calls.some(([, e]) =>
      e.type === 'ability_use' && e.abilityName === 'Shadow Magic' && e.spellName === 'Invisibility');
    expect(logged).toBe(true);
  });

  it('free cast of the chosen spell consumes its own counter, no slot', async () => {
    const playerStats = makeShadowStats();
    const result = await prepareSpellCast(makeSpell('False Life', 1), {}, {
      playerName, playerStats, campaignName: CAMPAIGN,
      freeCastAuthorized: await isFreeCastAuthorized(playerName, 'False Life', 1, playerStats, CAMPAIGN),
    });
    expect(result.freeCastUsed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith(playerName, '_Shadow_Magic_False_Life_freeCastCount', 0, CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, '_Shadow_Magic_Invisibility_freeCastCount', expect.anything(), CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, 'spell_slots_level_1', expect.anything(), CAMPAIGN);
  });

  it('second cast of Invisibility after free cast is spent pays a spell slot', async () => {
    mockRuntime({ '_Shadow_Magic_Invisibility_freeCastCount': 0, 'spell_slots_level_2': 3 });
    const playerStats = makeShadowStats();
    const authorized = await isFreeCastAuthorized(playerName, 'Invisibility', 2, playerStats, CAMPAIGN);
    expect(authorized).toBe(false);
    const result = await prepareSpellCast(makeSpell('Invisibility', 2), {}, {
      playerName, playerStats, campaignName: CAMPAIGN, freeCastAuthorized: authorized,
    });
    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'spell_slots_level_2', 2, CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, '_Shadow_Magic_Invisibility_freeCastCount', 0, CAMPAIGN);
  });

  it('non-holder cast consumes a slot normally', async () => {
    mockRuntime({ 'spell_slots_level_2': 3 });
    const playerStats = makePlayerStats();
    const result = await prepareSpellCast(makeSpell('Invisibility', 2), {}, {
      playerName, playerStats, campaignName: CAMPAIGN, freeCastAuthorized: false,
    });
    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'spell_slots_level_2', 2, CAMPAIGN);
  });
});

describe('FT-070 Shadow Touched — incrementFreeCastResource rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('rolls back only the rolled-back spell counter', async () => {
    mockRuntime({ '_Shadow_Magic_Invisibility_freeCastCount': 0 });
    incrementFreeCastResource(playerName, 'Invisibility', 2, makeShadowStats(), CAMPAIGN);
    expect(setRuntimeValue).toHaveBeenCalledWith(playerName, '_Shadow_Magic_Invisibility_freeCastCount', 1, CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, '_Shadow_Magic_False_Life_freeCastCount', expect.anything(), CAMPAIGN);
  });

  it('fresh (null) counter is not bumped past max on rollback', async () => {
    incrementFreeCastResource(playerName, 'Invisibility', 2, makeShadowStats(), CAMPAIGN);
    expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, '_Shadow_Magic_Invisibility_freeCastCount', expect.anything(), CAMPAIGN);
  });
});

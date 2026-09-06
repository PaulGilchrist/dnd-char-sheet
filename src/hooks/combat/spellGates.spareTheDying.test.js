import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

// PCs canonical via runtime store; monsters via combatSummary currentHp only.
vi.mock('../runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

import { tryGateSpell } from './spellGates.js';
import { isSpareTheDyingTarget } from './spellGateHelpers.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getRuntimeValue } from '../runtime/useRuntimeState.js';

const CAMPAIGN = 'TestCampaign';
const spell = { name: 'Spare the Dying', level: 0, range: '15 feet', casting_time: 'Action' };

function runtimeMap(map) {
  return (name, key) => {
    if (map[name] && key in map[name]) return map[name][key];
    return null;
  };
}

function makeCs() {
  return {
    creatures: [
      { name: 'Cleric', type: 'player', currentHp: 1, maxHp: 1 },
      { name: 'LightfootHalfling', type: 'player', currentHp: 1, maxHp: 12 },
      { name: 'War_Cleric', type: 'player', currentHp: 1, maxHp: 45 },
      { name: 'Thug 1', type: 'npc', monsterType: 'humanoid', currentHp: 32, maxHp: 32 },
      { name: 'Thug 2', type: 'npc', monsterType: 'humanoid', currentHp: 0, maxHp: 32 },
      { name: 'Zombie 1', type: 'npc', monsterType: 'Undead', currentHp: 0, maxHp: 22 },
    ],
  };
}

function gate(cs, setPopupHtml = vi.fn()) {
  const cfSetPending = vi.fn();
  const handled = tryGateSpell('Spare the Dying', CAMPAIGN, cfSetPending, {
    spell,
    metaCtx: {},
    playerStats: { name: 'Cleric' },
    characters: [],
    isSorcerer: false,
    setPopupHtml,
  });
  return { handled, cfSetPending, setPopupHtml };
}

describe('SP-110 isSpareTheDyingTarget — canonical 0-HP-not-dead predicate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts a dying PC (runtime 0 HP, not dead, not stable)', () => {
    getRuntimeValue.mockImplementation(runtimeMap({
      LightfootHalfling: { currentHitPoints: 0, isDead: null },
    }));
    expect(isSpareTheDyingTarget(makeCs(), 'LightfootHalfling')).toBe(true);
  });

  it('rejects a healthy PC via runtime currentHitPoints', () => {
    getRuntimeValue.mockImplementation(runtimeMap({ War_Cleric: { currentHitPoints: 45 } }));
    expect(isSpareTheDyingTarget(makeCs(), 'War_Cleric')).toBe(false);
  });

  it('rejects a dead PC via runtime isDead', () => {
    getRuntimeValue.mockImplementation(runtimeMap({
      LightfootHalfling: { currentHitPoints: 0, isDead: 1 },
    }));
    expect(isSpareTheDyingTarget(makeCs(), 'LightfootHalfling')).toBe(false);
  });

  it('rejects an already-Stable PC (three death-save successes)', () => {
    getRuntimeValue.mockImplementation(runtimeMap({
      LightfootHalfling: { currentHitPoints: 0, deathSaves: [true, true, true] },
    }));
    expect(isSpareTheDyingTarget(makeCs(), 'LightfootHalfling')).toBe(false);
  });

  it('rejects healthy monsters via cs.currentHp (never runtime — pitfall 29)', () => {
    getRuntimeValue.mockImplementation(() => null);
    expect(isSpareTheDyingTarget(makeCs(), 'Thug 1')).toBe(false);
  });

  it('rejects canonical-dead monsters (cs 0 HP without deathSaves)', () => {
    expect(isSpareTheDyingTarget(makeCs(), 'Thug 2')).toBe(false);
  });

  it('accepts dying-modelled monsters (cs 0 HP + deathSaves)', () => {
    const cs = makeCs();
    cs.creatures[4].deathSaves = [false, false, false];
    expect(isSpareTheDyingTarget(cs, 'Thug 2')).toBe(true);
  });

  it('rejects undead and constructs', () => {
    expect(isSpareTheDyingTarget(makeCs(), 'Zombie 1')).toBe(false);
    expect(isSpareTheDyingTarget({
      creatures: [{ name: 'Golem', type: 'npc', monsterType: 'Construct', currentHp: 0, deathSaves: [false, false, false] }],
    }, 'Golem')).toBe(false);
  });
});

describe('SP-110 gateSpareTheDying — dying-target picker gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCombatSummary.mockReturnValue(makeCs());
  });

  it('offers ONLY the dying creature — healthy PCs, healthy/dead monsters and undead never appear', () => {
    getRuntimeValue.mockImplementation(runtimeMap({
      LightfootHalfling: { currentHitPoints: 0 },
      War_Cleric: { currentHitPoints: 45 },
    }));
    const { handled, cfSetPending } = gate();
    expect(handled).toBe(true);
    expect(cfSetPending).toHaveBeenCalledWith('spareTheDying', expect.objectContaining({
      creatureTargets: ['LightfootHalfling'],
    }));
  });

  it('refuses with an automation_info popup and no picker when nobody is at 0 HP', () => {
    getRuntimeValue.mockImplementation(runtimeMap({ War_Cleric: { currentHitPoints: 45 } }));
    const { handled, cfSetPending, setPopupHtml } = gate();
    expect(handled).toBe(true);
    expect(cfSetPending).not.toHaveBeenCalled();
    expect(setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
      type: 'automation_info',
      automationType: 'spareTheDying',
    }));
    expect(setPopupHtml.mock.calls[0][0].description).toContain('0 Hit Points');
  });

  it('excludes the caster even when the caster is dying', () => {
    getRuntimeValue.mockImplementation(runtimeMap({ Cleric: { currentHitPoints: 0 } }));
    const { cfSetPending, setPopupHtml } = gate();
    expect(cfSetPending).not.toHaveBeenCalled();
    expect(setPopupHtml).toHaveBeenCalled();
  });

  it('lists multiple dying creatures when several are at 0 HP', () => {
    getRuntimeValue.mockImplementation(runtimeMap({
      LightfootHalfling: { currentHitPoints: 0 },
      War_Cleric: { currentHitPoints: 0, isDead: 1 },
    }));
    const { cfSetPending } = gate();
    expect(cfSetPending.mock.calls[0][1].creatureTargets).toEqual(['LightfootHalfling']);
  });
});

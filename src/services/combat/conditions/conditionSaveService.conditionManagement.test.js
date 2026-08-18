// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('../../../services/automation/handlers/buffs/auraOfPurityHandler.js', () => ({
  handle: vi.fn(),
  isAuraOfPurityActive: vi.fn(),
  getAuraOfPuritySaveAdvantageConditions: vi.fn(),
}));

vi.mock('../automation/automationService.js', () => ({
  playerIsImmuneToCondition: vi.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────

import {
  removeCondition,
  addCondition,
} from './conditionSaveService.js';

import { playerIsImmuneToCondition } from '../automation/automationService.js';

// ── Helpers ───────────────────────────────────────────────────────

function makeGetRuntimeValue(initial = {}) {
  const store = new Map();
  for (const [key, value] of Object.entries(initial)) {
    store.set(key, value);
  }
  return vi.fn((name, runtimeKey) => store.get(`${name}:${runtimeKey}`));
}

function makeSetRuntimeValue() {
  const calls = [];
  const fn = vi.fn((name, runtimeKey, value) => {
    calls.push({ name, runtimeKey, value });
  });
  fn.calls = calls;
  return fn;
}

// ── Tests ────────────────────────────────────────────────────────

describe('removeCondition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes condition by key or string, case-insensitive, from activeConditions', () => {
    const getRV = makeGetRuntimeValue({ 'Hero:activeConditions': ['blinded', 'Charmed'] });
    const setRV = makeSetRuntimeValue();

    removeCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'CHARMED' },
      getRV,
      setRV,
      'Campaign',
    );

    expect(setRV).toHaveBeenCalledWith('Hero', 'activeConditions', ['blinded'], 'Campaign');

    vi.clearAllMocks();
    const getRV2 = makeGetRuntimeValue({ 'Hero:activeConditions': ['frightened', 'grappled'] });
    const setRV2 = makeSetRuntimeValue();

    removeCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      'Frightened',
      getRV2,
      setRV2,
      'Campaign',
    );

    expect(setRV2).toHaveBeenCalledWith('Hero', 'activeConditions', ['grappled'], 'Campaign');
  });

  it('treats null/undefined activeConditions as empty array', () => {
    const setRV = makeSetRuntimeValue();

    removeCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'poisoned' },
      vi.fn(() => null),
      setRV,
      'Campaign',
    );
    expect(setRV).toHaveBeenCalledWith('Hero', 'activeConditions', [], 'Campaign');

    vi.clearAllMocks();
    removeCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'poisoned' },
      vi.fn(() => undefined),
      setRV,
      'Campaign',
    );
    expect(setRV).toHaveBeenCalledWith('Hero', 'activeConditions', [], 'Campaign');
  });

  it('leaves array unchanged when condition is not present', () => {
    const getRV = makeGetRuntimeValue({ 'Hero:activeConditions': ['blinded'] });
    const setRV = makeSetRuntimeValue();

    removeCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed' },
      getRV,
      setRV,
      '',
    );

    expect(setRV).toHaveBeenCalledWith('Hero', 'activeConditions', ['blinded'], '');
  });

  it('works for monster creatures', () => {
    const getRV = makeGetRuntimeValue({ 'Orc:activeConditions': ['blinded', 'charmed'] });
    const setRV = makeSetRuntimeValue();

    removeCondition(
      { creatures: [{ type: 'monster', name: 'Orc' }] },
      'Orc',
      { key: 'blinded' },
      getRV,
      setRV,
      '',
    );

    expect(setRV).toHaveBeenCalledWith('Orc', 'activeConditions', ['charmed'], '');
  });

  it('does not call setRuntimeValue when creature is not found', () => {
    const setRV = makeSetRuntimeValue();

    removeCondition(
      { creatures: [{ type: 'player', name: 'Other' }] },
      'NonExistent',
      { key: 'blinded' },
      vi.fn(),
      setRV,
      '',
    );

    expect(setRV).not.toHaveBeenCalled();
  });
});

describe('addCondition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips adding when playerStats is immune', () => {
    playerIsImmuneToCondition.mockReturnValue(true);
    const setRV = makeSetRuntimeValue();

    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed', label: 'Charmed' },
      15,
      'wis',
      vi.fn(),
      setRV,
      'Campaign',
      { name: 'Hero', allFeatures: [] },
    );

    expect(playerIsImmuneToCondition).toHaveBeenCalled();
    expect(setRV).not.toHaveBeenCalled();
  });

  it('skips immunity check when playerStats is null or campaignName is falsy', () => {
    const getRV = makeGetRuntimeValue({ 'Hero:activeConditions': [] });
    const setRV = makeSetRuntimeValue();

    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed', label: 'Charmed' },
      15,
      'wis',
      getRV,
      setRV,
      '',
      null,
    );
    expect(playerIsImmuneToCondition).not.toHaveBeenCalled();

    vi.clearAllMocks();
    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed', label: 'Charmed' },
      15,
      'wis',
      getRV,
      setRV,
      '',
      { name: 'Hero' },
    );
    expect(playerIsImmuneToCondition).not.toHaveBeenCalled();
  });

  it('calls playerIsImmuneToCondition with correct arguments when not immune', () => {
    playerIsImmuneToCondition.mockReturnValue(false);
    const getRV = makeGetRuntimeValue({ 'Hero:activeConditions': [] });
    const setRV = makeSetRuntimeValue();
    const playerStats = { name: 'Hero' };

    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed', label: 'Charmed' },
      15,
      'wis',
      getRV,
      setRV,
      'Campaign',
      playerStats,
    );

    expect(playerIsImmuneToCondition).toHaveBeenCalledWith({
      conditionKey: 'charmed',
      playerStats,
      getRuntimeValue: getRV,
      campaignName: 'Campaign',
    });
  });

  it('appends new condition, deduplicates by key, and handles null activeConditions', () => {
    playerIsImmuneToCondition.mockReturnValue(false);

    const getRV1 = makeGetRuntimeValue({ 'Hero:activeConditions': ['blinded'] });
    const setRV1 = makeSetRuntimeValue();
    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed', label: 'Charmed' },
      15,
      'wis',
      getRV1,
      setRV1,
      'Campaign',
      {},
    );
    expect(setRV1).toHaveBeenCalledWith('Hero', 'activeConditions', ['blinded', 'charmed'], 'Campaign');

    vi.clearAllMocks();
    const getRV2 = makeGetRuntimeValue({ 'Hero:activeConditions': ['Charmed'] });
    const setRV2 = makeSetRuntimeValue();
    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'charmed', label: 'Charmed' },
      15,
      'wis',
      getRV2,
      setRV2,
      'Campaign',
      {},
    );
    expect(setRV2).toHaveBeenCalledWith('Hero', 'activeConditions', ['charmed'], 'Campaign');

    vi.clearAllMocks();
    const getRV3 = vi.fn(() => null);
    const setRV3 = makeSetRuntimeValue();
    addCondition(
      { creatures: [{ type: 'player', name: 'Hero' }] },
      'Hero',
      { key: 'poisoned', label: 'Poisoned' },
      12,
      'con',
      getRV3,
      setRV3,
      '',
      {},
    );
    expect(setRV3).toHaveBeenCalledWith('Hero', 'activeConditions', ['poisoned'], '');
  });

  it('works for monster/npc creatures and does nothing when creature is not found', () => {
    playerIsImmuneToCondition.mockReturnValue(false);

    const getRV = makeGetRuntimeValue({ 'Goblin:activeConditions': ['blinded'] });
    const setRV = makeSetRuntimeValue();
    addCondition(
      { creatures: [{ type: 'npc', name: 'Goblin' }] },
      'Goblin',
      { key: 'frightened', label: 'Frightened' },
      13,
      'wis',
      getRV,
      setRV,
      '',
      null,
    );
    expect(setRV).toHaveBeenCalledWith('Goblin', 'activeConditions', ['blinded', 'frightened'], '');

    vi.clearAllMocks();
    const setRV2 = makeSetRuntimeValue();
    addCondition(
      { creatures: [{ type: 'player', name: 'Other' }] },
      'NonExistent',
      { key: 'blinded', label: 'Blinded' },
      10,
      'null',
      vi.fn(),
      setRV2,
      '',
      null,
    );
    expect(setRV2).not.toHaveBeenCalled();
  });
});

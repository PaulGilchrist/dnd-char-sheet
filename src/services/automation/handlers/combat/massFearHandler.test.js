import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, resolveMassFear } from './massFearHandler.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as rangeCheck from '../../../rules/combat/rangeCheck.js';
import * as logService from '../../../ui/logService.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';
const mapName = 'test-map';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 5,
    proficiency: 3,
    abilities: [
      { name: 'INT', modifier: 4 },
      { name: 'WIS', modifier: 2 },
    ],
    ...overrides,
  };
}

function makeCombatSummary(creatures) {
  return { creatures, players: [], placedItems: [] };
}

// ── Tests ──────────────────────────────────────────────────────

describe('massFearHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(13);
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: true }) };
    });
    damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  describe('delegation to resolveMassFear', () => {
    it('calls resolveMassFear with correct arguments', async () => {
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      const ps = makePlayerStats();
      const action = { automation: { saveDc: 13, saveAbility: 'WIS' } };

      const result = await handle(action, ps, campaignName, mapName, null);

      expect(result.type).toBe('popup');
      expect(savePrompt.buildSaveDc).toHaveBeenCalled();
    });

    it('uses action as option when automation is missing', async () => {
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      const ps = makePlayerStats();
      const action = { saveDc: 13, saveAbility: 'WIS' };

      const result = await handle(action, ps, campaignName, mapName, null);

      expect(result.type).toBe('popup');
      expect(savePrompt.buildSaveDc).toHaveBeenCalled();
    });

    it('passes mapName to resolveMassFear', async () => {
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary([
        { name: 'TestCaster', type: 'player' },
        { name: 'Goblin', type: 'monster' },
        { name: 'Orc', type: 'monster' },
      ]));
      rangeCheck.isWithinRange.mockResolvedValue(true);

      const ps = makePlayerStats();
      const action = { automation: { saveDc: 13 } };

      const result = await handle(action, ps, campaignName, mapName, null);

      expect(result.type).toBe('popup');
      expect(rangeCheck.isWithinRange).toHaveBeenCalled();
    });
  });
});

describe('massFearHandler.resolveMassFear - no creatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(13);
  });

  it('returns popup when combat context is null', async () => {
    damageUtils.getCombatContext.mockResolvedValue(null);

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13 }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.type).toBe('automation_info');
    expect(result.payload.description).toBe('No creatures in combat.');
  });

  it('returns popup when creatures array is empty', async () => {
    damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary([]));

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13 }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toBe('No creatures in combat.');
  });

  it('uses default ability name "Mass Fear" when no name provided', async () => {
    damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary([]));

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13 }, makePlayerStats(), mapName,
    );

    expect(result.payload.name).toBe('Mass Fear');
  });

  it('uses custom ability name when provided', async () => {
    damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary([]));

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, name: "Tasha's Hideous Laughter" }, makePlayerStats(), mapName,
    );

    expect(result.payload.name).toBe("Tasha's Hideous Laughter");
  });
});

describe('massFearHandler.resolveMassFear - target selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(13);
    // Return a resolved promise so the save loop completes immediately
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: true }) };
    });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  it('excludes the caster from targets', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    const calls = savePrompt.createSaveListener.mock.calls;
    const targetNames = calls.map(c => c[1].targetName);
    expect(targetNames).toContain('Goblin');
    expect(targetNames).not.toContain('TestCaster');
  });

  it('includes the primary target even without range check', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockResolvedValue(false);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    const calls = savePrompt.createSaveListener.mock.calls;
    const targetNames = calls.map(c => c[1].targetName);
    expect(targetNames).toContain('Goblin');
  });

  it('includes creatures in range of primary target', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
      { name: 'Skeleton', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockImplementation(async (from, to) => {
      if (from === 'Goblin' && to === 'Orc') return true;
      if (from === 'Goblin' && to === 'Skeleton') return false;
      return true;
    });

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    const calls = savePrompt.createSaveListener.mock.calls;
    const targetNames = calls.map(c => c[1].targetName);
    expect(targetNames).toContain('Goblin');
    expect(targetNames).toContain('Orc');
    expect(targetNames).not.toContain('Skeleton');
  });

  it('includes all non-caster creatures when no primary target', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', null,
      { saveDc: 13, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    const calls = savePrompt.createSaveListener.mock.calls;
    const targetNames = calls.map(c => c[1].targetName);
    expect(targetNames).toContain('Goblin');
    expect(targetNames).toContain('Orc');
    expect(targetNames).not.toContain('TestCaster');
  });

  it('includes all non-caster creatures when primary target not found in combat', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'NonExistent',
      { saveDc: 13, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    const calls = savePrompt.createSaveListener.mock.calls;
    const targetNames = calls.map(c => c[1].targetName);
    expect(targetNames).toContain('Goblin');
    expect(targetNames).toContain('Orc');
    expect(targetNames).not.toContain('TestCaster');
  });

  it('returns popup when only the caster exists (no targets)', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    // With only the caster, targets = [] (caster excluded)
    const result = await resolveMassFear(
      campaignName, 'TestCaster', null,
      { saveDc: 13, saveType: 'WIS' }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.type).toBe('automation_info');
    expect(result.payload.description).toBe('No targets in range.');
  });

  it('includes primary target even when other creatures are out of range', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockResolvedValue(false);
    // Override the beforeEach mock so saves fail
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: false }) };
    });

    // Primary target Goblin is always included, Orc is out of range
    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, saveType: 'WIS', range: '5_ft' }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    // Only Goblin is affected (primary target), Orc is out of range
    expect(result.payload.description).toContain('1 creature(s) affected');
    expect(result.payload.description).toContain('Goblin');
  });

  it('parses range from string format "20_ft"', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    const mockFn = vi.fn().mockResolvedValue(true);
    rangeCheck.isWithinRange.mockImplementation(mockFn);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, saveType: 'WIS', range: '30_ft' }, makePlayerStats(), mapName,
    );

    expect(mockFn).toHaveBeenCalledWith('Goblin', 'Orc', 30);
  });

  it('defaults range to 10 when not specified', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    const mockFn = vi.fn().mockResolvedValue(true);
    rangeCheck.isWithinRange.mockImplementation(mockFn);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, saveType: 'WIS' }, makePlayerStats(), mapName,
    );

    expect(mockFn).toHaveBeenCalledWith('Goblin', 'Orc', 10);
  });
});

describe('massFearHandler.resolveMassFear - save prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(14);
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: true }) };
    });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  it('creates save listeners for each target', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockResolvedValue(true);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(2);
    expect(savePrompt.createSaveListener).toHaveBeenNthCalledWith(1, campaignName, {
      targetName: 'Goblin', saveType: 'WIS', saveDc: 14, dcSuccess: 'none', condition: 'frightened',
    });
    expect(savePrompt.createSaveListener).toHaveBeenNthCalledWith(2, campaignName, {
      targetName: 'Orc', saveType: 'WIS', saveDc: 14, dcSuccess: 'none', condition: 'frightened',
    });
  });

  it('uses custom saveType from option', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'CON', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Goblin', saveType: 'CON', saveDc: 14, dcSuccess: 'none', condition: 'frightened',
    });
  });

  it('defaults saveType to WIS when not specified', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Goblin', saveType: 'WIS', saveDc: 14, dcSuccess: 'none', condition: 'frightened',
    });
  });

  it('uses custom condition from option', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', condition: 'charmed', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Goblin', saveType: 'WIS', saveDc: 14, dcSuccess: 'none', condition: 'charmed',
    });
  });

  it('defaults condition to frightened', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Goblin', saveType: 'WIS', saveDc: 14, dcSuccess: 'none', condition: 'frightened',
    });
  });

  it('logs ability_use for each target with promptId', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockResolvedValue(true);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    // 2 target log entries + 1 summary log entry = 3 total
    expect(logService.addEntry).toHaveBeenCalledTimes(3);
    expect(logService.addEntry).toHaveBeenNthCalledWith(1, campaignName, {
      type: 'ability_use',
      characterName: 'TestCaster',
      abilityName: 'Mass Fear',
      description: 'TestCaster uses Mass Fear! Goblin must make a WIS save (DC 14) or become Frightened.',
      promptId: 'mass-fear-prompt',
    });
    expect(logService.addEntry).toHaveBeenNthCalledWith(2, campaignName, {
      type: 'ability_use',
      characterName: 'TestCaster',
      abilityName: 'Mass Fear',
      description: 'TestCaster uses Mass Fear! Orc must make a WIS save (DC 14) or become Frightened.',
      promptId: 'mass-fear-prompt',
    });
  });

  it('uses custom ability name in log entry', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', name: "Tasha's Hideous Laughter", range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
      type: 'ability_use',
      characterName: 'TestCaster',
      abilityName: "Tasha's Hideous Laughter",
      description: 'TestCaster uses Mass Fear! Goblin must make a WIS save (DC 14) or become Frightened.',
      promptId: 'mass-fear-prompt',
    });
  });
});

describe('massFearHandler.resolveMassFear - save results (failed saves)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(14);
    // Default: all saves fail
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: false }) };
    });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  it('applies frightened condition when save fails', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Goblin', 'activeConditions', ['frightened'], campaignName,
    );
  });

  it('appends condition to existing activeConditions', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    runtimeState.getRuntimeValue.mockReturnValueOnce(['prone', 'blinded']);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Goblin', 'activeConditions', ['prone', 'blinded', 'frightened'], campaignName,
    );
  });

  it('removes duplicate condition if already present', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    runtimeState.getRuntimeValue.mockReturnValueOnce(['frightened', 'blinded']);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Goblin', 'activeConditions', ['blinded', 'frightened'], campaignName,
    );
  });

  it('adds expiration on failed save', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(expirations.addExpiration).toHaveBeenCalledWith(
      'TestCaster', 'Goblin',
      [{ type: 'condition', condition: 'frightened' }],
      campaignName,
    );
  });

  it('handles mixed results using per-call mocks', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
      { name: 'Skeleton', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockResolvedValue(true);
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);

    let callIndex = 0;
    const results = [false, true, false]; // Goblin fails, Orc succeeds, Skeleton fails

    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      const idx = callIndex++;
      return {
        promptId: `prompt-${idx}`,
        promise: Promise.resolve({ success: results[idx] }),
      };
    });

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    // Goblin and Skeleton should have frightened condition
    const goblinCalls = runtimeState.setRuntimeValue.mock.calls.filter(
      call => call[0] === 'Goblin' && call[1] === 'activeConditions',
    );
    expect(goblinCalls.length).toBe(1);
    expect(goblinCalls[0][2]).toContain('frightened');

    const orcCalls = runtimeState.setRuntimeValue.mock.calls.filter(
      call => call[0] === 'Orc' && call[1] === 'activeConditions',
    );
    expect(orcCalls.length).toBe(0);

    const skeletonCalls = runtimeState.setRuntimeValue.mock.calls.filter(
      call => call[0] === 'Skeleton' && call[1] === 'activeConditions',
    );
    expect(skeletonCalls.length).toBe(1);
    expect(skeletonCalls[0][2]).toContain('frightened');
  });
});

describe('massFearHandler.resolveMassFear - popup summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(14);
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: false }) };
    });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  it('returns popup with summary when creatures are affected', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.type).toBe('automation_info');
    expect(result.payload.description).toContain('1 creature(s) affected');
    expect(result.payload.description).toContain('Goblin');
  });

  it('returns popup with summary when some creatures save', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    rangeCheck.isWithinRange.mockResolvedValue(true);
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);

    let callIndex = 0;
    const results = [false, true];

    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      const idx = callIndex++;
      return {
        promptId: `prompt-${idx}`,
        promise: Promise.resolve({ success: results[idx] }),
      };
    });

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('1 creature(s) affected');
  });

  it('returns popup with "No creatures affected" when all save', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: true }) };
    });

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(result.payload.description).toContain('No creatures affected');
  });

  it('logs final summary as ability_use entry', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    const summaryCalls = logService.addEntry.mock.calls.filter(
      call => call[1]?.type === 'ability_use' && call[1]?.description?.includes('creature(s)'),
    );
    expect(summaryCalls.length).toBeGreaterThan(0);
  });

  it('returns popup payload with automation_info type', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    const result = await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.type).toBe('automation_info');
    expect(result.payload.name).toBe('Mass Fear');
  });
});

describe('massFearHandler.resolveMassFear - option defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(13);
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: true }) };
    });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  it('uses option.saveAbility when saveDc is "ability"', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 'ability', saveAbility: 'CON', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.buildSaveDc).toHaveBeenCalledWith(
      expect.objectContaining({ saveDc: 'ability', saveAbility: 'CON' }),
      expect.any(Object),
    );
  });

  it('defaults saveAbility to WIS when saveDc is "ability"', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 'ability', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.buildSaveDc).toHaveBeenCalledWith(
      expect.objectContaining({ saveDc: 'ability', saveAbility: 'WIS' }),
      expect.any(Object),
    );
  });

  it('defaults saveAbility to WIS in auto object when saveDc is "ability"', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 'ability' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.buildSaveDc).toHaveBeenCalledWith(
      expect.objectContaining({ saveAbility: 'WIS' }),
      expect.any(Object),
    );
  });

  it('uses option.saveAbility as default in auto object', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveAbility: 'CON' }, makePlayerStats(), mapName,
    );

    expect(savePrompt.buildSaveDc).toHaveBeenCalledWith(
      expect.objectContaining({ saveAbility: 'CON' }),
      expect.any(Object),
    );
  });

  it('capitalizes condition label in log description', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', condition: 'charmed', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
      type: 'ability_use',
      characterName: 'TestCaster',
      abilityName: 'Mass Fear',
      description: expect.stringContaining('Charmed'),
      promptId: 'mass-fear-prompt',
    });
  });

  it('uses default condition label "Frightened"', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 14, saveType: 'WIS', range: '20_ft' }, makePlayerStats(), mapName,
    );

    expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
      type: 'ability_use',
      characterName: 'TestCaster',
      abilityName: 'Mass Fear',
      description: expect.stringContaining('Frightened'),
      promptId: 'mass-fear-prompt',
    });
  });
});

describe('massFearHandler.resolveMassFear - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePrompt.buildSaveDc.mockReturnValue(13);
    savePrompt.createSaveListener.mockImplementation((_camp, _cfg) => {
      return { promptId: 'mass-fear-prompt', promise: Promise.resolve({ success: true }) };
    });
    runtimeState.getRuntimeValue.mockReturnValue(undefined);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    logService.addEntry.mockResolvedValue({});
    expirations.addExpiration.mockReturnValue(undefined);
  });

  it('handles empty string range by falling back to default 10', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    const mockFn = vi.fn().mockResolvedValue(true);
    rangeCheck.isWithinRange.mockImplementation(mockFn);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13, range: '' }, makePlayerStats(), mapName,
    );

    // '' || '10_ft' → '10_ft' → parseInt('10', 10) = 10
    expect(mockFn).toHaveBeenCalledWith('Goblin', 'Orc', 10);
  });

  it('handles option with no saveDc property', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      {}, makePlayerStats(), mapName,
    );

    expect(savePrompt.buildSaveDc).toHaveBeenCalled();
  });

  it('handles option with no range property', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
      { name: 'Goblin', type: 'monster' },
      { name: 'Orc', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);
    const mockFn = vi.fn().mockResolvedValue(true);
    rangeCheck.isWithinRange.mockImplementation(mockFn);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13 }, makePlayerStats(), mapName,
    );

    expect(mockFn).toHaveBeenCalledWith('Goblin', 'Orc', 10);
  });

  it('handles single creature (just the caster)', async () => {
    const cs = makeCombatSummary([
      { name: 'TestCaster', type: 'player' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    const result = await resolveMassFear(
      campaignName, 'TestCaster', null,
      { saveDc: 13 }, makePlayerStats(), mapName,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toBe('No targets in range.');
  });

  it('handles single creature (just the primary target)', async () => {
    const cs = makeCombatSummary([
      { name: 'Goblin', type: 'monster' },
    ]);
    damageUtils.getCombatContext.mockResolvedValue(cs);

    await resolveMassFear(
      campaignName, 'TestCaster', 'Goblin',
      { saveDc: 13 }, makePlayerStats(), mapName,
    );

    expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Goblin', saveType: 'WIS', saveDc: 13, dcSuccess: 'none', condition: 'frightened',
    });
  });
});

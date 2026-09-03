// SP-045 regression: Fear cone saves must resolve the caster's spell save DC
// (data automation saveDc 'spell_save_dc' -> buildSaveDc -> DC 17), never the
// DC-10 fallback (CLA-277 / SP-082 / SP-042 Eyebite sentinel precedent).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../common/savePrompt.js', async () => {
  const actual = await vi.importActual('../../common/savePrompt.js');
  return {
    ...actual,
    createSaveListener: vi.fn(() => ({
      promptId: 'fear-prompt',
      promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
    })),
  };
});

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => []),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
  breakConcentration: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => ({
  default: { set: vi.fn(() => Promise.resolve()) },
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './fearHandler.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { createSaveListener } from '../../common/savePrompt.js';
import { storeSpellLastAttack } from '../../common/damageRollback.js';
import { setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';
const casterName = 'DivinationWizard';

function makePlayerStats() {
  return {
    name: casterName,
    level: 20,
    proficiency: 6,
    abilities: [{ name: 'Intelligence', bonus: 3 }],
    spellAbilities: { saveDc: 17, modifier: 3 },
  };
}

function makeCombatContext() {
  return {
    creatures: [
      { name: 'Thug 1', type: 'npc', currentHp: 32, maxHp: 32 },
      { name: casterName },
    ],
    players: [{ name: casterName }],
    placedItems: [],
  };
}

function readFearAutomation(dataFile) {
  const spells = JSON.parse(readFileSync(resolve(process.cwd(), dataFile), 'utf8'));
  return spells.find((s) => s.name === 'Fear')?.automation;
}

// ── Tests ──────────────────────────────────────────────────────

describe('SP-045 Fear save DC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  it.each([
    'public/data/2024/spells.json',
    'public/data/spells.json',
  ])('automation in %s declares saveDc "spell_save_dc" for Fear', (dataFile) => {
    const automation = readFearAutomation(dataFile);
    expect(automation).toBeDefined();
    expect(automation.type).toBe('fear');
    expect(automation.saveDc).toBe('spell_save_dc');
  });

  it('resolves every prompt, lastAttack, concentration and te DC to the caster spell save DC (17)', async () => {
    getCombatContext.mockResolvedValue(makeCombatContext());
    const automation = readFearAutomation('public/data/2024/spells.json');

    await handle(
      { name: 'Fear', automation },
      makePlayerStats(),
      campaignName,
      null,
    );

    expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
      targetName: 'Thug 1',
      saveType: 'WIS',
      saveDc: 17,
    }));
    expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, expect.objectContaining({
      saveDc: 17,
    }));
    expect(addConcentration).toHaveBeenCalledWith(expect.any(Object), casterName, 'Fear', 17);

    const effectCalls = setRuntimeValue.mock.calls.filter(c => c[1] === 'targetEffects');
    expect(effectCalls.length).toBeGreaterThan(0);
    const te = effectCalls[effectCalls.length - 1][2]
      .find(e => e.target === 'Thug 1' && e.effect === 'fear_end_on_los');
    expect(te).toBeDefined();
    expect(te.dc).toBe(17);

    const fallbackErrors = console.error.mock.calls.filter(c => String(c[0]).includes('[buildSaveDc]'));
    expect(fallbackErrors.length).toBe(0);
  });

  it('control: automation without saveDc still falls back to DC 10 with console error (why the data fix matters)', async () => {
    getCombatContext.mockResolvedValue(makeCombatContext());

    await handle(
      { name: 'Fear', automation: { type: 'fear', saveType: 'WIS' } },
      makePlayerStats(),
      campaignName,
      null,
    );

    expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
      saveDc: 10,
    }));
    const fallbackErrors = console.error.mock.calls.filter(c => String(c[0]).includes('[buildSaveDc]'));
    expect(fallbackErrors.length).toBe(1);
  });

  it('logs the resolved DC in the per-target ability_use cast entry', async () => {
    getCombatContext.mockResolvedValue(makeCombatContext());
    const automation = readFearAutomation('public/data/2024/spells.json');
    const { addEntry } = await import('../../../ui/logService.js');

    await handle(
      { name: 'Fear', automation },
      makePlayerStats(),
      campaignName,
      null,
    );

    const abilityEntry = addEntry.mock.calls.find(c => c[1].type === 'ability_use');
    expect(abilityEntry[1].description).toContain('DC 17');
  });
});

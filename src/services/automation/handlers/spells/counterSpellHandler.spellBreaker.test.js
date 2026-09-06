// CLA-322: Spell Breaker Counterspell hygiene — refund keyed by actual cast
// slot level, refund logged naming Spell Breaker, reaction-spent round latch.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(() => 17),
  createSaveListener: vi.fn(() => ({ promptId: 'prompt-1' })),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
  getRuntimeValue: vi.fn(),
}));

vi.mock('../../common/damageRollback.js', () => ({
  findLastAttack: vi.fn(),
  rollbackSpellEffects: vi.fn(),
}));

import { handle } from './counterSpellHandler.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { createSaveListener } from '../../common/savePrompt.js';
import { addEntry } from '../../../ui/logService.js';
import { findLastAttack, rollbackSpellEffects } from '../../common/damageRollback.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';

const SPELL_BREAKER = {
  type: 'spell_breaker',
  name: 'Spell Breaker',
  slotRetentionSpells: ['Counterspell', 'Dispel Magic'],
};

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 20,
    proficiency: 6,
    abilities: [{ name: 'Intelligence', bonus: 3 }],
    automation: { passives: [SPELL_BREAKER] },
    ...overrides,
  };
}

function makeAction(overrides = {}) {
  return {
    name: 'Counterspell',
    automation: { type: 'reaction_counterspell', saveType: 'CON' },
    spell: { name: 'Counterspell', level: 3 },
    ...overrides,
  };
}

function armHappyPath(overrides = {}) {
  getCombatContext.mockResolvedValue({
    round: overrides.round ?? 1,
    creatures: [
      { name: 'Gazer 1', type: 'monster', currentHp: 7, maxHp: 7 },
      { name: 'TestCaster' },
    ],
  });
  rollbackSpellEffects.mockResolvedValue({ logDescription: null });
  findLastAttack.mockResolvedValue({
    attackEvent: { attackerName: 'Gazer 1', attackName: '3. Frost Ray', saveType: 'Dexterity' },
  });
  getRuntimeValue.mockImplementation((name, key) => {
    if (key === '_Counterspell_usedRound') return overrides.usedRound ?? null;
    if (key && key.startsWith('spell_slots_level_')) return overrides.slots ?? 2;
    return null;
  });
}

function resolveSave(success) {
  window.dispatchEvent(new CustomEvent('save-result', {
    detail: { promptId: createSaveListener.mock.results.at(-1).value.promptId, success },
  }));
}

describe('counterSpellHandler — Spell Breaker refund + latch (CLA-322)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSaveListener.mockImplementation(() => ({ promptId: `prompt-${Math.random().toString(36).slice(2)}` }));
  });

  it('refunds at the actual cast slot level and logs Spell Breaker when the save succeeds', async () => {
    armHappyPath({ slots: 2 });
    setRuntimeValue.mockResolvedValue(undefined);

    const action = makeAction({ spell: { name: 'Counterspell', level: 5 } });
    await handle(action, makePlayerStats(), campaignName, null);
    resolveSave(true);
    await new Promise(r => setTimeout(r, 0));

    expect(setRuntimeValue).toHaveBeenCalledWith('TestCaster', 'spell_slots_level_5', 3, campaignName);

    const refundLog = addEntry.mock.calls.map(c => c[1]).find(d => d.abilityName === 'Spell Breaker');
    expect(refundLog).toBeDefined();
    expect(refundLog.type).toBe('ability_use');
    expect(refundLog.description).toContain('level 5');
    expect(refundLog.description).toContain('Frost Ray');
  });

  it('refunds base level 3 when no upcast info is present', async () => {
    armHappyPath({ slots: 1 });

    await handle(makeAction(), makePlayerStats(), campaignName, null);
    resolveSave(true);
    await new Promise(r => setTimeout(r, 0));

    expect(setRuntimeValue).toHaveBeenCalledWith('TestCaster', 'spell_slots_level_3', 2, campaignName);
  });

  it('does not refund when the attacker fails the save (counterspell succeeded)', async () => {
    armHappyPath();

    await handle(makeAction(), makePlayerStats(), campaignName, null);
    resolveSave(false);
    await new Promise(r => setTimeout(r, 0));

    const slotWrite = setRuntimeValue.mock.calls.find(c => String(c[1]).startsWith('spell_slots_level_'));
    expect(slotWrite).toBeUndefined();
    const refundLog = addEntry.mock.calls.map(c => c[1]).find(d => d.abilityName === 'Spell Breaker');
    expect(refundLog).toBeUndefined();
  });

  it('refuses a second trigger in the same round (reaction-spent latch) and returns the paid slot', async () => {
    armHappyPath({ usedRound: 1 });

    const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Reaction already used this round');
    expect(result.payload.description).toContain('level 3 returned');
    expect(createSaveListener).not.toHaveBeenCalled();
    expect(setRuntimeValue).toHaveBeenCalledWith('TestCaster', 'spell_slots_level_3', 3, campaignName);
  });

  it('does not return a slot for a refused free cast', async () => {
    armHappyPath({ usedRound: 1 });

    const action = makeAction({ spell: { name: 'Counterspell', level: 3, freeCastAuthorized: true } });
    await handle(action, makePlayerStats(), campaignName, null);

    const slotWrite = setRuntimeValue.mock.calls.find(c => String(c[1]).startsWith('spell_slots_level_'));
    expect(slotWrite).toBeUndefined();
  });

  it('stamps the reaction-spent latch when triggered in a fresh round', async () => {
    armHappyPath({ usedRound: null, round: 4 });

    await handle(makeAction(), makePlayerStats(), campaignName, null);

    expect(setRuntimeValue).toHaveBeenCalledWith('TestCaster', '_Counterspell_usedRound', 4, campaignName);
    expect(createSaveListener).toHaveBeenCalled();
  });

  it('does not refund without the Spell Breaker passive (5e regression gate)', async () => {
    armHappyPath();
    const ps = makePlayerStats({ automation: { passives: [] } });

    await handle(makeAction(), ps, campaignName, null);
    resolveSave(true);
    await new Promise(r => setTimeout(r, 0));

    const slotWrite = setRuntimeValue.mock.calls.find(c => String(c[1]).startsWith('spell_slots_level_'));
    expect(slotWrite).toBeUndefined();
  });
});

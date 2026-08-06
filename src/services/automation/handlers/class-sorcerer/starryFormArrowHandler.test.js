// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './starryFormArrowHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { buildStarryFormLuminousArrow } from '../../../rules/core/starryFormDamage.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/core/starryFormDamage.js', () => ({
  buildStarryFormLuminousArrow: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestDruid',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Wisdom', bonus: 3 }],
    ...overrides,
  };
}

const action = {
  name: 'Starry Form: Luminous Arrow',
  automation: { type: 'starry_form_arrow' },
};

describe('starryFormArrowHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildStarryFormLuminousArrow.mockReturnValue({
      name: 'Starry Form: Luminous Arrow',
      toHit: 8,
      damage: { damage_dice: '2d8', damage_type: 'Radiant' },
    });
    getCombatSummary.mockReturnValue({ creatures: [], turnOrder: [] });
  });

  it('should return an attack_roll when Archer constellation is active in the runtime store', async () => {
    getRuntimeValue.mockImplementation((caster, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', effect: 'starry_form', constellation: 'Archer' }];
      if (key === 'lastAttack') return { targetName: 'Orc1' };
      return null;
    });

    const result = await handle(action, makePlayerStats(), campaignName);

    expect(buildStarryFormLuminousArrow).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TestDruid' }),
      expect.arrayContaining([expect.objectContaining({ constellation: 'Archer' })]),
    );
    expect(result.type).toBe('attack_roll');
    expect(result.payload.targetName).toBe('Orc1');
    expect(addEntry).toHaveBeenCalled();
  });

  it('should return a popup when the Archer constellation is not active', async () => {
    getRuntimeValue.mockImplementation((caster, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', effect: 'starry_form', constellation: 'Chalice' }];
      return null;
    });

    const result = await handle(action, makePlayerStats(), campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Archer');
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('should use the current turn actor target when available', async () => {
    getRuntimeValue.mockImplementation((caster, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', effect: 'starry_form', constellation: 'Archer' }];
      return null;
    });
    getCombatSummary.mockReturnValue({
      creatures: [{ name: 'TestDruid' }, { name: 'Orc1' }],
      turnOrder: [{ name: 'TestDruid', targetName: 'Orc1' }],
    });

    const result = await handle(action, makePlayerStats(), campaignName);

    expect(result.payload.targetName).toBe('Orc1');
  });
});

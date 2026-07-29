// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(() => Promise.resolve()),
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

vi.mock('../../common/targetResolver.js', () => ({
  resolveTarget: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  rollSaveForCreature: vi.fn(),
}));

vi.mock('../../../combat/conditions/savePromptService.js', () => ({
  sendSaveResult: vi.fn(),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 10),
}));

import { handle } from './dominatePersonHandler.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Dominate Person',
    automation: { type: 'dominate_person', saveType: 'WIS', saveDc: 15, ...automation },
  };
}

function setupBaseMocks(saveResult = { success: true }, isNpc = false) {
  resolveTarget.mockResolvedValue({
    target: { name: 'Goblin', type: isNpc ? 'npc' : 'player' },
    cs: {
      creatures: [
        { name: 'Goblin', type: isNpc ? 'npc' : 'player', saveBonuses: { WIS: 2 } },
      ],
    },
  });
  buildSaveDc.mockReturnValue(15);
  createSaveListener.mockReturnValue({
    promptId: 'test-prompt-id',
    promise: Promise.resolve(saveResult),
  });
}

describe('dominatePersonHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('target resolution', () => {
    it('returns popup when no target is selected', async () => {
      resolveTarget.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No target selected');
    });

    it('passes advantage from automation config to createSaveListener', async () => {
      setupBaseMocks();

      await handle(makeAction({ advantage: true }), makePlayerStats(), campaignName, null);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        attackerName: 'TestCaster',
        saveType: 'WIS',
        saveDc: 15,
        dcSuccess: 'none',
        advantage: true,
        disadvantage: false,
        condition: 'charmed',
      });
    });
  });

  describe('successful save', () => {
    it('returns popup and logs save_result with success=true', async () => {
      setupBaseMocks({ success: true });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('succeeded on WIS save');
      expect(result.payload.description).toContain('Goblin');
      expect(result.payload.description).toContain('DC 15');

      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'save_result',
        targetName: 'Goblin',
        success: true,
        rollType: 'save-dominate-person',
        saveDc: 15,
        saveType: 'WIS',
      }));

      expect(addExpiration).not.toHaveBeenCalled();
    });
  });

  describe('failed save', () => {
    it('applies charmed condition and registers dominated expiration', async () => {
      setupBaseMocks({ success: false });
      getRuntimeValue.mockReturnValue([]);

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['charmed']),
        campaignName,
      );

      expect(addExpiration).toHaveBeenCalledWith(
        'TestCaster',
        'Goblin',
        expect.arrayContaining([{ type: 'dominated', condition: 'charmed' }]),
        campaignName,
      );

      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'save_result',
        targetName: 'Goblin',
        success: false,
        rollType: 'save-dominate-person',
        saveDc: 15,
        saveType: 'WIS',
      }));

      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'condition',
        action: 'applied',
        characterName: 'Goblin',
        condition: 'Charmed',
        reason: 'Dominate Person spell',
      }));
    });

    it('deduplicates charmed when already present', async () => {
      setupBaseMocks({ success: false });
      getRuntimeValue.mockReturnValue(['charmed']);

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        ['charmed'],
        campaignName,
      );
    });
  });

  describe('edge cases', () => {
    it('handles missing automation property by defaulting to empty object', async () => {
      resolveTarget.mockResolvedValue({ target: { name: 'Goblin', type: 'player' } });
      buildSaveDc.mockReturnValue(10);
      createSaveListener.mockReturnValue({
        promptId: 'test-prompt-id',
        promise: Promise.resolve({ success: false }),
      });
      getRuntimeValue.mockReturnValue([]);

      const result = await handle({ name: 'Dominate Person' }, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(buildSaveDc).toHaveBeenCalledWith({}, makePlayerStats());
    });
  });
});

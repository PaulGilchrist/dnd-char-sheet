// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

vi.mock('../../common/targetResolver.js', () => ({
  resolveTarget: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './telekineticShoveHandler.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as targetResolver from '../../common/targetResolver.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestMonk',
    level: 5,
    proficiency: 3,
    abilities: [{ name: 'Wisdom', bonus: 2 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Telekinetic Shove',
    automation: {
      type: 'telekinetic_shove',
      saveType: 'STR',
      pushDistance: 5,
      ...automation,
    },
  };
}

function mockCreateSaveListener(promptId, saveResult) {
  savePrompt.createSaveListener.mockReturnValue({
    promptId,
    promise: Promise.resolve(saveResult || { success: false, promptId }),
  });
}

// ── Tests ──────────────────────────────────────────────────────

describe('telekineticShoveHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns popup with automation_info type and failure result', async () => {
    const action = makeAction();
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
    savePrompt.buildSaveDc.mockReturnValue(13);
    mockCreateSaveListener('test-prompt-1', { success: false, promptId: 'test-prompt-1' });

    const result = await handle(action, ps, campaignName, null);

    expect(result).toEqual({
      type: 'popup',
      payload: expect.objectContaining({
        type: 'automation_info',
        name: 'Telekinetic Shove',
        targetName: 'Goblin',
        automation: action.automation,
      }),
    });
    expect(result.payload.description).toContain('failed');
    expect(result.payload.description).toContain('Pushed 5 feet');
  });

  it('returns popup with success message when save succeeds', async () => {
    const action = makeAction();
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
    savePrompt.buildSaveDc.mockReturnValue(13);
    mockCreateSaveListener('success-prompt', { success: true, promptId: 'success-prompt' });

    const result = await handle(action, ps, campaignName, null);

    expect(result.payload.description).toContain('succeeded');
    expect(result.payload.description).toContain('No effect');
  });

  it('resolves target and creates save listener', async () => {
    const action = makeAction();
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
    savePrompt.buildSaveDc.mockReturnValue(13);
    mockCreateSaveListener('test-prompt-1', { success: false, promptId: 'test-prompt-1' });

    await handle(action, ps, campaignName, null);

    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Goblin',
      saveType: 'STR',
      saveDc: 13,
    });
  });

  it('falls back to player name when no target resolved', async () => {
    const action = makeAction();
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue(null);
    savePrompt.buildSaveDc.mockReturnValue(13);
    mockCreateSaveListener('test-prompt-2', { success: false, promptId: 'test-prompt-2' });

    await handle(action, ps, campaignName, null);

    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'TestMonk',
      saveType: 'STR',
      saveDc: 13,
    });
  });

  it('uses custom pushDistance and saveType from automation', async () => {
    const action = makeAction({ pushDistance: 10, saveType: 'CON' });
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Orc' } });
    savePrompt.buildSaveDc.mockReturnValue(14);
    mockCreateSaveListener('test-prompt-3', { success: false, promptId: 'test-prompt-3' });

    const result = await handle(action, ps, campaignName, null);

    expect(result.payload.description).toContain('10 feet');
    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Orc',
      saveType: 'CON',
      saveDc: 14,
    });
  });

  it('defaults pushDistance and saveType when falsy', async () => {
    const action = makeAction({ pushDistance: null, saveType: undefined });
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Orc' } });
    savePrompt.buildSaveDc.mockReturnValue(14);
    mockCreateSaveListener('test-prompt-4', { success: false, promptId: 'test-prompt-4' });

    const result = await handle(action, ps, campaignName, null);

    expect(result.payload.description).toContain('5 feet');
    expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
      targetName: 'Orc',
      saveType: 'STR',
      saveDc: 14,
    });
  });

  it('adds ability_use log entry with promptId', async () => {
    const action = makeAction();
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Bugbear' } });
    savePrompt.buildSaveDc.mockReturnValue(15);
    mockCreateSaveListener('test-prompt-6', { success: false, promptId: 'test-prompt-6' });

    await handle(action, ps, campaignName, null);

    expect(logService.addEntry).toHaveBeenCalledWith(
      campaignName,
      expect.objectContaining({
        type: 'ability_use',
        characterName: 'TestMonk',
        abilityName: 'Telekinetic Shove',
        promptId: 'test-prompt-6',
      }),
    );
  });

  it('includes push distance and save type in ability_use description', async () => {
    const action = makeAction({ pushDistance: 10, saveType: 'CON' });
    const ps = makePlayerStats();

    targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Bugbear' } });
    savePrompt.buildSaveDc.mockReturnValue(15);
    mockCreateSaveListener('test-prompt-6b', { success: false, promptId: 'test-prompt-6b' });

    await handle(action, ps, campaignName, null);

    expect(logService.addEntry).toHaveBeenCalledWith(
      campaignName,
      expect.objectContaining({
        type: 'ability_use',
        description: expect.stringContaining('10 feet'),
      }),
    );
  });

  describe('save result handling', () => {
    it('does not apply push effect on failed save', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      savePrompt.buildSaveDc.mockReturnValue(13);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      mockCreateSaveListener('save-fail-prompt', { success: false, promptId: 'save-fail-prompt' });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: 'Goblin',
            effect: 'push',
            value: 5,
            direction: 'toward_or_away',
            duration: 'immediate',
          }),
        ]),
        campaignName,
      );
    });

    it('logs push on failed save without applying targetEffect', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Orc' } });
      savePrompt.buildSaveDc.mockReturnValue(14);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      mockCreateSaveListener('save-fail-prompt-custom', { success: false, promptId: 'save-fail-prompt-custom' });

      await handle(makeAction({ pushDistance: 15 }), makePlayerStats(), campaignName, null);

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.anything(),
        campaignName,
      );
    });

    it('logs save_result on failed save', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Orc' } });
      savePrompt.buildSaveDc.mockReturnValue(14);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      mockCreateSaveListener('save-fail-prompt-2', { success: false, promptId: 'save-fail-prompt-2' });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'save_result',
          targetName: 'Orc',
          success: false,
          saveType: 'STR',
        }),
      );
    });

    it('logs save_result on successful save', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Hobgoblin' } });
      savePrompt.buildSaveDc.mockReturnValue(15);
      mockCreateSaveListener('save-success-prompt', { success: true, promptId: 'save-success-prompt' });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'save_result',
          targetName: 'Hobgoblin',
          success: true,
        }),
      );
    });

    it('does not apply push effect on successful save', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      savePrompt.buildSaveDc.mockReturnValue(13);
      mockCreateSaveListener('save-success-prompt-2', { success: true, promptId: 'save-success-prompt-2' });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('shows correct popup message for failed save', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      savePrompt.buildSaveDc.mockReturnValue(17);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      mockCreateSaveListener('fail-popup-prompt', { success: false, promptId: 'fail-popup-prompt' });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Goblin');
      expect(result.payload.description).toContain('failed');
      expect(result.payload.description).toContain('STR');
      expect(result.payload.description).toContain('DC 17');
      expect(result.payload.description).toContain('Pushed 5 feet');
    });

    it('shows correct popup message for successful save', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      savePrompt.buildSaveDc.mockReturnValue(17);
      mockCreateSaveListener('success-popup-prompt', { success: true, promptId: 'success-popup-prompt' });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Goblin');
      expect(result.payload.description).toContain('succeeded');
      expect(result.payload.description).toContain('DC 17');
      expect(result.payload.description).toContain('No effect');
    });
  });

  describe('error handling', () => {
    it('does not reject when addEntry rejects', async () => {
      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      savePrompt.buildSaveDc.mockReturnValue(13);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'err-prompt',
        promise: Promise.resolve({ success: false, promptId: 'err-prompt' }),
      });
      logService.addEntry.mockRejectedValue(new Error('network'));

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result).toBeDefined();
      expect(result.type).toBe('popup');
    });
  });
});

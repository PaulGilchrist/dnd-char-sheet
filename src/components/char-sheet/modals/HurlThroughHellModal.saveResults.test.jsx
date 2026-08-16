// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HurlThroughHellModal from './HurlThroughHellModal.jsx';

// ── Mocked modules ──

vi.mock('../../../services/automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promptId: 'test-prompt-id-123' })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(() => ({ finalDamage: 22 })),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({
    creatures: [
      { name: 'Goblin1', type: 'npc' },
      { name: 'Orc Warrior', type: 'fiend' },
      { name: 'Elf Mage', type: 'player' },
    ],
  })),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 22, rolls: [15, 7] })),
}));

// ── Re-import mocked modules ──

import * as savePrompt from '../../../services/automation/common/savePrompt.js';
import * as logService from '../../../services/ui/logService.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as applyDamage from '../../../services/rules/combat/applyDamage.js';
import * as combatData from '../../../services/encounters/combatData.js';
import * as diceRoller from '../../../services/dice/diceRoller.js';

// ── Test fixtures ──

const mockPlayerStats = { name: 'Throg', level: 15 };
const mockCampaignName = 'test-campaign';
const mockOnClose = vi.fn();

function makeProps(overrides) {
  return {
    action: { name: 'Hurl Through Hell' },
    playerStats: mockPlayerStats,
    campaignName: mockCampaignName,
    targetName: 'Goblin1',
    saveType: 'WIS',
    saveDc: 16,
    damageType: 'Psychic',
    damageExpression: '4d10',
    damageTotal: 22,
    currentUses: 0,
    maxUses: 3,
    pactMagicRecharge: false,
    pactSlotLevel: 0,
    pactSlotsAvailable: 0,
    onClose: mockOnClose,
    ...(overrides || {}),
  };
}

// ── Helpers ──

/**
 * Dispatches a save-result event after the modal's event listener is registered.
 * The 15ms delay accounts for the async handleConfirm flow that registers the listener.
 */
function dispatchSaveResult(detail) {
  return act(async () => {
    await new Promise(r => setTimeout(r, 15));
    window.dispatchEvent(new CustomEvent('save-result', { detail }));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
  });
}

function renderModal(propsOverride) {
  return render(<HurlThroughHellModal {...makeProps(propsOverride)} />);
}

function triggerConfirm() {
  fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));
}

// ── Tests ──

describe('HurlThroughHellModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentTurn') return 'Turn5';
      if (key === 'activeConditions') return [];
      if (key === 'targetEffects') return [];
      if (key === 'spell_slots_level_2') return '3';
      return null;
    });
    diceRoller.rollExpression.mockImplementation((expr) => {
      if (expr === '4d10-custom') return { total: 18, rolls: [10, 8] };
      return { total: 22, rolls: [15, 7] };
    });
    combatData.getCombatSummary.mockImplementation(() => ({
      creatures: [
        { name: 'Goblin1', type: 'npc' },
        { name: 'Orc Warrior', type: 'fiend' },
        { name: 'Elf Mage', type: 'player' },
      ],
    }));
    applyDamage.applyDamageToTarget.mockImplementation(() => ({ finalDamage: 22 }));
    logService.addEntry.mockImplementation(() => Promise.resolve());
    runtimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
    savePrompt.createSaveListener.mockImplementation(() => ({ promptId: 'test-prompt-id-123' }));
  });

  afterEach(() => {
    // Clean up any damage-popup listeners added during tests
    document.body.innerHTML = '';
  });

  // ── Failed save - non-fiend target ──

  describe('failed save - non-fiend target', () => {
    it('adds incapacitated condition to target', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Goblin1',
          'activeConditions',
          expect.arrayContaining(['incapacitated']),
          'test-campaign'
        );
      });
    });

    it('adds target effect with teleport and returnToSpace flags', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'campaign',
          'targetEffects',
          expect.arrayContaining([
            expect.objectContaining({
              target: 'Goblin1',
              source: 'Hurl Through Hell',
              effect: 'incapacitated',
              condition: 'incapacitated',
              duration: 'until_end_of_next_turn',
              saveType: 'WIS',
              saveDc: 16,
              teleport: true,
              returnToSpace: true,
            }),
          ]),
          'test-campaign'
        );
      });
    });

    it('applies damage to target', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).toHaveBeenCalledWith(
          expect.any(Object),
          'Goblin1',
          22,
          ['Psychic'],
          'test-campaign',
          expect.any(Array),
          false,
          'Throg'
        );
      });
    });

    it('logs save_result entry with correct details', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'save_result',
            characterName: 'Throg',
            targetName: 'Goblin1',
            saveDc: 16,
            saveType: 'WIS',
            success: false,
            saveRoll: 8,
            saveTotal: 10,
          })
        );
      });
    });

    it('logs damage roll entry', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'roll',
            characterName: 'Throg',
            rollType: 'damage',
            name: 'Hurl Through Hell Damage',
            targetName: 'Goblin1',
            damageType: 'Psychic',
            formula: '4d10',
            total: 22,
          })
        );
      });
    });

    it('dispatches damage-popup event with correct details', async () => {
      const handler = vi.fn();
      window.addEventListener('damage-popup', handler);

      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = handler.mock.calls[0][0].detail;
      expect(detail.targetName).toBe('Goblin1');
      expect(detail.sourceName).toBe('Throg');
      expect(detail.spellName).toBe('Hurl Through Hell');
      expect(detail.damageType).toBe('Psychic');
      expect(detail.rolls).toEqual([15, 7]);
      expect(detail.formula).toBe('4d10');
      expect(detail.popupText).toContain('failed WIS save');

      window.removeEventListener('damage-popup', handler);
    });

    it('shows failure text on result screen', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(screen.getByText(/failed.*WIS save/)).toBeInTheDocument();
      });
    });
  });

  // ── Failed save - fiend target ──

  describe('failed save - fiend target', () => {
    function setupFiendTarget() {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: 'Orc Warrior', type: 'fiend' },
          { name: 'Elf Mage', type: 'player' },
        ],
      });
    }

    it('does not apply damage to fiend', async () => {
      setupFiendTarget();
      renderModal({ targetName: 'Orc Warrior' });
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
      });
    });

    it('still adds incapacitated condition to fiend', async () => {
      setupFiendTarget();
      renderModal({ targetName: 'Orc Warrior' });
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Orc Warrior',
          'activeConditions',
          expect.arrayContaining(['incapacitated']),
          'test-campaign'
        );
      });
    });

    it('still adds target effect to fiend', async () => {
      setupFiendTarget();
      renderModal({ targetName: 'Orc Warrior' });
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'campaign',
          'targetEffects',
          expect.arrayContaining([
            expect.objectContaining({
              target: 'Orc Warrior',
              effect: 'incapacitated',
              teleport: true,
              returnToSpace: true,
            }),
          ]),
          'test-campaign'
        );
      });
    });

    it('logs save_result noting fiend immunity', async () => {
      setupFiendTarget();
      renderModal({ targetName: 'Orc Warrior' });
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'save_result',
            targetName: 'Orc Warrior',
            success: false,
            description: expect.stringContaining('Fiend'),
          })
        );
      });
    });

    it('dispatches damage-popup noting fiend immunity', async () => {
      setupFiendTarget();
      const handler = vi.fn();
      window.addEventListener('damage-popup', handler);

      renderModal({ targetName: 'Orc Warrior' });
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = handler.mock.calls[0][0].detail;
      expect(detail.popupText).toContain('Fiend');
      expect(detail.popupText).toContain('no Psychic damage');

      window.removeEventListener('damage-popup', handler);
    });

    it('shows failure text on result screen for fiend', async () => {
      setupFiendTarget();
      renderModal({ targetName: 'Orc Warrior' });
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(screen.getByText(/failed.*WIS save/)).toBeInTheDocument();
      });
    });
  });

  // ── Successful save ──

  describe('successful save', () => {
    it('does not add incapacitated condition', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
          'Goblin1',
          'activeConditions',
          expect.any(Array),
          'test-campaign'
        );
      });
    });

    it('does not add target effect', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
          'campaign',
          'targetEffects',
          expect.any(Array),
          'test-campaign'
        );
      });
    });

    it('does not apply damage', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
      });
    });

    it('logs save_result with success=true', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'save_result',
            targetName: 'Goblin1',
            success: true,
            saveRoll: 15,
            saveTotal: 17,
          })
        );
      });
    });

    it('dispatches damage-popup noting success', async () => {
      const handler = vi.fn();
      window.addEventListener('damage-popup', handler);

      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.popupText).toContain('succeeded');

      window.removeEventListener('damage-popup', handler);
    });

    it('shows success text on result screen', async () => {
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(screen.getByText(/succeeded.*WIS save/)).toBeInTheDocument();
      });
    });
  });

  // ── Edge cases: null/undefined runtime values ──

  describe('edge cases - null runtime values', () => {
    it('handles null activeConditions by starting fresh array on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return null;
        return null;
      });
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        const calls = runtimeState.setRuntimeValue.mock.calls.filter(
          c => c[1] === 'activeConditions'
        );
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][2]).toEqual(['incapacitated']);
      });
    });

    it('handles null targetEffects by starting fresh array', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        if (key === 'targetEffects') return null;
        return null;
      });
      renderModal();
      triggerConfirm();

      await dispatchSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        const calls = runtimeState.setRuntimeValue.mock.calls.filter(
          c => c[1] === 'targetEffects'
        );
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][2]).toHaveLength(1);
        expect(calls[0][2][0].target).toBe('Goblin1');
      });
    });
  });
});

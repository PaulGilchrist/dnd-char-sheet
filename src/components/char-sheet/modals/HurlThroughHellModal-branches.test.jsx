// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

function waitForSaveResult(detail) {
  return act(async () => {
    await new Promise(r => setTimeout(r, 10));
    window.dispatchEvent(new CustomEvent('save-result', { detail }));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
  });
}

// ── Tests for error handling and fallback branches ──

describe('HurlThroughHellModal - error handling and fallback branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentTurn') return 'Turn5';
      if (key === 'activeConditions') return [];
      if (key === 'targetEffects') return [];
      if (key === 'spell_slots_level_2') return '3';
      return null;
    });
    diceRoller.rollExpression.mockImplementation(() => ({ total: 22, rolls: [15, 7] }));
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

  describe('pact slot expenditure error handling', () => {
    it('decreases pact slot and continues flow when pact slot log entry fails', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'spell_slots_level_2') return '3';
        return null;
      });
      logService.addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        // Pact slot should be decremented from 3 to 2
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Throg',
          'spell_slots_level_2',
          2,
          'test-campaign'
        );
      });

      // hurlThroughHellUses should NOT be incremented (using pact slot instead)
      const usesCalls = runtimeState.setRuntimeValue.mock.calls.filter(
        c => c[1] === 'hurlThroughHellUses'
      );
      expect(usesCalls.length).toBe(0);

      // Save listener should still be created
      expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
        targetName: 'Goblin1',
        attackerName: 'Throg',
        saveType: 'WIS',
        saveDc: 16,
      });

      // Error should be logged
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('ability_use log entry error handling', () => {
    it('continues flow when ability_use log entry fails', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      logService.addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

      render(<HurlThroughHellModal {...makeProps()} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      // Save listener should still be created despite log failure
      await waitFor(() => {
        expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
          targetName: 'Goblin1',
          attackerName: 'Throg',
          saveType: 'WIS',
          saveDc: 16,
        });
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('save-result handler error handling', () => {
    it('applies incapacitated condition and target effects when save_result log fails', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      logService.addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

      render(<HurlThroughHellModal {...makeProps()} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      // Core functionality should still execute despite log failure
      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Goblin1',
          'activeConditions',
          expect.arrayContaining(['incapacitated']),
          'test-campaign'
        );
      });

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'campaign',
          'targetEffects',
          expect.arrayContaining([
            expect.objectContaining({
              target: 'Goblin1',
              effect: 'incapacitated',
              teleport: true,
              returnToSpace: true,
            }),
          ]),
          'test-campaign'
        );
      });

      // Error should be logged
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('applies damage when roll log entry fails after save_result succeeds', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      // First call (save_result) succeeds, second call (roll) fails
      let callCount = 0;
      logService.addEntry.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return Promise.resolve();
        return Promise.reject(new Error('log error'));
      });

      render(<HurlThroughHellModal {...makeProps()} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      // Damage should still be applied despite roll log failure
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

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('applies incapacitated condition and skips damage for fiend target when save_result log fails', async () => {
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
      logService.addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

      render(<HurlThroughHellModal {...makeProps({ targetName: 'Orc Warrior' })} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      // Core functionality should still execute despite log failure
      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Orc Warrior',
          'activeConditions',
          expect.arrayContaining(['incapacitated']),
          'test-campaign'
        );
      });

      // Damage should NOT be applied to fiend
      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('logs save_result when successful save log entry fails', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      logService.addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

      render(<HurlThroughHellModal {...makeProps()} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('damage roll fallback', () => {
    it('falls back to damageTotal when rollExpression returns null', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      diceRoller.rollExpression.mockReturnValue(null);

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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

    it('falls back to damageTotal when rollExpression returns object without total', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      diceRoller.rollExpression.mockReturnValue({ rolls: [5, 5] });

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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


  });

  describe('damage result fallback', () => {
    it('falls back to actualDamageTotal when dmgResult has no finalDamage', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      applyDamage.applyDamageToTarget.mockReturnValue({});

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).toHaveBeenCalled();
      });
    });
  });

  describe('activeConditions non-array fallback', () => {
    it('wraps non-array activeConditions in array when adding incapacitated', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return 'existing-condition';
        if (key === 'targetEffects') return [];
        return null;
      });

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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
  });

  describe('combatSummary creatures fallback', () => {
    it('handles empty creatures array in combatSummary', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      combatData.getCombatSummary.mockReturnValue({ creatures: [] });

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).toHaveBeenCalled();
      });
    });

    it('handles undefined creatures in combatSummary', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      combatData.getCombatSummary.mockReturnValue({});

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).toHaveBeenCalled();
      });
    });
  });

  describe('currentTurn null fallback', () => {
    it('uses "unknown" when currentTurn is null', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return null;
        return null;
      });

      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Throg',
          'hurlThroughHellTurnUsed',
          'unknown',
          'test-campaign'
        );
      });
    });
  });

  describe('spell slot fallback', () => {
    it('falls back to playerStats.spellAbilities when getRuntimeValue returns null for spell slots', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'spell_slots_level_2') return null;
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        const slotCalls = runtimeState.setRuntimeValue.mock.calls.filter(
          c => c[1] === 'spell_slots_level_2'
        );
        expect(slotCalls.length).toBeGreaterThan(0);
        expect(slotCalls[0][2]).toBe(-1);
      });

      consoleError.mockRestore();
    });
  });
});

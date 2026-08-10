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

// ── Tests for uncovered branches ──

describe('HurlThroughHellModal - error handling branches', () => {
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

  describe('pact slot log entry error handling', () => {
    it('handles addEntry rejection for pact slot expenditure log', async () => {
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
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('ability_use log entry error handling', () => {
    it('handles addEntry rejection for ability_use log', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      logService.addEntry.mockImplementation(() => Promise.reject(new Error('log error')));

      render(<HurlThroughHellModal {...makeProps()} />);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('save-result handler error handling', () => {
    it('handles addEntry rejection for save_result log on failed save', async () => {
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

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('handles addEntry rejection for roll log on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      // First call succeeds (ability_use), subsequent calls reject
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

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('handles addEntry rejection for save_result log on fiend failed save', async () => {
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

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('handles addEntry rejection for save_result log on successful save', async () => {
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
        // When storedConds is not an array, the ternary creates ['incapacitated']
        const calls = runtimeState.setRuntimeValue.mock.calls.filter(
          c => c[1] === 'activeConditions'
        );
        expect(calls.length).toBeGreaterThan(0);
        // The ternary: Array.isArray(storedConds) ? [...storedConds, 'incapacitated'] : ['incapacitated']
        // Since 'existing-condition' is not an array, it should be ['incapacitated']
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
        // With no creatures, isFiend will be false, so damage is applied
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
        // With no creatures, isFiend will be false, so damage is applied
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

      // The code: getRuntimeValue(playerName, slotKey, campaignName) ?? playerStats.spellAbilities?.[slotKey] ?? 0
      // Since getRuntimeValue returns null, it falls back to playerStats.spellAbilities
      // But the props playerStats doesn't have spellAbilities, so it falls back to 0
      // Then setRuntimeValue is called with 0 - 1 = -1
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

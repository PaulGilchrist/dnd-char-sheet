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
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

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
    savePrompt.createSaveListener.mockImplementation(() => ({ promptId: 'test-prompt-id-123' }));
  });

  // ── Result screen ──

  describe('result screen', () => {
    it('calls onClose when Done is clicked', async () => {
      const onClose = vi.fn();
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({ onClose })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores save-result events with non-matching promptId', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      // Wait for the event listener to be registered, then dispatch with wrong promptId
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
        window.dispatchEvent(new CustomEvent('save-result', {
          detail: {
            promptId: 'wrong-prompt-id',
            roll: 15,
            total: 17,
            success: true,
          },
        }));
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));
      });

      // Result should not be set (screen should still show info state)
      expect(screen.queryByText(/succeeded.*WIS save/)).not.toBeInTheDocument();
    });

    it('shows pact slot level in note text', () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 4,
        pactSlotsAvailable: true,
      })} />);
      expect(screen.getByText(/level 4/)).toBeInTheDocument();
    });
  });
});

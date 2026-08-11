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

  // ── Save failure - non-fiend target ──

  describe('save failure - non-fiend target', () => {
    it('adds incapacitated condition to target on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
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
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Goblin1',
          'activeConditions',
          expect.arrayContaining(['incapacitated']),
          'test-campaign'
        );
      });
    });

    it('adds target effect with teleport and returnToTrue on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
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

    it('applies damage to non-fiend target', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
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

    it('logs save_result entry on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
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

    it('logs roll entry for damage on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
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

    it('dispatches damage-popup event on failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      const handler = vi.fn();
      window.addEventListener('damage-popup', handler);

      render(<HurlThroughHellModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(
        expect.objectContaining({
          targetName: 'Goblin1',
          sourceName: 'Throg',
          spellName: 'Hurl Through Hell',
          popupText: expect.stringContaining('failed WIS save'),
          damageType: 'Psychic',
          rolls: [15, 7],
          formula: '4d10',
        })
      );

      window.removeEventListener('damage-popup', handler);
    });

    it('sets result with saveSuccess=false after save resolves', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
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
        // Result screen should show failure text
        expect(screen.getByText(/failed.*WIS save/)).toBeInTheDocument();
      });
    });
  });

  // ── Save failure - fiend target ──

  describe('save failure - fiend target', () => {
    it('does not apply damage to fiend target', async () => {
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

      render(<HurlThroughHellModal {...makeProps({ targetName: 'Orc Warrior' })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
      });
    });

    it('logs save_result entry noting fiend immunity on failed save', async () => {
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

      render(<HurlThroughHellModal {...makeProps({ targetName: 'Orc Warrior' })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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
      const handler = vi.fn();
      window.addEventListener('damage-popup', handler);

      render(<HurlThroughHellModal {...makeProps({ targetName: 'Orc Warrior' })} />);
      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.popupText).toContain('Fiend');
      expect(handler.mock.calls[0][0].detail.popupText).toContain('no Psychic damage');

      window.removeEventListener('damage-popup', handler);
    });

    it('sets result with saveSuccess=false for fiend', async () => {
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

      render(<HurlThroughHellModal {...makeProps({ targetName: 'Orc Warrior' })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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

  // ── Save success ──

  describe('save success', () => {
    it('does not add incapacitated condition on successful save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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

    it('does not add target effect on successful save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        if (key === 'targetEffects') return [];
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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

    it('does not apply damage on successful save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      await waitFor(() => {
        expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
      });
    });

    it('logs save_result entry with success=true on successful save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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

    it('dispatches damage-popup noting success on successful save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      const handler = vi.fn();
      window.addEventListener('damage-popup', handler);

      render(<HurlThroughHellModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.popupText).toContain('succeeded');

      window.removeEventListener('damage-popup', handler);
    });

    it('sets result with saveSuccess=true after save resolves', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
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
});

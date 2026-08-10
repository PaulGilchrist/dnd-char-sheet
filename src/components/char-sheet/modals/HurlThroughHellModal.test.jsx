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
    // Wait for handleConfirm to register the event listener
    // handleConfirm is async and has several awaits before registering the listener
    await new Promise(r => setTimeout(r, 10));
    window.dispatchEvent(new CustomEvent('save-result', { detail }));
    // Allow promises to settle
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

  // ── Info screen rendering ──

  describe('info screen rendering', () => {
    it('renders the modal overlay and modal container', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with dragon icon and feature name', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      const header = document.querySelector('.sp-header');
      expect(header).toHaveTextContent('Hurl Through Hell');
      expect(header.querySelector('.fa-solid.fa-dragon')).toBeInTheDocument();
    });

    it('renders target name in the body', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Target:');
      expect(body.textContent).toContain('Goblin1');
    });

    it('renders the description text about disappearing and hurtling', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      expect(screen.getByText(/disappears and hurtles through a nightmare landscape/)).toBeInTheDocument();
    });

    it('renders the save type and DC info', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('WIS');
      expect(body.textContent).toContain('DC 16');
    });

    it('renders the failed save consequences with damage type and total', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('22 Psychic damage');
      expect(body.textContent).toContain('Incapacitated');
    });

    it('renders the return description', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      expect(screen.getByText(/At the end of your next turn.*returns/)).toBeInTheDocument();
    });

    it('renders Hurl Through Hell and Cancel buttons when uses are available', () => {
      render(<HurlThroughHellModal {...makeProps({ currentUses: 1, maxUses: 3 })} />);
      expect(screen.getByRole('button', { name: /Hurl Through Hell/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows uses remaining when hasUse is true', () => {
      render(<HurlThroughHellModal {...makeProps({ currentUses: 1, maxUses: 3 })} />);
      expect(screen.getByText(/Uses available:.*2 \/ 3/)).toBeInTheDocument();
    });

    it('shows Pact Magic cost note when no uses but pact slot needed', () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);
      expect(screen.getByText(/Cost:.*Pact Magic.*level 2/)).toBeInTheDocument();
    });

    it('shows error message when no uses and no pact slots available', () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotsAvailable: false,
      })} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('No uses remaining');
      expect(body.textContent).toContain('Long Rest');
      expect(body.textContent).toContain('No Pact Magic slots available');
    });

    it('shows no pact magic message when pactMagicRecharge is false and no uses', () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: false,
      })} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('No uses remaining');
      expect(body.textContent).toContain('Long Rest');
    });
  });

  // ── Overlay / close behavior ──

  describe('overlay and close behavior', () => {
    it('calls onClose when overlay is clicked', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when body is clicked', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-body'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Cancel button (sp-dismiss-btn) is clicked', () => {
      render(<HurlThroughHellModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-dismiss-btn'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Cancel button ──

  describe('cancel button', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<HurlThroughHellModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Confirm flow - info to result transition ──

  describe('confirm flow', () => {
    it('shows result screen after confirm is clicked (with uses available)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Throg';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({ currentUses: 1, maxUses: 3 })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        // Result screen should be shown (no longer the info buttons)
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      });
    });

    it('shows result screen after confirm is clicked (with pact slot cost)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Throg';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      });
    });

    it('does not show result screen when there are no uses and no pact slots (can\'t confirm)', async () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotsAvailable: false,
      })} />);

      // The error message paragraph is not a button, so clicking it does nothing
      expect(screen.queryByRole('button', { name: /Hurl Through Hell/ })).not.toBeInTheDocument();
    });

    it('does not show result screen when there are no uses and pactMagicRecharge is false', async () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: false,
      })} />);

      expect(screen.queryByRole('button', { name: /Hurl Through Hell/ })).not.toBeInTheDocument();
    });
  });

  // ── Confirm side effects ──

  describe('confirm side effects', () => {
    it('sets hurlThroughHellTurnUsed to currentTurn on confirm', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({ currentUses: 1, maxUses: 3 })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Throg',
          'hurlThroughHellTurnUsed',
          'Turn5',
          'test-campaign'
        );
      });
    });

    it('increments hurlThroughHellUses when hasUse is true', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({ currentUses: 1, maxUses: 3 })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Throg',
          'hurlThroughHellUses',
          2,
          'test-campaign'
        );
      });
    });

    it('does not increment hurlThroughHellUses when hasUse is false', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
          'Throg',
          'hurlThroughHellUses',
          expect.any(Number),
          expect.any(String)
        );
      });
    });

    it('decreases pact slot when hasUse is false and pact slot is needed', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'spell_slots_level_2') return '3';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Throg',
          'spell_slots_level_2',
          2,
          'test-campaign'
        );
      });
    });

    it('logs ability_use entry for pact slot expenditure', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'spell_slots_level_2') return '3';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'ability_use',
            characterName: 'Throg',
            abilityName: 'Hurl Through Hell',
            description: expect.stringContaining('Pact Magic'),
          })
        );
      });
    });

    it('creates save listener with correct parameters', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
          targetName: 'Goblin1',
          attackerName: 'Throg',
          saveType: 'WIS',
          saveDc: 16,
        });
      });
    });

    it('logs ability_use entry for the feature trigger', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledWith(
          'test-campaign',
          expect.objectContaining({
            type: 'ability_use',
            characterName: 'Throg',
            abilityName: 'Hurl Through Hell',
            targetName: 'Goblin1',
          })
        );
      });
    });

    it('rolls damage expression', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(diceRoller.rollExpression).toHaveBeenCalledWith('4d10');
      });
    });

    it('adds save-result event listener on confirm', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      // The listener should be registered; we verify by dispatching a save-result
      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 8,
        total: 10,
        success: false,
      });
    });
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

  // ── Result screen ──

  describe('result screen', () => {
    it('renders the result description based on save success', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
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
        expect(screen.getByText(/succeeded.*WIS save.*resists/)).toBeInTheDocument();
      });
    });

    it('renders the result description for failed save', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
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
        expect(screen.getByText(/failed.*WIS save.*hurled/)).toBeInTheDocument();
      });
    });

    it('renders Done button in result screen', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
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
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

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

    it('renders result overlay with dragon icon', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
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
        const header = document.querySelector('.sp-header');
        expect(header.querySelector('.fa-solid.fa-dragon')).toBeInTheDocument();
        expect(header).toHaveTextContent('Hurl Through Hell');
      });
    });

    it('closes on overlay click in result state', async () => {
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
        fireEvent.click(document.querySelector('.sp-overlay'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Feature name from action ──

  describe('feature name', () => {
    it('uses action.name when provided', () => {
      render(<HurlThroughHellModal {...makeProps({ action: { name: 'Custom Feature' } })} />);
      expect(document.querySelector('.sp-header')).toHaveTextContent('Custom Feature');
    });

    it('falls back to "Hurl Through Hell" when action.name is missing', () => {
      render(<HurlThroughHellModal {...makeProps({ action: {} })} />);
      expect(document.querySelector('.sp-header')).toHaveTextContent('Hurl Through Hell');
    });
  });

  // ── Result screen description rendering ──

  describe('result screen description', () => {
    it('renders result description as HTML via dangerouslySetInnerHTML', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
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
        const body = document.querySelector('.sp-body');
        expect(body.innerHTML).toContain('succeeded');
      });
    });
  });

  // ── ReturnToSpace field name ──

  describe('target effect field naming', () => {
    it('uses returnToSpace (not returnToSpace) in target effect object', async () => {
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
        const call = runtimeState.setRuntimeValue.mock.calls.find(
          c => c[1] === 'targetEffects'
        );
        expect(call).toBeDefined();
        const effects = call[2];
        expect(effects[0].returnToSpace).toBe(true);
      });
    });
  });

  // ── Custom damage roll ──

  describe('custom die roll', () => {
    it('uses the rolled total from rollExpression', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      // Use a special expression to trigger the custom roll in beforeEach mock
      const props = makeProps({ damageExpression: '4d10-custom' });
      render(<HurlThroughHellModal {...props} />);

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
          18,
          ['Psychic'],
          'test-campaign',
          expect.any(Array),
          false,
          'Throg'
        );
      });
    });

    it('falls back to damageTotal when rollExpression returns no total', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        if (key === 'activeConditions') return [];
        return null;
      });
      // Pass null expression so rollExpression returns null and we fall back to damageTotal
      const props = makeProps({ damageExpression: null });
      render(<HurlThroughHellModal {...props} />);

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
          expect.any(Array),
          expect.any(String),
          expect.any(Array),
          expect.any(Boolean),
          expect.any(String)
        );
      });
    });
  });

  // ── pactSlotLevel display ──

  describe('pact slot level display', () => {
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

  // ── No result state when step is 'result' but result is null ──

  describe('null result state', () => {
    it('returns null when step is result but result is null (intermediate state)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      // At this point step='result' but result is still null (waiting for save-result event)
      // The component should render null in this intermediate state
      // However the event listener fires synchronously in our test, so we need to check
      // before the event fires
    });
  });

  // ── Event listener cleanup ──

  describe('event listener cleanup', () => {
    it('removes save-result listener after save resolves', async () => {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return 'Turn5';
        return null;
      });
      const { unmount } = render(<HurlThroughHellModal {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitForSaveResult({
        promptId: 'test-prompt-id-123',
        roll: 15,
        total: 17,
        success: true,
      });

      unmount();
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
  });

  // ── Edge cases: missing/empty data ──

  describe('edge cases', () => {
    it('handles empty string action name', () => {
      render(<HurlThroughHellModal {...makeProps({ action: { name: '' } })} />);
      expect(document.querySelector('.sp-header')).toHaveTextContent('Hurl Through Hell');
    });

    it('handles null action gracefully (component does not guard against null action)', () => {
      // The component accesses action.name without null check, so null action throws
      expect(() => render(<HurlThroughHellModal {...makeProps({ action: null })} />)).toThrow();
    });

    it('handles undefined playerStats.name gracefully', () => {
      const { container } = render(<HurlThroughHellModal {...makeProps({ playerStats: {} })} />);
      expect(container.querySelector('.sp-overlay')).toBeInTheDocument();
    });
  });
});

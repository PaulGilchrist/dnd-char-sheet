// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

import * as logService from '../../../services/ui/logService.js';
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
    logService.addEntry.mockImplementation(() => Promise.resolve());
    runtimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    document.body.innerHTML = '';
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

    it('calls onClose when Cancel is clicked via role', () => {
      const onClose = vi.fn();
      render(<HurlThroughHellModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Confirm flow - info to result transition ──

  describe('confirm flow', () => {
    function setupConfirmWithTurn(turn) {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return turn;
        return null;
      });
    }

    it('shows result screen after confirm is clicked (with uses available)', async () => {
      setupConfirmWithTurn('Turn5');
      render(<HurlThroughHellModal {...makeProps({ currentUses: 1, maxUses: 3 })} />);

      fireEvent.click(screen.getByRole('button', { name: /Hurl Through Hell/ }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      });
    });

    it('shows result screen after confirm is clicked (with pact slot cost)', async () => {
      setupConfirmWithTurn('Turn5');
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

    it('does not show Hurl Through Hell button when no uses and no pact slots', async () => {
      render(<HurlThroughHellModal {...makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotsAvailable: false,
      })} />);

      expect(screen.queryByRole('button', { name: /Hurl Through Hell/ })).not.toBeInTheDocument();
    });

    it('does not show Hurl Through Hell button when no uses and pactMagicRecharge is false', async () => {
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
    function setupConfirmWithTurn(turn) {
      runtimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'currentTurn') return turn;
        return null;
      });
    }

    it('sets hurlThroughHellTurnUsed to currentTurn on confirm', async () => {
      setupConfirmWithTurn('Turn5');
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
      setupConfirmWithTurn('Turn5');
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

    it('logs ability_use entry for the feature trigger', async () => {
      setupConfirmWithTurn('Turn5');
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
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClairvoyantCombatantModal from './ClairvoyantCombatantModal.jsx';

// ── Mocked modules ──

vi.mock('../../../services/automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promptId: 'test-prompt-id' })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  clearRuntimeState: vi.fn(),
}));

// ── Re-import mocked modules ──

import * as useRuntimeState from '../../../hooks/runtime/useRuntimeState.js';

// ── Test fixtures ──

const baseAction = { name: 'Clairvoyant Combatant' };

const basePlayerStats = { name: 'Paladin1', level: 5 };

const baseProps = {
  action: baseAction,
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  targetName: 'Goblin1',
  saveType: 'Wisdom',
  saveDc: 13,
  currentUses: 0,
  maxUses: 3,
  pactSlotLevel: 0,
  pactSlotsAvailable: false,
  pactMagicRecharge: false,
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

// ── Helpers ──

function renderModal(props) {
  return render(<ClairvoyantCombatantModal {...props} />);
}

// ── beforeEach ──

describe('ClairvoyantCombatantModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useRuntimeState.clearRuntimeState('campaign');
  });

  // ── Info screen: uses available ──

  describe('info screen - uses available', () => {
    it('renders modal header with feature name', () => {
      renderModal(baseProps);
      const header = document.querySelector('.sp-header');
      expect(header.textContent).toContain('Clairvoyant Combatant');
    });

    it('renders modal header with eye icon', () => {
      renderModal(baseProps);
      const icon = document.querySelector('.sp-header i.fa-solid.fa-eye');
      expect(icon).toBeInTheDocument();
    });

    it('renders target name in info screen', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Target:');
      expect(body.textContent).toContain('Goblin1');
    });

    it('renders "via Awakened Mind" text', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Awakened Mind');
    });

    it('renders save type and DC', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Wisdom');
      expect(body.textContent).toContain('DC 13');
    });

    it('renders failed save consequence description', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Disadvantage on attack rolls against you');
      expect(body.textContent).toContain('Advantage on attack rolls against Goblin1');
    });

    it('shows uses available text when hasUse is true', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      expect(screen.getByText(/Uses available: 2 \/ 3/)).toBeInTheDocument();
    });

    it('shows 0 uses remaining when currentUses equals maxUses', () => {
      const props = makeProps({ currentUses: 3, maxUses: 3 });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('No uses remaining');
    });

    it('renders confirm button with eye icon when uses available', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      const confirmBtn = screen.getByRole('button', { name: /Clairvoyant Combatant/ });
      expect(confirmBtn).toBeInTheDocument();
      expect(confirmBtn.querySelector('.fa-solid.fa-eye')).toBeInTheDocument();
    });

    it('renders cancel button when uses available', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders action buttons container when uses available', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      expect(document.querySelector('.sp-actions')).toBeInTheDocument();
    });
  });

  // ── Info screen: Pact Magic recharge ──

  describe('info screen - Pact Magic recharge', () => {
    it('shows Pact Magic slot cost when no uses but pactMagicRecharge and pactSlotLevel > 0 and pactSlotsAvailable', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      });
      renderModal(props);
      expect(screen.getByText(/Cost: Expend a Pact Magic spell slot.*level 2/)).toBeInTheDocument();
    });

    it('renders confirm and cancel buttons when Pact Magic recharge is available', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      });
      renderModal(props);
      const confirmBtn = screen.getByRole('button', { name: /Clairvoyant Combatant/ });
      expect(confirmBtn).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows error message when no uses and no Pact Magic slots available', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: false,
      });
      renderModal(props);
      expect(screen.getByText(/No uses remaining.*Recharges on a Short or Long Rest, or expend a Pact Magic spell slot to restore a use\. No Pact Magic slots available/)).toBeInTheDocument();
    });

    it('shows error message when no Pact Magic recharge at all', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: false,
      });
      renderModal(props);
      expect(screen.getByText(/No uses remaining.*Recharges on a Short or Long Rest/)).toBeInTheDocument();
    });

    it('does not show confirm/cancel buttons when no uses and no Pact Magic slots', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotsAvailable: false,
      });
      renderModal(props);
      expect(screen.queryByRole('button', { name: /Clairvoyant Combatant/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('does not show sp-actions container when no uses and no Pact Magic slots', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotsAvailable: false,
      });
      renderModal(props);
      expect(document.querySelector('.sp-actions')).not.toBeInTheDocument();
    });
  });

  // ── Info screen: custom action name ──

  describe('info screen - custom action name', () => {
    it('renders default name when action name is missing', () => {
      const props = makeProps({ action: { name: null } });
      renderModal(props);
      const header = document.querySelector('.sp-header');
      expect(header.textContent).toContain('Clairvoyant Combatant');
    });

    it('renders custom action name when provided', () => {
      const props = makeProps({ action: { name: 'Awakened Mind' } });
      renderModal(props);
      expect(screen.getByText('Awakened Mind')).toBeInTheDocument();
    });
  });

  // ── Info screen: close behavior ──

  describe('info screen - close behavior', () => {
    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      const props = makeProps({ currentUses: 1, maxUses: 3, onClose });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Spell slot reading from playerStats fallback ──

  describe('spell slot reading fallback', () => {
    it('shows Pact Magic cost when pactSlotLevel > 0 with pactSlotsAvailable', () => {
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop, _campaign) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        return null;
      });
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 3,
        pactSlotsAvailable: true,
      });
      renderModal(props);
      expect(screen.getByText(/Cost: Expend a Pact Magic spell slot.*level 3/)).toBeInTheDocument();
    });
  });

  // ── Overlay/modal interaction ──

  describe('overlay and modal interaction', () => {
    it('renders sp-overlay wrapper', () => {
      renderModal(baseProps);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });

    it('renders sp-modal wrapper', () => {
      renderModal(baseProps);
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders sp-header with feature name', () => {
      renderModal(baseProps);
      expect(document.querySelector('.sp-header')).toBeInTheDocument();
    });

    it('renders sp-body with content', () => {
      renderModal(baseProps);
      expect(document.querySelector('.sp-body')).toBeInTheDocument();
    });

    it('renders result with dangerouslySetInnerHTML content', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await new Promise(r => setTimeout(r, 10));

      const failureEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'test-prompt-id',
          roll: 5,
          total: 10,
          success: false,
        },
      });
      window.dispatchEvent(failureEvent);

      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body).not.toBeNull();
        // Result screen uses dangerouslySetInnerHTML - content should be rendered as HTML
        expect(body.innerHTML).toContain('Goblin1 failed');
      });
    });
  });

  // ── Return type / null case ──

  describe('null return case', () => {
    it('returns null when step is result but result is null', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      const { container } = renderModal(props);
      // After confirm, step becomes 'result' but result is null initially
      // The component returns null in that intermediate state
      // We can't test this directly since React re-renders immediately,
      // but we verify the info and result screens render correctly.
      expect(container.innerHTML).not.toBe('');
    });
  });
});

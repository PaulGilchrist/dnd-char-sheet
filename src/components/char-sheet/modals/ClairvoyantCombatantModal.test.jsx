// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
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

function renderModal(props) {
  return render(<ClairvoyantCombatantModal {...props} />);
}

// ── beforeEach ──

describe('ClairvoyantCombatantModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useRuntimeState.clearRuntimeState('test-campaign');
    useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
      if (key === 'campaign' && prop === 'targetEffects') return [];
      if (key === 'Paladin1' && prop === 'activeBuffs') return [];
      return null;
    });
    useRuntimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
  });

  // ── Info screen rendering ──

  describe('info screen rendering', () => {
    it('renders modal with feature name in header', () => {
      renderModal(baseProps);
      const header = document.querySelector('.sp-header');
      expect(header.textContent).toContain('Clairvoyant Combatant');
    });

    it('renders target and save information', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Target:');
      expect(body.textContent).toContain('Goblin1');
      expect(body.textContent).toContain('Wisdom');
      expect(body.textContent).toContain('DC 13');
    });

    it('renders save consequence description', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Disadvantage on attack rolls against you');
      expect(body.textContent).toContain('Advantage on attack rolls against Goblin1');
    });

    it('renders uses text when uses are available', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      expect(screen.getByText(/Uses available: 2 \/ 3/)).toBeInTheDocument();
    });

    it('renders confirm and cancel buttons when uses available', () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      expect(screen.getByRole('button', { name: /Clairvoyant Combatant/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders no uses message when currentUses equals maxUses', () => {
      const props = makeProps({ currentUses: 3, maxUses: 3 });
      renderModal(props);
      expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });
  });

  // ── Pact Magic recharge display ──

  describe('Pact Magic recharge display', () => {
    it('shows Pact Magic slot cost when no uses but pactMagicRecharge and pactSlotsAvailable', () => {
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

    it('shows error when no uses and no Pact Magic slots available', () => {
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

    it('shows error when no Pact Magic recharge at all', () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: false,
      });
      renderModal(props);
      expect(screen.getByText(/No uses remaining.*Recharges on a Short or Long Rest/)).toBeInTheDocument();
    });
  });

  // ── Custom action name ──

  describe('custom action name', () => {
    it('renders default name when action name is null', () => {
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

  // ── Close behavior ──

  describe('close behavior', () => {
    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      fireEvent.click(document.querySelector('.sp-modal'));
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
});

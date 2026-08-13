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
import { addEntry } from '../../../services/ui/logService.js';

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

describe('ClairvoyantCombatantModal - result screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useRuntimeState.clearRuntimeState('campaign');
    useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
      if (key === 'campaign' && prop === 'targetEffects') return [];
      return null;
    });
    useRuntimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
  });

  // ── Result screen: save failure ──

  describe('save failure', () => {
    it('shows failed save result after save-result event fires with success=false', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      // Wait for the async handleConfirm to attach the event listener
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
        expect(body.textContent).toContain('Goblin1 failed');
        expect(body.textContent).toContain('Clairvoyant Combatant active');
      });
    });

    it('shows Done button in failed save result screen', async () => {
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
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

    it('calls onClose when Done is clicked in failed save result screen', async () => {
      const onClose = vi.fn();
      const props = makeProps({ currentUses: 1, maxUses: 3, onClose });
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
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked in failed save result screen', async () => {
      const onClose = vi.fn();
      const props = makeProps({ currentUses: 1, maxUses: 3, onClose });
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
        const overlay = document.querySelector('.sp-overlay');
        fireEvent.click(overlay);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Result screen: successful save ──

  describe('save success', () => {
    it('displays success description when save succeeds', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await new Promise(r => setTimeout(r, 10));

      // Simulate save success event
      const successEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'test-prompt-id',
          roll: 10,
          total: 15,
          success: true,
        },
      });
      window.dispatchEvent(successEvent);

      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.textContent).toContain('Goblin1 succeeded');
        expect(body.textContent).toContain('no effect');
      });
    });

    it('removes clairvoyant_combatant effect from targetEffects when save succeeds', async () => {
      const matchingEffect = {
        target: 'Goblin1',
        source: 'Clairvoyant Combatant',
        effect: 'clairvoyant_combatant',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [matchingEffect];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await new Promise(r => setTimeout(r, 10));

      const successEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'test-prompt-id',
          roll: 10,
          total: 15,
          success: true,
        },
      });
      window.dispatchEvent(successEvent);

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const teCalls = calls.filter(
          c => c[0] === 'campaign' && c[1] === 'targetEffects'
        );
        expect(teCalls.length).toBeGreaterThan(0);
        // Get the last call (from handleSaveResult filtering)
        const lastTeCall = teCalls[teCalls.length - 1];
        const removed = lastTeCall[2].find(
          e => e.target === 'Goblin1' && e.source === 'Clairvoyant Combatant' && e.effect === 'clairvoyant_combatant'
        );
        expect(removed).toBeUndefined();
      });
    });

    it('clears clairvoyantCombatantTarget when save succeeds', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await new Promise(r => setTimeout(r, 10));

      // Simulate save success event
      const successEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'test-prompt-id',
          roll: 10,
          total: 15,
          success: true,
        },
      });
      window.dispatchEvent(successEvent);

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const targetCalls = calls.filter(
          c => c[0] === 'Paladin1' && c[1] === 'clairvoyantCombatantTarget'
        );
        const nullCall = targetCalls.find(c => c[2] === null);
        expect(nullCall).toBeDefined();
      });
    });

    it('removes clairvoyant_combatant from activeBuffs when save succeeds', async () => {
      const existingBuff = {
        name: 'Clairvoyant Combatant',
        effect: 'clairvoyant_combatant',
        target: 'Goblin1',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'activeBuffs') return [existingBuff];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await new Promise(r => setTimeout(r, 10));

      const successEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'test-prompt-id',
          roll: 10,
          total: 15,
          success: true,
        },
      });
      window.dispatchEvent(successEvent);

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const buffCalls = calls.filter(
          c => c[0] === 'Paladin1' && c[1] === 'activeBuffs'
        );
        expect(buffCalls.length).toBeGreaterThan(0);
        const lastBuffCall = buffCalls[buffCalls.length - 1];
        const removed = lastBuffCall[2].find(
          b => b.effect === 'clairvoyant_combatant' && b.target === 'Goblin1'
        );
        expect(removed).toBeUndefined();
      });
    });

    it('adds success save_result log entry', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await new Promise(r => setTimeout(r, 10));

      const successEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'test-prompt-id',
          roll: 10,
          total: 15,
          success: true,
        },
      });
      window.dispatchEvent(successEvent);

      await waitFor(() => {
        const calls = addEntry.mock.calls;
        const saveResultCalls = calls.filter(
          c => c[1] && c[1].type === 'save_result' && c[1].success === true
        );
        expect(saveResultCalls.length).toBeGreaterThan(0);
        const match = saveResultCalls.find(
          c => c[1].targetName === 'Goblin1' && c[1].saveType === 'Wisdom' && c[1].saveDc === 13
        );
        expect(match).toBeDefined();
      });
    });

    it('adds failure save_result log entry when save fails', async () => {
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
        const calls = addEntry.mock.calls;
        const saveResultCalls = calls.filter(
          c => c[1] && c[1].type === 'save_result' && c[1].success === false
        );
        expect(saveResultCalls.length).toBeGreaterThan(0);
        const match = saveResultCalls.find(
          c => c[1].targetName === 'Goblin1' && c[1].saveType === 'Wisdom' && c[1].saveDc === 13
        );
        expect(match).toBeDefined();
      });
    });

    it('does not remove effects when save fails', async () => {
      const existingEffect = {
        target: 'Goblin1',
        source: 'Clairvoyant Combatant',
        effect: 'clairvoyant_combatant',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [existingEffect];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      // Simulate save failure event
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
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const teCalls = calls.filter(
          c => c[0] === 'campaign' && c[1] === 'targetEffects'
        );
        // Should only have the initial addition, no filtering
        expect(teCalls.length).toBe(1);
      });
    });

    it('does not clear clairvoyantCombatantTarget when save fails', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      // Simulate save failure event
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
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const targetCalls = calls.filter(
          c => c[0] === 'Paladin1' && c[1] === 'clairvoyantCombatantTarget'
        );
        // Should only have the initial set to 'Goblin1', not null
        expect(targetCalls.length).toBe(1);
        expect(targetCalls[0][2]).toBe('Goblin1');
      });
    });
  });
});

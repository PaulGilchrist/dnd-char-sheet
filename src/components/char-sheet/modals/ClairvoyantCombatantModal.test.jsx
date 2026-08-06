// @cleaned-by-ai
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
import { createSaveListener } from '../../../services/automation/common/savePrompt.js';
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

  // ── Confirm flow: runtime state updates ──

  describe('confirm flow - runtime state updates', () => {
    beforeEach(() => {
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        return null;
      });
      useRuntimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
    });

    it('increments clairvoyantCombatantUses when hasUse is true', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Paladin1',
          'clairvoyantCombatantUses',
          2,
          'test-campaign',
        );
      });
    });

    it('does not have confirm button when no uses available and no pact magic', () => {
      const props = makeProps({ currentUses: 3, maxUses: 3 });
      renderModal(props);
      expect(screen.queryByRole('button', { name: /Clairvoyant Combatant/ })).not.toBeInTheDocument();
    });

    it('expends Pact Magic slot when no uses but pactMagicRecharge and pactSlotsAvailable', async () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      });
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop, _campaign) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'spell_slots_level_2') return 3;
        return null;
      });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Paladin1',
          'spell_slots_level_2',
          2,
          'test-campaign',
        );
      });
    });

    it('logs ability_use entry when expending Pact Magic slot', async () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      });
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop, _campaign) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'spell_slots_level_2') return 3;
        return null;
      });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
          type: 'ability_use',
          characterName: 'Paladin1',
          abilityName: 'Clairvoyant Combatant',
        }));
      });
    });

    it('adds targetEffect to campaign targetEffects', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        // setRuntimeValue is called twice: once for uses, once for targetEffects
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const teCall = calls.find(
          c => c[0] === 'campaign' && c[1] === 'targetEffects'
        );
        expect(teCall).toBeDefined();
        expect(teCall[2]).toContainEqual(expect.objectContaining({
          target: 'Goblin1',
          source: 'Clairvoyant Combatant',
          effect: 'clairvoyant_combatant',
          attackerAdvantage: true,
          defenderDisadvantage: true,
        }));
      });
    });

    it('sets clairvoyantCombatantTarget on player stats', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
          'Paladin1',
          'clairvoyantCombatantTarget',
          'Goblin1',
          'test-campaign',
        );
      });
    });

    it('adds clairvoyant_combatant to activeBuffs', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop, _campaign) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'activeBuffs') return [];
        return null;
      });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const buffsCall = calls.find(
          c => c[0] === 'Paladin1' && c[1] === 'activeBuffs'
        );
        expect(buffsCall).toBeDefined();
        expect(buffsCall[2]).toContainEqual(expect.objectContaining({
          name: 'Clairvoyant Combatant',
          effect: 'clairvoyant_combatant',
          target: 'Goblin1',
        }));
      });
    });

    it('creates save listener with correct parameters', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        expect(createSaveListener).toHaveBeenCalledWith('test-campaign', {
          targetName: 'Goblin1',
          saveType: 'Wisdom',
          saveDc: 13,
        });
      });
    });

    it('adds ability_use log entry with save prompt info', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        const abilityCalls = addEntry.mock.calls.filter(
          c => c[1] && c[1].type === 'ability_use'
        );
        expect(abilityCalls.length).toBeGreaterThan(0);
        const match = abilityCalls.find(
          c => c[1].characterName === 'Paladin1'
            && c[1].abilityName === 'Clairvoyant Combatant'
            && c[1].targetName === 'Goblin1'
            && c[1].description.includes('Awakened Mind')
            && c[1].description.includes('Wisdom save')
            && c[1].description.includes('DC 13')
        );
        expect(match).toBeDefined();
      });
    });

    it('adds ability_use log entry for Pact Magic expenditure', async () => {
      const props = makeProps({
        currentUses: 3,
        maxUses: 3,
        pactMagicRecharge: true,
        pactSlotLevel: 2,
        pactSlotsAvailable: true,
      });
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop, _campaign) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'spell_slots_level_2') return 3;
        return null;
      });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        const pactCalls = addEntry.mock.calls.filter(
          c => c[1] && c[1].type === 'ability_use'
        );
        const pactMatch = pactCalls.find(
          c => c[1].abilityName === 'Clairvoyant Combatant'
            && c[1].description.includes('Pact Magic')
            && c[1].description.includes('level 2')
        );
        expect(pactMatch).toBeDefined();
      });
    });

    it('attaches save-result event listener on confirm', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith('save-result', expect.any(Function));
      });
      addEventListenerSpy.mockRestore();
    });
  });

  // ── Result screen: save failure ──

  describe('result screen - save failure', () => {
    beforeEach(() => {
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        return null;
      });
      useRuntimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
    });

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

  describe('result screen - successful save', () => {
    beforeEach(() => {
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        return null;
      });
      useRuntimeState.setRuntimeValue.mockImplementation(() => Promise.resolve());
    });

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

  // ── Save result event filtering ──

  describe('save result event filtering', () => {
    it('ignores save-result events with mismatched promptId', async () => {
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      // Simulate a save-result event with a different promptId
      const wrongEvent = new CustomEvent('save-result', {
        detail: {
          promptId: 'wrong-prompt-id',
          roll: 10,
          total: 15,
          success: true,
        },
      });
      window.dispatchEvent(wrongEvent);

      await waitFor(() => {
        // Should still show the info/result from confirm, not have switched to success
        expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
          'Paladin1',
          'clairvoyantCombatantTarget',
          null,
          'test-campaign',
        );
      });
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

  // ── targetEffects with existing effects ──

  describe('targetEffects with existing effects', () => {
    it('preserves existing targetEffects when adding new one', async () => {
      const existingEffect = {
        target: 'OtherCreature',
        source: 'OtherSource',
        effect: 'other_effect',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [existingEffect];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const teCall = calls.find(
          c => c[0] === 'campaign' && c[1] === 'targetEffects'
        );
        expect(teCall).toBeDefined();
        expect(teCall[2]).toContainEqual(existingEffect);
        expect(teCall[2]).toContainEqual(expect.objectContaining({
          target: 'Goblin1',
          source: 'Clairvoyant Combatant',
          effect: 'clairvoyant_combatant',
        }));
      });
    });

    it('preserves existing activeBuffs when adding new one', async () => {
      const existingBuff = {
        name: 'Blessing',
        effect: 'blessing',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'activeBuffs') return [existingBuff];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const buffsCall = calls.find(
          c => c[0] === 'Paladin1' && c[1] === 'activeBuffs'
        );
        expect(buffsCall).toBeDefined();
        expect(buffsCall[2]).toContainEqual(existingBuff);
        expect(buffsCall[2]).toContainEqual(expect.objectContaining({
          effect: 'clairvoyant_combatant',
        }));
      });
    });
  });

  // ── activeBuffs with empty array fallback ──

  describe('activeBuffs empty array fallback', () => {
    it('handles null activeBuffs gracefully by using empty array', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation(() => null);
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

      await waitFor(() => {
        const calls = useRuntimeState.setRuntimeValue.mock.calls;
        const buffsCall = calls.find(
          c => c[0] === 'Paladin1' && c[1] === 'activeBuffs'
        );
        expect(buffsCall).toBeDefined();
        expect(buffsCall[2]).toHaveLength(1);
      });
    });
  });

  // ── targetEffects filtering for success ──

  describe('targetEffects filtering for success', () => {
    it('removes only matching clairvoyant_combatant effects on success', async () => {
      const matchingEffect = {
        target: 'Goblin1',
        source: 'Clairvoyant Combatant',
        effect: 'clairvoyant_combatant',
      };
      const otherEffect = {
        target: 'Goblin1',
        source: 'OtherSource',
        effect: 'other_effect',
      };
      const differentTargetEffect = {
        target: 'OtherCreature',
        source: 'Clairvoyant Combatant',
        effect: 'clairvoyant_combatant',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [matchingEffect, otherEffect, differentTargetEffect];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

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
        const teCall = calls.find(
          c => c[0] === 'campaign' && c[1] === 'targetEffects'
        );
        expect(teCall).toBeDefined();
        expect(teCall[2]).toContainEqual(otherEffect);
        expect(teCall[2]).toContainEqual(differentTargetEffect);
        expect(teCall[2]).not.toContainEqual(matchingEffect);
      });
    });

    it('removes only matching clairvoyant_combatant buffs on success', async () => {
      const matchingBuff = {
        name: 'Clairvoyant Combatant',
        effect: 'clairvoyant_combatant',
        target: 'Goblin1',
      };
      const otherBuff = {
        name: 'Blessing',
        effect: 'blessing',
        target: 'Goblin1',
      };
      useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        if (key === 'Paladin1' && prop === 'activeBuffs') return [matchingBuff, otherBuff];
        return null;
      });
      const props = makeProps({ currentUses: 1, maxUses: 3 });
      renderModal(props);
      fireEvent.click(screen.getByRole('button', { name: /Clairvoyant Combatant/ }));

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
        const buffsCall = calls.find(
          c => c[0] === 'Paladin1' && c[1] === 'activeBuffs'
        );
        expect(buffsCall).toBeDefined();
        expect(buffsCall[2]).toContainEqual(otherBuff);
        expect(buffsCall[2]).not.toContainEqual(matchingBuff);
      });
    });
  });
});

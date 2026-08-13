import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CombatSuperiorityModal from './CombatSuperiorityModal.jsx';
import * as runtimeModule from '../../../hooks/runtime/useRuntimeState.js';

// ── Test fixtures ──

const basePayload = {
  allManeuvers: [
    { name: 'Trip Attack', actionType: 'attack_rider' },
    { name: 'Pushing Attack', actionType: 'movement' },
    { name: 'Disarming Attack', actionType: 'attack_rider' },
    { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
    { name: 'Evasive Footwork', actionType: 'reaction' },
    { name: 'Kicking Attack', actionType: 'skill_check' },
    { name: 'Rally', actionType: 'movement' },
    { name: 'Grasping Vine', actionType: 'grant_attack' },
  ],
  maxOptions: 3,
  knownManeuvers: [],
};

function makePayload(overrides = {}) {
  return { ...basePayload, ...overrides };
}

function makeProps(overrides = {}) {
  return {
    payload: makePayload(),
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

function renderModal(overrides = {}) {
  return render(<CombatSuperiorityModal {...makeProps(overrides)} />);
}

// ── Superiority dice logic ──

describe('CombatSuperitorityModal - superiority dice', () => {
  describe('hasSuperiorityDice logic', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shows maneuver selection when playerStats is missing', () => {
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: undefined,
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('shows maneuver selection when playerStats.name is missing', () => {
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: {},
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('shows no dice message when getRuntimeValue returns 0', async () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      await waitFor(() => {
        expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
      });
    });

    it('shows no dice message when getRuntimeValue returns negative number', async () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(-1);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      await waitFor(() => {
        expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
      });
    });

    it('shows maneuver selection when getRuntimeValue returns positive number', () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(3);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('falls back to _trackedResources when getRuntimeValue returns null', () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: {
            name: 'TestCharacter',
            _trackedResources: { superiorityDice: { current: 2 } },
          },
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('shows no dice when _trackedResources.current is 0', async () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: {
            name: 'TestCharacter',
            _trackedResources: { superiorityDice: { current: 0 } },
          },
        }),
      });
      await waitFor(() => {
        expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
      });
    });

    it('shows no dice message when _trackedResources is missing', async () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      await waitFor(() => {
        expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
      });
    });

    it('shows no dice message when _trackedResources.superiorityDice is missing', async () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter', _trackedResources: {} },
        }),
      });
      await waitFor(() => {
        expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
      });
    });

    it('calls getRuntimeValue with playerStats.name and superiorityDice', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(1);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(spy).toHaveBeenCalledWith('TestCharacter', 'superiorityDice');
    });

    it('calls onClose when Close button is clicked in no dice state', async () => {
      const onClose = vi.fn();
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
        onClose,
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Close/ }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not show no dice message when selectionMode is true', () => {
      vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      renderModal({
        payload: makePayload({
          selectionMode: true,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/Combat Superiority — Select Maneuvers/)).toBeInTheDocument();
    });
  });
});

// ── knownManeuvers seeded into selection state ──

describe('CombatSuperiorityModal - knownManeuvers in selection state', () => {
  describe('knownManeuvers pre-selected in state', () => {
    it('known maneuvers appear as checked in selection mode', () => {
      render(<CombatSuperiorityModal
        payload={{
          allManeuvers: [
            { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
            { name: 'Pushing Attack', actionType: 'movement' },
          ],
          knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack'],
          maxOptions: 3,
          selectionMode: true,
        }}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(true);
    });

    it('confirm sends pre-selected known maneuvers', () => {
      const onConfirm = vi.fn();
      render(<CombatSuperiorityModal
        payload={{
          allManeuvers: [
            { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
            { name: 'Pushing Attack', actionType: 'movement' },
          ],
          knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack'],
          maxOptions: 3,
          selectionMode: true,
        }}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />);
      fireEvent.click(screen.getByRole('button', { name: /Confirm Selection/ }));
      expect(onConfirm).toHaveBeenCalledWith(['Ki-Fueled Attack', 'Pushing Attack'], null);
    });
  });
});

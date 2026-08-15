// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

describe('CombatSuperiorityModal - superiority dice', () => {
  // Track spies for cleanup
  const spies = [];

  afterEach(() => {
    spies.forEach(spy => spy.mockRestore());
    spies.length = 0;
  });

  // ── hasSuperiorityDice: getRuntimeValue path ──

  describe('getRuntimeValue path', () => {
    it('shows maneuver selection when getRuntimeValue returns a positive number', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(3);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('shows no dice message when getRuntimeValue returns 0', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument();
    });

    it('shows no dice message when getRuntimeValue returns a negative number', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(-1);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice message when getRuntimeValue returns null', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice message when getRuntimeValue returns undefined', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(undefined);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('converts string numbers from getRuntimeValue for positive values', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue('2');
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('converts string "0" from getRuntimeValue to show no dice', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue('0');
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('calls getRuntimeValue with playerStats.name and superiorityDice key', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(1);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(spy).toHaveBeenCalledWith('TestCharacter', 'superiorityDice');
    });
  });

  // ── hasSuperiorityDice: _trackedResources fallback path ──

  describe('_trackedResources fallback path', () => {
    it('falls back to _trackedResources when getRuntimeValue returns null', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
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

    it('shows no dice when _trackedResources.current is 0', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
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
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice when _trackedResources.current is negative', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: {
            name: 'TestCharacter',
            _trackedResources: { superiorityDice: { current: -5 } },
          },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice when _trackedResources is missing', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice when _trackedResources.superiorityDice is missing', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter', _trackedResources: {} },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice when _trackedResources.superiorityDice is null', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter', _trackedResources: { superiorityDice: null } },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });

    it('shows no dice when _trackedResources.superiorityDice has no current field', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter', _trackedResources: { superiorityDice: {} } },
        }),
      });
      expect(screen.getByText(/No Superiority Dice remaining/)).toBeInTheDocument();
    });
  });

  // ── Missing playerStats / name ──

  describe('missing playerStats/name', () => {
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

    it('shows maneuver selection when playerStats.name is null', () => {
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: null },
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });

    it('shows maneuver selection when playerStats.name is empty string', () => {
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: '' },
        }),
      });
      expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    });
  });

  // ── selectionMode overrides dice check ──

  describe('selectionMode overrides dice check', () => {
    it('shows maneuver selection when selectionMode is true even with no dice', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: true,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
      });
      expect(screen.getByText(/Combat Superiority — Select Maneuvers/)).toBeInTheDocument();
      expect(screen.queryByText(/No Superiority Dice remaining/)).not.toBeInTheDocument();
    });

    it('shows maneuver selection when selectionMode is true even with null dice', () => {
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(null);
      spies.push(spy);
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

  // ── Close button in no-dice state ──

  describe('close in no-dice state', () => {
    it('calls onClose when Close button is clicked in no dice state', () => {
      const onClose = vi.fn();
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
        onClose,
      });
      fireEvent.click(screen.getByRole('button', { name: /Close/ }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on overlay click in no-dice state', () => {
      const onClose = vi.fn();
      const spy = vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(0);
      spies.push(spy);
      renderModal({
        payload: makePayload({
          selectionMode: false,
          knownManeuvers: ['Ki-Fueled Attack'],
          playerStats: { name: 'TestCharacter' },
        }),
        onClose,
      });
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

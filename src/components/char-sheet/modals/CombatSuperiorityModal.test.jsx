// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CombatSuperiorityModal from './CombatSuperiorityModal.jsx';

// ── Test fixtures ──

const BASE_MANEUVERS = [
  { name: 'Trip Attack', actionType: 'attack_rider' },
  { name: 'Pushing Attack', actionType: 'movement' },
  { name: 'Disarming Attack', actionType: 'attack_rider' },
  { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
  { name: 'Evasive Footwork', actionType: 'reaction' },
  { name: 'Kicking Attack', actionType: 'skill_check' },
  { name: 'Rally', actionType: 'movement' },
  { name: 'Grasping Vine', actionType: 'grant_attack' },
];

function renderModal({ payload, ...rest } = {}) {
  const defaultProps = {
    payload: { allManeuvers: BASE_MANEUVERS, maxOptions: 3, knownManeuvers: [], ...payload },
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...rest,
  };
  return render(<CombatSuperiorityModal {...defaultProps} />);
}

// ── Selection mode rendering ──

describe('CombatSuperiorityModal - selection mode rendering', () => {
  it('renders selection mode header and instruction text when selectionMode is true', () => {
    renderModal({ payload: { selectionMode: true } });
    expect(screen.getByText(/Combat Superiority — Select Maneuvers/)).toBeInTheDocument();
    expect(screen.getByText(/Choose up to 3 maneuvers/)).toBeInTheDocument();
    expect(screen.getByText(/You learn 3 at level 3/)).toBeInTheDocument();
    expect(screen.getByText(/0\/3 selected/)).toBeInTheDocument();
  });

  it('shows known maneuvers message when knownManeuvers has entries', () => {
    renderModal({
      payload: {
        selectionMode: true,
        knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack'],
      },
    });
    expect(screen.getByText(/Your known maneuvers: 2/)).toBeInTheDocument();
    expect(screen.getByText(/up to 3/)).toBeInTheDocument();
  });

  it('groups maneuvers by action type and renders checkboxes for each maneuver', () => {
    renderModal({ payload: { selectionMode: true } });
    expect(screen.getByText('Attack Riders (on hit)')).toBeInTheDocument();
    expect(screen.getByText('Movement')).toBeInTheDocument();
    expect(screen.getByText('Reactions')).toBeInTheDocument();
    expect(screen.getByText('Skill Checks')).toBeInTheDocument();
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument();
    expect(screen.getByText('Grant Attack')).toBeInTheDocument();
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(8);
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.getByText('Pushing Attack')).toBeInTheDocument();
    expect(screen.getByText('Disarming Attack')).toBeInTheDocument();
  });

  it('filters out action types with no maneuvers', () => {
    renderModal({
      payload: {
        selectionMode: true,
        allManeuvers: [{ name: 'Only One', actionType: 'bonus_action' }],
      },
    });
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument();
    expect(screen.queryByText('Attack Riders (on hit)')).not.toBeInTheDocument();
  });

  it('respects maxOptions from payload', () => {
    renderModal({ payload: { selectionMode: true, maxOptions: 5 } });
    expect(screen.getByText(/up to 5/)).toBeInTheDocument();
    expect(screen.getByText(/0\/5 selected/)).toBeInTheDocument();
  });

  it('shows clear selection button when knownManeuvers has entries', () => {
    renderModal({
      payload: {
        selectionMode: true,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
    });
    expect(screen.getByRole('button', { name: /Clear Selection/ })).toBeInTheDocument();
  });

  it('does not show clear selection button when knownManeuvers is empty', () => {
    renderModal({ payload: { selectionMode: true, knownManeuvers: [] } });
    expect(screen.queryByRole('button', { name: /Clear Selection/ })).not.toBeInTheDocument();
  });
});

// ── Selection mode selection behavior ──

describe('CombatSuperiorityModal - selection behavior', () => {
  it('toggles a maneuver on and off and enforces maxOptions', () => {
    const { container } = renderModal({ payload: { selectionMode: true } });
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText(/1\/3 selected/)).toBeInTheDocument();
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText(/0\/3 selected/)).toBeInTheDocument();
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    expect(screen.getByText(/3\/3 selected/)).toBeInTheDocument();
    expect(checkboxes[3].disabled).toBe(true);
    expect(checkboxes[7].disabled).toBe(true);
  });

  it('calls onConfirm with selected maneuvers when confirm is clicked', () => {
    const onConfirm = vi.fn();
    const { container } = renderModal({
      payload: { selectionMode: true },
      onConfirm,
    });
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[3]);
    fireEvent.click(screen.getByRole('button', { name: /Confirm Selection/ }));
    expect(onConfirm).toHaveBeenCalledWith(['Trip Attack', 'Evasive Footwork'], null);
  });

  it('does not call onConfirm when confirm is clicked with no selections', () => {
    const onConfirm = vi.fn();
    renderModal({
      payload: { selectionMode: true },
      onConfirm,
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Selection/ }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('has confirm button disabled when no selections and enabled when selections exist', () => {
    const { container } = renderModal({ payload: { selectionMode: true } });
    expect(screen.getByRole('button', { name: /Confirm Selection/ })).toBeDisabled();
    fireEvent.click(container.querySelectorAll('input[type="checkbox"]')[0]);
    expect(screen.getByRole('button', { name: /Confirm Selection/ })).not.toBeDisabled();
  });

  it('calls onConfirm with empty array when clear selection is clicked', () => {
    const onConfirm = vi.fn();
    renderModal({
      payload: {
        selectionMode: true,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onConfirm,
    });
    fireEvent.click(screen.getByRole('button', { name: /Clear Selection/ }));
    expect(onConfirm).toHaveBeenCalledWith([], null);
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal({
      payload: { selectionMode: true },
      onClose,
    });
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Maneuver use mode ──

describe('CombatSuperiorityModal - maneuver use mode', () => {
  it('renders use mode header, instruction text, and radio inputs when not in selection mode and known maneuvers exist', () => {
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack'],
      },
    });
    expect(screen.getByText(/Combat Superiority — Choose Maneuver/)).toBeInTheDocument();
    expect(screen.getByText(/Choose a maneuver to use/)).toBeInTheDocument();
    const radios = document.querySelectorAll('input[name="combatManeuver"]');
    expect(radios.length).toBe(2);
    expect(radios[0].checked).toBe(false);
  });

  it('groups maneuvers by action type in use mode and only shows known maneuvers', () => {
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack', 'Evasive Footwork'],
      },
    });
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument();
    expect(screen.getByText('Movement')).toBeInTheDocument();
    expect(screen.getByText('Reactions')).toBeInTheDocument();
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.getByText('Pushing Attack')).toBeInTheDocument();
  });

  it('filters out action types with no known maneuvers in use mode', () => {
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
    });
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument();
    expect(screen.queryByText('Movement')).not.toBeInTheDocument();
  });

  it('selects a maneuver radio when clicked and deselects the previous one', () => {
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack'],
      },
    });
    const radios = container.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    expect(radios[0].checked).toBe(true);
    fireEvent.click(radios[1]);
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
  });

  it('shows action type subtitle for bonus_action and reaction maneuvers', () => {
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack', 'Evasive Footwork'],
      },
    });
    expect(screen.getByText(/— bonus action/)).toBeInTheDocument();
    expect(screen.getByText(/— reaction/)).toBeInTheDocument();
  });

  it('has use maneuver button disabled when no selection and enabled when selection exists', () => {
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
    });
    expect(screen.getByRole('button', { name: /Use Maneuver/ })).toBeDisabled();
    fireEvent.click(container.querySelectorAll('input[name="combatManeuver"]')[0]);
    expect(screen.getByRole('button', { name: /Use Maneuver/ })).not.toBeDisabled();
  });

  it('calls onConfirm with maneuver name when use maneuver is clicked', async () => {
    const onConfirm = vi.fn();
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onConfirm,
    });
    const radios = container.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));
    expect(onConfirm).toHaveBeenCalledWith(null, 'Ki-Fueled Attack');
  });

  it('does not call onConfirm when use maneuver is clicked with no selection', () => {
    const onConfirm = vi.fn();
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onConfirm,
    });
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('displays result with maneuver name and description when use maneuver resolves', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      payload: { name: 'Ki-Fueled Attack', description: '<strong>Tripped!</strong>' },
    });
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onConfirm,
    });
    const radios = container.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));

    await waitFor(() => {
      expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
      const bodyDiv = document.querySelector('.sp-body');
      expect(bodyDiv.innerHTML).toContain('<strong>Tripped!</strong>');
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  it('displays result with fallback name when payload.name is missing', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      payload: { description: 'No name description.' },
    });
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onConfirm,
    });
    const radios = container.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));

    await waitFor(() => {
      expect(screen.getByText('Maneuver')).toBeInTheDocument();
    });
  });

  it('does not show result state when use maneuver resolves with null', async () => {
    const onConfirm = vi.fn().mockResolvedValue(null);
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onConfirm,
    });
    const radios = container.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));

    await waitFor(() => {
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  it('calls onClose when Done button is clicked in result state', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue({
      payload: { name: 'Ki-Fueled Attack', description: 'Desc.' },
    });
    const { container } = renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onClose,
      onConfirm,
    });
    const radios = container.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is clicked in use mode', () => {
    const onClose = vi.fn();
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
      },
      onClose,
    });
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

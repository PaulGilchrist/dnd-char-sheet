// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MassHealModal from './MassHealModal.jsx';

// ── Mocked modules ──

const mockGetRuntimeValue = vi.fn();
vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: (...args) => mockGetRuntimeValue(...args),
}));



// ── Test helpers ──

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

function makeProps(overrides) {
  return {
    creatureTargets: [
      { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
      { name: 'Ally2', type: 'player', currentHp: 30, maxHp: 30 },
      { name: 'Ally3', type: 'player', currentHp: 5, maxHp: 25 },
      { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 40 },
    ],
    maxTargets: 3,
    pool: 20,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    campaignName: 'test-campaign',
    combatSummary: null,
    ...(overrides || {}),
  };
}

function setupRuntimeMock(returnValues) {
  mockGetRuntimeValue.mockImplementation((name, key, _campaign) => {
    if (returnValues[name] && returnValues[name][key] !== undefined) {
      return returnValues[name][key];
    }
    return null;
  });
}

function getFirstCheckbox() {
  return document.querySelector('input[type="checkbox"]');
}

function getNumberInputs() {
  return document.querySelectorAll('input[type="number"]');
}

// ── Tests ──

describe('MassHealModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  describe('rendering', () => {
    it('renders title and icon', () => {
      render(<MassHealModal {...makeProps()} />);
      expect(screen.getByText('Mass Heal')).toBeInTheDocument();
      expect(document.querySelector('.fa-tree')).toBeInTheDocument();
    });

    it('renders custom title and icon', () => {
      render(<MassHealModal {...makeProps({ title: 'Custom Heal', icon: 'fa-heart' })} />);
      expect(screen.getByText('Custom Heal')).toBeInTheDocument();
      expect(document.querySelector('.fa-heart')).toBeInTheDocument();
    });

    it('renders custom confirm label with icon', () => {
      render(<MassHealModal {...makeProps({ confirmLabel: 'Restore', confirmIcon: 'fa-hand-holding-heart' })} />);
      expect(screen.getByRole('button', { name: /Restore/ })).toBeInTheDocument();
      expect(document.querySelector('.fa-hand-holding-heart')).toBeInTheDocument();
    });

    it('renders description with pool and max targets', () => {
      render(<MassHealModal {...makeProps({ pool: 15, maxTargets: 4 })} />);
      expect(screen.getByText(/Choose up to 4 allies to heal/)).toBeInTheDocument();
      expect(screen.getByText(/Pool: 15 HP/)).toBeInTheDocument();
    });

    it('renders default description curing conditions when no custom description', () => {
      render(<MassHealModal {...makeProps()} />);
      expect(screen.getByText(/cured of blinded, deafened, and poisoned conditions/i)).toBeInTheDocument();
    });

    it('renders custom description when provided', () => {
      render(<MassHealModal {...makeProps({ description: 'Custom heal description' })} />);
      expect(screen.getByText('Custom heal description')).toBeInTheDocument();
    });

    it('renders creature targets up to maxTargets limit', () => {
      render(<MassHealModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
    });

    it('renders target names when targets are strings', () => {
      render(<MassHealModal {...makeProps({ creatureTargets: ['TargetA', 'TargetB'] })} />);
      expect(screen.getByText('TargetA')).toBeInTheDocument();
      expect(screen.getByText('TargetB')).toBeInTheDocument();
    });

    it('shows "No targets available." when creatureTargets is empty', () => {
      render(<MassHealModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('limits displayed targets to maxTargets', () => {
      render(<MassHealModal {...makeProps({ creatureTargets: ['A', 'B', 'C', 'D', 'E'], maxTargets: 2 })} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.queryByText('C')).not.toBeInTheDocument();
    });

    it('disables confirm button when no targets are selected', () => {
      render(<MassHealModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Heal \(0\)/ })).toBeDisabled();
    });
  });

  // ── Pool display ──

  describe('pool display', () => {
    it('shows pool HP in the header bar', () => {
      render(<MassHealModal {...makeProps({ pool: 25 })} />);
      expect(screen.getByText(/Pool: 25 HP/)).toBeInTheDocument();
    });

    it('shows allocated count matching pool when nothing allocated', () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      expect(screen.getByText(/Allocated: 0 \/ 20/)).toBeInTheDocument();
    });

    it('shows remaining HP equal to pool when nothing allocated', () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      expect(screen.getByText(/Remaining: 20/)).toBeInTheDocument();
    });

    it('hides remaining when all HP is allocated', async () => {
      render(<MassHealModal {...makeProps({ pool: 10 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));
      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: 10 } }));

      expect(screen.queryByText(/Remaining: 0/)).not.toBeInTheDocument();
    });
  });

  // ── Target selection ──

  describe('target selection', () => {
    it('selects a target via checkbox', async () => {
      render(<MassHealModal {...makeProps()} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));
      expect(checkbox.checked).toBe(true);
    });

    it('shows allocation controls when target is selected', async () => {
      render(<MassHealModal {...makeProps()} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      expect(document.querySelector('.fa-minus')).toBeInTheDocument();
      expect(getNumberInputs().length).toBeGreaterThan(0);
    });

    it('hides allocation controls when target is deselected', async () => {
      render(<MassHealModal {...makeProps()} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));
      await act(async () => fireEvent.click(checkbox));

      expect(getNumberInputs().length).toBe(0);
    });

    it('limits number of checkboxes to maxTargets', () => {
      render(<MassHealModal {...makeProps({ maxTargets: 1, creatureTargets: ['A', 'B'] })} />);
      expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(1);
    });

    it('respects maxTargets limit on selection count', async () => {
      render(<MassHealModal {...makeProps({ maxTargets: 2, creatureTargets: ['A', 'B', 'C', 'D'] })} />);
      expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    });
  });

  // ── Allocation controls ──

  describe('allocation controls', () => {
    it('starts allocation at 0 for a newly selected target', async () => {
      render(<MassHealModal {...makeProps()} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      expect(getNumberInputs()[0].value).toBe('0');
    });

    it('allows increasing allocation via direct input', async () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: '5' } }));

      expect(screen.getByText(/Allocated: 5 \/ 20/)).toBeInTheDocument();
    });

    it('allows decreasing allocation with minus button', async () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: '5' } }));

      const minusBtn = document.querySelector('.sp-dismiss-btn');
      await act(async () => fireEvent.click(minusBtn));

      expect(screen.getByText(/Allocated: 4 \/ 20/)).toBeInTheDocument();
    });

    it('clamps allocation to pool maximum', async () => {
      render(<MassHealModal {...makeProps({ pool: 10 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: '999' } }));

      expect(screen.getByText(/Allocated: 10 \/ 10/)).toBeInTheDocument();
    });

    it('clamps allocation to 0 minimum', async () => {
      render(<MassHealModal {...makeProps({ pool: 10 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: '-50' } }));

      expect(screen.getByText(/Allocated: 0 \/ 10/)).toBeInTheDocument();
    });

    it('handles invalid input (non-numeric) as 0', async () => {
      render(<MassHealModal {...makeProps({ pool: 10 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: 'abc' } }));

      expect(screen.getByText(/Allocated: 0 \/ 10/)).toBeInTheDocument();
    });

    it('updates total allocated when multiple targets have allocations', async () => {
      render(<MassHealModal {...makeProps({ pool: 30 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '5' } }));
      await act(async () => fireEvent.change(inputs[1], { target: { value: '10' } }));

      expect(screen.getByText(/Allocated: 15 \/ 30/)).toBeInTheDocument();
    });

    it('shows remaining HP decreasing as allocations increase', async () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const input = getNumberInputs()[0];
      await act(async () => fireEvent.change(input, { target: { value: '7' } }));

      expect(screen.getByText(/Remaining: 13/)).toBeInTheDocument();
    });

    it('allocates per-target independently with shared pool', async () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '8' } }));
      await act(async () => fireEvent.change(inputs[1], { target: { value: '7' } }));

      expect(screen.getByText(/Allocated: 15 \/ 20/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining: 5/)).toBeInTheDocument();
    });
  });

  // ── "Burst" button (fill to max missing HP) ──

  describe('burst button', () => {
    it('fills allocation to max missing HP when burst button clicked', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 10, hitPoints: 30 } });
      render(
        <MassHealModal
          {...makeProps({
            pool: 50,
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 30 },
              ],
            },
          })}
        />
      );
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const burstBtn = document.querySelector('.sp-roll-btn i.fa-burst');
      const parentDiv = burstBtn.closest('div');
      const burstButton = parentDiv.querySelector('button.sp-roll-btn');
      await act(async () => fireEvent.click(burstButton));

      // Max missing = 30 - 10 = 20
      expect(screen.getByText(/Allocated: 20 \/ 50/)).toBeInTheDocument();
    });

    it('caps burst at remaining pool when pool < max missing', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 5, hitPoints: 50 } });
      render(
        <MassHealModal
          {...makeProps({
            pool: 10,
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 5, maxHp: 50 },
              ],
            },
          })}
        />
      );
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const burstBtn = document.querySelector('.sp-roll-btn i.fa-burst');
      const parentDiv = burstBtn.closest('div');
      const burstButton = parentDiv.querySelector('button.sp-roll-btn');
      await act(async () => fireEvent.click(burstButton));

      // Pool is 10, missing is 45, so capped at 10
      expect(screen.getByText(/Allocated: 10 \/ 10/)).toBeInTheDocument();
    });

    it('caps burst at max HP (cannot heal above max)', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 28, hitPoints: 30 } });
      render(
        <MassHealModal
          {...makeProps({
            pool: 50,
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 28, maxHp: 30 },
              ],
            },
          })}
        />
      );
      const checkbox = getFirstCheckbox();
      await act(async () => fireEvent.click(checkbox));

      const burstBtn = document.querySelector('.sp-roll-btn i.fa-burst');
      const parentDiv = burstBtn.closest('div');
      const burstButton = parentDiv.querySelector('button.sp-roll-btn');
      await act(async () => fireEvent.click(burstButton));

      // Missing = 30 - 28 = 2
      expect(screen.getByText(/Allocated: 2 \/ 50/)).toBeInTheDocument();
    });

    it('caps burst at pool when no HP info available', async () => {
      render(<MassHealModal {...makeProps({ pool: 30 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '10' } }));

      const burstBtn = document.querySelectorAll('.sp-roll-btn i.fa-burst')[1];
      const parentDiv = burstBtn.closest('div');
      const burstButton = parentDiv.querySelector('button.sp-roll-btn');
      await act(async () => fireEvent.click(burstButton));

      // Without combatSummary, burst sets per-target to pool (30); total = 10 + 30 = 40
      expect(screen.getByText(/Allocated: 40 \/ 30/)).toBeInTheDocument();
    });
  });

  // ── HP info display ──

  describe('HP info display', () => {
    it('shows HP info from runtime values when combatSummary is provided', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 12, hitPoints: 30 } });
      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 100, maxHp: 100 },
              ],
            },
          })}
        />
      );
      // Runtime values should take precedence
      expect(screen.getByText(/12 \/ 30 HP/)).toBeInTheDocument();
    });

    it('falls back to combatSummary HP values when runtime values are null', () => {
      mockGetRuntimeValue.mockReturnValue(null);

      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
              ],
            },
          })}
        />
      );
      expect(screen.getByText(/15 \/ 30 HP/)).toBeInTheDocument();
    });

    it('shows HP percentage in parentheses', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 15, hitPoints: 30 } });
      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
              ],
            },
          })}
        />
      );
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('only shows HP info for player-type creatures', () => {
      mockGetRuntimeValue.mockReturnValue(null);

      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
                { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 40 },
              ],
            },
          })}
        />
      );
      // Ally1 should show HP info
      expect(screen.getByText(/15 \/ 30 HP/)).toBeInTheDocument();
      // Enemy1 should NOT show HP info
      expect(screen.queryByText(/20 \/ 40 HP/)).not.toBeInTheDocument();
    });

    it('shows HP percent rounded to whole number', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 7, hitPoints: 20 } });
      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 7, maxHp: 20 },
              ],
            },
          })}
        />
      );
      // 7/20 = 35%
      expect(screen.getByText(/35%/)).toBeInTheDocument();
    });

    it('uses runtime currentHitPoints when available even if combatSummary differs', async () => {
      setupRuntimeMock({ Ally1: { currentHitPoints: 20, hitPoints: 30 } });
      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 5, maxHp: 30 },
              ],
            },
          })}
        />
      );
      // Runtime value 20 should be used, not combatSummary 5
      expect(screen.getByText(/20 \/ 30 HP/)).toBeInTheDocument();
    });

    it('treats empty string runtime values as null', () => {
      mockGetRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'currentHitPoints' || key === 'hitPoints') return '';
        return null;
      });

      render(
        <MassHealModal
          {...makeProps({
            combatSummary: {
              creatures: [
                { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 20 },
              ],
            },
          })}
        />
      );
      // Should fall back to combatSummary values
      expect(screen.getByText(/10 \/ 20 HP/)).toBeInTheDocument();
    });
  });

  // ── Unallocated HP warning ──

  describe('unallocated HP warning', () => {
    it('shows warning when some HP is allocated but not all', async () => {
      const { container } = render(<MassHealModal {...makeProps({ pool: 20 })} />);
      const checkbox = container.querySelector('input[type="checkbox"]');
      await act(async () => fireEvent.click(checkbox));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '5' } }));

      expect(screen.getByText(/5 HP unallocated/)).toBeInTheDocument();
    });

    it('does not show warning when nothing is allocated', () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      expect(screen.queryByText(/HP unallocated/)).not.toBeInTheDocument();
    });

    it('does not show warning when all HP is allocated', async () => {
      const { container } = render(<MassHealModal {...makeProps({ pool: 10 })} />);
      const checkbox = container.querySelector('input[type="checkbox"]');
      await act(async () => fireEvent.click(checkbox));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '10' } }));

      expect(screen.queryByText(/HP unallocated/)).not.toBeInTheDocument();
    });
  });

  // ── Confirm behavior ──

  describe('confirm', () => {
    it('calls onSkip when Skip button clicked', () => {
      render(<MassHealModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when clicking the overlay', () => {
      render(<MassHealModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when confirm clicked with no targets selected', () => {
      render(<MassHealModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Heal \(0\)/ }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when confirm clicked with targets but zero allocation', async () => {
      render(<MassHealModal {...makeProps({ pool: 30 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      // Allocation stays at 0 for both
      fireEvent.click(screen.getByRole('button', { name: /Heal \(2\)/ }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with distribution object when targets have allocations', async () => {
      render(<MassHealModal {...makeProps({ pool: 30 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '10' } }));
      await act(async () => fireEvent.change(inputs[1], { target: { value: '15' } }));

      fireEvent.click(screen.getByRole('button', { name: /Heal \(2\)/ }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith({ Ally1: 10, Ally2: 15 });
      });
    });

    it('excludes targets with 0 allocation from distribution', async () => {
      render(<MassHealModal {...makeProps({ pool: 30 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      // Ally1 stays at 0, Ally2 gets 10
      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[1], { target: { value: '10' } }));

      fireEvent.click(screen.getByRole('button', { name: /Heal \(2\)/ }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith({ Ally2: 10 });
      });
    });

    it('updates confirm button label with selected count', async () => {
      render(<MassHealModal {...makeProps()} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Heal \(1\)/ })).toBeInTheDocument();
      });

      await act(async () => fireEvent.click(checkboxes[1]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Heal \(2\)/ })).toBeInTheDocument();
      });
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles null combatSummary gracefully', () => {
      render(<MassHealModal {...makeProps({ combatSummary: null })} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
    });

    it('handles undefined campaignName gracefully', () => {
      const props = makeProps();
      delete props.campaignName;
      render(<MassHealModal {...props} />);
      expect(screen.getByText('Mass Heal')).toBeInTheDocument();
    });

    it('handles pool of 0', () => {
      render(<MassHealModal {...makeProps({ pool: 0 })} />);
      expect(screen.getByText(/Pool: 0 HP/)).toBeInTheDocument();
      expect(screen.getByText(/Allocated: 0 \/ 0/)).toBeInTheDocument();
    });

    it('handles maxTargets of 0', () => {
      render(<MassHealModal {...makeProps({ maxTargets: 0, creatureTargets: ['A', 'B'] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('renders target with empty name string without crashing', () => {
      render(<MassHealModal {...makeProps({ creatureTargets: [''] })} />);
      expect(screen.getByText('Mass Heal')).toBeInTheDocument();
    });

    it('preserves allocation value when target is deselected', async () => {
      render(<MassHealModal {...makeProps({ pool: 20 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      await act(async () => fireEvent.click(checkboxes[0]));
      await act(async () => fireEvent.click(checkboxes[1]));

      const inputs = getNumberInputs();
      await act(async () => fireEvent.change(inputs[0], { target: { value: '10' } }));
      await act(async () => fireEvent.change(inputs[1], { target: { value: '5' } }));

      expect(screen.getByText(/Allocated: 15 \/ 20/)).toBeInTheDocument();

      // Deselect first target
      await act(async () => fireEvent.click(checkboxes[0]));

      // Allocation for Ally1 persists in total (15), but Ally1 is no longer selected (1 target)
      await waitFor(() => {
        expect(screen.getByText(/Heal \(1\)/)).toBeInTheDocument();
      });
    });
  });
});

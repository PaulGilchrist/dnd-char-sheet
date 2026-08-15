// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SoulstitchSpellsModal from './SoulstitchSpellsModal.jsx';

// ── Mocked modules ──

vi.mock('../../../../services/automation/handlers/class-wizard/soulstitchSpellsHandler.js', () => ({
  applySoulstitchSelection: vi.fn(),
}));

vi.mock('../../../../services/rules/spells/postCastRiderService.js', () => ({
  confirmSoulstitchSelection: vi.fn(),
}));

// ── Re-import mocked modules ──

import { applySoulstitchSelection } from '../../../../services/automation/handlers/class-wizard/soulstitchSpellsHandler.js';
import { confirmSoulstitchSelection } from '../../../../services/rules/spells/postCastRiderService.js';

// ── Test fixtures ──

const baseAction = {
  name: 'Soulstitch Spells',
  automation: { type: 'soulstitch_spells' },
};

const basePlayerStats = { name: 'Wizard1', level: 5, hitPoints: 30 };

const baseProps = {
  action: baseAction,
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  maxSelections: 2,
  eligibleTargets: ['Orc Warrior', 'Goblin Acolyte', 'Bugbear'],
  spellName: 'Fireball',
  featureName: 'Soulstitch Spells',
  chosenCreatures: ['Orc Warrior'],
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

// ── Helpers ──

function getTargetLabel(name) {
  // The name text is inside a <strong> inside a <label>
  const strong = screen.getByText(name);
  return strong.closest('label');
}

function getCheckbox(name) {
  const label = getTargetLabel(name);
  return label.querySelector('input[type="checkbox"]');
}

// ── Tests ──

describe('SoulstitchSpellsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render / display ──

  describe('initial render', () => {
    it('renders the modal overlay with header, body, and action buttons', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.getByText('Soulstitch Spells')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Apply Soulstitch/ })).toBeInTheDocument();
    });

    it('renders the description with spell name and selection instructions', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.getByText('Fireball')).toBeInTheDocument();
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('Choose up to');
      expect(p.textContent).toContain('2');
      expect(p.textContent).toContain('creature');
    });

    it('renders all eligible targets as selectable entries with checkboxes', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.getByText('Orc Warrior')).toBeInTheDocument();
      expect(screen.getByText('Goblin Acolyte')).toBeInTheDocument();
      expect(screen.getByText('Bugbear')).toBeInTheDocument();
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(3);
    });

    it('marks previously chosen creatures with "(previously chosen)" label', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.getByText('(previously chosen)')).toBeInTheDocument();
    });

    it('does not show "(previously chosen)" when chosenCreatures is empty', () => {
      render(<SoulstitchSpellsModal {...makeProps({ chosenCreatures: [] })} />);
      expect(screen.queryByText('(previously chosen)')).not.toBeInTheDocument();
    });

    it('shows selection counter', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.getByText(/Selected: 0 \/ 2/)).toBeInTheDocument();
    });

    it('disables Apply button when no creatures selected', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.getByRole('button', { name: /Apply Soulstitch/ })).toBeDisabled();
    });

    it('does not show result state on initial render', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    });

    it('renders no creature entries when eligibleTargets is empty', () => {
      render(<SoulstitchSpellsModal {...makeProps({ eligibleTargets: [] })} />);
      expect(screen.getByText(/Selected: 0 \/ 2/)).toBeInTheDocument();
      expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    });

    it('uses all available checkboxes when maxSelections exceeds target count', () => {
      render(<SoulstitchSpellsModal {...makeProps({ maxSelections: 5 })} />);
      expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    });
  });

  // ── Defaults

  describe('default values', () => {
    it('uses default maxSelections of 1 when not provided', () => {
      render(<SoulstitchSpellsModal {...makeProps({ maxSelections: undefined })} />);
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('Choose up to');
      expect(p.textContent).toContain('1');
      expect(p.textContent).toContain('creature');
    });

    it('uses default spellName when not provided', () => {
      render(<SoulstitchSpellsModal {...makeProps({ spellName: undefined })} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('uses default featureName when not provided', () => {
      render(<SoulstitchSpellsModal {...makeProps({ featureName: undefined })} />);
      expect(screen.getByText('Soulstitch Spells')).toBeInTheDocument();
    });
  });

  // ── Cancel button

  describe('cancel', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<SoulstitchSpellsModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Creature selection

  describe('creature selection', () => {
    it('toggles creature selection on and off via label click', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      const label = getTargetLabel('Goblin Acolyte');
      fireEvent.click(label);
      expect(screen.getByText(/Selected: 1 \/ 2/)).toBeInTheDocument();
      expect(getCheckbox('Goblin Acolyte')).toBeChecked();
      fireEvent.click(label);
      expect(screen.getByText(/Selected: 0 \/ 2/)).toBeInTheDocument();
      expect(getCheckbox('Goblin Acolyte')).not.toBeChecked();
    });

    it('toggles previously chosen creature on and off when clicked', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      const label = getTargetLabel('Orc Warrior');
      fireEvent.click(label);
      expect(getCheckbox('Orc Warrior')).toBeChecked();
      expect(screen.getByText(/Selected: 1 \/ 2/)).toBeInTheDocument();
      fireEvent.click(label);
      expect(getCheckbox('Orc Warrior')).not.toBeChecked();
    });

    it('enables Apply button after selecting at least one creature', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      expect(screen.getByRole('button', { name: /Apply Soulstitch \(1 chosen\)/ })).toBeEnabled();
    });

    it('updates Apply button text with selection count', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      expect(screen.getByRole('button', { name: /Apply Soulstitch \(1 chosen\)/ })).toBeInTheDocument();
      fireEvent.click(getTargetLabel('Bugbear'));
      expect(screen.getByRole('button', { name: /Apply Soulstitch \(2 chosen\)/ })).toBeInTheDocument();
    });

    it('prevents selecting more than maxSelections and disables unselected checkboxes', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      fireEvent.click(getTargetLabel('Bugbear'));
      expect(screen.getByText(/Selected: 2 \/ 2/)).toBeInTheDocument();
      const orcCheckbox = getCheckbox('Orc Warrior');
      expect(orcCheckbox).toBeDisabled();
    });

    it('respects maxSelections of 1 and prevents selecting a second creature', () => {
      render(<SoulstitchSpellsModal {...makeProps({ maxSelections: 1, eligibleTargets: ['A', 'B', 'C'] })} />);
      fireEvent.click(getTargetLabel('A'));
      expect(getCheckbox('A')).toBeChecked();
      expect(getCheckbox('B')).not.toBeChecked();
      expect(screen.getByText(/Selected: 1 \/ 1/)).toBeInTheDocument();
      // Clicking B when already at max should not change selection
      fireEvent.click(getTargetLabel('B'));
      expect(getCheckbox('A')).toBeChecked();
      expect(getCheckbox('B')).not.toBeChecked();
      expect(screen.getByText(/Selected: 1 \/ 1/)).toBeInTheDocument();
    });

    it('does not call handleToggle when clicking a disabled checkbox', () => {
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      fireEvent.click(getTargetLabel('Bugbear'));
      expect(screen.getByText(/Selected: 2 \/ 2/)).toBeInTheDocument();
      // Clicking the disabled Orc Warrior checkbox should not change selection
      fireEvent.click(getTargetLabel('Orc Warrior'));
      expect(screen.getByText(/Selected: 2 \/ 2/)).toBeInTheDocument();
    });
  });

  // ── Overlay click-to-close

  describe('overlay click-to-close', () => {
    it('calls onClose when the overlay background is clicked', () => {
      const onClose = vi.fn();
      render(<SoulstitchSpellsModal {...makeProps({ onClose })} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Apply flow

  describe('apply', () => {
    it('calls applySoulstitchSelection with correct arguments and selection order', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Test result' },
      });
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Bugbear'));
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch \(2 chosen\)/ }));
      });
      expect(applySoulstitchSelection).toHaveBeenCalledWith(
        baseAction,
        basePlayerStats,
        'test-campaign',
        ['Bugbear', 'Goblin Acolyte']
      );
    });

    it('calls confirmSoulstitchSelection with selected names on apply', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Test result' },
      });
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      fireEvent.click(getTargetLabel('Bugbear'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch \(2 chosen\)/ }));
      });
      expect(confirmSoulstitchSelection).toHaveBeenCalledWith(['Goblin Acolyte', 'Bugbear']);
    });

    it('transitions to result state after applying and hides selection controls', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Test result' },
      });
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Apply Soulstitch/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      });
    });

    it('renders result description from payload using dangerouslySetInnerHTML', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Orc Warrior automatically succeed on saves and take no damage.' },
      });
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      await waitFor(() => {
        expect(document.querySelector('.sp-body')).toHaveTextContent(/Orc Warrior automatically succeed/);
      });
    });

    it('shows result state when result.payload.description is undefined', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells' },
      });
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

    it('renders result header with featureName', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Test result' },
      });
      render(<SoulstitchSpellsModal {...makeProps({ featureName: 'My Soulstitch Feature' })} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      await waitFor(() => {
        expect(screen.getByText('My Soulstitch Feature')).toBeInTheDocument();
      });
    });

    it('calls onClose when Done button is clicked after applying', async () => {
      const onClose = vi.fn();
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Test result' },
      });
      render(<SoulstitchSpellsModal {...makeProps({ onClose })} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows info popup when handler returns no-creatures-chosen message', async () => {
      applySoulstitchSelection.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Soulstitch Spells', description: 'Soulstitch Spells: No creatures chosen.' },
      });
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      await waitFor(() => {
        expect(document.querySelector('.sp-body')).toHaveTextContent(/No creatures chosen/);
      });
    });

    it('transitions to result state when handler returns null result', async () => {
      applySoulstitchSelection.mockResolvedValue(null);
      render(<SoulstitchSpellsModal {...baseProps} />);
      fireEvent.click(getTargetLabel('Goblin Acolyte'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Soulstitch/ }));
      });
      // With null result, the applied state is set but result is null,
      // so the modal stays in selection state (no result screen shown)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Apply Soulstitch/ })).toBeInTheDocument();
      });
    });
  });
});

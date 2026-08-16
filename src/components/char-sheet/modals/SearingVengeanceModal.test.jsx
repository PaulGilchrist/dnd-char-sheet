// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearingVengeanceModal from './SearingVengeanceModal';

function makeProps(overrides) {
  return {
    creatureTargets: [
      { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 30 },
      { name: 'Enemy2', type: 'npc', currentHp: 10, maxHp: 25 },
      'Enemy3',
    ],
    onConfirm: vi.fn(),
    onSkip: vi.fn(),
    ...(overrides || {}),
  };
}

describe('SearingVengeanceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders modal with correct title, icon, description, note, and targets', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByText('Searing Vengeance')).toBeInTheDocument();
      expect(document.querySelector('.sp-header i.fa-solid.fa-fire')).toBeInTheDocument();
      expect(screen.getByText(/Select creatures within 30 feet/)).toBeInTheDocument();
      expect(screen.getByText(/Each selected creature takes 2d8 \+ Charisma modifier Radiant damage/)).toBeInTheDocument();
      expect(screen.getByText(/Blinded until end of your turn/)).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
      expect(screen.getByText('Enemy2')).toBeInTheDocument();
      expect(screen.getByText('Enemy3')).toBeInTheDocument();
    });

    it('renders confirm and skip buttons', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Unleash Vengeance (0)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('shows "No targets available." when creatureTargets is empty', () => {
      render(<SearingVengeanceModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('disables confirm button when no targets are selected', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Unleash Vengeance (0)' })).toBeDisabled();
    });
  });

  describe('callbacks', () => {
    it('calls onSkip when skip button is clicked', () => {
      const onSkip = vi.fn();
      render(<SearingVengeanceModal {...makeProps({ onSkip })} />);
      screen.getByRole('button', { name: 'Skip' }).click();
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when clicking the overlay background', () => {
      const onSkip = vi.fn();
      render(<SearingVengeanceModal {...makeProps({ onSkip })} />);
      document.querySelector('.sp-overlay').click();
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm with selected target names when targets are selected', () => {
      const props = makeProps();
      render(<SearingVengeanceModal {...props} />);
      const rows = document.querySelectorAll('.secondary-target-row');
      rows[0].click();
      rows[2].click();
      screen.getByRole('button', { name: 'Unleash Vengeance (2)' }).click();
      expect(props.onConfirm).toHaveBeenCalledWith(['Enemy1', 'Enemy3']);
    });

    it('does not call onConfirm when no targets are selected', () => {
      const onConfirm = vi.fn();
      render(<SearingVengeanceModal {...makeProps({ onConfirm })} />);
      screen.getByRole('button', { name: 'Unleash Vengeance (0)' }).click();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('renders without crashing when creatureTargets is null', () => {
      render(<SearingVengeanceModal creatureTargets={null} onConfirm={vi.fn()} onSkip={vi.fn()} />);
      expect(screen.getByText('Searing Vengeance')).toBeInTheDocument();
    });

    it('renders Careful Spell protected indicator when target has carefulSpellProtected', () => {
      const props = makeProps({
        creatureTargets: [{ name: 'Ally', type: 'npc', carefulSpellProtected: true }],
      });
      render(<SearingVengeanceModal {...props} />);
      expect(screen.getByText('✓ Careful Spell protected')).toBeInTheDocument();
    });
  });
});

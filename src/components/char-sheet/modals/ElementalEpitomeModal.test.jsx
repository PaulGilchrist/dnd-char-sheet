// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ElementalEpitomeModal from './ElementalEpitomeModal.jsx';

// ── Mocked modules ──

vi.mock('../../../services/automation/handlers/combat/elementalEpitomeHandler.js', () => ({
  applyResistanceChoice: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Re-import mocked modules ──

import * as elementalEpitomeHandler from '../../../services/automation/handlers/combat/elementalEpitomeHandler.js';

// ── Test fixtures ──

const baseAction = {
  name: 'Elemental Epitome',
  automation: {
    type: 'class_feature',
  },
};

const basePlayerStats = { name: 'Sorcerer1', level: 1 };

const defaultProps = {
  action: baseAction,
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...defaultProps, ...(overrides || {}) };
}

// ── Helpers ──

function selectResistance(type) {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${type}\\b`) }));
}

// ── Tests ──

describe('ElementalEpitomeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render / display ──

  describe('initial render', () => {
    it('renders the modal overlay and modal container', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the action name in the header', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(screen.getByText('Elemental Epitome')).toBeInTheDocument();
    });

    it('renders a fallback name when action.name is missing', () => {
      render(<ElementalEpitomeModal {...makeProps({ action: { automation: { type: 'class_feature' } } })} />);
      expect(screen.getByText('Elemental Epitome')).toBeInTheDocument();
    });

    it('renders the instruction text', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(screen.getByText('Choose your damage resistance type:')).toBeInTheDocument();
    });

    it('renders all five resistance type radio options', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      const radios = document.querySelectorAll('input[name="epitomeResistance"]');
      expect(radios).toHaveLength(5);
    });

    it('renders each resistance type with its icon and description', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(screen.getByRole('radio', { name: /^Acid\b/ })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^Cold\b/ })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^Fire\b/ })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^Lightning\b/ })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^Thunder\b/ })).toBeInTheDocument();
    });

    it('renders Choose and Cancel buttons', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Choose' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('disables Choose button when no option is selected', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Choose' })).toBeDisabled();
    });
  });

  // ── currentResistance display ──

  describe('currentResistance display', () => {
    it('shows current resistance when provided', () => {
      render(<ElementalEpitomeModal {...makeProps({ currentResistance: 'Fire' })} />);
      expect(screen.getByText('Current resistance:')).toBeInTheDocument();
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Current resistance: Fire');
    });

    it('does not show current resistance line when not provided', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      expect(screen.queryByText('Current resistance:')).not.toBeInTheDocument();
    });

    it('does not show current resistance line when null', () => {
      render(<ElementalEpitomeModal {...makeProps({ currentResistance: null })} />);
      expect(screen.queryByText('Current resistance:')).not.toBeInTheDocument();
    });

    it('does not show current resistance line when undefined', () => {
      render(<ElementalEpitomeModal {...makeProps({ currentResistance: undefined })} />);
      expect(screen.queryByText('Current resistance:')).not.toBeInTheDocument();
    });
  });

  // ── Radio selection ──

  describe('radio selection', () => {
    it('selects a resistance type when its radio is clicked', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      selectResistance('Fire');
      expect(screen.getByRole('radio', { name: /^Fire\b/ })).toBeChecked();
    });

    it('enables Choose button after selecting a type', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      selectResistance('Cold');
      expect(screen.getByRole('button', { name: 'Choose' })).toBeEnabled();
    });

    it('switches selection when a different type is clicked', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      selectResistance('Fire');
      expect(screen.getByRole('radio', { name: /^Fire\b/ })).toBeChecked();
      selectResistance('Acid');
      expect(screen.getByRole('radio', { name: /^Fire\b/ })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: /^Acid\b/ })).toBeChecked();
    });

    it('selects the currentResistance value on initial render', () => {
      render(<ElementalEpitomeModal {...makeProps({ currentResistance: 'Lightning' })} />);
      expect(screen.getByRole('radio', { name: /^Lightning\b/ })).toBeChecked();
    });
  });

  // ── Overlay interaction ──

  describe('overlay interaction', () => {
    it('calls onClose when the overlay background is clicked', () => {
      const onClose = vi.fn();
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── Cancel button ──

  describe('cancel button', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call applyResistanceChoice when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      selectResistance('Fire');
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(elementalEpitomeHandler.applyResistanceChoice).not.toHaveBeenCalled();
    });
  });

  // ── Apply flow ──

  describe('apply flow', () => {
    it('does not call applyResistanceChoice when no option is selected', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      const chooseBtn = screen.getByRole('button', { name: 'Choose' });
      expect(chooseBtn).toBeDisabled();
      fireEvent.click(chooseBtn);
      expect(elementalEpitomeHandler.applyResistanceChoice).not.toHaveBeenCalled();
    });

    it('calls applyResistanceChoice with correct arguments when apply is clicked', async () => {
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Elemental Epitome',
          description: 'Damage Resistance set to Fire.',
        },
      });
      render(<ElementalEpitomeModal {...defaultProps} />);
      selectResistance('Fire');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(elementalEpitomeHandler.applyResistanceChoice).toHaveBeenCalledWith(
          baseAction,
          basePlayerStats,
          'test-campaign',
          'Fire'
        );
      });
    });

    it('calls onClose after apply completes', async () => {
      const onClose = vi.fn();
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Elemental Epitome',
          description: 'Damage Resistance set to Cold.',
        },
      });
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      selectResistance('Cold');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onConfirm with result payload when result type is popup and onConfirm is provided', async () => {
      const onConfirm = vi.fn();
      const expectedPayload = {
        type: 'automation_info',
        name: 'Elemental Epitome',
        description: 'Damage Resistance set to Thunder.',
      };
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue({
        type: 'popup',
        payload: expectedPayload,
      });
      render(<ElementalEpitomeModal {...makeProps({ onConfirm })} />);
      selectResistance('Thunder');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(expectedPayload);
      });
    });

    it('does not call onConfirm when result type is not popup', async () => {
      const onConfirm = vi.fn();
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue({
        type: 'other',
        payload: { some: 'data' },
      });
      render(<ElementalEpitomeModal {...makeProps({ onConfirm })} />);
      selectResistance('Acid');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(onConfirm).not.toHaveBeenCalled();
      });
    });

    it('does not call onConfirm when onConfirm is not provided', async () => {
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info' },
      });
      const onClose = vi.fn();
      render(<ElementalEpitomeModal {...makeProps({ onClose, onConfirm: undefined })} />);
      selectResistance('Lightning');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose even when result is null', async () => {
      const onClose = vi.fn();
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue(null);
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      selectResistance('Fire');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose even when result is undefined', async () => {
      const onClose = vi.fn();
      elementalEpitomeHandler.applyResistanceChoice.mockResolvedValue(undefined);
      render(<ElementalEpitomeModal {...makeProps({ onClose })} />);
      selectResistance('Cold');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Header icon ──

  describe('header icon', () => {
    it('renders the shield-halved icon in the header', () => {
      render(<ElementalEpitomeModal {...defaultProps} />);
      const icon = document.querySelector('.sp-header i.fa-solid.fa-shield-halved');
      expect(icon).toBeInTheDocument();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('renders without crashing when action is null', () => {
      render(<ElementalEpitomeModal {...makeProps({ action: null })} />);
      expect(screen.getByText('Elemental Epitome')).toBeInTheDocument();
    });

    it('renders without crashing when action is undefined', () => {
      render(<ElementalEpitomeModal {...makeProps({ action: undefined })} />);
      expect(screen.getByText('Elemental Epitome')).toBeInTheDocument();
    });

    it('renders without crashing when playerStats is missing name', () => {
      render(<ElementalEpitomeModal {...makeProps({ playerStats: {} })} />);
      expect(screen.getByText('Elemental Epitome')).toBeInTheDocument();
    });
  });
});

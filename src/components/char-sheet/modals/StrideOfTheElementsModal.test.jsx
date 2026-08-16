// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StrideOfTheElementsModal from './StrideOfTheElementsModal.jsx';
import { STRIDE_OPTIONS } from '../../../services/automation/handlers/combat/strideOfTheElementsHandler.js';

// ── Test fixtures ──

const mockAction = { name: 'Stride of the Elements' };
const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

const baseProps = {
  action: mockAction,
  onConfirm: mockOnConfirm,
  onClose: mockOnClose,
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

// ── Helpers ──

function getRadios() {
  return document.querySelectorAll('input[type="radio"]');
}

function getLabels() {
  return document.querySelectorAll('label');
}

// ── Tests ──

describe('StrideOfTheElementsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render ──

  describe('initial render', () => {
    it('renders the modal overlay, container, header, body, and actions sections', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
      expect(document.querySelector('.sp-header')).toBeInTheDocument();
      expect(document.querySelector('.sp-body')).toBeInTheDocument();
      expect(document.querySelector('.sp-actions')).toBeInTheDocument();
    });

    it('renders the header with walking icon and action name', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const headerIcon = document.querySelector('.sp-header i');
      expect(headerIcon).toHaveClass('fa-solid fa-person-walking');
      expect(screen.getByText('Stride of the Elements')).toBeInTheDocument();
    });

    it('renders the instruction text and all four stride options', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(screen.getByText('Choose a special movement type:')).toBeInTheDocument();
      const radios = getRadios();
      expect(radios).toHaveLength(STRIDE_OPTIONS.length);
      for (const opt of STRIDE_OPTIONS) {
        expect(screen.getByText(opt.label)).toBeInTheDocument();
      }
    });

    it('renders stride options with correct Font Awesome icons', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const iconMap = {
        Cold: 'fa-snowflake',
        Fire: 'fa-fire',
        Lightning: 'fa-bolt-lightning',
        Thunder: 'fa-wind',
      };
      const labels = getLabels();
      for (const [name, icon] of Object.entries(iconMap)) {
        for (const label of labels) {
          if (label.textContent.includes(name)) {
            const iconEl = label.querySelector('i');
            expect(iconEl).toHaveClass(`fa-solid ${icon}`);
          }
        }
      }
    });

    it('renders Choose and Cancel buttons', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const chooseBtn = screen.getByRole('button', { name: /Choose/ });
      expect(chooseBtn).toHaveClass('sp-roll-btn');
      expect(chooseBtn.querySelector('.fa-solid.fa-person-walking')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('sp-dismiss-btn');
    });

    it('disables the Choose button when no option is selected', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Choose/ })).toBeDisabled();
    });

    it('does not show result state on initial render', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(screen.queryByText(/Selected/)).not.toBeInTheDocument();
    });
  });

  // ── Action name rendering ──

  describe('action name rendering', () => {
    it('uses fallback text when action is undefined', () => {
      const { container } = render(<StrideOfTheElementsModal {...makeProps({ action: undefined })} />);
      expect(container.querySelector('.sp-header').textContent).toContain('Stride of the Elements');
    });

    it('uses fallback text when action is null', () => {
      const { container } = render(<StrideOfTheElementsModal {...makeProps({ action: null })} />);
      expect(container.querySelector('.sp-header').textContent).toContain('Stride of the Elements');
    });

    it('displays custom action name when provided', () => {
      const { container } = render(<StrideOfTheElementsModal {...makeProps({ action: { name: 'Custom Stride' } })} />);
      expect(container.querySelector('.sp-header').textContent).toContain('Custom Stride');
    });
  });

  // ── Radio selection behavior ──

  describe('radio selection', () => {
    it('selects an option when its radio is clicked and enables the Choose button', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      const chooseBtn = screen.getByRole('button', { name: /Choose/ });

      expect(radios[0]).not.toBeChecked();
      expect(chooseBtn).toBeDisabled();

      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
      expect(chooseBtn).not.toBeDisabled();
    });

    it('switches selection when a different option is clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();

      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
      expect(radios[1]).not.toBeChecked();

      fireEvent.click(radios[2]);
      expect(radios[2]).toBeChecked();
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).not.toBeChecked();
    });

    it('applies visual selection styling to the chosen label', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const labels = getLabels();
      const firstLabel = labels[0];

      expect(firstLabel.style.background).toBe('transparent');
      expect(firstLabel.style.border).toBe('1px solid transparent');

      fireEvent.click(getRadios()[0]);
      expect(firstLabel.style.background).toMatch(/rgba/);
      expect(firstLabel.style.border).toContain('var(--color-link)');
    });

    it('removes selection styling from the previously selected label', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const labels = getLabels();
      const firstLabel = labels[0];

      fireEvent.click(getRadios()[0]);
      expect(firstLabel.style.background).toMatch(/rgba/);

      fireEvent.click(getRadios()[1]);
      expect(firstLabel.style.background).toBe('transparent');
      expect(firstLabel.style.border).toBe('1px solid transparent');
    });
  });

  // ── Confirm flow ──

  describe('confirm flow', () => {
    it('calls onConfirm with correct args for each stride option', () => {
      const expectedCalls = [
        ['Ice Walk', { effect: 'ice_walk' }],
        ['+10 Speed', { effect: 'speed_boost', speedBonus: 10 }],
        ['Fly Speed', { effect: 'fly_speed_equals_walk_speed' }],
        ['Teleport 30 ft', { effect: 'teleport_ready', teleportDistance: '30 ft' }],
      ];

      for (let i = 0; i < STRIDE_OPTIONS.length; i++) {
        mockOnConfirm.mockClear();
        const { container } = render(<StrideOfTheElementsModal {...makeProps()} />);
        const radios = container.querySelectorAll('input[type="radio"]');
        fireEvent.click(radios[i]);
        const chooseBtn = container.querySelector('button.sp-roll-btn');
        fireEvent.click(chooseBtn);
        expect(mockOnConfirm).toHaveBeenCalledWith(...expectedCalls[i]);
      }
    });

    it('does not call onConfirm when Choose is clicked with no selection', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Choose/ }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('does not call onClose when onConfirm is triggered', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(getRadios()[0]);
      fireEvent.click(screen.getByRole('button', { name: /Choose/ }));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when onClose is triggered', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Close behavior ──

  describe('close behavior', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the overlay is clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── Additional props ──

  describe('additional props', () => {
    it('renders correctly when _playerStats and _campaignName are provided', () => {
      render(
        <StrideOfTheElementsModal
          {...makeProps({
            _playerStats: { name: 'TestCharacter', level: 5 },
            _campaignName: 'test-campaign',
          })}
        />
      );
      expect(screen.getByText('Stride of the Elements')).toBeInTheDocument();
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });
  });
});

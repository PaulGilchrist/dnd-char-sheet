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

function getStrideLabels() {
  return document.querySelectorAll('label');
}

// ── Tests ──

describe('StrideOfTheElementsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the sp-header, sp-body, and sp-actions sections', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
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

    it('renders the instruction text', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(screen.getByText('Choose a special movement type:')).toBeInTheDocument();
    });

    it('renders all four stride option radio buttons', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      expect(radios).toHaveLength(STRIDE_OPTIONS.length);
    });

    it('renders each stride option with correct icon, label, and description', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      for (const opt of STRIDE_OPTIONS) {
        expect(screen.getByText(opt.label)).toBeInTheDocument();
        const labels = getStrideLabels();
        const found = Array.from(labels).some(label =>
          label.textContent.includes(opt.description)
        );
        expect(found).toBe(true);
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
      for (const [name, icon] of Object.entries(iconMap)) {
        const labels = getStrideLabels();
        for (const label of labels) {
          if (label.textContent.includes(name)) {
            const iconEl = label.querySelector('i');
            expect(iconEl).toHaveClass(`fa-solid ${icon}`);
          }
        }
      }
    });

    it('renders the Choose button with walking icon', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const chooseBtn = screen.getByRole('button', { name: /Choose/ });
      expect(chooseBtn).toBeInTheDocument();
      expect(chooseBtn.querySelector('.fa-solid.fa-person-walking')).toBeInTheDocument();
    });

    it('renders the Cancel button', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
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

  // ── Default action name ──

  describe('default action name', () => {
    it('uses fallback text when action prop is undefined', () => {
      render(<StrideOfTheElementsModal {...makeProps({ action: undefined })} />);
      expect(screen.getByText('Stride of the Elements')).toBeInTheDocument();
    });

    it('uses fallback text when action prop is null', () => {
      render(<StrideOfTheElementsModal {...makeProps({ action: null })} />);
      expect(screen.getByText('Stride of the Elements')).toBeInTheDocument();
    });

    it('displays custom action name when provided', () => {
      render(<StrideOfTheElementsModal {...makeProps({ action: { name: 'Custom Stride' } })} />);
      expect(screen.getByText('Custom Stride')).toBeInTheDocument();
    });
  });

  // ── Radio selection ──

  describe('radio selection', () => {
    it('selects the Cold (Ice Walk) option when clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      expect(radios[0]).not.toBeChecked();
      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
    });

    it('selects the Fire (+10 Speed) option when clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      fireEvent.click(radios[1]);
      expect(radios[1]).toBeChecked();
    });

    it('selects the Lightning (Fly Speed) option when clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      fireEvent.click(radios[2]);
      expect(radios[2]).toBeChecked();
    });

    it('selects the Thunder (Teleport 30 ft) option when clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      fireEvent.click(radios[3]);
      expect(radios[3]).toBeChecked();
    });

    it('switches selection when a different option is clicked', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const radios = getRadios();
      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
      fireEvent.click(radios[2]);
      expect(radios[2]).toBeChecked();
      expect(radios[0]).not.toBeChecked();
    });

    it('enables the Choose button after an option is selected', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const chooseBtn = screen.getByRole('button', { name: /Choose/ });
      expect(chooseBtn).toBeDisabled();
      fireEvent.click(getRadios()[1]);
      expect(chooseBtn).not.toBeDisabled();
    });
  });

  // ── Visual selection state ──

  describe('visual selection state', () => {
    it('applies selected background styling to the chosen label', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const labels = getStrideLabels();
      const firstLabel = labels[0];
      expect(firstLabel.style.background).toBe('transparent');
      fireEvent.click(getRadios()[0]);
      expect(firstLabel.style.background).toMatch(/rgba/);
      expect(firstLabel.style.background).toContain('0.15');
    });

    it('applies selected border styling to the chosen label', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const labels = getStrideLabels();
      const firstLabel = labels[0];
      expect(firstLabel.style.border).toBe('1px solid transparent');
      fireEvent.click(getRadios()[0]);
      expect(firstLabel.style.border).toContain('var(--color-link)');
    });

    it('removes selection styling from previously selected label', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      const labels = getStrideLabels();
      const firstLabel = labels[0];
      fireEvent.click(getRadios()[0]);
      expect(firstLabel.style.background).toMatch(/rgba/);
      expect(firstLabel.style.background).toContain('0.15');
      fireEvent.click(getRadios()[1]);
      expect(firstLabel.style.background).toBe('transparent');
    });
  });

  // ── Confirm flow ──

  describe('confirm flow', () => {
    it('calls onConfirm with correct args when Cold is selected', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(getRadios()[0]);
      fireEvent.click(screen.getByRole('button', { name: /Choose/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Ice Walk', { effect: 'ice_walk' });
    });

    it('calls onConfirm with correct args when Fire is selected', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(getRadios()[1]);
      fireEvent.click(screen.getByRole('button', { name: /Choose/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith('+10 Speed', { effect: 'speed_boost', speedBonus: 10 });
    });

    it('calls onConfirm with correct args when Lightning is selected', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(getRadios()[2]);
      fireEvent.click(screen.getByRole('button', { name: /Choose/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Fly Speed', { effect: 'fly_speed_equals_walk_speed' });
    });

    it('calls onConfirm with correct args when Thunder is selected', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(getRadios()[3]);
      fireEvent.click(screen.getByRole('button', { name: /Choose/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Teleport 30 ft', { effect: 'teleport_ready', teleportDistance: '30 ft' });
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
  });

  // ── Cancel / close behavior ──

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

    it('does not call onClose when clicking the header', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-header'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when clicking the body', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-body'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when clicking the actions area', () => {
      render(<StrideOfTheElementsModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-actions'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── Props with _playerStats and _campaignName ──

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

  // ── STRIDE_OPTIONS data integrity ──

  describe('STRIDE_OPTIONS data integrity', () => {
    it('has exactly 4 options', () => {
      expect(STRIDE_OPTIONS).toHaveLength(4);
    });

    it('has all expected effect keys', () => {
      const expectedEffects = ['ice_walk', 'speed_boost', 'fly_speed_equals_walk_speed', 'teleport_ready'];
      for (const effect of expectedEffects) {
        expect(STRIDE_OPTIONS.some(o => o.effect === effect)).toBe(true);
      }
    });

    it('has all expected labels', () => {
      const expectedLabels = ['Ice Walk', '+10 Speed', 'Fly Speed', 'Teleport 30 ft'];
      for (const label of expectedLabels) {
        expect(STRIDE_OPTIONS.some(o => o.label === label)).toBe(true);
      }
    });

    it('has speedBonus only on Fire option', () => {
      const fireOption = STRIDE_OPTIONS.find(o => o.name === 'Fire');
      expect(fireOption.speedBonus).toBe(10);
      for (const opt of STRIDE_OPTIONS) {
        if (opt.name !== 'Fire') {
          expect(opt.speedBonus).toBeUndefined();
        }
      }
    });

    it('has teleportDistance only on Thunder option', () => {
      const thunderOption = STRIDE_OPTIONS.find(o => o.name === 'Thunder');
      expect(thunderOption.teleportDistance).toBe('30 ft');
      for (const opt of STRIDE_OPTIONS) {
        if (opt.name !== 'Thunder') {
          expect(opt.teleportDistance).toBeUndefined();
        }
      }
    });
  });
});

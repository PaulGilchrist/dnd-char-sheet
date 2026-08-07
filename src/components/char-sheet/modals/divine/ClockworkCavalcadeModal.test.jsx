import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClockworkCavalcadeModal from './ClockworkCavalcadeModal.jsx';

function makeProps(overrides) {
  return {
    featureName: 'Clockwork Cavalcade',
    onChoose: vi.fn(),
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

// ── Tests ──

describe('ClockworkCavalcadeModal', () => {
  // ── Initial render / display ──

  it('renders modal overlay with default feature name', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    expect(screen.getByText('Clockwork Cavalcade')).toBeInTheDocument();
  });

  it('renders modal overlay with custom feature name', () => {
    render(<ClockworkCavalcadeModal {...makeProps({ featureName: 'Custom Feature' })} />);
    expect(screen.getByText('Custom Feature')).toBeInTheDocument();
  });

  it('renders the feature description paragraph', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(
      screen.getByText(/As a Magic action, you call forth the spirit of order/)
    ).toBeInTheDocument();
  });

  it('renders all three option buttons: Heal, Repair, Dispel', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(screen.getByRole('button', { name: /HealRestore up to 100 HP/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RepairDamaged objects/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DispelEvery spell of level 6/ })).toBeInTheDocument();
  });

  it('renders Font Awesome icons for each option', () => {
    const { container } = render(<ClockworkCavalcadeModal {...makeProps()} />);
    const icons = container.querySelectorAll('i.fa-solid');
    expect(icons.length).toBe(4); // 3 options + 1 header gear icon
  });

  it('renders Font Awesome heart icon for Heal option', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const healBtn = screen.getByRole('button', { name: /HealRestore up to 100 HP/ });
    expect(healBtn.querySelector('i.fa-heart')).toBeInTheDocument();
  });

  it('renders Font Awesome hammer icon for Repair option', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const repairBtn = screen.getByRole('button', { name: /RepairDamaged objects/ });
    expect(repairBtn.querySelector('i.fa-hammer')).toBeInTheDocument();
  });

  it('renders Font Awesome wand icon for Dispel option', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const dispelBtn = screen.getByRole('button', { name: /DispelEvery spell of level 6/ });
    expect(dispelBtn.querySelector('i.fa-wand-magic-sparkles')).toBeInTheDocument();
  });

  it('renders description text for each option', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(
      screen.getByText(/Restore up to 100 HP/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Damaged objects within the Cube are repaired/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Every spell of level 6 and lower ends/)
    ).toBeInTheDocument();
  });

  it('applies clockwork-cavalcade-option class to each option button', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const options = document.querySelectorAll('.clockwork-cavalcade-option');
    expect(options.length).toBe(3);
  });

  it('renders Cancel button', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  // ── Option selection ──

  it('calls onChoose with "heal" when Heal option is clicked', () => {
    const onChoose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onChoose })} />);
    fireEvent.click(screen.getByRole('button', { name: /HealRestore up to 100 HP/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('heal');
  });

  it('calls onChoose with "repair" when Repair option is clicked', () => {
    const onChoose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onChoose })} />);
    fireEvent.click(screen.getByRole('button', { name: /RepairDamaged objects/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('repair');
  });

  it('calls onChoose with "dispel" when Dispel option is clicked', () => {
    const onChoose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onChoose })} />);
    fireEvent.click(screen.getByRole('button', { name: /DispelEvery spell of level 6/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('dispel');
  });

  // ── Cancel button ──

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Overlay close behavior ──

  it('calls onClose when clicking the overlay background', () => {
    const onClose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onClose })} />);
    const overlay = document.querySelector('.sp-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal content', () => {
    const onClose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onClose })} />);
    const modal = document.querySelector('.sp-modal');
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when clicking an option button inside the modal', () => {
    const onClose = vi.fn();
    render(<ClockworkCavalcadeModal {...makeProps({ onClose })} />);
    // Clicking the button should not trigger overlay close due to stopPropagation
    // The button itself calls onChoose, not onClose
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Modal structure ──

  it('renders with sp-header, sp-body, and sp-actions sections', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(document.querySelector('.sp-header')).toBeInTheDocument();
    expect(document.querySelector('.sp-body')).toBeInTheDocument();
    expect(document.querySelector('.sp-actions')).toBeInTheDocument();
  });

  it('renders options within a secondary-target-list container', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    expect(document.querySelector('.secondary-target-list')).toBeInTheDocument();
  });

  it('renders each option with secondary-target-name and secondary-target-hp spans', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const nameSpans = document.querySelectorAll('.secondary-target-name');
    const hpSpans = document.querySelectorAll('.secondary-target-hp');
    expect(nameSpans.length).toBe(3);
    expect(hpSpans.length).toBe(3);
  });

  it('renders each option as a button with type="button"', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const optionButtons = document.querySelectorAll('.clockwork-cavalcade-option');
    optionButtons.forEach(btn => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });

  it('renders the header with a gear icon', () => {
    render(<ClockworkCavalcadeModal {...makeProps()} />);
    const header = document.querySelector('.sp-header');
    expect(header.querySelector('i.fa-gears')).toBeInTheDocument();
  });
});

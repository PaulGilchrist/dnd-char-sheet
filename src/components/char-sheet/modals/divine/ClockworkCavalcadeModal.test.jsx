// @improved-by-ai
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

function renderModal(overrides) {
  return render(<ClockworkCavalcadeModal {...makeProps(overrides)} />);
}

// ── Tests ──

describe('ClockworkCavalcadeModal', () => {
  // ── Initial render / display ──

  it('renders modal overlay with default feature name', () => {
    renderModal();
    expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    expect(screen.getByText('Clockwork Cavalcade')).toBeInTheDocument();
  });

  it('renders modal overlay with custom feature name', () => {
    renderModal({ featureName: 'Custom Feature' });
    expect(screen.getByText('Custom Feature')).toBeInTheDocument();
  });

  it('renders the feature description paragraph', () => {
    renderModal();
    expect(
      screen.getByText(/As a Magic action, you call forth the spirit of order/)
    ).toBeInTheDocument();
  });

  it('renders all three option buttons: Heal, Repair, Dispel', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /HealRestore up to 100 HP/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RepairDamaged objects/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DispelEvery spell of level 6/ })).toBeInTheDocument();
  });

  it('renders Font Awesome icons for each option and the header', () => {
    const { container } = renderModal();
    expect(container.querySelectorAll('i.fa-solid.fa-heart').length).toBe(1);
    expect(container.querySelectorAll('i.fa-solid.fa-hammer').length).toBe(1);
    expect(container.querySelectorAll('i.fa-solid.fa-wand-magic-sparkles').length).toBe(1);
    expect(container.querySelectorAll('i.fa-solid.fa-gears').length).toBe(1);
  });

  it('renders description text for each option', () => {
    renderModal();
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

  it('renders Cancel button', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  // ── Option selection ──

  it('calls onChoose with "heal" when Heal option is clicked', () => {
    const onChoose = vi.fn();
    renderModal({ onChoose });
    fireEvent.click(screen.getByRole('button', { name: /HealRestore up to 100 HP/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('heal');
  });

  it('calls onChoose with "repair" when Repair option is clicked', () => {
    const onChoose = vi.fn();
    renderModal({ onChoose });
    fireEvent.click(screen.getByRole('button', { name: /RepairDamaged objects/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('repair');
  });

  it('calls onChoose with "dispel" when Dispel option is clicked', () => {
    const onChoose = vi.fn();
    renderModal({ onChoose });
    fireEvent.click(screen.getByRole('button', { name: /DispelEvery spell of level 6/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('dispel');
  });

  // ── Cancel button ──

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Overlay close behavior ──

  it('calls onClose when clicking the overlay background', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const overlay = document.querySelector('.sp-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal content', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const modal = document.querySelector('.sp-modal');
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Modal structure ──

  it('renders with sp-header, sp-body, and sp-actions sections', () => {
    renderModal();
    expect(document.querySelector('.sp-header')).toBeInTheDocument();
    expect(document.querySelector('.sp-body')).toBeInTheDocument();
    expect(document.querySelector('.sp-actions')).toBeInTheDocument();
  });

  it('renders options within a secondary-target-list container', () => {
    renderModal();
    expect(document.querySelector('.secondary-target-list')).toBeInTheDocument();
  });

  it('renders each option with secondary-target-name and secondary-target-hp spans', () => {
    renderModal();
    const nameSpans = document.querySelectorAll('.secondary-target-name');
    const hpSpans = document.querySelectorAll('.secondary-target-hp');
    expect(nameSpans.length).toBe(3);
    expect(hpSpans.length).toBe(3);
  });

  it('renders each option as a button with type="button"', () => {
    renderModal();
    const optionButtons = document.querySelectorAll('.clockwork-cavalcade-option');
    optionButtons.forEach(btn => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });

  it('renders the header with a gear icon', () => {
    renderModal();
    const header = document.querySelector('.sp-header');
    expect(header.querySelector('i.fa-gears')).toBeInTheDocument();
  });
});

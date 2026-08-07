// @cleaned-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpcastPopup from './UpcastPopup.jsx';

const mockSpell = {
  name: 'Fireball',
  level: 3,
};

const mockLevels = [
  { level: 3, formula: '+1d6', availableSlots: 3 },
  { level: 4, formula: '+2d6', availableSlots: 2 },
  { level: 5, formula: '+3d6', availableSlots: 0 },
];

function renderUpcastPopup(props = {}) {
  return render(
    <UpcastPopup
      spell={mockSpell}
      levels={mockLevels}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  );
}

describe('UpcastPopup cast behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls onConfirm with the default selected level when cast button clicked', () => {
    const onConfirm = vi.fn();
    renderUpcastPopup({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /Cast at Level 3/ }));
    expect(onConfirm).toHaveBeenCalledWith(3);
  });

  it('calls onConfirm with the newly selected level', () => {
    const onConfirm = vi.fn();
    renderUpcastPopup({ onConfirm });
    fireEvent.click(screen.getByText('Level 4'));
    fireEvent.click(screen.getByRole('button', { name: /Cast at Level 4/ }));
    expect(onConfirm).toHaveBeenCalledWith(4);
  });

  it('calls onConfirm with level as a number not a string', () => {
    const onConfirm = vi.fn();
    renderUpcastPopup({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /Cast at Level 3/ }));
    expect(typeof onConfirm.mock.calls[0][0]).toBe('number');
  });

  it('does not call onConfirm when cast button is disabled', () => {
    const onConfirm = vi.fn();
    const levels = [{ level: 3, formula: '+1d6', availableSlots: 0 }];
    renderUpcastPopup({ onConfirm, levels });
    fireEvent.click(screen.getByRole('button', { name: /Cast at Level 3/ }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('passes the correct level when selecting the highest available level', () => {
    const onConfirm = vi.fn();
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 1 },
      { level: 5, formula: '+3d6', availableSlots: 2 },
      { level: 7, formula: '+5d6', availableSlots: 3 },
    ];
    renderUpcastPopup({ onConfirm, levels });
    fireEvent.click(screen.getByText('Level 7'));
    fireEvent.click(screen.getByRole('button', { name: /Cast at Level 7/ }));
    expect(onConfirm).toHaveBeenCalledWith(7);
  });
});

describe('UpcastPopup cancel behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    renderUpcastPopup({ onCancel });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when pressing Escape key', () => {
    const onCancel = vi.fn();
    renderUpcastPopup({ onCancel });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when overlay is clicked', () => {
    const onCancel = vi.fn();
    renderUpcastPopup({ onCancel });
    const overlay = document.querySelector('.popup-overlay');
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when modal content is clicked', () => {
    const onCancel = vi.fn();
    renderUpcastPopup({ onCancel });
    const modal = document.querySelector('.popup-modal.upcast-popup');
    fireEvent.click(modal);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not call onCancel for non-Escape keys', () => {
    const onCancel = vi.fn();
    renderUpcastPopup({ onCancel });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not call onCancel for other modifier keys', () => {
    const onCancel = vi.fn();
    renderUpcastPopup({ onCancel });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('UpcastPopup event listener cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('removes the keydown event listener on unmount', () => {
    const onCancel = vi.fn();
    const { unmount } = renderUpcastPopup({ onCancel });
    unmount();
    // After unmount, pressing Escape should not trigger onCancel
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('still responds to Escape before unmount', () => {
    const onCancel = vi.fn();
    const { unmount } = renderUpcastPopup({ onCancel });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    unmount();
  });
});

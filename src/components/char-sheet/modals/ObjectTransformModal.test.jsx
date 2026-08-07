import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ObjectTransformModal from './ObjectTransformModal.jsx';

// ── Test fixtures ──

const mockOnConfirm = vi.fn();
const mockOnCancel = vi.fn();

function makeProps(overrides) {
  return {
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    ...(overrides || {}),
  };
}

const OBJECT_TYPE_LABELS = [
  'Stone Block',
  'Iron Chain',
  'Wooden Crate',
  'Iron Bars',
  'Glass Vial',
  'Leather Book',
  'Bronze Statue',
  'Other Object',
];

// ── Helpers ──

function renderModal(props) {
  return render(<ObjectTransformModal {...makeProps(props)} />);
}

// ── Tests ──

describe('ObjectTransformModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Initial render ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      renderModal();
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with title and icon', () => {
      renderModal();
      expect(screen.getByText('Creature into Object')).toBeInTheDocument();
      const icon = document.querySelector('.sp-header i.fa-solid.fa-paw');
      expect(icon).toBeInTheDocument();
    });

    it('renders the instruction text', () => {
      renderModal();
      expect(
        screen.getByText('Select the object form for the transformation:')
      ).toBeInTheDocument();
    });

    it('renders all 8 object type buttons', () => {
      renderModal();
      OBJECT_TYPE_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('renders Font Awesome icons on each object type button', () => {
      renderModal();
      const icons = document.querySelectorAll('.object-type-btn i.fa-solid');
      expect(icons.length).toBe(8);
    });

    it('selects Stone Block by default', () => {
      renderModal();
      const selectedBtn = document.querySelector(
        '.object-type-btn.selected'
      );
      expect(selectedBtn).toHaveTextContent('Stone Block');
    });

    it('renders Cancel button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders Transform button with icon', () => {
      renderModal();
      const transformBtn = screen.getByRole('button', { name: 'Transform' });
      expect(transformBtn).toBeInTheDocument();
      const icon = transformBtn.querySelector('i.fa-solid.fa-paw');
      expect(icon).toBeInTheDocument();
    });

    it('does not render custom object input on initial render', () => {
      renderModal();
      expect(
        document.querySelector('.custom-object-input input')
      ).not.toBeInTheDocument();
    });
  });

  // ── Object type selection ──

  describe('object type selection', () => {
    it('selects a different object type when its button is clicked', () => {
      renderModal();
      const chainBtn = screen.getByText('Iron Chain').closest('.object-type-btn');
      fireEvent.click(chainBtn);
      expect(
        document.querySelector('.object-type-btn.selected')
      ).toHaveTextContent('Iron Chain');
    });

    it('updates selection when clicking Wooden Crate', () => {
      renderModal();
      const crateBtn = screen.getByText('Wooden Crate').closest('.object-type-btn');
      fireEvent.click(crateBtn);
      expect(
        document.querySelector('.object-type-btn.selected')
      ).toHaveTextContent('Wooden Crate');
    });

    it('updates selection when clicking Glass Vial', () => {
      renderModal();
      const vialBtn = screen.getByText('Glass Vial').closest('.object-type-btn');
      fireEvent.click(vialBtn);
      expect(
        document.querySelector('.object-type-btn.selected')
      ).toHaveTextContent('Glass Vial');
    });

    it('updates selection when clicking Bronze Statue', () => {
      renderModal();
      const statueBtn = screen.getByText('Bronze Statue').closest('.object-type-btn');
      fireEvent.click(statueBtn);
      expect(
        document.querySelector('.object-type-btn.selected')
      ).toHaveTextContent('Bronze Statue');
    });

    it('shows custom object input when Other Object is selected', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      expect(
        document.querySelector('.custom-object-input input')
      ).toBeInTheDocument();
    });

    it('hides custom object input when a non-Other type is selected after Other', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      const stoneBtn = screen.getByText('Stone Block').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      expect(
        document.querySelector('.custom-object-input input')
      ).toBeInTheDocument();
      fireEvent.click(stoneBtn);
      expect(
        document.querySelector('.custom-object-input input')
      ).not.toBeInTheDocument();
    });

    it('renders the custom input with correct placeholder', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      const input = document.querySelector('.custom-object-input input');
      expect(input).toHaveAttribute('placeholder', 'Enter object description...');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('updates custom input value on change', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      const input = document.querySelector('.custom-object-input input');
      fireEvent.change(input, { target: { value: 'Ancient Rune Stone' } });
      expect(input).toHaveValue('Ancient Rune Stone');
    });
  });

  // ── Confirm behavior ──

  describe('confirm behavior', () => {
    it('calls onConfirm with selected type when Transform is clicked (default stone_block)', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('stone_block');
    });

    it('calls onConfirm with selected type value when a preset object is clicked', () => {
      renderModal();
      const chainBtn = screen.getByText('Iron Chain').closest('.object-type-btn');
      fireEvent.click(chainBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('iron_chain');
    });

    it('calls onConfirm with custom type when Other is selected and input has text', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      const input = document.querySelector('.custom-object-input input');
      fireEvent.change(input, { target: { value: 'Ancient Rune Stone' } });
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Ancient Rune Stone');
    });

    it('calls onConfirm with "Stone Block" fallback when Other is selected but input is empty', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Stone Block');
    });

    it('calls onConfirm with trimmed custom type when input has surrounding whitespace', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      const input = document.querySelector('.custom-object-input input');
      fireEvent.change(input, { target: { value: '  Magic Orb  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Magic Orb');
    });

    it('calls onConfirm with glass_vial when Glass Vial is selected', () => {
      renderModal();
      const vialBtn = screen.getByText('Glass Vial').closest('.object-type-btn');
      fireEvent.click(vialBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('glass_vial');
    });

    it('calls onConfirm with leather_book when Leather Book is selected', () => {
      renderModal();
      const bookBtn = screen.getByText('Leather Book').closest('.object-type-btn');
      fireEvent.click(bookBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('leather_book');
    });

    it('calls onConfirm with wooden_crate when Wooden Crate is selected', () => {
      renderModal();
      const crateBtn = screen.getByText('Wooden Crate').closest('.object-type-btn');
      fireEvent.click(crateBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('wooden_crate');
    });

    it('calls onConfirm with iron_bars when Iron Bars is selected', () => {
      renderModal();
      const barsBtn = screen.getByText('Iron Bars').closest('.object-type-btn');
      fireEvent.click(barsBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('iron_bars');
    });

    it('calls onConfirm with bronze_statue when Bronze Statue is selected', () => {
      renderModal();
      const statueBtn = screen.getByText('Bronze Statue').closest('.object-type-btn');
      fireEvent.click(statueBtn);
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('bronze_statue');
    });
  });

  // ── Cancel behavior ──

  describe('cancel behavior', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when overlay is clicked', () => {
      renderModal();
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when modal content is clicked', () => {
      renderModal();
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when Cancel is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Keyboard interaction ──

  describe('keyboard interaction', () => {
    it('calls onCancel when Escape key is pressed', () => {
      renderModal();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when other keys are pressed', () => {
      renderModal();
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel when Escape is pressed after unmount', () => {
      const { unmount } = renderModal();
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  // ── Custom type whitespace handling ──

  describe('custom type whitespace handling', () => {
    it('treats whitespace-only input as empty (falls back to Stone Block)', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      const input = document.querySelector('.custom-object-input input');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Stone Block');
    });

    it('passes through custom type with internal spaces', () => {
      renderModal();
      const otherBtn = screen.getByText('Other Object').closest('.object-type-btn');
      fireEvent.click(otherBtn);
      const input = document.querySelector('.custom-object-input input');
      fireEvent.change(input, { target: { value: 'Iron Chain Link' } });
      fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
      expect(mockOnConfirm).toHaveBeenCalledWith('Iron Chain Link');
    });
  });
});

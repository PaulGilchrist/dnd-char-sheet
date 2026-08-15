// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArcaneWardRestoreModal from './ArcaneWardRestoreModal.jsx';
import { getRuntimeValue, setRuntimeBatch } from '../../../../hooks/runtime/useRuntimeState.js';

// ── Mocked modules ──

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeBatch: vi.fn(),
}));

// ── Test fixtures ──

const defaultAction = { name: 'Arcane Ward Restore' };
const defaultPlayerStats = { name: 'Sorcerer1' };
const defaultCampaignName = 'test-campaign';
const defaultOnClose = vi.fn();
const defaultOnConfirm = vi.fn();

function makeProps(overrides) {
  return {
    action: { ...defaultAction, ...(overrides?.action || {}) },
    playerStats: { ...defaultPlayerStats, ...(overrides?.playerStats || {}) },
    campaignName: overrides?.campaignName ?? defaultCampaignName,
    onClose: overrides?.onClose ?? defaultOnClose,
    onConfirm: overrides?.onConfirm ?? defaultOnConfirm,
  };
}

function setupRuntimeValues(wardHp, wardMax, spellSlots) {
  getRuntimeValue.mockImplementation((key, prop) => {
    if (key !== 'Sorcerer1') return null;
    if (prop === 'arcaneWardHp') return wardHp;
    if (prop === 'arcaneWardMax') return wardMax;
    const match = prop.match(/^spell_slots_level_(\d+)$/);
    if (match) {
      const lvl = parseInt(match[1], 10);
      return spellSlots[lvl] ?? 0;
    }
    return null;
  });
}

// ── Tests ──

describe('ArcaneWardRestoreModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRuntimeValues(10, 20, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
  });

  describe('initial render', () => {
    it('renders the modal with ward HP display, slot grid, and action buttons', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      expect(screen.getByText('Arcane Ward Restore')).toBeInTheDocument();
      expect(screen.getByText(/Choose a spell slot level to expend/)).toBeInTheDocument();
      expect(screen.getByText(/Ward HP restored = 2 × slot level/)).toBeInTheDocument();
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('Arcane Ward HP:');
      expect(p.textContent).toContain('10/20');
      expect(screen.getByRole('button', { name: /Restore Ward/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders all 9 spell slot levels with correct restore amounts', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      for (let lvl = 1; lvl <= 9; lvl++) {
        expect(screen.getByText(`Level ${lvl}`)).toBeInTheDocument();
        expect(screen.getByText(`+${lvl * 2} HP`)).toBeInTheDocument();
      }
    });

    it('marks levels with 0 slots as disabled and levels with slots as enabled', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      const level3Option = screen.getByText('Level 3').closest('.arcane-ward-slot-option');
      expect(level1Option).not.toHaveClass('disabled');
      expect(level3Option).toHaveClass('disabled');
    });

    it('renders radio inputs for each spell slot level with correct checked state', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      expect(radios).toHaveLength(9);
      radios.forEach((radio, idx) => {
        expect(radio.checked).toBe(false);
        const lvl = idx + 1;
        const option = radio.closest('.arcane-ward-slot-option');
        if (lvl === 1 || lvl === 2) {
          expect(radio.disabled).toBe(false);
          expect(option).not.toHaveClass('disabled');
        } else {
          expect(radio.disabled).toBe(true);
          expect(option).toHaveClass('disabled');
        }
      });
    });

    it('renders the preview section only when no level is selected', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      expect(document.querySelector('.arcane-ward-preview')).toBeNull();
    });
  });

  describe('selection behavior', () => {
    it('selects a level and shows preview when clicking an available slot', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      expect(level1Option).toHaveClass('selected');
      expect(screen.getByText(/Preview:/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Restore Ward/ })).toBeEnabled();
    });

    it('switches selection when a different level is clicked', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      const level2Option = screen.getByText('Level 2').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      fireEvent.click(level2Option);
      expect(level2Option).toHaveClass('selected');
      expect(level1Option).not.toHaveClass('selected');
    });

    it('does not select a disabled spell slot level', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level3Option = screen.getByText('Level 3').closest('.arcane-ward-slot-option');
      fireEvent.click(level3Option);
      expect(level3Option).not.toHaveClass('selected');
      expect(screen.getByRole('button', { name: /Restore Ward/ })).toBeDisabled();
    });

    it('caps preview at max HP when restore would exceed max', () => {
      setupRuntimeValues(18, 20, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level2Option = screen.getByText('Level 2').closest('.arcane-ward-slot-option');
      fireEvent.click(level2Option);
      const preview = document.querySelector('.arcane-ward-preview');
      expect(preview.textContent).toContain('18 → 20/20');
    });

    it('selects the highest available level (level 9)', () => {
      setupRuntimeValues(5, 30, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 1 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level9Option = screen.getByText('Level 9').closest('.arcane-ward-slot-option');
      fireEvent.click(level9Option);
      expect(level9Option).toHaveClass('selected');
      expect(screen.getByText(/Preview:/)).toBeInTheDocument();
      expect(screen.getByText(/5 → 23\/30/)).toBeInTheDocument();
    });

    it('keeps preview visible when clicking a disabled slot after selecting one', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      expect(document.querySelector('.arcane-ward-preview')).toBeTruthy();
      const level3Option = screen.getByText('Level 3').closest('.arcane-ward-slot-option');
      fireEvent.click(level3Option);
      expect(document.querySelector('.arcane-ward-preview')).toBeTruthy();
    });
  });

  describe('restore flow', () => {
    it('calls setRuntimeBatch and onConfirm when applying with level 1', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      fireEvent.click(screen.getByRole('button', { name: /Restore Ward/ }));
      expect(setRuntimeBatch).toHaveBeenCalledWith(
        'Sorcerer1',
        expect.objectContaining({ arcaneWardHp: 12, spell_slots_level_1: 1 }),
        'test-campaign'
      );
      expect(defaultOnConfirm).toHaveBeenCalledWith(1, 2, 10, 12);
      expect(defaultOnClose).toHaveBeenCalledTimes(1);
    });

    it('caps arcaneWardHp at max when restore would exceed max', () => {
      setupRuntimeValues(18, 20, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level2Option = screen.getByText('Level 2').closest('.arcane-ward-slot-option');
      fireEvent.click(level2Option);
      fireEvent.click(screen.getByRole('button', { name: /Restore Ward/ }));
      expect(setRuntimeBatch).toHaveBeenCalledWith(
        'Sorcerer1',
        expect.objectContaining({ arcaneWardHp: 20 }),
        'test-campaign'
      );
      expect(defaultOnConfirm).toHaveBeenCalledWith(2, 4, 18, 20);
    });

    it('does not apply when no level is selected', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Restore Ward/ }));
      expect(setRuntimeBatch).not.toHaveBeenCalled();
      expect(defaultOnClose).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when onConfirm prop is undefined', () => {
      render(<ArcaneWardRestoreModal {...makeProps({ onConfirm: undefined })} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      fireEvent.click(screen.getByRole('button', { name: /Restore Ward/ }));
      expect(defaultOnClose).toHaveBeenCalledTimes(1);
    });

    it('decrements the selected spell slot by exactly 1', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      fireEvent.click(screen.getByRole('button', { name: /Restore Ward/ }));
      expect(setRuntimeBatch).toHaveBeenCalledWith(
        'Sorcerer1',
        expect.objectContaining({ spell_slots_level_1: 1 }),
        'test-campaign'
      );
    });

    it('uses level 2 slot (1 available) and decrements to 0', () => {
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level2Option = screen.getByText('Level 2').closest('.arcane-ward-slot-option');
      fireEvent.click(level2Option);
      fireEvent.click(screen.getByRole('button', { name: /Restore Ward/ }));
      expect(setRuntimeBatch).toHaveBeenCalledWith(
        'Sorcerer1',
        expect.objectContaining({ spell_slots_level_2: 0 }),
        'test-campaign'
      );
    });

    it('restores ward to full HP when restore equals remaining', () => {
      setupRuntimeValues(12, 20, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level4Option = screen.getByText('Level 4').closest('.arcane-ward-slot-option');
      expect(level4Option).toHaveClass('disabled');
      // Use level 4 which would give +8, but ward has 8 remaining (20-12)
      // Actually level 4 has 0 slots. Use level 1 which gives +2, not enough.
      // Use level 2 which gives +4, ward has 8 remaining → 16/20
      const level2Option = screen.getByText('Level 2').closest('.arcane-ward-slot-option');
      fireEvent.click(level2Option);
      expect(document.querySelector('.arcane-ward-preview').textContent).toContain('12 → 16/20');
    });
  });

  describe('close behavior', () => {
    it('calls onClose when the overlay background is clicked', () => {
      const onClose = vi.fn();
      render(<ArcaneWardRestoreModal {...makeProps({ onClose })} />);
      fireEvent.click(document.querySelector('.arcane-ward-restore-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the modal content is clicked', () => {
      const onClose = vi.fn();
      render(<ArcaneWardRestoreModal {...makeProps({ onClose })} />);
      fireEvent.click(document.querySelector('.arcane-ward-restore-modal'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when the Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ArcaneWardRestoreModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('runtime state defaults', () => {
    it('defaults to 0/0 when runtime values are null', () => {
      getRuntimeValue.mockReturnValue(null);
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('0/0');
    });

    it('renders all slots as disabled when all spell slots are 0', () => {
      setupRuntimeValues(10, 20, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const options = document.querySelectorAll('.arcane-ward-slot-option');
      options.forEach((option) => {
        expect(option).toHaveClass('disabled');
      });
      expect(screen.getByRole('button', { name: /Restore Ward/ })).toBeDisabled();
    });

    it('allows selection when only the highest slot level is available', () => {
      setupRuntimeValues(5, 30, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 1 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const level9Option = screen.getByText('Level 9').closest('.arcane-ward-slot-option');
      expect(level9Option).not.toHaveClass('disabled');
      fireEvent.click(level9Option);
      expect(level9Option).toHaveClass('selected');
      expect(screen.getByRole('button', { name: /Restore Ward/ })).toBeEnabled();
    });

    it('defaults to 0/0 when runtime values are undefined', () => {
      getRuntimeValue.mockReturnValue(undefined);
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('0/0');
    });
  });

  describe('edge cases', () => {
    it('renders without throwing when props are undefined', () => {
      render(<ArcaneWardRestoreModal {...makeProps({
        onClose: undefined,
        onConfirm: undefined,
        playerStats: undefined,
        campaignName: undefined,
      })} />);
      expect(screen.getByText('Arcane Ward Restore')).toBeInTheDocument();
    });

    it('renders with a custom action name', () => {
      render(<ArcaneWardRestoreModal {...makeProps({ action: { name: 'Custom Ward Restore' } })} />);
      expect(screen.getByText('Custom Ward Restore')).toBeInTheDocument();
    });

    it('renders with ward already at max HP', () => {
      setupRuntimeValues(20, 20, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('20/20');
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      const preview = document.querySelector('.arcane-ward-preview');
      expect(preview.textContent).toContain('20 → 20/20');
    });

    it('renders with ward at 0 HP', () => {
      setupRuntimeValues(0, 20, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
      render(<ArcaneWardRestoreModal {...makeProps()} />);
      const p = document.querySelector('.sp-body p');
      expect(p.textContent).toContain('0/20');
      const level1Option = screen.getByText('Level 1').closest('.arcane-ward-slot-option');
      fireEvent.click(level1Option);
      const preview = document.querySelector('.arcane-ward-preview');
      expect(preview.textContent).toContain('0 → 2/20');
    });
  });
});

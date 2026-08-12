import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagicInitiateModal, createProps } from './MagicInitiateModal.fixtures.js';
import { renderMarkdown } from '../../services/ui/sanitize.js';

vi.mock('../../services/ui/sanitize.js', () => ({
  renderMarkdown: vi.fn((md) => `<p>${md}</p>`),
}));

describe('MagicInitiateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
  });

  describe('save all behavior', () => {
    it('should call onArrayFieldChange for spells with all selected spells', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      const cantrip2Select = screen.getByText('Cantrip 2:').nextElementSibling;
      fireEvent.change(cantrip2Select, { target: { value: 'Chill Touch' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      const saveBtn = screen.getByRole('button', { name: 'Save Instance' });
      fireEvent.click(saveBtn);

      // After saving, editingIndex is null and instances exist, so Save All is visible
      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).toHaveBeenCalledWith('spells', [
        'Acid Splash',
        'Chill Touch',
        'Burning Hands',
      ]);
    });

    it('should call onArrayFieldChange for magicInitiateInstances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      const cantrip2Select = screen.getByText('Cantrip 2:').nextElementSibling;
      fireEvent.change(cantrip2Select, { target: { value: 'Chill Touch' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).toHaveBeenCalledWith('magicInitiateInstances', [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
      ]);
    });

    it('should call onClose after saving all', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      const cantrip2Select = screen.getByText('Cantrip 2:').nextElementSibling;
      fireEvent.change(cantrip2Select, { target: { value: 'Chill Touch' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when validation fails on save all', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // Add an instance but don't fill anything in
      fireEvent.click(screen.getByText('Add Another Instance'));
      // Don't fill anything - just cancel to get summary with empty instance
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should deduplicate spells when adding to existing spells array', () => {
      const props = createProps({
        formData: { spells: ['Acid Splash'] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      const cantrip2Select = screen.getByText('Cantrip 2:').nextElementSibling;
      fireEvent.change(cantrip2Select, { target: { value: 'Chill Touch' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      // Acid Splash should only appear once
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('spells', [
        'Acid Splash',
        'Chill Touch',
        'Burning Hands',
      ]);
    });

    it('should merge spells from multiple instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // First instance: Wizard
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect1 = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect1, { target: { value: 'Wizard' } });

      const cantrip1Select1 = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select1, { target: { value: 'Acid Splash' } });

      const cantrip2Select1 = screen.getByText('Cantrip 2:').nextElementSibling;
      fireEvent.change(cantrip2Select1, { target: { value: 'Chill Touch' } });

      const level1Select1 = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select1, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      // Second instance: Sorcerer (has Dancing Lights, Acid Splash, Chill Touch)
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect2 = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect2, { target: { value: 'Sorcerer' } });

      const cantrip1Select2 = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select2, { target: { value: 'Dancing Lights' } });

      const cantrip2Select2 = screen.getByText('Cantrip 2:').nextElementSibling;
      fireEvent.change(cantrip2Select2, { target: { value: 'Acid Splash' } });

      const level1Select2 = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select2, { target: { value: 'Shield' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).toHaveBeenCalledWith('magicInitiateInstances', [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
        {
          class: 'Sorcerer',
          cantrips: ['Dancing Lights', 'Acid Splash'],
          level1Spell: 'Shield',
        },
      ]);
    });

    it('should NOT call onArrayFieldChange when validation fails', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // Add empty instance and cancel
      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).not.toHaveBeenCalled();
    });
  });
});

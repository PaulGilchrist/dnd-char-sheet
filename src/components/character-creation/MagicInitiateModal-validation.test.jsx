// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MagicInitiateModal, createProps } from './MagicInitiateModal.fixtures.js';

describe('MagicInitiateModal - Validation', () => {
  describe('required field errors', () => {
    it('should show error when saving with empty class', () => {
      const existingInstances = [
        { class: 'Bard', cantrips: ['Dancing Lights', 'Acid Splash'], level1Spell: 'Heroism' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: '' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Class is required')).toBeInTheDocument();
    });

    it('should show error when saving without cantrip 1', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 1 is required')).toBeInTheDocument();
    });

    it('should show error when saving without cantrip 2', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 2 is required')).toBeInTheDocument();
    });

    it('should show error when saving without level 1 spell', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Level 1 spell is required')).toBeInTheDocument();
    });

    it('should show all required errors at once when class is set but spells are empty', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: [null, null], level1Spell: null },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 1 is required')).toBeInTheDocument();
      expect(screen.getByText('Cantrip 2 is required')).toBeInTheDocument();
      expect(screen.getByText('Level 1 spell is required')).toBeInTheDocument();
    });
  });

  describe('class membership validation', () => {
    it('should show "Not a valid" error when cantrip is not from selected class', () => {
      // Load an instance where cantrips contain a spell not in the selected class.
      // Guidance is a Cleric/Druid cantrip, not a Wizard cantrip.
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Guidance', 'Acid Splash'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText(/Not a valid Wizard cantrip/)).toBeInTheDocument();
    });

    it('should show "Not a valid" error when level 1 spell is not from selected class', () => {
      // Bless is a Cleric spell, not a Wizard spell.
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Bless',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText(/Not a valid Wizard level 1 spell/)).toBeInTheDocument();
    });
  });

  describe('duplicate cantrip validation', () => {
    it('should show "Must be different from Cantrip 1" when both cantrips are the same', () => {
      // The UI's updateCantrip auto-prevents duplicates, so we test the validation
      // by loading an instance that already has duplicate cantrips from saved data.
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Acid Splash'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Must be different from Cantrip 1')).toBeInTheDocument();
    });
  });

  describe('error clearing', () => {
    it('should clear errors when class is changed', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: [null, null], level1Spell: null },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 1 is required')).toBeInTheDocument();

      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      expect(screen.queryByText('Cantrip 1 is required')).not.toBeInTheDocument();
    });

    it('should clear errors when starting edit on an instance', () => {
      const existingInstances = [
        { class: '', cantrips: [null, null], level1Spell: null },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Class is required')).toBeInTheDocument();

      // Cancel and re-edit to trigger startEdit which clears errors
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      expect(screen.queryByText('Class is required')).not.toBeInTheDocument();
    });

    it('should clear errors when adding a new instance', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 1 is required')).toBeInTheDocument();

      // Cancel and add a new instance
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      fireEvent.click(screen.getByText('Add Another Instance'));

      expect(screen.queryByText('Cantrip 1 is required')).not.toBeInTheDocument();
    });
  });

  describe('valid submission', () => {
    it('should not show any validation errors when all fields are valid', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const selects = document.querySelectorAll('.mi-selector-select');
      const cantrip1Select = selects[1];
      const cantrip2Select = selects[2];
      const level1Select = selects[3];

      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });
      fireEvent.change(cantrip2Select, { target: { value: 'Chill Touch' } });
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.queryByText(/required/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Not a valid/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Must be different/)).not.toBeInTheDocument();
    });

    it('should show errors when cantrips have no second option for the class', () => {
      // Guidance is the only Cleric cantrip in mock data, so cantrip 2 cannot be filled
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      const selects = document.querySelectorAll('.mi-selector-select');
      const cantrip1Select = selects[1];
      const level1Select = selects[3];

      // Guidance is a valid Cleric cantrip
      fireEvent.change(cantrip1Select, { target: { value: 'Guidance' } });

      // Bless is a valid Cleric level 1 spell
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      // cantrip2 has no valid Cleric option (Guidance is the only one, and selecting it
      // would trigger duplicate prevention), so it should show a required error
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 2 is required')).toBeInTheDocument();
    });
  });
});

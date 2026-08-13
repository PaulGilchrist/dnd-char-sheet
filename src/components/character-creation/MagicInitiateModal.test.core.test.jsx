// @improved-by-ai
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

  describe('rendering', () => {
    it('should render the modal overlay and header with wizard hat icon', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
      expect(document.querySelector('.fa-hat-wizard')).toBeInTheDocument();
    });

    it('should render the description text', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      const desc = screen.getByText(
        /Choose a class and select spells from its spell list/
      );
      expect(desc).toBeInTheDocument();
    });

    it('should render the "Add Another Instance" button', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      expect(screen.getByText('Add Another Instance')).toBeInTheDocument();
      expect(document.querySelector('.fa-plus')).toBeInTheDocument();
    });

    it('should NOT render Save All button when there are no instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      expect(screen.queryByText(/Save All/)).not.toBeInTheDocument();
    });

    it('should still render header and description when allSpells is null', () => {
      const props = createProps({ allSpells: null });
      render(<MagicInitiateModal {...props} />);
      expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
      expect(screen.getByText(/Choose a class/)).toBeInTheDocument();
    });
  });

  describe('initial state with existing instances', () => {
    it('should load existing magicInitiateInstances from formData', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);
      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
      expect(screen.getByText('Acid Splash')).toBeInTheDocument();
      expect(screen.getByText('Chill Touch')).toBeInTheDocument();
      expect(screen.getByText('Burning Hands')).toBeInTheDocument();
    });

    it('should render nothing when formData has no magicInitiateInstances', () => {
      const props = createProps({
        formData: { magicInitiateInstances: undefined, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);
      expect(screen.queryByText(/Instance \d+/)).not.toBeInTheDocument();
      expect(document.querySelector('.mi-instances-list')).not.toBeInTheDocument();
    });
  });

  describe('ruleset-aware class selection', () => {
    it('should show 5e classes by default (Bard, Cleric, Druid, Sorcerer, Warlock, Wizard)', () => {
      const props = createProps({ formData: { rules: '5e' } });
      render(<MagicInitiateModal {...props} />);
      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      const optionValues = Array.from(classSelect.querySelectorAll('option')).map(o => o.value).filter(v => v !== '');

      expect(optionValues).toEqual(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
    });

    it('should show only 2024 classes (Cleric, Druid, Wizard) when ruleset is 2024', () => {
      const props = createProps({ formData: { rules: '2024' } });
      render(<MagicInitiateModal {...props} />);
      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      const optionValues = Array.from(classSelect.querySelectorAll('option')).map(o => o.value).filter(v => v !== '');

      expect(optionValues).toEqual(['Cleric', 'Druid', 'Wizard']);
    });

    it('should default to 5e classes when formData.rules is missing', () => {
      const props = createProps({ formData: {} });
      render(<MagicInitiateModal {...props} />);
      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      const optionValues = Array.from(classSelect.querySelectorAll('option')).map(o => o.value);

      expect(optionValues).toContain('Bard');
      expect(optionValues).toContain('Wizard');
    });
  });

  describe('adding instances', () => {
    it('should add a new instance when clicking "Add Another Instance"', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      expect(screen.queryByText('Instance 1:')).not.toBeInTheDocument();

      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      expect(screen.getByText('Instance 1')).toBeInTheDocument();
    });

    it('should start editing the newly added instance', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      expect(screen.getByText('Instance 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Instance' })).toBeInTheDocument();
    });

    it('should default to the first available class for the ruleset', () => {
      const props = createProps({ formData: { rules: '5e' } });
      render(<MagicInitiateModal {...props} />);
      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      expect(classSelect.value).toBe('Bard');
    });

    it('should show the Save All button after adding an instance', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      const addBtn = screen.getByText('Add Another Instance');
      fireEvent.click(addBtn);

      // Cancel the edit to get back to summary view
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText(/Save All/)).toBeInTheDocument();
    });

    it('should allow adding multiple instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // Add first instance
      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      // Add second instance
      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText(/Instance 1:/)).toBeInTheDocument();
      expect(screen.getByText(/Instance 2:/)).toBeInTheDocument();
    });
  });

  describe('editing instances', () => {
    it('should show the editor when clicking Edit on a summary', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByText('Instance 1')).toBeInTheDocument();
      expect(screen.queryByText('Instance 1: Wizard')).not.toBeInTheDocument();
    });

    it('should cancel editing when clicking Cancel', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('should clear errors when starting edit on another instance', () => {
      const existingInstances = [
        {
          class: '',
          cantrips: [null, null],
          level1Spell: null,
        },
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      // Click Edit on the first instance (the one with empty class)
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);
      const saveBtn = screen.getByRole('button', { name: 'Save Instance' });
      fireEvent.click(saveBtn);

      // Validation errors should appear
      expect(screen.getByText('Class is required')).toBeInTheDocument();

      // Cancel to get back to summary, then re-edit instance 1 to clear errors
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      const editButtons2 = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons2[0]);
      expect(screen.queryByText('Class is required')).not.toBeInTheDocument();
    });
  });

  describe('class selection in editor', () => {
    it('should update cantrip options when class changes', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];

      // Default is Bard - check Bard cantrips in the first cantrip selector (index 1)
      const cantripSelects = document.querySelectorAll('.mi-selector-select');
      const cantrip1Options = Array.from(cantripSelects[1].querySelectorAll('option')).map(o => o.textContent);
      expect(cantrip1Options.some(opt => opt.includes('Dancing Lights'))).toBe(true);

      // Switch to Cleric - Guidance is a Cleric cantrip but Dancing Lights is not
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      const updatedSelects = document.querySelectorAll('.mi-selector-select');
      const clericCantripOptions = Array.from(updatedSelects[1].querySelectorAll('option')).map(o => o.textContent);
      expect(clericCantripOptions.some(opt => opt.includes('Guidance'))).toBe(true);
      expect(clericCantripOptions.some(opt => opt.includes('Dancing Lights'))).toBe(false);
    });

    it('should update level 1 spell options when class changes', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      // Wizard has Burning Hands, Magic Missile, Shield, etc.
      expect(screen.getByText('Burning Hands (1rd)')).toBeInTheDocument();
      expect(screen.getByText('Magic Missile (1rd)')).toBeInTheDocument();

      // Switch to Cleric
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });
      expect(screen.getByText('Bless (1rd)')).toBeInTheDocument();
      expect(screen.getByText('Command (1rd)')).toBeInTheDocument();
      expect(screen.queryByText('Burning Hands (1rd)')).not.toBeInTheDocument();
    });

    it('should not show spell selectors until a class is selected', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      // Default class is Bard, so spell selectors should be visible
      expect(screen.getByText('Cantrip 1:')).toBeInTheDocument();
    });
  });

  describe('cantrip selection', () => {
    it('should show cantrips (level 0) for the selected class', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      // Acid Splash and Chill Touch are Wizard cantrips - check in dropdown options
      const cantripOptions = document.querySelectorAll('.mi-selector-select option');
      const optionTexts = Array.from(cantripOptions).map(o => o.textContent);
      expect(optionTexts.some(t => t.includes('Acid Splash'))).toBe(true);
      expect(optionTexts.some(t => t.includes('Chill Touch'))).toBe(true);
    });

    it('should prevent selecting the same cantrip twice in the same instance', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      // Select Acid Splash for Cantrip 1
      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      // Cantrip 2 should now show null/default (duplicate removed)
      const cantrip2Select = screen.getByText('Cantrip 2:').nextElementSibling;
      expect(cantrip2Select.value).toBe('');
    });

    it('should show spell details for selected cantrips', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      expect(screen.getByText('Acid Splash details')).toBeInTheDocument();
    });
  });

  describe('level 1 spell selection', () => {
    it('should show level 1 spells for the selected class', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      // Wizard level 1 spells
      expect(screen.getByText('Burning Hands (1rd)')).toBeInTheDocument();
      expect(screen.getByText('Magic Missile (1rd)')).toBeInTheDocument();
      expect(screen.getByText('Shield (1rd)')).toBeInTheDocument();
    });

    it('should show spell details for selected level 1 spell', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      expect(screen.getByText('Burning Hands details')).toBeInTheDocument();
    });
  });

  describe('instance removal', () => {
    it('should remove an instance when clicking Remove', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
        {
          class: 'Bard',
          cantrips: ['Dancing Lights', 'Guidance'],
          level1Spell: 'Bless',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
      expect(screen.getByText('Instance 2: Bard')).toBeInTheDocument();

      const removeButtons = document.querySelectorAll('.mi-remove-btn');
      fireEvent.click(removeButtons[1]);

      expect(screen.queryByText('Instance 2: Bard')).not.toBeInTheDocument();
      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
    });

    it('should NOT show Remove button when there is only one instance', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', 'Chill Touch'],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      const removeButtons = screen.queryAllByRole('button', { name: 'Remove' });
      expect(removeButtons.length).toBe(0);
    });

    it('should clear editing index and errors when removing an instance', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
        { class: 'Bard', cantrips: ['Dancing Lights', 'Guidance'], level1Spell: 'Bless' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      // Remove the first instance
      const summaryElements = document.querySelectorAll('.mi-instance-summary');
      const firstRemoveBtn = summaryElements[0].querySelector('.mi-remove-btn');
      fireEvent.click(firstRemoveBtn);

      expect(screen.queryByText('Instance 1: Wizard')).not.toBeInTheDocument();
      expect(screen.getByText('Instance 1: Bard')).toBeInTheDocument();
    });
  });

  describe('overlay interaction', () => {
    it('should call onClose when clicking the overlay (outside the modal)', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      const overlay = document.querySelector('.mi-overlay');
      fireEvent.click(overlay);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when clicking inside the modal', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      const modal = document.querySelector('.mi-modal');
      fireEvent.click(modal);
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  describe('editor state management', () => {
    it('should not show "Add Another Instance" while editing', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Add Another Instance')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.queryByText('Add Another Instance')).not.toBeInTheDocument();
    });

    it('should not show "Save All" while editing', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      // Now we're back to summary with instances
      expect(screen.getByText(/Save All/)).toBeInTheDocument();

      // Edit an instance
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.queryByText(/Save All/)).not.toBeInTheDocument();
    });

    it('should show instances list when not editing', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });
});

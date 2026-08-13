// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagicInitiateModal, createProps } from './MagicInitiateModal.fixtures.js';

describe('MagicInitiateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('save all behavior', () => {
    it('should call onArrayFieldChange for spells with deduplicated list from a single instance', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));

      const selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Wizard' } });
      fireEvent.change(selects[1], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[2], { target: { value: 'Chill Touch' } });
      fireEvent.change(selects[3], { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(1, 'spells', [
        'Acid Splash',
        'Chill Touch',
        'Burning Hands',
      ]);
    });

    it('should call onArrayFieldChange for magicInitiateInstances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));

      const selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Wizard' } });
      fireEvent.change(selects[1], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[2], { target: { value: 'Chill Touch' } });
      fireEvent.change(selects[3], { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      fireEvent.click(screen.getByRole('button', { name: /Save All/ }));

      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(2, 'magicInitiateInstances', [
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

      const selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Wizard' } });
      fireEvent.change(selects[1], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[2], { target: { value: 'Chill Touch' } });
      fireEvent.change(selects[3], { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      fireEvent.click(screen.getByRole('button', { name: /Save All/ }));

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onArrayFieldChange or onClose when validation fails', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // Add instance and try to save without filling spells — validation will fail
      fireEvent.click(screen.getByText('Add Another Instance'));
      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      expect(screen.getByText('Cantrip 1 is required')).toBeInTheDocument();
      expect(screen.getByText('Cantrip 2 is required')).toBeInTheDocument();
      expect(screen.getByText('Level 1 spell is required')).toBeInTheDocument();

      // Cancel — instance stays in list with invalid data
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should deduplicate spells when adding to existing spells array', () => {
      const props = createProps({
        formData: { spells: ['Acid Splash'] },
      });
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));

      const selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Wizard' } });
      fireEvent.change(selects[1], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[2], { target: { value: 'Chill Touch' } });
      fireEvent.change(selects[3], { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      fireEvent.click(screen.getByRole('button', { name: /Save All/ }));

      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(1, 'spells', [
        'Acid Splash',
        'Chill Touch',
        'Burning Hands',
      ]);
    });

    it('should merge spells from multiple instances preserving order', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // First instance: Wizard
      fireEvent.click(screen.getByText('Add Another Instance'));

      let selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Wizard' } });
      fireEvent.change(selects[1], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[2], { target: { value: 'Chill Touch' } });
      fireEvent.change(selects[3], { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      // Second instance: Sorcerer
      fireEvent.click(screen.getByText('Add Another Instance'));

      selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Sorcerer' } });
      fireEvent.change(selects[1], { target: { value: 'Dancing Lights' } });
      fireEvent.change(selects[2], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[3], { target: { value: 'Shield' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      fireEvent.click(screen.getByRole('button', { name: /Save All/ }));

      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(
        2,
        'magicInitiateInstances',
        [
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
        ]
      );
    });

    it('should call onArrayFieldChange twice: spells first, then instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));

      const selects = document.querySelectorAll('.mi-selector-select');
      fireEvent.change(selects[0], { target: { value: 'Wizard' } });
      fireEvent.change(selects[1], { target: { value: 'Acid Splash' } });
      fireEvent.change(selects[2], { target: { value: 'Chill Touch' } });
      fireEvent.change(selects[3], { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

      fireEvent.click(screen.getByRole('button', { name: /Save All/ }));

      expect(props.onArrayFieldChange).toHaveBeenCalledTimes(2);
    });

    it('should NOT call onArrayFieldChange when there are no instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      expect(screen.queryByRole('button', { name: /Save All/ })).not.toBeInTheDocument();
      expect(props.onArrayFieldChange).not.toHaveBeenCalled();
    });

    it('should NOT save when an instance has cantrips not from the selected class', () => {
      // Load an instance where cantrips are from a different class than the saved class.
      // Guidance is a Cleric/Druid cantrip, not a Bard cantrip.
      const existingInstances = [
        {
          class: 'Bard',
          cantrips: ['Dancing Lights', 'Guidance'],
          level1Spell: 'Heroism',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      // Click Save All without editing — validation should catch Guidance is not a Bard cantrip
      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should NOT save when an instance has a level 1 spell not from the selected class', () => {
      // Bless is a Cleric spell, not a Bard spell.
      const existingInstances = [
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

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should NOT save when an instance has duplicate cantrips', () => {
      // Both cantrips are the same — validation should catch this.
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

      const saveAllBtn = screen.getByRole('button', { name: /Save All/ });
      fireEvent.click(saveAllBtn);

      expect(props.onArrayFieldChange).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });
});

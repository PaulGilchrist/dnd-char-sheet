import { render, screen } from '@testing-library/react';
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

  describe('summary rendering', () => {
    it('should show "—" for missing cantrips in summary', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', null],
          level1Spell: 'Burning Hands',
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should show instance number in summary', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
        { class: 'Bard', cantrips: ['Dancing Lights', 'Guidance'], level1Spell: 'Bless' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
      expect(screen.getByText('Instance 2: Bard')).toBeInTheDocument();
    });

    it('should show "No class" when class is empty in summary', () => {
      const existingInstances = [
        { class: '', cantrips: [null, null], level1Spell: null },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Instance 1: No class')).toBeInTheDocument();
    });

    it('should show Edit and Remove buttons for instances (when more than 1)', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
        { class: 'Bard', cantrips: ['Dancing Lights', 'Guidance'], level1Spell: 'Bless' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      expect(editButtons.length).toBe(2);
      expect(removeButtons.length).toBe(2);
    });

    it('should show level 1 spell tag with special styling', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      const level1Tag = document.querySelector('.mi-level1-tag');
      expect(level1Tag).toBeInTheDocument();
      expect(level1Tag.textContent).toBe('Burning Hands');
    });
  });
});

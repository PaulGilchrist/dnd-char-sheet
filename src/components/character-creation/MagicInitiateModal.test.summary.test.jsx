// @improved-by-ai
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
    it('should render an empty instances list when there are no instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      // No instance summaries should be visible when there are no instances
      expect(screen.queryByText(/Instance \d+/)).not.toBeInTheDocument();
      // The instances list container should be empty/absent
      expect(document.querySelector('.mi-instances-list')).not.toBeInTheDocument();
    });

    it('should show instance numbers and class names in summary', () => {
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
      // Each instance should have its own summary container
      expect(document.querySelectorAll('.mi-instance-summary').length).toBe(2);
    });

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

    it('should show Edit and Remove buttons for instances when there are multiple', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
        { class: 'Bard', cantrips: ['Dancing Lights', 'Guidance'], level1Spell: 'Bless' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(2);
    });

    it('should show the selected spells in the summary', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Acid Splash')).toBeInTheDocument();
      expect(screen.getByText('Chill Touch')).toBeInTheDocument();
      expect(screen.getByText('Burning Hands')).toBeInTheDocument();
    });

    it('should use mi-spell-tag class for all spell tags in summary', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      const spellTags = document.querySelectorAll('.mi-spell-tag');
      expect(spellTags.length).toBe(3);
    });

    it('should show level 1 spell with mi-level1-tag class', () => {
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

    it('should show "—" for missing level 1 spell in summary', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: null },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      // The level1Tag should show "—" when no spell is selected
      const level1Tag = document.querySelector('.mi-level1-tag');
      expect(level1Tag.textContent).toBe('—');
    });
  });
});

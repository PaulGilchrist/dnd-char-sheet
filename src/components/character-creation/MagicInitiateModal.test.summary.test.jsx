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

  describe('summary rendering', () => {
    it('should render an empty instances list when there are no instances', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      expect(screen.queryByText(/Instance \d+/)).not.toBeInTheDocument();
      expect(screen.queryByText('Save All')).not.toBeInTheDocument();
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
      expect(document.querySelectorAll('.mi-instance-summary').length).toBe(2);
    });

    it('should show "—" for missing cantrips and level 1 spell in summary', () => {
      const existingInstances = [
        {
          class: 'Wizard',
          cantrips: ['Acid Splash', null],
          level1Spell: null,
        },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getAllByText('—').length).toBe(2);
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

    it('should show Edit button but hide Remove button when there is only one instance', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
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

    it('should show "Save All" button when there are instances in summary view', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByRole('button', { name: /Save All/ })).toBeInTheDocument();
      expect(screen.getByText('Add Another Instance')).toBeInTheDocument();
    });

    it('should hide summary view and controls while editing an instance', () => {
      const existingInstances = [
        { class: 'Wizard', cantrips: ['Acid Splash', 'Chill Touch'], level1Spell: 'Burning Hands' },
      ];
      const props = createProps({
        formData: { magicInitiateInstances: existingInstances, spells: [] },
      });
      render(<MagicInitiateModal {...props} />);

      expect(screen.getByText('Instance 1: Wizard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save All/ })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      expect(screen.queryByText('Instance 1: Wizard')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Save All/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Add Another Instance')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });
});

// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NPCFormModal from './NPCFormModal.jsx';

describe('NPCFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSaveAndAddToInitiative = vi.fn();
  const mockSetFormData = vi.fn();

  const defaultFormData = {
    name: '',
    race: 'Human',
    classRole: 'Wizard',
    attitude: 'neutral',
    appearance: 'Tall with a long beard',
    personality: 'Wise and mysterious',
    goals: 'Defeat Sauron',
    secrets: 'He is a Maia',
    notes: 'Carries a staff',
    tags: 'ally, quest-giver',
    image: '',
    imageName: '',
    imagePath: '',
    armorClass: 10,
    hitPoints: '45',
    hitDice: '6d8',
    speed: { walk: '30 ft.' },
    initiativeBonus: '',
    abilityScores: { str: 10, dex: 12, con: 14, int: 16, wis: 8, cha: 10 },
    savingThrowBonuses: {},
    skillBonuses: {},
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    actions: [],
    traits: '',
    reactions: '',
  };

  // The component always calls setFormData with an updater function; this
  // records the form data the component is actually rendering so tests can
  // inspect the result of that updater deterministically.
  let currentFormData;

  const renderModal = (props = {}) => {
    currentFormData = { ...defaultFormData, ...(props.formData || {}) };
    return render(
      <NPCFormModal
        formData={currentFormData}
        setFormData={mockSetFormData}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onSaveAndAddToInitiative={mockOnSaveAndAddToInitiative}
        {...props}
      />
    );
  };

  const appliedUpdate = () => {
    const [updater] = mockSetFormData.mock.calls.at(-1) ?? [];
    expect(updater).toBeDefined();
    return typeof updater === 'function' ? updater(currentFormData) : updater;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Header ─────────────────────────────────────────────────────────

  describe('Header', () => {
    it('renders "New NPC" heading when creating', () => {
      renderModal();
      expect(screen.getByRole('heading', { name: 'New NPC' })).toBeInTheDocument();
    });

    it('renders "Edit NPC" heading when editing', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      expect(screen.getByRole('heading', { name: 'Edit NPC' })).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Avatar Section ─────────────────────────────────────────────────

  describe('Avatar Section', () => {
    const imageVariants = [
      ['a data URI image', { image: 'data:image/png;base64,abc' }],
      ['an image path', { imagePath: '/campaigns/test/npc.png' }],
      ['both a data URI and an image path', { image: 'data:image/png;base64,abc', imagePath: '/campaigns/test/npc.png' }],
    ];

    it.each(imageVariants)('shows the remove button when %s is set', (_label, imageData) => {
      renderModal({ formData: { ...defaultFormData, ...imageData } });
      expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
    });

    it('hides the remove button when there is no image', () => {
      renderModal();
      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    });

    it('clears image, imageName, and imagePath when remove is clicked', () => {
      renderModal({
        formData: { ...defaultFormData, image: 'data:image/png;base64,abc', imagePath: '/old/path.png' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
      expect(appliedUpdate()).toMatchObject({ image: '', imageName: '', imagePath: '' });
    });

    it.each([
      ['a data URI image', { image: 'data:image/png;base64,abc' }],
      ['an image path', { imagePath: '/campaigns/test/npc.png' }],
    ])('opens the avatar modal when the avatar for %s is clicked', (_label, imageData) => {
      renderModal({ formData: { ...defaultFormData, name: 'Gandalf', ...imageData } });
      fireEvent.click(screen.getByRole('button', { name: 'Gandalf' }));
      expect(screen.getByTestId('avatar-modal-overlay')).toBeInTheDocument();
    });

    it('does not make the avatar clickable when there is no image', () => {
      renderModal({ formData: { ...defaultFormData, name: 'Gandalf' } });
      expect(screen.queryByRole('button', { name: 'Gandalf' })).not.toBeInTheDocument();
    });
  });

  // ── Image Upload ───────────────────────────────────────────────────

  describe('Image Upload', () => {
    it('does nothing when no file is selected', () => {
      renderModal();
      fireEvent.change(screen.getByLabelText('Upload Avatar'), { target: { files: [] } });
      expect(mockSetFormData).not.toHaveBeenCalled();
    });

    it('reads the selected file and stores its data URL and filename', () => {
      const file = new File(['fake-image'], 'gandalf.png', { type: 'image/png' });
      class FakeFileReader {
        onload = null;
        readAsDataURL() {
          this.result = `data:image/png;base64,${file.name}`;
          this.onload({ target: this });
        }
      }
      vi.stubGlobal('FileReader', FakeFileReader);
      renderModal();
      fireEvent.change(screen.getByLabelText('Upload Avatar'), { target: { files: [file] } });
      expect(mockSetFormData).toHaveBeenCalledTimes(1);
      expect(appliedUpdate()).toMatchObject({
        image: 'data:image/png;base64,gandalf.png',
        imageName: 'gandalf.png',
      });
    });

    it('shows the camera icon on the upload control', () => {
      renderModal();
      const uploadLabel = screen.getByText('Upload Avatar').closest('label');
      expect(uploadLabel.querySelector('.fa-camera')).toBeInTheDocument();
    });
  });

  // ── Tabs ───────────────────────────────────────────────────────────

  describe('Tabs', () => {
    const roleplayTab = () => screen.getByRole('button', { name: /Roleplay/ });
    const statsTab = () => screen.getByRole('button', { name: /Stats/ });
    const roleplayContent = () => screen.getByLabelText('Race').closest('.npcs-roleplay-tab');
    const statsContent = () => screen.getByText('AC').closest('.npcs-stats-tab');

    it('shows the roleplay tab and hides the stats tab by default', () => {
      renderModal();
      expect(roleplayTab()).toHaveClass('npcs-tab-active');
      expect(roleplayContent()).not.toHaveClass('npcs-tab-hidden');
      expect(statsTab()).not.toHaveClass('npcs-tab-active');
      expect(statsContent()).toHaveClass('npcs-tab-hidden');
    });

    it('switches to the stats tab when Stats is clicked', () => {
      renderModal();
      fireEvent.click(statsTab());
      expect(statsTab()).toHaveClass('npcs-tab-active');
      expect(statsContent()).not.toHaveClass('npcs-tab-hidden');
      expect(roleplayTab()).not.toHaveClass('npcs-tab-active');
      expect(roleplayContent()).toHaveClass('npcs-tab-hidden');
    });

    it('switches back to the roleplay tab when Roleplay is clicked', () => {
      renderModal();
      fireEvent.click(statsTab());
      fireEvent.click(roleplayTab());
      expect(roleplayContent()).not.toHaveClass('npcs-tab-hidden');
      expect(statsContent()).toHaveClass('npcs-tab-hidden');
    });

    it('renders book and shield icons on the tab buttons', () => {
      renderModal();
      expect(roleplayTab().querySelector('.fa-book')).toBeInTheDocument();
      expect(statsTab().querySelector('.fa-shield')).toBeInTheDocument();
    });
  });

  // ── Name Field ─────────────────────────────────────────────────────

  describe('Name Field', () => {
    it('reports name edits through setFormData', () => {
      renderModal();
      fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Gandalf' } });
      expect(mockSetFormData).toHaveBeenCalledTimes(1);
      expect(appliedUpdate()).toMatchObject({ name: 'Gandalf' });
    });

    it('displays the pre-filled name', () => {
      renderModal({ formData: { ...defaultFormData, name: 'Gandalf' } });
      expect(screen.getByLabelText(/Name/)).toHaveValue('Gandalf');
    });

    it('focuses the name input on mount', () => {
      renderModal();
      expect(screen.getByLabelText(/Name/)).toHaveFocus();
    });

    it('marks the name as required', () => {
      renderModal();
      expect(screen.getByText('Name').querySelector('.ct-required')).toBeInTheDocument();
    });
  });

  // ── Footer Buttons ─────────────────────────────────────────────────

  describe('Footer Buttons', () => {
    it('calls onClose when Cancel is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when Save is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('renders the Save button with a floppy disk icon', () => {
      renderModal();
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton.querySelector('.fa-floppy-disk')).toBeInTheDocument();
    });

    it('disables the Save button when the disabled prop is true', () => {
      renderModal({ disabled: true });
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('replaces Save with Saving… while a save is in progress', () => {
      renderModal({ saving: true });
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('disables Cancel while a save is in progress', () => {
      renderModal({ saving: true });
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
  });

  // ── Delete Button ──────────────────────────────────────────────────

  describe('Delete Button', () => {
    it('is hidden when creating a new NPC', () => {
      renderModal();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('renders when editing and calls onDelete on click', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('renders the Delete button with a trash icon', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      expect(screen.getByRole('button', { name: 'Delete' }).querySelector('.fa-trash-can')).toBeInTheDocument();
    });

    it('replaces Delete with Deleting… and disables it while deleting', () => {
      renderModal({ editingNPC: { name: 'Gandalf' }, deleting: true });
      expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  // ── Save & Add to Initiative ───────────────────────────────────────

  describe('Save & Add to Initiative', () => {
    const statBlockData = { ...defaultFormData, armorClass: 15 };

    it('renders when the NPC has a numeric armorClass and the callback is provided', () => {
      renderModal({ formData: statBlockData });
      expect(screen.getByRole('button', { name: /Save & Add to Initiative/ })).toBeInTheDocument();
    });

    it('does not render when the NPC lacks a stat block (no armorClass)', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: undefined } });
      expect(screen.queryByRole('button', { name: /Save & Add to Initiative/ })).not.toBeInTheDocument();
    });

    it('does not render when armorClass is not numeric', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: '15' } });
      expect(screen.queryByRole('button', { name: /Save & Add to Initiative/ })).not.toBeInTheDocument();
    });

    it('does not render when the callback is missing', () => {
      renderModal({ formData: statBlockData, onSaveAndAddToInitiative: undefined });
      expect(screen.queryByRole('button', { name: /Save & Add to Initiative/ })).not.toBeInTheDocument();
    });

    it('calls onSaveAndAddToInitiative when clicked', () => {
      renderModal({ formData: statBlockData });
      fireEvent.click(screen.getByRole('button', { name: /Save & Add to Initiative/ }));
      expect(mockOnSaveAndAddToInitiative).toHaveBeenCalledTimes(1);
    });

    it('is disabled when the disabled prop is true', () => {
      renderModal({ formData: statBlockData, disabled: true });
      expect(screen.getByRole('button', { name: /Save & Add to Initiative/ })).toBeDisabled();
    });

    it('shows the shield icon and "Save and add to initiative" tooltip', () => {
      renderModal({ formData: statBlockData });
      const button = screen.getByRole('button', { name: /Save & Add to Initiative/ });
      expect(button.querySelector('.fa-shield-alt')).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Save and add to initiative');
    });
  });

  // ── Modal Structure ────────────────────────────────────────────────

  describe('Modal Structure', () => {
    it('renders the overlay, modal, body, and footer containers', () => {
      const { container } = renderModal();
      expect(container.querySelector('.ct-modal-overlay')).toBeInTheDocument();
      expect(container.querySelector('.ct-modal.npcs-modal')).toBeInTheDocument();
      expect(container.querySelector('.ct-modal-body')).toBeInTheDocument();
      expect(container.querySelector('.ct-modal-footer')).toBeInTheDocument();
    });

    it('renders the avatar section and tabs containers', () => {
      const { container } = renderModal();
      expect(container.querySelector('.npcs-avatar-section .npcs-avatar-controls')).toBeInTheDocument();
      expect(container.querySelector('.npcs-tabs')).toBeInTheDocument();
    });
  });
});

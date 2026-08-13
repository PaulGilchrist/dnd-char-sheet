import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NPCFormModal from './NPCFormModal.jsx';

describe('NPCFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSaveAndAddToInitiative = vi.fn();

  // Collect all setFormData calls for inspection
  const collectedFormData = [];
  const mockSetFormData = vi.fn((fn) => {
    const result = typeof fn === 'function' ? fn({}) : fn;
    collectedFormData.push(result);
    return result;
  });

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

  const renderModal = (props = {}) => {
    collectedFormData.length = 0;
    return render(
      <NPCFormModal
        formData={defaultFormData}
        setFormData={mockSetFormData}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onSaveAndAddToInitiative={mockOnSaveAndAddToInitiative}
        {...props}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering: Header ─────────────────────────────────────────────

  describe('Header', () => {
    it('renders "New NPC" heading when not editing', () => {
      renderModal();
      expect(screen.getByRole('heading', { name: 'New NPC' })).toBeInTheDocument();
    });

    it('renders "Edit NPC" heading when editingNPC is provided', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      expect(screen.getByRole('heading', { name: 'Edit NPC' })).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Avatar Section ────────────────────────────────────────────────

  describe('Avatar Section', () => {
    it('renders remove button when image data URI exists', () => {
      renderModal({
        formData: { ...defaultFormData, image: 'data:image/png;base64,abc' },
      });
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('renders remove button when imagePath exists', () => {
      renderModal({
        formData: { ...defaultFormData, imagePath: '/campaigns/test/npc.png' },
      });
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('does not render remove button when no image data', () => {
      renderModal();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });

    it('clears image, imageName, and imagePath on remove click', () => {
      renderModal({
        formData: { ...defaultFormData, image: 'data:image/png;base64,abc', imagePath: '/old/path.png' },
      });
      fireEvent.click(screen.getByText('Remove'));
      expect(mockSetFormData).toHaveBeenCalled();
      const lastCall = collectedFormData[collectedFormData.length - 1];
      expect(lastCall.image).toBe('');
      expect(lastCall.imageName).toBe('');
      expect(lastCall.imagePath).toBe('');
    });

    it('opens avatar modal when avatar with image is clicked', () => {
      renderModal({
        formData: { ...defaultFormData, image: 'data:image/png;base64,abc', name: 'Gandalf' },
      });
      const avatarWrappers = document.querySelectorAll('.avatar-wrapper[role="button"]');
      expect(avatarWrappers.length).toBeGreaterThan(0);
      fireEvent.click(avatarWrappers[0]);
      expect(screen.getByTestId('avatar-modal-overlay')).toBeInTheDocument();
    });

    it('opens avatar modal when avatar with imagePath is clicked', () => {
      renderModal({
        formData: { ...defaultFormData, imagePath: '/campaigns/test/npc.png', name: 'Gandalf' },
      });
      const avatarWrappers = document.querySelectorAll('.avatar-wrapper[role="button"]');
      expect(avatarWrappers.length).toBeGreaterThan(0);
      fireEvent.click(avatarWrappers[0]);
      expect(screen.getByTestId('avatar-modal-overlay')).toBeInTheDocument();
    });

    it('does not make avatar clickable when no image data', () => {
      renderModal({ formData: { ...defaultFormData, name: 'Gandalf' } });
      const avatarButtons = document.querySelectorAll('.avatar-wrapper[role="button"]');
      expect(avatarButtons.length).toBe(0);
      expect(screen.queryByTestId('avatar-modal-overlay')).not.toBeInTheDocument();
    });
  });

  // ── Image Upload ──────────────────────────────────────────────────

  describe('Image Upload', () => {
    it('does nothing when no file is selected', () => {
      renderModal();
      const fileInput = document.querySelector('.npcs-avatar-input');
      fireEvent.change(fileInput, { target: { files: [] } });
      expect(mockSetFormData).not.toHaveBeenCalled();
    });
  });

  // ── Tabs ──────────────────────────────────────────────────────────

  describe('Tabs', () => {
    it('shows roleplay tab content by default', () => {
      renderModal();
      const roleplayContent = screen.getByLabelText('Race').closest('.npcs-roleplay-tab');
      const statsContent = screen.getByText('AC').closest('.npcs-stats-tab');
      expect(roleplayContent).not.toHaveClass('npcs-tab-hidden');
      expect(statsContent).toHaveClass('npcs-tab-hidden');
    });

    it('switches to stats tab when clicked and shows corresponding content', () => {
      renderModal();
      fireEvent.click(screen.getByText('Stats'));
      const roleplayContent = screen.getByLabelText('Race').closest('.npcs-roleplay-tab');
      const statsContent = screen.getByText('AC').closest('.npcs-stats-tab');
      expect(statsContent).not.toHaveClass('npcs-tab-hidden');
      expect(roleplayContent).toHaveClass('npcs-tab-hidden');
    });

    it('switches back to roleplay tab when clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Stats'));
      fireEvent.click(screen.getByText('Roleplay'));
      const roleplayContent = screen.getByLabelText('Race').closest('.npcs-roleplay-tab');
      const statsContent = screen.getByText('AC').closest('.npcs-stats-tab');
      expect(roleplayContent).not.toHaveClass('npcs-tab-hidden');
      expect(statsContent).toHaveClass('npcs-tab-hidden');
    });

    it('applies active tab CSS class to the active tab button', () => {
      renderModal();
      const roleplayTab = screen.getByText('Roleplay').closest('button');
      expect(roleplayTab).toHaveClass('npcs-tab-active');
      const statsTab = screen.getByText('Stats').closest('button');
      expect(statsTab).not.toHaveClass('npcs-tab-active');

      fireEvent.click(statsTab);
      expect(statsTab).toHaveClass('npcs-tab-active');
      expect(roleplayTab).not.toHaveClass('npcs-tab-active');
    });

    it('hides inactive tab content', () => {
      renderModal();
      const roleplayTabContent = screen.getByLabelText('Race').closest('.npcs-roleplay-tab');
      const statsTabContent = screen.getByText('AC').closest('.npcs-stats-tab');

      expect(roleplayTabContent).not.toHaveClass('npcs-tab-hidden');
      expect(statsTabContent).toHaveClass('npcs-tab-hidden');

      fireEvent.click(screen.getByText('Stats'));
      expect(roleplayTabContent).toHaveClass('npcs-tab-hidden');
      expect(statsTabContent).not.toHaveClass('npcs-tab-hidden');
    });
  });

  // ── Name Field ────────────────────────────────────────────────────

  describe('Name Field', () => {
    it('calls setFormData with updated name on change', () => {
      renderModal();
      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: 'Gandalf' } });
      expect(mockSetFormData).toHaveBeenCalled();
      const lastCall = collectedFormData[collectedFormData.length - 1];
      expect(lastCall.name).toBe('Gandalf');
    });

    it('displays pre-filled name value', () => {
      renderModal({ formData: { ...defaultFormData, name: 'Gandalf' } });
      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput.value).toBe('Gandalf');
    });

    it('has name input focused by default', () => {
      renderModal();
      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toHaveFocus();
    });

    it('marks name field with required indicator', () => {
      renderModal();
      const nameLabel = screen.getByText('Name');
      expect(nameLabel.querySelector('.ct-required')).toBeInTheDocument();
    });
  });

  // ── Footer Buttons ────────────────────────────────────────────────

  describe('Footer Buttons', () => {
    it('calls onClose when cancel is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when save is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Save'));
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('disables save button when disabled prop is true', () => {
      renderModal({ disabled: true });
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton).toHaveAttribute('disabled');
    });

    it('shows saving state text and disables save button when saving', () => {
      renderModal({ saving: true });
      expect(screen.getByText('Saving…')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      const saveButton = screen.getByText('Saving…').closest('button');
      expect(saveButton).not.toHaveAttribute('disabled');
    });

    it('disables cancel button when saving', () => {
      renderModal({ saving: true });
      const cancelButton = screen.getByText('Cancel').closest('button');
      expect(cancelButton).toHaveAttribute('disabled');
    });

    it('has floppy disk icon on save button', () => {
      renderModal();
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton.querySelector('.fa-solid.fa-floppy-disk')).toBeInTheDocument();
    });
  });

  // ── Delete Button ─────────────────────────────────────────────────

  describe('Delete Button', () => {
    it('does not render delete button when not editing', () => {
      renderModal({ editingNPC: undefined });
      expect(screen.queryByText(/^Delete$/)).not.toBeInTheDocument();
    });

    it('renders delete button when editing', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      expect(screen.getByText(/Delete/)).toBeInTheDocument();
    });

    it('calls onDelete when delete is clicked', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      fireEvent.click(screen.getByText(/Delete/));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('shows deleting state and disables button when deleting', () => {
      renderModal({ editingNPC: { name: 'Gandalf' }, deleting: true });
      expect(screen.getByText('Deleting…')).toBeInTheDocument();
      expect(screen.queryByText(/Delete/)).not.toBeInTheDocument();
      const deleteButton = screen.getByText('Deleting…').closest('button');
      expect(deleteButton).toHaveAttribute('disabled');
    });

    it('has trash icon on delete button', () => {
      renderModal({ editingNPC: { name: 'Gandalf' } });
      const deleteButton = screen.getByText(/Delete/).closest('button');
      expect(deleteButton.querySelector('.fa-solid.fa-trash-can')).toBeInTheDocument();
    });
  });

  // ── Save & Add to Initiative ──────────────────────────────────────

  describe('Save & Add to Initiative', () => {
    it('does not render button when npcHasStatBlock is false (no armorClass)', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: undefined } });
      expect(screen.queryByText(/Save & Add to Initiative/)).not.toBeInTheDocument();
    });

    it('does not render button when callback is missing', () => {
      render(
        <NPCFormModal
          formData={defaultFormData}
          setFormData={mockSetFormData}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
      expect(screen.queryByText(/Save & Add to Initiative/)).not.toBeInTheDocument();
    });

    it('renders button when npcHasStatBlock is true and callback is provided', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: 15 } });
      expect(screen.getByText(/Save & Add to Initiative/)).toBeInTheDocument();
    });

    it('calls onSaveAndAddToInitiative when clicked', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: 15 } });
      fireEvent.click(screen.getByText(/Save & Add to Initiative/));
      expect(mockOnSaveAndAddToInitiative).toHaveBeenCalledTimes(1);
    });

    it('disables button when disabled is true', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: 15 }, disabled: true });
      const btn = screen.getByText(/Save & Add to Initiative/).closest('button');
      expect(btn).toHaveAttribute('disabled');
    });

    it('has shield icon on save button', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: 15 } });
      const btn = screen.getByText(/Save & Add to Initiative/).closest('button');
      expect(btn.querySelector('.fa-solid.fa-shield-alt')).toBeInTheDocument();
    });

    it('has tooltip title on save button', () => {
      renderModal({ formData: { ...defaultFormData, armorClass: 15 } });
      const btn = screen.getByText(/Save & Add to Initiative/).closest('button');
      expect(btn).toHaveAttribute('title', 'Save and add to initiative');
    });
  });

  // ── Tab Icons ─────────────────────────────────────────────────────

  describe('Tab Icons', () => {
    it('has book icon on roleplay tab', () => {
      renderModal();
      const roleplayTab = screen.getByText('Roleplay').closest('button');
      expect(roleplayTab.querySelector('.fa-solid.fa-book')).toBeInTheDocument();
    });

    it('has shield icon on stats tab', () => {
      renderModal();
      const statsTab = screen.getByText('Stats').closest('button');
      expect(statsTab.querySelector('.fa-solid.fa-shield')).toBeInTheDocument();
    });
  });

  // ── Camera Icon ───────────────────────────────────────────────────

  describe('Camera Icon', () => {
    it('has camera icon on upload avatar label', () => {
      renderModal();
      const uploadLabel = screen.getByText('Upload Avatar').closest('label');
      expect(uploadLabel.querySelector('.fa-solid.fa-camera')).toBeInTheDocument();
    });
  });

  // ── Modal Structure ───────────────────────────────────────────────

  describe('Modal Structure', () => {
    it('has npcs-modal class on modal', () => {
      renderModal();
      const modal = document.querySelector('.ct-modal.npcs-modal');
      expect(modal).toBeInTheDocument();
    });

    it('has ct-modal-overlay wrapper', () => {
      renderModal();
      const overlay = document.querySelector('.ct-modal-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('has ct-modal-body container', () => {
      renderModal();
      const body = document.querySelector('.ct-modal-body');
      expect(body).toBeInTheDocument();
    });

    it('has ct-modal-footer container', () => {
      renderModal();
      const footer = document.querySelector('.ct-modal-footer');
      expect(footer).toBeInTheDocument();
    });

    it('has npcs-avatar-section with controls', () => {
      renderModal();
      const avatarSection = document.querySelector('.npcs-avatar-section');
      expect(avatarSection).toBeInTheDocument();
      expect(avatarSection.querySelector('.npcs-avatar-controls')).toBeInTheDocument();
    });

    it('has npcs-tabs container', () => {
      renderModal();
      const tabsContainer = document.querySelector('.npcs-tabs');
      expect(tabsContainer).toBeInTheDocument();
    });
  });

  // ── Image Path Variations ─────────────────────────────────────────

  describe('Image Path Variations', () => {
    it('shows remove button when only imagePath is set', () => {
      renderModal({
        formData: { ...defaultFormData, imagePath: '/campaigns/test/npc.png' },
      });
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('shows remove button when both image and imagePath are set', () => {
      renderModal({
        formData: {
          ...defaultFormData,
          image: 'data:image/png;base64,abc',
          imagePath: '/campaigns/test/npc.png',
        },
      });
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('does not show remove button when both image and imagePath are empty', () => {
      renderModal();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });
});

// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NPCs from './NPCs';

const mockUseNPCsManagement = vi.fn();

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: (...args) => mockUseNPCsManagement(...args),
}));

// Minimal NPCListItem mock — only asserts the wiring passed to it, not its own DOM
vi.mock('./NPCListItem.jsx', () => ({
  default: vi.fn(({ npc, onEdit, onAddToInitiative }) => (
    <li data-testid={`npc-list-item-${npc.name}`}>
      <span>{npc.name}</span>
      <button data-testid={`edit-btn-${npc.name}`} onClick={() => onEdit(npc)}>Edit</button>
      <button data-testid={`init-btn-${npc.name}`} onClick={() => onAddToInitiative(npc)}>Add to Initiative</button>
    </li>
  )),
}));

// Minimal NPCFormModal mock — exposes callback wiring via testids so the
// NPCs component's orchestration is testable without its (separately tested) internals
vi.mock('./NPCFormModal.jsx', () => ({
  default: ({ formData, setFormData, onClose, onSave, onDelete, onSaveAndAddToInitiative, disabled, editingNPC, saving }) => (
    <div data-testid="npc-form-modal">
      <div data-testid="modal-editing-npc">{editingNPC?.name || 'none'}</div>
      <div data-testid="modal-saving">{String(!!saving)}</div>
      <input
        data-testid="npc-name-input"
        value={formData?.name || ''}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
      />
      <button onClick={onClose}>Cancel</button>
      <button onClick={onSave} disabled={disabled}>Save</button>
      {editingNPC && <button onClick={onDelete}>Delete</button>}
      {onSaveAndAddToInitiative && (
        <button
          data-testid="save-add-init-btn"
          onClick={onSaveAndAddToInitiative}
          disabled={disabled}
        >
          Save &amp; Add to Initiative
        </button>
      )}
    </div>
  ),
}));

const mockGetDefaultFormData = vi.fn();
const mockCleanNPCData = vi.fn();

vi.mock('../../services/npcs/npcFormUtils.js', () => ({
  getDefaultFormData: (...args) => mockGetDefaultFormData(...args),
  cleanNPCData: (...args) => mockCleanNPCData(...args),
}));

const mockAddNPCToInitiative = vi.fn();
vi.mock('../../services/npcs/npcCombatService.js', () => ({
  addNPCToInitiative: (...args) => mockAddNPCToInitiative(...args),
}));

const mockGenerateNPC = vi.fn();
vi.mock('../../services/npcs/npcGenerator.js', () => ({
  generateNPC: (...args) => mockGenerateNPC(...args),
}));

const mockSaveNPC = vi.fn();
vi.mock('../../services/npcs/npcsService.js', () => ({
  loadNPCs: vi.fn(),
  saveNPC: (...args) => mockSaveNPC(...args),
  saveNPCs: vi.fn(),
  deleteNPC: vi.fn(),
}));

const defaultProps = {
  campaignName: 'test-campaign',
  onBack: vi.fn(),
  onViewInitiative: vi.fn(),
};

const defaultNPCs = [
  { name: 'Goblin', race: 'Humanoid', classRole: 'Scout', tags: 'enemy' },
  { name: 'Wizard', race: 'Humanoid', classRole: 'Caster', tags: 'boss' },
];

function createManagementReturn(items = defaultNPCs, overrides = {}) {
  return {
    items,
    loading: false,
    loadItems: vi.fn(),
    saveItems: vi.fn(),
    deleteItem: vi.fn(),
    ...overrides,
  };
}

function renderNPCs(npcs = defaultNPCs, managementOverrides = {}, propsOverride = {}) {
  mockUseNPCsManagement.mockReturnValue(createManagementReturn(npcs, managementOverrides));
  return {
    ...render(<NPCs {...defaultProps} {...propsOverride} />),
    management: mockUseNPCsManagement.mock.results[0].value,
  };
}

describe('NPCs', () => {
  const defaultFormData = {
    name: '', race: '', classRole: '', appearance: '', personality: '',
    goals: '', secrets: '', notes: '', tags: '', attitude: 'neutral',
    image: '', imageName: '', imagePath: '', armorClass: 10, hitPoints: '',
    hitDice: '', initiativeBonus: '', speed: { walk: '30 ft.' },
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrowBonuses: {}, skillBonuses: {}, damageResistances: [],
    damageImmunities: [], conditionImmunities: [], actions: [], traits: '', reactions: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefaultFormData.mockReturnValue({ ...defaultFormData });
    mockCleanNPCData.mockImplementation((data) => ({ ...data, cleaned: true }));
    mockAddNPCToInitiative.mockResolvedValue(undefined);
    mockGenerateNPC.mockResolvedValue({ name: 'Generated NPC', race: 'Humanoid' });
    mockSaveNPC.mockResolvedValue({ success: true, npc: { name: 'Test NPC' } });
  });

  // ── Initial Render ────────────────────────────────────────────────

  describe('Initial render', () => {
    it('renders the back button and calls onBack when clicked', () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /Back/i }));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('renders the New NPC and Generate NPC buttons', () => {
      renderNPCs();
      expect(screen.getByRole('button', { name: /New NPC/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate NPC/i })).toBeInTheDocument();
    });

    it('renders the search input', () => {
      renderNPCs();
      expect(screen.getByLabelText('Search NPCs')).toBeInTheDocument();
    });

    it('loads NPCs on mount when a campaignName is provided', () => {
      const { management } = renderNPCs();
      expect(management.loadItems).toHaveBeenCalledTimes(1);
    });

    it('does not load NPCs when no campaignName is provided', () => {
      const { management } = renderNPCs(defaultNPCs, {}, { campaignName: '' });
      expect(management.loadItems).not.toHaveBeenCalled();
    });

    it('reloads NPCs when campaignName changes', () => {
      const { management, rerender } = renderNPCs();
      rerender(<NPCs {...defaultProps} campaignName="second-campaign" />);
      expect(management.loadItems).toHaveBeenCalledTimes(2);
    });

    it('renders a list item for each loaded NPC', () => {
      renderNPCs();
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });

    it('renders the empty state when there are no NPCs', () => {
      renderNPCs([]);
      expect(screen.getByText(/No NPCs yet/i)).toBeInTheDocument();
    });

    it('renders the loading state while loading is true', () => {
      mockUseNPCsManagement.mockReturnValue(createManagementReturn(defaultNPCs, { loading: true }));
      render(<NPCs {...defaultProps} />);
      expect(screen.getByText(/Loading NPCs/i)).toBeInTheDocument();
    });
  });

  // ── Search / Filter ───────────────────────────────────────────────

  describe('Search filtering', () => {
    it('filters NPCs by name', () => {
      renderNPCs();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'Goblin' } });
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.queryByTestId('npc-list-item-Wizard')).not.toBeInTheDocument();
    });

    it('matches search terms case-insensitively', () => {
      renderNPCs();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'goblin' } });
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.queryByTestId('npc-list-item-Wizard')).not.toBeInTheDocument();
    });

    it('filters NPCs by class role', () => {
      renderNPCs();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'Caster' } });
      expect(screen.queryByTestId('npc-list-item-Goblin')).not.toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });

    it('filters NPCs by tags', () => {
      renderNPCs();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'boss' } });
      expect(screen.queryByTestId('npc-list-item-Goblin')).not.toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });

    it('shows the no-results empty state when nothing matches', () => {
      renderNPCs();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'Nonexistent' } });
      expect(screen.getByText(/No NPCs found/i)).toBeInTheDocument();
    });

    it('shows a clear button only while a query is set', () => {
      renderNPCs();
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'Goblin' } });
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clearing the search restores all NPCs', () => {
      renderNPCs();
      fireEvent.change(screen.getByLabelText('Search NPCs'), { target: { value: 'Goblin' } });
      expect(screen.queryByTestId('npc-list-item-Wizard')).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });
  });

  // ── New NPC Flow ──────────────────────────────────────────────────

  describe('New NPC flow', () => {
    it('opens the modal with empty editing state and default form data', () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      expect(mockGetDefaultFormData).toHaveBeenCalledWith();
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-editing-npc')).toHaveTextContent('none');
      expect(screen.getByTestId('npc-name-input').value).toBe('');
    });

    it('does not show the delete button when creating a new NPC', () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  // ── Generate NPC Flow ─────────────────────────────────────────────

  describe('Generate NPC flow', () => {
    it('generates from the existing NPC list and opens the modal with the generated data', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /Generate NPC/i }));
      await waitFor(() => expect(mockGenerateNPC).toHaveBeenCalledWith(defaultNPCs));
      await waitFor(() => {
        expect(mockGetDefaultFormData).toHaveBeenCalledWith({ name: 'Generated NPC', race: 'Humanoid' });
      });
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-editing-npc')).toHaveTextContent('none');
    });
  });

  // ── Edit NPC Flow ─────────────────────────────────────────────────

  describe('Edit NPC flow', () => {
    it('opens the modal with the clicked NPC set as the item being edited', () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-editing-npc')).toHaveTextContent('Goblin');
    });

    it('seeds the form with the NPC being edited', () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      expect(mockGetDefaultFormData).toHaveBeenCalledWith(defaultNPCs[0]);
    });
  });

  // ── Save Flow ─────────────────────────────────────────────────────

  describe('Save flow', () => {
    it('saves the cleaned form data with the campaign name', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Test NPC' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(mockSaveNPC).toHaveBeenCalledTimes(1));
      expect(mockSaveNPC.mock.calls[0][0]).toBe('test-campaign');
      expect(mockSaveNPC.mock.calls[0][1]).toMatchObject({ name: 'Test NPC', cleaned: true });
      expect(mockSaveNPC.mock.calls[0][2]).toBeUndefined();
    });

    it('reloads the NPC list and closes the modal after a successful save', async () => {
      const { management } = renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Test NPC' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(management.loadItems).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByTestId('npc-form-modal')).not.toBeInTheDocument());
    });

    it('passes the original NPC name so edits rename instead of duplicating', async () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Goblin' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(mockSaveNPC).toHaveBeenCalledTimes(1));
      expect(mockSaveNPC.mock.calls[0][2]).toBe('Goblin');
    });

    it('does not save when the name is empty', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(mockSaveNPC).not.toHaveBeenCalled();
    });

    it('disables the save button for empty and whitespace-only names', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      const saveBtn = screen.getByRole('button', { name: 'Save' });
      expect(saveBtn).toHaveAttribute('disabled');
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: '   ' } });
      expect(saveBtn).toHaveAttribute('disabled');
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Goblin' } });
      expect(saveBtn).not.toHaveAttribute('disabled');
    });
  });

  // ── Save Failure ──────────────────────────────────────────────────

  describe('Save failure', () => {
    it('keeps the modal open, does not reload the list, and resets saving when save fails', async () => {
      mockSaveNPC.mockRejectedValueOnce(new Error('Save failed'));
      const { management } = renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Test NPC' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(mockSaveNPC).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      expect(management.loadItems).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.getByTestId('modal-saving')).toHaveTextContent('false'));
    });
  });

  // ── Delete Flow ───────────────────────────────────────────────────

  describe('Delete flow', () => {
    it('deletes the NPC and closes the modal when the confirmation is accepted', async () => {
      const deleteItem = vi.fn().mockResolvedValue(undefined);
      renderNPCs(defaultNPCs, { deleteItem });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteItem).toHaveBeenCalledWith('Goblin'));
      await waitFor(() => expect(screen.queryByTestId('npc-form-modal')).not.toBeInTheDocument());
    });

    it('does not delete the NPC when the confirmation is cancelled', async () => {
      const deleteItem = vi.fn().mockResolvedValue(undefined);
      renderNPCs(defaultNPCs, { deleteItem });
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(deleteItem).not.toHaveBeenCalled();
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
    });

    it('keeps the modal open when the delete fails', async () => {
      const deleteItem = vi.fn().mockRejectedValue(new Error('Delete failed'));
      renderNPCs(defaultNPCs, { deleteItem });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteItem).toHaveBeenCalledWith('Goblin'));
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
    });
  });

  // ── Save and Add to Initiative ────────────────────────────────────

  describe('Save and add to initiative', () => {
    it('saves the NPC and adds the saved result to initiative', async () => {
      mockSaveNPC.mockResolvedValue({ success: true, npc: { name: 'Goblin', armorClass: 15 } });
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Goblin' } });
      fireEvent.click(screen.getByTestId('save-add-init-btn'));
      await waitFor(() => expect(mockSaveNPC).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockAddNPCToInitiative).toHaveBeenCalledTimes(1));
      expect(mockAddNPCToInitiative).toHaveBeenCalledWith(
        'test-campaign',
        expect.objectContaining({ name: 'Goblin', armorClass: 15 }),
        defaultProps.onViewInitiative
      );
      await waitFor(() => expect(screen.queryByTestId('npc-form-modal')).not.toBeInTheDocument());
    });

    it('disables the save-and-add button while the name is empty', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      expect(screen.getByTestId('save-add-init-btn')).toHaveAttribute('disabled');
    });
  });

  // ── Close Modal ───────────────────────────────────────────────────

  describe('Closing the modal', () => {
    it('closes the modal when cancel is clicked', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByTestId('npc-form-modal')).not.toBeInTheDocument();
    });
  });

  // ── Add to Initiative from List ───────────────────────────────────

  describe('Add to initiative from the list', () => {
    it('adds the clicked NPC to initiative with the campaign and navigation callback', async () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('init-btn-Goblin'));
      await waitFor(() => expect(mockAddNPCToInitiative).toHaveBeenCalledTimes(1));
      expect(mockAddNPCToInitiative).toHaveBeenCalledWith(
        'test-campaign',
        defaultNPCs[0],
        defaultProps.onViewInitiative
      );
    });
  });
});

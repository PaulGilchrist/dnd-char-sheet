import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NPCs from './NPCs';

const mockUseNPCsManagement = vi.fn();

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: (...args) => mockUseNPCsManagement(...args),
}));

// Minimal NPCListItem mock — only asserts behavior, not DOM structure
vi.mock('./NPCListItem.jsx', () => ({
  default: vi.fn(({ npc, onEdit, onAddToInitiative }) => (
    <li data-testid={`npc-list-item-${npc.name}`}>
      <span>{npc.name}</span>
      <button data-testid={`edit-btn-${npc.name}`} onClick={() => onEdit(npc)}>Edit</button>
      <button data-testid={`init-btn-${npc.name}`} onClick={() => onAddToInitiative(npc)}>Add to Initiative</button>
    </li>
  )),
}));

// Minimal NPCFormModal mock — exposes key props via testids for assertion
vi.mock('./NPCFormModal.jsx', () => ({
  default: ({ formData, setFormData, onClose, onSave, onDelete, onSaveAndAddToInitiative, disabled, editingNPC, saving }) => (
    <div data-testid="npc-form-modal">
      <div data-testid="modal-editing-npc">{editingNPC?.name || 'none'}</div>
      <div data-testid="modal-disabled">{String(disabled)}</div>
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
const mockCleanNPCData = vi.fn((data) => data);

vi.mock('../../services/npcs/npcFormUtils.js', () => ({
  getDefaultFormData: (...args) => mockGetDefaultFormData(...args),
  cleanNPCData: (...args) => mockCleanNPCData(...args),
}));

const mockAddNPCToInitiative = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/npcs/npcCombatService.js', () => ({
  addNPCToInitiative: (...args) => mockAddNPCToInitiative(...args),
}));

const mockGenerateNPC = vi.fn().mockResolvedValue({ name: 'Generated NPC', race: 'Humanoid' });
vi.mock('../../services/npcs/npcGenerator.js', () => ({
  generateNPC: (...args) => mockGenerateNPC(...args),
}));

const mockSaveNPC = vi.fn().mockResolvedValue({ success: true, npc: {} });
const mockLoadNPCs = vi.fn().mockResolvedValue({ npcs: [] });
vi.mock('../../services/npcs/npcsService.js', () => ({
  loadNPCs: (...args) => mockLoadNPCs(...args),
  saveNPC: (...args) => mockSaveNPC(...args),
  saveNPCs: vi.fn(),
  deleteNPC: vi.fn(),
  loadNPC: vi.fn(),
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

function createManagementReturn(itemsOverride = defaultNPCs, managementOverrides = {}) {
  return {
    items: Array.isArray(itemsOverride) ? itemsOverride : defaultNPCs,
    loading: false,
    loadItems: vi.fn(),
    saveItems: vi.fn(),
    deleteItem: vi.fn(),
    ...managementOverrides,
  };
}

function renderNPCs(npcs = defaultNPCs, managementOverrides = {}) {
  mockUseNPCsManagement.mockReturnValue(createManagementReturn(npcs, managementOverrides));
  return {
    ...render(<NPCs {...defaultProps} />),
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
    mockAddNPCToInitiative.mockResolvedValue(undefined);
    mockSaveNPC.mockResolvedValue({ success: true, npc: { name: 'Test NPC' } });
    mockLoadNPCs.mockResolvedValue({ npcs: [] });
    mockGetDefaultFormData.mockReturnValue({ ...defaultFormData });
    mockCleanNPCData.mockImplementation((data) => data);
  });

  // ── Initial Render ────────────────────────────────────────────────

  describe('Initial render', () => {
    it('renders the back button and calls onBack when clicked', () => {
      renderNPCs();
      const backBtn = screen.getByRole('button', { name: /Back/i });
      fireEvent.click(backBtn);
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('renders the new NPC button', () => {
      renderNPCs();
      expect(screen.getByRole('button', { name: /New NPC/i })).toBeInTheDocument();
    });

    it('renders the generate NPC button', () => {
      renderNPCs();
      expect(screen.getByRole('button', { name: /Generate NPC/i })).toBeInTheDocument();
    });

    it('renders the search input', () => {
      renderNPCs();
      expect(screen.getByLabelText('Search NPCs')).toBeInTheDocument();
    });

    it('calls loadItems on mount when campaignName is provided', () => {
      const { management } = renderNPCs();
      expect(management.loadItems).toHaveBeenCalled();
    });

    it('renders NPC list items for loaded NPCs', () => {
      renderNPCs();
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });

    it('renders empty state when no NPCs exist', () => {
      renderNPCs([]);
      expect(screen.getByText(/No NPCs yet/i)).toBeInTheDocument();
    });

    it('renders loading state when loading is true', () => {
      mockUseNPCsManagement.mockReturnValue({
        ...createManagementReturn(),
        loading: true,
      });
      render(<NPCs {...defaultProps} />);
      expect(screen.getByText(/Loading NPCs/i)).toBeInTheDocument();
    });
  });

  // ── Search / Filter ───────────────────────────────────────────────

  describe('Search filtering', () => {
    it('filters NPCs by name when typing', () => {
      renderNPCs();
      const searchInput = screen.getByLabelText('Search NPCs');
      fireEvent.change(searchInput, { target: { value: 'Goblin' } });
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.queryByTestId('npc-list-item-Wizard')).not.toBeInTheDocument();
    });

    it('filters NPCs by class role', () => {
      renderNPCs();
      const searchInput = screen.getByLabelText('Search NPCs');
      fireEvent.change(searchInput, { target: { value: 'Caster' } });
      expect(screen.queryByTestId('npc-list-item-Goblin')).not.toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });

    it('shows no-match empty state when search has no results', () => {
      renderNPCs();
      const searchInput = screen.getByLabelText('Search NPCs');
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
      expect(screen.getByText(/No NPCs found/i)).toBeInTheDocument();
    });

    it('shows clear button when search query is set', () => {
      renderNPCs();
      const searchInput = screen.getByLabelText('Search NPCs');
      fireEvent.change(searchInput, { target: { value: 'Goblin' } });
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears search and restores all NPCs when clear button clicked', () => {
      renderNPCs();
      const searchInput = screen.getByLabelText('Search NPCs');
      fireEvent.change(searchInput, { target: { value: 'Goblin' } });
      expect(screen.queryByTestId('npc-list-item-Wizard')).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });

    it('shows all NPCs when search is cleared', () => {
      renderNPCs();
      const searchInput = screen.getByLabelText('Search NPCs');
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByTestId('npc-list-item-Goblin')).toBeInTheDocument();
      expect(screen.getByTestId('npc-list-item-Wizard')).toBeInTheDocument();
    });
  });

  // ── New NPC Flow ──────────────────────────────────────────────────

  describe('New NPC flow', () => {
    it('opens the modal and calls getDefaultFormData with no args', () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      expect(mockGetDefaultFormData).toHaveBeenCalledWith();
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-editing-npc')).toHaveTextContent('none');
    });

    it('does not show delete button when creating new NPC', () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  // ── Generate NPC Flow ─────────────────────────────────────────────

  describe('Generate NPC flow', () => {
    it('calls generateNPC with existing NPCs and opens modal with generated data', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /Generate NPC/i }));
      await waitFor(() => {
        expect(mockGenerateNPC).toHaveBeenCalledWith(defaultNPCs);
      });
      expect(mockGetDefaultFormData).toHaveBeenCalledWith({ name: 'Generated NPC', race: 'Humanoid' });
    });
  });

  // ── Edit NPC Flow ─────────────────────────────────────────────────

  describe('Edit NPC flow', () => {
    it('opens modal with editingNPC set when clicking edit on a list item', () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-editing-npc')).toHaveTextContent('Goblin');
    });

    it('calls getDefaultFormData with the NPC being edited', () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      expect(mockGetDefaultFormData).toHaveBeenCalledWith(defaultNPCs[0]);
    });

    it('calls openEdit with the NPC object', () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      // useCrudList openEdit is called internally; verify modal opens with correct data
      expect(screen.getByTestId('modal-editing-npc')).toHaveTextContent('Goblin');
    });
  });

  // ── Save Flow ─────────────────────────────────────────────────────

  describe('Save flow', () => {
    it('calls saveNPC with cleaned data when saving a new NPC', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Test NPC' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => {
        expect(mockSaveNPC).toHaveBeenCalled();
      });
      const savedCall = mockSaveNPC.mock.calls[0];
      expect(savedCall[0]).toBe('test-campaign');
      expect(savedCall[1].name).toBe('Test NPC');
      expect(mockCleanNPCData).toHaveBeenCalled();
    });

    it('calls loadItems after successful save', async () => {
      const { management } = renderNPCs();
      management.loadItems.mockResolvedValue(undefined);
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Test NPC' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => {
        expect(management.loadItems).toHaveBeenCalled();
      });
    });

    it('sends oldName parameter when editing an existing NPC', async () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Goblin' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => {
        expect(mockSaveNPC).toHaveBeenCalled();
      });
      expect(mockSaveNPC.mock.calls[0][2]).toBe('Goblin');
    });

    it('does not call save when name is empty', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(mockSaveNPC).not.toHaveBeenCalled();
    });

    it('disables save button when name is empty', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      const saveBtn = screen.getByRole('button', { name: 'Save' });
      expect(saveBtn).toHaveAttribute('disabled');
    });

    it('calls getDefaultFormData with NPC data when editing', () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      expect(mockGetDefaultFormData).toHaveBeenCalledWith(defaultNPCs[0]);
    });
  });

  // ── Save Failure ──────────────────────────────────────────────────

  describe('Save failure', () => {
    it('does not close modal when saveNPC throws', async () => {
      mockSaveNPC.mockRejectedValueOnce(new Error('Save failed'));
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Test NPC' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => {
        expect(mockSaveNPC).toHaveBeenCalled();
      });
      // Modal should still be open after failure
      expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
    });
  });

  // ── Delete Flow ───────────────────────────────────────────────────

  describe('Delete flow', () => {
    it('deletes when window confirm is accepted', async () => {
      const management = { ...createManagementReturn() };
      management.deleteItem = vi.fn().mockResolvedValue(undefined);
      mockUseNPCsManagement.mockReturnValue(management);
      render(<NPCs {...defaultProps} />);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => {
        expect(management.deleteItem).toHaveBeenCalledWith('Goblin');
      });
    });

    it('does not delete when window confirm is cancelled', async () => {
      const management = { ...createManagementReturn() };
      management.deleteItem = vi.fn().mockResolvedValue(undefined);
      mockUseNPCsManagement.mockReturnValue(management);
      render(<NPCs {...defaultProps} />);
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(management.deleteItem).not.toHaveBeenCalled();
    });

    it('does not show delete button when creating new NPC', () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  // ── Save and Add to Initiative ────────────────────────────────────

  describe('Save and add to initiative', () => {
    it('saves NPC and adds to initiative when save-and-add clicked', async () => {
      mockSaveNPC.mockResolvedValue({ success: true, npc: { name: 'Goblin', armorClass: 15 } });
      renderNPCs();
      fireEvent.click(screen.getByTestId('edit-btn-Goblin'));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('npc-name-input'), { target: { value: 'Goblin' } });
      fireEvent.click(screen.getByTestId('save-add-init-btn'));
      await waitFor(() => {
        expect(mockSaveNPC).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockAddNPCToInitiative).toHaveBeenCalled();
      });
    });

    it('renders NPC list items correctly when NPC has no stat block', () => {
      const npcWithoutStatBlock = [{ name: 'Villager', race: 'Humanoid', classRole: '', tags: 'ally', armorClass: undefined }];
      renderNPCs(npcWithoutStatBlock);
      expect(screen.getByTestId('npc-list-item-Villager')).toBeInTheDocument();
    });
  });

  // ── Close Modal ───────────────────────────────────────────────────

  describe('Close modal', () => {
    it('closes modal when cancel clicked', async () => {
      renderNPCs();
      fireEvent.click(screen.getByRole('button', { name: /New NPC/i }));
      await waitFor(() => {
        expect(screen.getByTestId('npc-form-modal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByTestId('npc-form-modal')).not.toBeInTheDocument();
    });
  });

  // ── Add to Initiative from List ───────────────────────────────────

  describe('Add to Initiative from list', () => {
    it('calls addNPCToInitiative when clicking init button on a list item', async () => {
      renderNPCs();
      fireEvent.click(screen.getByTestId('init-btn-Goblin'));
      await waitFor(() => {
        expect(mockAddNPCToInitiative).toHaveBeenCalledWith(
          'test-campaign',
          defaultNPCs[0],
          defaultProps.onViewInitiative
        );
      });
    });
  });
});

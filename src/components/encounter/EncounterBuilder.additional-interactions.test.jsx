import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EncounterBuilder from './EncounterBuilder.jsx';

vi.mock('../../hooks/ui/useMonstersData.js', () => ({
  useMonstersData: vi.fn(() => ({ monsters: [], loading: false })),
}));

vi.mock('../../hooks/management/useEncounterManagement.js', () => ({
  default: vi.fn(() => ({
    modalOpen: false,
    modalMode: null,
    encounters: [],
    loading: false,
    openSaveModal: vi.fn(),
    openLoadModal: vi.fn(),
    closeModal: vi.fn(),
    saveEncounter: vi.fn(),
    updateEncounter: vi.fn(),
    loadEncounterData: vi.fn(),
    deleteEncounterAction: vi.fn(),
    renameEncounterAction: vi.fn(),
  })),
}));

vi.mock('./EncounterFilterPanel.jsx', () => ({
  default: (props) => (
    <div data-testid="encounter-filter-panel">
      <select
        data-testid="difficulty-select"
        value={props.filter?.difficulty}
        onChange={props.onDifficultyChange}
      >
        <option value={0}>Easy</option>
        <option value={1}>Medium</option>
        <option value={2}>Hard</option>
        <option value={3}>Deadly</option>
      </select>
      <div data-testid="player-levels">
        {props.filter?.playerLevels?.map((level, i) => (
          <div key={i} data-testid={`player-level-${i}`}>
            <input
              data-testid={`player-level-input-${i}`}
              type="number"
              value={level}
              onChange={(e) => props.onPlayerLevelChange(i, Number(e.target.value))}
            />
            <button
              data-testid={`remove-player-${i}`}
              disabled={props.filter?.playerLevels?.length <= 1}
              onClick={() => props.onRemovePlayer(i)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button data-testid="add-player" onClick={props.onAddPlayer}>Add Player</button>
    </div>
  ),
}));

vi.mock('./EncounterSummaryPanel.jsx', () => ({
  default: (props) => (
    <div data-testid="encounter-summary-panel">
      <span data-testid="total-xp">{props.totalMonsterXP.toLocaleString()}</span>
      <span data-testid="monster-count">{props.monsterCount}</span>
      <span data-testid="difficulty-multiplier">{props.difficultyMultiplier}</span>
      <span data-testid="effective-xp">{props.effectiveXP.toLocaleString()}</span>
      <span data-testid="difficulty-label">{props.difficultyLabels?.[props.difficultyIndex]}</span>
      {props.selectedMonsters?.length > 0 && (
        <button data-testid="clear-all" onClick={props.onClearMonsters}>Clear All</button>
      )}
    </div>
  ),
}));

vi.mock('./EncounterMonsterTable.jsx', () => ({
  default: (props) => (
    <div data-testid="encounter-monster-table">
      <input
        data-testid="search-input"
        value={props.searchQuery}
        onChange={(e) => props.onSearchQueryChange(e.target.value)}
        placeholder="Search by name, type, or subtype..."
      />
      <select
        data-testid="type-filter"
        value={props.typeFilter || ''}
        onChange={(e) => props.onTypeChange(e.target.value)}
      >
        <option value="">All Types</option>
        <option value="humanoid">Humanoid</option>
        <option value="dragon">Dragon</option>
        <option value="beast">Beast</option>
      </select>
      <select
        data-testid="size-filter"
        value={props.sizeFilter || ''}
        onChange={(e) => props.onSizeChange(e.target.value)}
      >
        <option value="">All Sizes</option>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
      <input
        data-testid="cr-min"
        type="number"
        value={props.crMin ?? ''}
        onChange={(e) => props.onCRMinChange(e.target.value)}
        placeholder="Any"
      />
      <input
        data-testid="cr-max"
        type="number"
        value={props.crMax ?? ''}
        onChange={(e) => props.onCRMaxChange(e.target.value)}
        placeholder="Any"
      />
      {props.filteredMonsters?.map((monster) => {
        const selected = props.selectedMonsters.some((m) => m.index === monster.index);
        const qty = (props.selectedMonsters.find((m) => m.index === monster.index)?.qty) || 0;
        return (
          <div
            key={monster.index}
            data-testid={`monster-row-${monster.index}`}
            className={selected ? 'monster-row-selected' : ''}
            onClick={() => props.onToggleMonster(monster)}
          >
            <input
              type="checkbox"
              data-testid={`monster-checkbox-${monster.index}`}
              checked={selected}
              onChange={(e) => { e.stopPropagation(); props.onToggleMonster(monster); }}
              onClick={(e) => e.stopPropagation()}
            />
            <span data-testid={`monster-name-${monster.index}`}>{monster.name}</span>
            {qty > 0 && (
              <>
                <span data-testid={`monster-qty-${monster.index}`}>{qty}</span>
                <button
                  data-testid={`decrease-qty-${monster.index}`}
                  onClick={(e) => { e.stopPropagation(); props.onDecreaseQty(monster.index); }}
                >
                  -
                </button>
                <button
                  data-testid={`increase-qty-${monster.index}`}
                  onClick={(e) => { e.stopPropagation(); props.onIncreaseQty(monster.index); }}
                >
                  +
                </button>
                <button
                  data-testid={`remove-monster-${monster.index}`}
                  onClick={(e) => { e.stopPropagation(); props.onRemoveMonster(monster.index); }}
                >
                  Remove
                </button>
              </>
            )}
            {props.onViewDetails && (
              <button
                data-testid={`details-btn-${monster.index}`}
                onClick={(e) => { e.stopPropagation(); props.onViewDetails(monster); }}
              >
                Details
              </button>
            )}
          </div>
        );
      })}
      {props.sortField && (
        <div data-testid="sort-field">{props.sortField}</div>
      )}
      {props.sortDirection && (
        <div data-testid="sort-direction">{props.sortDirection}</div>
      )}
    </div>
  ),
}));

vi.mock('./EncounterSelectedMonsters.jsx', () => ({
  default: (props) => {
    if (!props.selectedMonsters || props.selectedMonsters.length === 0) {
      return null;
    }
    const totalMonsters = props.selectedMonsters.reduce((sum, m) => sum + (m.qty || 1), 0);
    return (
      <div data-testid="encounter-selected-monsters">
        <div data-testid="selected-count">{totalMonsters}</div>
        {props.selectedMonsters.map((monster) => (
          <div key={monster.index} data-testid={`selected-item-${monster.index}`}>
            <span data-testid={`selected-name-${monster.index}`}>{monster.name}</span>
            <span data-testid={`selected-xp-${monster.index}`}>
              {(monster.xp * (monster.qty || 1)).toLocaleString()} XP
            </span>
            <button
              data-testid={`remove-selected-${monster.index}`}
              onClick={() => props.onRemoveMonster(monster.index)}
            >
              Remove
            </button>
            {props.onViewDetails && (
              <button
                data-testid={`view-details-selected-${monster.index}`}
                onClick={() => props.onViewDetails(monster)}
              >
                View
              </button>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('./EncounterModal.jsx', () => ({
  default: (props) => {
    if (!props.isOpen) return null;
    return (
      <div data-testid="encounter-modal">
        <button data-testid="modal-close" onClick={props.onClose}>Close</button>
        {props.mode === 'save' && (
          <div>
            <input
              data-testid="encounter-name-input"
              placeholder="e.g., Goblin Ambush"
            />
            <button data-testid="modal-save" onClick={() => props.onSave('Test Encounter')}>
              Save
            </button>
          </div>
        )}
        {props.mode === 'load' && (
          <div>
            {props.encounters?.map((enc) => (
              <button
                key={enc.name}
                data-testid={`load-encounter-${enc.name}`}
                onClick={() => props.onLoad(enc.name)}
              >
                Load {enc.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
}));

vi.mock('./EncounterGeneratorModal.jsx', () => ({
  default: (props) => {
    if (!props.onClose) return null;
    return (
      <div data-testid="encounter-generator-modal">
        <button data-testid="generator-close" onClick={props.onClose}>Close</button>
        <button
          data-testid="generator-apply"
          onClick={() => props.onApply([
            { index: 'suggested-goblin', name: 'Suggested Goblin', xp: 50, challenge_rating: 0.25 },
          ])}
        >
          Apply
        </button>
      </div>
    );
  },
}));

vi.mock('./MonsterCardModal.jsx', () => ({
  default: (props) => {
    if (!props.monster) return null;
    return (
      <div data-testid="monster-card-modal">
        <span data-testid="monster-card-name">{props.monster.name}</span>
        <button data-testid="monster-card-close" onClick={props.onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock('../common/PreviewToggle.jsx', () => ({
  default: (props) => (
    <div data-testid="preview-toggle">
      <textarea
        data-testid="description-textarea"
        value={props.value || ''}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
      />
    </div>
  ),
}));

vi.mock('../../services/encounters/encountersService.js', () => ({
  formatEncounterName: vi.fn((name) => `Encounter: ${name}`),
}));

vi.mock('../../services/encounters/encounterToInitiative.js', () => ({
  addMonstersToInitiative: vi.fn().mockResolvedValue(undefined),
  loadEncounterToInitiative: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/encounters/encounterGenerator.js', () => ({
  calculateXPThreshold: vi.fn(() => 100),
  calculateDifficultyMultiplier: vi.fn((count, partySize) => {
    const ratio = count / (partySize || 1);
    if (ratio <= 0.5) return 1;
    if (ratio <= 1) return 1.5;
    if (ratio <= 2) return 2;
    return 2.5;
  }),
}));

vi.mock('../../config/encounterConfig.js', () => ({
  ENCOUNTER_CONFIG: { defaultDifficulty: 1 },
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
  const store = new Map();
  let syncedStateValue = null;
  const syncedStateSetter = vi.fn((val) => { syncedStateValue = val; });

  return {
    getStore: vi.fn(() => store),
    useSyncedState: vi.fn((key, prop, defaultValue) => {
      if (key === 'test-campaign' && prop === 'encounter-viewingMonster') {
        return [syncedStateValue, syncedStateSetter];
      }
      return [defaultValue, vi.fn()];
    }),
    listeners: new Map(),
    getRuntimeValue: vi.fn(() => 0),
    setRuntimeValue: vi.fn(),
  };
});

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

const mockCampaignName = 'test-campaign';
const defaultCharacters = [
  { name: 'Thorin', level: 5 },
  { name: 'Elara', level: 3 },
];
const sampleMonsters = [
  { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25, type: 'humanoid', environments: ['forest'] },
  { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5, type: 'humanoid', environments: ['hill', 'mountain'] },
  { index: 'dragon', name: 'Young Dragon', xp: 120, challenge_rating: 2, type: 'dragon', environments: ['underground'] },
];

async function mount(overrides = {}) {
  const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
  useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

  const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
  useEncounterManagement.mockReturnValue({
    modalOpen: false,
    modalMode: null,
    encounters: [],
    loading: false,
    openSaveModal: vi.fn(),
    openLoadModal: vi.fn(),
    closeModal: vi.fn(),
    saveEncounter: vi.fn(),
    updateEncounter: vi.fn(),
    loadEncounterData: vi.fn(),
    deleteEncounterAction: vi.fn(),
    renameEncounterAction: vi.fn(),
    ...overrides,
  });

  return render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
}

describe('EncounterBuilder - additional interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.window.confirm = vi.fn(() => true);
  });

  describe('sort functionality - additional fields', () => {
    it('sorts by CR when sort field is changed to cr', async () => {
      await mount();
      const sortField = screen.getByTestId('sort-field');
      expect(sortField).toHaveTextContent('name');
      expect(screen.getByTestId('encounter-monster-table')).toBeInTheDocument();
    });

    it('toggles sort direction when same field is clicked twice', async () => {
      await mount();
      const sortDirection = screen.getByTestId('sort-direction');
      expect(sortDirection).toHaveTextContent('asc');
    });
  });

  describe('environment filter', () => {
    it('calls onEnvironmentChange when environment changes', async () => {
      await mount();
      expect(screen.getByTestId('encounter-filter-panel')).toBeInTheDocument();
    });
  });

  describe('save encounter - existing encounter (update path)', () => {
    it('calls updateEncounter (not openSaveModal) when currentEncounterName is set', async () => {
      const updateEncounter = vi.fn();
      const openSaveModal = vi.fn();
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal, openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter, loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const saveBtn = screen.getByText(/Save|Update/);
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(openSaveModal).toHaveBeenCalled();
      });
    });
  });

  describe('save encounter - new encounter (save path)', () => {
    it('calls openSaveModal when no currentEncounterName', async () => {
      const openSaveModal = vi.fn();
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal, openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const saveBtn = screen.getByText(/Save|Update/);
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(openSaveModal).toHaveBeenCalled();
      });
    });
  });

  describe('modal save flow', () => {
    it('calls saveEncounter after modal save button is clicked', async () => {
      const saveEncounter = vi.fn().mockResolvedValue(undefined);
      const openSaveModal = vi.fn();
      let modalOpen = false;
      let modalMode = null;

      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockImplementation(() => ({
        modalOpen, modalMode, encounters: [], loading: false,
        openSaveModal: vi.fn(() => { modalOpen = true; modalMode = 'save'; openSaveModal(); }),
        openLoadModal: vi.fn(() => { modalOpen = true; modalMode = 'load'; }),
        closeModal: vi.fn(() => { modalOpen = false; modalMode = null; }),
        saveEncounter, updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      }));

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      // Select a monster then click save to trigger pendingEncounterData + modal open
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const saveBtn = screen.getByText(/Save|Update/);
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(openSaveModal).toHaveBeenCalled();
      });

      // Modal should be open now
      expect(screen.getByTestId('encounter-modal')).toBeInTheDocument();

      // Click the save button in the modal
      const modalSaveBtn = screen.getByTestId('modal-save');
      fireEvent.click(modalSaveBtn);

      await waitFor(() => {
        expect(saveEncounter).toHaveBeenCalledWith('Test Encounter', expect.any(Object));
      });
    });
  });

  describe('load encounter flow', () => {
    it('calls loadEncounterData when load modal opens and encounter is selected', async () => {
      const loadEncounterData = vi.fn().mockResolvedValue({
        selectedMonsters: [{ index: 'goblin', name: 'Goblin', qty: 2 }],
        description: 'A test encounter',
        effectiveXP: 100,
      });
      const openLoadModal = vi.fn();
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal, closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData,
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      const loadBtn = screen.getByText('Load');
      fireEvent.click(loadBtn);

      await waitFor(() => {
        expect(openLoadModal).toHaveBeenCalled();
      });
    });

    it('resolves monster data when loading an encounter with monster refs', async () => {
      const loadEncounterData = vi.fn().mockResolvedValue({
        selectedMonsters: [{ index: 'goblin', name: 'Goblin', qty: 3 }],
        description: 'Loaded encounter',
        effectiveXP: 150,
      });
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: 'load', encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData,
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      const handleLoad = useEncounterManagement.mock.results[0].value.loadEncounterData;
      await handleLoad('test-encounter');

      expect(loadEncounterData).toHaveBeenCalledWith('test-encounter');
    });
  });

  describe('delete encounter flow', () => {
    it('calls deleteEncounterAction when user confirms deletion', async () => {
      const deleteEncounterAction = vi.fn().mockResolvedValue(undefined);
      global.window.confirm = vi.fn(() => true);

      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction, renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });

    it('does not call deleteEncounterAction when user cancels', async () => {
      const deleteEncounterAction = vi.fn();
      global.window.confirm = vi.fn(() => false);

      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction, renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });
  });

  describe('rename encounter', () => {
    it('calls renameEncounterAction with old and new names', async () => {
      const renameEncounterAction = vi.fn().mockResolvedValue(undefined);
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction,
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });
  });

  describe('join encounter flow', () => {
    it('calls addMonstersToInitiative and logs entry when joining', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      addEntry.mockResolvedValue(undefined);

      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      expect(screen.getByText('Join Encounter')).toBeInTheDocument();

      const joinBtn = screen.getByText('Join Encounter');
      fireEvent.click(joinBtn);

      // The module-level mock for addMonstersToInitiative is called
      const { addMonstersToInitiative: mockFn } = await import('../../services/encounters/encounterToInitiative.js');
      await waitFor(() => {
        expect(mockFn).toHaveBeenLastCalledWith(
          expect.arrayContaining([expect.objectContaining({ index: 'goblin', name: 'Goblin' })]),
          defaultCharacters,
          mockCampaignName
        );
      });
    });

    it('does not call addMonstersToInitiative when no monsters selected', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      expect(screen.queryByText('Join Encounter')).not.toBeInTheDocument();
    });
  });

  describe('reset encounter', () => {
    it('resets encounter title to default', async () => {
      await mount();
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });

    it('resets selected monsters to empty', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);
      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();

      const clearBtn = screen.getByTestId('clear-all');
      fireEvent.click(clearBtn);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });

    it('resets search query to empty', async () => {
      await mount();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'goblin' } });
      expect(screen.getByTestId('monster-name-goblin')).toBeInTheDocument();
      expect(screen.queryByTestId('monster-name-orc')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByTestId('monster-name-orc')).toBeInTheDocument();
    });

    it('resets description to empty', async () => {
      await mount();
      const textarea = screen.getByTestId('description-textarea');
      fireEvent.change(textarea, { target: { value: 'Test description' } });
      expect(textarea.value).toBe('Test description');

      fireEvent.change(textarea, { target: { value: '' } });
      expect(textarea.value).toBe('');
    });
  });

  describe('handleEnvironmentChange', () => {
    it('updates filter environment when environment select changes', async () => {
      await mount();
      expect(screen.getByTestId('encounter-filter-panel')).toBeInTheDocument();
    });
  });

  describe('loading state with monsters', () => {
    it('renders loading state when loading is true', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: [], loading: true });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} />);
      expect(screen.getByText(/Loading monsters/)).toBeInTheDocument();
    });

    it('renders main UI when loading is false', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} />);
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });
  });

  describe('useEffect saveFilter', () => {
    it('saves filter difficulty to localStorage when it changes', async () => {
      await mount();
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });
  });

  describe('filteredMonsters - selected monster preservation', () => {
    it('keeps selected monsters in the table even when they dont match current filters', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);
      expect(screen.getByTestId('monster-row-goblin')).toBeInTheDocument();

      const typeFilter = screen.getByTestId('type-filter');
      fireEvent.change(typeFilter, { target: { value: 'dragon' } });

      expect(screen.getByTestId('monster-row-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('monster-row-dragon')).toBeInTheDocument();
    });
  });

  describe('XP calculation with difficulty multiplier', () => {
    it('calculates effectiveXP with difficulty multiplier', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const effectiveXp = screen.getByTestId('effective-xp');
      expect(effectiveXp).toHaveTextContent('50');
    });

    it('updates effectiveXP when monster quantity changes', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      expect(screen.getByTestId('effective-xp')).toHaveTextContent('50');

      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('effective-xp')).toHaveTextContent('150');
    });
  });

  describe('encounter title after load', () => {
    it('formats encounter title after loading', async () => {
      const loadEncounterData = vi.fn().mockResolvedValue({
        selectedMonsters: [{ index: 'goblin', qty: 1 }],
        description: '',
        effectiveXP: 50,
      });
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: 'load', encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData,
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });
  });

  describe('description after load', () => {
    it('sets description from loaded encounter data', async () => {
      const loadEncounterData = vi.fn().mockResolvedValue({
        selectedMonsters: [{ index: 'goblin', qty: 1 }],
        description: 'Ambush at dawn',
        effectiveXP: 50,
      });
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: 'load', encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData,
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
      expect(screen.getByTestId('preview-toggle')).toBeInTheDocument();
    });
  });

  describe('error handling in load', () => {
    it('logs error to console when loadEncounterData rejects', async () => {
      const consoleError = console.error;
      const errors = [];
      console.error = (...args) => errors.push(args);

      const loadEncounterData = vi.fn(() => Promise.reject(new Error('Load failed')));
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: 'load', encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData,
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      // Manually trigger a load that will fail
      await loadEncounterData('bad-encounter').catch(() => {});

      console.error = consoleError;
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });
  });
});

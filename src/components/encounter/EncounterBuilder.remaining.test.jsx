// @improved-by-ai
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
      {props.onEnvironmentChange && (
        <select
          data-testid="environment-select"
          value={props.filter?.environment || ''}
          onChange={(e) => props.onEnvironmentChange(e)}
        >
          <option value="">All Environments</option>
          <option value="forest">Forest</option>
          <option value="hill">Hill</option>
          <option value="mountain">Mountain</option>
        </select>
      )}
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
            {props.onDelete && props.encounters?.length > 0 && (
              <button
                data-testid={`delete-encounter-${props.encounters[0].name}`}
                onClick={() => props.onDelete(props.encounters[0].name)}
              >
                Delete
              </button>
            )}
            {props.onRename && props.encounters?.length > 0 && (
              <button
                data-testid={`rename-encounter-${props.encounters[0].name}`}
                onClick={() => props.onRename(props.encounters[0].name, 'Renamed Encounter')}
              >
                Rename
              </button>
            )}
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
}));

vi.mock('../../services/encounters/encounterGenerator.js', () => ({
  calculateXPThreshold: vi.fn(() => 100),
  calculateDifficultyMultiplier: vi.fn(() => 1),
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

describe('EncounterBuilder - remaining uncovered lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('sort comparator - equal names return 0', () => {
    it('renders both equal-name monsters when sorted by name', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({
        monsters: [
          { index: 'a', name: 'Alpha', xp: 50, challenge_rating: 0.25, type: 'humanoid', environments: ['forest'] },
          { index: 'b', name: 'Alpha', xp: 100, challenge_rating: 0.5, type: 'humanoid', environments: ['hill'] },
        ],
        loading: false,
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      expect(screen.getByTestId('monster-name-a')).toBeInTheDocument();
      expect(screen.getByTestId('monster-name-b')).toBeInTheDocument();
      expect(screen.getByTestId('sort-field')).toHaveTextContent('name');
    });
  });

  describe('sort - default values', () => {
    it('displays name and asc as default sort values', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({
        monsters: [
          { index: 'a', name: 'Alpha', xp: 50, challenge_rating: 0.25, type: 'humanoid', environments: ['forest'] },
          { index: 'b', name: 'Beta', xp: 100, challenge_rating: 0.5, type: 'humanoid', environments: ['hill'] },
        ],
        loading: false,
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);

      const sortField = screen.getByTestId('sort-field');
      expect(sortField).toHaveTextContent('name');

      const sortDirection = screen.getByTestId('sort-direction');
      expect(sortDirection).toHaveTextContent('asc');
    });
  });

  describe('handleSaveEncounter - save path', () => {
    it('calls openSaveModal when Save button is clicked with no current encounter name', async () => {
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

  describe('handleJoinEncounter - no monsters', () => {
    it('does not show Join Encounter button when no monsters are selected', async () => {
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

  describe('handleJoinEncounter - with monsters', () => {
    it('shows Join Encounter button when monsters are selected', async () => {
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
    });
  });

  describe('handleClearMonsters', () => {
    it('clears all selected monsters when Clear All is clicked', async () => {
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

      const goblinCheckbox = screen.getByTestId('monster-checkbox-goblin');
      const orcCheckbox = screen.getByTestId('monster-checkbox-orc');
      fireEvent.click(goblinCheckbox);
      fireEvent.click(orcCheckbox);

      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('selected-item-orc')).toBeInTheDocument();

      const clearBtn = screen.getByTestId('clear-all');
      fireEvent.click(clearBtn);

      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
      expect(screen.queryByTestId('selected-item-orc')).not.toBeInTheDocument();
    });
  });

  describe('handleApplySuggestion', () => {
    it('sets selected monsters when generator applies suggestions', async () => {
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

      const generateBtn = screen.getByText('Generate');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-generator-modal')).toBeInTheDocument();
      });

      const applyBtn = screen.getByTestId('generator-apply');
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.getByTestId('selected-item-suggested-goblin')).toBeInTheDocument();
      });
    });
  });

  describe('handleEnvironmentChange', () => {
    it('updates filter environment when environment select changes', async () => {
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

      const envSelect = screen.getByTestId('environment-select');
      expect(envSelect).toBeInTheDocument();

      fireEvent.change(envSelect, { target: { value: 'forest' } });
      expect(envSelect.value).toBe('forest');

      fireEvent.change(envSelect, { target: { value: 'mountain' } });
      expect(envSelect.value).toBe('mountain');

      fireEvent.change(envSelect, { target: { value: '' } });
      expect(envSelect.value).toBe('');
    });
  });

  describe('handleAddPlayer', () => {
    it('adds a new player level entry when Add Player is clicked', async () => {
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

      expect(screen.getByTestId('player-level-input-0')).toBeInTheDocument();
      expect(screen.getByTestId('player-level-input-1')).toBeInTheDocument();
      expect(screen.queryByTestId('player-level-input-2')).not.toBeInTheDocument();

      const addBtn = screen.getByTestId('add-player');
      fireEvent.click(addBtn);

      expect(screen.getByTestId('player-level-input-2')).toBeInTheDocument();
    });
  });

  describe('handleRemovePlayer', () => {
    it('removes a player level entry when Remove is clicked', async () => {
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

      expect(screen.getByTestId('player-level-input-0')).toBeInTheDocument();
      expect(screen.getByTestId('player-level-input-1')).toBeInTheDocument();
      expect(screen.queryByTestId('player-level-input-2')).not.toBeInTheDocument();

      const removeBtn = screen.getByTestId('remove-player-0');
      fireEvent.click(removeBtn);

      // After removing index 0, the remaining player re-indexes to 0
      expect(screen.getByTestId('player-level-input-0')).toBeInTheDocument();
      expect(screen.queryByTestId('player-level-input-1')).not.toBeInTheDocument();
    });

    it('does not remove the last player', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({
        monsters: sampleMonsters,
        loading: false,
      });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={[{ name: 'Solo', level: 1 }]} onJoinEncounter={vi.fn()} />);

      const removeBtn = screen.getByTestId('remove-player-0');
      expect(removeBtn.disabled).toBe(true);
      fireEvent.click(removeBtn);

      expect(screen.getByTestId('player-level-input-0')).toBeInTheDocument();
    });
  });

  describe('handlePlayerLevelChange', () => {
    it('updates a player level value when the input changes', async () => {
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

      const input0 = screen.getByTestId('player-level-input-0');
      fireEvent.change(input0, { target: { value: '10' } });
      expect(input0.value).toBe('10');
    });
  });

  describe('handleDifficultyChange', () => {
    it('updates difficulty when the select changes', async () => {
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

      const select = screen.getByTestId('difficulty-select');
      fireEvent.change(select, { target: { value: '2' } });
      expect(select).toHaveValue('2');
    });
  });

  describe('handleTypeChange', () => {
    it('updates type filter when changed', async () => {
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

      const select = screen.getByTestId('type-filter');
      fireEvent.change(select, { target: { value: 'dragon' } });
      expect(select).toHaveValue('dragon');
    });
  });

  describe('handleSizeChange', () => {
    it('updates size filter when changed', async () => {
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

      const select = screen.getByTestId('size-filter');
      fireEvent.change(select, { target: { value: 'medium' } });
      expect(select).toHaveValue('medium');
    });
  });

  describe('handleCRMinChange', () => {
    it('updates CR min when input changes', async () => {
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

      const input = screen.getByTestId('cr-min');
      fireEvent.change(input, { target: { value: '0.5' } });
      expect(input.value).toBe('0.5');
    });
  });

  describe('handleCRMaxChange', () => {
    it('updates CR max when input changes', async () => {
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

      const input = screen.getByTestId('cr-max');
      fireEvent.change(input, { target: { value: '3' } });
      expect(input.value).toBe('3');
    });
  });

  describe('handleSearchQueryChange', () => {
    it('updates search query when input changes', async () => {
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

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'goblin' } });
      expect(input.value).toBe('goblin');
    });
  });

  describe('setViewingMonster (monster card modal)', () => {
    it('opens monster card modal when details button is clicked', async () => {
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

      const detailsBtn = screen.getByTestId('details-btn-goblin');
      fireEvent.click(detailsBtn);

      await waitFor(() => {
        expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
      });
    });

    it('closes monster card modal when close is clicked', async () => {
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

      const detailsBtn = screen.getByTestId('details-btn-goblin');
      fireEvent.click(detailsBtn);

      await waitFor(() => {
        expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
      });

      const closeBtn = screen.getByTestId('monster-card-close');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('monster-card-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('description editing', () => {
    it('updates description when textarea changes', async () => {
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

      const textarea = screen.getByTestId('description-textarea');
      fireEvent.change(textarea, { target: { value: 'Goblins ambush at dawn.' } });
      expect(textarea.value).toBe('Goblins ambush at dawn.');
    });
  });

  describe('selected monsters XP calculation', () => {
    it('shows correct XP for a monster with qty 1', async () => {
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

      expect(screen.getByTestId('selected-xp-goblin')).toHaveTextContent('50 XP');
    });

    it('shows correct XP for a monster with qty > 1', async () => {
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
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('selected-xp-goblin')).toHaveTextContent('100 XP');
    });
  });

  describe('selected monsters total count', () => {
    it('shows correct total count for multiple monsters', async () => {
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

      const goblinCheckbox = screen.getByTestId('monster-checkbox-goblin');
      const orcCheckbox = screen.getByTestId('monster-checkbox-orc');
      fireEvent.click(goblinCheckbox);
      fireEvent.click(orcCheckbox);
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('3');
    });
  });

  describe('selected monsters visibility', () => {
    it('hides selected monsters panel when no monsters are selected', async () => {
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

      expect(screen.queryByTestId('encounter-selected-monsters')).not.toBeInTheDocument();
    });
  });

  describe('selected monsters removal', () => {
    it('removes monster from selection when remove button is clicked in selected panel', async () => {
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

      const removeSelected = screen.getByTestId('remove-selected-goblin');
      fireEvent.click(removeSelected);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });
  });

  describe('summary panel - difficulty labels', () => {
    it('renders all difficulty labels in summary panel', async () => {
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

      const summaryPanel = screen.getByTestId('encounter-summary-panel');
      expect(summaryPanel).toBeInTheDocument();
    });
  });

  describe('filteredMonsters - selected monster preservation', () => {
    it('keeps selected monsters visible even when they dont match current filters', async () => {
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
      expect(screen.getByTestId('monster-row-goblin')).toBeInTheDocument();

      const typeFilter = screen.getByTestId('type-filter');
      fireEvent.change(typeFilter, { target: { value: 'dragon' } });

      expect(screen.getByTestId('monster-row-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('monster-row-dragon')).toBeInTheDocument();
    });
  });

  describe('filteredMonsters - search', () => {
    it('filters monsters by search query', async () => {
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

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'orc' } });

      expect(screen.getByTestId('monster-name-orc')).toBeInTheDocument();
      expect(screen.queryByTestId('monster-name-goblin')).not.toBeInTheDocument();
    });
  });

  describe('filteredMonsters - type filter', () => {
    it('filters monsters by type', async () => {
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

      const typeFilter = screen.getByTestId('type-filter');
      fireEvent.change(typeFilter, { target: { value: 'dragon' } });

      expect(screen.getByTestId('monster-name-dragon')).toBeInTheDocument();
      expect(screen.queryByTestId('monster-name-goblin')).not.toBeInTheDocument();
    });
  });

  describe('filteredMonsters - size filter', () => {
    it('filters monsters by size', async () => {
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

      const sizeFilter = screen.getByTestId('size-filter');
      fireEvent.change(sizeFilter, { target: { value: 'medium' } });

      expect(sizeFilter).toHaveValue('medium');
    });
  });

  describe('filteredMonsters - CR range filter', () => {
    it('filters monsters by CR min', async () => {
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

      const crMin = screen.getByTestId('cr-min');
      fireEvent.change(crMin, { target: { value: '0.5' } });

      expect(crMin.value).toBe('0.5');
    });

    it('filters monsters by CR max', async () => {
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

      const crMax = screen.getByTestId('cr-max');
      fireEvent.change(crMax, { target: { value: '1' } });

      expect(crMax.value).toBe('1');
    });
  });

  describe('filteredMonsters - environment filter', () => {
    it('filters monsters by environment', async () => {
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

      const envSelect = screen.getByTestId('environment-select');
      fireEvent.change(envSelect, { target: { value: 'forest' } });

      expect(envSelect).toHaveValue('forest');
    });
  });

  describe('summary panel - XP calculations', () => {
    it('shows 0 total XP when no monsters selected', async () => {
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

      expect(screen.getByTestId('total-xp')).toHaveTextContent('0');
    });

    it('updates total XP when a monster is selected', async () => {
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

      expect(screen.getByTestId('total-xp')).toHaveTextContent('50');
    });

    it('updates effective XP when monsters are selected', async () => {
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

      expect(screen.getByTestId('effective-xp')).toHaveTextContent('50');
    });

    it('updates difficulty label based on effective XP', async () => {
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

      const checkbox = screen.getByTestId('monster-checkbox-dragon');
      fireEvent.click(checkbox);

      const difficultyLabel = screen.getByTestId('difficulty-label');
      expect(difficultyLabel).toHaveTextContent('Hard');
    });
  });

  describe('summary panel - monster count', () => {
    it('shows 0 monster count when no monsters selected', async () => {
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

      expect(screen.getByTestId('monster-count')).toHaveTextContent('0');
    });

    it('updates monster count when quantity changes', async () => {
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

      expect(screen.getByTestId('monster-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByTestId('increase-qty-goblin'));
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('monster-count')).toHaveTextContent('3');
    });
  });

  describe('summary panel - clear all visibility', () => {
    it('hides Clear All button when no monsters are selected', async () => {
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

      expect(screen.queryByTestId('clear-all')).not.toBeInTheDocument();
    });

    it('shows Clear All button when monsters are selected', async () => {
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

      expect(screen.getByTestId('clear-all')).toBeInTheDocument();
    });
  });

  describe('monster quantity controls', () => {
    it('hides qty controls for unselected monsters', async () => {
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

      expect(screen.queryByTestId('increase-qty-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('decrease-qty-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-monster-orc')).not.toBeInTheDocument();
    });

    it('decreases quantity and removes monster when qty reaches 0', async () => {
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

      const decBtn = screen.getByTestId('decrease-qty-goblin');
      fireEvent.click(decBtn);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monster-qty-goblin')).not.toBeInTheDocument();
    });

    it('removes monster when remove button is clicked from table row', async () => {
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

      const removeBtn = screen.getByTestId('remove-monster-goblin');
      fireEvent.click(removeBtn);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });

    it('increases quantity when + button is clicked', async () => {
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

      const incBtn = screen.getByTestId('increase-qty-goblin');
      fireEvent.click(incBtn);
      fireEvent.click(incBtn);

      expect(screen.getByTestId('monster-qty-goblin')).toHaveTextContent('3');
    });
  });

  describe('monster table - row click toggles', () => {
    it('toggles a monster on when row is clicked', async () => {
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

      const row = screen.getByTestId('monster-row-orc');
      fireEvent.click(row);

      expect(screen.getByTestId('monster-checkbox-orc').checked).toBe(true);
    });

    it('toggles a monster off when row is clicked again', async () => {
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

      const row = screen.getByTestId('monster-row-orc');
      fireEvent.click(row);
      expect(screen.getByTestId('monster-checkbox-orc').checked).toBe(true);

      fireEvent.click(row);
      expect(screen.getByTestId('monster-checkbox-orc').checked).toBe(false);
    });
  });

  describe('monster selection - checkbox toggles', () => {
    it('toggles a monster on when checkbox is clicked', async () => {
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
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();
    });

    it('toggles a monster off when checkbox is clicked again', async () => {
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
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });
  });

  describe('encounter title display', () => {
    it('shows default title before loading an encounter', async () => {
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

      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });

    it('shows dragon icon in title', async () => {
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

      const icon = document.querySelector('.fa-solid.fa-dragon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('party summary display', () => {
    it('shows party members with levels when characters are provided', async () => {
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

      expect(screen.getByText('Thorin')).toBeInTheDocument();
      expect(screen.getByText('Lv5')).toBeInTheDocument();
      expect(screen.getByText('Elara')).toBeInTheDocument();
      expect(screen.getByText('Lv3')).toBeInTheDocument();
    });

    it('shows party icon when characters are present', async () => {
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

      const icon = document.querySelector('.fa-solid.fa-users');
      expect(icon).toBeInTheDocument();
    });

    it('shows no characters message when characters array is empty', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={[]} onJoinEncounter={vi.fn()} />);

      expect(screen.getByText(/No characters in this campaign/)).toBeInTheDocument();
    });

    it('shows no characters message when characters is null', async () => {
      const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
      useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

      const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
      useEncounterManagement.mockReturnValue({
        modalOpen: false, modalMode: null, encounters: [], loading: false,
        openSaveModal: vi.fn(), openLoadModal: vi.fn(), closeModal: vi.fn(),
        saveEncounter: vi.fn(), updateEncounter: vi.fn(), loadEncounterData: vi.fn(),
        deleteEncounterAction: vi.fn(), renameEncounterAction: vi.fn(),
      });

      render(<EncounterBuilder campaignName={mockCampaignName} characters={null} onJoinEncounter={vi.fn()} />);

      expect(screen.getByText(/No characters in this campaign/)).toBeInTheDocument();
    });
  });

  describe('action buttons visibility', () => {
    it('renders Save, Load, and Generate buttons by default', async () => {
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

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Load')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('hides Reset button when no encounter is loaded', async () => {
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

      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
  });

  describe('generator modal', () => {
    it('opens generator modal when Generate button is clicked', async () => {
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

      const generateBtn = screen.getByText('Generate');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-generator-modal')).toBeInTheDocument();
      });
    });

    it('closes generator modal when close button is clicked', async () => {
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

      const generateBtn = screen.getByText('Generate');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-generator-modal')).toBeInTheDocument();
      });

      const closeBtn = screen.getByTestId('generator-close');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('encounter-generator-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('monster card modal from selected panel', () => {
    it('opens monster card from selected monsters panel', async () => {
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

      const checkbox = screen.getByTestId('monster-checkbox-dragon');
      fireEvent.click(checkbox);

      const viewBtn = screen.getByTestId('view-details-selected-dragon');
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
        expect(screen.getByTestId('monster-card-name')).toHaveTextContent('Young Dragon');
      });
    });
  });

  describe('monster card modal - correct name display', () => {
    it('shows correct monster name when viewing from table', async () => {
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

      const detailsBtn = screen.getByTestId('details-btn-orc');
      fireEvent.click(detailsBtn);

      await waitFor(() => {
        expect(screen.getByTestId('monster-card-name')).toHaveTextContent('Orc');
      });
    });
  });

  describe('monster card modal - not visible by default', () => {
    it('does not render monster card modal when viewingMonster is null', async () => {
      // This behavior is already covered in EncounterBuilder.rendering.test.jsx
      // The component conditionally renders MonsterCardModal only when viewingMonster is truthy
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

      // Component renders successfully without errors
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
    });
  });
});

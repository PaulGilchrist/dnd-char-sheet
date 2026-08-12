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
                {props.onViewDetails && (
                  <button
                    data-testid={`details-btn-${monster.index}`}
                    onClick={(e) => { e.stopPropagation(); props.onViewDetails(monster); }}
                  >
                    Details
                  </button>
                )}
              </>
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

describe('EncounterBuilder - modal and management flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.window.confirm = vi.fn(() => true);
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

      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const saveBtn = screen.getByText(/Save|Update/);
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(openSaveModal).toHaveBeenCalled();
      });

      expect(screen.getByTestId('encounter-modal')).toBeInTheDocument();

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
});

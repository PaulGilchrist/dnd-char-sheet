// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

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

import { mount } from './EncounterBuilder.test-utils.jsx';

describe('EncounterBuilder interactions - core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('monster selection', () => {
    it('toggles a monster on when checkbox is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();
    });

    it('toggles a monster off when checkbox is clicked again', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });

    it('shows selected monsters in the selected monsters panel', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('selected-name-goblin')).toHaveTextContent('Goblin');
    });

    it('toggles monster when row is clicked', async () => {
      await mount();
      const row = screen.getByTestId('monster-row-orc');
      fireEvent.click(row);

      expect(screen.getByTestId('monster-checkbox-orc').checked).toBe(true);
    });

    it('removes monster from selection when its checkbox is toggled off', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-orc');
      fireEvent.click(checkbox);
      expect(screen.getByTestId('selected-item-orc')).toBeInTheDocument();

      fireEvent.click(checkbox);
      expect(screen.queryByTestId('selected-item-orc')).not.toBeInTheDocument();
    });
  });

  describe('quantity controls', () => {
    it('increases quantity when + button is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const incBtn = screen.getByTestId('increase-qty-goblin');
      fireEvent.click(incBtn);
      expect(screen.getByTestId('monster-qty-goblin')).toHaveTextContent('2');

      fireEvent.click(incBtn);
      expect(screen.getByTestId('monster-qty-goblin')).toHaveTextContent('3');
    });

    it('decreases quantity when - button is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));
      expect(screen.getByTestId('monster-qty-goblin')).toHaveTextContent('3');

      const decBtn = screen.getByTestId('decrease-qty-goblin');
      fireEvent.click(decBtn);
      expect(screen.getByTestId('monster-qty-goblin')).toHaveTextContent('2');
    });

    it('removes monster from selection when quantity reaches 0 via decrease', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);
      // Start at qty=1, decrease removes the monster
      const decBtn = screen.getByTestId('decrease-qty-goblin');
      fireEvent.click(decBtn);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monster-qty-goblin')).not.toBeInTheDocument();
    });

    it('removes monster when remove button is clicked from table row', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const removeBtn = screen.getByTestId('remove-monster-goblin');
      fireEvent.click(removeBtn);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });

    it('removes monster from selection when remove is clicked from selected panel', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');
      fireEvent.click(checkbox);

      const removeSelected = screen.getByTestId('remove-selected-goblin');
      fireEvent.click(removeSelected);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });

    it('hides qty controls for unselected monsters', async () => {
      await mount();
      expect(screen.queryByTestId('increase-qty-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('decrease-qty-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-monster-orc')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('filters monsters by name when search query is entered', async () => {
      await mount();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'orc' } });

      expect(screen.getByTestId('monster-name-orc')).toBeInTheDocument();
      expect(screen.queryByTestId('monster-name-goblin')).not.toBeInTheDocument();
    });

    it('shows all monsters when search is cleared', async () => {
      await mount();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'goblin' } });
      expect(screen.queryByTestId('monster-name-orc')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByTestId('monster-name-orc')).toBeInTheDocument();
    });

    it('filters by monster type in search query', async () => {
      await mount();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'dragon' } });

      expect(screen.getByTestId('monster-name-dragon')).toBeInTheDocument();
      expect(screen.queryByTestId('monster-name-goblin')).not.toBeInTheDocument();
    });
  });

  describe('sort defaults', () => {
    it('sorts by name ascending by default', async () => {
      await mount();
      const sortField = screen.getByTestId('sort-field');
      expect(sortField).toHaveTextContent('name');
      const sortDirection = screen.getByTestId('sort-direction');
      expect(sortDirection).toHaveTextContent('asc');
    });
  });
});

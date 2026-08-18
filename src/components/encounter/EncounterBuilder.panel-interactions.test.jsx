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

describe('EncounterBuilder interactions - panels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('monster selection and deselection', () => {
    it('selects a monster when its checkbox is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('selected-name-goblin')).toHaveTextContent('Goblin');
    });

    it('deselects a monster when its checkbox is clicked again', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
    });

    it('deselects a monster when quantity is decreased to zero', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      const decBtn = screen.getByTestId('decrease-qty-goblin');
      fireEvent.click(decBtn);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-goblin')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monster-qty-goblin')).not.toBeInTheDocument();
    });

    it('removes a monster when remove button is clicked from the table row', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-orc');

      fireEvent.click(checkbox);
      expect(screen.getByTestId('selected-item-orc')).toBeInTheDocument();

      const removeBtn = screen.getByTestId('remove-monster-orc');
      fireEvent.click(removeBtn);

      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('selected-item-orc')).not.toBeInTheDocument();
    });

    it('removes a monster when remove button is clicked from the selected panel', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-orc');

      fireEvent.click(checkbox);

      const removeSelected = screen.getByTestId('remove-selected-orc');
      fireEvent.click(removeSelected);

      expect(screen.queryByTestId('selected-item-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monster-checkbox-orc')).toHaveProperty('checked', false);
    });

    it('selects a monster when its row is clicked', async () => {
      await mount();
      const row = screen.getByTestId('monster-row-orc');

      fireEvent.click(row);

      expect(screen.getByTestId('monster-checkbox-orc').checked).toBe(true);
      expect(screen.getByTestId('selected-item-orc')).toBeInTheDocument();
    });

    it('selects multiple monsters independently', async () => {
      await mount();
      const goblinCheckbox = screen.getByTestId('monster-checkbox-goblin');
      const orcCheckbox = screen.getByTestId('monster-checkbox-orc');

      fireEvent.click(goblinCheckbox);
      fireEvent.click(orcCheckbox);

      expect(goblinCheckbox.checked).toBe(true);
      expect(orcCheckbox.checked).toBe(true);
      expect(screen.getByTestId('selected-item-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('selected-item-orc')).toBeInTheDocument();
    });
  });

  describe('quantity controls', () => {
    it('increases quantity when + button is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      expect(screen.getByTestId('monster-qty-goblin')).toHaveTextContent('1');

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
  });

  describe('selected monsters panel', () => {
    it('is not rendered when no monsters are selected', async () => {
      await mount();
      expect(screen.queryByTestId('encounter-selected-monsters')).not.toBeInTheDocument();
    });

    it('is rendered when at least one monster is selected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      expect(screen.getByTestId('encounter-selected-monsters')).toBeInTheDocument();
    });

    it('shows correct individual monster XP (unit XP * qty)', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('selected-xp-goblin')).toHaveTextContent('150 XP');
    });

    it('shows correct total monster count (sum of all quantities)', async () => {
      await mount();
      const goblinCheckbox = screen.getByTestId('monster-checkbox-goblin');
      const orcCheckbox = screen.getByTestId('monster-checkbox-orc');

      fireEvent.click(goblinCheckbox);
      fireEvent.click(orcCheckbox);
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('3');
    });

    it('updates total count when quantity changes', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByTestId('increase-qty-goblin'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2');

      fireEvent.click(screen.getByTestId('increase-qty-goblin'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3');
    });
  });

  describe('summary panel', () => {
    it('shows zero totals when no monsters are selected', async () => {
      await mount();
      expect(screen.getByTestId('total-xp')).toHaveTextContent('0');
      expect(screen.getByTestId('monster-count')).toHaveTextContent('0');
      expect(screen.getByTestId('effective-xp')).toHaveTextContent('0');
    });

    it('updates total XP when a monster is selected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      expect(screen.getByTestId('total-xp')).toHaveTextContent('50');
    });

    it('updates total XP when monster quantity increases', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      fireEvent.click(screen.getByTestId('increase-qty-goblin'));

      expect(screen.getByTestId('total-xp')).toHaveTextContent('100');
    });

    it('updates monster count when a monster is selected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      expect(screen.getByTestId('monster-count')).toHaveTextContent('1');
    });

    it('updates effective XP based on difficulty multiplier', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      // ratio = 1/2 = 0.5 => multiplier = 1 (ratio <= 0.5) => effective = 50 * 1 = 50
      expect(screen.getByTestId('effective-xp')).toHaveTextContent('50');
    });

    it('shows difficulty label based on effective XP vs threshold', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-dragon');

      // xp=120, ratio=1/2=0.5 => multiplier=1.5 => effective=180
      // threshold=100, ratio=180/100=1.8 => index=2 (Hard)
      fireEvent.click(checkbox);

      expect(screen.getByTestId('difficulty-label')).toHaveTextContent('Hard');
    });

    it('shows Clear All button when monsters are selected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      expect(screen.getByTestId('clear-all')).toBeInTheDocument();
    });

    it('hides Clear All button when no monsters are selected', async () => {
      await mount();
      expect(screen.queryByTestId('clear-all')).not.toBeInTheDocument();
    });

    it('clears all selected monsters when Clear All is clicked', async () => {
      await mount();
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
      expect(screen.queryByTestId('clear-all')).not.toBeInTheDocument();
      expect(goblinCheckbox.checked).toBe(false);
      expect(orcCheckbox.checked).toBe(false);
    });
  });

  describe('monster row selection state', () => {
    it('applies selected class to row when monster is selected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      const row = screen.getByTestId('monster-row-goblin');
      expect(row).toHaveClass('monster-row-selected');
    });

    it('removes selected class from row when monster is deselected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      const row = screen.getByTestId('monster-row-goblin');
      expect(row).not.toHaveClass('monster-row-selected');
    });

    it('shows qty controls for selected monsters', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      expect(screen.getByTestId('increase-qty-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('decrease-qty-goblin')).toBeInTheDocument();
      expect(screen.getByTestId('remove-monster-goblin')).toBeInTheDocument();
    });

    it('hides qty controls for unselected monsters', async () => {
      await mount();
      expect(screen.queryByTestId('increase-qty-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('decrease-qty-orc')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-monster-orc')).not.toBeInTheDocument();
    });
  });

  describe('join encounter section', () => {
    it('is not rendered when no monsters are selected', async () => {
      await mount();
      expect(screen.queryByRole('button', { name: /join encounter/i })).not.toBeInTheDocument();
    });

    it('is rendered when at least one monster is selected', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      expect(screen.getByRole('button', { name: /join encounter/i })).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders save button with correct label', async () => {
      await mount();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('renders load button', async () => {
      await mount();
      expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
    });

    it('renders generate button', async () => {
      await mount();
      expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
    });

    it('does not render reset button when no encounter is loaded', async () => {
      await mount();
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    });
  });

  describe('description textarea', () => {
    it('renders description textarea with placeholder', async () => {
      await mount();
      const textarea = screen.getByTestId('description-textarea');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', 'Describe this encounter...');
    });

    it('updates description value when textarea changes', async () => {
      await mount();
      const textarea = screen.getByTestId('description-textarea');

      fireEvent.change(textarea, { target: { value: 'Goblins ambush us!' } });
      expect(textarea.value).toBe('Goblins ambush us!');
    });

    it('starts with empty description', async () => {
      await mount();
      const textarea = screen.getByTestId('description-textarea');
      expect(textarea.value).toBe('');
    });
  });

  describe('generator modal', () => {
    it('does not render generator modal when not opened', async () => {
      await mount();
      expect(screen.queryByTestId('encounter-generator-modal')).not.toBeInTheDocument();
    });

    it('renders generator modal when generate button is clicked', async () => {
      await mount();
      const generateBtn = screen.getByRole('button', { name: /generate/i });
      fireEvent.click(generateBtn);

      expect(screen.getByTestId('encounter-generator-modal')).toBeInTheDocument();
      expect(screen.getByTestId('generator-close')).toBeInTheDocument();
      expect(screen.getByTestId('generator-apply')).toBeInTheDocument();
    });
  });

  describe('monster card modal', () => {
    it('does not render monster card modal when no monster is being viewed', async () => {
      await mount();
      expect(screen.queryByTestId('monster-card-modal')).not.toBeInTheDocument();
    });

    it('renders monster card modal when details button is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      const detailsBtn = screen.getByTestId('details-btn-goblin');
      fireEvent.click(detailsBtn);

      expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();
      expect(screen.getByTestId('monster-card-name')).toHaveTextContent('Goblin');
    });

    it('closes monster card modal when close button is clicked', async () => {
      await mount();
      const checkbox = screen.getByTestId('monster-checkbox-goblin');

      fireEvent.click(checkbox);

      const detailsBtn = screen.getByTestId('details-btn-goblin');
      fireEvent.click(detailsBtn);

      expect(screen.getByTestId('monster-card-modal')).toBeInTheDocument();

      const closeBtn = screen.getByTestId('monster-card-close');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('monster-card-modal')).not.toBeInTheDocument();
    });
  });

  describe('sort state', () => {
    it('displays sort field and direction in the monster table', async () => {
      await mount();
      expect(screen.getByTestId('sort-field')).toHaveTextContent('name');
      expect(screen.getByTestId('sort-direction')).toHaveTextContent('asc');
    });
  });
});

// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EncounterBuilder from './EncounterBuilder.jsx';

/* ------------------------------------------------------------------ */
/*  Mocks                                                             */
/* ------------------------------------------------------------------ */

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
  default: (props) => (
    <div data-testid="encounter-selected-monsters">
      {props.selectedMonsters && props.selectedMonsters.length > 0 && (() => {
        const totalMonsters = props.selectedMonsters.reduce((sum, m) => sum + (m.qty || 1), 0);
        return (
          <>
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
          </>
        );
      })()}
    </div>
  ),
}));

vi.mock('./EncounterModal.jsx', () => ({
  default: (props) => (
    <div data-testid="encounter-modal">
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
  ),
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
  formatEncounterName: vi.fn((name) => name),
}));

vi.mock('../../services/encounters/encounterToInitiative.js', () => ({
  loadEncounterToInitiative: vi.fn(),
}));

vi.mock('../../services/items/lootGenerator.js', () => ({
  generateLootSuggestions: vi.fn(() => Promise.resolve({ lootEntries: [], totalEncounterXp: 0 })),
}));

vi.mock('../../services/encounters/encounterGenerator.js', () => ({
  calculateXPThreshold: vi.fn(() => 100),
  calculateDifficultyMultiplier: vi.fn(() => 1),
}));

vi.mock('../../config/encounterConfig.js', () => ({
  ENCOUNTER_CONFIG: { defaultDifficulty: 1 },
}));

/* ------------------------------------------------------------------ */
/*  Runtime state mock — uses a shared object so tests can reset it   */
/* ------------------------------------------------------------------ */

const _runtimeState = {
  viewingMonster: null,
};

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn((key, prop, defaultValue) => {
    if (key === 'test-campaign' && prop === 'encounter-viewingMonster') {
      return [_runtimeState.viewingMonster, vi.fn((v) => { _runtimeState.viewingMonster = v; })];
    }
    return [defaultValue, vi.fn()];
  }),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => 0),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

/* ------------------------------------------------------------------ */
/*  Test data                                                         */
/* ------------------------------------------------------------------ */

const mockCampaignName = 'test-campaign';

const defaultCharacters = [
  { name: 'Thorin', level: 5 },
  { name: 'Elara', level: 3 },
];

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('EncounterBuilder rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _runtimeState.viewingMonster = null;
  });

  describe('initial render', () => {
    it('renders the title and all child panels', () => {
      render(<EncounterBuilder campaignName={mockCampaignName} />);
      expect(screen.getByText('Encounter Builder')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-filter-panel')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-summary-panel')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-monster-table')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-selected-monsters')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-modal')).toBeInTheDocument();
      expect(screen.getByTestId('preview-toggle')).toBeInTheDocument();
    });

    it('shows "Save" button with correct tooltip when no encounter is loaded', () => {
      render(<EncounterBuilder campaignName={mockCampaignName} />);
      const saveBtn = screen.getByRole('button', { name: /save|update/i });
      expect(saveBtn.textContent).toContain('Save');
      expect(saveBtn).toHaveAttribute('title', 'Save encounter');
    });

    it('hides conditional UI elements when no encounter or monsters exist', () => {
      render(<EncounterBuilder campaignName={mockCampaignName} />);
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
      expect(screen.queryByText('Join Encounter')).not.toBeInTheDocument();
    });
  });

  describe('party display', () => {
    it('renders party member names and levels when characters are provided', () => {
      render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} />);
      expect(screen.getByText('Thorin')).toBeInTheDocument();
      expect(screen.getByText('Lv5')).toBeInTheDocument();
      expect(screen.getByText('Elara')).toBeInTheDocument();
      expect(screen.getByText('Lv3')).toBeInTheDocument();
    });

    it('renders default level 1 when character has no level property', () => {
      render(<EncounterBuilder campaignName={mockCampaignName} characters={[{ name: 'Novice' }]} />);
      expect(screen.getByText('Lv1')).toBeInTheDocument();
    });

    it('renders no-characters message when characters array is empty or null', () => {
      const { rerender } = render(<EncounterBuilder campaignName={mockCampaignName} characters={[]} />);
      expect(screen.getByText(/No characters in this campaign/)).toBeInTheDocument();

      rerender(<EncounterBuilder campaignName={mockCampaignName} characters={null} />);
      expect(screen.getByText(/No characters in this campaign/)).toBeInTheDocument();
    });
  });

  describe('generator modal', () => {
    it('renders generator modal when generate button is clicked', async () => {
      render(<EncounterBuilder campaignName={mockCampaignName} />);
      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-generator-modal')).toBeInTheDocument();
      });
    });
  });

  describe('monster card modal visibility', () => {
    it('does not render monster card modal when viewingMonster is null', () => {
      render(<EncounterBuilder campaignName={mockCampaignName} />);
      expect(screen.queryByTestId('monster-card-modal')).not.toBeInTheDocument();
    });
  });
});

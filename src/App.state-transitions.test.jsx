// @cleaned-by-ai

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

import { mockState, dataLoaderMocks } from './test/appTestState.js';

// --- Core mocks (consistent with other App test files) ---

vi.mock('./services/ui/dataLoader.js', async () => {
  const { dataLoaderMocks } = await import('./test/appTestState.js');
  return dataLoaderMocks;
});

vi.mock('./services/ui/utils.js', () => ({
  default: { getName: vi.fn((name) => name || '') },
}));

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('./services/maps/mapsService.js', () => ({
  loadMaps: vi.fn(),
}));

vi.mock('./services/ui/storage.js', () => ({
  __esModule: true,
  default: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('./services/encounters/combatData.js', async () => ({
  loadCombatSummary: vi.fn(() => Promise.resolve(null)),
  setCombatSummaryCache: vi.fn(),
}));

vi.mock('./hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeObject: vi.fn(),
  seedTrackedResources: vi.fn(),
  getStore: vi.fn(() => new Map()),
  notify: vi.fn(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

// Shared mutable container so the hoisted vi.mock can read the
// current app data shape without capturing a stale reference.
const _appDataRef = { value: null };

vi.mock('./hooks/runtime/useAppData.js', () => ({
  default: vi.fn(() => _appDataRef.value),
}));

// --- Component mocks ---

vi.mock('./components/char-sheet/CharSheet.jsx', async () => {
  const { MockCharSheet } = await import('./test/mockComponents.jsx');
  return { default: MockCharSheet };
});
vi.mock('./components/initiative/initiative.jsx', async () => {
  const { MockInitiative } = await import('./test/mockComponents.jsx');
  return { default: MockInitiative };
});
vi.mock('./components/campaign-selection/CampaignSelection.jsx', async () => {
  const { MockCampaignSelection } = await import('./test/mockComponents.jsx');
  return { default: MockCampaignSelection };
});
vi.mock('./components/character-creation/CharacterCreationWizard.jsx', async () => {
  const { MockWizard } = await import('./test/mockComponents.jsx');
  return { default: MockWizard };
});
vi.mock('./components/sidebar/Sidebar.jsx', async () => {
  const { MockSidebar } = await import('./test/mockComponents.jsx');
  return { default: MockSidebar };
});
vi.mock('./components/maps-manager/MapsManager.jsx', async () => {
  const { MockMapsManager } = await import('./test/mockComponents.jsx');
  return { default: MockMapsManager };
});
vi.mock('./components/map/Map.jsx', async () => {
  const { MockMap } = await import('./test/mockComponents.jsx');
  return { default: MockMap };
});
vi.mock('./components/encounter/EncounterBuilder.jsx', async () => {
  const { MockEncounterBuilder } = await import('./test/mockComponents.jsx');
  return { default: MockEncounterBuilder };
});
vi.mock('./components/notes/Notes.jsx', async () => {
  const { MockNotes } = await import('./test/mockComponents.jsx');
  return { default: MockNotes };
});
vi.mock('./components/quests/Quests.jsx', async () => {
  const { MockQuests } = await import('./test/mockComponents.jsx');
  return { default: MockQuests };
});
vi.mock('./components/npcs/NPCs.jsx', async () => {
  const { MockNPCs } = await import('./test/mockComponents.jsx');
  return { default: MockNPCs };
});
vi.mock('./components/factions/Factions.jsx', async () => {
  const { MockFactions } = await import('./test/mockComponents.jsx');
  return { default: MockFactions };
});
vi.mock('./components/settlements/Settlements.jsx', async () => {
  const { MockSettlements } = await import('./test/mockComponents.jsx');
  return { default: MockSettlements };
});
vi.mock('./components/log/Log.jsx', async () => {
  const { MockLog } = await import('./test/mockComponents.jsx');
  return { default: MockLog };
});
vi.mock('./components/campaign-admin/CampaignAdmin.jsx', async () => {
  const { MockCampaignAdmin } = await import('./test/mockComponents.jsx');
  return { default: MockCampaignAdmin };
});

// Subscriber fires events asynchronously via setTimeout to match real SSE timing.
// This avoids synchronous event dispatch during render which would cause
// inconsistent state and unreliable tests.
vi.mock('./components/common/Subscriber.jsx', () => ({
  default: function MockSubscriber() { return null; },
}));

// --- Helpers ---

function setLocalhost(hostname = 'localhost') {
  Object.defineProperty(window, 'location', {
    value: { hostname, reload: vi.fn() },
    writable: true,
    configurable: true,
  });
}

function setupDataLoaderMocks() {
  dataLoaderMocks.loadAbilityScores.mockResolvedValue([{ full_name: 'Strength' }]);
  dataLoaderMocks.loadClassData.mockImplementation((v) =>
    Promise.resolve(v === '2024' ? [{ name: 'Fighter 2024' }] : [{ name: 'Fighter' }]),
  );
  dataLoaderMocks.loadEquipment.mockResolvedValue([{ name: 'Longsword' }]);
  dataLoaderMocks.loadMagicItems.mockImplementation((v) =>
    Promise.resolve(v === '2024' ? [{ name: 'Wand 2024' }] : [{ name: 'Wand' }]),
  );
  dataLoaderMocks.loadRaceData.mockImplementation((v) =>
    Promise.resolve(v === '2024' ? [{ name: 'Human 2024' }] : [{ name: 'Human' }]),
  );
  dataLoaderMocks.loadSpells.mockImplementation((v) =>
    Promise.resolve(v === '2024' ? [{ name: 'Fireball 2024' }] : [{ name: 'Fireball' }]),
  );
}

// Helper to wait for all microtasks and useEffects to flush.
async function flushEffects() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// Helper to wait for the campaign selection screen to appear, then click select.
async function selectCampaign() {
  await waitFor(() => {
    expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId('select-campaign-btn'));
  await waitFor(() => {
    expect(screen.queryByTestId('campaign-selection')).not.toBeInTheDocument();
  });
  await flushEffects();
}

// --- Test suite ---

describe('App - Runtime Events & State Transitions', () => {
  const defaultFetch = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

  const setupWithCharacters = (chars) => {
    mockState.characters = chars || [{ name: 'Aragorn', level: 1 }];
    render(<App />);
    return selectCampaign();
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset useAppData mock to default (isLoading: false).
    _appDataRef.value = {
      abilityScores: [{ full_name: 'Strength' }],
      classes: [{ name: 'Fighter' }],
      classes2024: [{ name: 'Fighter 2024' }],
      equipment: [{ name: 'Longsword' }],
      magicItems: [{ name: 'Wand' }],
      monsters: [],
      races: [{ name: 'Human' }],
      races2024: [{ name: 'Human 2024' }],
      spells: [{ name: 'Fireball' }],
      spells2024: [{ name: 'Fireball 2024' }],
      isLoading: false,
    };

    mockState.campaignName = 'test-campaign';
    mockState.characters = [];

    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => 'New Campaign Name');

    setLocalhost('localhost');

    global.fetch = vi.fn(defaultFetch);

    setupDataLoaderMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLocalhost('localhost');
  });

  describe('Campaign select callback behavior', () => {
    it('sets active character and charSheet view when campaign has characters', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
    });

    it('opens character wizard when campaign has no characters', async () => {
      await setupWithCharacters([]);
      expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
    });

    it('sets the first character as active when campaign has multiple characters', async () => {
      await setupWithCharacters([
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
      ]);
      expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
    });
  });

  describe('Theme management', () => {
    it('toggles theme from dark to light and persists to localStorage', async () => {
      const localStorageMock = {
        getItem: vi.fn(() => 'dark'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
        configurable: true,
      });

      await setupWithCharacters();
      expect(document.body.getAttribute('data-theme')).toBe('dark');

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('admin-toggle-theme-btn'));
      await waitFor(() => {
        expect(document.body.getAttribute('data-theme')).toBe('light');
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('Map loading on campaign change', () => {
    it('loads active map and sets activeMapName when campaign loads', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({
        maps: [{ fileName: 'dungeon-1.json', isActive: true }],
      });

      await setupWithCharacters();
      expect(loadMaps).toHaveBeenCalledWith('test-campaign');
    });

    it('does not set activeMapName when no active map exists', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({
        maps: [{ fileName: 'dungeon-1.json', isActive: false }],
      });

      await setupWithCharacters();
      expect(loadMaps).toHaveBeenCalledWith('test-campaign');
    });

    it('ignores map loading errors without crashing', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockRejectedValue(new Error('Network error'));

      await setupWithCharacters();
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  describe('Error handling for campaign operations', () => {
    it('shows alert when rename campaign fails', async () => {
      await setupWithCharacters();

      global.fetch.mockRejectedValueOnce(new Error('Server error'));

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('admin-rename-btn'));
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to rename campaign'),
        );
      });
    });

    it('shows alert when delete campaign fails', async () => {
      await setupWithCharacters();

      global.fetch.mockRejectedValueOnce(new Error('Server error'));

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('admin-delete-btn'));
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to delete campaign'),
        );
      });
    });
  });

  describe('Campaign select callback - combat summary initialization', () => {
    it('initializes combat summary cache when no server data exists', async () => {
      const { loadCombatSummary, setCombatSummaryCache } = await import(
        './services/encounters/combatData.js'
      );
      loadCombatSummary.mockResolvedValue(null);

      await setupWithCharacters();
      expect(setCombatSummaryCache).toHaveBeenCalled();
    });

    it('loads existing combat summary from server when available', async () => {
      const { loadCombatSummary, setCombatSummaryCache } = await import(
        './services/encounters/combatData.js'
      );
      const existingCs = { round: 2, creatures: [] };
      loadCombatSummary.mockResolvedValue(existingCs);

      await setupWithCharacters();
      expect(setCombatSummaryCache).toHaveBeenCalledWith(existingCs, 'test-campaign');
    });
  });

  // Character computation with 2024 rules is tested in App.runtime-events.test.jsx
  // where the useAppData mock properly simulates the data loading flow.

  describe('handleCharacterClick', () => {
    it('switches back to first character when clicking it again', async () => {
      await setupWithCharacters([
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
      ]);
      expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');

      fireEvent.click(screen.getByTestId('char-btn-Legolas'));
      await waitFor(() => {
        expect(screen.getByTestId('character-name').textContent).toBe('Legolas');
      });

      fireEvent.click(screen.getByTestId('char-btn-Aragorn'));
      await waitFor(() => {
        expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
      });
    });
  });

  describe('Campaign repair view', () => {
    it('navigates back from campaign repair', async () => {
      await setupWithCharacters();

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('admin-back-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('campaign-admin')).not.toBeInTheDocument();
      });
    });
  });
});

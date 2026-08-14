// @improved-by-ai

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

import { mockState, dataLoaderMocks } from './test/appTestState.js';

// --- Core mocks (shared with other App test files) ---

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

// --- Tests ---

describe('App', () => {
  const defaultFetch = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

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

  describe('campaign selection', () => {
    it('renders campaign selection initially', async () => {
      render(<App />);
      expect(await screen.findByTestId('campaign-selection')).toBeInTheDocument();
    });

    it('navigates to character view after campaign selection with existing characters', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      expect(await screen.findByTestId('campaign-selection')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('campaign-selection')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
    });

    it('navigates to character wizard after campaign selection with no characters', async () => {
      mockState.characters = [];
      render(<App />);

      expect(await screen.findByTestId('campaign-selection')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('campaign-selection')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
    });
  });

  describe('sidebar display', () => {
    const navigateToCampaign = async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    };

    it('displays campaign name in sidebar', async () => {
      await navigateToCampaign();
      expect(screen.getByTestId('sidebar-campaign').textContent).toBe('test-campaign');
    });

    it('shows the Maps button with correct label on localhost', async () => {
      await navigateToCampaign();
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Maps');
    });

    it('shows the Map button (singular) on non-localhost', async () => {
      setLocalhost('example.com');
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Map');
    });

    it('displays all sidebar button labels', async () => {
      await navigateToCampaign();

      expect(screen.getByTestId('initiative-btn')).toHaveTextContent('Initiative');
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Maps');
      expect(screen.getByTestId('notes-btn')).toHaveTextContent('Notes');
      expect(screen.getByTestId('encounter-btn')).toHaveTextContent('Encounters');
      expect(screen.getByTestId('factions-btn')).toHaveTextContent('Factions');
      expect(screen.getByTestId('npcs-btn')).toHaveTextContent('NPCs');
      expect(screen.getByTestId('quests-btn')).toHaveTextContent('Quests');
      expect(screen.getByTestId('settlements-btn')).toHaveTextContent('Settlements');
      expect(screen.getByTestId('log-btn')).toHaveTextContent('Log');
    });

    it('shows admin button on localhost', async () => {
      await navigateToCampaign();
      expect(screen.getByTestId('admin-btn')).toBeInTheDocument();
    });

    it('hides admin button on non-localhost', async () => {
      setLocalhost('example.com');
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('admin-btn')).not.toBeInTheDocument();
    });
  });

  describe('view switching — sidebar navigation', () => {
    const navigateToCampaign = async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    };

    it('opens initiative view when initiative button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('initiative-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('initiative')).toBeInTheDocument();
      });
    });

    it('opens notes view when notes button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('notes-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('notes-view')).toBeInTheDocument();
      });
    });

    it('opens quests view when quests button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('quests-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('quests-view')).toBeInTheDocument();
      });
    });

    it('opens encounters view when encounter button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('encounter-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('encounter-builder')).toBeInTheDocument();
      });
    });

    it('opens NPCs view when NPCs button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('npcs-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('npcs-view')).toBeInTheDocument();
      });
    });

    it('opens settlements view when settlements button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('settlements-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('settlements-view')).toBeInTheDocument();
      });
    });

    it('opens factions view when factions button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('factions-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('factions-view')).toBeInTheDocument();
      });
    });

    it('opens campaign log view when log button is clicked', async () => {
      await navigateToCampaign();
      fireEvent.click(screen.getByTestId('log-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-log-view')).toBeInTheDocument();
      });
    });
  });

  describe('view isolation', () => {
    it('only renders the active view component at a time', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      expect(screen.queryByTestId('initiative')).not.toBeInTheDocument();
      expect(screen.queryByTestId('maps-manager')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notes-view')).not.toBeInTheDocument();
    });
  });
});

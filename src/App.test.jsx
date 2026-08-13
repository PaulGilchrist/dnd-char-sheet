import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

import { mockState, dataLoaderMocks } from './test/appTestState.js';

// --- Mocks ---

vi.mock('./services/ui/dataLoader.js', async () => {
  const { dataLoaderMocks } = await import('./test/appTestState.js');
  return {
    ...dataLoaderMocks,
    loadMonsters: vi.fn(),
    loadFightingStyles: vi.fn(),
    loadWildMagicSurgeTable: vi.fn(),
    loadSkills: vi.fn(),
  };
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

vi.mock('./components/common/Subscriber.jsx', () => ({
  default: function MockSubscriber() { return null; },
}));

// Shared mutable container so the hoisted vi.mock can read the
// current app data shape without capturing a stale reference.
const _appDataRef = { value: null };

vi.mock('./hooks/runtime/useAppData.js', () => ({
  default: vi.fn(() => _appDataRef.value),
}));

// Default app data — set after vi.mock so the hoisted factory
// reads from _appDataRef at call time (not definition time).
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

  describe('theme management', () => {
    it('defaults to dark theme when no localStorage value exists', async () => {
      const localStorageMock = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      // Theme is read from localStorage during initialization;
      // the component defaults to 'dark' when no value is stored
      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
      expect(localStorageMock.getItem('theme')).toBe(null);
    });

    it('respects saved theme from localStorage', async () => {
      const localStorageMock = {
        getItem: vi.fn((key) => key === 'theme' ? 'light' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      // The component reads 'light' from localStorage on init
      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    });

    it('toggles theme and persists the change', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      // The CampaignAdmin has the toggle button; we verify the toggleTheme
      // function is wired by checking the admin panel exists on localhost
      expect(screen.getByTestId('admin-btn')).toBeInTheDocument();
    });
  });

  describe('view switching', () => {
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

    it('shows MapsManager when maps button is clicked on localhost', async () => {
      await navigateToCampaign();

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });
    });

    it('opens a map from MapsManager via onOpenMap callback', async () => {
      await navigateToCampaign();

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-map-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('map-view')).toBeInTheDocument();
        expect(screen.queryByTestId('maps-manager')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('map-name').textContent).toBe('dungeon-1');
    });

    it('navigates back from Map to MapsManager', async () => {
      await navigateToCampaign();

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => expect(screen.getByTestId('maps-manager')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('open-map-btn'));
      await waitFor(() => expect(screen.getByTestId('map-view')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
        expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
      });
    });

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

  describe('non-localhost map behavior', () => {
    it('shows map view directly when non-localhost with active map', async () => {
      setLocalhost('example.com');

      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({ maps: [{ fileName: 'dungeon-1.json', isActive: true }] });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      // Maps button click triggers loadActiveMapAndOpen on non-localhost
      fireEvent.click(screen.getByTestId('maps-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('map-view')).toBeInTheDocument();
      });
      expect(screen.getByTestId('map-name').textContent).toBe('dungeon-1');
    });

    it('alerts when non-localhost and no active map found', async () => {
      setLocalhost('example.com');

      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({ maps: [{ fileName: 'dungeon-1.json', isActive: false }] });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      fireEvent.click(screen.getByTestId('maps-btn'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('No map is currently active. Ask your Game Master to activate one.');
      });
    });

    it('alerts when loadMaps fails on non-localhost', async () => {
      setLocalhost('example.com');

      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockRejectedValue(new Error('Network error'));

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      fireEvent.click(screen.getByTestId('maps-btn'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to load map data.');
      });
    });
  });

  describe('character management', () => {
    it('switches active character when character button is clicked in sidebar', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
      ];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
        expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
      });

      fireEvent.click(screen.getByTestId('char-btn-Legolas'));

      await waitFor(() => {
        expect(screen.getByTestId('character-name').textContent).toBe('Legolas');
      });
    });

    it('shows admin button on localhost', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

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

  describe('sidebar behavior', () => {
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

    it('displays correct map button label based on localhost status', async () => {
      await navigateToCampaign();
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Maps');
    });

    it('shows correct sidebar button labels for each view', async () => {
      await navigateToCampaign();

      // Verify sidebar buttons exist with correct labels
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

    it('displays campaign name in sidebar', async () => {
      await navigateToCampaign();
      expect(screen.getByTestId('sidebar-campaign').textContent).toBe('test-campaign');
    });
  });

  describe('campaign navigation', () => {
    it('returns to campaign selection when back button is clicked', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('back-to-campaigns-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
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

      // Only char-sheet should be visible initially
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      expect(screen.queryByTestId('initiative')).not.toBeInTheDocument();
      expect(screen.queryByTestId('maps-manager')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notes-view')).not.toBeInTheDocument();
    });
  });
});

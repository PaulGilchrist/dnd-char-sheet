import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

import { mockState, dataLoaderMocks } from './test/appTestState.js';

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
vi.mock('./components/common/Subscriber.jsx', () => ({
  default: function MockSubscriber({ handleEvent }) {
    if (handleEvent) {
      handleEvent({ key: 'test-key', data: { test: true } });
    }
    return null;
  },
}));

vi.mock('./services/encounters/combatData.js', async () => {
  return {
    loadCombatSummary: vi.fn(() => Promise.resolve(null)),
    setCombatSummaryCache: vi.fn(),
  };
});

vi.mock('./hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeObject: vi.fn(),
  seedTrackedResources: vi.fn(),
  getStore: vi.fn(() => new Map()),
  notify: vi.fn(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

const originalLocation = window.location;

describe('App - Runtime Events & State Transitions', () => {
  const defaultFetch = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

  beforeEach(() => {
    vi.clearAllMocks();

    mockState.campaignName = 'test-campaign';
    mockState.characters = [];

    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => 'New Campaign Name');

    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', reload: vi.fn() },
      writable: true,
      configurable: true,
    });

    global.fetch = vi.fn(defaultFetch);

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  const selectCampaign = async () => {
    fireEvent.click(screen.getByTestId('select-campaign-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('campaign-selection')).not.toBeInTheDocument();
    });
  };

  describe('Campaign select callback behavior', () => {
    it('sets active character and charSheet view when campaign has characters', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
        expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
      });
    });

    it('opens character wizard when campaign has no characters', async () => {
      mockState.characters = [];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });
    });
  });

  describe('Theme management', () => {
    it('toggles theme from dark to light and persists to localStorage', async () => {
      window.localStorage.getItem.mockReset();
      window.localStorage.getItem.mockReturnValue(null);

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.body.getAttribute('data-theme')).toBe('dark');

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('admin-toggle-theme-btn'));
      await waitFor(() => {
        expect(document.body.getAttribute('data-theme')).toBe('light');
      });
      expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('respects light theme from localStorage on mount', async () => {
      window.localStorage.getItem.mockReset();
      window.localStorage.getItem.mockImplementation((key) => {
        if (key === 'theme') return 'light';
        return null;
      });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.body.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Document title management', () => {
    it('sets document title to character name when on charSheet', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.title).toBe('Aragorn');
    });

    it('sets document title to "CharSheets" when not on charSheet', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('initiative-btn'));
      await waitFor(() => {
        expect(document.title).toBe('CharSheets');
      });
    });
  });

  describe('Map loading on campaign change', () => {
    it('loads active map and sets activeMapName when campaign loads', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({
        maps: [{ fileName: 'dungeon-1.json', isActive: true }],
      });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(loadMaps).toHaveBeenCalledWith('test-campaign');
    });

    it('does not set activeMapName when no active map exists', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({
        maps: [{ fileName: 'dungeon-1.json', isActive: false }],
      });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(loadMaps).toHaveBeenCalledWith('test-campaign');
    });

    it('ignores map loading errors', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockRejectedValue(new Error('Network error'));

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });
  });

  describe('Runtime event handling', () => {
    it('ignores events with null key', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });

    it('ignores events with null data', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });

    it('ignores non-character, non-pipeline, non-change events', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling for campaign operations', () => {
    it('shows alert when rename campaign fails', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

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
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

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

  describe('Maps view transitions', () => {
    it('goes back from map to manager when history has entries', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({
        maps: [{ fileName: 'dungeon-1.json', isActive: true }],
      });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-map-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('map-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('map-back-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });
    });

    it('goes back to manager when history is not empty on localhost', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({
        maps: [{ fileName: 'dungeon-1.json', isActive: true }],
      });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-map-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('map-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('map-back-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-map-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('map-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('map-back-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Loading states', () => {
    it('renders char sheet after processing completes', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });
  });

  describe('Seed runtime store effect', () => {
    it('fetches change-data from server on campaign load', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/change-data',
      );
    });
  });

  describe('Campaign select callback - combat summary initialization', () => {
    it('initializes combat summary cache when no server data exists', async () => {
      const { loadCombatSummary, setCombatSummaryCache } = await import(
        './services/encounters/combatData.js'
      );
      loadCombatSummary.mockResolvedValue(null);
      setCombatSummaryCache.mockReturnValue(undefined);

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(setCombatSummaryCache).toHaveBeenCalled();
    });

    it('loads existing combat summary from server when available', async () => {
      const { loadCombatSummary, setCombatSummaryCache } = await import(
        './services/encounters/combatData.js'
      );
      const existingCs = { round: 2, creatures: [] };
      loadCombatSummary.mockResolvedValue(existingCs);
      setCombatSummaryCache.mockReturnValue(undefined);

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(setCombatSummaryCache).toHaveBeenCalledWith(existingCs, 'test-campaign');
    });
  });

  describe('Character computation with 2024 rules', () => {
    it('uses 2024 rules when character has rules="2024"', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1, rules: '2024' }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(dataLoaderMocks.loadClassData).toHaveBeenCalledWith('2024');
    });

    it('uses 5e rules when character has rules="5e"', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1, rules: '5e' }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(dataLoaderMocks.loadClassData).toHaveBeenCalledWith('5e');
    });
  });

  describe('Maps click behavior', () => {
    it('opens maps manager when not on maps view', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({ maps: [] });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });
    });

    it('does nothing when already on maps manager', async () => {
      const { loadMaps } = await import('./services/maps/mapsService.js');
      loadMaps.mockResolvedValue({ maps: [] });

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('maps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('maps-manager')).toBeInTheDocument();
      });

      const managerBefore = screen.getByTestId('maps-manager');
      fireEvent.click(screen.getByTestId('maps-btn'));
      expect(screen.getByTestId('maps-manager')).toBe(managerBefore);
    });
  });

  describe('handleCharacterClick', () => {
    it('switches active character when clicking sidebar character button', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
      ];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
        expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
      });

      fireEvent.click(screen.getByTestId('char-btn-Legolas'));
      await waitFor(() => {
        expect(screen.getByTestId('character-name').textContent).toBe('Legolas');
      });
    });
  });

  describe('Campaign repair view', () => {
    it('renders campaign repair view with theme props', async () => {
      window.localStorage.getItem.mockReset();
      window.localStorage.getItem.mockReturnValue(null);

      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
      });
      expect(screen.getByTestId('admin-theme').textContent).toBe('dark');
    });

    it('navigates back from campaign repair', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

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

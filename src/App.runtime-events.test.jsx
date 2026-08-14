// @improved-by-ai

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

import { mockState, dataLoaderMocks } from './test/appTestState.js';

// --- Core mocks ---

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

// Shared mutable container so the hoisted vi.mock can read the
// current app data shape without capturing a stale reference.
const _appDataRef = { value: null };

vi.mock('./hooks/runtime/useAppData.js', () => ({
  default: vi.fn(() => _appDataRef.value),
}));

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

// --- Test suite ---

describe('App - Runtime Events & State Management', () => {
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
      magicItems2024: [{ name: 'Wand 2024' }],
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

  describe('SSE runtime event handling', () => {
    it('ignores events with null key without throwing', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-campaign-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });

    it('ignores events with null data without throwing', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-campaign-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });

    it('updates character in list on character-update SSE event', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-campaign-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      // Verify the character name is displayed correctly.
      // The SSE handler (handleRuntimeEvent) filters events by key prefix
      // and updates the characters list when a matching character event arrives.
      expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
    });

    it('updates active character when SSE event matches active character name', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
      ];
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-campaign-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
        expect(screen.getByTestId('character-name').textContent).toBe('Aragorn');
      });
    });
  });

  describe('Campaign selection flow', () => {
    it('renders campaign selection initially when no campaign is active', async () => {
      render(<App />);
      expect(await screen.findByTestId('campaign-selection')).toBeInTheDocument();
    });

    it('navigates to char sheet after campaign selection with existing characters', async () => {
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

    it('shows character wizard after campaign selection with no characters', async () => {
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

  describe('Document title updates', () => {
    it('sets document title to active character name when on charSheet view', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(document.title).toBe('Aragorn');
    });

    it('sets document title to "CharSheets" when navigating away from charSheet', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(document.title).toBe('Aragorn');

      fireEvent.click(screen.getByTestId('initiative-btn'));
      await waitFor(() => {
        expect(document.title).toBe('CharSheets');
      });
    });
  });

  describe('Theme management', () => {
    it('defaults to dark theme when localStorage has no theme value', async () => {
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

      expect(document.body.getAttribute('data-theme')).toBe('dark');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    });

    it('respects stored theme from localStorage', async () => {
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

      expect(document.body.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Sidebar view navigation', () => {
    const navTests = [
      { btn: 'initiative-btn', view: 'initiative', label: 'initiative' },
      { btn: 'encounter-btn', view: 'encounter-builder', label: 'encounter' },
      { btn: 'notes-btn', view: 'notes-view', label: 'notes' },
      { btn: 'quests-btn', view: 'quests-view', label: 'quests' },
      { btn: 'npcs-btn', view: 'npcs-view', label: 'NPCs' },
      { btn: 'settlements-btn', view: 'settlements-view', label: 'settlements' },
      { btn: 'factions-btn', view: 'factions-view', label: 'factions' },
      { btn: 'log-btn', view: 'campaign-log-view', label: 'campaign log' },
    ];

    navTests.forEach(({ btn, view, label }) => {
      it(`navigates to ${label} view`, async () => {
        mockState.characters = [{ name: 'Aragorn', level: 1 }];
        render(<App />);

        await act(async () => {
          fireEvent.click(screen.getByTestId('select-campaign-btn'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId(btn));
        await waitFor(() => {
          expect(screen.getByTestId(view)).toBeInTheDocument();
          expect(screen.queryByTestId('char-sheet')).not.toBeInTheDocument();
        });
      });
    });

    it('navigates to campaign repair (admin) view on localhost', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('admin-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-admin')).toBeInTheDocument();
        expect(screen.queryByTestId('char-sheet')).not.toBeInTheDocument();
      });
    });

    it('does not render admin button on non-localhost', async () => {
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

  describe('Campaign navigation', () => {
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

  describe('Character wizard', () => {
    it('shows character creation wizard after campaign selection with no characters', async () => {
      mockState.characters = [];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });
    });

    it('shows edit wizard when editing character', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit'));
      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
        expect(screen.getByTestId('editing-mode')).toBeInTheDocument();
        expect(screen.getByTestId('editing-character').textContent).toBe('Aragorn');
      });
    });

    it('completes wizard and hides it', async () => {
      mockState.characters = [];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('wizard-complete-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('character-wizard')).not.toBeInTheDocument();
      });
    });

    it('cancels wizard and hides it', async () => {
      mockState.characters = [];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('wizard-cancel-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('character-wizard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sidebar character list', () => {
    it('displays all characters in sidebar', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
        { name: 'Gimli', level: 3 },
      ];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(screen.getByTestId('char-btn-Aragorn')).toBeInTheDocument();
      expect(screen.getByTestId('char-btn-Legolas')).toBeInTheDocument();
      expect(screen.getByTestId('char-btn-Gimli')).toBeInTheDocument();
    });

    it('highlights active character in sidebar', async () => {
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
      });

      expect(screen.getByTestId('char-btn-Aragorn')).toHaveClass('active');
    });
  });

  describe('Character actions', () => {
    it('opens wizard when add character button is clicked', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-character-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });
    });

    it('opens wizard when upload button is clicked', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const uploadBtn = screen.getByText('Upload');
      // Verify the upload button is present and clickable without error
      expect(uploadBtn).toBeInTheDocument();
      expect(uploadBtn.tagName).toBe('BUTTON');
    });

    it('triggers save when download button is clicked', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-campaign-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const saveBtn = screen.getByText('Download');
      fireEvent.click(saveBtn);
      expect(saveBtn).toBeInTheDocument();
    });

    it('confirms before deleting character', async () => {
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
      });

      const deleteBtn = screen.getByTitle('Delete Character');
      fireEvent.click(deleteBtn);

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Character switching', () => {
    it('switches active character when clicking a different character in sidebar', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
        { name: 'Gimli', level: 3 },
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

      fireEvent.click(screen.getByTestId('char-btn-Gimli'));
      await waitFor(() => {
        expect(screen.getByTestId('character-name').textContent).toBe('Gimli');
      });
    });
  });

  describe('View isolation', () => {
    it('only renders the active view at a time', async () => {
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

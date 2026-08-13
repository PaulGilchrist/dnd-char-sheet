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
  default: function MockSubscriber() { return null; },
}));

vi.mock('./services/encounters/combatData.js', async () => {
  return {
    loadCombatSummary: vi.fn(() => Promise.resolve(null)),
    setCombatSummaryCache: vi.fn(),
  };
});

const originalLocation = window.location;

describe('App - Runtime Events & State Management', () => {
  const defaultFetch = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

  const setNonLocalhost = () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', reload: vi.fn() },
      writable: true,
      configurable: true,
    });
  };

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

  const setupWithCharacters = (chars) => {
    mockState.characters = chars || [{ name: 'Aragorn', level: 1 }];
    render(<App />);
    return selectCampaign();
  };

  describe('Campaign management', () => {
    it('renders loading overlay when combatSummary is not loaded', async () => {
      render(<App />);
      expect(await screen.findByTestId('campaign-selection')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('select-campaign-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('campaign-selection')).not.toBeInTheDocument();
      });
    });

    it('shows loading overlay for processing characters', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });

    it('navigates back to campaign selection when back button clicked', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('back-to-campaigns-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
      });
    });

    it('delete campaign callback clears characters and active character', async () => {
      mockState.characters = [{ name: 'Aragorn', level: 1 }, { name: 'Legolas', level: 2 }];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('back-to-campaigns-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('campaign-selection')).toBeInTheDocument();
      });
    });
  });

  describe('Document title', () => {
    it('sets document title to active character name when on charSheet view', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.title).toBe('Aragorn');
    });

    it('sets document title to "CharSheets" when not on charSheet view', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('initiative-btn'));
      await waitFor(() => {
        expect(document.title).toBe('CharSheets');
      });
    });
  });

  describe('Theme toggle', () => {
    it('defaults to dark theme when localStorage has no theme', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.body.getAttribute('data-theme')).toBe('dark');
    });

    it('toggles theme from dark to light', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.body.getAttribute('data-theme')).toBe('dark');
    });

    it('persists theme to localStorage', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });

    it('respects stored theme from localStorage', async () => {
      window.localStorage.getItem.mockImplementation((key) => {
        if (key === 'theme') return 'light';
        return null;
      });
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(document.body.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Sidebar view navigation', () => {
    const navTests = [
      { btn: 'initiative-btn', view: 'initiative', label: 'initiative view' },
      { btn: 'encounter-btn', view: 'encounter-builder', label: 'encounter view' },
      { btn: 'notes-btn', view: 'notes-view', label: 'notes view' },
      { btn: 'quests-btn', view: 'quests-view', label: 'quests view' },
      { btn: 'npcs-btn', view: 'npcs-view', label: 'NPCs view' },
      { btn: 'settlements-btn', view: 'settlements-view', label: 'settlements view' },
      { btn: 'factions-btn', view: 'factions-view', label: 'factions view' },
      { btn: 'log-btn', view: 'campaign-log-view', label: 'campaign log view' },
    ];

    navTests.forEach(({ btn, view, label }) => {
      it(`navigates to ${label}`, async () => {
        await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
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
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
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
      setNonLocalhost();
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('admin-btn')).not.toBeInTheDocument();
    });
  });

  describe('View idempotency', () => {
    const idempotencyTests = [
      { btn: 'initiative-btn', view: 'initiative' },
      { btn: 'encounter-btn', view: 'encounter-builder' },
      { btn: 'notes-btn', view: 'notes-view' },
      { btn: 'quests-btn', view: 'quests-view' },
      { btn: 'npcs-btn', view: 'npcs-view' },
      { btn: 'settlements-btn', view: 'settlements-view' },
      { btn: 'factions-btn', view: 'factions-view' },
      { btn: 'log-btn', view: 'campaign-log-view' },
    ];

    idempotencyTests.forEach(({ btn, view }) => {
      it(`${view} view is idempotent when already active`, async () => {
        await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
        await waitFor(() => {
          expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByTestId(btn));
        await waitFor(() => {
          expect(screen.getByTestId(view)).toBeInTheDocument();
        });
        const before = screen.getByTestId(view);
        fireEvent.click(screen.getByTestId(btn));
        expect(screen.getByTestId(view)).toBe(before);
      });
    });
  });

  describe('Campaign name change resets maps', () => {
    it('resets maps view when campaign name changes', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
    });
  });

  describe('Modals rendering', () => {
    it('renders prompt modals alongside char sheet', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  describe('Character wizard overlays', () => {
    it('shows character creation wizard after campaign selection with no characters', async () => {
      mockState.characters = [];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });
    });

    it('shows edit wizard when editing character', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
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
      await selectCampaign();
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
      await selectCampaign();
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
      await selectCampaign();
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
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      expect(screen.getByTestId('char-btn-Aragorn')).toHaveClass('active');
    });
  });

  describe('Add character', () => {
    it('opens wizard when add character button clicked', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('add-character-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
      });
    });
  });

  describe('Upload/Save character', () => {
    it('trigger upload click', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      const uploadBtn = screen.getByText('Upload');
      fireEvent.click(uploadBtn);
    });

    it('trigger save click', async () => {
      await setupWithCharacters([{ name: 'Aragorn', level: 1 }]);
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      const saveBtn = screen.getByText('Download');
      fireEvent.click(saveBtn);
    });
  });

  describe('Delete character', () => {
    it('confirms and deletes character', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
      ];
      render(<App />);
      await selectCampaign();
      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTitle('Delete Character'));
      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Multiple characters interaction', () => {
    it('switches between characters', async () => {
      mockState.characters = [
        { name: 'Aragorn', level: 1 },
        { name: 'Legolas', level: 2 },
        { name: 'Gimli', level: 3 },
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
      fireEvent.click(screen.getByTestId('char-btn-Gimli'));
      await waitFor(() => {
        expect(screen.getByTestId('character-name').textContent).toBe('Gimli');
      });
    });
  });
});

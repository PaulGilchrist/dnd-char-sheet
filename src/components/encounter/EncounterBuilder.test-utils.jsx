import { render } from '@testing-library/react';
import EncounterBuilder from './EncounterBuilder.jsx';

// --- Shared mock setup ---
// These mocks must match the vi.mock() calls in the test files that import them.
// Vitest hoists vi.mock() calls, so each test file still needs its own vi.mock()
// blocks. The mount helper below re-applies the mocks dynamically via await import.

export const mockCampaignName = 'test-campaign';

export const defaultCharacters = [
  { name: 'Thorin', level: 5 },
  { name: 'Elara', level: 3 },
];

export const sampleMonsters = [
  { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25, type: 'humanoid', environments: ['forest'] },
  { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5, type: 'humanoid', environments: ['hill', 'mountain'] },
  { index: 'dragon', name: 'Young Dragon', xp: 120, challenge_rating: 2, type: 'dragon', environments: ['underground'] },
];

const defaultManagementReturn = {
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
};

export async function mount(overrides = {}) {
  const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
  useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

  const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
  useEncounterManagement.mockReturnValue({
    ...defaultManagementReturn,
    ...overrides,
  });

  return render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
}

export async function renderWithCustomManagement(customManagement) {
  const { useMonstersData } = await import('../../hooks/ui/useMonstersData.js');
  useMonstersData.mockReturnValue({ monsters: sampleMonsters, loading: false });

  const { default: useEncounterManagement } = await import('../../hooks/management/useEncounterManagement.js');
  useEncounterManagement.mockReturnValue(customManagement);

  return render(<EncounterBuilder campaignName={mockCampaignName} characters={defaultCharacters} onJoinEncounter={vi.fn()} />);
}

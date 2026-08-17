// @cleaned-by-ai
// @improved-by-ai
// Removed 38 redundant tests (Barbarian/Bard/Cleric sections) — all covered in dedicated class test files.
// Kept only the unique entry-point test for unknown class handling.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import CharClassFeatures from './CharClassFeatures.jsx';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('./TrackedResourceInput.jsx', () => ({
  default: function MockTrackedResourceInput({ label, getMax, resourceKey }) {
    const max = getMax ? getMax() : 0;
    return (
      <div data-testid={`tracked-resource-${resourceKey}`}>
        <b>{label}:</b> <span>{max}/{max}</span>
      </div>
    );
  },
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  useSyncedState: vi.fn(() => [{}, vi.fn()]),
}));

vi.mock('../../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(),
}));

vi.mock('../../common/Popup.jsx', () => ({
  default: function MockPopup({ html, children }) {
    return (
      <div data-testid="popup">
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : children}
      </div>
    );
  },
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
}));

const mockCampaignName = 'test-campaign';

const basePlayerStats = {
  name: 'Thorin',
  level: 5,
  abilities: [
    { name: 'Charisma', bonus: 3 },
    { name: 'Wisdom', bonus: 2 },
    { name: 'Strength', bonus: 4 },
  ],
  proficiency: 3,
  class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, fightingStyles: [] },
  automation: { passives: [], specialActions: [] },
  equipment: [],
  inventory: { equipped: [] },
  spellAbilities: {},
};

function buildPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

function renderComponent(playerStats, campaign = mockCampaignName) {
  return render(<CharClassFeatures playerStats={playerStats} campaignName={campaign} />);
}

describe('CharClassFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        default: return undefined;
      }
    });
  });

  describe('null/unknown class handling', () => {
    it('returns null for unknown class name', () => {
      const { container } = renderComponent(buildPlayerStats({ class: { name: 'UnknownClass' } }));
      expect(container.innerHTML).toBe('');
    });
  });
});

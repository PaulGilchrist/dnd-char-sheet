// @cleaned-by-ai
import { render } from '@testing-library/react';
import ResourcePoolModal from './ResourcePoolModal.jsx';

// ── Test fixtures ──

export function makePlayerStats(overrides = {}) {
  return {
    name: 'Druid1',
    spellAbilities: {
      spell_slots_level_1: 4,
      spell_slots_level_2: 3,
      spell_slots_level_3: 2,
      spell_slots_level_4: 0,
      spell_slots_level_5: 0,
      spell_slots_level_6: 0,
      spell_slots_level_7: 0,
      spell_slots_level_8: 0,
      spell_slots_level_9: 0,
    },
    _trackedResources: {
      wildShapeUses: { max: 2 },
    },
    ...overrides,
  };
}

export function makeAutomation(overrides = {}) {
  return {
    conversion: '',
    reverseConversion: '',
    conversionRate: '',
    ...overrides,
  };
}

// ── Test helpers ──

export function renderModal(playerStats, automation, campaignName, onClose) {
  const handleClose = onClose ?? vi.fn();
  return {
    ...render(
      <ResourcePoolModal
        playerStats={playerStats}
        campaignName={campaignName ?? 'test-campaign'}
        automation={automation}
        onClose={handleClose}
      />
    ),
    handleClose,
  };
}

export function findRowByText(text) {
  return [...document.querySelectorAll('.resource-pool-table tbody tr')].find(
    (row) => row.children[0]?.textContent === text
  );
}

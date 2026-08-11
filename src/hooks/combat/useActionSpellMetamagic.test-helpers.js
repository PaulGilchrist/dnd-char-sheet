import { vi } from 'vitest';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function makePlayerStats(overrides = {}) {
  return {
    name: 'TestSorcerer',
    class: { name: 'Sorcerer' },
    level: 5,
    ...overrides,
  };
}

export function makeNonSorcererStats(overrides = {}) {
  return {
    name: 'TestWizard',
    class: { name: 'Wizard' },
    level: 5,
    ...overrides,
  };
}

export function makeAttack(overrides = {}) {
  return {
    name: 'Fireball',
    spellLevel: 3,
    castingTime: '1 Action',
    ...overrides,
  };
}

export function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    casting_time: '1 Action',
    ...overrides,
  };
}

export function makeHookProps(overrides = {}) {
  return {
    playerStats: makePlayerStats(),
    campaignName: 'test-campaign',
    mapName: 'test-map',
    cannotAct: false,
    setPopupHtml: vi.fn(),
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    buildCtx: vi.fn(),
    handleAttackClick: vi.fn(),
    setModalState: vi.fn(),
    characters: [],
    ...overrides,
  };
}

// ── Shared beforeEach ────────────────────────────────────────────────────────

export function setupBeforeEach() {
  beforeEach(() => {
    vi.clearAllMocks();
  });
}

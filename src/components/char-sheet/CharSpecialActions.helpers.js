// @cleaned-by-ai
// Test helpers for CharSpecialActions - shared test fixtures and utilities
// NOTE: Mocks must stay in the test file so vitest processes them before imports

const basePlayerStats = {
  name: 'TestCharacter',
  specialActions: [],
  class: {
    fightingStyles: [],
  },
  actions: [],
  bonusActions: [],
  reactions: [],
  characterAdvancement: [],
  proficiency: 2,
};

export function createPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

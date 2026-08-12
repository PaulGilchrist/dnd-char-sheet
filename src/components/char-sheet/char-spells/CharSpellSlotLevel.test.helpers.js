export const createPlayerStats = (overrides = {}) => ({
  name: 'Test Character',
  _trackedResources: {},
  ...overrides,
});

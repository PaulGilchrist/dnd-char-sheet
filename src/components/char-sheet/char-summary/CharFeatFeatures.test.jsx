// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CharFeatFeatures from './CharFeatFeatures.jsx';
import TrackedResourceInput from './TrackedResourceInput.jsx';

const stores = new Map();

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn((_characterKey, key, _campaignName) => {
    const store = stores.get('TestCharacter');
    return store?.has(key) ? store.get(key) : 0;
  }),
}));

vi.mock('./TrackedResourceInput.jsx', () => {
  const mock = vi.fn((props) => {
    const max = props.getMax ? props.getMax() : 0;
    return React.createElement(
      'div',
      {
        'data-testid': `tracked-${props.resourceKey}`,
        'data-max': max,
      },
      `${props.label}: ${max}`,
    );
  });
  return { default: mock };
});

const basePlayerStats = {
  name: 'TestCharacter',
  proficiency: 3,
  feats: [],
  automation: {
    specialActions: [],
    passives: [],
  },
};

const defaultProps = {
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
};

function setStore(key, value) {
  if (!stores.has('TestCharacter')) stores.set('TestCharacter', new Map());
  const store = stores.get('TestCharacter');
  if (value === null || value === undefined) {
    store.delete(key);
  } else {
    store.set(key, value);
  }
}

function clearStore() {
  stores.clear();
}

describe('CharFeatFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStore();
    TrackedResourceInput.mockClear();
  });

  describe('null rendering when no features are active', () => {
    it('renders nothing when there are no features and no runtime values', () => {
      const { container } = render(<CharFeatFeatures {...defaultProps} />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('lucky feat — visibility gating', () => {
    it('does not render when lucky feat exists but proficiency is 0', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 0 };
      setStore('luckyPoints', 5);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('poisoner feat detection', () => {
    it('renders when poisoner is detected via matching special action', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-poisonDoses')).toBeInTheDocument();
    });
  });

  describe('chef feat detection', () => {
    it('renders when chef is detected via matching special action', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'temp_hp_buff', name: 'Bolstering Treats' }],
        },
      };
      setStore('chefBolsteringTreats', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-chefBolsteringTreats')).toBeInTheDocument();
    });
  });

  describe('replenishing meal detection', () => {
    it('renders when replenishing meal passive exists and runtime value > 0', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }],
        },
      };
      setStore('replenishingMeals', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-replenishingMeals')).toBeInTheDocument();
    });

    it('renders when runtime value > 0 regardless of matching passive', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Other Passive' }],
        },
      };
      setStore('replenishingMeals', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-replenishingMeals')).toBeInTheDocument();
    });

    it('does not render when runtime value is 0 even with matching passive', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }],
        },
      };
      setStore('replenishingMeals', 0);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('lucky feat — rendering', () => {
    it('renders when luckyPoints value is 0 (lpMax drives visibility, not the value)', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      setStore('luckyPoints', 0);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });
  });

  describe('poisoned weapons badge', () => {
    it('renders the poisoned weapons active badge when poisonedWeaponsActive is true', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      setStore('poisonedWeaponsActive', true);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByText('Poisoned Weapons active')).toBeInTheDocument();
    });

    it('omits the poisoned weapons badge when poisonedWeaponsActive is false', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      setStore('poisonedWeaponsActive', false);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.queryByText('Poisoned Weapons active')).not.toBeInTheDocument();
    });
  });

  describe('bolstering treat (standalone resource)', () => {
    it('renders when bolsteringTreat > 0 with no features', () => {
      setStore('bolsteringTreat', 1);
      render(<CharFeatFeatures {...defaultProps} />);
      expect(screen.getByTestId('tracked-bolsteringTreat')).toBeInTheDocument();
    });
  });

  describe('multiple features combined', () => {
    it('renders all resource inputs when multiple features are active', () => {
      const stats = {
        ...basePlayerStats,
        feats: ['Lucky'],
        automation: {
          ...basePlayerStats.automation,
          specialActions: [
            { type: 'brew_poison', name: 'Brew Poison' },
            { type: 'temp_hp_buff', name: 'Bolstering Treats' },
          ],
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }],
        },
      };
      setStore('luckyPoints', 2);
      setStore('poisonDoses', 1);
      setStore('poisonedWeaponsActive', false);
      setStore('chefBolsteringTreats', 3);
      setStore('replenishingMeals', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-poisonDoses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-chefBolsteringTreats')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-replenishingMeals')).toBeInTheDocument();
    });
  });
});

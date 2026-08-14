import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CharFeatFeatures from './CharFeatFeatures.jsx';
import TrackedResourceInput from './TrackedResourceInput.jsx';

// Shared store for mocked useRuntimeValue values
const stores = new Map();

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn((_characterKey, key) => {
    const store = stores.get('TestCharacter');
    return store?.has(key) ? store.get(key) : 0;
  }),
}));

// TrackedResourceInput mock that actually invokes getMax so data-max assertions work
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

  describe('null rendering', () => {
    it('renders nothing when there are no features and no runtime values', () => {
      const { container } = render(<CharFeatFeatures {...defaultProps} />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders nothing when only bolsteringTreat is zero and no features exist', () => {
      setStore('bolsteringTreat', 0);
      const { container } = render(<CharFeatFeatures {...defaultProps} />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders nothing when lucky feat exists but proficiency is 0', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 0 };
      setStore('luckyPoints', 5);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders nothing when proficiency is missing and only lucky feat exists', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      delete stats.proficiency;
      setStore('luckyPoints', 5);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders nothing when automation is null', () => {
      const stats = { ...basePlayerStats, automation: null };
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders nothing when automation is missing entirely', () => {
      const stats = { ...basePlayerStats };
      delete stats.automation;
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('feature detection', () => {
    it('renders when poisoner feat is detected via specialActions', () => {
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

    it('does not render for poisoner when special action has wrong type', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'other_type', name: 'Brew Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('does not render for poisoner when special action has wrong name', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Other Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders when chef feat is detected via matching special action', () => {
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

    it('does not render for chef when special action has wrong name', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'temp_hp_buff', name: 'Other Buff' }],
        },
      };
      setStore('chefBolsteringTreats', 2);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('does not render for chef when special action has wrong type', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'other_type', name: 'Bolstering Treats' }],
        },
      };
      setStore('chefBolsteringTreats', 2);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

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

    it('renders replenishing meals based on runtime value alone (no matching passive required)', () => {
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
  });

  describe('lucky feat detection', () => {
    it('detects lucky feat when name is exactly "Lucky"', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      setStore('luckyPoints', 5);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('detects lucky feat with lowercase name', () => {
      const stats = { ...basePlayerStats, feats: ['lucky'] };
      setStore('luckyPoints', 5);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('detects lucky feat when "lucky" appears in the middle of the name', () => {
      const stats = { ...basePlayerStats, feats: ['Some Lucky Trait'] };
      setStore('luckyPoints', 5);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('renders luckyPoints input when the value is 0 (lpMax drives visibility, not the value)', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      setStore('luckyPoints', 0);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('does not render lucky points when proficiency is 0 even with a matching feat', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 0 };
      setStore('luckyPoints', 5);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
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

    it('does not render when bolsteringTreat is 0 and no other resources exist', () => {
      const { container } = render(<CharFeatFeatures {...defaultProps} />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
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

    it('renders all resources including the poisoned weapons badge', () => {
      const stats = {
        ...basePlayerStats,
        feats: ['Lucky'],
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      setStore('luckyPoints', 1);
      setStore('poisonDoses', 2);
      setStore('poisonedWeaponsActive', true);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-poisonDoses')).toBeInTheDocument();
      expect(screen.getByText('Poisoned Weapons active')).toBeInTheDocument();
    });
  });

  describe('container element', () => {
    it('renders a container with data-testid="char-feat-features"', () => {
      setStore('bolsteringTreat', 1);
      render(<CharFeatFeatures {...defaultProps} />);
      expect(screen.getByTestId('char-feat-features')).toBeInTheDocument();
    });
  });

  describe('missing fields on playerStats', () => {
    it('handles missing feats field when another resource is present', () => {
      const stats = { ...basePlayerStats };
      delete stats.feats;
      setStore('bolsteringTreat', 1);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-bolsteringTreat')).toBeInTheDocument();
    });
  });

  describe('proficiency handling', () => {
    it('uses proficiency for lpMax calculation', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 5 };
      setStore('luckyPoints', 3);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('defaults lpMax to 0 when proficiency is missing entirely', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      delete stats.proficiency;
      setStore('luckyPoints', 5);
      const { container } = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('getMax function behavior', () => {
    it('luckyPoints getMax returns proficiency', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 5 };
      setStore('luckyPoints', 3);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toHaveAttribute('data-max', '5');
    });

    it('poisonDoses getMax returns proficiency', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-poisonDoses')).toHaveAttribute('data-max', '3');
    });

    it('poisonDoses getMax returns 0 when proficiency is missing', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      delete stats.proficiency;
      setStore('poisonDoses', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-poisonDoses')).toHaveAttribute('data-max', '0');
    });

    it('replenishingMeals getMax returns Math.max(runtime, 4 + proficiency) when feat is present', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }],
        },
      };
      setStore('replenishingMeals', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // Math.max(2, 4+3) = 7
      expect(screen.getByTestId('tracked-replenishingMeals')).toHaveAttribute('data-max', '7');
    });

    it('replenishingMeals getMax returns 1 when replenishing meal feat is absent', () => {
      const stats = { ...basePlayerStats };
      setStore('replenishingMeals', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-replenishingMeals')).toHaveAttribute('data-max', '1');
    });

    it('replenishingMeals getMax returns runtime value when it exceeds 4 + proficiency', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }],
        },
      };
      setStore('replenishingMeals', 10);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // Math.max(10, 4+3) = 10
      expect(screen.getByTestId('tracked-replenishingMeals')).toHaveAttribute('data-max', '10');
    });

    it('chefBolsteringTreats getMax returns proficiency', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'temp_hp_buff', name: 'Bolstering Treats' }],
        },
      };
      setStore('chefBolsteringTreats', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-chefBolsteringTreats')).toHaveAttribute('data-max', '3');
    });

    it('chefBolsteringTreats getMax returns Math.max(runtime, proficiency fallback of 1) when proficiency is missing', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'temp_hp_buff', name: 'Bolstering Treats' }],
        },
      };
      delete stats.proficiency;
      setStore('chefBolsteringTreats', 2);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // Math.max(2, 1) = 2
      expect(screen.getByTestId('tracked-chefBolsteringTreats')).toHaveAttribute('data-max', '2');
    });

    it('bolsteringTreat getMax always returns 1', () => {
      setStore('bolsteringTreat', 1);
      render(<CharFeatFeatures {...defaultProps} />);
      expect(screen.getByTestId('tracked-bolsteringTreat')).toHaveAttribute('data-max', '1');
    });
  });
});

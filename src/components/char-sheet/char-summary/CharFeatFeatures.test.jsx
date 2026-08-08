import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CharFeatFeatures from './CharFeatFeatures.jsx';
import TrackedResourceInput from './TrackedResourceInput.jsx';

// Use a store pattern like useMetamagic.test.js
const stores = new Map();

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn((characterKey, key) => {
    const store = stores.get(characterKey);
    return store ? (store.has(key) ? store.get(key) : 0) : 0;
  }),
}));

vi.mock('./TrackedResourceInput.jsx', () => {
  const mock = vi.fn((props) => {
    return React.createElement('div', { 'data-testid': `tracked-${props.resourceKey}`, label: props.label }, props.label);
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
  const storeKey = 'TestCharacter';
  if (!stores.has(storeKey)) stores.set(storeKey, new Map());
  const store = stores.get(storeKey);
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

  describe('early return (null)', () => {
    it('returns null when no features and no runtime values', () => {
      const result = render(<CharFeatFeatures {...defaultProps} />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
      expect(result.container.textContent).toBe('');
    });

    it('returns null when lucky feat exists but no other resources (lpMax=0 case)', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 0 };
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders when poisoner feat exists (hasPoisonerFeat makes hasAnyResources=true)', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Brew Poison' }],
        },
      };
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).not.toBeNull();
      expect(screen.getByTestId('tracked-poisonDoses')).toBeInTheDocument();
    });
  });

  describe('Lucky Feat detection', () => {
    it('detects lucky feat when feat name is exactly "Lucky"', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      setStore('luckyPoints', 5);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('detects lucky feat when feat name contains "lucky" (case insensitive)', () => {
      const stats = { ...basePlayerStats, feats: ['lucky'] };
      setStore('luckyPoints', 5);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('detects lucky feat in middle of feat name', () => {
      const stats = { ...basePlayerStats, feats: ['Some Lucky Trait'] };
      setStore('luckyPoints', 5);
      render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('renders luckyPoints input when luckyPoints=0 (condition checks lpMax, not luckyPoints)', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      setStore('luckyPoints', 0);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // hasLuckyFeat=true, lpMax=3>0 => hasAnyResources=true, container renders
      // {hasLuckyFeat && lpMax > 0 && <TrackedResourceInput resourceKey="luckyPoints"/>} - condition checks lpMax, not luckyPoints value
      // So luckyPoints input IS rendered even when luckyPoints runtime value is 0
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).not.toBeNull();
      expect(screen.getByTestId('tracked-luckyPoints')).toBeInTheDocument();
    });

    it('does not render lucky points when proficiency=0 even with lucky feat', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'], proficiency: 0 };
      setStore('luckyPoints', 5);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // lpMax=0, so hasLuckyFeat && lpMax > 0 = false
      // hasAnyResources = false => returns null
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('Poisoner Feat detection', () => {
    it('detects brew_poison special action', () => {
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

    it('does not render when brew_poison has wrong type', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'other_type', name: 'Brew Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // hasPoisonerFeat=false, poisonDoses>0 alone is NOT in hasAnyResources
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('does not render when brew_poison has wrong name', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'brew_poison', name: 'Other Poison' }],
        },
      };
      setStore('poisonDoses', 2);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('renders poisoned weapons active badge when poisonedWeaponsActive is true', () => {
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

    it('does not render poisoned weapons badge when poisonedWeaponsActive is false', () => {
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

  describe('Replenishing Meal Feat detection', () => {
    it('renders replenishing meals when runtime value > 0', () => {
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

    it('renders replenishing meals even without matching passive (runtime value drives rendering)', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Other Passive' }],
        },
      };
      setStore('replenishingMeals', 2);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // replenishingMeals > 0 => hasAnyResources = true, and {replenishingMeals > 0 && <TrackedResourceInput/>} renders
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).not.toBeNull();
      expect(screen.getByTestId('tracked-replenishingMeals')).toBeInTheDocument();
    });
  });

  describe('Chef Feat detection', () => {
    it('renders bolstering treats when special action matches AND chefBolsteringTreats > 0', () => {
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

    it('does not render when temp_hp_buff has wrong name', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'temp_hp_buff', name: 'Other Buff' }],
        },
      };
      setStore('chefBolsteringTreats', 2);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // hasChefFeat=false, chefBolsteringTreats>0 alone is NOT in hasAnyResources
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('does not render when temp_hp_buff has wrong type', () => {
      const stats = {
        ...basePlayerStats,
        automation: {
          ...basePlayerStats.automation,
          specialActions: [{ type: 'other_type', name: 'Bolstering Treats' }],
        },
      };
      setStore('chefBolsteringTreats', 2);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('Bolstering Treat runtime value', () => {
    it('renders Bolstering Treat when bolsteringTreat > 0', () => {
      setStore('bolsteringTreat', 1);
      render(<CharFeatFeatures {...defaultProps} />);
      expect(screen.getByTestId('tracked-bolsteringTreat')).toBeInTheDocument();
    });

    it('does not render Bolstering Treat when bolsteringTreat is 0 and no other resources', () => {
      const result = render(<CharFeatFeatures {...defaultProps} />);
      expect(result.container.querySelector('[data-testid="tracked-bolsteringTreat"]')).toBeNull();
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('Multiple features combined', () => {
    it('renders multiple resource inputs when multiple features are active', () => {
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
      expect(screen.getByTestId('char-feat-features')).toBeInTheDocument();
    });

    it('renders all resources including poisoned weapons badge', () => {
      const stats = {
        ...basePlayerStats,
        feats: ['Lucky'],
        automation: {
          ...basePlayerStats.automation,
          specialActions: [
            { type: 'brew_poison', name: 'Brew Poison' },
          ],
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
    it('renders with data-testid="char-feat-features"', () => {
      setStore('bolsteringTreat', 1);
      render(<CharFeatFeatures {...defaultProps} />);
      expect(screen.getByTestId('char-feat-features')).toBeInTheDocument();
    });
  });

  describe('automation undefined handling', () => {
    it('handles playerStats with no automation field', () => {
      const stats = { ...basePlayerStats };
      delete stats.automation;
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });

    it('handles playerStats with null automation', () => {
      const stats = { ...basePlayerStats, automation: null };
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });

  describe('feats undefined handling', () => {
    it('handles playerStats with no feats field', () => {
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

    it('defaults lpMax to 0 when proficiency is missing (no lucky points rendered)', () => {
      const stats = { ...basePlayerStats, feats: ['Lucky'] };
      delete stats.proficiency;
      setStore('luckyPoints', 5);
      const result = render(<CharFeatFeatures playerStats={stats} campaignName="test-campaign" />);
      // lpMax = 0, so hasLuckyFeat && lpMax > 0 = false
      // hasAnyResources = false => returns null
      expect(result.container.querySelector('[data-testid="char-feat-features"]')).toBeNull();
    });
  });
});

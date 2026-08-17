// @cleaned-by-ai
// @improved-by-ai
// Absorbed coverage from deleted CharClassFeatures-Advanced.test.jsx (Sorcerer + AdrenalineRush/Stonecunning/Dodge sections)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharClassFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
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

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({
    maxSorceryPoints: 5,
    metamagicKnown: 2,
    maxInnateSorcery: 0,
    creatingSpellSlotCosts: [],
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(),
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../modals/WeaponKindMasteryModal.jsx', () => ({
  default: function MockWeaponKindMasteryModal() {
    return <div data-testid="weapon-kind-mastery-modal">WeaponKindMasteryModal</div>;
  },
}));

const MOCK_CAMPAIGN_NAME = 'test-campaign';

function buildSorcererStats(overrides = {}) {
  return {
    name: 'Test Sorcerer',
    level: 5,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Sorcerer',
      class_levels: [{ level: 5 }],
      major: {},
      subclass: {},
      fightingStyles: [],
    },
    abilities: [],
    automation: { passives: [], specialActions: [] },
    ...overrides,
  };
}

describe('SorcererFeatures (via CharClassFeatures entry point)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        default: return undefined;
      }
    });
  });

  describe('tracked resources', () => {
    it('renders sorcery points tracked resource', () => {
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
    });

    it('renders metamagic known tracked resource', () => {
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-metamagicKnown')).toBeInTheDocument();
    });

    it('renders innate sorcery tracked resource', () => {
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-innateSorceryUses')).toBeInTheDocument();
    });

    it('renders sorcerous restoration when resource_restoration passive exists', () => {
      const stats = buildSorcererStats({
        automation: { passives: [{ type: 'resource_restoration' }] },
      });
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-sorcerousRestorationUses')).toBeInTheDocument();
    });

    it('does not render sorcerous restoration when passive is missing', () => {
      const stats = buildSorcererStats({
        automation: { passives: [] },
      });
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.queryByTestId('tracked-resource-sorcerousRestorationUses')).not.toBeInTheDocument();
    });
  });

  describe('active buff badges', () => {
    it('shows innate sorcery badge when activeBuffs contains it', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Innate Sorcery' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('+1 Save DC, Spell Adv')).toBeInTheDocument();
    });

    it('does not show innate sorcery badge when not active', () => {
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.queryByText('+1 Save DC, Spell Adv')).not.toBeInTheDocument();
    });

    it('shows telepathic speech badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Telepathic Speech' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Telepathic Speech')).toBeInTheDocument();
    });

    it('does not show telepathic speech badge when not active', () => {
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.queryByText('Telepathic Speech')).not.toBeInTheDocument();
    });

    it('shows trance of order when tranceOfOrderActive is true', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'tranceOfOrderActive') return true;
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Trance of Order')).toBeInTheDocument();
    });

    it('does not show trance of order when tranceOfOrderActive is false', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'tranceOfOrderActive') return false;
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.queryByText('Trance of Order')).not.toBeInTheDocument();
    });
  });

  describe('revelation in flesh effect mapping', () => {
    it('maps aquatic_adaptation effect to display label', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'aquatic_adaptation' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Aquatic Adaptation')).toBeInTheDocument();
    });

    it('maps glistening_flight effect to display label', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'glistening_flight' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Glistening Flight')).toBeInTheDocument();
    });

    it('maps see_the_invisible effect to display label', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'see_the_invisible' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('See the Invisible')).toBeInTheDocument();
    });

    it('maps wormhole_movement effect to display label', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'wormhole_movement' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Wormhole Movement')).toBeInTheDocument();
    });

    it('falls back to "Revelation in Flesh" for unknown effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'unknown_effect' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Revelation in Flesh')).toBeInTheDocument();
    });

    it('does not show revelation badge when no matching buff', () => {
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.queryByText('Revelation in Flesh')).not.toBeInTheDocument();
    });

    it('renders multiple revelation effects joined with comma', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [
          { name: 'Revelation in Flesh', effect: 'aquatic_adaptation' },
          { name: 'Revelation in Flesh', effect: 'glistening_flight' },
        ];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      const badge = screen.getByText(/Aquatic Adaptation.*Glistening Flight/);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('spell slot costs', () => {
    it('renders spell slot costs header when creatingSpellSlotCosts has entries', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxSorceryPoints: 5,
        metamagicKnown: 2,
        maxInnateSorcery: 0,
        creatingSpellSlotCosts: ['1 sorcery point', '2 sorcery points'],
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText(/Spell Slot \(level 1-5\) Costs:/)).toBeInTheDocument();
    });

    it('does not render spell slot costs when array is empty', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxSorceryPoints: 5,
        metamagicKnown: 2,
        maxInnateSorcery: 0,
        creatingSpellSlotCosts: [],
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.queryByText(/Spell Slot \(level 1-5\) Costs/)).not.toBeInTheDocument();
    });
  });

  describe('null/undefined activeBuffs handling', () => {
    it('does not crash when activeBuffs is null', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return null;
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
    });

    it('does not crash when activeBuffs is undefined', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return undefined;
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
    });
  });

  describe('interaction with main entry point features', () => {
    it('renders dodge badge alongside sorcerer features when dodge buff is active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'dodge' }];
        return undefined;
      });
      const stats = buildSorcererStats();
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByText('Dodge — Disadv on attacks vs you, Adv on DEX saves')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
    });

    it('renders adrenaline rush alongside sorcerer features', () => {
      const stats = buildSorcererStats({
        automation: { specialActions: [{ effect: 'bonus_action_dash' }] },
      });
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-adrenalineRushUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
    });

    it('renders stonecunning alongside sorcerer features', () => {
      const stats = buildSorcererStats({
        race: { traits: [{ name: 'Stonecunning', automation: true }] },
      });
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-stonecunningUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
    });

    it('renders all three: class features + adrenaline rush + stonecunning', () => {
      const stats = buildSorcererStats({
        race: { traits: [{ name: 'Stonecunning', automation: true }] },
        automation: {
          passives: [{ type: 'resource_restoration' }],
          specialActions: [{ effect: 'bonus_action_dash' }],
        },
      });
      render(<CharClassFeatures playerStats={stats} campaignName={MOCK_CAMPAIGN_NAME} />);
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-adrenalineRushUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-stonecunningUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-sorcerousRestorationUses')).toBeInTheDocument();
    });
  });
});

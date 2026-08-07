import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SorcererFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';

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

function buildPlayerStats(overrides = {}) {
  return {
    name: 'Test Sorcerer',
    level: 1,
    rules: '5e',
    proficiency: 2,
    class: {
      name: 'Sorcerer',
      major: {},
      subclass: {},
      class_levels: [],
      fightingStyles: [],
    },
    abilities: [],
    automation: {},
    ...overrides,
  };
}

describe('SorcererFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders innate sorcery tracked resource', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-innateSorceryUses"]')).toBeTruthy();
  });

  it('renders metamagic known tracked resource', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-metamagicKnown"]')).toBeTruthy();
  });

  it('renders sorcery points tracked resource', () => {
    const stats = buildPlayerStats({ level: 5 });
    const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
    expect(container.querySelector('[data-testid="tracked-resource-sorceryPoints"]')).toBeTruthy();
  });

  describe('innate sorcery active', () => {
    it('shows badge when innate sorcery is active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Innate Sorcery' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('+1 Save DC, Spell Adv');
    });

    it('does not show badge when innate sorcery not active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('+1 Save DC');
    });
  });

  describe('telepathic speech', () => {
    it('shows badge when telepathic speech is active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Telepathic Speech' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Telepathic Speech');
    });

    it('does not show badge when telepathic speech not active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Telepathic Speech');
    });
  });

  describe('sorcerous restoration', () => {
    it('renders sorcerous restoration when resource_restoration passive exists', () => {
      const stats = buildPlayerStats({ automation: { passives: [{ type: 'resource_restoration' }] } });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-sorcerousRestorationUses"]')).toBeTruthy();
    });

    it('does not render sorcerous restoration when passive missing', () => {
      const stats = buildPlayerStats({ automation: { passives: [] } });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.querySelector('[data-testid="tracked-resource-sorcerousRestorationUses"]')).toBeFalsy();
    });
  });

  describe('trance of order', () => {
    it('shows badge when trance is active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'tranceOfOrderActive') return true;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Trance of Order');
    });

    it('does not show badge when trance is not active', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'tranceOfOrderActive') return false;
        if (prop === 'activeBuffs') return undefined;
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Trance of Order');
    });
  });

  describe('revelation in flesh', () => {
    it('shows revelation badge when buff exists', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'aquatic_adaptation' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Aquatic Adaptation');
    });

    it('shows glistening flight label', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'glistening_flight' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Glistening Flight');
    });

    it('shows see the invisible label', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'see_the_invisible' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('See the Invisible');
    });

    it('shows wormhole movement label', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'wormhole_movement' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Wormhole Movement');
    });

    it('shows generic label for unknown effect', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'unknown_effect' }];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Revelation in Flesh');
    });

    it('does not show badge when no revelation buff', () => {
      const stats = buildPlayerStats();
      vi.mocked(runtimeState.useRuntimeValue).mockImplementation((key, prop) => {
        if (prop === 'activeBuffs') return [];
        return undefined;
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Revelation in Flesh');
    });
  });

  describe('spell slot costs', () => {
    it('renders spell slot costs when array has items', () => {
      const stats = buildPlayerStats();
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxSorceryPoints: 5,
        metamagicKnown: 2,
        maxInnateSorcery: 0,
        creatingSpellSlotCosts: ['1 sorcery point', '2 sorcery points'],
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).toContain('Spell Slot (level 1-5) Costs:');
    });

    it('does not render spell slot costs when empty array', () => {
      const stats = buildPlayerStats();
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        maxSorceryPoints: 5,
        metamagicKnown: 2,
        maxInnateSorcery: 0,
        creatingSpellSlotCosts: [],
      });
      const { container } = render(<SorcererFeatures playerStats={stats} campaignName="test" />);
      expect(container.textContent).not.toContain('Spell Slot (level 1-5) Costs');
    });
  });
});

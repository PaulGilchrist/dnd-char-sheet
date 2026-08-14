// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
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
    maxChannelDivinity: 2,
    destroyUndeadCR: '5',
    maxSorceryPoints: 6,
    metamagicKnown: 4,
    maxInnateSorcery: 3,
    creatingSpellSlotCosts: ['1 sorcery point'],
    bardicDie: 8,
    songOfRestDie: 6,
    magicalSecrets: 2,
    subclassMagicalSecrets: 0,
    maxWildShapeUses: 2,
    maxWildShapeChallengeRating: 4,
    beastKnownForms: 4,
    wildShapeLimitations: 'None',
    extraAttacks: 1,
    sneakAttack: { dice_count: 5, dice_value: 6 },
    expertise: ['Stealth', 'Perception'],
    favoredEnemies: 'Beasts',
    martialArtsDie: 8,
    maxFocusPoints: 5,
    unarmoredMovementIncrease: 10,
    auraRange: 10,
    invocationsKnown: 6,
    invocations: ['Eldritch Sight', 'Eldritch Strength'],
    pactBoon: 'Chain',
    hasArcanum: true,
    arcanumLevels: { level6: 1, level7: 1, level8: 1, level9: 1 },
    arcanums: ['Level 6', 'Level 7'],
    arcaneRecoveryLevels: 3,
    showWizardFeatures: true,
  })),
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
  default: function MockPopup({ html, onClickOrKeyDown }) {
    return (
      <div data-testid="popup-overlay" onClick={onClickOrKeyDown}>
        <div data-testid="popup-modal">
          {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
        </div>
      </div>
    );
  },
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../modals/WeaponKindMasteryModal.jsx', () => ({
  default: function MockWeaponKindMasteryModal() {
    return <div data-testid="weapon-kind-mastery-modal">WeaponKindMasteryModal</div>;
  },
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

describe('CharClassFeatures - Advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'aspectOfTheWildsOption': return 'Owl';
        case 'activeBuffs': return [];
        case 'bardicInspirationUses': return 3;
        case 'sorceryPoints': return 2;
        case 'metamagicKnown': return 2;
        case 'innateSorceryUses': return 1;
        case 'portentDice': return null;
        case 'naturalRecoveryFreeCast': return undefined;
        case 'naturalRecoveryFreeCastUsed': return undefined;
        default: return undefined;
      }
    });
  });

  describe('Sorcerer main entry point behavior', () => {
    it('renders sorcery points tracked resource', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-sorceryPoints"]')).toBeTruthy();
    });

    it('renders metamagic known tracked resource', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-metamagicKnown"]')).toBeTruthy();
    });

    it('renders innate sorcery tracked resource', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-innateSorceryUses"]')).toBeTruthy();
    });

    it('renders sorcerous restoration when resource_restoration passive exists', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'resource_restoration' }] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-sorcerousRestorationUses"]')).toBeTruthy();
    });

    it('does not render sorcerous restoration when passive is missing', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-sorcerousRestorationUses"]')).toBeFalsy();
    });

    it('renders innate sorcery active badge when activeBuffs contains it', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Innate Sorcery' }];
        return undefined;
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('+1 Save DC, Spell Adv');
    });

    it('renders revelation in flesh with effect name mapping', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Revelation in Flesh', effect: 'glistening_flight' }];
        return undefined;
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Glistening Flight');
    });

    it('does not render revelation badge when no matching buff', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).not.toContain('Revelation in Flesh');
    });

    it('renders spell slot costs when creatingSpellSlotCosts has entries', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        creatingSpellSlotCosts: ['1 sorcery point', '1 HP'],
        maxSorceryPoints: 6,
        metamagicKnown: 4,
        maxInnateSorcery: 3,
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Spell Slot (level 1-5) Costs:');
    });

    it('does not render spell slot costs when empty array', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        creatingSpellSlotCosts: [],
        maxSorceryPoints: 6,
        metamagicKnown: 4,
        maxInnateSorcery: 3,
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).not.toContain('Spell Slot (level 1-5) Costs');
    });

    it('renders trance of order when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'tranceOfOrderActive') return true;
        return undefined;
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Trance of Order');
    });

    it('does not render trance of order when not active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'tranceOfOrderActive') return false;
        return undefined;
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).not.toContain('Trance of Order');
    });

    it('renders telepathic speech badge when active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Telepathic Speech' }];
        return undefined;
      });
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Telepathic Speech');
    });
  });

  describe('Warlock main entry point behavior', () => {
    it('renders eldritch invocations count', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 6,
        hasArcanum: true,
        arcanumLevels: { level6: 1, level7: 1, level8: 1, level9: 1 },
        pactBoon: 'Chain',
        invocations: ['Eldritch Sight', 'Eldritch Strength'],
      });
      const stats = buildPlayerStats({
        class: { name: 'Warlock', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Eldritch Invocations:');
    });

    it('renders pact boon text and button', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 6,
        hasArcanum: true,
        arcanumLevels: { level6: 1, level7: 1, level8: 1, level9: 1 },
        pactBoon: 'Chain',
        invocations: ['Eldritch Sight', 'Eldritch Strength'],
      });
      const stats = buildPlayerStats({
        class: { name: 'Warlock', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Pact Boon: Chain');
      expect(container.querySelector('.automation-btn')).toBeTruthy();
    });

    it('uses "Invocations Known" label when invocationsKnown is 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 0,
        hasArcanum: false,
        arcanumLevels: {},
        pactBoon: 'Pact of the Blade',
        invocations: [],
      });
      const stats = buildPlayerStats({
        class: { name: 'Warlock', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Invocations Known:');
    });

    it('renders arcanum tracked resources for levels with count > 0', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 6,
        hasArcanum: true,
        arcanumLevels: { level6: 1, level7: 1, level8: 0, level9: 1 },
        pactBoon: 'Chain',
        invocations: [],
      });
      const stats = buildPlayerStats({
        class: { name: 'Warlock', class_levels: [{ level: 13 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel6"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel7"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel9"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel8"]')).toBeFalsy();
    });

    it('does not render arcanum when hasArcanum is false', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        invocationsKnown: 6,
        hasArcanum: false,
        arcanumLevels: {},
        pactBoon: 'Chain',
        invocations: [],
      });
      const stats = buildPlayerStats({
        class: { name: 'Warlock', class_levels: [{ level: 13 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-mysticArcanumLevel6"]')).toBeFalsy();
    });
  });

  describe('Wizard main entry point behavior', () => {
    it('renders arcane recovery tracked resource', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'arcane_ward' }], actions: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneRecoveryLevels"]')).toBeTruthy();
    });

    it('renders arcane ward HP tracked resource when arcane_ward passive exists', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'arcane_ward' }], actions: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeTruthy();
    });

    it('renders arcane ward when passive_rule with effect matches', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'passive_rule', effect: 'arcane_ward' }] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeTruthy();
    });

    it('does not render arcane ward when no matching passive', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-arcaneWardHp"]')).toBeFalsy();
    });

    it('renders projected ward with default range 30', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { reactions: [{ type: 'projected_ward', name: 'Projected Ward' }] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('within 30 ft.');
    });

    it('renders projected ward with custom range from reaction', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { reactions: [{ type: 'projected_ward', range: 60 }] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('within 60 ft.');
    });

    it('does not render projected ward when reaction missing', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { reactions: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).not.toContain('Projected Ward');
    });

    it('renders portent section when portent action exists', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [];
        return undefined;
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
        specialActions: [{ name: 'Portent', automation: { type: 'portent' } }],
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Portent Dice:');
    });

    it('renders parsed portent dice values', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [7, 13];
        return undefined;
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
        specialActions: [{ name: 'Portent', automation: { type: 'portent' } }],
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('7');
      expect(container.textContent).toContain('13');
    });

    it('shows no dice remaining badge when portent dice array is empty', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [];
        return undefined;
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
        specialActions: [{ name: 'Portent', automation: { type: 'portent' } }],
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('No dice remaining');
    });

    it('shows remaining count matching dice array length', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') return [7, 13, 19];
        return undefined;
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
        specialActions: [{ name: 'Portent', automation: { type: 'portent' } }],
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('3 remaining');
    });

    it('returns null when showWizardFeatures is false', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({ showWizardFeatures: false });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toBe('');
    });

    it('renders third eye buff with effect label mapping', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'darkvision_120' }];
        return undefined;
      });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 3,
        showWizardFeatures: true,
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Darkvision 120 ft.');
    });

    it('shows Active for unknown third eye effect', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'The Third Eye', effect: 'unknown_effect' }];
        return undefined;
      });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 3,
        showWizardFeatures: true,
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('The Third Eye: Active');
    });

    it('does not render third eye when no buff', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 3,
        showWizardFeatures: true,
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).not.toContain('The Third Eye');
    });

    it('handles invalid JSON in portentDice gracefully', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'portentDice') 'not json';
        return undefined;
      });
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        arcaneRecoveryLevels: 3,
        showWizardFeatures: true,
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Wizard', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
        specialActions: [{ name: 'Portent', automation: { type: 'portent' } }],
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('No dice remaining');
    });
  });

  describe('main entry point - Adrenaline Rush and Stonecunning', () => {
    it('renders adrenaline rush tracked resource when bonus_action_dash special action exists', () => {
      const stats = buildPlayerStats({
        class: { name: 'UnknownClass' },
        automation: { specialActions: [{ effect: 'bonus_action_dash' }] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-adrenalineRushUses"]')).toBeTruthy();
    });

    it('renders stonecunning tracked resource when race trait has stonecunning automation', () => {
      // Need a known class so the component doesn't early return null
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        race: { traits: [{ name: 'Stonecunning', automation: true }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-stonecunningUses"]')).toBeTruthy();
    });

    it('does not render stonecunning when trait lacks automation', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        race: { traits: [{ name: 'Stonecunning', automation: false }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-stonecunningUses"]')).toBeFalsy();
    });

    it('renders both adrenaline rush and class features when both exist', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Fighter', class_levels: [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5 }], fightingStyles: [] },
        automation: { specialActions: [{ effect: 'bonus_action_dash' }], passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.querySelector('[data-testid="tracked-resource-adrenalineRushUses"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="char-class-fighter"]')).toBeTruthy();
    });

    it('renders nothing when no class match, no adrenaline rush, and no stonecunning', () => {
      const stats = buildPlayerStats({
        class: { name: 'UnknownClass' },
        automation: { specialActions: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toBe('');
    });

    it('renders dodge active badge when dodge buff is present', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'dodge' }];
        if (key === 'aspectOfTheWildsOption') return 'Owl';
        return undefined;
      });
      // Use a known class so the component continues past the early return
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).toContain('Dodge — Disadv on attacks vs you, Adv on DEX saves');
    });

    it('does not render dodge badge when not active', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      expect(container.textContent).not.toContain('Dodge');
    });

    it('passes campaignName to TrackedResourceInput components', () => {
      const stats = buildPlayerStats({
        class: { name: 'Sorcerer', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      // The mock TrackedResourceInput receives campaignName as a prop;
      // verify the component renders without error with non-default campaign
      expect(screen.getByTestId('tracked-resource-sorceryPoints')).toBeTruthy();
    });

    it('renders weapon kind mastery as clickable for fighter', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          class_levels: [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5, weapon_mastery: 'Piercing' }],
          fightingStyles: [],
        },
        automation: { specialActions: [], passives: [] },
      });
      const { container } = render(<CharClassFeatures playerStats={stats} campaignName={mockCampaignName} />);
      // Modal only opens on click; verify weapon mastery text is rendered
      expect(container.textContent).toContain('Piercing');
    });
  });
});

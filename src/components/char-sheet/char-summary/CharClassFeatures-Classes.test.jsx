// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharClassFeatures from './CharClassFeatures.jsx';
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
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [{}, vi.fn()]),
}));

vi.mock('../../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(),
}));

vi.mock('../../common/Popup.jsx', () => ({
  default: function MockPopup({ html, children }) {
    return (
      <div data-testid="popup">
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : children}
      </div>
    );
  },
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
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

function renderComponent(playerStats, campaign = mockCampaignName) {
  return render(<CharClassFeatures playerStats={playerStats} campaignName={campaign} />);
}

describe('CharClassFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Druid features', () => {
    it('returns null for druid below level 2', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: { name: 'Druid', class_levels: [{ level: 1 }] },
        automation: { passives: [] },
      });
      const { container } = renderComponent(stats);
      expect(container.innerHTML).toBe('');
    });

    it('renders wild shape features at level 5', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Druid', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('char-class-druid')).toBeInTheDocument();
      expect(screen.getByText(/Wild Shape Limitations:/)).toBeInTheDocument();
      expect(screen.getByText(/Beast Forms Known:/)).toBeInTheDocument();
      expect(screen.getByText(/Wild Shape Max Challenge Rating:/)).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-wildShapeUses')).toBeInTheDocument();
    });

    it('renders natural recovery section when natural_recovery passive exists', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Druid', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'natural_recovery' }] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Natural Recovery:/)).toBeInTheDocument();
    });

    it('shows free cast granted badge when natural recovery free cast is set', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'naturalRecoveryFreeCast') return ['fireball'];
        return null;
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Druid', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'natural_recovery' }] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Free cast: fireball/)).toBeInTheDocument();
    });

    it('shows free cast used badge when natural recovery free cast is used', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'naturalRecoveryFreeCastUsed') return true;
        return null;
      });
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Druid', class_levels: [{ level: 5 }] },
        automation: { passives: [{ type: 'natural_recovery' }] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Free cast used/)).toBeInTheDocument();
    });

    it('renders Star Map free casts for Circle of the Stars at level 6+', () => {
      const stats = buildPlayerStats({
        level: 6,
        class: { name: 'Druid', subclass: { name: 'Circle of the Stars' }, class_levels: [{ level: 6 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-_Star_Map_freeCastCount')).toBeInTheDocument();
    });
  });

  describe('Fighter features', () => {
    it('returns null when class_levels is null or undefined', () => {
      const nullStats = buildPlayerStats({
        class: { name: 'Fighter', class_levels: null },
        automation: { passives: [] },
      });
      const { container: c1 } = renderComponent(nullStats);
      expect(c1.innerHTML).toBe('');

      const undefStats = buildPlayerStats({
        class: { name: 'Fighter', class_levels: undefined },
        automation: { passives: [] },
      });
      const { container: c2 } = renderComponent(undefStats);
      expect(c2.innerHTML).toBe('');
    });

    it('renders psionic energy section for Psi Warrior subclass', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: {
          name: 'Fighter',
          class_levels: [
            { level: 1 }, { level: 2 }, { level: 3 }, { level: 4 },
            { level: 5, extra_attacks: 2, weapon_mastery: 'Mercy', energy: { required_major: 'Psi Warrior', energy_die_num: 4, energy_die_type: 6 } },
          ],
          major: { name: 'Psi Warrior' },
          fightingStyles: [],
        },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Energy Dice/)).toBeInTheDocument();
      expect(screen.getByText(/Energy Die Type:/)).toBeInTheDocument();
      expect(screen.getByText(/d6/)).toBeInTheDocument();
    });

    it('renders superiority dice and die type based on subclass and level', () => {
      const cases = [
        { level: 5, major: 'Battle Master', expectedDie: 'd8' },
        { level: 10, major: 'Battle Master', expectedDie: 'd10' },
        { level: 18, major: 'Battle Master', expectedDie: 'd12' },
        { level: 5, major: null, fightingStyles: ['Superior Technique'], expectedDie: 'd6' },
      ];

      for (const c of cases) {
        const stats = buildPlayerStats({
          level: c.level,
          class: {
            name: 'Fighter',
            class_levels: Array.from({ length: c.level }, (_, i) => ({ level: i + 1, extra_attacks: 2, weapon_mastery: 'Mercy' })),
            major: c.major ? { name: c.major } : undefined,
            fightingStyles: c.fightingStyles || [],
          },
          automation: { passives: [] },
        });
        const { container } = renderComponent(stats);
        expect(container.textContent).toContain('Superiority Die:');
        expect(container.textContent).toContain(c.expectedDie);
      }
    });

    it('renders tracked resources and weapon mastery', () => {
      const stats = buildPlayerStats({
        class: {
          name: 'Fighter',
          class_levels: [
            { level: 1 }, { level: 2 }, { level: 3 }, { level: 4 },
            { level: 5, extra_attacks: 2, weapon_mastery: 'Mercy' },
          ],
          major: { name: 'Battle Master' },
          fightingStyles: [],
        },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-actionSurgeUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-secondWindUses')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-superiorityDice')).toBeInTheDocument();
      const weaponMasteryLabel = screen.getByText(/Weapon Mastery:/);
      expect(weaponMasteryLabel.nextElementSibling).toHaveClass('clickable');
    });
  });

  describe('Monk features', () => {
    it('returns null for monk below level 2', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: { name: 'Monk', class_levels: [{ level: 1 }] },
        automation: { passives: [] },
      });
      const { container } = renderComponent(stats);
      expect(container.innerHTML).toBe('');
    });

    it('renders monk features at level 5', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Monk', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('char-class-monk')).toBeInTheDocument();
      expect(screen.getByText(/Focus Save DC.*/)).toBeInTheDocument();
      expect(screen.getByText(/Unarmored Movement:/)).toBeInTheDocument();
      expect(screen.getByText(/Martial Arts Die:/)).toBeInTheDocument();
      expect(screen.getByText(/Extra Attacks.*/)).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-focusPoints')).toBeInTheDocument();
    });
  });

  describe('Paladin features', () => {
    const paladinStats = (overrides = {}) => buildPlayerStats({
      class: { name: 'Paladin', class_levels: [{ level: 5 }] },
      automation: { passives: [] },
      ...overrides,
    });

    it('renders lay on hands pool and channel divinity tracked resources', () => {
      renderComponent(paladinStats());
      expect(screen.getByTestId('tracked-resource-layOnHandsPool')).toBeInTheDocument();
      expect(screen.getByTestId('tracked-resource-channelDivinityCharges')).toBeInTheDocument();
    });

    it('renders aura of protection with ability bonus and locked range at level < 6', () => {
      renderComponent(paladinStats());
      expect(screen.getByText(/Aura of Protection/)).toBeInTheDocument();
      expect(screen.getByText(/locked/)).toBeInTheDocument();
    });

    it('shows 10 ft aura range at level >= 6', () => {
      const stats = buildPlayerStats({
        level: 6,
        class: { name: 'Paladin', class_levels: [{ level: 6 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByText(/10 ft/)).toBeInTheDocument();
    });

    it('does not render aura of protection when charisma ability is missing', () => {
      const stats = buildPlayerStats({
        level: 5,
        abilities: [
          { name: 'Strength', bonus: 4 },
        ],
        class: { name: 'Paladin', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.queryByText(/Aura of Protection:/)).not.toBeInTheDocument();
    });

    it('renders fighting styles when present', () => {
      const stats = buildPlayerStats({
        class: { name: 'Paladin', class_levels: [{ level: 5 }], fightingStyles: ['Defense'] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Fighting Styles.*/)).toBeInTheDocument();
    });

    it('renders aura range when available from class features', () => {
      renderComponent(paladinStats());
      expect(screen.getByText(/Aura Range.*/)).toBeInTheDocument();
    });
  });

  describe('Ranger features', () => {
    it('does not render fighting styles when level is 1 or styles is null', () => {
      const statsLevel1 = buildPlayerStats({
        level: 1,
        class: { name: 'Ranger', class_levels: [{ level: 1 }], fightingStyles: ['Defense'] },
        automation: { passives: [] },
      });
      renderComponent(statsLevel1);
      expect(screen.queryByText(/Fighting Styles:/)).not.toBeInTheDocument();

      const statsNull = buildPlayerStats({
        class: { name: 'Ranger', class_levels: [{ level: 5 }], fightingStyles: null },
        automation: { passives: [] },
      });
      renderComponent(statsNull);
      expect(screen.queryByText(/Fighting Styles:/)).not.toBeInTheDocument();
    });

    it('renders favored enemies display', () => {
      const stats = buildPlayerStats({
        class: { name: 'Ranger', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Favored Enemy.*/)).toBeInTheDocument();
    });
  });

  describe('Rogue features', () => {
    it('renders supreme sneak button at level 9 or above', () => {
      const stats = buildPlayerStats({
        level: 9,
        class: { name: 'Rogue', class_levels: [{ level: 9 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByTitle(/Supreme Sneak/)).toBeInTheDocument();
    });

    it('does not render supreme sneak below level 9', () => {
      const stats = buildPlayerStats({
        level: 5,
        class: { name: 'Rogue', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.queryByTitle(/Supreme Sneak/)).not.toBeInTheDocument();
    });

    it('renders sneak attack damage display', () => {
      const stats = buildPlayerStats({
        level: 9,
        class: { name: 'Rogue', class_levels: [{ level: 9 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Sneak Attack Damage:/)).toBeInTheDocument();
    });

    it('renders expertise when available from class features', () => {
      const stats = buildPlayerStats({
        level: 9,
        class: { name: 'Rogue', class_levels: [{ level: 9 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Expertise:/)).toBeInTheDocument();
    });

    it('renders supreme sneak with active state when stealth attack cost is set', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'stealthAttackCost') return 1;
        return null;
      });
      const stats = buildPlayerStats({
        level: 9,
        class: { name: 'Rogue', class_levels: [{ level: 9 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      const badge = screen.getByTitle(/Supreme Sneak/);
      expect(badge).toHaveClass('automation-badge');
    });

    it('renders rogue at level 1 without supreme sneak', () => {
      const stats = buildPlayerStats({
        level: 1,
        class: { name: 'Rogue', class_levels: [{ level: 1 }] },
        automation: { passives: [] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('char-class-rogue')).toBeInTheDocument();
      expect(screen.queryByTitle(/Supreme Sneak/)).not.toBeInTheDocument();
    });
  });
});

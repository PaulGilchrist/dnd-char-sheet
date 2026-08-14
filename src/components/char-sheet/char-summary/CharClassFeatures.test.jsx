// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharClassFeatures from './CharClassFeatures.jsx';
import * as classFeatures from '../../../services/character/classFeatures.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as unbreakableMajesty from '../../../services/combat/auras/unbreakableMajesty.js';

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

const defaultClassFeatures = {
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
};

vi.mock('../../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({ ...defaultClassFeatures })),
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

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
  isUnbreakableMajestyActive: vi.fn(() => false),
  getUnbreakableMajestySaveDc: vi.fn(() => 15),
  clearUnbreakableMajesty: vi.fn(),
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
    vi.mocked(classFeatures.getClassFeatures).mockReturnValue({ ...defaultClassFeatures });
    runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
      switch (key) {
        case 'activeBuffs': return [];
        default: return undefined;
      }
    });
    unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(false);
  });

  describe('null/unknown class handling', () => {
    it('returns null for unknown class name', () => {
      const { container } = renderComponent(buildPlayerStats({ class: { name: 'UnknownClass' } }));
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Barbarian features', () => {
    function barbarianStats(overrides = {}) {
      return buildPlayerStats({
        level: 5,
        class: {
          name: 'Barbarian',
          class_levels: [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5, class_specific: { rage_count: 2, rage_damage_bonus: 2 } }],
        },
        automation: { specialActions: [] },
        ...overrides,
      });
    }

    it('renders barbarian with Aspect of the Wilds passive and choice', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'aspectOfTheWildsOption') return 'Owl';
        return undefined;
      });
      const stats = barbarianStats({
        automation: { specialActions: [{ type: 'animal_aspect' }] },
      });
      renderComponent(stats);
      expect(screen.getByText(/Aspect of the Wilds/)).toBeInTheDocument();
      expect(screen.getByText(/Owl/)).toBeInTheDocument();
    });

    it('does not render Aspect of the Wilds when passive exists but no choice set', () => {
      const stats = barbarianStats({
        automation: { specialActions: [{ type: 'animal_aspect' }] },
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).not.toContain('Aspect of the Wilds');
    });

    it('renders 2024 ruleset barbarian with class_level-based rage values', () => {
      const stats = barbarianStats({
        rules: '2024',
        class: {
          name: 'Barbarian',
          class_levels: [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5, rages: 3, rage_damage: 4, weapon_mastery: 'Piercing', extra_attacks: 1 }],
        },
      });
      renderComponent(stats);
      expect(screen.getByText(/Extra Attacks:/)).toBeInTheDocument();
      expect(screen.getByText('Piercing')).toBeInTheDocument();
    });

    it('renders weapon mastery clickable for 2024 barbarian', () => {
      const stats = barbarianStats({
        rules: '2024',
        class: {
          name: 'Barbarian',
          class_levels: [{ level: 5, rages: 3, rage_damage: 4, weapon_mastery: 'Slashing' }],
        },
      });
      renderComponent(stats);
      const weaponMasteryLabel = screen.getByText(/Weapon Mastery:/);
      expect(weaponMasteryLabel.nextElementSibling).toHaveClass('clickable');
    });

    it('renders rage damage with buffed styling when rage is active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Rage' }];
        return undefined;
      });
      const stats = barbarianStats({
        level: 2,
        class: {
          name: 'Barbarian',
          class_levels: [{ level: 1 }, { level: 2, class_specific: { rage_damage_bonus: 2 } }],
        },
      });
      const { container } = renderComponent(stats);
      const buffedSpan = container.querySelector('.stat--buffed');
      expect(buffedSpan).toBeTruthy();
      expect(buffedSpan.textContent).toBe('2');
    });

    it('renders rage automation badge when rage is active', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Rage' }];
        return undefined;
      });
      const stats = barbarianStats({
        level: 2,
        class: {
          name: 'Barbarian',
          class_levels: [{ level: 2, class_specific: { rage_damage_bonus: 2 } }],
        },
      });
      renderComponent(stats);
      expect(screen.getByText(/BPS Resist/)).toBeInTheDocument();
    });

    it('renders reckless attack badge when advantage_attacks_advantage_against buff exists', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
        return undefined;
      });
      const stats = barbarianStats();
      renderComponent(stats);
      expect(screen.getByText(/Reckless Attack/)).toBeInTheDocument();
    });

    it('does not render reckless attack when no matching buff', () => {
      const stats = barbarianStats();
      renderComponent(stats);
      expect(screen.queryByText(/Reckless Attack/)).not.toBeInTheDocument();
    });

    it('renders warrior of the gods tracked resource when feature exists in bonusActions', () => {
      const stats = barbarianStats({
        level: 6,
        bonusActions: [{ name: 'Warrior of the Gods' }],
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-warriorofthegodsPool')).toBeInTheDocument();
    });

    it('does not render warrior of the gods when feature is missing', () => {
      const stats = barbarianStats({ bonusActions: [] });
      const { container } = renderComponent(stats);
      expect(container.querySelector('[data-testid="tracked-resource-warriorofthegodsPool"]')).toBeFalsy();
    });

    it('sets warrior of the gods maxDice correctly by level', () => {
      const levelMaxMap = [
        { level: 3, expected: '4/4' },
        { level: 6, expected: '5/5' },
        { level: 12, expected: '6/6' },
        { level: 17, expected: '7/7' },
        { level: 20, expected: '7/7' },
      ];
      for (const { level, expected } of levelMaxMap) {
        const stats = barbarianStats({ level, bonusActions: [{ name: 'Warrior of the Gods' }] });
        const { container } = renderComponent(stats);
        expect(container.textContent).toContain(expected);
      }
    });
  });

  describe('Bard features', () => {
    function bardStats(overrides = {}) {
      return buildPlayerStats({
        level: 5,
        class: {
          name: 'Bard',
          class_levels: [{ level: 5 }],
          subclass: { name: 'War', type: 'Choice' },
          fightingStyles: [],
        },
        automation: { passives: [] },
        ...overrides,
      });
    }

    it('renders magical secrets tracked resource when bardFeatures.magicalSecrets is not null', () => {
      const stats = bardStats();
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-magicalSecrets')).toBeInTheDocument();
    });

    it('does not render magical secrets when bardFeatures.magicalSecrets is null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultClassFeatures,
        magicalSecrets: null,
      });
      const stats = bardStats();
      const { container } = renderComponent(stats);
      expect(container.querySelector('[data-testid="tracked-resource-magicalSecrets"]')).toBeFalsy();
    });

    it('renders expertise when playerStats.expertise exists and level > 2', () => {
      const stats = bardStats({
        expertise: ['Stealth', 'Athletics'],
      });
      renderComponent(stats);
      expect(screen.getByText(/Expertise:/)).toBeInTheDocument();
      expect(screen.getByText(/Stealth, Athletics/)).toBeInTheDocument();
    });

    it('does not render expertise when level <= 2', () => {
      const stats = bardStats({
        level: 2,
        expertise: ['Stealth'],
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).not.toContain('Expertise:');
    });

    it('does not render expertise when expertise array is empty', () => {
      const stats = bardStats({
        level: 5,
        expertise: [],
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).not.toContain('Expertise:');
    });

    it('renders extra attacks when level > 5 and magical secrets exists', () => {
      const stats = bardStats({
        level: 10,
        class: {
          name: 'Bard',
          class_levels: [{ level: 10 }],
          subclass: { name: 'War', type: 'Choice' },
          fightingStyles: [],
        },
      });
      renderComponent(stats);
      expect(screen.getByText(/Extra Attacks.*/)).toBeInTheDocument();
    });

    it('does not render extra attacks when level <= 5', () => {
      const stats = bardStats({
        level: 5,
        class: {
          name: 'Bard',
          class_levels: [{ level: 5 }],
          subclass: { name: 'War', type: 'Choice' },
          fightingStyles: [],
        },
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).not.toContain('Extra Attacks:');
    });

    it('renders bardic inspiration die display with correct die size', () => {
      renderComponent(bardStats());
      expect(screen.getByText(/Bardic Inspiration Die:/)).toBeInTheDocument();
      expect(screen.getByText(/d8/)).toBeInTheDocument();
    });

    it('renders song of rest die when available', () => {
      renderComponent(bardStats());
      expect(screen.getByText(/Song of Rest Die:/)).toBeInTheDocument();
      expect(screen.getByText(/d6/)).toBeInTheDocument();
    });

    it('does not render song of rest when songOfRestDie is null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultClassFeatures,
        songOfRestDie: null,
      });
      const { container } = renderComponent(bardStats());
      expect(container.textContent).not.toContain('Song of Rest');
    });

    it('renders beguiling magic tracked resource when passive_rule with riderSave exists', () => {
      const stats = bardStats({
        automation: { passives: [{ type: 'passive_rule', riderSave: true }] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-postCastRider_Beguiling_Magic')).toBeInTheDocument();
    });

    it('does not render beguiling magic when passive lacks riderSave', () => {
      const stats = bardStats({
        automation: { passives: [{ type: 'passive_rule', riderSave: false }] },
      });
      const { container } = renderComponent(stats);
      expect(container.querySelector('[data-testid="tracked-resource-postCastRider_Beguiling_Magic"]')).toBeFalsy();
    });

    it('renders unbreakable majesty button with correct DC when active', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(17);
      renderComponent(bardStats());
      expect(screen.getByText(/Unbreakable Majesty DC 17/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Unbreakable Majesty/ })).toHaveClass('majesty-badge--active');
    });

    it('does not render unbreakable majesty when not active', () => {
      renderComponent(bardStats());
      expect(screen.queryByRole('button', { name: /Unbreakable Majesty/ })).not.toBeInTheDocument();
    });

    it('calls clearUnbreakableMajesty when majesty button is clicked', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      renderComponent(bardStats());
      const button = screen.getByRole('button', { name: /Unbreakable Majesty/ });
      fireEvent.click(button);
      expect(unbreakableMajesty.clearUnbreakableMajesty).toHaveBeenCalledWith('Thorin', mockCampaignName);
    });

    it('renders shield icon in the majesty button', () => {
      vi.mocked(unbreakableMajesty.isUnbreakableMajestyActive).mockReturnValue(true);
      vi.mocked(unbreakableMajesty.getUnbreakableMajestySaveDc).mockReturnValue(15);
      renderComponent(bardStats());
      const button = screen.getByRole('button', { name: /Unbreakable Majesty/ });
      expect(button.querySelector('i.fa-solid.fa-shield-halved')).toBeTruthy();
    });
  });

  describe('Cleric features', () => {
    function clericStats(overrides = {}) {
      return buildPlayerStats({
        class: { name: 'Cleric', class_levels: [{ level: 5 }] },
        automation: { passives: [] },
        ...overrides,
      });
    }

    it('renders channel divinity charges tracked resource', () => {
      renderComponent(clericStats());
      expect(screen.getByTestId('tracked-resource-channelDivinityCharges')).toBeInTheDocument();
    });

    it('renders destroy undead CR when available', () => {
      renderComponent(clericStats());
      expect(screen.getByText(/Destroy Undead Challenge Rating:/)).toBeInTheDocument();
    });

    it('does not render destroy undead when destroyUndeadCR is null', () => {
      vi.mocked(classFeatures.getClassFeatures).mockReturnValue({
        ...defaultClassFeatures,
        destroyUndeadCR: null,
      });
      const { container } = renderComponent(clericStats());
      expect(container.textContent).not.toContain('Destroy Undead');
    });

    it('renders Preserve Life Pool for Life Domain', () => {
      const stats = clericStats({
        class: { name: 'Cleric', subclass: { name: 'Life Domain' }, class_levels: [{ level: 5 }] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-preserveLifePool')).toBeInTheDocument();
    });

    it('renders Preserve Life Pool when major is Life Domain', () => {
      const stats = clericStats({
        class: { name: 'Cleric', major: { name: 'Life Domain' }, class_levels: [{ level: 5 }] },
      });
      renderComponent(stats);
      expect(screen.getByTestId('tracked-resource-preserveLifePool')).toBeInTheDocument();
    });

    it('calculates Preserve Life Pool max as 5 * level', () => {
      const stats = clericStats({
        level: 17,
        class: { name: 'Cleric', major: { name: 'Life Domain' }, subclass: { name: 'Life Domain' }, class_levels: [{ level: 17 }] },
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('85/85');
    });

    it('does not render Preserve Life Pool for non-Life Domain', () => {
      const stats = clericStats({
        class: { name: 'Cleric', subclass: { name: 'War Domain' }, class_levels: [{ level: 5 }] },
      });
      renderComponent(stats);
      expect(screen.queryByTestId('tracked-resource-preserveLifePool')).not.toBeInTheDocument();
    });

    it('renders warding flare uses with wisdom-based max', () => {
      renderComponent(clericStats());
      expect(screen.getByTestId('tracked-resource-wardingflareUses')).toBeInTheDocument();
    });

    it('uses Math.max(1, wisMod) for warding flare max when wisdom bonus is negative', () => {
      const stats = clericStats({
        abilities: [{ name: 'Wisdom', bonus: -2 }],
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('1/1');
    });

    it('uses 1 for warding flare max when wisdom ability is missing', () => {
      const stats = clericStats({
        abilities: [{ name: 'Charisma', bonus: 3 }],
      });
      const { container } = renderComponent(stats);
      expect(container.textContent).toContain('1/1');
    });
  });
});

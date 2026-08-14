// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';
import { mockPlayerStats } from './CharSpells.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => []),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
  default: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

let mockDiceRoll = { rollAttack: vi.fn(), rollDamage: vi.fn(), autoDamageRoll: null };

vi.mock('../../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn((name, campaignName, options) => {
    mockDiceRoll.autoDamageRoll = options?.autoDamageRoll;
    return {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      rollAttack: mockDiceRoll.rollAttack,
      rollDamage: mockDiceRoll.rollDamage,
      quickRollPlayerSave: vi.fn(),
    };
  }),
}));

vi.mock('../../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(),
}));

vi.mock('../../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(),
}));

vi.mock('../../../hooks/combat/useSpellCastExecutor.js', () => ({
  useSpellCastExecutor: vi.fn(() => ({ castAction: vi.fn() })),
}));

vi.mock('../../../hooks/combat/useSpellPositionResolver.js', () => ({
  useSpellPositionResolver: vi.fn(() => ({
    resolvePositions: vi.fn(() => Promise.resolve()),
    cachedPosRef: { current: null },
  })),
}));

vi.mock('../../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
  getTargetFromAttacker: vi.fn(() => null),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn().mockResolvedValue({ players: [], placedItems: [] }),
}));

vi.mock('../../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../../services/ui/dataLoader.js', () => ({
  loadMonsters: vi.fn(),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
  isInnateSorceryActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/spells/shapechangeService.js', () => ({
  confirmShapechangeTransform: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn().mockResolvedValue(undefined),
  isFreeCastAuthorized: vi.fn(() => false),
}));

vi.mock('../useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn(() => ({ attack: { name: 'Fire Bolt' }, ctx: { targetName: 'Orc' } })),
  resolveAttackDamageStandalone: vi.fn(() => Promise.resolve()),
}));

vi.mock('./CharSpellSlots.jsx', () => ({
  default: function CharSpellSlots() {
    return <div data-testid="char-spell-slots">Spell Slots</div>;
  },
}));

vi.mock('./SpellDetailPopup.jsx', () => ({
  default: function SpellDetailPopup({ spell, onCast }) {
    return (
      <div data-testid="spell-detail-popup">
        <span>{spell?.name}</span>
        <button data-testid="cast-spell-button" onClick={() => onCast(spell, {})}>Cast</button>
      </div>
    );
  },
}));

vi.mock('../popups/MetamagicPopup.jsx', () => ({
  default: function MetamagicPopup({ spell, playerStats, onConfirm, onSkip }) {
    return (
      <div data-testid="metamagic-popup">
        <span>{spell?.name}</span>
        <span data-testid="metamagic-sp">{playerStats?._metamagicCurrentSP}</span>
        <button data-testid="metamagic-confirm" onClick={onConfirm}>confirm</button>
        <button data-testid="metamagic-skip" onClick={onSkip}>skip</button>
      </div>
    );
  },
}));

vi.mock('../popups/MultiTargetPopup.jsx', () => ({
  default: function MultiTargetPopup({ spell, creatureTargets, onConfirm, onSkip }) {
    return (
      <div data-testid="multi-target-popup">
        <span>{spell?.name}</span>
        <button data-testid="mt-confirm" onClick={() => onConfirm({ targets: creatureTargets })}>confirm</button>
        <button data-testid="mt-skip" onClick={onSkip}>skip</button>
      </div>
    );
  },
}));

vi.mock('../popups/MagicMissileTargetPopup.jsx', () => ({
  default: function MagicMissileTargetPopup({ spell, totalMissiles, currentTargetName, creatureTargets, onConfirm, onSkip }) {
    return (
      <div data-testid="magic-missile-popup">
        <span>{spell?.name}</span>
        <span data-testid="mm-total">{totalMissiles}</span>
        <span data-testid="mm-current-target">{currentTargetName}</span>
        <button data-testid="mm-confirm" onClick={() => onConfirm({ targets: creatureTargets })}>confirm</button>
        <button data-testid="mm-skip" onClick={onSkip}>skip</button>
      </div>
    );
  },
}));

vi.mock('./UpcastPopup.jsx', () => ({
  default: function UpcastPopup({ spell }) {
    return <div data-testid="upcast-popup">{spell?.name}</div>;
  },
}));

vi.mock('../modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function CreatureSelectionModal({ title, targets, onConfirm, onSkip }) {
    return (
      <div data-testid="creature-selection-modal" data-title={title}>
        <span>{title}</span>
        {targets?.map(t => {
          const name = typeof t === 'string' ? t : t.name;
          return <button key={name} data-testid={`csm-${name}`} onClick={() => onConfirm?.([name])}>{name}</button>;
        })}
        <button data-testid="csm-skip" onClick={() => onSkip?.()}>skip</button>
      </div>
    );
  },
}));

vi.mock('../modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function SecondaryTargetModal({ title, targets, onTargetSelected, onSkip, hideConfirm, description }) {
    return (
      <div data-testid="secondary-target-modal" data-title={title} data-hideconfirm={String(Boolean(hideConfirm))}>
        <span>{title}</span>
        <span data-testid="stm-description">{description}</span>
        <button data-testid="stm-skip" onClick={() => onSkip?.()}>skip</button>
        {targets?.map(t => (
          <button key={t.value || t.name} data-testid={`stm-${t.value || t.name}`} onClick={() => onTargetSelected?.(t.value || t.name)}>
            {t.label || t.name}
          </button>
        ))}
        {!hideConfirm && targets?.length > 0 && (
          <button data-testid="stm-confirm" onClick={() => onTargetSelected?.(targets[0].value || targets[0].name)}>confirm</button>
        )}
      </div>
    );
  },
}));

vi.mock('../modals/TruePolymorphPathModal.jsx', () => ({
  default: function TruePolymorphPathModal({ onConfirm, onCancel }) {
    return (
      <div data-testid="true-polymorph-path-modal">
        <button data-testid="tp-path-creature" onClick={() => onConfirm('creature_to_creature')}>creature to creature</button>
        <button data-testid="tp-path-object" onClick={() => onConfirm('creature_to_object')}>creature to object</button>
        <button data-testid="tp-cancel" onClick={onCancel}>cancel</button>
      </div>
    );
  },
}));

vi.mock('../modals/SingleResistanceSelectionModal.jsx', () => ({
  default: function SingleResistanceSelectionModal({ title, action }) {
    return (
      <div data-testid="single-resistance-selection-modal">
        <span>{title}</span>
        <span data-testid="res-damage-types">{action?.automation?.damageTypes?.join(',')}</span>
      </div>
    );
  },
}));

vi.mock('../modals/HexAbilityModal.jsx', () => ({
  default: function HexAbilityModal({ title, onAbilitySelected, onCancel }) {
    return (
      <div data-testid="hex-ability-modal" data-title={title}>
        <button data-testid="hex-ability-STR" onClick={() => onAbilitySelected('STR')}>Strength</button>
        <button data-testid="hex-cancel" onClick={onCancel}>cancel</button>
      </div>
    );
  },
}));

import { useSpellMetamagicFlow } from '../../../hooks/combat/useSpellMetamagicFlow.js';
import { useSpellUpcastFlow } from '../../../hooks/combat/useSpellUpcastFlow.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { isInnateSorceryActive } from '../../../services/combat/buffs/buffService.js';
import { getTargetFromAttacker } from '../../../services/rules/combat/damageUtils.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { normalizeAutoDamage, resolveAttackDamageStandalone } from '../useAttackDamageResolution.js';
import { loadMonsters } from '../../../services/ui/dataLoader.js';
import { prepareSpellCast } from '../../../services/rules/spells/spellPreparationService.js';
import { confirmShapechangeTransform } from '../../../services/automation/handlers/spells/shapechangeService.js';

const PENDING_KEYS = [
  'Metamagic', 'MultiTarget', 'HeroesFeast', 'GreaterRestoration', 'LesserRestoration',
  'MageArmor', 'Bane', 'Bless', 'FaerieFire', 'HolyAura', 'BeaconOfHope', 'Slow', 'Haste',
  'EnhanceAbility', 'Barkskin', 'Invisibility', 'GreaterInvisibility', 'FeignDeath', 'Heal',
  'ProtectionFromEvilAndGood', 'ProtectionFromPoison', 'StoneSkin', 'ProtectionFromEnergy',
  'Resistance', 'RemoveCurse', 'MagicMissile', 'PassWithoutTrace', 'Globe', 'Forcecage',
  'AntimagicField', 'Regenerate', 'HealingWord', 'CureWounds', 'StinkingCloud', 'Web',
  'AnimalFriendship', 'AuraOfLife', 'AuraOfPurity', 'CircleOfPower', 'Compulsion',
  'AuraOfVitality', 'Foresight', 'Longstrider', 'SpareTheDying', 'Confusion', 'DeathWard',
  'Heroism', 'Revivify', 'Sanctuary', 'SleetStorm', 'Shapechange',
];

// Maps spell flow keys to their actual handler names from CreatureTargetPopups props
const HANDLER_MAP = {
  HoldMonster: { confirm: 'handleHoldMonsterConfirm', skip: 'handleHoldMonsterSkip' },
  HoldPerson: { confirm: 'handleHoldPersonConfirm', skip: 'handleHoldPersonSkip' },
  Polymorph: { confirm: 'handlePolymorphConfirm', skip: 'handlePolymorphSkip' },
  AnimalShapes: { confirm: 'handleAnimalShapesTargetConfirm', skip: 'handleAnimalShapesSkip' },
  CharmPerson: { confirm: 'handleCharmPersonConfirm', skip: 'handleCharmPersonSkip' },
  CharmMonster: { confirm: 'handleCharmMonsterConfirm', skip: 'handleCharmMonsterSkip' },
  Banishment: { confirm: 'handleBanishmentConfirm', skip: 'handleBanishmentSkip' },
  PrismaticSpray: { confirm: 'handlePrismaticSprayConfirm', skip: 'handlePrismaticSpraySkip' },
  HeroesFeast: { confirm: 'handleHeroesFeastConfirm', skip: 'handleHeroesFeastSkip' },
  Bane: { confirm: 'handleBaneConfirm', skip: 'handleBaneSkip' },
  Bless: { confirm: 'handleBlessConfirm', skip: 'handleBlessSkip' },
  FaerieFire: { confirm: 'handleFaerieFireConfirm', skip: 'handleFaerieFireSkip' },
  HolyAura: { confirm: 'handleHolyAuraConfirm', skip: 'handleHolyAuraSkip' },
  BeaconOfHope: { confirm: 'handleBeaconOfHopeConfirm', skip: 'handleBeaconOfHopeSkip' },
  Slow: { confirm: 'handleSlowConfirm', skip: 'handleSlowSkip' },
  PassWithoutTrace: { confirm: 'handlePassWithoutTraceConfirm', skip: 'handlePassWithoutTraceSkip' },
  Globe: { confirm: 'handleGlobeConfirm', skip: 'handleGlobeSkip' },
  AntimagicField: { confirm: 'handleAntimagicFieldConfirm', skip: 'handleAntimagicFieldSkip' },
  Forcecage: { confirm: 'handleForcecageConfirm', skip: 'handleForcecageSkip' },
  StinkingCloud: { confirm: 'handleStinkingCloudConfirm', skip: 'handleStinkingCloudSkip' },
  Confusion: { confirm: 'handleConfusionConfirm', skip: 'handleConfusionSkip' },
  Web: { confirm: 'handleWebConfirm', skip: 'handleWebSkip' },
  AnimalFriendship: { confirm: 'handleAnimalFriendshipConfirm', skip: 'handleAnimalFriendshipSkip' },
  AuraOfLife: { confirm: 'handleAuraOfLifeConfirm', skip: 'handleAuraOfLifeSkip' },
  AuraOfPurity: { confirm: 'handleAuraOfPurityConfirm', skip: 'handleAuraOfPuritySkip' },
  CircleOfPower: { confirm: 'handleCircleOfPowerConfirm', skip: 'handleCircleOfPowerSkip' },
  Compulsion: { confirm: 'handleCompulsionConfirm', skip: 'handleCompulsionSkip' },
  SleetStorm: { confirm: 'handleSleetStormConfirm', skip: 'handleSleetStormSkip' },
};

function createFlow(overrides = {}) {
  const flow = { gateMetamagic: vi.fn(), handleConfirm: vi.fn(), handleSkip: vi.fn() };
  for (const key of PENDING_KEYS) {
    flow[`pending${key}`] = null;
    flow[`handle${key}Confirm`] = vi.fn();
    flow[`handle${key}Skip`] = vi.fn();
  }
  flow.enhanceAbilityStage = null;
  flow.protectionFromEnergyStage = null;
  flow.resistanceStage = null;
  flow.handleEnhanceAbilityAbilitySelect = vi.fn();
  flow.handleProtectionFromEnergyTargetSelect = vi.fn();
  flow.handleProtectionFromEnergyTypeSelect = vi.fn();
  flow.handleResistanceTargetSelect = vi.fn();
  flow.handleResistanceTypeSelect = vi.fn();
  flow.handleGreaterRestorationNoEffects = vi.fn();
  flow.pendingHoldMonster = null; flow.handleHoldMonsterConfirm = vi.fn(); flow.handleHoldMonsterSkip = vi.fn();
  flow.pendingHoldPerson = null; flow.handleHoldPersonConfirm = vi.fn(); flow.handleHoldPersonSkip = vi.fn();
  flow.pendingPolymorph = null; flow.handlePolymorphConfirm = vi.fn(); flow.handlePolymorphSkip = vi.fn();
  flow.pendingAnimalShapes = null; flow.handleAnimalShapesTargetConfirm = vi.fn(); flow.handleAnimalShapesSkip = vi.fn();
  flow.pendingTruePolymorph = null; flow.handleTruePolymorphPathSelect = vi.fn(); flow.handleTruePolymorphTargetConfirm = vi.fn(); flow.handleTruePolymorphSkip = vi.fn();
  flow.pendingCharmPerson = null; flow.handleCharmPersonConfirm = vi.fn(); flow.handleCharmPersonSkip = vi.fn();
  flow.pendingCharmMonster = null; flow.handleCharmMonsterConfirm = vi.fn(); flow.handleCharmMonsterSkip = vi.fn();
  flow.pendingBanishment = null; flow.handleBanishmentConfirm = vi.fn(); flow.handleBanishmentSkip = vi.fn();
  flow.pendingPrismaticSpray = null; flow.handlePrismaticSprayConfirm = vi.fn(); flow.handlePrismaticSpraySkip = vi.fn();
  return { ...flow, ...overrides };
}

let flow;
let upcastFlow;

function renderWithProps(props = {}) {
  return render(<CharSpells
    playerStats={mockPlayerStats}
    campaignName="test-campaign"
    {...props}
  />);
}

describe('CharSpells - Popup Modal Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flow = createFlow();
    upcastFlow = {
      pendingUpcast: null,
      buildUpcastLevels: vi.fn(() => []),
      gateUpcast: vi.fn(() => false),
      handleUpcastConfirm: vi.fn(),
      handleUpcastCancel: vi.fn(),
      getCantripAutoLevel: vi.fn(() => null),
    };
    mockDiceRoll = { rollAttack: vi.fn(), rollDamage: vi.fn(), autoDamageRoll: null };
    vi.mocked(useSpellMetamagicFlow).mockReturnValue(flow);
    vi.mocked(useSpellUpcastFlow).mockReturnValue(upcastFlow);
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(isInnateSorceryActive).mockReturnValue(false);
    vi.mocked(getTargetFromAttacker).mockReturnValue(null);
    vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });
    vi.mocked(normalizeAutoDamage).mockReturnValue({ attack: { name: 'Fire Bolt' }, ctx: { targetName: 'Orc' } });
    vi.mocked(resolveAttackDamageStandalone).mockResolvedValue(undefined);
  });

  describe('creature selection modals', () => {
    const creatureModalSpells = [
      { key: 'pendingHoldMonster', title: 'Hold Monster' },
      { key: 'pendingHoldPerson', title: 'Hold Person' },
      { key: 'pendingPolymorph', title: 'Polymorph' },
      { key: 'pendingAnimalShapes', title: 'Animal Shapes' },
      { key: 'pendingCharmPerson', title: 'Charm Person' },
      { key: 'pendingCharmMonster', title: 'Charm Monster' },
      { key: 'pendingBanishment', title: 'Banishment' },
      { key: 'pendingPrismaticSpray', title: 'Prismatic Spray' },
      { key: 'pendingHeroesFeast', title: "Heroes' Feast" },
      { key: 'pendingBane', title: 'Bane' },
      { key: 'pendingBless', title: 'Bless' },
      { key: 'pendingFaerieFire', title: 'Faerie Fire' },
      { key: 'pendingHolyAura', title: 'Holy Aura' },
      { key: 'pendingBeaconOfHope', title: 'Beacon of Hope' },
      { key: 'pendingSlow', title: 'Slow' },
      { key: 'pendingPassWithoutTrace', title: 'Pass Without Trace' },
      { key: 'pendingGlobe', title: 'Globe of Invulnerability' },
      { key: 'pendingAntimagicField', title: 'Antimagic Field' },
      { key: 'pendingForcecage', title: 'Forcecage' },
      { key: 'pendingStinkingCloud', title: 'Stinking Cloud' },
      { key: 'pendingConfusion', title: 'Confusion' },
      { key: 'pendingWeb', title: 'Web' },
      { key: 'pendingAnimalFriendship', title: 'Animal Friendship' },
      { key: 'pendingAuraOfLife', title: 'Aura of Life' },
      { key: 'pendingAuraOfPurity', title: 'Aura of Purity' },
      { key: 'pendingCircleOfPower', title: 'Circle of Power' },
      { key: 'pendingCompulsion', title: 'Compulsion' },
      { key: 'pendingSleetStorm', title: 'Sleet Storm' },
    ];

    it.each(creatureModalSpells)('renders CreatureSelectionModal with correct title for $title', ({ key, title }) => {
      flow[key] = { creatureTargets: ['Orc', 'Goblin'], maxTargets: 2 };
      renderWithProps();
      const modals = screen.getAllByTestId('creature-selection-modal');
      const modal = modals.find(m => m.getAttribute('data-title') === title);
      expect(modal).toBeInTheDocument();
    });

    it.each(creatureModalSpells)('renders creature target buttons for $title', ({ key }) => {
      flow[key] = { creatureTargets: ['Orc', 'Goblin'], maxTargets: 2 };
      renderWithProps();
      expect(screen.getAllByTestId('csm-Orc').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('csm-Goblin').length).toBeGreaterThan(0);
    });

    it.each(creatureModalSpells)('wires skip handler for $title', async ({ key, title }) => {
      flow[key] = { creatureTargets: ['Orc'], maxTargets: 1 };
      renderWithProps();
      const handlerInfo = HANDLER_MAP[title];
      if (!handlerInfo) return;
      fireEvent.click(screen.getByTestId('csm-skip'));
      expect(flow[handlerInfo.skip]).toHaveBeenCalled();
    });

    it.each(creatureModalSpells)('wires confirm handler when a creature is selected for $title', async ({ key, title }) => {
      flow[key] = { creatureTargets: ['Orc', 'Goblin'], maxTargets: 2 };
      renderWithProps();
      const handlerInfo = HANDLER_MAP[title];
      if (!handlerInfo) return;
      fireEvent.click(screen.getByTestId('csm-Orc'));
      expect(flow[handlerInfo.confirm]).toHaveBeenCalled();
    });

    it('confirms with the selected creature name, not all targets', async () => {
      flow.pendingBane = { creatureTargets: ['Orc', 'Goblin', 'Skeleton'], maxTargets: 3 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-Goblin'));
      expect(flow.handleBaneConfirm).toHaveBeenCalledWith(['Goblin']);
    });

    it('renders TruePolymorphPathModal when pendingTruePolymorph has no path', () => {
      flow.pendingTruePolymorph = { creatureTargets: ['Orc'] };
      renderWithProps();
      expect(screen.getByTestId('true-polymorph-path-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });

    it.each([
      { path: 'creature_to_creature' },
      { path: 'creature_to_object' },
    ])('renders CreatureSelectionModal for True Polymorph path $path', ({ path }) => {
      flow.pendingTruePolymorph = { path, creatureTargets: ['Orc'], maxTargets: 1 };
      renderWithProps();
      expect(screen.getByTestId('creature-selection-modal')).toHaveAttribute('data-title', 'True Polymorph');
    });

    it('calls handleTruePolymorphPathSelect when a path is chosen', () => {
      flow.pendingTruePolymorph = { creatureTargets: ['Orc'] };
      renderWithProps();
      fireEvent.click(screen.getByTestId('tp-path-creature'));
      expect(flow.handleTruePolymorphPathSelect).toHaveBeenCalledWith('creature_to_creature');
    });

    it('calls handleTruePolymorphTargetConfirm when a True Polymorph target is confirmed', () => {
      flow.pendingTruePolymorph = { path: 'creature_to_creature', creatureTargets: ['Orc'], maxTargets: 1 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-Orc'));
      expect(flow.handleTruePolymorphTargetConfirm).toHaveBeenCalled();
    });

    it('calls handleTruePolymorphSkip when True Polymorph path modal is skipped', () => {
      flow.pendingTruePolymorph = { creatureTargets: ['Orc'] };
      renderWithProps();
      fireEvent.click(screen.getByTestId('tp-cancel'));
      expect(flow.handleTruePolymorphSkip).toHaveBeenCalled();
    });

    it('calls handleTruePolymorphSkip when True Polymorph creature selection is skipped', () => {
      flow.pendingTruePolymorph = { path: 'creature_to_creature', creatureTargets: ['Orc'], maxTargets: 1 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-skip'));
      expect(flow.handleTruePolymorphSkip).toHaveBeenCalled();
    });

    it('confirms a Shapechange by selecting a beast form and casting the spell', async () => {
      flow.pendingShapechange = {
        spell: { name: 'Shapechange', level: 9, isUpcast: false, upcastLevel: 9 },
        spellLevel: 9,
      };
      vi.mocked(loadMonsters).mockResolvedValue([
        { index: 'brown-bear', name: 'Brown Bear', type: 'beast', challenge_rating: '1', size: 'Large', speed: { walk: '40 ft' }, actions: [{ name: 'Bite' }] },
      ]);
      renderWithProps({ playerStats: { ...mockPlayerStats, level: 3 } });

      await waitFor(() => {
        expect(screen.getByText('Brown Bear')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Brown Bear').closest('.wild-shape-beast-item'));
      fireEvent.click(screen.getByRole('button', { name: /Shapechange/i }));

      await waitFor(() => {
        expect(prepareSpellCast).toHaveBeenCalled();
      });
      expect(prepareSpellCast).toHaveBeenCalledWith(
        flow.pendingShapechange.spell,
        {},
        expect.objectContaining({ playerName: 'Test Character', campaignName: 'test-campaign' })
      );
      expect(confirmShapechangeTransform).toHaveBeenCalledWith(
        expect.objectContaining({
          targetName: 'Test Character',
          casterName: 'Test Character',
          form: expect.objectContaining({ name: 'Brown Bear' }),
          spellLevel: 9,
        })
      );
    });
  });
});

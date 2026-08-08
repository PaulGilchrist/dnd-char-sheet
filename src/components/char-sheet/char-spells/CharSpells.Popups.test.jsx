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
          return <button key={name} data-testid={`csm-${name}`} onClick={() => onConfirm?.(targets)}>{name}</button>;
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
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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
    it.each([
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
    ])('renders CreatureSelectionModal for $title', ({ key, title }) => {
      flow[key] = { creatureTargets: ['Orc', 'Goblin'], maxTargets: 2 };
      renderWithProps();
      const modals = screen.getAllByTestId('creature-selection-modal');
      expect(modals.length).toBeGreaterThan(0);
      expect(modals[0]).toHaveAttribute('data-title', title);
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

    it('calls handleHoldMonsterConfirm when a Hold Monster target is confirmed', () => {
      flow.pendingHoldMonster = { creatureTargets: ['Orc', 'Goblin'], maxTargets: 2 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-Orc'));
      expect(flow.handleHoldMonsterConfirm).toHaveBeenCalled();
    });

    it('calls handleHeroesFeastSkip when Heroes Feast is skipped', () => {
      flow.pendingHeroesFeast = { creatureTargets: ['Orc'] };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-skip'));
      expect(flow.handleHeroesFeastSkip).toHaveBeenCalled();
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

  describe('secondary target modals', () => {
    it.each([
      { key: 'pendingAuraOfVitality', title: 'Aura of Vitality', handler: 'handleAuraOfVitalityConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingForesight', title: 'Foresight', handler: 'handleForesightConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingProtectionFromEvilAndGood', title: 'Protection from Evil and Good', handler: 'handleProtectionFromEvilAndGoodConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingProtectionFromPoison', title: 'Protection from Poison', handler: 'handleProtectionFromPoisonConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingStoneSkin', title: 'Stone Skin', handler: 'handleStoneSkinConfirm', expectedArgs: 'Orc' },
      { key: 'pendingLongstrider', title: 'Longstrider', handler: 'handleLongstriderConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingSpareTheDying', title: 'Spare the Dying', handler: 'handleSpareTheDyingConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingDeathWard', title: 'Death Ward', handler: 'handleDeathWardConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingHeroism', title: 'Heroism', handler: 'handleHeroismConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingHaste', title: 'Haste', handler: 'handleHasteConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingBarkskin', title: 'Barkskin', handler: 'handleBarkskinConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingInvisibility', title: 'Invisibility', handler: 'handleInvisibilityConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingGreaterInvisibility', title: 'Greater Invisibility', handler: 'handleGreaterInvisibilityConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingSanctuary', title: 'Sanctuary', handler: 'handleSanctuaryConfirm', expectedArgs: 'Orc' },
      { key: 'pendingFeignDeath', title: 'Feign Death', handler: 'handleFeignDeathConfirm', expectedArgs: ['Orc'] },
      { key: 'pendingHeal', title: 'Heal', handler: 'handleHealConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingRegenerate', title: 'Regenerate', handler: 'handleRegenerateConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingHealingWord', title: 'Healing Word', handler: 'handleHealingWordConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingCureWounds', title: 'Cure Wounds', handler: 'handleCureWoundsConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingRevivify', title: 'Revivify', handler: 'handleRevivifyConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingRemoveCurse', title: 'Remove Curse', handler: 'handleRemoveCurseConfirm', expectedArgs: { targetName: 'Orc' } },
      { key: 'pendingMageArmor', title: 'Mage Armor', handler: 'handleMageArmorConfirm', expectedArgs: ['Orc'] },
    ])('renders SecondaryTargetModal for $title and wires target selection', ({ key, title, handler, expectedArgs }) => {
      flow[key] = { creatureTargets: ['Orc'], range: '60 feet' };
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', title);
      fireEvent.click(screen.getByTestId('stm-Orc'));
      expect(flow[handler]).toHaveBeenCalledWith(expectedArgs);
    });

    it('wires Remove Curse skip to handleRemoveCurseSkip', () => {
      flow.pendingRemoveCurse = { creatureTargets: ['Orc'], range: 'Touch' };
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleRemoveCurseSkip).toHaveBeenCalled();
    });
  });

  describe('metamagic / multi-target / magic missile / upcast popups', () => {
    it('renders MetamagicPopup with spell name and current SP', () => {
      flow.pendingMetamagic = {
        spellName: 'Fireball',
        spellLevel: 3,
        _currentSP: 7,
        isPsionic: false,
        psionicCost: 0,
      };
      renderWithProps();
      expect(screen.getByTestId('metamagic-popup')).toHaveTextContent('Fireball');
      expect(screen.getByTestId('metamagic-sp')).toHaveTextContent('7');
    });

    it('wires MetamagicPopup confirm and skip handlers', () => {
      flow.pendingMetamagic = { spellName: 'Fireball', spellLevel: 3, _currentSP: 7, isPsionic: false, psionicCost: 0 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('metamagic-confirm'));
      fireEvent.click(screen.getByTestId('metamagic-skip'));
      expect(flow.handleConfirm).toHaveBeenCalled();
      expect(flow.handleSkip).toHaveBeenCalled();
    });

    it('renders MultiTargetPopup and wires handlers', () => {
      flow.pendingMultiTarget = { spellName: 'Aid', spellLevel: 2, range: '30 feet', creatureTargets: ['Orc', 'Goblin'] };
      renderWithProps();
      expect(screen.getByTestId('multi-target-popup')).toHaveTextContent('Aid');
      fireEvent.click(screen.getByTestId('mt-confirm'));
      expect(flow.handleMultiTargetConfirm).toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('mt-skip'));
      expect(flow.handleMultiTargetSkip).toHaveBeenCalled();
    });

    it('renders MagicMissileTargetPopup with total missiles and current target', () => {
      flow.pendingMagicMissile = {
        spell: { name: 'Magic Missile', level: 1 },
        totalMissiles: 3,
        missileDamage: '1d4+1',
        creatureTargets: ['Orc', 'Goblin'],
      };
      vi.mocked(getTargetFromAttacker).mockReturnValue({ name: 'Goblin' });
      renderWithProps();
      expect(screen.getByTestId('magic-missile-popup')).toHaveTextContent('Magic Missile');
      expect(screen.getByTestId('mm-total')).toHaveTextContent('3');
      expect(screen.getByTestId('mm-current-target')).toHaveTextContent('Goblin');
    });

    it('wires MagicMissileTargetPopup confirm to handleMagicMissileConfirm', () => {
      flow.pendingMagicMissile = {
        spell: { name: 'Magic Missile', level: 1 },
        totalMissiles: 3,
        missileDamage: '1d4+1',
        creatureTargets: ['Orc'],
      };
      renderWithProps();
      fireEvent.click(screen.getByTestId('mm-confirm'));
      expect(flow.handleMagicMissileConfirm).toHaveBeenCalled();
    });

    it('renders UpcastPopup when pendingUpcast is set', () => {
      upcastFlow.pendingUpcast = { spell: { name: 'Fireball', level: 3 } };
      renderWithProps();
      expect(screen.getByTestId('upcast-popup')).toHaveTextContent('Fireball');
    });
  });

  describe('enhance ability / resistance / protection from energy staged flows', () => {
    it('renders HexAbilityModal at the ability stage and wires ability selection', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'ability';
      renderWithProps();
      expect(screen.getByTestId('hex-ability-modal')).toHaveAttribute('data-title', 'Enhance Ability — Choose Ability');
      fireEvent.click(screen.getByTestId('hex-ability-STR'));
      expect(flow.handleEnhanceAbilityAbilitySelect).toHaveBeenCalledWith('STR');
    });

    it('renders SecondaryTargetModal at the enhance ability target stage', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'target';
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', 'Enhance Ability');
      fireEvent.click(screen.getByTestId('stm-Orc'));
      expect(flow.handleEnhanceAbilityConfirm).toHaveBeenCalledWith(['Orc']);
    });

    it('renders SecondaryTargetModal for protection from energy target stage', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
      flow.protectionFromEnergyStage = 'target';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));
      expect(flow.handleProtectionFromEnergyTargetSelect).toHaveBeenCalledWith('Orc');
    });

    it('renders SingleResistanceSelectionModal for protection from energy type stage', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
      flow.protectionFromEnergyStage = 'type';
      renderWithProps();
      expect(screen.getByTestId('single-resistance-selection-modal')).toBeInTheDocument();
      expect(screen.getByTestId('res-damage-types')).toHaveTextContent('fire,cold');
    });

    it('renders SecondaryTargetModal for resistance target stage', () => {
      flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
      flow.resistanceStage = 'target';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));
      expect(flow.handleResistanceTargetSelect).toHaveBeenCalledWith('Orc');
    });

    it('renders SingleResistanceSelectionModal for resistance type stage', () => {
      flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
      flow.resistanceStage = 'type';
      renderWithProps();
      expect(screen.getByTestId('single-resistance-selection-modal')).toBeInTheDocument();
    });
  });

  describe('greater restoration flow', () => {
    it('detects effects, then confirms a chosen effect', async () => {
      flow.pendingGreaterRestoration = { creatureTargets: ['Orc', 'Goblin'], range: '60 feet' };
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === 'activeConditions') return ['Charmed'];
        if (key === 'exhaustionLevel') return 2;
        if (key === 'activeBuffs') return [{ type: 'cursed' }];
        if (key === 'abilityReductions') return { str: 1 };
        if (key === 'hpMaxReduction') return 5;
        return null;
      });
      renderWithProps();

      const targetModal = screen.getByTestId('secondary-target-modal');
      expect(targetModal).toHaveAttribute('data-title', 'Greater Restoration');
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('stm-condition:charmed')).toBeInTheDocument();
      });
      expect(screen.getByTestId('stm-exhaustion')).toHaveTextContent('Exhaustion level (current: 2)');
      expect(screen.getByTestId('stm-curse')).toHaveTextContent('Curse (including attunement to cursed magic item)');
      expect(screen.getByTestId('stm-ability_reduction')).toBeInTheDocument();
      expect(screen.getByTestId('stm-hp_max_reduction')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('stm-condition:charmed'));
      expect(flow.handleGreaterRestorationConfirm).toHaveBeenCalledWith({
        targetName: 'Orc',
        selections: [{ type: 'condition', condition: 'charmed' }],
      });
    });

    it('shows no-effects modal and dismisses via handleGreaterRestorationNoEffects', async () => {
      flow.pendingGreaterRestoration = { creatureTargets: ['Orc'], range: '60 feet' };
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-hideconfirm', 'true');
      });
      expect(screen.getByTestId('secondary-target-modal')).toHaveTextContent('No removable effects found on Orc.');
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleGreaterRestorationNoEffects).toHaveBeenCalled();
    });

    it('collects conditions from the combat summary creature for greater restoration', async () => {
      flow.pendingGreaterRestoration = { creatureTargets: ['Orc'], range: '60 feet' };
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [{ name: 'Orc', conditions: [{ key: 'charmed' }] }],
      });
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('stm-condition:charmed')).toBeInTheDocument();
      });
    });

    it('skips at the effect-selection stage and returns to target selection', async () => {
      flow.pendingGreaterRestoration = { creatureTargets: ['Orc'], range: '60 feet' };
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === 'activeConditions') return ['Charmed'];
        return null;
      });
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('stm-condition:charmed')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleGreaterRestorationConfirm).not.toHaveBeenCalled();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-hideconfirm', 'false');
    });
  });

  describe('lesser restoration flow', () => {
    it('detects conditions and confirms a chosen condition', async () => {
      flow.pendingLesserRestoration = { creatureTargets: ['Orc'], range: '30 feet' };
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === 'activeConditions') return ['Blinded'];
        return null;
      });
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', 'Lesser Restoration');
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('stm-condition:blinded')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('stm-condition:blinded'));
      expect(flow.handleLesserRestorationConfirm).toHaveBeenCalledWith({ targetName: 'Orc', condition: 'blinded' });
    });

    it('includes conditions from the combat summary creature', async () => {
      flow.pendingLesserRestoration = { creatureTargets: ['Orc'], range: '30 feet' };
      vi.mocked(getCombatSummary).mockReturnValue({ creatures: [{ name: 'Orc', conditions: [{ key: 'paralyzed' }] }] });
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('stm-condition:paralyzed')).toHaveTextContent('Paralyzed condition');
      });
    });

    it('dismisses no-conditions modal via handleLesserRestorationSkip', async () => {
      flow.pendingLesserRestoration = { creatureTargets: ['Orc'], range: '30 feet' };
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-hideconfirm', 'true');
      });
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleLesserRestorationSkip).toHaveBeenCalled();
    });

    it('skips at the condition-selection stage and returns to target selection', async () => {
      flow.pendingLesserRestoration = { creatureTargets: ['Orc'], range: '30 feet' };
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === 'activeConditions') return ['Blinded'];
        return null;
      });
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('stm-condition:blinded')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleLesserRestorationConfirm).not.toHaveBeenCalled();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-hideconfirm', 'false');
    });

    it('ignores a combat summary lookup failure when collecting conditions', async () => {
      flow.pendingLesserRestoration = { creatureTargets: ['Orc'], range: '30 feet' };
      vi.mocked(getCombatSummary).mockRejectedValue(new Error('boom'));
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-hideconfirm', 'true');
      });
      expect(screen.getByTestId('secondary-target-modal')).toHaveTextContent('No removable conditions found on Orc.');
    });
  });

  describe('spell cast flow', () => {
    it('casts a spell through handleSpellCast which gates metamagic and closes the popup', async () => {
      renderWithProps();
      fireEvent.click(screen.getByText('Light'));
      expect(screen.getByTestId('spell-detail-popup')).toHaveTextContent('Light');

      fireEvent.click(screen.getByTestId('cast-spell-button'));

      await waitFor(() => {
        expect(flow.gateMetamagic).toHaveBeenCalled();
      });
      expect(flow.gateMetamagic).toHaveBeenCalledWith(expect.objectContaining({ name: 'Light' }), {});
      expect(screen.queryByTestId('spell-detail-popup')).not.toBeInTheDocument();
    });

    it('processes auto damage through autoDamageRoll', async () => {
      renderWithProps();
      expect(mockDiceRoll.autoDamageRoll).toBeTypeOf('function');

      await mockDiceRoll.autoDamageRoll({ name: 'Fire Bolt', formula: '1d10', damageType: 'fire' }, false);

      expect(normalizeAutoDamage).toHaveBeenCalledWith(
        { name: 'Fire Bolt', formula: '1d10', damageType: 'fire' },
        false,
        expect.objectContaining({ name: 'Test Character' })
      );
      expect(resolveAttackDamageStandalone).toHaveBeenCalledWith(
        { name: 'Fire Bolt' },
        { targetName: 'Orc' },
        expect.objectContaining({ playerStats: expect.any(Object), campaignName: 'test-campaign' })
      );
    });
  });

  describe('words of creation target selection', () => {
    it('renders SecondaryTargetModal when the flow hook sets wordsOfCreationTarget', async () => {
      vi.mocked(useSpellMetamagicFlow).mockImplementation((playerStats, campaignName, castAction, setWordsOfCreationTarget) => {
        setTimeout(() => {
          setWordsOfCreationTarget({
            title: 'Words of Creation',
            targets: ['Orc', 'Goblin'],
            onTargetSelected: vi.fn(),
            onSkip: vi.fn(),
            featureDescription: 'desc',
            description: 'Choose a creature within 60 feet.',
            confirmLabel: 'Confirm',
            confirmIcon: 'fa-music',
          });
        }, 0);
        return flow;
      });
      renderWithProps();
      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', 'Words of Creation');
      });
    });
  });

  describe('innate sorcery', () => {
    it('adds +1 to save DC when innate sorcery is active', () => {
      vi.mocked(isInnateSorceryActive).mockReturnValue(true);
      renderWithProps();
      expect(screen.getByText('14')).toBeInTheDocument();
    });

    it('uses advantage forcedMode for a Sorcerer with active innate sorcery', () => {
      vi.mocked(isInnateSorceryActive).mockReturnValue(true);
      const sorcerer = { ...mockPlayerStats, class: { name: 'Sorcerer' } };
      renderWithProps({ playerStats: sorcerer, conditionAttackMode: 'normal' });
      fireEvent.click(screen.getByText(/Attack \(to hit\):/));
      expect(mockDiceRoll.rollAttack).toHaveBeenCalledWith('Spell Attack', 5, { forcedMode: 'advantage' });
    });

    it('does not use advantage for a non-sorcerer with active innate sorcery', () => {
      vi.mocked(isInnateSorceryActive).mockReturnValue(true);
      const wizard = { ...mockPlayerStats, class: { name: 'Wizard' } };
      renderWithProps({ playerStats: wizard, conditionAttackMode: 'normal' });
      fireEvent.click(screen.getByText(/Attack \(to hit\):/));
      expect(mockDiceRoll.rollAttack).toHaveBeenCalledWith('Spell Attack', 5, { forcedMode: undefined });
    });
  });

  describe('runtime state subscriptions', () => {
    it('subscribes to activeBuffs via useRuntimeValue with the player and campaign', () => {
      renderWithProps();
      expect(useRuntimeValue).toHaveBeenCalledWith('Test Character', 'activeBuffs', 'test-campaign');
    });
  });
});

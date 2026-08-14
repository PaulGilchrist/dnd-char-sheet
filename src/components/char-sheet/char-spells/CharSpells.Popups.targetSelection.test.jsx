// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
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
    const targetItems = targets?.map(t => typeof t === 'string' ? { value: t, name: t, label: t } : t) || [];
    return (
      <div data-testid="secondary-target-modal" data-title={title} data-hideconfirm={String(Boolean(hideConfirm))}>
        <span>{title}</span>
        <span data-testid="stm-description">{description}</span>
        <button data-testid="stm-skip" onClick={() => onSkip?.()}>skip</button>
        {targetItems.map(t => (
          <button key={t.value || t.name} data-testid={`stm-${t.value || t.name}`} onClick={() => onTargetSelected?.(t.value || t.name)}>
            {t.label || t.name}
          </button>
        ))}
        {!hideConfirm && targetItems.length > 0 && (
          <button data-testid="stm-confirm" onClick={() => onTargetSelected?.(targetItems[0].value || targetItems[0].name)}>confirm</button>
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
  default: function SingleResistanceSelectionModal({ title, action, onClose }) {
    return (
      <div data-testid="single-resistance-selection-modal">
        <span>{title}</span>
        <span data-testid="res-damage-types">{action?.automation?.damageTypes?.join(',')}</span>
        <button data-testid="stm-skip" onClick={onClose}>cancel</button>
      </div>
    );
  },
}));

vi.mock('../modals/HexAbilityModal.jsx', () => ({
  default: function HexAbilityModal({ title, onAbilitySelected, onCancel }) {
    return (
      <div data-testid="hex-ability-modal" data-title={title}>
        <button data-testid="hex-ability-STR" onClick={() => onAbilitySelected('STR')}>Strength</button>
        <button data-testid="hex-ability-DEX" onClick={() => onAbilitySelected('DEX')}>Dexterity</button>
        <button data-testid="hex-ability-CON" onClick={() => onAbilitySelected('CON')}>Constitution</button>
        <button data-testid="hex-ability-INT" onClick={() => onAbilitySelected('INT')}>Intelligence</button>
        <button data-testid="hex-ability-WIS" onClick={() => onAbilitySelected('WIS')}>Wisdom</button>
        <button data-testid="hex-ability-CHA" onClick={() => onAbilitySelected('CHA')}>Charisma</button>
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
  flow.handleEnhanceAbilitySkip = vi.fn();
  flow.handleProtectionFromEnergyTargetSelect = vi.fn();
  flow.handleProtectionFromEnergyTypeSelect = vi.fn();
  flow.handleProtectionFromEnergySkip = vi.fn();
  flow.handleResistanceTargetSelect = vi.fn();
  flow.handleResistanceTypeSelect = vi.fn();
  flow.handleResistanceSkip = vi.fn();
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

  describe('secondary target modals', () => {
    const secondaryTargetSpells = [
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
    ];

    it.each(secondaryTargetSpells)('renders SecondaryTargetModal with correct title for $title', ({ key, title }) => {
      flow[key] = { creatureTargets: ['Orc'], range: '60 feet' };
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', title);
    });

    it.each(secondaryTargetSpells)('renders creature target buttons for $title', ({ key }) => {
      flow[key] = { creatureTargets: ['Orc', 'Goblin'], range: '60 feet' };
      renderWithProps();
      expect(screen.getByTestId('stm-Orc')).toBeInTheDocument();
      expect(screen.getByTestId('stm-Goblin')).toBeInTheDocument();
    });

    it.each(secondaryTargetSpells)('wires target selection to the correct handler for $title', ({ key, handler, expectedArgs }) => {
      flow[key] = { creatureTargets: ['Orc'], range: '60 feet' };
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));
      expect(flow[handler]).toHaveBeenCalledWith(expectedArgs);
    });

    it.each(secondaryTargetSpells)('wires skip to the correct skip handler for $title', ({ key, handler }) => {
      flow[key] = { creatureTargets: ['Orc'], range: '60 feet' };
      renderWithProps();
      const skipHandler = handler.replace('Confirm', 'Skip');
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow[skipHandler]).toHaveBeenCalled();
    });

    it('renders target buttons with correct testids for string targets', () => {
      flow.pendingStoneSkin = { creatureTargets: ['Orc', 'Goblin'], range: 'Touch' };
      renderWithProps();
      expect(screen.getByTestId('stm-Orc')).toBeInTheDocument();
      expect(screen.getByTestId('stm-Goblin')).toBeInTheDocument();
    });
  });

  describe('staged flow - enhance ability', () => {
    it('renders HexAbilityModal at the ability stage', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'ability';
      renderWithProps();
      expect(screen.getByTestId('hex-ability-modal')).toHaveAttribute('data-title', 'Enhance Ability — Choose Ability');
    });

    it('renders all six ability buttons in HexAbilityModal', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'ability';
      renderWithProps();
      expect(screen.getByTestId('hex-ability-STR')).toBeInTheDocument();
      expect(screen.getByTestId('hex-ability-DEX')).toBeInTheDocument();
      expect(screen.getByTestId('hex-ability-CON')).toBeInTheDocument();
      expect(screen.getByTestId('hex-ability-INT')).toBeInTheDocument();
      expect(screen.getByTestId('hex-ability-WIS')).toBeInTheDocument();
      expect(screen.getByTestId('hex-ability-CHA')).toBeInTheDocument();
    });

    it('wires HexAbilityModal ability selection to handleEnhanceAbilityAbilitySelect', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'ability';
      renderWithProps();
      fireEvent.click(screen.getByTestId('hex-ability-DEX'));
      expect(flow.handleEnhanceAbilityAbilitySelect).toHaveBeenCalledWith('DEX');
    });

    it('wires HexAbilityModal cancel to handleEnhanceAbilitySkip', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'ability';
      renderWithProps();
      fireEvent.click(screen.getByTestId('hex-cancel'));
      expect(flow.handleEnhanceAbilitySkip).toHaveBeenCalled();
    });

    it('renders SecondaryTargetModal at the enhance ability target stage', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'target';
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', 'Enhance Ability');
    });

    it('wires SecondaryTargetModal skip to handleEnhanceAbilitySkip at target stage', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'target';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleEnhanceAbilitySkip).toHaveBeenCalled();
    });

    it('renders multiple creature targets in the enhance ability target modal', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc', 'Goblin', 'Skeleton'] };
      flow.enhanceAbilityStage = 'target';
      renderWithProps();
      expect(screen.getByTestId('stm-Orc')).toBeInTheDocument();
      expect(screen.getByTestId('stm-Goblin')).toBeInTheDocument();
      expect(screen.getByTestId('stm-Skeleton')).toBeInTheDocument();
    });

    it('wires enhance ability target selection to handleEnhanceAbilityConfirm', () => {
      flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
      flow.enhanceAbilityStage = 'target';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-Orc'));
      expect(flow.handleEnhanceAbilityConfirm).toHaveBeenCalledWith(['Orc']);
    });
  });

  describe('staged flow - protection from energy', () => {
    it('renders SecondaryTargetModal for protection from energy target stage', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
      flow.protectionFromEnergyStage = 'target';
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', 'Protection from Energy');
    });

    it('wires SecondaryTargetModal skip to handleProtectionFromEnergySkip at target stage', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
      flow.protectionFromEnergyStage = 'target';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleProtectionFromEnergySkip).toHaveBeenCalled();
    });

    it('wires target selection to handleProtectionFromEnergyTargetSelect', () => {
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

    it('wires SingleResistanceSelectionModal skip to handleProtectionFromEnergySkip at type stage', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
      flow.protectionFromEnergyStage = 'type';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleProtectionFromEnergySkip).toHaveBeenCalled();
    });

    it('renders multiple damage types in the selection modal', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold', 'lightning'] };
      flow.protectionFromEnergyStage = 'type';
      renderWithProps();
      expect(screen.getByTestId('res-damage-types')).toHaveTextContent('fire,cold,lightning');
    });

    it('renders single damage type in the selection modal', () => {
      flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
      flow.protectionFromEnergyStage = 'type';
      renderWithProps();
      expect(screen.getByTestId('res-damage-types')).toHaveTextContent('fire');
    });
  });

  describe('staged flow - resistance', () => {
    it('renders SecondaryTargetModal for resistance target stage', () => {
      flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
      flow.resistanceStage = 'target';
      renderWithProps();
      expect(screen.getByTestId('secondary-target-modal')).toHaveAttribute('data-title', 'Resistance');
    });

    it('wires SecondaryTargetModal skip to handleResistanceSkip at target stage', () => {
      flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
      flow.resistanceStage = 'target';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleResistanceSkip).toHaveBeenCalled();
    });

    it('wires target selection to handleResistanceTargetSelect', () => {
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

    it('wires SingleResistanceSelectionModal skip to handleResistanceSkip at type stage', () => {
      flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
      flow.resistanceStage = 'type';
      renderWithProps();
      fireEvent.click(screen.getByTestId('stm-skip'));
      expect(flow.handleResistanceSkip).toHaveBeenCalled();
    });

    it('renders multiple damage types in the resistance selection modal', () => {
      flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold', 'acid'] };
      flow.resistanceStage = 'type';
      renderWithProps();
      expect(screen.getByTestId('res-damage-types')).toHaveTextContent('fire,cold,acid');
    });
  });

  describe('staged flow visibility', () => {
    it('does not render staged flow modals when enhanceAbilityStage is null', () => {
      flow.pendingEnhanceAbility = null;
      flow.enhanceAbilityStage = null;
      renderWithProps();
      expect(screen.queryByTestId('hex-ability-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });

    it('does not render staged flow modals when protectionFromEnergyStage is null', () => {
      flow.pendingProtectionFromEnergy = null;
      flow.protectionFromEnergyStage = null;
      renderWithProps();
      expect(screen.queryByTestId('single-resistance-selection-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });

    it('does not render staged flow modals when resistanceStage is null', () => {
      flow.pendingResistance = null;
      flow.resistanceStage = null;
      renderWithProps();
      expect(screen.queryByTestId('single-resistance-selection-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });
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

    it.each(creatureModalSpells)('wires skip handler for $title', ({ key, title }) => {
      const handlerInfo = HANDLER_MAP[title];
      if (!handlerInfo) return;
      flow[key] = { creatureTargets: ['Orc'], maxTargets: 1 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-skip'));
      expect(flow[handlerInfo.skip]).toHaveBeenCalled();
    });

    it.each(creatureModalSpells)('wires confirm handler when a creature is selected for $title', ({ key, title }) => {
      const handlerInfo = HANDLER_MAP[title];
      if (!handlerInfo) return;
      flow[key] = { creatureTargets: ['Orc', 'Goblin'], maxTargets: 2 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-Orc'));
      expect(flow[handlerInfo.confirm]).toHaveBeenCalled();
    });

    it('confirms with the selected creature name, not all targets', () => {
      flow.pendingBane = { creatureTargets: ['Orc', 'Goblin', 'Skeleton'], maxTargets: 3 };
      renderWithProps();
      fireEvent.click(screen.getByTestId('csm-Goblin'));
      expect(flow.handleBaneConfirm).toHaveBeenCalledWith(['Goblin']);
    });

    it('renders multiple creature targets when maxTargets is large', () => {
      flow.pendingBless = { creatureTargets: ['Orc', 'Goblin', 'Skeleton', 'Zombie', 'Ghoul'], maxTargets: 5 };
      renderWithProps();
      expect(screen.getByTestId('csm-Orc')).toBeInTheDocument();
      expect(screen.getByTestId('csm-Goblin')).toBeInTheDocument();
      expect(screen.getByTestId('csm-Skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('csm-Zombie')).toBeInTheDocument();
      expect(screen.getByTestId('csm-Ghoul')).toBeInTheDocument();
    });
  });

  describe('true polymorph path flow', () => {
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

    it('renders both path buttons in TruePolymorphPathModal', () => {
      flow.pendingTruePolymorph = { creatureTargets: ['Orc'] };
      renderWithProps();
      expect(screen.getByTestId('tp-path-creature')).toBeInTheDocument();
      expect(screen.getByTestId('tp-path-object')).toBeInTheDocument();
    });

    it('calls handleTruePolymorphPathSelect when creature path is chosen', () => {
      flow.pendingTruePolymorph = { creatureTargets: ['Orc'] };
      renderWithProps();
      fireEvent.click(screen.getByTestId('tp-path-creature'));
      expect(flow.handleTruePolymorphPathSelect).toHaveBeenCalledWith('creature_to_creature');
    });

    it('calls handleTruePolymorphPathSelect when object path is chosen', () => {
      flow.pendingTruePolymorph = { creatureTargets: ['Orc'] };
      renderWithProps();
      fireEvent.click(screen.getByTestId('tp-path-object'));
      expect(flow.handleTruePolymorphPathSelect).toHaveBeenCalledWith('creature_to_object');
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
  });
});

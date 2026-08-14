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
// loadMonsters, prepareSpellCast, confirmShapechangeTransform are not used in this split file

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
    vi.resetAllMocks();
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

  describe('enhance ability / resistance / protection from energy staged flows', () => {
    describe('enhance ability stage flow', () => {
      it('renders HexAbilityModal at the ability stage and wires ability selection', () => {
        flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
        flow.enhanceAbilityStage = 'ability';
        renderWithProps();
        expect(screen.getByTestId('hex-ability-modal')).toHaveAttribute('data-title', 'Enhance Ability — Choose Ability');
        fireEvent.click(screen.getByTestId('hex-ability-STR'));
        expect(flow.handleEnhanceAbilityAbilitySelect).toHaveBeenCalledWith('STR');
      });

      it('renders HexAbilityModal with all six ability buttons', () => {
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
        fireEvent.click(screen.getByTestId('stm-Orc'));
        expect(flow.handleEnhanceAbilityConfirm).toHaveBeenCalledWith(['Orc']);
      });

      it('wires SecondaryTargetModal skip to handleEnhanceAbilitySkip at target stage', () => {
        flow.pendingEnhanceAbility = { creatureTargets: ['Orc'] };
        flow.enhanceAbilityStage = 'target';
        renderWithProps();
        fireEvent.click(screen.getByTestId('stm-skip'));
        expect(flow.handleEnhanceAbilitySkip).toHaveBeenCalled();
      });

      it('renders SecondaryTargetModal with multiple creature targets', () => {
        flow.pendingEnhanceAbility = { creatureTargets: ['Orc', 'Goblin', 'Skeleton'] };
        flow.enhanceAbilityStage = 'target';
        renderWithProps();
        expect(screen.getByTestId('stm-Orc')).toBeInTheDocument();
        expect(screen.getByTestId('stm-Goblin')).toBeInTheDocument();
        expect(screen.getByTestId('stm-Skeleton')).toBeInTheDocument();
      });
    });

    describe('protection from energy staged flow', () => {
      it('renders SecondaryTargetModal for protection from energy target stage', () => {
        flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
        flow.protectionFromEnergyStage = 'target';
        renderWithProps();
        fireEvent.click(screen.getByTestId('stm-Orc'));
        expect(flow.handleProtectionFromEnergyTargetSelect).toHaveBeenCalledWith('Orc');
      });

      it('wires SecondaryTargetModal skip to handleProtectionFromEnergySkip at target stage', () => {
        flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold'] };
        flow.protectionFromEnergyStage = 'target';
        renderWithProps();
        fireEvent.click(screen.getByTestId('stm-skip'));
        expect(flow.handleProtectionFromEnergySkip).toHaveBeenCalled();
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

      it('renders with multiple damage types in the selection modal', () => {
        flow.pendingProtectionFromEnergy = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire', 'cold', 'lightning'] };
        flow.protectionFromEnergyStage = 'type';
        renderWithProps();
        expect(screen.getByTestId('res-damage-types')).toHaveTextContent('fire,cold,lightning');
      });
    });

    describe('resistance staged flow', () => {
      it('renders SecondaryTargetModal for resistance target stage', () => {
        flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
        flow.resistanceStage = 'target';
        renderWithProps();
        fireEvent.click(screen.getByTestId('stm-Orc'));
        expect(flow.handleResistanceTargetSelect).toHaveBeenCalledWith('Orc');
      });

      it('wires SecondaryTargetModal skip to handleResistanceSkip at target stage', () => {
        flow.pendingResistance = { creatureTargets: ['Orc'], range: 'Touch', damageTypes: ['fire'] };
        flow.resistanceStage = 'target';
        renderWithProps();
        fireEvent.click(screen.getByTestId('stm-skip'));
        expect(flow.handleResistanceSkip).toHaveBeenCalled();
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

      it('renders with multiple damage types in the resistance selection modal', () => {
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
  });
});

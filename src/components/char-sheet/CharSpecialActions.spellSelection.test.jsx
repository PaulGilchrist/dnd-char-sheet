// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpecialActions from './CharSpecialActions.jsx';

// Mock executeHandler
vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

// Mock automation service — includes ALL automation types used across CharSpecialActions test files
vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn((action) => !!(action?.automation)),
  isInteractiveAutomation: vi.fn((action) => {
    if (!action?.automation) return false;
    const auto = Array.isArray(action.automation) ? action.automation[0] : action.automation;
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'defensive_tactics', 'hunter_prey', 'animal_aspect', 'passive_rule', 'temp_hp_buff', 'brew_poison', 'stride_of_the_elements', 'elemental_epitome', 'destructive_stride', 'quivering_palm', 'steps_of_the_fey_taunt', 'hurl_through_hell', 'clairvoyant_combatant', 'portent', 'boon_of_energy_resistance', 'generic', 'silent', 'resource_pool', 'natural_recovery', 'circle_of_the_land', 'elemental_affinity', 'wild_magic_surge', 'stride_of_elements', 'celestial_resilience', 'fiendish_resilience', 'heroic_inspiration_buff', 'magical_cunning', 'tactical_mind', 'concentration_bonus_attack', 'font_of_inspiration', 'combat_stance', 'damage_type_choice', 'wild_magic_tamed', 'feats_of_chaos', 'initiative_action', 'bewitching_magic', 'lucky_point', 'telekinetic_shove'];
    if (auto.type === 'passive_rule') {
      const interactiveEffects = ['abjuration_savant', 'divination_savant', 'evocation_savant', 'illusion_savant', 'bonus_healing'];
      return interactiveEffects.includes(auto.effect);
    }
    return interactiveTypes.includes(auto.type);
  }),
}));

// Mock TeleportModal
vi.mock('./modals/TeleportModal.jsx', () => ({
  default: ({ action, onClose }) => (
    <div data-testid="teleport-modal">
      <span>{action?.name || 'Teleport'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SignatureSpellsModal
vi.mock('./modals/arcane/SignatureSpellsModal.jsx', () => ({
  default: ({ payload: _payload, onConfirm, onClose }) => (
    <div data-testid="signature-spells-modal" role="presentation" onClick={onClose}>
      <h3>Signature Spells</h3>
      <button onClick={() => onConfirm('Fireball', 'Haste')}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SpellMasteryModal
vi.mock('./modals/arcane/SpellMasteryModal.jsx', () => ({
  default: ({ payload: _payload, onConfirm, onClose }) => (
    <div data-testid="spell-mastery-modal" role="presentation" onClick={onClose}>
      <h3>Spell Mastery</h3>
      <button onClick={() => onConfirm('Mage Armor', 'Shield')}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SavantModal
vi.mock('./modals/arcane/SavantModal.jsx', () => ({
  default: ({ payload, onConfirm, onClose }) => (
    <div data-testid={`${payload?.school?.toLowerCase() || 'savant'}-savant-modal`} role="presentation" onClick={onClose}>
      <span>{payload?.school || 'Savant'} Savant</span>
      <button onClick={() => onConfirm(payload?.spellOptions?.[0] || 'Shield', payload?.spellOptions?.[1] || 'Mage Armor')}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock WeaponKindMasteryModal
vi.mock('./modals/WeaponKindMasteryModal.jsx', () => ({
  default: ({ action, onClose }) => (
    <div data-testid="weapon-kind-mastery-modal">
      <span>{action?.name || 'Weapon Kind Mastery'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock WeaponMasteryChoiceModal
vi.mock('./modals/WeaponMasteryChoiceModal.jsx', () => ({
  default: ({ action: _action, onClose, onConfirm }) => (
    <div data-testid="weapon-mastery-choice-modal">
      <span>Weapon Mastery Choice</span>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onConfirm && onConfirm('Finesse')}>Confirm</button>
    </div>
  ),
}));

// Mock CombatSuperiorityModal
vi.mock('./modals/CombatSuperiorityModal.jsx', () => ({
  default: ({ _payload, onConfirm, _onReopenSelection, onClose }) => (
    <div data-testid="combat-superiority-modal">
      <span>Combat Superiority</span>
      <button onClick={() => onConfirm([], null)}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ResourcePoolModal
vi.mock('./modals/ResourcePoolModal.jsx', () => ({
  default: ({ playerStats: _ps, campaignName: _cn, automation: _auto, onClose }) => (
    <div data-testid="resource-pool-modal">
      <span>Resource Pool</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock NaturalRecoveryModal
vi.mock('./modals/NaturalRecoveryModal.jsx', () => ({
  default: ({ playerStats: _ps, campaignName: _cn, onClose }) => (
    <div data-testid="natural-recovery-modal">
      <span>Natural Recovery</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock CircleOfTheLandSpellsModal
vi.mock('./modals/CircleOfTheLandSpellsModal.jsx', () => ({
  default: ({ playerStats: _ps, campaignName: _cn, onClose }) => (
    <div data-testid="circle-of-the-land-modal">
      <span>Circle of the Land</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ElementalAffinityModal
vi.mock('./modals/ElementalAffinityModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onClose }) => (
    <div data-testid="elemental-affinity-modal">
      <span>{action?.name || 'Elemental Affinity'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock WildMagicSurgeModal
vi.mock('./modals/WildMagicSurgeModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="wild-magic-surge-modal">
      <span>Wild Magic Surge</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock StrideOfTheElementsModal
vi.mock('./modals/StrideOfTheElementsModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="stride-of-the-elements-modal">
      <span>{action?.name || 'Stride of the Elements'}</span>
      <button onClick={() => onConfirm('Ice Walk', { effect: 'ice_walk' })}>Confirm Ice Walk</button>
      <button onClick={() => onConfirm('+10 Speed', { effect: 'speed_boost' })}>Confirm Speed</button>
      <button onClick={() => onConfirm('Fly Speed', { effect: 'fly_speed' })}>Confirm Fly</button>
      <button onClick={() => onConfirm('Teleport 30 ft', { effect: 'teleport' })}>Confirm Teleport</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ElementalEpitomeModal
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, currentResistance: _cr, onConfirm, onClose }) => (
    <div data-testid="elemental-epitome-modal">
      <span>{action?.name || 'Elemental Epitome'}</span>
      <button onClick={() => onConfirm({ description: 'Elemental Epitome activated.' })}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock DestructiveStrideModal
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="destructive-stride-modal">
      <span>{action?.name || 'Destructive Stride'}</span>
      <button onClick={() => onConfirm({ type: 'modal', modalName: 'destructiveStrideTarget', payload: { targets: [{ name: 'Enemy1' }] } })}>Confirm Target</button>
      <button onClick={() => onConfirm({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck target.' } })}>Confirm Popup</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SecondaryTargetModal
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: ({ title, icon: _icon, targets, description, confirmLabel, confirmIcon: _ci, onTargetSelected, onSkip }) => (
    <div data-testid="secondary-target-modal">
      <span>{title}</span>
      {description && <p>{description}</p>}
      <button onClick={() => onTargetSelected(targets[0]?.name)}>{confirmLabel}</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

// Mock QuiveringPalmModal
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="quivering-palm-modal">
      <span>Quivering Palm</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock StepsOfTheFeyTauntModal
vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="steps-of-the-fey-taunt-modal">
      <span>Steps of the Fey Taunt</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock HurlThroughHellModal
vi.mock('./modals/HurlThroughHellModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="hurl-through-hell-modal">
      <span>Hurl Through Hell</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ClairvoyantCombatantModal
vi.mock('./modals/ClairvoyantCombatantModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="clairvoyant-combatant-modal">
      <span>Clairvoyant Combatant</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock CreatureSelectionModal — includes creatureTargets and note props used by other modals
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: ({ title, confirmLabel, description, note, onConfirm, onSkip, targets, creatureTargets }) => (
    <div data-testid="creature-selection-modal">
      <span>{title}</span>
      {description && <p>{description}</p>}
      {note && <p>{note}</p>}
      <button onClick={() => onConfirm && onConfirm((targets || creatureTargets || []).map(t => t.name))}>{confirmLabel}</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

// Mock SingleResistanceSelectionModal
vi.mock('./modals/SingleResistanceSelectionModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="single-resistance-modal">
      <span>Single Resistance</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock MultiResistanceSelectionModal
vi.mock('./modals/MultiResistanceSelectionModal.jsx', () => ({
  default: ({ title, icon: _icon, damageTypes: _dt, existingTypes: _et, maxSelections: _ms, action: _a, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="multi-resistance-modal">
      <span>{title}</span>
      <button onClick={() => onConfirm && onConfirm(['fire', 'cold'])}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock renderMarkdownInline
vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
  renderMarkdown: vi.fn((md) => md),
  renderMarkdownInline: vi.fn((md) => md),
}));

// Mock fighting styles
vi.mock('../../services/ui/dataLoader.js', () => ({
  loadFightingStyles: vi.fn(() => Promise.resolve([
    { name: 'Great Weapon Fighting', description: 'When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit.' },
    { name: 'Protection', description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.' },
  ])),
}));

// Mock the handler functions called by modal confirm callbacks
vi.mock('../../services/automation/handlers/class-wizard/signatureSpellsHandler.js', () => ({
  onSignatureSpellsSelected: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-wizard/spellMasteryHandler.js', () => ({
  onSpellMasterySelected: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-wizard/SavantHandler.js', () => ({
  onSavantSelected: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/defensiveTacticsHandler.js', () => ({
  applyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/hunterPreyHandler.js', () => ({
  applyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Portent', description: 'Die applied.' } })),
}));

vi.mock('../../services/automation/handlers/class-warlock/tempTeleportHandler.js', () => ({
  confirmTeleport: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Moonlight Step', description: 'Teleported.' } })),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpBuffHandler.js', () => ({
  confirmBolsteringPerformance: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Bolstering Performance', description: 'Allies inspired.' } })),
}));

vi.mock('../../services/automation/handlers/buffs/encouragingSongHandler.js', () => ({
  confirmEncouragingSong: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Encouraging Song', description: 'Allies inspired.' } })),
  skipEncouragingSong: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Encouraging Song', description: 'Skipped.' } })),
}));

vi.mock('../../services/automation/handlers/reactions/boonOfEnergyResistanceHandler.js', () => ({
  applyTypeChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Boon of Energy', description: 'Resistances chosen.' } })),
}));

vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  applyTargetChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck target.' } })),
}));

// Mock runtime state — shared mutable store for tests that need runtime values
const mockRuntimeStore = {};

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_key, runtimeKey) => mockRuntimeStore[runtimeKey] ?? null),
  setRuntimeValue: vi.fn((_key, runtimeKey, value, _campaign) => {
    mockRuntimeStore[runtimeKey] = value;
    return Promise.resolve();
  }),
  useRuntimeValue: vi.fn((_key, runtimeKey) => mockRuntimeStore[runtimeKey] ?? null),
}));

// Mock DiceRollContext
vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

// Mock useCombatSuperiorityModal
vi.mock('../../hooks/combat/useCombatSuperiorityModal.js', () => ({
  useCombatSuperiorityModal: vi.fn(() => ({
    combatSuperiorityModal: null,
    setCombatSuperiorityModal: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(),
    handleCombatSuperiorityReopenSelection: vi.fn(),
  })),
}));

// Mock useLoggedDiceRoll
vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
  })),
}));

// Mock log service
vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// Mock normalizeAutoDamage / resolveAttackDamageStandalone
vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn(() => ({ attack: {}, ctx: {} })),
  resolveAttackDamageStandalone: vi.fn(() => Promise.resolve()),
}));

// Mock getCombatContext
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));

// Import mocked modules for use with vi.mocked()
import { executeHandler } from '../../services/automation/index.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';
import { onSpellMasterySelected } from '../../services/automation/handlers/class-wizard/spellMasteryHandler.js';
import { onSavantSelected } from '../../services/automation/handlers/class-wizard/SavantHandler.js';

const basePlayerStats = {
  name: 'TestCharacter',
  specialActions: [],
  class: {
    fightingStyles: [],
  },
  actions: [],
  bonusActions: [],
  reactions: [],
  characterAdvancement: [],
  proficiency: 2,
};

function createPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharSpecialActions - SpellMastery Confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('handleSpellMasteryConfirm', () => {
    it('shows popup and closes modal when onSpellMasterySelected returns a popup result with name', async () => {
      const mockSetPopupHtml = vi.fn();

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Spell Mastery', description: 'Choose two spells.', automation: { type: 'spell_mastery' } },
        ],
      });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'spellMastery',
        payload: {
          action: { name: 'Spell Mastery', automation: { type: 'spell_mastery' } },
          playerStats: basePlayerStats,
          campaignName: 'test',
          spellOptions: ['Mage Armor', 'Shield', 'Detect Magic'],
        },
      });

      onSpellMasterySelected.mockResolvedValue({
        type: 'popup',
        payload: { name: 'Spell Mastery', description: 'Spells prepared and ready to cast.' },
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Spell Mastery:'));

      await waitFor(() => {
        expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Spell Mastery');
      expect(popupCall).toContain('Spells prepared and ready to cast.');
      expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
    });

    it('shows popup without name when result payload lacks name, falling back to action name', async () => {
      const mockSetPopupHtml = vi.fn();
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Spell Mastery', description: 'Choose two spells.', automation: { type: 'spell_mastery' } },
        ],
      });

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'spellMastery',
        payload: {
          action: { name: 'Spell Mastery' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          spellOptions: ['Mage Armor', 'Shield'],
        },
      });

      onSpellMasterySelected.mockResolvedValue({
        type: 'popup',
        payload: { description: 'Spell Mastery selected.' },
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Spell Mastery:'));

      await waitFor(() => {
        expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Spell Mastery');
      expect(popupCall).toContain('Spell Mastery selected.');
    });

    it('closes modal without showing popup when result is null', async () => {
      const mockSetPopupHtml = vi.fn();
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Spell Mastery', description: 'Choose two spells.', automation: { type: 'spell_mastery' } },
        ],
      });

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'spellMastery',
        payload: {
          action: { name: 'Spell Mastery' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          spellOptions: ['Mage Armor', 'Shield'],
        },
      });

      onSpellMasterySelected.mockResolvedValue(null);

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Spell Mastery:'));

      await waitFor(() => {
        expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
      });

      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('does not open modal when cannotAct is true', async () => {
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Spell Mastery', description: 'Choose two spells.', automation: { type: 'spell_mastery' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getByText('Spell Mastery:'));

      await waitFor(() => {
        expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
      });

      expect(executeHandler).not.toHaveBeenCalled();
    });
  });
});

describe('CharSpecialActions - Savant Confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  describe('handleSavantConfirm', () => {
    it('shows popup with correct school name when result has name', async () => {
      const mockSetPopupHtml = vi.fn();
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Evocation Savant', description: 'Choose two evocation spells.', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
        ],
      });

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'EvocationSavant',
        payload: {
          action: { name: 'Evocation Savant', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
          playerStats: basePlayerStats,
          campaignName: 'test',
          school: 'Evocation',
          spellOptions: ['Fireball', 'Scorching Burst'],
        },
      });

      onSavantSelected.mockResolvedValue({
        type: 'popup',
        payload: { name: 'Evocation Savant', description: 'Spells added to spellbook.' },
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Evocation Savant:'));

      await waitFor(() => {
        expect(screen.getByTestId('evocation-savant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Evocation Savant');
      expect(popupCall).toContain('Spells added to spellbook.');
      expect(screen.queryByTestId('evocation-savant-modal')).not.toBeInTheDocument();
    });

    it('shows popup with school name fallback when result payload lacks name', async () => {
      const mockSetPopupHtml = vi.fn();
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Abjuration Savant', description: 'Choose two abjuration spells.', automation: { type: 'passive_rule', effect: 'abjuration_savant' } },
        ],
      });

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'AbjurationSavant',
        payload: {
          action: { name: 'Abjuration Savant' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          school: 'Abjuration',
          spellOptions: ['Shield', 'Mage Armor'],
        },
      });

      onSavantSelected.mockResolvedValue({
        type: 'popup',
        payload: { description: 'Abjuration spells added.' },
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Abjuration Savant:'));

      await waitFor(() => {
        expect(screen.getByTestId('abjuration-savant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Abjuration Savant');
      expect(popupCall).toContain('Abjuration spells added.');
    });

    it('handles string payload from handler', async () => {
      const mockSetPopupHtml = vi.fn();
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Divination Savant', description: 'Choose two divination spells.', automation: { type: 'passive_rule', effect: 'divination_savant' } },
        ],
      });

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'DivinationSavant',
        payload: {
          action: { name: 'Divination Savant' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          school: 'Divination',
          spellOptions: ['Divination', 'Augury'],
        },
      });

      onSavantSelected.mockResolvedValue({
        type: 'popup',
        payload: '<b>Custom HTML popup</b>',
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Divination Savant:'));

      await waitFor(() => {
        expect(screen.getByTestId('divination-savant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      expect(mockSetPopupHtml.mock.calls[0][0]).toBe('<b>Custom HTML popup</b>');
    });

    it('closes modal without showing popup when result is null', async () => {
      const mockSetPopupHtml = vi.fn();
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Illusion Savant', description: 'Choose two illusion spells.', automation: { type: 'passive_rule', effect: 'illusion_savant' } },
        ],
      });

      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'IllusionSavant',
        payload: {
          action: { name: 'Illusion Savant' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          school: 'Illusion',
          spellOptions: ['Minor Illusion', 'Disguise Self'],
        },
      });

      onSavantSelected.mockResolvedValue(null);

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText('Illusion Savant:'));

      await waitFor(() => {
        expect(screen.getByTestId('illusion-savant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.queryByTestId('illusion-savant-modal')).not.toBeInTheDocument();
      });

      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('does not open modal when cannotAct is true', async () => {
      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Evocation Savant', description: 'Choose two evocation spells.', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getByText('Evocation Savant:'));

      await waitFor(() => {
        expect(screen.queryByTestId('evocation-savant-modal')).not.toBeInTheDocument();
      });

      expect(executeHandler).not.toHaveBeenCalled();
    });
  });
});

describe('CharSpecialActions - executeHandler null/undefined handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  it('handles executeHandler returning null silently without opening modal', async () => {
    executeHandler.mockResolvedValue(null);

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Spell Mastery', description: 'Choose two spells.', automation: { type: 'spell_mastery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText('Spell Mastery:'));

    await waitFor(() => {
      expect(executeHandler).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
  });

  it('handles executeHandler returning undefined silently', async () => {
    executeHandler.mockResolvedValue(undefined);

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Spell Mastery', description: 'Choose two spells.', automation: { type: 'spell_mastery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText('Spell Mastery:'));

    await waitFor(() => {
      expect(executeHandler).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
  });
});

describe('CharSpecialActions - non-interactive actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  it('renders action without automation but does not make it clickable', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Arcane Recovery', description: 'Recover spell slots.', automation: null },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    expect(screen.getByText('Arcane Recovery:')).toBeInTheDocument();
    expect(screen.getByText('Recover spell slots.')).toBeInTheDocument();

    // The action text should not be clickable (no automation = not interactive)
    const actionElement = screen.getByText('Arcane Recovery:');
    expect(actionElement).not.toHaveClass('clickable');
  });
});

describe('CharSpecialActions - SignatureSpells Confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(k => delete mockRuntimeStore[k]);
  });

  it('shows popup and closes modal on signature spells confirm', async () => {
    const mockSetPopupHtml = vi.fn();
    const { onSignatureSpellsSelected } = await import('../../services/automation/handlers/class-wizard/signatureSpellsHandler.js');

    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Signature Spells', description: 'Choose two signature spells.', automation: { type: 'signature_spells' } },
      ],
    });

    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'signatureSpells',
      payload: {
        action: { name: 'Signature Spells', automation: { type: 'signature_spells' } },
        playerStats: basePlayerStats,
        campaignName: 'test',
        spellOptions: ['Fireball', 'Haste', 'Detect Magic'],
      },
    });

    onSignatureSpellsSelected.mockResolvedValue({
      type: 'popup',
      payload: { name: 'Signature Spells', description: 'Spells added to signature list.' },
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText('Signature Spells:'));

    await waitFor(() => {
      expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockSetPopupHtml).toHaveBeenCalled();
    });

    const popupCall = mockSetPopupHtml.mock.calls[0][0];
    expect(popupCall).toContain('Signature Spells');
    expect(popupCall).toContain('Spells added to signature list.');
    expect(screen.queryByTestId('signature-spells-modal')).not.toBeInTheDocument();
  });

  it('does not open modal when cannotAct is true', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Signature Spells', description: 'Choose two signature spells.', automation: { type: 'signature_spells' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

    fireEvent.click(screen.getByText('Signature Spells:'));

    await waitFor(() => {
      expect(screen.queryByTestId('signature-spells-modal')).not.toBeInTheDocument();
    });

    expect(executeHandler).not.toHaveBeenCalled();
  });
});

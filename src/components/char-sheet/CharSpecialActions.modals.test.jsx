// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpecialActions from './CharSpecialActions.jsx';

// Mock executeHandler
vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

// Mock automation service — comprehensive list matching the real implementation
vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn((action) => !!(action?.automation)),
  isInteractiveAutomation: vi.fn((action) => {
    if (!action?.automation) return false;
    const auto = Array.isArray(action.automation) ? action.automation[0] : action.automation;
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'defensive_tactics', 'hunter_prey', 'animal_aspect', 'passive_rule', 'temp_hp_buff', 'brew_poison', 'stride_of_the_elements', 'elemental_epitome', 'destructive_stride', 'quivering_palm', 'steps_of_the_fey_taunt', 'hurl_through_hell', 'clairvoyant_combatant', 'portent', 'boon_of_energy_resistance', 'generic', 'silent', 'resource_pool', 'natural_recovery', 'circle_of_the_land', 'elemental_affinity', 'wild_magic_surge', 'stride_of_elements', 'celestial_resilience', 'fiendish_resilience', 'heroic_inspiration_buff', 'magical_cunning', 'tactical_mind', 'concentration_bonus_attack', 'font_of_inspiration', 'combat_stance', 'damage_type_choice', 'wild_magic_tamed', 'feats_of_chaos', 'initiative_action', 'magical_cunning', 'bewitching_magic', 'lucky_point', 'telekinetic_shove'];
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
    <div data-testid="stride-of-elements-modal">
      <span>{action?.name || 'Stride of the Elements'}</span>
      <button onClick={() => onConfirm && onConfirm('Ice Walk', {})}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ElementalEpitomeModal
vi.mock('./modals/ElementalEpitomeModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, currentResistance: _cr, onConfirm, onClose }) => (
    <div data-testid="elemental-epitome-modal">
      <span>{action?.name || 'Elemental Epitome'}</span>
      <button onClick={() => onConfirm && onConfirm({ description: 'Activated.' })}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock DestructiveStrideModal
vi.mock('./modals/DestructiveStrideModal.jsx', () => ({
  default: ({ action, playerStats: _ps, campaignName: _cn, onConfirm, onClose }) => (
    <div data-testid="destructive-stride-modal">
      <span>{action?.name || 'Destructive Stride'}</span>
      <button onClick={() => onConfirm && onConfirm({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck.' } })}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock SecondaryTargetModal
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: ({ title, onTargetSelected, onSkip, targets }) => (
    <div data-testid="secondary-target-modal">
      <span>{title}</span>
      {targets.map((t, i) => (
        <button key={i} onClick={() => onTargetSelected(t.name)}>{t.name}</button>
      ))}
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
    <div data-testid="steps-of-fey-taunt-modal">
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

// Mock CreatureSelectionModal
vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: ({ title, confirmLabel, description, onConfirm, onSkip, targets, note }) => (
    <div data-testid="creature-selection-modal">
      <span>{title}</span>
      {description && <p>{description}</p>}
      {note && <p>{note}</p>}
      <button onClick={() => onConfirm && onConfirm(targets.map(t => t.name))}>{confirmLabel}</button>
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
  default: ({ onConfirm, onClose, action: _action, playerStats: _ps, campaignName: _cn }) => (
    <div data-testid="multi-resistance-modal">
      <span>Multi Resistance</span>
      <button onClick={() => onConfirm && onConfirm(['Fire'])}>Confirm</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock CelestialResilienceModal
vi.mock('./modals/CelestialResilienceModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="celestial-resilience-modal">
      <span>Celestial Resilience</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock FiendishResilienceModal
vi.mock('./modals/FiendishResilienceModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="fiendish-resilience-modal">
      <span>Fiendish Resilience</span>
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
  loadFightingStyles: vi.fn(() => Promise.resolve([])),
}));

// Mock the handler functions
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

// Mock runtime state
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  useRuntimeValue: vi.fn(() => null),
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

// Mock handlers
vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  applyTargetChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Destructive Stride', description: 'Struck.' } })),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/handlers/class-warlock/tempTeleportHandler.js', () => ({
  confirmTeleport: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Moonlight Step', description: 'Teleported.' } })),
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

vi.mock('../../services/automation/handlers/class-wizard/portentHandler.js', () => ({
  applyPortentChoice: vi.fn(() => Promise.resolve({ type: 'popup', payload: { name: 'Portent', description: 'Die applied.' } })),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));

// Import mocked modules
import { executeHandler } from '../../services/automation/index.js';
import { isInteractiveAutomation } from '../../services/combat/automation/automationService.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';

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

function createSpecialAction(name, automation) {
  return { name, description: `${name} description.`, automation };
}

const modalTests = [
  {
    name: 'TeleportModal',
    modalName: 'teleport',
    actionName: 'Blink Steps',
    automation: { type: 'teleport' },
    payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
    testId: 'teleport-modal',
  },
  {
    name: 'SignatureSpellsModal',
    modalName: 'signatureSpells',
    actionName: 'Signature Spells',
    automation: { type: 'signature_spells' },
    payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test', level3Options: ['Fireball', 'Haste'] },
    testId: 'signature-spells-modal',
  },
  {
    name: 'SpellMasteryModal',
    modalName: 'spellMastery',
    actionName: 'Spell Mastery',
    automation: { type: 'spell_mastery' },
    payload: { action: { name: 'Spell Mastery' }, playerStats: basePlayerStats, campaignName: 'test', levelOptions: ['Mage Armor', 'Shield'] },
    testId: 'spell-mastery-modal',
  },
  {
    name: 'SavantModal',
    modalName: 'EvocationSavant',
    actionName: 'Evocation Savant',
    automation: { type: 'passive_rule', effect: 'evocation_savant' },
    payload: { action: { name: 'Evocation Savant' }, playerStats: basePlayerStats, campaignName: 'test', school: 'Evocation', spellOptions: ['Shocking Burst', 'Flaming Burst'] },
    testId: 'evocation-savant-modal',
  },
  {
    name: 'WeaponKindMasteryModal',
    modalName: 'weaponKindMastery',
    actionName: 'Weapon Kind Mastery',
    automation: { type: 'weapon_kind_mastery' },
    payload: { action: { name: 'Weapon Kind Mastery' } },
    testId: 'weapon-kind-mastery-modal',
  },
  {
    name: 'WeaponMasteryChoiceModal',
    modalName: 'weaponMasteryChoice',
    actionName: 'Weapon Mastery',
    automation: { type: 'weapon_mastery_choice' },
    payload: { action: { name: 'Weapon Mastery' } },
    testId: 'weapon-mastery-choice-modal',
  },
  {
    name: 'ResourcePoolModal',
    modalName: 'resourcePool',
    actionName: 'Resource Pool',
    automation: { type: 'resource_pool' },
    payload: { automation: { type: 'resource_pool' } },
    testId: 'resource-pool-modal',
  },
  {
    name: 'NaturalRecoveryModal',
    modalName: 'naturalRecovery',
    actionName: 'Natural Recovery',
    automation: { type: 'natural_recovery' },
    payload: {},
    testId: 'natural-recovery-modal',
  },
  {
    name: 'CircleOfTheLandSpellsModal',
    modalName: 'circleOfTheLandSpells',
    actionName: 'Circle of the Land',
    automation: { type: 'circle_of_the_land' },
    payload: {},
    testId: 'circle-of-the-land-modal',
  },
  {
    name: 'ElementalAffinityModal',
    modalName: 'elementalAffinity',
    actionName: 'Elemental Affinity',
    automation: { type: 'elemental_affinity' },
    payload: { action: { name: 'Elemental Affinity' } },
    testId: 'elemental-affinity-modal',
  },
  {
    name: 'WildMagicSurgeModal',
    modalName: 'wildMagicSurge',
    actionName: 'Wild Magic Surge',
    automation: { type: 'wild_magic_surge' },
    payload: {},
    testId: 'wild-magic-surge-modal',
  },
  {
    name: 'StrideOfTheElementsModal',
    modalName: 'strideOfTheElements',
    actionName: 'Stride of the Elements',
    automation: { type: 'stride_of_elements' },
    payload: { action: { name: 'Stride of the Elements' } },
    testId: 'stride-of-elements-modal',
  },
  {
    name: 'ElementalEpitomeModal',
    modalName: 'elementalEpitome',
    actionName: 'Elemental Epitome',
    automation: { type: 'elemental_epitome' },
    payload: { action: { name: 'Elemental Epitome' } },
    testId: 'elemental-epitome-modal',
  },
  {
    name: 'DestructiveStrideModal',
    modalName: 'destructiveStride',
    actionName: 'Destructive Stride',
    automation: { type: 'destructive_stride' },
    payload: { action: { name: 'Destructive Stride' } },
    testId: 'destructive-stride-modal',
  },
  {
    name: 'QuiveringPalmModal',
    modalName: 'quiveringPalm',
    actionName: 'Quivering Palm',
    automation: { type: 'quivering_palm' },
    payload: {},
    testId: 'quivering-palm-modal',
  },
  {
    name: 'StepsOfTheFeyTauntModal',
    modalName: 'stepsOfTheFeyTaunt',
    actionName: 'Steps of the Fey Taunt',
    automation: { type: 'steps_of_the_fey_taunt' },
    payload: {},
    testId: 'steps-of-fey-taunt-modal',
  },
  {
    name: 'HurlThroughHellModal',
    modalName: 'hurlThroughHell',
    actionName: 'Hurl Through Hell',
    automation: { type: 'hurl_through_hell' },
    payload: {},
    testId: 'hurl-through-hell-modal',
  },
  {
    name: 'ClairvoyantCombatantModal',
    modalName: 'clairvoyantCombatant',
    actionName: 'Clairvoyant Combatant',
    automation: { type: 'clairvoyant_combatant' },
    payload: {},
    testId: 'clairvoyant-combatant-modal',
  },
  {
    name: 'FiendishResilienceModal',
    modalName: 'fiendishResilience',
    actionName: 'Fiendish Resilience',
    automation: { type: 'fiendish_resilience' },
    payload: { action: { name: 'Fiendish Resilience' }, playerStats: basePlayerStats, campaignName: 'test' },
    testId: 'single-resistance-modal',
  },
  {
    name: 'MultiResistanceSelectionModal',
    modalName: 'boonOfEnergyResistance',
    actionName: 'Boon of Energy',
    automation: { type: 'boon_of_energy_resistance' },
    payload: { action: { name: 'Boon of Energy' }, damageTypes: ['Fire', 'Cold', 'Lightning'], existingTypes: [], maxSelections: 2, playerStats: basePlayerStats, campaignName: 'test' },
    testId: 'multi-resistance-modal',
  },
];

describe('CharSpecialActions - Modal Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('executeHandler invocation', () => {
    it.each(modalTests)(
      'calls executeHandler with the action object when clicking $name',
      async ({ actionName, automation, testId: _testId }) => {
        executeHandler.mockResolvedValue({
          type: 'modal',
          modalName: automation.type === 'passive_rule' ? `${automation.effect}Savant` : `${automation.type}s`,
          payload: {},
        });

        const playerStats = createPlayerStats({
          specialActions: [
            createSpecialAction(actionName, automation),
          ],
        });
        render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

        fireEvent.click(screen.getAllByText(new RegExp(actionName))[0]);

        await waitFor(() => {
          expect(executeHandler).toHaveBeenCalledWith(
            expect.objectContaining({ name: actionName, automation }),
            expect.any(Object),
            'test',
            undefined,
            undefined
          );
        });
      },
    );

    it('does not call executeHandler when cannotAct is true', async () => {
      executeHandler.mockResolvedValue({ type: 'popup', payload: { name: 'Should not fire' } });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Blocked Action', { type: 'teleport' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getAllByText(/Blocked Action/)[0]);

      await waitFor(() => {
        expect(executeHandler).not.toHaveBeenCalled();
      });
    });

    it('does not call executeHandler when action has no automation', async () => {
      executeHandler.mockResolvedValue({ type: 'popup', payload: { name: 'Should not fire' } });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Plain Action', description: 'No automation here.' },
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Plain Action/)[0]);

      await waitFor(() => {
        expect(executeHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('modal rendering from executeHandler results', () => {
    it.each(modalTests)(
      'renders $name modal when executeHandler returns $modalName',
      async ({ modalName, actionName, automation, payload, testId }) => {
        executeHandler.mockResolvedValue({
          type: 'modal',
          modalName,
          payload,
        });

        const playerStats = createPlayerStats({
          specialActions: [
            createSpecialAction(actionName, automation),
          ],
        });
        render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

        fireEvent.click(screen.getAllByText(new RegExp(actionName))[0]);

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeInTheDocument();
        });
      },
    );
  });

  describe('popup result handling', () => {
    it('displays a popup when executeHandler returns a popup result', async () => {
      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'popup',
        payload: { name: 'Test Popup', description: 'Action completed.' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Popup Action', { type: 'generic' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Popup Action/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('Test Popup');
        expect(capturedPopup).toContain('Action completed.');
      });
    });

    it('displays a popup with fallback name when payload has no name', async () => {
      let capturedPopup = null;
      const mockSetPopupHtml = (html) => { capturedPopup = html; };
      vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'popup',
        payload: { description: 'No name here.' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Fallback Name Action', { type: 'generic' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Fallback Name Action/)[0]);

      await waitFor(() => {
        expect(capturedPopup).toContain('Fallback Name Action');
      });
    });
  });

  describe('null result handling', () => {
    it('handles executeHandler returning null without errors', async () => {
      executeHandler.mockResolvedValue(null);

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Silent Action', { type: 'generic' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Silent Action/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalled();
        expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('action interactivity', () => {
    it.each([
      { automation: { type: 'teleport' }, label: 'teleport type' },
      { automation: { type: 'signature_spells' }, label: 'signature_spells type' },
      { automation: { type: 'spell_mastery' }, label: 'spell_mastery type' },
      { automation: { type: 'combat_superiority' }, label: 'combat_superiority type' },
      { automation: { type: 'weapon_kind_mastery' }, label: 'weapon_kind_mastery type' },
      { automation: { type: 'weapon_mastery_choice' }, label: 'weapon_mastery_choice type' },
      { automation: { type: 'resource_pool' }, label: 'resource_pool type' },
      { automation: { type: 'natural_recovery' }, label: 'natural_recovery type' },
      { automation: { type: 'circle_of_the_land' }, label: 'circle_of_the_land type' },
      { automation: { type: 'elemental_affinity' }, label: 'elemental_affinity type' },
      { automation: { type: 'wild_magic_surge' }, label: 'wild_magic_surge type' },
      { automation: { type: 'stride_of_elements' }, label: 'stride_of_elements type' },
      { automation: { type: 'elemental_epitome' }, label: 'elemental_epitome type' },
      { automation: { type: 'destructive_stride' }, label: 'destructive_stride type' },
      { automation: { type: 'quivering_palm' }, label: 'quivering_palm type' },
      { automation: { type: 'steps_of_the_fey_taunt' }, label: 'steps_of_the_fey_taunt type' },
      { automation: { type: 'hurl_through_hell' }, label: 'hurl_through_hell type' },
      { automation: { type: 'clairvoyant_combatant' }, label: 'clairvoyant_combatant type' },
      { automation: { type: 'passive_rule', effect: 'evocation_savant' }, label: 'evocation_savant passive_rule' },
      { automation: { type: 'passive_rule', effect: 'abjuration_savant' }, label: 'abjuration_savant passive_rule' },
      { automation: { type: 'passive_rule', effect: 'divination_savant' }, label: 'divination_savant passive_rule' },
      { automation: { type: 'passive_rule', effect: 'illusion_savant' }, label: 'illusion_savant passive_rule' },
      { automation: { type: 'boon_of_energy_resistance' }, label: 'boon_of_energy_resistance type' },
      { automation: { type: 'celestial_resilience' }, label: 'celestial_resilience type' },
      { automation: { type: 'fiendish_resilience' }, label: 'fiendish_resilience type' },
    ])('marks action as clickable for $label automation', async ({ automation }) => {
      const isInteractive = isInteractiveAutomation(createSpecialAction('Test Action', automation));
      expect(isInteractive).toBe(true);
    });

    it.each([
      { automation: undefined, label: 'no automation' },
      { automation: null, label: 'null automation' },
      { automation: { type: 'damage_bonus' }, label: 'non-interactive damage_bonus' },
    ])('does not mark action as clickable for $label', async ({ automation }) => {
      const isInteractive = isInteractiveAutomation(createSpecialAction('Test Action', automation));
      expect(isInteractive).toBe(false);
    });
  });

  describe('Savant modal fuzzy matching', () => {
    it.each([
      { school: 'Evocation', modalName: 'EvocationSavant', testId: 'evocation-savant-modal' },
      { school: 'Abjuration', modalName: 'AbjurationSavant', testId: 'abjuration-savant-modal' },
      { school: 'Divination', modalName: 'DivinationSavant', testId: 'divination-savant-modal' },
      { school: 'Illusion', modalName: 'IllusionSavant', testId: 'illusion-savant-modal' },
    ])('renders savant modal for $school when modalName is $modalName', async ({ school, modalName }) => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName,
        payload: { action: { name: `${school} Savant` }, playerStats: basePlayerStats, campaignName: 'test', school, spellOptions: ['Shield', 'Mage Armor'] },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction(`${school} Savant`, { type: 'passive_rule', effect: `${school.toLowerCase()}_savant` }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(new RegExp(`${school} Savant`))[0]);

      await waitFor(() => {
        expect(screen.getByTestId(`${school.toLowerCase()}-savant-modal`)).toBeInTheDocument();
      });
    });
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpecialActions from './CharSpecialActions.jsx';

// Mock executeHandler
vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

// Mock automation service
vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn((action) => !!(action?.automation)),
  isInteractiveAutomation: vi.fn((action) => {
    if (!action?.automation) return false;
    const auto = Array.isArray(action.automation) ? action.automation[0] : action.automation;
    const interactiveTypes = ['teleport', 'signature_spells', 'spell_mastery', 'combat_superiority', 'weapon_kind_mastery', 'weapon_mastery_choice', 'resource_pool', 'natural_recovery', 'circle_of_the_land', 'elemental_affinity', 'wild_magic_surge', 'stride_of_elements', 'elemental_epitome', 'destructive_stride', 'quivering_palm', 'steps_of_the_fey_taunt', 'hurl_through_hell', 'clairvoyant_combatant', 'passive_rule'];
    if (auto.type === 'passive_rule') {
      const interactiveEffects = ['abjuration_savant', 'divination_savant', 'evocation_savant', 'illusion_savant'];
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
  default: ({ _payload, onConfirm, _onReopenSelection, _onClose }) => (
    <div data-testid="combat-superiority-modal">
      <span>Combat Superiority</span>
      <button onClick={() => onConfirm([], null)}>Close</button>
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
  default: ({ title, onConfirm, onSkip, targets, confirmLabel, description, note }) => (
    <div data-testid={`creature-selection-modal`}>
      <span>{title}</span>
      <p>{description}</p>
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
      <span>Resistance Selection</span>
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

describe('CharSpecialActions - Modal Rendering via executeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createSpecialAction(name, automation) {
    return { name, description: `${name} description.`, automation };
  }

  describe('modal rendering from executeHandler results', () => {
    it('renders TeleportModal when executeHandler returns teleport modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'teleport',
        payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Blink Steps', { type: 'teleport' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Blink Steps/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('teleport-modal')).toBeInTheDocument();
      });
    });

    it('renders SignatureSpellsModal when executeHandler returns signatureSpells modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'signatureSpells',
        payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test', level3Options: ['Fireball', 'Haste'] },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Signature Spells', { type: 'signature_spells' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Signature Spells/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
      });
    });

    it('renders SpellMasteryModal when executeHandler returns spellMastery modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'spellMastery',
        payload: { action: { name: 'Spell Mastery' }, playerStats: basePlayerStats, campaignName: 'test', levelOptions: ['Mage Armor', 'Shield'] },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Spell Mastery', { type: 'spell_mastery' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Spell Mastery/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
      });
    });

    it('renders SavantModal when executeHandler returns Savant modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'EvocationSavant',
        payload: { action: { name: 'Evocation Savant' }, playerStats: basePlayerStats, campaignName: 'test', school: 'Evocation', spellOptions: ['Shocking Burst', 'Flaming Burst'] },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Evocation Savant', { type: 'passive_rule', effect: 'evocation_savant' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Evocation Savant/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('evocation-savant-modal')).toBeInTheDocument();
      });
    });

    // CombatSuperiorityModal state is managed by useCombatSuperiorityModal hook, tested elsewhere

    it('renders WeaponKindMasteryModal when executeHandler returns weaponKindMastery modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'weaponKindMastery',
        payload: { action: { name: 'Weapon Kind Mastery' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Weapon Kind Mastery', { type: 'weapon_kind_mastery' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Weapon Kind Mastery/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('weapon-kind-mastery-modal')).toBeInTheDocument();
      });
    });

    it('renders WeaponMasteryChoiceModal when executeHandler returns weaponMasteryChoice modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'weaponMasteryChoice',
        payload: { action: { name: 'Weapon Mastery' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Weapon Mastery', { type: 'weapon_mastery_choice' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Weapon Mastery/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('weapon-mastery-choice-modal')).toBeInTheDocument();
      });
    });

    it('renders ResourcePoolModal when executeHandler returns resourcePool modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'resourcePool',
        payload: { automation: { type: 'resource_pool' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Resource Pool', { type: 'resource_pool' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Resource Pool/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('resource-pool-modal')).toBeInTheDocument();
      });
    });

    it('renders NaturalRecoveryModal when executeHandler returns naturalRecovery modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'naturalRecovery',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Natural Recovery', { type: 'natural_recovery' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Natural Recovery/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('natural-recovery-modal')).toBeInTheDocument();
      });
    });

    it('renders CircleOfTheLandSpellsModal when executeHandler returns circleOfTheLandSpells modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'circleOfTheLandSpells',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Circle of the Land', { type: 'circle_of_the_land' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Circle of the Land/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('circle-of-the-land-modal')).toBeInTheDocument();
      });
    });

    it('renders ElementalAffinityModal when executeHandler returns elementalAffinity modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'elementalAffinity',
        payload: { action: { name: 'Elemental Affinity' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Elemental Affinity', { type: 'elemental_affinity' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Elemental Affinity/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('elemental-affinity-modal')).toBeInTheDocument();
      });
    });

    it('renders WildMagicSurgeModal when executeHandler returns wildMagicSurge modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'wildMagicSurge',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Wild Magic Surge', { type: 'wild_magic_surge' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Wild Magic Surge/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
      });
    });

    it('renders StrideOfTheElementsModal when executeHandler returns strideOfTheElements modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'strideOfTheElements',
        payload: { action: { name: 'Stride of the Elements' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Stride of the Elements', { type: 'stride_of_elements' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Stride of the Elements/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('stride-of-elements-modal')).toBeInTheDocument();
      });
    });

    it('renders ElementalEpitomeModal when executeHandler returns elementalEpitome modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'elementalEpitome',
        payload: { action: { name: 'Elemental Epitome' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Elemental Epitome', { type: 'elemental_epitome' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Elemental Epitome/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('elemental-epitome-modal')).toBeInTheDocument();
      });
    });

    // DestructiveStride modal chain tested in automationClickHandlers test

    it('renders QuiveringPalmModal when executeHandler returns quiveringPalm modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'quiveringPalm',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Quivering Palm', { type: 'quivering_palm' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Quivering Palm/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('quivering-palm-modal')).toBeInTheDocument();
      });
    });

    it('renders StepsOfTheFeyTauntModal when executeHandler returns stepsOfTheFeyTaunt modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'stepsOfTheFeyTaunt',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Steps of the Fey Taunt', { type: 'steps_of_the_fey_taunt' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Steps of the Fey Taunt/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('steps-of-fey-taunt-modal')).toBeInTheDocument();
      });
    });

    it('renders HurlThroughHellModal when executeHandler returns hurlThroughHell modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'hurlThroughHell',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Hurl Through Hell', { type: 'hurl_through_hell' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Hurl Through Hell/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('hurl-through-hell-modal')).toBeInTheDocument();
      });
    });

    it('renders ClairvoyantCombatantModal when executeHandler returns clairvoyantCombatant modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'clairvoyantCombatant',
        payload: {},
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Clairvoyant Combatant', { type: 'clairvoyant_combatant' }),
        ],
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Clairvoyant Combatant/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('clairvoyant-combatant-modal')).toBeInTheDocument();
      });
    });
  });
});

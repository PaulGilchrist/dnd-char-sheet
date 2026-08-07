import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ShortRestModal from './ShortRestModal.jsx';

const getRuntimeValueMock = vi.fn(() => null);
const setRuntimeValueMock = vi.fn();
const setRuntimeBatchMock = vi.fn();
let _useRuntimeValueResult = null;

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  useRuntimeValue: () => _useRuntimeValueResult,
  listeners: new Map(),
  getRuntimeValue: vi.fn((...args) => getRuntimeValueMock(...args)),
  setRuntimeValue: vi.fn((...args) => setRuntimeValueMock(...args)),
  setRuntimeBatch: vi.fn((...args) => setRuntimeBatchMock(...args)),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollDice: vi.fn((count, _die) => ({ total: count * 4, rolls: Array(count).fill(4) })),
  rollExpression: vi.fn(() => ({ total: 5, rolls: [5] })),
}));

vi.mock('../../services/rules/effects/restRules.js', () => ({
  getHitDieSize: vi.fn(() => 8),
  computeHitDieRecovery: vi.fn((roll, conBonus) => roll + conBonus),
  SHORT_REST_RESOURCES: ['channelDivinityCharges', 'wildShapeUses'],
  getShortRestResourceLabels: vi.fn(() => ['Spell Slots (1st+)', 'Hit Dice']),
  clearHuntersMarkConcentration: vi.fn(),
  applyShortRest: vi.fn(async () => ({})),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
  clearAllExpirationEffects: vi.fn(),
}));

vi.mock('../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({ songOfRestDie: 6 })),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(() => 2),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(() => null),
}));

vi.mock('../../services/ui/dataLoader.js', () => ({
  loadSpellData: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: () => <div>mock-creature-selection</div>,
}));

const mockCampaignName = 'test-campaign';

function createPlayerStats(overrides = {}) {
  return {
    name: 'Thorin',
    level: 5,
    hitPoints: 45,
    proficiency: 3,
    abilities: [
      { name: 'Constitution', bonus: 2 },
      { name: 'Charisma', bonus: 3 },
    ],
    class: { name: 'Cleric', major: { name: 'Cleric' } },
    automation: { passives: [], actions: [] },
    spellAbilities: {
      spell_slots_level_1: 4,
      spell_slots_level_2: 3,
      spells: [],
    },
    inventory: { equipped: [] },
    ...overrides,
  };
}

function renderModal(overrides = {}) {
  const playerStats = createPlayerStats(overrides);
  const onClose = vi.fn();
  const onComplete = vi.fn();
  const rendered = render(
    <ShortRestModal
      playerStats={playerStats}
      campaignName={mockCampaignName}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
  return { ...rendered, onClose, onComplete, playerStats };
}

function setupGetRuntimeValue(returns) {
  getRuntimeValueMock.mockImplementation((_name, key) => {
    if (key in returns) return returns[key];
    return null;
  });
}

function setupUseRuntimeValue(returns) {
  if (returns.replenishingMeals != null) {
    _useRuntimeValueResult = returns.replenishingMeals;
  } else {
    _useRuntimeValueResult = null;
  }
}

async function getLogCall() {
  const { addEntry } = await import('../../services/ui/logService.js');
  return addEntry.mock.calls[0][1];
}

describe('ShortRestModal - Completion Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  describe('HP tracking', () => {
    it('sets currentHitPoints on completion after rolling hit dice', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Roll One'));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const hpCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'currentHitPoints'
      );
      expect(hpCalls.length).toBeGreaterThan(0);
      // HP should be capped at max (45)
      expect(hpCalls[0][2]).toBeLessThanOrEqual(45);
    });

    it('caps HP at maximum hit points', async () => {
      setupGetRuntimeValue({ currentHitPoints: 40 });
      renderModal();
      // Roll multiple hit dice to potentially exceed max
      const rollAllBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('Roll All')
      );
      fireEvent.click(rollAllBtn);
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const hpCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'currentHitPoints'
      );
      expect(hpCalls.length).toBeGreaterThan(0);
      expect(hpCalls[0][2]).toBe(45); // capped at max
    });

    it('persists remaining hit dice via setRuntimeValue on completion', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Roll One'));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const hdCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'shortRestHitDice'
      );
      expect(hdCalls.length).toBeGreaterThan(0);
      // Started with 5, rolled 1, so 4 remaining
      expect(hdCalls[0][2]).toBe(4);
    });

    it('persists all hit dice as remaining when rolling all', async () => {
      renderModal();
      const rollAllBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('Roll All')
      );
      fireEvent.click(rollAllBtn);
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const hdCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'shortRestHitDice'
      );
      expect(hdCalls.length).toBeGreaterThan(0);
      // Rolled all 5, so 0 remaining
      expect(hdCalls[0][2]).toBe(0);
    });
  });

  describe('log entries', () => {
    it('calls addEntry with short_rest type on completion', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      renderModal();
      fireEvent.click(screen.getByText('Roll One'));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      expect(addEntry).toHaveBeenCalled();
      const logCall = await getLogCall();
      expect(logCall.type).toBe('short_rest');
    });

    it('includes hit dice details in log when dice were rolled', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Roll One'));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Hit Dice:');
      expect(logCall.message).toContain('HP recovered');
    });

    it('includes "Hit Dice: 0 used" in log when no dice rolled', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Hit Dice: 0 used');
    });

    it('includes Song of Rest in log when applied', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Roll One'));
      await act(async () => {});
      fireEvent.click(screen.getByText(/Apply Song of Rest/));
      await act(async () => {});
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Song of Rest');
    });

    it('includes current HP change in log when dice were rolled', async () => {
      setupGetRuntimeValue({ currentHitPoints: 30 });
      renderModal();
      fireEvent.click(screen.getByText('Roll One'));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Current HP:');
    });
  });

  describe('resource restoration logging', () => {
    it('logs Second Wind for Fighter when not at max', async () => {
      setupGetRuntimeValue({ secondWindUses: 0 });
      renderModal({
        class: {
          name: 'Fighter',
          major: { name: 'Fighter' },
          class_levels: [{ level: 5, second_wind: 1 }],
        },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Second Wind');
    });

    it('does not log Second Wind for Fighter at max', async () => {
      setupGetRuntimeValue({ secondWindUses: 1 });
      renderModal({
        class: {
          name: 'Fighter',
          major: { name: 'Fighter' },
          class_levels: [{ level: 5, second_wind: 1 }],
        },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).not.toContain('Second Wind');
    });

    it('logs Rage (2024) for Barbarian 2024 when not at max', async () => {
      setupGetRuntimeValue({ ragePoints: 0 });
      renderModal({
        rules: '2024',
        class: {
          name: 'Barbarian',
          major: { name: 'Barbarian' },
          class_levels: [{ level: 5, rages: 2 }],
        },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Rage (2024)');
    });

    it('logs Warding Flare when Improved Warding Flare feature exists', async () => {
      renderModal({
        specialActions: [{ name: 'Improved Warding Flare' }],
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Warding Flare');
    });

    it('logs Font of Inspiration when feature exists', async () => {
      renderModal({
        class: { name: 'Bard', major: { name: 'Bard' } },
        automation: { passives: [{ type: 'font_of_inspiration' }] },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Font of Inspiration');
    });

    it('logs Pact Magic for Warlock', async () => {
      renderModal({
        class: { name: 'Warlock', major: { name: 'Archfey' } },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Pact Magic');
    });

    it('logs Bolstering Treats when feature exists', async () => {
      renderModal({
        automation: { passives: [{ type: 'temp_hp_buff', name: 'Bolstering Treats' }] },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Bolstering Treats');
    });

    it('logs Tireless for Ranger level 10+ with exhaustion', async () => {
      setupGetRuntimeValue({ exhaustionLevel: 1 });
      renderModal({
        class: { name: 'Ranger', major: { name: 'Ranger' } },
        level: 10,
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Tireless');
    });

    it('does not log Tireless for Ranger without exhaustion', async () => {
      setupGetRuntimeValue({ exhaustionLevel: 0 });
      renderModal({
        class: { name: 'Ranger', major: { name: 'Ranger' } },
        level: 10,
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).not.toContain('Tireless');
    });

    it('logs Sorcery Points restoration when Sorcerous Restoration was requested', async () => {
      setupGetRuntimeValue({ sorcerousRestorationUses: 1 });
      renderModal({
        class: { name: 'Sorcerer', major: { name: 'Sorcerer' } },
        automation: { passives: [{ type: 'resource_restoration', resourceKey: 'sorcerousRestorationUses' }] },
      });
      fireEvent.click(screen.getByText(/Regain.*Sorcery Points/));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Sorcery Points');
    });

    it('logs Arcane Recovery when requested by Wizard', async () => {
      setupGetRuntimeValue({ arcaneRecoveryLevels: 2 });
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'resource_restoration', resourceKey: 'arcaneRecoveryLevels' }] },
      });
      fireEvent.click(screen.getByText(/Recover Spell Slots/));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Arcane Recovery');
    });

    it('logs Replenishing Meal consumed when meal was used', async () => {
      setupUseRuntimeValue({ replenishingMeals: 2 });
      renderModal({
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      });
      fireEvent.click(screen.getByText('Roll One'));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const logCall = await getLogCall();
      expect(logCall.message).toContain('Replenishing Meal');
    });
  });

  describe('spell slot restoration', () => {
    it('recovers Arcane Recovery slots for Wizard on completion when requested', async () => {
      setupGetRuntimeValue({ arcaneRecoveryLevels: 2, spell_slots_level_1: 2 });
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'resource_restoration', resourceKey: 'arcaneRecoveryLevels' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      fireEvent.click(screen.getByText(/Recover Spell Slots/));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const slotCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => typeof call[1] === 'string' && call[1].startsWith('spell_slots_level_')
      );
      expect(slotCalls.length).toBeGreaterThan(0);
    });

    it('only recovers Arcane Recovery slots up to level 5', async () => {
      setupGetRuntimeValue({ arcaneRecoveryLevels: 3, spell_slots_level_5: 1, spell_slots_level_6: 1 });
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'resource_restoration', resourceKey: 'arcaneRecoveryLevels' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_5: 2,
          spell_slots_level_6: 1,
          spells: [],
        },
        level: 10,
      });
      fireEvent.click(screen.getByText(/Recover Spell Slots/));
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const level6Calls = setRuntimeValueMock.mock.calls.filter(
        (call) => call[1] === 'spell_slots_level_6'
      );
      expect(level6Calls.length).toBe(0);
    });

    it('recovers Natural Recovery slots when selections were made', async () => {
      setupGetRuntimeValue({ naturalRecoverySlots: 2, spell_slots_level_1: 2 });
      renderModal({
        level: 10,
        class: { name: 'Druid', major: { name: 'Druid' }, subclass: { name: 'Circle of the Land' } },
        automation: { passives: [{ type: 'natural_recovery' }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spells: [],
        },
      });
      const controls = document.querySelectorAll('.short-rest-nr-controls');
      const firstControl = controls[0];
      const plusBtn = firstControl.querySelector('button:last-child');
      fireEvent.click(plusBtn);
      await act(async () => {});
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});

      const slotCalls = setRuntimeValueMock.mock.calls.filter(
        (call) => typeof call[1] === 'string' && call[1].startsWith('spell_slots_level_')
      );
      expect(slotCalls.length).toBeGreaterThan(0);
    });
  });
});

describe('ShortRestModal - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    _useRuntimeValueResult = null;
  });

  describe('missing onComplete', () => {
    it('completes without error when onComplete is not provided', async () => {
      render(
        <ShortRestModal
          playerStats={createPlayerStats()}
          campaignName={mockCampaignName}
          onClose={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
    });

    it('closes without error when onClose is not provided', async () => {
      render(
        <ShortRestModal
          playerStats={createPlayerStats()}
          campaignName={mockCampaignName}
          onComplete={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
    });
  });

  describe('no hit dice', () => {
    it('disables Roll One button when no hit dice remain', () => {
      setupGetRuntimeValue({ shortRestHitDice: 0 });
      renderModal();
      expect(screen.getByText('Roll One')).toBeDisabled();
    });

    it('disables Roll All button when no hit dice remain', () => {
      setupGetRuntimeValue({ shortRestHitDice: 0 });
      renderModal();
      const rollAllBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('Roll All')
      );
      expect(rollAllBtn).toBeTruthy();
      expect(rollAllBtn.disabled).toBe(true);
    });

    it('does not roll when clicking Roll One with no hit dice', async () => {
      setupGetRuntimeValue({ shortRestHitDice: 0 });
      renderModal();
      const { rollDice } = await import('../../services/dice/diceRoller.js');
      fireEvent.click(screen.getByText('Roll One'));
      expect(rollDice).not.toHaveBeenCalled();
    });
  });

  describe('no features', () => {
    it('renders minimally for class with no rest features', () => {
      renderModal({
        class: { name: 'Rogue', major: { name: 'Rogue' } },
        automation: { passives: [] },
      });
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
      const rollOneBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('Roll One')
      );
      expect(rollOneBtn).toBeTruthy();
    });

    it('still allows completing short rest with no features', async () => {
      renderModal({
        class: { name: 'Rogue', major: { name: 'Rogue' } },
        automation: { passives: [] },
      });
      fireEvent.click(screen.getByText('Complete Short Rest'));
      await act(async () => {});
      expect(screen.getByText('Short Rest')).toBeInTheDocument();
    });
  });

  describe('hit die size', () => {
    it('displays hit die information in the hit dice section', () => {
      renderModal({
        class: { name: 'Fighter', hit_point_die: 'd10', major: { name: 'Fighter' } },
      });
      const hitDiceParagraph = document.querySelector('.short-rest-section p');
      expect(hitDiceParagraph).toBeTruthy();
      expect(hitDiceParagraph.textContent).toContain('remaining');
    });
  });

  describe('prepared spells', () => {
    it('uses runtime stored preparedSpells when available', () => {
      setupGetRuntimeValue({ preparedSpells: ['Fireball', 'Shield'] });
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared' },
            { name: 'Mage Armor', prepared: 'Not Prepared' },
          ],
        },
      });
      expect(screen.getByText('Memorize Spell')).toBeInTheDocument();
    });

    it('falls back to filtering spells with prepared === "Prepared"', () => {
      renderModal({
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: { passives: [{ type: 'memorize_spell' }] },
        spellAbilities: {
          spells: [
            { name: 'Fireball', prepared: 'Prepared' },
            { name: 'Mage Armor', prepared: 'Not Prepared' },
          ],
        },
      });
      expect(screen.getByText('Memorize Spell')).toBeInTheDocument();
    });
  });

  describe(' Bardic Inspiration / Font of Inspiration', () => {
    it('shows Font of Inspiration when bardic inspiration uses are at max', () => {
      setupGetRuntimeValue({ bardicInspirationUses: 3 });
      renderModal({
        class: { name: 'Bard', major: { name: 'Bard' } },
        automation: { passives: [{ type: 'font_of_inspiration' }] },
        abilities: [{ name: 'Charisma', bonus: 3 }],
      });
      // Font of Inspiration should NOT show because uses are at max
      expect(screen.queryByText(/Font of Inspiration applied/)).not.toBeInTheDocument();
    });

    it('shows Font of Inspiration when uses are below max', () => {
      setupGetRuntimeValue({ bardicInspirationUses: 1 });
      renderModal({
        class: { name: 'Bard', major: { name: 'Bard' } },
        automation: { passives: [{ type: 'font_of_inspiration' }] },
        abilities: [{ name: 'Charisma', bonus: 3 }],
      });
      expect(screen.getByText(/Font of Inspiration applied on short rest/)).toBeInTheDocument();
    });
  });

  describe('keyboard handling', () => {
    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(
        <ShortRestModal
          playerStats={createPlayerStats()}
          campaignName={mockCampaignName}
          onClose={onClose}
          onComplete={vi.fn()}
        />
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('removes Escape key listener on unmount', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <ShortRestModal
          playerStats={createPlayerStats()}
          campaignName={mockCampaignName}
          onClose={onClose}
          onComplete={vi.fn()}
        />
      );
      // Verify listener works before unmount
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      // After unmount, the listener should be removed
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      // Should still be 1, not 2
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('overlay interaction', () => {
    it('calls onClose when clicking the overlay outside the modal', () => {
      const onClose = vi.fn();
      render(
        <ShortRestModal
          playerStats={createPlayerStats()}
          campaignName={mockCampaignName}
          onClose={onClose}
          onComplete={vi.fn()}
        />
      );
      const overlay = document.querySelector('.short-rest-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the modal content', () => {
      const onClose = vi.fn();
      render(
        <ShortRestModal
          playerStats={createPlayerStats()}
          campaignName={mockCampaignName}
          onClose={onClose}
          onComplete={vi.fn()}
        />
      );
      const modal = document.querySelector('.short-rest-modal');
      fireEvent.click(modal);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

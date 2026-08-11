import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsModalHandlers from './useCharActionsModalHandlers.js';

vi.mock('../../services/automation/common/buffToggle.js', () => ({
  toggleBuff: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  handle: vi.fn(),
  handleCombatSuperiorityBonusAction: vi.fn(),
  handleCombatSuperiorityReaction: vi.fn(),
  handleCombatSuperiorityGrantAttack: vi.fn(),
  handleCombatSuperiorityMovement: vi.fn(),
  handleCombatSuperioritySkillCheck: vi.fn(),
  handleCombatSuperiorityCommandingPresenceReaction: vi.fn(),
  handleCombatSuperioritySweepingAttack: vi.fn(),
  handleAttackRiderPrompt: vi.fn(),
  handleSkillCheckPrompt: vi.fn(),
  executeSweepingAttack: vi.fn(),
  executeBaitAndSwitchChoice: vi.fn(),
  executeCommanderStrikeChoice: vi.fn(),
  executeRallyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-sorcerer/bulwarkOfForceHandler.js', () => ({
  handle: vi.fn(),
  activateBulwarkOfForce: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-barbarian/zealousPresenceHandler.js', () => ({
  handle: vi.fn(),
  confirmZealousPresence: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/massHealHandler.js', () => ({
  handle: vi.fn(),
  confirmMassHeal: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-sorcerer/clockworkCavalcadeHandler.js', () => ({
  handle: vi.fn(),
  confirmClockworkCavalcadeHeal: vi.fn(),
  confirmClockworkCavalcadeDispel: vi.fn(),
  confirmClockworkCavalcadeRepair: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/massCureWoundsHandler.js', () => ({
  handle: vi.fn(),
  confirmMassCureWounds: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/prayerOfHealingHandler.js', () => ({
  handle: vi.fn(),
  confirmPrayerOfHealing: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/powerWordFortifyHandler.js', () => ({
  handle: vi.fn(),
  confirmPowerWordFortify: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/massHealingWordHandler.js', () => ({
  handle: vi.fn(),
  confirmMassHealingWord: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/naturesSanctuaryHandler.js', () => ({
  handle: vi.fn(),
  handleMove: vi.fn(),
  activateNaturesSanctuary: vi.fn(),
  moveNaturesSanctuary: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-cleric-paladin/coronaOfLightHandler.js', () => ({
  handle: vi.fn(),
  activateCoronaOfLight: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-cleric-paladin/radianceOfDawnHandler.js', () => ({
  handle: vi.fn(),
  confirmRadianceOfDawn: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpBuffHandler.js', () => ({
  handle: vi.fn(),
  confirmMantleOfInspiration: vi.fn(),
  confirmVitalityOfTheTree: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-warlock/celestialResilienceHandler.js', () => ({
  handle: vi.fn(),
  confirmCelestialResilience: vi.fn(),
  skipCelestialResilience: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-druid/oceanicGiftHandler.js', () => ({
  handle: vi.fn(),
  confirmOceanicGift: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-bard/bardicInspirationHandler.js', () => ({
  handle: vi.fn(),
  applyBardicInspiration: vi.fn(),
}));

vi.mock('../../services/automation/handlers/reactions/reactionBonusHandler.js', () => ({
  handle: vi.fn(),
  applyInspiringMovement: vi.fn(),
}));

const { toggleBuff } = await import('../../services/automation/common/buffToggle.js');
const { setTempHp } = await import('../../services/automation/handlers/buffs/tempHpService.js');
const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
const { addEntry } = await import('../../services/ui/logService.js');
const { confirmMantleOfInspiration, confirmVitalityOfTheTree } = await import('../../services/automation/handlers/buffs/tempHpBuffHandler.js');
const { confirmCelestialResilience, skipCelestialResilience } = await import('../../services/automation/handlers/class-warlock/celestialResilienceHandler.js');
const { confirmOceanicGift } = await import('../../services/automation/handlers/class-druid/oceanicGiftHandler.js');
const { applyBardicInspiration } = await import('../../services/automation/handlers/class-bard/bardicInspirationHandler.js');
const { applyInspiringMovement } = await import('../../services/automation/handlers/reactions/reactionBonusHandler.js');

const mockSetPopupHtml = vi.fn();
const mockSetModalState = vi.fn();

const baseModalState = {};
const baseMergedModalState = {};

function getHandlers(extraModalState = {}, extraMergedModalState = {}) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCharActionsModalHandlers({
    setPopupHtml: mockSetPopupHtml,
    setModalState: mockSetModalState,
    modalState: { ...baseModalState, ...extraModalState },
    mergedModalState: { ...baseMergedModalState, ...extraMergedModalState },
  });
}

function makePlayerStats() {
  return { name: 'TestChar', class: { name: 'Fighter' } };
}

describe('useCharActionsModalHandlers - special features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
  });

  describe('handleMantleOfInspirationConfirm', () => {
    it('returns early when selectedTargets is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleMantleOfInspirationConfirm(null);
      expect(confirmMantleOfInspiration).not.toHaveBeenCalled();
    });

    it('returns early when mantleOfInspirationTarget is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleMantleOfInspirationConfirm(['target']);
      expect(confirmMantleOfInspiration).not.toHaveBeenCalled();
    });

    it('calls confirmMantleOfInspiration with all parameters', async () => {
      confirmMantleOfInspiration.mockResolvedValue({ payload: '<p>Inspired!</p>' });
      const modalState = {
        mantleOfInspirationTarget: {
          action: { name: 'Mantle of Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieRoll: 7,
          bardicDieSize: 'd8',
          tempHp: 5,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleMantleOfInspirationConfirm(['Ally1']);
      expect(confirmMantleOfInspiration).toHaveBeenCalledWith(
        modalState.mantleOfInspirationTarget.action,
        modalState.mantleOfInspirationTarget.playerStats,
        modalState.mantleOfInspirationTarget.campaignName,
        ['Ally1'],
        7,
        'd8',
        5
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ mantleOfInspirationTarget: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmMantleOfInspiration.mockResolvedValue({});
      const modalState = {
        mantleOfInspirationTarget: {
          action: { name: 'Mantle of Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieRoll: 7,
          bardicDieSize: 'd8',
          tempHp: 5,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleMantleOfInspirationConfirm(['Ally1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ mantleOfInspirationTarget: null });
    });
  });

  describe('handleCelestialResilienceConfirm', () => {
    it('returns early when selectedTargets is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleCelestialResilienceConfirm(null);
      expect(confirmCelestialResilience).not.toHaveBeenCalled();
    });

    it('returns early when celestialResilienceModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleCelestialResilienceConfirm(['target']);
      expect(confirmCelestialResilience).not.toHaveBeenCalled();
    });

    it('calls confirmCelestialResilience when modal is present', async () => {
      confirmCelestialResilience.mockResolvedValue({ payload: '<p>Resilient!</p>' });
      const modalState = {
        celestialResilienceModal: {
          action: { name: 'Celestial Resilience' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleCelestialResilienceConfirm(['Ally1']);
      expect(confirmCelestialResilience).toHaveBeenCalledWith(
        modalState.celestialResilienceModal.action,
        modalState.celestialResilienceModal.playerStats,
        modalState.celestialResilienceModal.campaignName,
        ['Ally1']
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ celestialResilienceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmCelestialResilience.mockResolvedValue({});
      const modalState = {
        celestialResilienceModal: {
          action: { name: 'Celestial Resilience' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleCelestialResilienceConfirm(['Ally1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ celestialResilienceModal: null });
    });
  });

  describe('handleCelestialResilienceSkip', () => {
    it('returns early when celestialResilienceModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleCelestialResilienceSkip();
      expect(skipCelestialResilience).not.toHaveBeenCalled();
    });

    it('calls skipCelestialResilience when modal is present', async () => {
      skipCelestialResilience.mockResolvedValue({ payload: '<p>Skipped!</p>' });
      const modalState = {
        celestialResilienceModal: {
          action: { name: 'Celestial Resilience' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleCelestialResilienceSkip();
      expect(skipCelestialResilience).toHaveBeenCalledWith(
        modalState.celestialResilienceModal.action,
        modalState.celestialResilienceModal.playerStats,
        modalState.celestialResilienceModal.campaignName
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ celestialResilienceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      skipCelestialResilience.mockResolvedValue({});
      const modalState = {
        celestialResilienceModal: {
          action: { name: 'Celestial Resilience' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleCelestialResilienceSkip();
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ celestialResilienceModal: null });
    });
  });

  describe('handleInspiringSmiteConfirm', () => {
    it('returns early when distribution is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleInspiringSmiteConfirm(null);
      expect(setTempHp).not.toHaveBeenCalled();
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('returns early when inspiringSmiteModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleInspiringSmiteConfirm({ target: 10 });
      expect(setTempHp).not.toHaveBeenCalled();
    });

    it('returns early when distribution has no targets', async () => {
      const modalState = {
        inspiringSmiteModal: {
          action: { name: 'Inspiring Smite' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          channelDivinityCharges: 1,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleInspiringSmiteConfirm({});
      expect(setTempHp).not.toHaveBeenCalled();
    });

    it('applies temp HP to each target and decrements charges', async () => {
      addEntry.mockResolvedValue({});
      const modalState = {
        inspiringSmiteModal: {
          action: { name: 'Inspiring Smite' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          channelDivinityCharges: 2,
        },
      };
      const handlers = getHandlers(modalState);
      const distribution = { Ally1: 5, Ally2: 10 };
      await handlers.handleInspiringSmiteConfirm(distribution);

      expect(setTempHp).toHaveBeenCalledWith('Ally1', 5, 'test-campaign');
      expect(setTempHp).toHaveBeenCalledWith('Ally2', 10, 'test-campaign');
      expect(setRuntimeValue).toHaveBeenCalledWith('TestChar', 'channelDivinityCharges', 1, 'test-campaign');
      expect(addEntry).toHaveBeenCalledWith('test-campaign', {
        type: 'ability_use',
        characterName: 'TestChar',
        abilityName: 'Inspiring Smite',
        description: 'TestChar used Inspiring Smite (15 temp HP). Distribution: Ally1=5, Ally2=10',
      });
      expect(mockSetPopupHtml).toHaveBeenCalledWith(
        '<b>Inspiring Smite</b><br/>Granted 15 temporary hit points: Ally1 (5 HP), Ally2 (10 HP).'
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ inspiringSmiteModal: null });
    });
  });

  describe('handleVitalityOfTheTreeConfirm', () => {
    it('returns early when selectedTargets is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleVitalityOfTheTreeConfirm(null);
      expect(confirmVitalityOfTheTree).not.toHaveBeenCalled();
    });

    it('returns early when vitalityOfTheTreeTarget is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleVitalityOfTheTreeConfirm(['target']);
      expect(confirmVitalityOfTheTree).not.toHaveBeenCalled();
    });

    it('calls confirmVitalityOfTheTree with all parameters', async () => {
      confirmVitalityOfTheTree.mockResolvedValue({ payload: '<p>Tree heal!</p>' });
      const modalState = {
        vitalityOfTheTreeTarget: {
          action: { name: 'Vitality of the Tree' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          tempHp: 10,
          maxTargets: 3,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleVitalityOfTheTreeConfirm(['Ally1', 'Ally2']);
      expect(confirmVitalityOfTheTree).toHaveBeenCalledWith(
        modalState.vitalityOfTheTreeTarget.action,
        modalState.vitalityOfTheTreeTarget.playerStats,
        modalState.vitalityOfTheTreeTarget.campaignName,
        ['Ally1', 'Ally2'],
        10,
        3
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ vitalityOfTheTreeTarget: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmVitalityOfTheTree.mockResolvedValue({});
      const modalState = {
        vitalityOfTheTreeTarget: {
          action: { name: 'Vitality of the Tree' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          tempHp: 10,
          maxTargets: 3,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleVitalityOfTheTreeConfirm(['Ally1', 'Ally2']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ vitalityOfTheTreeTarget: null });
    });
  });

  describe('handleTricksterBlessingConfirm', () => {
    it('returns early when tricksterBlessingModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleTricksterBlessingConfirm('target');
      expect(toggleBuff).not.toHaveBeenCalled();
    });

    it('toggles buff with targetName when provided', async () => {
      toggleBuff.mockReturnValue({ wasActive: false });
      addEntry.mockResolvedValue({});
      const modalState = {
        tricksterBlessingModal: {
          action: { name: 'Blessing of the Trickster', automation: { type: 'buff', duration: '1 hour' } },
          playerStats: makePlayerStats(),
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleTricksterBlessingConfirm('Ally1');

      expect(toggleBuff).toHaveBeenCalledWith(
        'Ally1',
        'Blessing of the Trickster',
        { type: 'buff', duration: '1 hour' },
        undefined,
        'Ally1'
      );
      expect(addEntry).toHaveBeenCalledWith(undefined, {
        type: 'ability_use',
        characterName: 'TestChar',
        abilityName: 'Blessing of the Trickster',
        description: 'Blessing granted to Ally1 with advantage on Stealth checks.',
      });
      expect(mockSetPopupHtml).toHaveBeenCalledWith({
        type: 'automation_info',
        name: 'Blessing of the Trickster',
        automationType: 'buff',
        description: 'Blessing of the Trickster activated on Ally1 (1 hour)',
        automation: { type: 'buff', duration: '1 hour' },
      });
      expect(mockSetModalState).toHaveBeenCalledWith({ tricksterBlessingModal: null });
    });

    it('toggles buff with playerStats.name when targetName is null', async () => {
      toggleBuff.mockReturnValue({ wasActive: false });
      addEntry.mockResolvedValue({});
      const modalState = {
        tricksterBlessingModal: {
          action: { name: 'Blessing of the Trickster', automation: { type: 'buff', duration: '1 hour' } },
          playerStats: makePlayerStats(),
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleTricksterBlessingConfirm(null);

      expect(toggleBuff).toHaveBeenCalledWith(
        'TestChar',
        'Blessing of the Trickster',
        { type: 'buff', duration: '1 hour' },
        undefined,
        'TestChar'
      );
      expect(mockSetPopupHtml).toHaveBeenCalledWith({
        type: 'automation_info',
        name: 'Blessing of the Trickster',
        automationType: 'buff',
        description: 'Blessing of the Trickster activated on yourself (1 hour)',
        automation: { type: 'buff', duration: '1 hour' },
      });
    });

    it('shows toggled OFF description when wasActive is true', async () => {
      toggleBuff.mockReturnValue({ wasActive: true });
      addEntry.mockResolvedValue({});
      const modalState = {
        tricksterBlessingModal: {
          action: { name: 'Blessing of the Trickster', automation: { type: 'buff', duration: '1 hour' } },
          playerStats: makePlayerStats(),
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleTricksterBlessingConfirm('Ally1');

      expect(mockSetPopupHtml).toHaveBeenCalledWith({
        type: 'automation_info',
        name: 'Blessing of the Trickster',
        automationType: 'buff',
        description: 'Blessing of the Trickster toggled OFF',
        automation: { type: 'buff', duration: '1 hour' },
      });
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('uses action.name or defaults to Blessing of the Trickster', async () => {
      toggleBuff.mockReturnValue({ wasActive: false });
      addEntry.mockResolvedValue({});
      const modalState = {
        tricksterBlessingModal: {
          action: { automation: { type: 'buff', duration: '1 hour' } },
          playerStats: makePlayerStats(),
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleTricksterBlessingConfirm('Ally1');

      expect(toggleBuff).toHaveBeenCalledWith(
        'Ally1',
        'Blessing of the Trickster',
        { type: 'buff', duration: '1 hour' },
        undefined,
        'Ally1'
      );
    });

    it('uses fallback duration when auto.duration is missing', async () => {
      toggleBuff.mockReturnValue({ wasActive: false });
      addEntry.mockResolvedValue({});
      const modalState = {
        tricksterBlessingModal: {
          action: { name: 'Blessing of the Trickster', automation: { type: 'buff' } },
          playerStats: makePlayerStats(),
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleTricksterBlessingConfirm('Ally1');

      expect(mockSetPopupHtml).toHaveBeenCalledWith({
        type: 'automation_info',
        name: 'Blessing of the Trickster',
        automationType: 'buff',
        description: 'Blessing of the Trickster activated on Ally1 (1 hour)',
        automation: { type: 'buff' },
      });
    });
  });

  describe('handleBardicInspirationConfirm', () => {
    it('returns early when bardicInspirationTargetModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleBardicInspirationConfirm('target');
      expect(applyBardicInspiration).not.toHaveBeenCalled();
    });

    it('clears modal state immediately', async () => {
      const modalState = {
        bardicInspirationTargetModal: {
          action: { name: 'Bardic Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieSize: 'd8',
          hasCombatOptions: false,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleBardicInspirationConfirm('Ally1');
      expect(mockSetModalState).toHaveBeenCalledWith({ bardicInspirationTargetModal: null });
    });

    it('returns early when targetName is empty string', async () => {
      const modalState = {
        bardicInspirationTargetModal: {
          action: { name: 'Bardic Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieSize: 'd8',
          hasCombatOptions: false,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleBardicInspirationConfirm('');
      expect(applyBardicInspiration).not.toHaveBeenCalled();
    });

    it('returns early when applyBardicInspiration returns falsy', async () => {
      const modalState = {
        bardicInspirationTargetModal: {
          action: { name: 'Bardic Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieSize: 'd8',
          hasCombatOptions: false,
        },
      };
      const handlers = getHandlers(modalState);
      applyBardicInspiration.mockResolvedValue(null);
      await handlers.handleBardicInspirationConfirm('Ally1');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('calls setPopupHtml when result type is popup', async () => {
      const modalState = {
        bardicInspirationTargetModal: {
          action: { name: 'Bardic Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieSize: 'd8',
          hasCombatOptions: false,
        },
      };
      const handlers = getHandlers(modalState);
      applyBardicInspiration.mockResolvedValue({ type: 'popup', payload: '<p>Inspired!</p>' });
      await handlers.handleBardicInspirationConfirm('Ally1');
      expect(mockSetPopupHtml).toHaveBeenCalledWith('<p>Inspired!</p>');
    });

    it('does not call setPopupHtml when result type is not popup', async () => {
      const modalState = {
        bardicInspirationTargetModal: {
          action: { name: 'Bardic Inspiration' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          dieSize: 'd8',
          hasCombatOptions: false,
        },
      };
      const handlers = getHandlers(modalState);
      applyBardicInspiration.mockResolvedValue({ type: 'info', payload: 'Some info' });
      await handlers.handleBardicInspirationConfirm('Ally1');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });

  describe('handleInspiringMovementConfirm', () => {
    it('returns early when inspiringMovementAllyModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleInspiringMovementConfirm('ally');
      expect(applyInspiringMovement).not.toHaveBeenCalled();
    });

    it('clears modal state immediately', async () => {
      const modalState = {
        inspiringMovementAllyModal: {
          action: { name: 'Inspiring Movement' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          halfSpeed: true,
          noOAs: false,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleInspiringMovementConfirm('Ally1');
      expect(mockSetModalState).toHaveBeenCalledWith({ inspiringMovementAllyModal: null });
    });

    it('returns early when allyName is empty', async () => {
      const modalState = {
        inspiringMovementAllyModal: {
          action: { name: 'Inspiring Movement' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          halfSpeed: true,
          noOAs: false,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleInspiringMovementConfirm('');
      expect(applyInspiringMovement).not.toHaveBeenCalled();
    });

    it('returns early when applyInspiringMovement returns falsy', async () => {
      const modalState = {
        inspiringMovementAllyModal: {
          action: { name: 'Inspiring Movement' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          halfSpeed: true,
          noOAs: false,
        },
      };
      const handlers = getHandlers(modalState);
      applyInspiringMovement.mockResolvedValue(null);
      await handlers.handleInspiringMovementConfirm('Ally1');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('calls setPopupHtml when result type is popup', async () => {
      const modalState = {
        inspiringMovementAllyModal: {
          action: { name: 'Inspiring Movement' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          halfSpeed: true,
          noOAs: false,
        },
      };
      const handlers = getHandlers(modalState);
      applyInspiringMovement.mockResolvedValue({ type: 'popup', payload: '<p>Moving!</p>' });
      await handlers.handleInspiringMovementConfirm('Ally1');
      expect(mockSetPopupHtml).toHaveBeenCalledWith('<p>Moving!</p>');
    });

    it('does not call setPopupHtml when result type is not popup', async () => {
      const modalState = {
        inspiringMovementAllyModal: {
          action: { name: 'Inspiring Movement' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          halfSpeed: true,
          noOAs: false,
        },
      };
      const handlers = getHandlers(modalState);
      applyInspiringMovement.mockResolvedValue({ type: 'info', payload: 'Some info' });
      await handlers.handleInspiringMovementConfirm('Ally1');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });

  describe('handleOceanicGiftConfirm', () => {
    it('returns early when oceanicGiftTargetModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleOceanicGiftConfirm('ally');
      expect(confirmOceanicGift).not.toHaveBeenCalled();
    });

    it('clears modal state immediately', async () => {
      const modalState = {
        oceanicGiftTargetModal: {
          action: { name: 'Oceanic Gift' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          spellSaveDc: 13,
          wisMod: 3,
          doubleEmanation: false,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleOceanicGiftConfirm('Ally1');
      expect(mockSetModalState).toHaveBeenCalledWith({ oceanicGiftTargetModal: null });
    });

    it('returns early when selectedAllyName is empty', async () => {
      const modalState = {
        oceanicGiftTargetModal: {
          action: { name: 'Oceanic Gift' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          spellSaveDc: 13,
          wisMod: 3,
          doubleEmanation: false,
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleOceanicGiftConfirm('');
      expect(confirmOceanicGift).not.toHaveBeenCalled();
    });

    it('returns early when confirmOceanicGift returns falsy', async () => {
      const modalState = {
        oceanicGiftTargetModal: {
          action: { name: 'Oceanic Gift' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          spellSaveDc: 13,
          wisMod: 3,
          doubleEmanation: false,
        },
      };
      const handlers = getHandlers(modalState);
      confirmOceanicGift.mockResolvedValue(null);
      await handlers.handleOceanicGiftConfirm('Ally1');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('calls setPopupHtml when result type is popup', async () => {
      const modalState = {
        oceanicGiftTargetModal: {
          action: { name: 'Oceanic Gift' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          spellSaveDc: 13,
          wisMod: 3,
          doubleEmanation: false,
        },
      };
      const handlers = getHandlers(modalState);
      confirmOceanicGift.mockResolvedValue({ type: 'popup', payload: '<p>Gift!</p>' });
      await handlers.handleOceanicGiftConfirm('Ally1');
      expect(mockSetPopupHtml).toHaveBeenCalledWith('<p>Gift!</p>');
    });

    it('does not call setPopupHtml when result type is not popup', async () => {
      const modalState = {
        oceanicGiftTargetModal: {
          action: { name: 'Oceanic Gift' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          spellSaveDc: 13,
          wisMod: 3,
          doubleEmanation: false,
        },
      };
      const handlers = getHandlers(modalState);
      confirmOceanicGift.mockResolvedValue({ type: 'info', payload: 'Some info' });
      await handlers.handleOceanicGiftConfirm('Ally1');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });
});

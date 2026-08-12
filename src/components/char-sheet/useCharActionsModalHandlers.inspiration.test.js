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

describe('useCharActionsModalHandlers - inspiration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
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
});

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

const { confirmMassHeal } = await import('../../services/automation/handlers/healing/massHealHandler.js');
const { confirmClockworkCavalcadeHeal, confirmClockworkCavalcadeDispel, confirmClockworkCavalcadeRepair } = await import('../../services/automation/handlers/class-sorcerer/clockworkCavalcadeHandler.js');
const { confirmMassCureWounds } = await import('../../services/automation/handlers/healing/massCureWoundsHandler.js');
const { confirmPrayerOfHealing } = await import('../../services/automation/handlers/healing/prayerOfHealingHandler.js');
const { confirmPowerWordFortify } = await import('../../services/automation/handlers/buffs/powerWordFortifyHandler.js');
const { confirmMassHealingWord } = await import('../../services/automation/handlers/healing/massHealingWordHandler.js');

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

describe('useCharActionsModalHandlers - healing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
  });

  describe('handleMassHealConfirm', () => {
    it('returns early when distribution is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleMassHealConfirm(null);
      expect(confirmMassHeal).not.toHaveBeenCalled();
    });

    it('returns early when massHealModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleMassHealConfirm({ target: 10 });
      expect(confirmMassHeal).not.toHaveBeenCalled();
    });

    it('calls confirmMassHeal with correct args', async () => {
      confirmMassHeal.mockResolvedValue({ payload: '<p>Mass heal!</p>' });
      const modalState = {
        massHealModal: {
          action: { name: 'Mass Heal' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          totalPool: 50,
          bonusHeal: 10,
          bonusDetails: 'bonus',
        },
      };
      const handlers = getHandlers(modalState);
      const distribution = { Ally1: 20, Ally2: 30 };
      await handlers.handleMassHealConfirm(distribution);
      expect(confirmMassHeal).toHaveBeenCalledWith(
        modalState.massHealModal.action,
        modalState.massHealModal.playerStats,
        modalState.massHealModal.campaignName,
        distribution,
        50,
        10,
        'bonus'
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ massHealModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmMassHeal.mockResolvedValue({});
      const modalState = {
        massHealModal: {
          action: { name: 'Mass Heal' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          totalPool: 50,
          bonusHeal: 10,
          bonusDetails: 'bonus',
        },
      };
      const handlers = getHandlers(modalState);
      const distribution = { Ally1: 20, Ally2: 30 };
      await handlers.handleMassHealConfirm(distribution);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ massHealModal: null });
    });
  });

  describe('handleClockworkCavalcadeHealConfirm', () => {
    it('returns early when distribution is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleClockworkCavalcadeHealConfirm(null);
      expect(confirmClockworkCavalcadeHeal).not.toHaveBeenCalled();
    });

    it('returns early when clockworkCavalcadeHealModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handleClockworkCavalcadeHealConfirm({ target: 10 });
      expect(confirmClockworkCavalcadeHeal).not.toHaveBeenCalled();
    });

    it('calls confirmClockworkCavalcadeHeal with correct args', async () => {
      confirmClockworkCavalcadeHeal.mockResolvedValue({ payload: '<p>Healed!</p>' });
      const mergedModalState = {
        clockworkCavalcadeHealModal: {
          action: { name: 'Clockwork Cavalcade' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          maxHeal: 30,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      const distribution = { Ally1: 15, Ally2: 15 };
      await handlers.handleClockworkCavalcadeHealConfirm(distribution);
      expect(confirmClockworkCavalcadeHeal).toHaveBeenCalledWith(
        mergedModalState.clockworkCavalcadeHealModal.action,
        mergedModalState.clockworkCavalcadeHealModal.playerStats,
        mergedModalState.clockworkCavalcadeHealModal.campaignName,
        distribution,
        30
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ clockworkCavalcadeHealModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmClockworkCavalcadeHeal.mockResolvedValue({});
      const mergedModalState = {
        clockworkCavalcadeHealModal: {
          action: { name: 'Clockwork Cavalcade' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          maxHeal: 30,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      const distribution = { Ally1: 15, Ally2: 15 };
      await handlers.handleClockworkCavalcadeHealConfirm(distribution);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ clockworkCavalcadeHealModal: null });
    });
  });

  describe('handleClockworkCavalcadeDispelConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleClockworkCavalcadeDispelConfirm(null);
      expect(confirmClockworkCavalcadeDispel).not.toHaveBeenCalled();
    });

    it('returns early when clockworkCavalcadeDispelModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handleClockworkCavalcadeDispelConfirm(['target']);
      expect(confirmClockworkCavalcadeDispel).not.toHaveBeenCalled();
    });

    it('calls confirmClockworkCavalcadeDispel with correct args', async () => {
      confirmClockworkCavalcadeDispel.mockResolvedValue({ payload: '<p>Dispel!</p>' });
      const mergedModalState = {
        clockworkCavalcadeDispelModal: {
          action: { name: 'Clockwork Cavalcade' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleClockworkCavalcadeDispelConfirm(['Enemy1']);
      expect(confirmClockworkCavalcadeDispel).toHaveBeenCalledWith(
        mergedModalState.clockworkCavalcadeDispelModal.action,
        mergedModalState.clockworkCavalcadeDispelModal.playerStats,
        mergedModalState.clockworkCavalcadeDispelModal.campaignName,
        ['Enemy1']
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ clockworkCavalcadeDispelModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmClockworkCavalcadeDispel.mockResolvedValue({});
      const mergedModalState = {
        clockworkCavalcadeDispelModal: {
          action: { name: 'Clockwork Cavalcade' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleClockworkCavalcadeDispelConfirm(['Enemy1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ clockworkCavalcadeDispelModal: null });
    });
  });

  describe('handleClockworkCavalcadeRepairConfirm', () => {
    it('returns early when clockworkCavalcadeRepairModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handleClockworkCavalcadeRepairConfirm();
      expect(confirmClockworkCavalcadeRepair).not.toHaveBeenCalled();
    });

    it('calls confirmClockworkCavalcadeRepair when modal is present', async () => {
      confirmClockworkCavalcadeRepair.mockResolvedValue({ payload: '<p>Repaired!</p>' });
      const mergedModalState = {
        clockworkCavalcadeRepairModal: {
          action: { name: 'Clockwork Cavalcade' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleClockworkCavalcadeRepairConfirm();
      expect(confirmClockworkCavalcadeRepair).toHaveBeenCalledWith(
        mergedModalState.clockworkCavalcadeRepairModal.action,
        mergedModalState.clockworkCavalcadeRepairModal.playerStats,
        mergedModalState.clockworkCavalcadeRepairModal.campaignName
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ clockworkCavalcadeRepairModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmClockworkCavalcadeRepair.mockResolvedValue({});
      const mergedModalState = {
        clockworkCavalcadeRepairModal: {
          action: { name: 'Clockwork Cavalcade' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleClockworkCavalcadeRepairConfirm();
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ clockworkCavalcadeRepairModal: null });
    });
  });

  describe('handleMassCureWoundsConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleMassCureWoundsConfirm(null);
      expect(confirmMassCureWounds).not.toHaveBeenCalled();
    });

    it('returns early when massCureWoundsModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handleMassCureWoundsConfirm(['target']);
      expect(confirmMassCureWounds).not.toHaveBeenCalled();
    });

    it('calls confirmMassCureWounds with all parameters', async () => {
      confirmMassCureWounds.mockResolvedValue({ payload: '<p>Healed!</p>' });
      const mergedModalState = {
        massCureWoundsModal: {
          action: { name: 'Mass Cure Wounds' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          healExpression: '3d8',
          maximize: false,
          bonusHeal: 5,
          bonusDetails: 'bonus',
          slotLevel: 5,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleMassCureWoundsConfirm(['Ally1', 'Ally2']);
      expect(confirmMassCureWounds).toHaveBeenCalledWith(
        mergedModalState.massCureWoundsModal.action,
        mergedModalState.massCureWoundsModal.playerStats,
        mergedModalState.massCureWoundsModal.campaignName,
        ['Ally1', 'Ally2'],
        '3d8',
        false,
        5,
        'bonus',
        5
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ massCureWoundsModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmMassCureWounds.mockResolvedValue({});
      const mergedModalState = {
        massCureWoundsModal: {
          action: { name: 'Mass Cure Wounds' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          healExpression: '3d8',
          maximize: false,
          bonusHeal: 5,
          bonusDetails: 'bonus',
          slotLevel: 5,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleMassCureWoundsConfirm(['Ally1', 'Ally2']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ massCureWoundsModal: null });
    });
  });

  describe('handlePrayerOfHealingConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handlePrayerOfHealingConfirm(null);
      expect(confirmPrayerOfHealing).not.toHaveBeenCalled();
    });

    it('returns early when prayerOfHealingModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handlePrayerOfHealingConfirm(['target']);
      expect(confirmPrayerOfHealing).not.toHaveBeenCalled();
    });

    it('calls confirmPrayerOfHealing with all parameters', async () => {
      confirmPrayerOfHealing.mockResolvedValue({ payload: '<p>Prayed!</p>' });
      const mergedModalState = {
        prayerOfHealingModal: {
          action: { name: 'Prayer of Healing' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          healExpression: '2d4',
          maximize: false,
          bonusHeal: 3,
          bonusDetails: 'bonus',
          slotLevel: 2,
          currentRound: 5,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handlePrayerOfHealingConfirm(['Ally1']);
      expect(confirmPrayerOfHealing).toHaveBeenCalledWith(
        mergedModalState.prayerOfHealingModal.action,
        mergedModalState.prayerOfHealingModal.playerStats,
        mergedModalState.prayerOfHealingModal.campaignName,
        ['Ally1'],
        '2d4',
        false,
        3,
        'bonus',
        2,
        5
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ prayerOfHealingModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmPrayerOfHealing.mockResolvedValue({});
      const mergedModalState = {
        prayerOfHealingModal: {
          action: { name: 'Prayer of Healing' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          healExpression: '2d4',
          maximize: false,
          bonusHeal: 3,
          bonusDetails: 'bonus',
          slotLevel: 2,
          currentRound: 5,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handlePrayerOfHealingConfirm(['Ally1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ prayerOfHealingModal: null });
    });
  });

  describe('handlePowerWordFortifyConfirm', () => {
    it('returns early when distribution is missing', async () => {
      const handlers = getHandlers();
      await handlers.handlePowerWordFortifyConfirm(null);
      expect(confirmPowerWordFortify).not.toHaveBeenCalled();
    });

    it('returns early when powerWordFortifyModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handlePowerWordFortifyConfirm({ target: 10 });
      expect(confirmPowerWordFortify).not.toHaveBeenCalled();
    });

    it('calls confirmPowerWordFortify with correct args', async () => {
      confirmPowerWordFortify.mockResolvedValue({ payload: '<p>Fortified!</p>' });
      const mergedModalState = {
        powerWordFortifyModal: {
          action: { name: 'Power Word Fortify' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          totalTempHp: 20,
          tempHpExpression: '1d10',
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      const distribution = { Ally1: 10, Ally2: 10 };
      await handlers.handlePowerWordFortifyConfirm(distribution);
      expect(confirmPowerWordFortify).toHaveBeenCalledWith(
        mergedModalState.powerWordFortifyModal.action,
        mergedModalState.powerWordFortifyModal.playerStats,
        mergedModalState.powerWordFortifyModal.campaignName,
        distribution,
        20,
        '1d10'
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ powerWordFortifyModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmPowerWordFortify.mockResolvedValue({});
      const mergedModalState = {
        powerWordFortifyModal: {
          action: { name: 'Power Word Fortify' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          totalTempHp: 20,
          tempHpExpression: '1d10',
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      const distribution = { Ally1: 10, Ally2: 10 };
      await handlers.handlePowerWordFortifyConfirm(distribution);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ powerWordFortifyModal: null });
    });
  });

  describe('handleMassHealingWordConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleMassHealingWordConfirm(null);
      expect(confirmMassHealingWord).not.toHaveBeenCalled();
    });

    it('returns early when massHealingWordModal is not in mergedModalState', async () => {
      const handlers = getHandlers();
      await handlers.handleMassHealingWordConfirm(['target']);
      expect(confirmMassHealingWord).not.toHaveBeenCalled();
    });

    it('calls confirmMassHealingWord with all parameters', async () => {
      confirmMassHealingWord.mockResolvedValue({ payload: '<p>Healed!</p>' });
      const mergedModalState = {
        massHealingWordModal: {
          action: { name: 'Mass Healing Word' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          healExpression: '2d4',
          maximize: false,
          bonusHeal: 3,
          bonusDetails: 'bonus',
          slotLevel: 3,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleMassHealingWordConfirm(['Ally1', 'Ally2', 'Ally3']);
      expect(confirmMassHealingWord).toHaveBeenCalledWith(
        mergedModalState.massHealingWordModal.action,
        mergedModalState.massHealingWordModal.playerStats,
        mergedModalState.massHealingWordModal.campaignName,
        ['Ally1', 'Ally2', 'Ally3'],
        '2d4',
        false,
        3,
        'bonus',
        3
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ massHealingWordModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmMassHealingWord.mockResolvedValue({});
      const mergedModalState = {
        massHealingWordModal: {
          action: { name: 'Mass Healing Word' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
          healExpression: '2d4',
          maximize: false,
          bonusHeal: 3,
          bonusDetails: 'bonus',
          slotLevel: 3,
        },
      };
      const handlers = getHandlers({}, mergedModalState);
      await handlers.handleMassHealingWordConfirm(['Ally1', 'Ally2', 'Ally3']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ massHealingWordModal: null });
    });
  });
});

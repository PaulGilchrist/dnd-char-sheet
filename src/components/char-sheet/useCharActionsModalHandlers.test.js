import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsModalHandlers from './useCharActionsModalHandlers.js';

// Mock all imported modules
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
  executeSweepingAttack: vi.fn(),
  executeBaitAndSwitchChoice: vi.fn(),
  executeCommanderStrikeChoice: vi.fn(),
  executeRallyChoice: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-sorcerer/bulwarkOfForceHandler.js', () => ({
  activateBulwarkOfForce: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-barbarian/zealousPresenceHandler.js', () => ({
  confirmZealousPresence: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/massHealHandler.js', () => ({
  confirmMassHeal: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-sorcerer/clockworkCavalcadeHandler.js', () => ({
  confirmClockworkCavalcadeHeal: vi.fn(),
  confirmClockworkCavalcadeDispel: vi.fn(),
  confirmClockworkCavalcadeRepair: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/massCureWoundsHandler.js', () => ({
  confirmMassCureWounds: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/prayerOfHealingHandler.js', () => ({
  confirmPrayerOfHealing: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/powerWordFortifyHandler.js', () => ({
  confirmPowerWordFortify: vi.fn(),
}));

vi.mock('../../services/automation/handlers/healing/massHealingWordHandler.js', () => ({
  confirmMassHealingWord: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-ranger/naturesSanctuaryHandler.js', () => ({
  activateNaturesSanctuary: vi.fn(),
  moveNaturesSanctuary: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-cleric-paladin/coronaOfLightHandler.js', () => ({
  activateCoronaOfLight: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-cleric-paladin/radianceOfDawnHandler.js', () => ({
  confirmRadianceOfDawn: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpBuffHandler.js', () => ({
  confirmMantleOfInspiration: vi.fn(),
  confirmVitalityOfTheTree: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-warlock/celestialResilienceHandler.js', () => ({
  confirmCelestialResilience: vi.fn(),
  skipCelestialResilience: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-druid/oceanicGiftHandler.js', () => ({
  confirmOceanicGift: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-bard/bardicInspirationHandler.js', () => ({
  applyBardicInspiration: vi.fn(),
}));

vi.mock('../../services/automation/handlers/reactions/reactionBonusHandler.js', () => ({
  applyInspiringMovement: vi.fn(),
}));

const { toggleBuff } = await import('../../services/automation/common/buffToggle.js');
const { setTempHp } = await import('../../services/automation/handlers/buffs/tempHpService.js');
const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
const { addEntry } = await import('../../services/ui/logService.js');
const {
  executeSweepingAttack,
  executeBaitAndSwitchChoice,
  executeCommanderStrikeChoice,
  executeRallyChoice,
} = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
const { activateBulwarkOfForce } = await import('../../services/automation/handlers/class-sorcerer/bulwarkOfForceHandler.js');
const { confirmZealousPresence } = await import('../../services/automation/handlers/class-barbarian/zealousPresenceHandler.js');
const { confirmMassHeal } = await import('../../services/automation/handlers/healing/massHealHandler.js');
const {
  confirmClockworkCavalcadeHeal,
  confirmClockworkCavalcadeDispel,
  confirmClockworkCavalcadeRepair,
} = await import('../../services/automation/handlers/class-sorcerer/clockworkCavalcadeHandler.js');
const { confirmMassCureWounds } = await import('../../services/automation/handlers/healing/massCureWoundsHandler.js');
const { confirmPrayerOfHealing } = await import('../../services/automation/handlers/healing/prayerOfHealingHandler.js');
const { confirmPowerWordFortify } = await import('../../services/automation/handlers/buffs/powerWordFortifyHandler.js');
const { confirmMassHealingWord } = await import('../../services/automation/handlers/healing/massHealingWordHandler.js');
const { activateNaturesSanctuary, moveNaturesSanctuary } = await import('../../services/automation/handlers/class-ranger/naturesSanctuaryHandler.js');
const { activateCoronaOfLight } = await import('../../services/automation/handlers/class-cleric-paladin/coronaOfLightHandler.js');
const { confirmRadianceOfDawn } = await import('../../services/automation/handlers/class-cleric-paladin/radianceOfDawnHandler.js');
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

function makeModalData(extra = {}) {
  return {
    playerStats: makePlayerStats(),
    campaignName: 'test-campaign',
    ...extra,
  };
}

describe('useCharActionsModalHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
  });

  describe('return value', () => {
    it('returns an object with all 27 handler functions', () => {
      const handlers = getHandlers();
      expect(typeof handlers.handleSweepingAttackConfirm).toBe('function');
      expect(typeof handlers.handleBaitAndSwitchChoiceConfirm).toBe('function');
      expect(typeof handlers.handleCommanderStrikeChoiceConfirm).toBe('function');
      expect(typeof handlers.handleRallyChoiceConfirm).toBe('function');
      expect(typeof handlers.handleBulwarkOfForceConfirm).toBe('function');
      expect(typeof handlers.handleZealousPresenceConfirm).toBe('function');
      expect(typeof handlers.handleMassHealConfirm).toBe('function');
      expect(typeof handlers.handleClockworkCavalcadeHealConfirm).toBe('function');
      expect(typeof handlers.handleClockworkCavalcadeDispelConfirm).toBe('function');
      expect(typeof handlers.handleClockworkCavalcadeRepairConfirm).toBe('function');
      expect(typeof handlers.handleMassCureWoundsConfirm).toBe('function');
      expect(typeof handlers.handlePrayerOfHealingConfirm).toBe('function');
      expect(typeof handlers.handlePowerWordFortifyConfirm).toBe('function');
      expect(typeof handlers.handleMassHealingWordConfirm).toBe('function');
      expect(typeof handlers.handleNaturesSanctuaryConfirm).toBe('function');
      expect(typeof handlers.handleCoronaEnemySelectionConfirm).toBe('function');
      expect(typeof handlers.handleRadianceOfDawnConfirm).toBe('function');
      expect(typeof handlers.handleMantleOfInspirationConfirm).toBe('function');
      expect(typeof handlers.handleCelestialResilienceConfirm).toBe('function');
      expect(typeof handlers.handleCelestialResilienceSkip).toBe('function');
      expect(typeof handlers.handleInspiringSmiteConfirm).toBe('function');
      expect(typeof handlers.handleVitalityOfTheTreeConfirm).toBe('function');
      expect(typeof handlers.handleTricksterBlessingConfirm).toBe('function');
      expect(typeof handlers.handleBardicInspirationConfirm).toBe('function');
      expect(typeof handlers.handleInspiringMovementConfirm).toBe('function');
      expect(typeof handlers.handleOceanicGiftConfirm).toBe('function');
    });
  });

  describe('handleSweepingAttackConfirm', () => {
    it('returns early when targetName is null', async () => {
      const handlers = getHandlers();
      await handlers.handleSweepingAttackConfirm(null, {});
      expect(executeSweepingAttack).not.toHaveBeenCalled();
      expect(mockSetModalState).not.toHaveBeenCalled();
    });

    it('returns early when modalData is null', async () => {
      const handlers = getHandlers();
      await handlers.handleSweepingAttackConfirm('target', null);
      expect(executeSweepingAttack).not.toHaveBeenCalled();
      expect(mockSetModalState).not.toHaveBeenCalled();
    });

    it('calls executeSweepingAttack with correct args and clears modal', async () => {
      executeSweepingAttack.mockResolvedValue({ payload: '<p>Hit!</p>' });
      const handlers = getHandlers();
      const modalData = makeModalData();
      await handlers.handleSweepingAttackConfirm('Goblin', modalData);
      expect(executeSweepingAttack).toHaveBeenCalledWith(
        { automation: { secondaryTargetName: 'Goblin' } },
        modalData.playerStats,
        modalData.campaignName,
        'Goblin'
      );
      expect(mockSetPopupHtml).toHaveBeenCalledWith('<p>Hit!</p>');
      expect(mockSetModalState).toHaveBeenCalledWith({ sweepingAttackTargetModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      executeSweepingAttack.mockResolvedValue({});
      const handlers = getHandlers();
      const modalData = makeModalData();
      await handlers.handleSweepingAttackConfirm('Goblin', modalData);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ sweepingAttackTargetModal: null });
    });
  });

  describe('handleBaitAndSwitchChoiceConfirm', () => {
    it('returns early when targetName is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleBaitAndSwitchChoiceConfirm(null, {});
      expect(executeBaitAndSwitchChoice).not.toHaveBeenCalled();
    });

    it('calls executeBaitAndSwitchChoice with correct args', async () => {
      executeBaitAndSwitchChoice.mockResolvedValue({ payload: '<p>Success</p>' });
      const handlers = getHandlers();
      const modalData = makeModalData({ dieValue: 15, maneuverName: 'Trip' });
      await handlers.handleBaitAndSwitchChoiceConfirm('Orc', modalData);
      expect(executeBaitAndSwitchChoice).toHaveBeenCalledWith(
        { dieValue: 15, maneuverName: 'Trip' },
        modalData.playerStats,
        modalData.campaignName,
        'Orc'
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ baitAndSwitchChoiceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      executeBaitAndSwitchChoice.mockResolvedValue({});
      const handlers = getHandlers();
      const modalData = makeModalData({ dieValue: 15, maneuverName: 'Trip' });
      await handlers.handleBaitAndSwitchChoiceConfirm('Orc', modalData);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ baitAndSwitchChoiceModal: null });
    });
  });

  describe('handleCommanderStrikeChoiceConfirm', () => {
    it('returns early when targetName is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleCommanderStrikeChoiceConfirm(null, {});
      expect(executeCommanderStrikeChoice).not.toHaveBeenCalled();
    });

    it('calls executeCommanderStrikeChoice with correct args', async () => {
      executeCommanderStrikeChoice.mockResolvedValue({ payload: '<p>Struck</p>' });
      const handlers = getHandlers();
      const modalData = makeModalData({ dieValue: 12, maneuverName: 'Commander Strike' });
      await handlers.handleCommanderStrikeChoiceConfirm('Ally1', modalData);
      expect(executeCommanderStrikeChoice).toHaveBeenCalledWith(
        { dieValue: 12, maneuverName: 'Commander Strike' },
        modalData.playerStats,
        modalData.campaignName,
        'Ally1'
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ commanderStrikeChoiceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      executeCommanderStrikeChoice.mockResolvedValue({});
      const handlers = getHandlers();
      const modalData = makeModalData({ dieValue: 12, maneuverName: 'Commander Strike' });
      await handlers.handleCommanderStrikeChoiceConfirm('Ally1', modalData);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ commanderStrikeChoiceModal: null });
    });
  });

  describe('handleRallyChoiceConfirm', () => {
    it('returns early when targetName is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleRallyChoiceConfirm(null, {});
      expect(executeRallyChoice).not.toHaveBeenCalled();
    });

    it('calls executeRallyChoice with all parameters', async () => {
      executeRallyChoice.mockResolvedValue({ payload: '<p>Rally!</p>' });
      const handlers = getHandlers();
      const modalData = makeModalData({
        dieValue: 10,
        maneuverName: 'Rally the Brave',
        totalHp: 20,
        extraHp: 5,
        description: 'Rally description',
      });
      await handlers.handleRallyChoiceConfirm('Ally2', modalData);
      expect(executeRallyChoice).toHaveBeenCalledWith(
        { dieValue: 10, maneuverName: 'Rally the Brave' },
        modalData.playerStats,
        modalData.campaignName,
        'Ally2',
        20,
        5,
        'Rally description'
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ rallyChoiceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      executeRallyChoice.mockResolvedValue({});
      const handlers = getHandlers();
      const modalData = makeModalData({
        dieValue: 10,
        maneuverName: 'Rally the Brave',
        totalHp: 20,
        extraHp: 5,
        description: 'Rally description',
      });
      await handlers.handleRallyChoiceConfirm('Ally2', modalData);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ rallyChoiceModal: null });
    });
  });

  describe('handleBulwarkOfForceConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleBulwarkOfForceConfirm(null);
      expect(activateBulwarkOfForce).not.toHaveBeenCalled();
    });

    it('returns early when bulwarkOfForceModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleBulwarkOfForceConfirm(['target']);
      expect(activateBulwarkOfForce).not.toHaveBeenCalled();
    });

    it('calls activateBulwarkOfForce when modal is present', async () => {
      activateBulwarkOfForce.mockResolvedValue({ payload: '<p>Bulwark!</p>' });
      const modalState = {
        bulwarkOfForceModal: {
          action: { name: 'Bulwark of Force' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleBulwarkOfForceConfirm(['Ally1', 'Ally2']);
      expect(activateBulwarkOfForce).toHaveBeenCalledWith(
        modalState.bulwarkOfForceModal.action,
        modalState.bulwarkOfForceModal.playerStats,
        modalState.bulwarkOfForceModal.campaignName,
        ['Ally1', 'Ally2']
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ bulwarkOfForceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      activateBulwarkOfForce.mockResolvedValue({});
      const modalState = {
        bulwarkOfForceModal: {
          action: { name: 'Bulwark of Force' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleBulwarkOfForceConfirm(['Ally1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ bulwarkOfForceModal: null });
    });
  });

  describe('handleZealousPresenceConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleZealousPresenceConfirm(null);
      expect(confirmZealousPresence).not.toHaveBeenCalled();
    });

    it('returns early when zealousPresenceModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleZealousPresenceConfirm(['target']);
      expect(confirmZealousPresence).not.toHaveBeenCalled();
    });

    it('calls confirmZealousPresence when modal is present', async () => {
      confirmZealousPresence.mockResolvedValue({ payload: '<p>Zealous!</p>' });
      const modalState = {
        zealousPresenceModal: {
          action: { name: 'Zealous Presence' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleZealousPresenceConfirm(['Ally1']);
      expect(confirmZealousPresence).toHaveBeenCalledWith(
        modalState.zealousPresenceModal.action,
        modalState.zealousPresenceModal.playerStats,
        modalState.zealousPresenceModal.campaignName,
        ['Ally1']
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ zealousPresenceModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmZealousPresence.mockResolvedValue({});
      const modalState = {
        zealousPresenceModal: {
          action: { name: 'Zealous Presence' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleZealousPresenceConfirm(['Ally1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ zealousPresenceModal: null });
    });
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

  describe('handleNaturesSanctuaryConfirm', () => {
    it('returns early when targetNames is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleNaturesSanctuaryConfirm(null, null);
      expect(activateNaturesSanctuary).not.toHaveBeenCalled();
      expect(moveNaturesSanctuary).not.toHaveBeenCalled();
    });

    it('returns early when naturesSanctuaryCreaturesModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleNaturesSanctuaryConfirm(['target'], null);
      expect(activateNaturesSanctuary).not.toHaveBeenCalled();
      expect(moveNaturesSanctuary).not.toHaveBeenCalled();
    });

    it('calls moveNaturesSanctuary when isMove is true', async () => {
      moveNaturesSanctuary.mockResolvedValue({ payload: '<p>Moved!</p>' });
      const modalState = {
        naturesSanctuaryCreaturesModal: {
          action: { name: "Nature's Sanctuary" },
          isMove: true,
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleNaturesSanctuaryConfirm(['Ally1'], 'Forest Map');
      expect(moveNaturesSanctuary).toHaveBeenCalledWith(
        modalState.naturesSanctuaryCreaturesModal.action,
        modalState.naturesSanctuaryCreaturesModal.playerStats,
        modalState.naturesSanctuaryCreaturesModal.campaignName,
        ['Ally1']
      );
      expect(activateNaturesSanctuary).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: null });
    });

    it('calls activateNaturesSanctuary when isMove is false', async () => {
      activateNaturesSanctuary.mockResolvedValue({ payload: '<p>Activated!</p>' });
      const modalState = {
        naturesSanctuaryCreaturesModal: {
          action: { name: "Nature's Sanctuary" },
          isMove: false,
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleNaturesSanctuaryConfirm(['Ally1'], 'Forest Map');
      expect(activateNaturesSanctuary).toHaveBeenCalledWith(
        modalState.naturesSanctuaryCreaturesModal.action,
        modalState.naturesSanctuaryCreaturesModal.playerStats,
        modalState.naturesSanctuaryCreaturesModal.campaignName,
        'Forest Map',
        ['Ally1']
      );
      expect(moveNaturesSanctuary).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: null });
    });

    it('calls activateNaturesSanctuary when isMove is undefined', async () => {
      activateNaturesSanctuary.mockResolvedValue({ payload: '<p>Activated!</p>' });
      const modalState = {
        naturesSanctuaryCreaturesModal: {
          action: { name: "Nature's Sanctuary" },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleNaturesSanctuaryConfirm(['Ally1'], 'Forest Map');
      expect(activateNaturesSanctuary).toHaveBeenCalled();
      expect(moveNaturesSanctuary).not.toHaveBeenCalled();
    });

    it('does not call setPopupHtml when result has no payload (isMove=true)', async () => {
      moveNaturesSanctuary.mockResolvedValue({});
      const modalState = {
        naturesSanctuaryCreaturesModal: {
          action: { name: "Nature's Sanctuary" },
          isMove: true,
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleNaturesSanctuaryConfirm(['Ally1'], 'Forest Map');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: null });
    });

    it('does not call setPopupHtml when result has no payload (isMove=false)', async () => {
      activateNaturesSanctuary.mockResolvedValue({});
      const modalState = {
        naturesSanctuaryCreaturesModal: {
          action: { name: "Nature's Sanctuary" },
          isMove: false,
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleNaturesSanctuaryConfirm(['Ally1'], 'Forest Map');
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: null });
    });
  });

  describe('handleCoronaEnemySelectionConfirm', () => {
    it('returns early when selectedEnemies is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleCoronaEnemySelectionConfirm(null);
      expect(activateCoronaOfLight).not.toHaveBeenCalled();
    });

    it('returns early when coronaEnemySelectionModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleCoronaEnemySelectionConfirm(['enemy']);
      expect(activateCoronaOfLight).not.toHaveBeenCalled();
    });

    it('calls activateCoronaOfLight when modal is present', async () => {
      activateCoronaOfLight.mockResolvedValue({ payload: '<p>Corona!</p>' });
      const modalState = {
        coronaEnemySelectionModal: {
          action: { name: 'Corona of Light' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleCoronaEnemySelectionConfirm(['Enemy1', 'Enemy2']);
      expect(activateCoronaOfLight).toHaveBeenCalledWith(
        modalState.coronaEnemySelectionModal.action,
        modalState.coronaEnemySelectionModal.playerStats,
        modalState.coronaEnemySelectionModal.campaignName,
        ['Enemy1', 'Enemy2']
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ coronaEnemySelectionModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      activateCoronaOfLight.mockResolvedValue({});
      const modalState = {
        coronaEnemySelectionModal: {
          action: { name: 'Corona of Light' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleCoronaEnemySelectionConfirm(['Enemy1', 'Enemy2']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ coronaEnemySelectionModal: null });
    });
  });

  describe('handleRadianceOfDawnConfirm', () => {
    it('returns early when selectedTargets is missing', async () => {
      const handlers = getHandlers();
      await handlers.handleRadianceOfDawnConfirm(null);
      expect(confirmRadianceOfDawn).not.toHaveBeenCalled();
    });

    it('returns early when radianceOfDawnModal is not in modalState', async () => {
      const handlers = getHandlers();
      await handlers.handleRadianceOfDawnConfirm(['target']);
      expect(confirmRadianceOfDawn).not.toHaveBeenCalled();
    });

    it('calls confirmRadianceOfDawn when modal is present', async () => {
      confirmRadianceOfDawn.mockResolvedValue({ payload: '<p>Radiance!</p>' });
      const modalState = {
        radianceOfDawnModal: {
          action: { name: 'Radiance of Dawn' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleRadianceOfDawnConfirm(['Ally1', 'Enemy1']);
      expect(confirmRadianceOfDawn).toHaveBeenCalledWith(
        modalState.radianceOfDawnModal.action,
        modalState.radianceOfDawnModal.playerStats,
        modalState.radianceOfDawnModal.campaignName,
        ['Ally1', 'Enemy1']
      );
      expect(mockSetModalState).toHaveBeenCalledWith({ radianceOfDawnModal: null });
    });

    it('does not call setPopupHtml when result has no payload', async () => {
      confirmRadianceOfDawn.mockResolvedValue({});
      const modalState = {
        radianceOfDawnModal: {
          action: { name: 'Radiance of Dawn' },
          playerStats: makePlayerStats(),
          campaignName: 'test-campaign',
        },
      };
      const handlers = getHandlers(modalState);
      await handlers.handleRadianceOfDawnConfirm(['Ally1', 'Enemy1']);
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).toHaveBeenCalledWith({ radianceOfDawnModal: null });
    });
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

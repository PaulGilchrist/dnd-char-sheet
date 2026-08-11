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

const { executeSweepingAttack } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
const { executeBaitAndSwitchChoice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
const { executeCommanderStrikeChoice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
const { executeRallyChoice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');

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

describe('useCharActionsModalHandlers - combat superiority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
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
});

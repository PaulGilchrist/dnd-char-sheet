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

const { confirmOceanicGift } = await import('../../services/automation/handlers/class-druid/oceanicGiftHandler.js');

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

describe('useCharActionsModalHandlers - oceanicGift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
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

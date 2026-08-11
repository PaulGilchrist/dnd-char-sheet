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

const mockSetPopupHtml = vi.fn();
const mockSetModalState = vi.fn();

function getHandlers() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCharActionsModalHandlers({
    setPopupHtml: mockSetPopupHtml,
    setModalState: mockSetModalState,
    modalState: {},
    mergedModalState: {},
  });
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
});

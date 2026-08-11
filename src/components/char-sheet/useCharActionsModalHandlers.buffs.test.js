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

vi.mock('../../services/automation/handlers/class-sorcerer/bulwarkOfForceHandler.js', () => ({
  handle: vi.fn(),
  activateBulwarkOfForce: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-barbarian/zealousPresenceHandler.js', () => ({
  handle: vi.fn(),
  confirmZealousPresence: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/powerWordFortifyHandler.js', () => ({
  handle: vi.fn(),
  confirmPowerWordFortify: vi.fn(),
}));

const { activateBulwarkOfForce } = await import('../../services/automation/handlers/class-sorcerer/bulwarkOfForceHandler.js');
const { confirmZealousPresence } = await import('../../services/automation/handlers/class-barbarian/zealousPresenceHandler.js');
const { confirmPowerWordFortify } = await import('../../services/automation/handlers/buffs/powerWordFortifyHandler.js');

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

describe('useCharActionsModalHandlers - buffs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPopupHtml.mockClear();
    mockSetModalState.mockClear();
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
});

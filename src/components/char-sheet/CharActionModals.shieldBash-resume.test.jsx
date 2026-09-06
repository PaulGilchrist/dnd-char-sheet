// Regression tests for FT-074: closing the Shield Bash choice modal in
// CharActionModals must resume the pipeline paused at featureRiders, so the
// triggering attack's weapon damage always resolves (Apply and Skip paths).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';

vi.mock('./CharActionModals.SecondaryModals.jsx', () => ({
  default: function SecondaryModalsStub() { return null; },
}));

vi.mock('./modals/shared/AttackRiderModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/divine/HealingPoolModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/shared/HandOfHealingModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/FontOfMagicModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/ResourcePoolModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/WildCompanionModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/shared/SetConditionModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/BlindnessDeafnessModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/EyebiteEffectModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/OpenHandTechniqueModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/QuiveringPalmModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/WeaponMasteryModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/WeaponMasteryChoiceModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/WeaponKindMasteryModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/divine/BastionOfLawModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/shared/CombatStanceModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/TeleportModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/RevelationInFleshModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/MoonlightStepResourceModal.jsx', () => ({ default: () => null }));

vi.mock('./modals/ShieldBashChoiceModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return <div data-testid="shield-bash-modal"><button data-testid="shield-bash-close" onClick={onClose}>Done</button></div>;
  },
}));

vi.mock('../../services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js', () => ({
  handleApply: vi.fn(),
}));
vi.mock('../../services/automation/handlers/combat/elementalEpitomeHandler.js', () => ({
  applyResistanceChoice: vi.fn(),
}));
vi.mock('../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
  applyDamageTypeChoice: vi.fn(),
  applyTargetChoice: vi.fn(),
  skipTargetChoice: vi.fn(),
}));
vi.mock('../../services/rules/spells/postCastHealService.js', () => ({
  applyStarryChaliceHeal: vi.fn(),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));
vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));
vi.mock('../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));
vi.mock('../../services/automation/common/oncePerTurn.js', () => ({
  setSkipFlag: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

function makeProps(overrides = {}) {
  const modalState = {};
  return {
    playerStats: { name: 'EvasiveFighter' },
    campaignName: 'test-campaign',
    characters: [],
    modalState,
    spellModalState: {},
    setModalState: vi.fn((updates) => Object.assign(modalState, updates)),
    setSpellModalState: vi.fn(),
    combatSuperiorityModal: null,
    setCombatSuperiorityModal: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(),
    handleAttackRiderManeuverUse: vi.fn(),
    handleAttackRiderManeuverSkip: vi.fn(),
    handleAttackRiderOptionSelect: vi.fn(),
    pendingDamage: null,
    resumeAttackPipeline: vi.fn(() => Promise.resolve()),
    buildCtx: vi.fn(() => Promise.resolve({})),
    buildCtxSync: vi.fn(() => Promise.resolve({})),
    rollDamage: vi.fn(),
    setPopupHtml: vi.fn(),
    mapName: null,
    ...overrides,
  };
}

describe('CharActionModals — Shield Bash modal close resumes pipeline (FT-074)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resumes the attack pipeline when the shield bash modal closes', async () => {
    const resumeAttackPipeline = vi.fn(() => Promise.resolve());
    const props = makeProps({ resumeAttackPipeline });
    props.modalState.shieldBashModal = {
      action: { name: 'Shield Bash' },
      playerStats: props.playerStats,
      campaignName: 'test-campaign',
      targetName: 'Zombie 1',
      saveDc: 15,
    };
    render(<CharActionModals {...props} />);
    fireEvent.click(screen.getByTestId('shield-bash-close'));
    expect(props.setModalState).toHaveBeenCalledWith({ shieldBashModal: null });
    expect(resumeAttackPipeline).toHaveBeenCalledTimes(1);
  });

  it('tolerates a missing resumeAttackPipeline prop', () => {
    const props = makeProps({ resumeAttackPipeline: undefined });
    props.modalState.shieldBashModal = { action: { name: 'Shield Bash' } };
    render(<CharActionModals {...props} />);
    fireEvent.click(screen.getByTestId('shield-bash-close'));
    expect(props.setModalState).toHaveBeenCalledWith({ shieldBashModal: null });
  });
});

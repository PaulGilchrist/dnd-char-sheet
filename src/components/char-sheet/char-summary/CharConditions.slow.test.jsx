// SP-109: sheet-mount guard (un-hydrated store must not wipe server conditions
// with a stale empty list) and Slow te cleanup on a successful badge re-save.
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharConditions from './CharConditions.jsx';

let runtimeValues = {};

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((name, key) => {
    const storageKey = `${name}::${key}`;
    return runtimeValues[storageKey] ?? null;
  }),
  setRuntimeValue: vi.fn((name, key, value) => {
    runtimeValues[`${name}::${key}`] = value;
  }),
  addStorageChangeListener: vi.fn(() => () => {}),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 20),
}));

vi.mock('../../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilityLabel: vi.fn((abbr) => abbr || 'None'),
  getAbilitySaveBonus: vi.fn(() => 2),
}));

vi.mock('../../../services/combat/conditions/exhaustionRules.js', () => ({
  EXHAUSTION_LEVELS: 6,
  isDeadFromExhaustion: vi.fn((level) => level >= 6),
  getExhaustionSaveDC: vi.fn((level) => 10 + level),
}));

const mockSetPopupHtml = vi.fn();

vi.mock('../../../hooks/combat/usePopup.js', () => ({
  default: vi.fn(() => ({ popupHtml: null, setPopupHtml: mockSetPopupHtml })),
}));

vi.mock('../../common/Popup.jsx', () => ({
  default: vi.fn(({ children }) => <div data-testid="popup">{children}</div>),
}));

vi.mock('../DiceRollResult.jsx', () => ({
  default: vi.fn(() => <div data-testid="dice-roll-result" />),
}));

vi.mock('../../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/encounters/combatLoggingService.js', () => ({
  logConditionSave: vi.fn(() => Promise.resolve()),
  logConcentrationSave: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfPurityHandler.js', () => ({
  isAuraOfPurityActive: vi.fn(() => false),
  getAuraOfPuritySaveAdvantageConditions: vi.fn(() => []),
}));

const mockRemoveSlowEffectsForTarget = vi.fn(() => true);
vi.mock('../../../services/combat/conditions/slowEffects.js', () => ({
  removeSlowEffectsForTarget: (...args) => mockRemoveSlowEffectsForTarget(...args),
  SLOW_TE_EFFECTS: ['no_reactions', 'dex_save_disadvantage', 'ac_penalty', 'action_limit', 'single_attack_limit', 'somatic_failure_chance'],
}));

const playerStats = {
  name: 'AberrantSorcerer',
  abilities: [{ name: 'Wisdom', bonus: -1, save: -1 }],
};

const defaultProps = {
  campaignName: 'test-campaign',
  activeMapName: null,
  characters: [],
  exhaustionLevel: 0,
  onConditionsChange: vi.fn(),
  conditionEffects: {},
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  runtimeValues = {};
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: vi.fn() }));
});

describe('CharConditions — SP-109 mount wipe guard', () => {
  it('does not POST activeConditions on mount when the store is un-hydrated', () => {
    // store reports NO key at all for activeConditions (un-hydrated)
    render(<CharConditions {...defaultProps} playerStats={playerStats} />);
    expect(runtimeValues['AberrantSorcerer::activeConditions']).toBeUndefined();
  });

  it('does POST (harmless) when the store is hydrated to empty', () => {
    runtimeValues['AberrantSorcerer::activeConditions'] = [];
    render(<CharConditions {...defaultProps} playerStats={playerStats} />);
    expect(runtimeValues['AberrantSorcerer::activeConditions']).toEqual([]);
  });
});

describe('CharConditions — SP-109 slow badge re-save', () => {
  it('strips Slow target effects and logs when the repeat save succeeds at the stored DC', async () => {
    runtimeValues['AberrantSorcerer::activeConditions'] = ['slow'];
    runtimeValues['AberrantSorcerer::activeConditionMeta'] = { slow: { dc: 17, ability: 'wis' } };
    render(<CharConditions {...defaultProps} playerStats={playerStats} />);

    let badge;
    await waitFor(() => {
      badge = screen.getByText('Slow DC 17');
    });
    fireEvent.click(badge);

    await waitFor(() => {
      expect(mockRemoveSlowEffectsForTarget).toHaveBeenCalledWith('AberrantSorcerer', 'test-campaign');
    });
    expect(runtimeValues['AberrantSorcerer::activeConditions']).toEqual([]);
    const { addEntry } = await import('../../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalledWith(
      'test-campaign',
      expect.objectContaining({ type: 'condition', action: 'removed', condition: 'Slow effects' }),
    );
  });
});

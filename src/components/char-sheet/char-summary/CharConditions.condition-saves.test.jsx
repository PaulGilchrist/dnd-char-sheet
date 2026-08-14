// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharConditions from './CharConditions.jsx';

let runtimeValues = {};

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((name, key, _campaignName) => {
    const storageKey = `${name}::${key}`;
    if (key === 'activeConditionMeta') {
      return runtimeValues[storageKey] ?? runtimeValues[key] ?? null;
    }
    return runtimeValues[storageKey] ?? runtimeValues[key] ?? null;
  }),
  setRuntimeValue: vi.fn((name, key, value, _campaignName) => {
    runtimeValues[`${name}::${key}`] = value;
  }),
  addStorageChangeListener: vi.fn(() => () => {}),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 15),
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
  default: vi.fn(() => ({
    popupHtml: null,
    setPopupHtml: mockSetPopupHtml,
  })),
}));

vi.mock('../../common/Popup.jsx', () => ({
  default: vi.fn(({ children }) => (
    <div data-testid="popup">{children}</div>
  )),
}));

vi.mock('../DiceRollResult.jsx', () => ({
  default: vi.fn(({ type: _type, rollType, name, rolls, bonus, bonusDetail: _bonusDetail, total, dc, success, forcedMode: _forcedMode }) => (
    <div data-testid="dice-roll-result">
      <span data-testid="roll-type">{rollType}</span>
      <span data-testid="roll-name">{name}</span>
      <span data-testid="roll-value">{rolls?.join(', ')}</span>
      <span data-testid="roll-bonus">{bonus}</span>
      <span data-testid="roll-total">{total}</span>
      <span data-testid="roll-dc">{dc}</span>
      <span data-testid="roll-success">{String(success)}</span>
    </div>
  )),
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

let mockCombatSummary = null;

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => mockCombatSummary),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfPurityHandler.js', () => ({
  isAuraOfPurityActive: vi.fn(() => false),
  getAuraOfPuritySaveAdvantageConditions: vi.fn(() => []),
}));

import { getAuraOfPuritySaveAdvantageConditions } from '../../../services/automation/handlers/buffs/auraOfPurityHandler.js';
import { isAuraOfPurityActive } from '../../../services/automation/handlers/buffs/auraOfPurityHandler.js';
import { computeAuraBonus } from '../../../services/combat/auras/auraOfProtection.js';
import { rollD20 } from '../../../services/dice/diceRoller.js';

describe('CharConditions condition saves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeValues = {};
    mockCombatSummary = null;
    rollD20.mockReturnValue(15);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: vi.fn() }));
    vi.mocked(isAuraOfPurityActive).mockReturnValue(false);
    vi.mocked(getAuraOfPuritySaveAdvantageConditions).mockReturnValue([]);
    vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 0, sourceName: null });
  });

  const mockPlayerStats = {
    name: 'Test Character',
    abilities: [
      { name: 'Constitution', bonus: 2, save: 3 },
      { name: 'Wisdom', bonus: 1, save: 2 },
    ],
  };

  const defaultProps = {
    playerStats: mockPlayerStats,
    campaignName: 'test-campaign',
    activeMapName: 'test-map',
    characters: [],
    exhaustionLevel: 0,
    onConditionsChange: vi.fn(),
    conditionEffects: {},
  };

  describe('aura of purity advantage', () => {
    it('rolls two d20s when condition matches aura of purity list', async () => {
      vi.mocked(isAuraOfPurityActive).mockReturnValue(true);
      vi.mocked(getAuraOfPuritySaveAdvantageConditions).mockReturnValue(['charmed']);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls one d20 when condition does not match aura of purity list', async () => {
      vi.mocked(isAuraOfPurityActive).mockReturnValue(true);
      vi.mocked(getAuraOfPuritySaveAdvantageConditions).mockReturnValue(['charmed']);

      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: 'con' } };
      render(<CharConditions {...defaultProps} />);

      const blindedBtn = screen.getByText('Blinded DC 10');
      fireEvent.click(blindedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('saveAdvantage array', () => {
    it('rolls two d20s when condition is in saveAdvantage array', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('does not apply advantage for condition not in saveAdvantage array', async () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: { dc: 10, ability: 'con' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const blindedBtn = screen.getByText('Blinded DC 10');
      fireEvent.click(blindedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });

    it('sets forcedMode to advantage in popup when condition is in saveAdvantage array', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            forcedMode: 'advantage',
          })
        );
      });
    });
  });

  describe('saveAdvantageAbilities', () => {
    it('rolls two d20s when condition key prefix matches saveAdvantageAbilities', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageAbilities: ['CHA'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls one d20 when condition key prefix does not match saveAdvantageAbilities', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageAbilities: ['WIS'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('saveAdvantageCount', () => {
    it('rolls two d20s when saveAdvantageCount > 0', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 2 }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls one d20 when saveAdvantageCount is 0', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 0 }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });

    it('rolls two d20s when saveAdvantageCount > restoreBalance reduction', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 3, restoreBalance: true }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls one d20 when saveAdvantageCount equals restoreBalance reduction', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantageCount: 1, restoreBalance: true }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('saveAdvantage against_spell with restoreBalance', () => {
    it('does not apply advantage when saveAdvantage includes against_spell and restoreBalance is true', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['against_spell'], restoreBalance: true }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });

    it('applies advantage when saveAdvantage includes against_spell and restoreBalance is false', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['against_spell'], restoreBalance: false }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('grappled condition advantage', () => {
    it('rolls two d20s when strCheckAdvantage is true and condition is grappled', async () => {
      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ strCheckAdvantage: true }}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls two d20s when abilityCheckAdvantageAbilities includes STR and condition is grappled', async () => {
      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ abilityCheckAdvantageAbilities: ['STR'] }}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('rolls one d20 when abilityCheckAdvantageAbilities does not include STR for grappled', async () => {
      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ abilityCheckAdvantageAbilities: ['DEX'] }}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });

    it('applies advantage from Powerful Build saveModifier for grappled', async () => {
      const playerStatsWithPowerfulBuild = {
        ...mockPlayerStats,
        saveModifiers: [
          {
            target: 'ability_check',
            effect: 'advantage',
            abilities: ['STR'],
            condition: 'powerful_build_grapple_escape',
          },
        ],
      };

      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          playerStats={playerStatsWithPowerfulBuild}
          campaignName="test-campaign"
          activeMapName="test-map"
          characters={[]}
          exhaustionLevel={0}
          onConditionsChange={vi.fn()}
          conditionEffects={{}}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });

    it('does not apply Powerful Build advantage for non-grappled condition', async () => {
      const playerStatsWithPowerfulBuild = {
        ...mockPlayerStats,
        saveModifiers: [
          {
            target: 'ability_check',
            effect: 'advantage',
            abilities: ['STR'],
            condition: 'powerful_build_grapple_escape',
          },
        ],
      };

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          playerStats={playerStatsWithPowerfulBuild}
          campaignName="test-campaign"
          activeMapName="test-map"
          characters={[]}
          exhaustionLevel={0}
          onConditionsChange={vi.fn()}
          conditionEffects={{}}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(1);
      });
    });

    it('applies advantage from computedStats.saveModifiers for grappled', async () => {
      const playerStatsWithComputed = {
        ...mockPlayerStats,
        computedStats: {
          saveModifiers: [
            {
              target: 'ability_check',
              effect: 'advantage',
              abilities: ['STR'],
              condition: 'powerful_build_grapple_escape',
            },
          ],
        },
      };

      runtimeValues['Test Character::activeConditions'] = ['grappled'];
      runtimeValues['Test Character::activeConditionMeta'] = { grappled: { dc: 12, ability: 'str' } };
      render(
        <CharConditions
          playerStats={playerStatsWithComputed}
          campaignName="test-campaign"
          activeMapName="test-map"
          characters={[]}
          exhaustionLevel={0}
          onConditionsChange={vi.fn()}
          conditionEffects={{}}
        />
      );

      const grappledBtn = screen.getByText('Grappled DC 12');
      fireEvent.click(grappledBtn);

      await waitFor(() => {
        expect(rollD20).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('aura bonus display', () => {
    it('includes aura source name in popup bonusDetail when aura bonus > 0', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 3,
        sourceName: 'Paladin',
      });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusDetail: '(+3 aura from Paladin)',
          })
        );
      });
    });

    it('includes aura without source name when sourceName is null', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 2,
        sourceName: null,
      });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusDetail: '(+2 aura)',
          })
        );
      });
    });

    it('does not include bonusDetail when aura bonus is 0', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 0,
        sourceName: null,
      });

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonusDetail: undefined,
          })
        );
      });
    });
  });

  describe('save mode in popup', () => {
    it('sets forcedMode to advantage when hasSaveAdvantage returns true', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 12, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 12');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            forcedMode: 'advantage',
          })
        );
      });
    });

    it('sets forcedMode to undefined when no advantage', async () => {
      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            forcedMode: undefined,
          })
        );
      });
    });
  });

  describe('condition without meta dc', () => {
    it('does not attempt save when meta has no dc', async () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = {};
      render(<CharConditions {...defaultProps} />);

      const blindedBtn = screen.getByText('Blinded');
      fireEvent.click(blindedBtn);

      expect(rollD20).not.toHaveBeenCalled();
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('does not attempt save when meta is undefined', async () => {
      runtimeValues['Test Character::activeConditions'] = ['blinded'];
      runtimeValues['Test Character::activeConditionMeta'] = { blinded: undefined };
      render(<CharConditions {...defaultProps} />);

      const blindedBtn = screen.getByText('Blinded');
      fireEvent.click(blindedBtn);

      expect(rollD20).not.toHaveBeenCalled();
    });
  });

  describe('save bonus and label', () => {
    it('uses getAbilitySaveBonus for the save ability', async () => {
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(5);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            bonus: 5,
          })
        );
      });
    });

    it('uses getAbilityLabel to display save ability name', async () => {
      const { getAbilityLabel } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilityLabel.mockReturnValue('Constitution');

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'con' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Constitution (DC 14)',
          })
        );
      });
    });
  });

  describe('save total calculation', () => {
    it('calculates total as roll + saveBonus + auraBonus', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 3,
        sourceName: null,
      });
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(5);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // roll = 15, bonus = 5, aura = 3, total = 23
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            total: 23,
          })
        );
      });
    });

    it('marks save as successful when total >= dc', async () => {
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(5);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // roll = 15, bonus = 5, total = 20 >= 14 = success
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
          })
        );
      });
    });

    it('marks save as failed when total < dc', async () => {
      rollD20.mockReturnValueOnce(1);
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(2);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(<CharConditions {...defaultProps} />);

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // roll = 1, bonus = 2, total = 3 < 14 = fail
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });

    it('calculates total correctly with advantage using max of two rolls', async () => {
      rollD20.mockReturnValueOnce(8).mockReturnValueOnce(14);
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(3);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // max(8, 14) = 14, bonus = 3, total = 17
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            total: 17,
          })
        );
      });
    });
  });

  describe('combined advantage + aura bonus', () => {
    it('calculates total with both advantage rolls and aura bonus', async () => {
      vi.mocked(computeAuraBonus).mockResolvedValue({
        bonus: 4,
        sourceName: 'Paladin',
      });
      const { getAbilitySaveBonus } = await import('../../../services/combat/conditions/conditionUtils.js');
      getAbilitySaveBonus.mockReturnValue(3);
      rollD20.mockReturnValueOnce(7).mockReturnValueOnce(12);

      runtimeValues['Test Character::activeConditions'] = ['charmed'];
      runtimeValues['Test Character::activeConditionMeta'] = { charmed: { dc: 14, ability: 'wis' } };
      render(
        <CharConditions
          {...defaultProps}
          conditionEffects={{ saveAdvantage: ['charmed'] }}
        />
      );

      const charmedBtn = screen.getByText('Charmed DC 14');
      fireEvent.click(charmedBtn);

      await waitFor(() => {
        // max(7, 12) = 12, bonus = 3, aura = 4, total = 19
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.objectContaining({
            total: 19,
          })
        );
      });
    });
  });
});

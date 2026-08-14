// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharAbilities from './CharAbilities';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => {
  const mockFn = vi.fn(() => ({
    popupHtml: null,
    setPopupHtml: vi.fn(),
    rollAbilityCheck: vi.fn(),
    rollSavingThrow: vi.fn(),
    rollSkillCheck: vi.fn(),
  }));
  return { default: mockFn };
});

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

const mockStore = new Map();
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((key, prop) => mockStore.get(`${key}:${prop}`) ?? null),
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn((key, prop) => mockStore.get(`${key}:${prop}`) ?? null),
}));

vi.mock('../../services/ui/dataLoader.js', () => ({
  loadEquipment: vi.fn(() => Promise.resolve([])),
}));

const mockAllAbilityScores = [
  { full_name: 'Strength', description: 'STR desc' },
  { full_name: 'Dexterity', description: 'DEX desc' },
  { full_name: 'Constitution', description: 'CON desc' },
  { full_name: 'Intelligence', description: 'INT desc' },
  { full_name: 'Wisdom', description: 'WIS desc' },
  { full_name: 'Charisma', description: 'CHA desc' },
];

function createPlayerStats(overrides = {}) {
  return {
    name: 'Test Fighter',
    level: 5,
    abilities: [
      { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
      { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }] },
      { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
      { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [{ name: 'Arcana', bonus: 2 }] },
      { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [{ name: 'Perception', bonus: 3 }] },
      { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
    ],
    skillProficiencies: ['Athletics', 'Arcana'],
    automation: { primalKnowledge: ['Athletics'], passives: [] },
    expertise: [],
    ...overrides,
  };
}

const defaultProps = {
  allAbilityScores: mockAllAbilityScores,
  playerStats: createPlayerStats(),
  campaignName: 'test-campaign',
  exhaustionPenalty: 0,
  conditionEffects: {},
  isRaging: false,
  onReroll: vi.fn(),
  onStrokeOfLuck: vi.fn(),
};

function getMocks() {
  return vi.mocked(useLoggedDiceRoll).mock.results[0].value;
}

function findClickableByText(text) {
  const clickableEls = document.querySelectorAll('.clickable');
  return Array.from(clickableEls).find((el) => el.textContent === text);
}

describe('CharAbilities event listener and context features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  describe('INTERNAL_SKILL_CHECK_EVENT', () => {
    it('dispatches rollAbilityCheck for check type with exhaustion penalty applied', () => {
      render(<CharAbilities {...defaultProps} exhaustionPenalty={2} />);
      window.dispatchEvent(
        new CustomEvent('internal-skill-check', { detail: { skillName: 'Strength', checkType: 'check' } })
      );
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', 2, undefined);
    });

    it('dispatches rollSkillCheck for skill type with getSkillBonus result', () => {
      render(<CharAbilities {...defaultProps} />);
      window.dispatchEvent(
        new CustomEvent('internal-skill-check', { detail: { skillName: 'Athletics', checkType: 'skill' } })
      );
      expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Athletics', expect.any(Number), undefined);
    });

    it('does nothing when event has no skillName', () => {
      render(<CharAbilities {...defaultProps} />);
      window.dispatchEvent(new CustomEvent('internal-skill-check', { detail: {} }));
      expect(getMocks().rollAbilityCheck).not.toHaveBeenCalled();
      expect(getMocks().rollSkillCheck).not.toHaveBeenCalled();
    });

    it('applies makeCheckContext to skill checks from event', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ reliableTalent: true }} />);
      window.dispatchEvent(
        new CustomEvent('internal-skill-check', { detail: { skillName: 'Athletics', checkType: 'skill' } })
      );
      expect(getMocks().rollSkillCheck).toHaveBeenCalledWith(
        'Athletics',
        expect.any(Number),
        expect.objectContaining({ reliableTalent: true })
      );
    });

    it('applies makeCheckContext to ability checks from event', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ d20Floor10: true }} />);
      window.dispatchEvent(
        new CustomEvent('internal-skill-check', { detail: { skillName: 'Strength', checkType: 'check' } })
      );
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ d20Floor10: true })
      );
    });

    it('removes event listener on unmount', () => {
      const { unmount } = render(<CharAbilities {...defaultProps} />);
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('luckyDisadvantageActive prop', () => {
    it('passes luckyDisadvantage context when luckyDisadvantageActive is true for ability check', () => {
      render(<CharAbilities {...defaultProps} luckyDisadvantageActive={true} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ luckyDisadvantage: true, luckyDisadvantageType: 'disadvantage' })
      );
    });

    it('passes luckyDisadvantage context when luckyDisadvantageActive is true for save', () => {
      render(<CharAbilities {...defaultProps} luckyDisadvantageActive={true} />);
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ luckyDisadvantage: true })
      );
    });

    it('does not pass luckyDisadvantage when luckyDisadvantageActive is false', () => {
      render(<CharAbilities {...defaultProps} luckyDisadvantageActive={false} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('luckyDisadvantage');
    });
  });

  describe('psiBolsteredKnack context', () => {
    it('passes psiBolsteredKnack context for Soulknife rogue level 3+', () => {
      const stats = createPlayerStats({
        level: 5,
        class: { name: 'Rogue', major: { name: 'Soulknife' } },
        class_levels: [{ level: 5, energy: { energy_die_type: 6 } }],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ psiBolsteredKnack: true, psiBolsteredKnackDieSize: 6 })
      );
    });

    it('does not pass psiBolsteredKnack for non-Rogue classes', () => {
      const stats = createPlayerStats({
        level: 5,
        class: { name: 'Fighter', major: { name: 'Champion' } },
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('psiBolsteredKnack');
    });

    it('does not pass psiBolsteredKnack for Rogue below level 3', () => {
      const stats = createPlayerStats({
        level: 2,
        class: { name: 'Rogue', major: { name: 'Soulknife' } },
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('psiBolsteredKnack');
    });
  });

  describe('bardic inspiration in click handlers', () => {
    it('includes bardicInspiration in check context when biDie exists', () => {
      mockStore.set('Test Fighter:bardicInspirationDie', 'd6');
      render(<CharAbilities {...defaultProps} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ bardicInspiration: true, bardicInspirationDie: 'd6' })
      );
    });

    it('includes bardicInspiration in save context when biDie exists', () => {
      mockStore.set('Test Fighter:bardicInspirationDie', 'd8');
      render(<CharAbilities {...defaultProps} />);
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ bardicInspiration: true, bardicInspirationDie: 'd8' })
      );
    });

    it('does not include bardicInspiration when biDie is null', () => {
      mockStore.clear();
      render(<CharAbilities {...defaultProps} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('bardicInspiration');
    });
  });

  describe('makeCheckContext - advantage/disadvantage interactions', () => {
    it('disregards abilityCheckAdvantage when abilityCheckDisadvantage is already set', () => {
      render(
        <CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantage: true, abilityCheckAdvantage: true }} />
      );
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('forcedMode');
    });

    it('overrides disadvantage with skill-specific advantage when both advantage flags set', () => {
      render(
        <CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantage: true, abilityCheckAdvantage: true, abilityCheckAdvantageSkill: 'Strength' }} />
      );
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('forcedMode');
    });

    it('applies hex disadvantage for specific ability', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantageAbilities: ['INT'] }} />);
      const bonusCells = document.querySelectorAll('.abilities > div:nth-child(3)');
      fireEvent.click(bonusCells[3]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Intelligence',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'disadvantage' })
      );
    });

    it('does not apply hex disadvantage for non-targeted ability', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantageAbilities: ['INT'] }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('forcedMode');
    });

    it('applies Powerful Build advantage for STR checks (no prior forcedMode)', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ strCheckAdvantage: true }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'advantage' })
      );
    });

    it('applies Ray of Enfeeblement disadvantage for STR checks', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ strCheckDisadvantage: true }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'disadvantage' })
      );
    });

    it('applies Ray of Enfeeblement disadvantage for Dexterity ability check', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ strCheckDisadvantage: true }} />);
      const bonusCells = document.querySelectorAll('.abilities > div:nth-child(3)');
      fireEvent.click(bonusCells[1]);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('forcedMode');
    });

    it('applies peerlessAthleteAdvantageSkills for specific skills', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ peerlessAthleteAdvantageSkills: ['Athletics'] }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('forcedMode');
    });

    it('applies abilityCheckAdvantageAbilities for skill-to-ability mapping', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckAdvantageAbilities: ['DEX'] }} />);
      const bonusCells = document.querySelectorAll('.abilities > div:nth-child(3)');
      fireEvent.click(bonusCells[1]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Dexterity',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'advantage' })
      );
    });
  });

  describe('makeSaveContext - restoreBalance behavior', () => {
    it('sets forcedMode normal when restoreBalance is true', () => {
      render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['str'], restoreBalance: true }} />
      );
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'normal' })
      );
    });

    it('does not set forcedMode when restoreBalance is false', () => {
      render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['str'], restoreBalance: false }} />
      );
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'disadvantage' })
      );
    });

    it('autoFailSaves takes priority in save context', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['str'] }} />);
      const autoFailEl = screen.getByText('AUTO FAIL');
      fireEvent.click(autoFailEl);
      expect(getMocks().rollSavingThrow).not.toHaveBeenCalled();
    });
  });

  describe('makeSaveContext - autoRerollForSaves with other effects', () => {
    it('combines autoRerollForSaves with forcedMode disadvantage', () => {
      render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['str'], autoRerollForSaves: true, autoRerollCondition: 'frightened', autoRerollBonus: 3 }} />
      );
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ forcedMode: 'disadvantage', autoReroll: true, autoRerollCondition: 'frightened', autoRerollBonus: 3 })
      );
    });

    it('returns autoReroll context early, ignoring strokeOfLuck/lucky effects', () => {
      render(
        <CharAbilities {...defaultProps} conditionEffects={{ autoRerollForSaves: true, autoRerollCondition: 'frightened', strokeOfLuck: true, luckyAdvantage: true }} />
      );
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({ autoReroll: true, autoRerollCondition: 'frightened' })
      );
    });
  });

  describe('makeCheckContext - darkOnesLuck and tacticalMind', () => {
    it('passes darkOnesLuck context when set', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ darkOnesLuck: true }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ darkOnesLuck: true })
      );
    });

    it('passes tacticalMind with bonus when set', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ tacticalMind: true, tacticalMindBonus: 3 }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ tacticalMind: true, tacticalMindBonus: 3 })
      );
    });

    it('passes tacticalMind with null bonus when not set', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ tacticalMind: true }} />);
      const bonusCell = findClickableByText('+4');
      expect(bonusCell).toBeTruthy();
      fireEvent.click(bonusCell);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ tacticalMind: true, tacticalMindBonus: null })
      );
    });
  });

  describe('makeSaveContext - darkOnesLuck and d20Floor10', () => {
    it('passes darkOnesLuck in save context when set', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ darkOnesLuck: true }} />);
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ darkOnesLuck: true })
      );
    });

    it('passes d20Floor10 in save context when set', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ d20Floor10: true }} />);
      const saveCell = findClickableByText('+6');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        'Strength',
        expect.any(Number),
        expect.objectContaining({ d20Floor10: true })
      );
    });

    it('passes strSaveReplace context with strScore', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 2, save: 4, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ strSaveReplace: true }} />);
      const saveCell = findClickableByText('+4');
      expect(saveCell).toBeTruthy();
      fireEvent.click(saveCell);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({ strSaveReplace: true, strScore: 14 })
      );
    });
  });
});

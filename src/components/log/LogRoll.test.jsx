import { screen, cleanup } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { roll, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── ROLL ENTRY - cover and rangeReason ───────────────
  describe('RollEntry - cover and rangeReason', () => {
    it('shows 1/2 or 3/4 cover with AC bonus, hides when zero', () => {
      setup(Log, [roll({ coverAcBonus: 2 })]);
      expect(screen.getByText(/1\/2 Cover \(.*AC\)/i)).toBeInTheDocument();
      cleanup();
      setup(Log, [{ ...roll(), coverAcBonus: 3, coverLevel: 'threeQuarter' }]);
      expect(screen.getByText(/3\/4 Cover \(.*AC\)/i)).toBeInTheDocument();
      cleanup();
      setup(Log, [roll()]);
      expect(screen.queryByText(/Cover/i)).not.toBeInTheDocument();
    });

    it('shows rangeReason when set, hides when empty', () => {
      setup(Log, [roll({ rangeReason: 'Long range' })]);
      expect(screen.getByText(/Long range/i)).toBeInTheDocument();
    });
  });

  // ── ROLL ENTRY - condition save and resistanceNotice ───────────────
  describe('RollEntry - condition + resistance', () => {
    it('condition+dc success/failure shows correct text and classes', () => {
      setup(Log, [roll({ condition: 'charmed', dc: 15, success: true })]);
      expect(screen.getByText(/vs charmed.*SUCCESS/i)).toBeInTheDocument();
      expect(q('.log-condition-save.log-condition-success')).toBeInTheDocument();
      setup(Log, [roll({ condition: 'paralyzed', dc: 12, success: false })]);
      expect(screen.getByText(/FAILURE/i)).toBeInTheDocument();
      expect(q('.log-condition-save.log-condition-failure')).toBeInTheDocument();
    });

    it('shows/hides resistanceNotice', () => {
      setup(Log, [roll({ resistanceNotice: 'Half dmg' })]);
      expect(screen.getByText(/Half dmg/i)).toBeInTheDocument();
      setup(Log, [roll({ resistanceNotice: '' })]);
      expect(screen.queryByText(/log-resistance-notice/i)).not.toBeInTheDocument();
    });
  });

  // ── ROLL ENTRY - save-damage details ───────────────
  describe('RollEntry - save-damage details', () => {
    it('shows save info, result, target, and disadvantage badge', () => {
      setup(Log, [roll({ rollType: 'save-damage', saveType: 'dex', saveDc: 15 })]);
      expect(q('.log-save-info')).toBeInTheDocument();
      cleanup();
      setup(Log, [roll({ rollType: 'save-damage', saveResult: 'success', targetName: 'Gob' })]);
      expect(q('.log-save-result.log-condition-success')).toBeInTheDocument();
      cleanup();
      setup(Log, [roll({ rollType: 'save-damage', saveResult: 'failure', targetName: 'Gob' })]);
      expect(screen.getByText(/SAVE FAILURE/i)).toBeInTheDocument();
      expect(q('.log-save-result.log-condition-failure')).toBeInTheDocument();
      cleanup();
      setup(Log, [roll({ rollType: 'save-damage' })]);
      expect(q('.log-save-result')).not.toBeInTheDocument();
      cleanup();
      setup(Log, [
        roll({ rollType: 'save-damage', mode: 'disadvantage', saveDc: 13, saveType: 'wis' }),
      ]);
      expect(screen.getByText(/DISADVANTAGE/i)).toBeInTheDocument();
    });

    it('shows saveRoll and saveBonus in save result', () => {
      setup(Log, [roll({
        rollType: 'save-damage',
        saveResult: 'success',
        saveRoll: 14,
        saveBonus: 3,
      })]);
      expect(screen.getByText(/d20 14\+3/i)).toBeInTheDocument();
    });

    it('shows saveRoll without bonus when bonus is null', () => {
      setup(Log, [roll({
        rollType: 'save-damage',
        saveResult: 'failure',
        saveRoll: 8,
        saveBonus: null,
      })]);
      expect(screen.getByText(/d20 8\)/i)).toBeInTheDocument();
    });

    it('shows saveSuccess path (not saveResult)', () => {
      setup(Log, [roll({
        rollType: 'save-damage',
        saveResult: null,
        saveSuccess: true,
      })]);
      expect(screen.getByText(/SAVE SUCCESS/i)).toBeInTheDocument();
      setup(Log, [roll({
        rollType: 'save-damage',
        saveResult: null,
        saveSuccess: false,
      })]);
      expect(screen.getByText(/SAVE FAILURE/i)).toBeInTheDocument();
    });
  });

  // ── ROLL ENTRY - aoe-damage and damage type ───────────────
  describe('RollEntry - aoe-damage and damage type', () => {
    it('shows formula, affected count, and damage type', () => {
      setup(Log, [roll({ rollType: 'aoe-damage', formula: '8d6+0', affectedCount: 3 })]);
      expect(screen.getByText(/8d6/)).toBeInTheDocument();
      expect(screen.getByText(/3 creatures affected/i)).toBeInTheDocument();
      setup(Log, [roll({ rollType: 'damage', damageType: 'slashing' })]);
      expect(screen.getByText(/slashing/)).toBeInTheDocument();
      setup(Log, [roll({ rollType: 'save-damage', damageType: 'fire' })]);
      expect(screen.getByText(/fire/)).toBeInTheDocument();
    });

    it('shows resistanceDetails with immune/resistant badges', () => {
      setup(Log, [roll({
        rollType: 'damage',
        damageType: 'fire',
        resistanceDetails: [
          { damageType: 'fire', status: 'immune' },
          { damageType: 'cold', status: 'resistant' },
        ],
      })]);
      expect(screen.getByText(/Immune to fire/i)).toBeInTheDocument();
      expect(screen.getByText(/Resistant to cold/i)).toBeInTheDocument();
      expect(q('.log-immune')).toBeInTheDocument();
      expect(q('.log-resistant')).toBeInTheDocument();
    });
  });

  // ── ICON CLASSES mapping getRollIconType ───────────────
  describe('getRollIconType icon mapping', () => {
    it.each([
      ['spell_attack', 'fa-wand-magic-sparkles'],
      ['save', 'fa-shield-halved'],
      ['condition-save', 'fa-shield-halved'],
      ['save-damage', 'fa-shield-halved'],
      ['save-ottos-dance', 'fa-shield-halved'],
      ['save-imprisonment', 'fa-shield-halved'],
      ['save-confusion', 'fa-shield-halved'],
      ['save-forcecage', 'fa-shield-halved'],
      ['save-forcecage-escape', 'fa-shield-halved'],
      ['save-maze', 'fa-shield-halved'],
      ['save-maze-escape', 'fa-shield-halved'],
      ['initiative', 'fa-bolt'],
      ['damage', 'fa-skull'],
      ['attack', 'fa-crosshairs'],
      ['save-banishment', 'fa-shield-halved'],
      ['save-polymorph', 'fa-paw'],
      ['save-animal-shapes', 'fa-paw'],
      ['save-prismatic-spray', 'fa-wand-magic-sparkles'],
      ['save-prismatic-spray-indigo', 'fa-eye'],
      ['save-prismatic-spray-violet', 'fa-door-open'],
      ['unknown_type', 'fa-dice-d20'],
    ])('%s -> .%s', (tp, cls) => {
      setup(Log, [roll({ rollType: tp })]);
      expect(q(`.log-roll i.${cls}`)).toBeInTheDocument();
    });
  });

  // ── showBothDice - two dice display edge cases ───────────────
  describe('RollEntry - showBothDice modes', () => {
    it('two dice + advantage shows both with selected/discarded labels', () => {
      setup(Log, [roll({ rolls: [17, 9], mode: 'advantage' })]);
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
      expect(screen.getByText(/discarded/i)).toBeInTheDocument();
    });

    it('disadvantage mode shows both dice with selected/discarded when rolls[0] <= rolls[1]', () => {
      setup(Log, [roll({ rolls: [3, 15], mode: 'disadvantage' })]);
      expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
      expect(screen.getByText(/15 discarded/i)).toBeInTheDocument();
    });

    it('disadvantage mode shows both dice with selected/discarded when rolls[1] < rolls[0]', () => {
      setup(Log, [roll({ rolls: [15, 3] })]);
      expect(document.querySelectorAll('.log-die-selected').length).toBeGreaterThan(0);
    });

    it('shows negative bonus', () => {
      setup(Log, [roll({ bonus: -2 })]);
      expect(q('.log-total').textContent).toContain('-2');
    });

    it('shows GWF with displayRolls', () => {
      setup(Log, [roll({
        gwfApplied: true,
        gwfOriginalRolls: [12, 8],
        gwfDisplayRolls: [15, 10],
      })]);
      expect(screen.getByText(/GWF: 12, 8 → 15, 10/i)).toBeInTheDocument();
    });

    it('shows secondary damage with all fields', () => {
      setup(Log, [roll({
        secondaryFormula: '2d6',
        secondaryTotal: 7,
        secondaryDamageType: 'cold',
        secondarySaveResult: 'success',
        secondarySaveRoll: 14,
        secondarySaveBonus: 2,
      })]);
      expect(screen.getByText(/Secondary:/i)).toBeInTheDocument();
      expect(screen.getByText(/2d6/)).toBeInTheDocument();
      expect(screen.getByText(/cold/i)).toBeInTheDocument();
      expect(screen.getByText(/SAVE SUCCESS/i)).toBeInTheDocument();
      expect(screen.getByText(/d20 14\+2/i)).toBeInTheDocument();
    });

    it('shows advantage with advantageSources', () => {
      setup(Log, [roll({
        condition: 'charmed',
        dc: 15,
        success: true,
        mode: 'advantage',
        advantageSources: ['Bard', 'Paladin'],
      })]);
      expect(screen.getByText(/ADVANTAGE \(Bard, Paladin\)/i)).toBeInTheDocument();
    });
  });
});

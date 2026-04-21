import React from 'react';
import { ABILITY_NAMES, POINT_BUY_COSTS } from './constants';

function WizardStepAbilities({ 
  formData, 
  errors, 
  onAbilityBaseScoreChange,
  onAbilityImprovementChange,
  onAbilityMiscBonusChange
}) {
  const totalPointsSpent = formData.abilities.reduce((sum, ability) => {
    const baseScore = parseInt(ability.baseScore) || 8;
    return sum + (POINT_BUY_COSTS[baseScore] || 0);
  }, 0);

  const pointsRemaining = 27 - totalPointsSpent;

  const calculateTotalScore = (ability) => {
    const base = parseInt(ability.baseScore) || 8;
    const improvements = parseInt(ability.abilityImprovements) || 0;
    const misc = parseInt(ability.miscBonus) || 0;
    return base + improvements + misc;
  };

  return (
    <div className="wizard-step wizard-step-4">
      <h2>Step 4: Ability Scores</h2>
      <p className="step-description">
        Use point buy: Each ability base score minimum is 8 and maximum is 17. You have <strong>{Math.max(0, pointsRemaining)} points</strong> remaining to spend.
        Each point from 9-15 costs 1; each point from 15-17 costs 2
      </p>
      <p className="step-description">
        Total score (base + improvements + misc) cannot exceed 20 for any ability.
      </p>

      <div className="ability-scores-grid">
        {ABILITY_NAMES.map((ability, index) => {
          const baseScore = parseInt(formData.abilities[index].baseScore) || 8;
          const improvements = parseInt(formData.abilities[index].abilityImprovements) || 0;
          const misc = parseInt(formData.abilities[index].miscBonus) || 0;
          const totalScore = baseScore + improvements + misc;
          const cost = POINT_BUY_COSTS[baseScore] || 0;

          return (
            <div key={ability} className="ability-score-card">
              <h4>{ability}</h4>
              <div className="form-group ability-score-form-group">
                <label>Base Score (8-17)</label>
                <input
                  type="number"
                  min="8"
                  max="17"
                  value={formData.abilities[index].baseScore}
                  onChange={(e) => onAbilityBaseScoreChange(index, e.target.value)}
                  className={errors[`ability_${index}_baseScore`] ? 'error' : ''}
                />
                <span className="point-cost">Cost: {cost}</span>
                {errors[`ability_${index}_baseScore`] && <span className="error-message">{errors[`ability_${index}_baseScore`]}</span>}
              </div>
              <div className="form-group ability-score-form-group">
                <label>Improvements</label>
                <input
                  type="number"
                  min="0"
                  value={formData.abilities[index].abilityImprovements}
                  onChange={(e) => onAbilityImprovementChange(index, parseInt(e.target.value))}
                  className={errors[`ability_${index}_abilityImprovements`] ? 'error' : ''}
                />
                {errors[`ability_${index}_abilityImprovements`] && <span className="error-message">{errors[`ability_${index}_abilityImprovements`]}</span>}
              </div>
              <div className="form-group ability-score-form-group">
                <label>Misc Bonus</label>
                <input
                  type="number"
                  min="0"
                  value={formData.abilities[index].miscBonus}
                  onChange={(e) => onAbilityMiscBonusChange(index, parseInt(e.target.value))}
                  className={errors[`ability_${index}_miscBonus`] ? 'error' : ''}
                />
                {errors[`ability_${index}_miscBonus`] && <span className="error-message">{errors[`ability_${index}_miscBonus`]}</span>}
              </div>
              <div className={`total-score ${totalScore > 20 ? 'error' : ''}`}>
                Total: <strong>{totalScore}</strong>
                {totalScore > 20 && <span className="error-message"> (max 20)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WizardStepAbilities;

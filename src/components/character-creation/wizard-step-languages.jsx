import React from 'react';
import { LANGUAGES, FIGHTING_STYLES } from './constants';

function WizardStepLanguages({ formData, errors, onLanguageToggle, onFightingStyleToggle }) {
  const fightingStyles = formData.class?.fightingStyles || [];

  return (
    <div className="wizard-step">
      <h2>Step 7: Languages & Fighting Styles</h2>
      
      <div className="form-group">
        <label>Languages</label>
        <div className="multi-select-container multi-select-compact">
          {LANGUAGES.map(language => (
            <label 
              key={language} 
              className={`multi-select-item ${(formData.languages || []).includes(language) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={(formData.languages || []).includes(language)}
                onChange={() => onLanguageToggle(language)}
              />
              &nbsp;{language}
            </label>
          ))}
        </div>
        {errors.languages && <span className="error-message">{errors.languages}</span>}
      </div>

      <div className="form-group">
        <label>Fighting Styles</label>
        <div className="multi-select-container multi-select-compact">
          {FIGHTING_STYLES.map(style => (
            <label 
              key={style} 
              className={`multi-select-item ${fightingStyles.includes(style) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={fightingStyles.includes(style)}
                onChange={() => onFightingStyleToggle(style)}
              />
              &nbsp;{style}
            </label>
          ))}
        </div>
        Fighting Styles are usually reserver for Fighters, Paladins, and Rangers unless chosen as a feat
        {errors.fightingStyles && <span className="error-message">{errors.fightingStyles}</span>}
      </div>
    </div>
  );
}

export default WizardStepLanguages;
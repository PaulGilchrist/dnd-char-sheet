import React from 'react';
import { LANGUAGES } from './constants';

function WizardStepLanguages({ formData, errors, onLanguageToggle }) {
  return (
    <div className="wizard-step">
      <h2>Step 6: Languages</h2>
      
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
    </div>
  );
}

export default WizardStepLanguages;
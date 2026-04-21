import React from 'react';
import { SKILL_PROFICIENCIES, LANGUAGES } from './constants';

function WizardStepSkills({ formData, errors, onSkillToggle, onLanguageToggle }) {
  return (
    <div className="wizard-step">
      <h2>Step 5: Skills & Proficiencies</h2>
      
      <div className="form-group">
        <label>Skill Proficiencies</label>
        <div className="multi-select-container">
          {SKILL_PROFICIENCIES.map(skill => (
            <label 
              key={skill} 
              className={`multi-select-item ${(formData.skillProficiencies || []).includes(skill) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={(formData.skillProficiencies || []).includes(skill)}
                onChange={() => onSkillToggle(skill)}
              />
              {skill}
            </label>
          ))}
        </div>
        {errors.skillProficiencies && <span className="error-message">{errors.skillProficiencies}</span>}
      </div>
      
      <div className="form-group">
        <label>Languages</label>
        <div className="multi-select-container">
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
              {language}
            </label>
          ))}
        </div>
        {errors.languages && <span className="error-message">{errors.languages}</span>}
      </div>
    </div>
  );
}

export default WizardStepSkills;

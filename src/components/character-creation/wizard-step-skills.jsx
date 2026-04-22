import React, { useState } from 'react';
import './wizard-step-skills.css';
// Dark mode styles loaded via media query
import './wizard-step-skills-dark.css';
import { SKILL_PROFICIENCIES } from './constants';

function WizardStepSkills({ formData, errors, onSkillToggle, onSkillExpertiseToggle }) {
  const [showExpertiseFeedback, setShowExpertiseFeedback] = useState(null);

  const handleExpertiseToggle = (skill) => {
    const isCurrentlyExpert = (formData.expertSkills || []).includes(skill);
    const isCurrentlyProficient = (formData.skillProficiencies || []).includes(skill);

    if (isCurrentlyExpert) {
      // Deselecting expertise - remove from expertSkills only
      onSkillExpertiseToggle(skill, false);
      setShowExpertiseFeedback(null);
    } else {
      // Elevating to expertise
      if (!isCurrentlyProficient) {
        setShowExpertiseFeedback(`Please select ${skill} as proficient first`);
        setTimeout(() => setShowExpertiseFeedback(null), 3000);
        return;
      }
      onSkillExpertiseToggle(skill, true);
      setShowExpertiseFeedback(`${skill} is now Expert!`);
      setTimeout(() => setShowExpertiseFeedback(null), 3000);
    }
  };

  const isSkillExpert = (skill) => (formData.expertSkills || []).includes(skill);
  const isSkillProficient = (skill) => (formData.skillProficiencies || []).includes(skill);

  return (
    <div className="wizard-step">
      <h2>Step 5: Skills & Proficiencies</h2>
      
      <div className="form-group">
        <label>Skill Proficiencies</label>
        <div className="multi-select-container multi-select-compact">
          {SKILL_PROFICIENCIES.map(skill => (
            <label 
              key={skill} 
              className={`multi-select-item ${(formData.skillProficiencies || []).includes(skill) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSkillProficient(skill)}
                onChange={() => onSkillToggle(skill)}
              />
              &nbsp;
              <span className={isSkillExpert(skill) ? 'skill-expert-label' : ''}>
                {skill}
                {isSkillExpert(skill) && (
                  <span className="expertise-indicator"> (Expert)</span>
                )}
              </span>
              <button
                type="button"
                className={`expertise-toggle-btn ${isSkillExpert(skill) ? 'active' : ''}`}
                onClick={() => handleExpertiseToggle(skill)}
                disabled={!isSkillProficient(skill)}
                title={isSkillProficient(skill) ? 'Click to elevate to Expert' : 'Select proficient first'}
              >
                {isSkillExpert(skill) ? '✓ Expert' : 'Elevate'}
              </button>
            </label>
          ))}
        </div>
        Expertise usually reserver for Bards and Rogues
        {errors.skillProficiencies && <span className="error-message">{errors.skillProficiencies}</span>}
      </div>

      {showExpertiseFeedback && (
        <div className={`expertise-feedback ${showExpertiseFeedback.includes('Expert') ? 'success' : 'error'}`}>
          {showExpertiseFeedback}
        </div>
      )}
    </div>
  );
}

export default WizardStepSkills;
